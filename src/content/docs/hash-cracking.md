---
id: "54"
title: "🔐 File 54 — Hash Cracking Workflow"
category: "7. Cryptography & Forensics"
categoryId: "crypto_forensics"
filename: "54_hash_cracking_workflow.md"
refs_out: ["05","06","14b","37","41","44","53","55","58"]
refs_in: ["44","47","53","55","56"]
---

# 🔐 File 54 — Hash Cracking Workflow

> **Purpose:** Melanjutkan langsung dari File 53 — Crypto Identification.  
> File 53 menjawab: **"Hash ini jenis apa?"**  
> File 54 menjawab: **"Setelah tahu jenisnya, bagaimana mencoba menemukan plaintext/password-nya?"**
> 
> **Target:** CTF, lab, pentest yang memiliki otorisasi, dan forensic/incident-response terhadap data yang memang berhak dianalisis.
> 
> **OS:** Parrot OS XFCE / Debian-based Linux
> 
> **Primary tools:** Hashcat, John the Ripper, wordlists, rules, mask attack, helper tools.
> 
> **Mindset utama:**
> 
> ```text
> IDENTIFY → VALIDATE FORMAT → CHOOSE MODE → QUICK WIN
>                    │
>                    ├── WORDLIST
>                    ├── RULES
>                    ├── HYBRID
>                    ├── MASK
>                    └── ALTERNATIVE ATTACK PATH
> ```

---

# 🧭 BAGIAN 0 — FONDASI HASH CRACKING

## 0.1 🧠 Kenapa Hash Bisa "Dicrack"

Kesalahan konsep paling umum pemula adalah menganggap:

```text
HASH → decrypt → PASSWORD
```

Itu bukan cara kerja password hash.

Hash function pada dasarnya dirancang sebagai fungsi satu arah untuk password hashing:

```text
PASSWORD
   │
   ▼
HASH FUNCTION
   │
   ▼
HASH
```

Saat melakukan cracking, kita tidak "membalik" hash.

Yang kita lakukan adalah:

```text
GUESS
 │
 ▼
HASH GUESS
 │
 ▼
BANDINGKAN DENGAN TARGET
 │
 ├── sama → password ditemukan
 └── beda → lanjut kandidat berikutnya
```

Secara konseptual:

```text
Target hash = H(password)

Attacker mencoba:

H("123456")     ?
H("password")   ?
H("qwerty")     ?
H("Password1")  ?
H("Summer2026") ?
...
```

Ketika:

```text
H(candidate) == target_hash
```

maka candidate adalah plaintext yang cocok.

### Analogi sederhana

Bayangkan sebuah gembok.

Kamu melihat:

```text
[GEMBOK]
```

Kamu tidak bisa mengetahui kombinasi angka hanya dengan "membalik" gembok.

Namun kamu bisa mencoba:

```text
0000
0001
0002
0003
...
9999
```

Ini mirip brute-force.

Dalam password cracking, kandidat bisa berasal dari:

```text
wordlist
      ↓
rules
      ↓
mask
      ↓
hybrid
      ↓
candidate password
```

---

## 0.1.1 🔄 Hash Berbeda dengan Encryption

|Konsep|Tujuan|Bisa dibalik dengan key?|
|---|---|--:|
|Hash|Fingerprint/data integrity/password storage|Tidak|
|Encryption|Menyembunyikan data|Ya, dengan key|
|Encoding|Representasi data|Ya, secara deterministik|
|Cracking|Mencari input yang menghasilkan output|Ya, bila kandidat ditemukan|

Contoh:

```text
Base64:
password
   ↓
cGFzc3dvcmQ=
```

Ini **encoding**, bukan hash.

Sedangkan:

```text
password
   ↓
5f4dcc3b5aa765d61d8327deb882cf99
```

merupakan contoh MD5.

---

## 0.1.2 🎯 Kenapa Password Hashing Tetap Bisa Diserang?

Karena attacker tidak harus mencari semua kemungkinan jika password manusia ternyata predictable.

Contoh:

```text
password123
admin123
qwerty123
Password1
Welcome1
Summer2026
CompanyName2026
```

Password seperti ini jauh lebih mudah ditebak dibanding:

```text
v8#Rk!2pL$9mQx@7
```

Maka problem sebenarnya bukan:

> "Apakah hash bisa dibalik?"

Tetapi:

> "Seberapa besar ruang pencarian password, dan seberapa murah setiap tebakan?"

---

# 0.2 📊 Faktor yang Menentukan Keberhasilan Cracking

|Faktor|Menguntungkan Attacker|Menguntungkan Defender|
|---|---|---|
|Panjang password|Pendek (<8 karakter)|Panjang (>16 karakter)|
|Karakter set|Hanya angka/huruf|Mixed + special|
|Pola|Predictable|Random / password manager|
|Algoritma|MD5/SHA-1 yang cepat|bcrypt / Argon2|
|Salt|Tidak ada salt|Salt unik|
|Iteration|Rendah|Tinggi|
|Hardware attacker|GPU kuat|Tidak relevan secara langsung|
|Wordlist relevance|Sangat cocok|Password tidak ada dalam wordlist|
|Reuse|Password pernah bocor|Unique password|
|Context|Nama perusahaan/tim/tahun|Tidak berhubungan dengan target|

### Prinsip penting

Hash cepat:

```text
MD5
SHA-1
SHA-256
```

membuat attacker bisa mencoba kandidat sangat cepat.

Password KDF lambat:

```text
bcrypt
Argon2
```

dibuat supaya biaya setiap tebakan jauh lebih tinggi.

---

# 0.3 ⚔️ Hashcat vs John the Ripper

|Aspek|Hashcat|John the Ripper|
|---|---|---|
|Primary Use|GPU cracking|CPU + berbagai backend|
|Speed|Sangat cepat pada GPU untuk banyak mode|Umumnya lebih lambat untuk raw fast hashes|
|Format Support|Sangat banyak|Sangat banyak, terutama Jumbo|
|Wordlist|`-a 0`|`--wordlist=`|
|Rules|Sangat kuat|Sangat kuat|
|Mask|Sangat kuat|Ada mode incremental/format-specific|
|Encrypted files|Tidak selalu langsung|Sangat praktis dengan `*2john`|
|Best For|GPU/password recovery|Format kompleks + file extraction + quick testing|

Hashcat saat ini menggabungkan penggunaan CPU/GPU melalui backend, tetapi kekuatan utamanya tetap sangat terasa ketika ada GPU yang sesuai. Dokumentasi Hashcat 7.0.0 menunjukkan attack mode `0`, `1`, `3`, `6`, dan `7`, serta workload profile 1–4.

## Kapan memilih Hashcat?

Gunakan Hashcat saat:

```text
┌───────────────────────────────┐
│ Banyak hash                   │
│ GPU tersedia                  │
│ Rule attack                   │
│ Mask attack                   │
│ NTLM                          │
│ Kerberos roasting             │
│ WPA                           │
│ Fast hashes                   │
└───────────────────────────────┘
```

## Kapan memilih John?

Gunakan John saat:

```text
┌───────────────────────────────┐
│ ZIP                           │
│ PDF                           │
│ SSH private key               │
│ Office file                   │
│ Format khusus                 │
│ Need quick auto-detection     │
└───────────────────────────────┘
```

---

# 0.4 📚 Setup Wordlist di Parrot OS

## 0.4.1 🔎 Cek wordlist bawaan

```bash
# Menampilkan seluruh isi direktori wordlists umum
ls -lah /usr/share/wordlists/

# Mencari file rockyou di sistem
find /usr/share/wordlists -iname 'rockyou*' 2>/dev/null
```

Pada distro Debian/Parrot, `rockyou.txt` sering tersedia sebagai file terkompresi:

```text
/usr/share/wordlists/rockyou.txt.gz
```

---

## 0.4.2 📦 Uncompress rockyou.txt

```bash
# Masuk ke direktori wordlist
cd /usr/share/wordlists

# Mengekstrak rockyou.txt.gz dan mempertahankan file .gz
sudo gzip -dk rockyou.txt.gz
```

Verifikasi:

```bash
# Mengecek apakah rockyou.txt berhasil dibuat
ls -lh /usr/share/wordlists/rockyou.txt

# Menghitung jumlah baris/kandidat dalam wordlist
wc -l /usr/share/wordlists/rockyou.txt
```

---

## 0.4.3 📦 Install SecLists

```bash
# Memperbarui index package
sudo apt update

# Menginstal SecLists bila tersedia di repository Parrot
sudo apt install seclists
```

Cek:

```bash
# Menampilkan isi direktori SecLists
ls -lah /usr/share/seclists/
```

Lokasi umum:

```text
/usr/share/seclists/
```

Contoh subdirektori yang berguna:

```text
Passwords/
Passwords/Leaked-Databases/
Passwords/Common-Credentials/
Passwords/Default-Credentials/
Discovery/
Usernames/
```

---

## 0.4.4 🔗 Menggabungkan wordlist

Misalnya:

```text
rockyou.txt
custom.txt
```

Gabungkan:

```bash
# Menggabungkan dua wordlist menjadi satu file
cat /usr/share/wordlists/rockyou.txt custom.txt > merged.txt
```

---

## 0.4.5 🧹 Sort dan Deduplicate

```bash
# Mengurutkan kandidat kemudian menghapus duplikasi
sort -u merged.txt > merged_unique.txt

# Menghitung jumlah baris sebelum deduplikasi
wc -l merged.txt

# Menghitung jumlah baris setelah deduplikasi
wc -l merged_unique.txt
```

### Kenapa dedup penting?

Misalnya:

```text
password
Password
password
password
```

Kandidat duplicate hanya membuang:

```text
time
disk I/O
GPU cycles
```

---

## 0.4.6 🔍 Filter Wordlist

Contoh hanya password 8–12 karakter:

```bash
# Menyimpan kandidat dengan panjang 8 sampai 12 karakter
awk 'length($0) >= 8 && length($0) <= 12 {print}' \
    /usr/share/wordlists/rockyou.txt > rockyou_8_12.txt
```

---

# 🧬 BAGIAN 1 — HASH IDENTIFICATION

# 1.1 🔎 Cara Identify Hash Secara Cepat

Selalu lakukan identification **sebelum** cracking.

```text
HASH DITERIMA
      │
      ▼
IDENTIFY
      │
      ▼
VALIDATE FORMAT
      │
      ▼
HASHCAT MODE
```

---

## 1.1.1 🧰 hashid

```bash
# Memeriksa hash dan menampilkan kandidat algoritma
hashid -m "$HASH"
```

Contoh:

```text
Analyzing '5f4dcc3b5aa765d61d8327deb882cf99'
[+] MD2
[+] MD5
[+] MD4
...
Possible Hashcat Mode: 0
```

> `-m` meminta hashid menampilkan mode Hashcat yang relevan.

---

## 1.1.2 🧰 hash-identifier

```bash
# Menjalankan hash-identifier dalam mode interaktif
hash-identifier
```

Kemudian masukkan:

```text
5f4dcc3b5aa765d61d8327deb882cf99
```

---

## 1.1.3 👁️ Identifikasi manual berdasarkan bentuk

Contoh:

```text
5f4dcc3b5aa765d61d8327deb882cf99
```

Karakter:

```text
32 hex characters
```

Kandidat:

```text
MD5
```

Contoh:

```text
2aae6c35c94fcfb415dbe95f408b9ce91ee846ed
```

40 hex:

```text
SHA-1
```

Contoh:

```text
$6$rounds=5000$salt$...
```

Berarti:

```text
sha512crypt
```

Bukan raw SHA-512.

### Jangan melakukan kesalahan ini

```text
64 hex
  ↓
SHA-512
```

Belum tentu.

Bisa saja:

```text
SHA-256 + custom representation
```

atau format lain.

**Bentuk hash saja merupakan clue, bukan proof.**

---

# 1.1.4 🐧 /etc/shadow Prefix

Linux password hashes sering berbentuk:

```text
$1$...
```

MD5-Crypt:

```text
$1$
```

---

```text
$5$...
```

SHA-256-Crypt:

```text
$5$
```

---

```text
$6$...
```

SHA-512-Crypt:

```text
$6$
```

---

```text
$y$...
```

yescrypt:

```text
$y$
```

---

```text
$2a$...
$2b$...
$2y$...
```

bcrypt-family:

```text
$2$
```

---

# 1.2 📋 Hash Format Reference Table

> **Catatan versi:** Hashcat 7.0.0 saat ini mencantumkan banyak mode yang berbeda dari daftar lama yang sering beredar di tutorial internet. Contoh penting: Argon2 adalah **mode 34000** pada Hashcat 7.0.0. Untuk mode yang spesifik, selalu validasi dengan `hashcat -hh` atau `hashcat -H`.

|Nama Hash|Panjang Hex|Prefix|Contoh/Bentuk|Hashcat `-m`|
|---|--:|---|---|--:|
|MD5|32|—|`5f4dcc3b...`|`0`|
|MD5-Crypt Unix|variable|`$1$`|`$1$salt$...`|`500`|
|SHA-1|40|—|`2aae6c35...`|`100`|
|SHA-224|56|—|`d14a028c...`|`1300`|
|SHA-256|64|—|`5e884898...`|`1400`|
|SHA-384|96|—|`a80a1c06...`|`10800`|
|SHA-512|128|—|`b109f3bb...`|`1700`|
|SHA-256-Crypt Unix|variable|`$5$`|`$5$salt$...`|`7400`|
|SHA-512-Crypt Unix|variable|`$6$`|`$6$salt$...`|`1800`|
|yescrypt|variable|`$y$`|`$y$j9T$...`|`30600`*|
|NTLM|32|—|`8846f7ea...`|`1000`|
|NetNTLMv1|variable|challenge format|`user::domain:...`|`5500`|
|NetNTLMv2|variable|challenge format|`user::domain:challenge...`|`5600`|
|bcrypt|variable|`$2a$`, `$2b$`, `$2y$`|`$2y$10$...`|`3200`|
|Argon2|variable|`$argon2...`|`$argon2id$v=19$...`|`34000`|
|WPA-PMKID+EAPOL|variable|format-specific|22000 format|`22000`|
|WPA-PMK-PMKID+EAPOL|variable|format-specific|22001 format|`22001`|
|MySQL323|16 hex|—|`6bb4837e...`|`200`|
|MySQL4.1 / MySQL5|40 hex|`*`|`*2470C0C...`|`300`|
|MSSQL 2000|format-specific|`0x0100...`|binary/hex format|`131`|
|MSSQL 2005+|format-specific|`0x0100...`|binary/hex format|`132`|
|Oracle H|format-specific|format-specific|`S:`/salted format|`3100`|
|Kerberos 5 TGS-REP etype 23|format-specific|`$krb5tgs$23$`|Kerberoast|`13100`|
|Kerberos 5 AS-REP etype 23|format-specific|`$krb5asrep$23$`|AS-REP Roast|`18200`|
|Kerberos 5 Pre-Auth etype 23|format-specific|protocol-specific|Pre-Auth|`7500`|

* **Penting:** jangan menyalin angka yescrypt dari cheat sheet lama secara buta. Mode Hashcat dapat berubah seiring versi. Verifikasi versi lokal dengan:

```bash
# Menampilkan semua hash modes yang didukung instalasi Hashcat saat ini
hashcat -hh
```

dan:

```bash
# Menampilkan informasi/example untuk hash modes
hashcat -H
```

Hashcat 7.0.0 saat ini mendokumentasikan Argon2 sebagai mode 34000 dan juga mendokumentasikan mode Kerberos etype 23 seperti 7500, 13100, dan 18200.

---

# 🧪 BAGIAN 2 — ATTACK MODES HASHCAT

# 2.1 🗺️ Overview Attack Modes

```text
                         ┌───────────────────┐
                         │    HASH TARGET    │
                         └─────────┬─────────┘
                                   │
               ┌───────────────────┼────────────────────┐
               │                   │                    │
               ▼                   ▼                    ▼
         ┌──────────┐        ┌──────────┐        ┌────────────┐
         │   -a 0   │        │   -a 1   │        │   -a 3     │
         │ Wordlist │        │Combination│       │Mask/Brute  │
         └────┬─────┘        └────┬─────┘        └─────┬──────┘
              │                   │                    │
              ▼                   ▼                    ▼
          Rockyou             word1+word2          known pattern

                   ┌───────────────────┐
                   │                   │
                   ▼                   ▼
             ┌──────────┐        ┌────────────┐
             │   -a 6   │        │    -a 7    │
             │ WL+Mask  │        │ Mask+WL    │
             └──────────┘        └────────────┘
```

Hashcat mendefinisikan:

```text
-a 0 → Straight / Dictionary
-a 1 → Combination
-a 3 → Brute-force / Mask
-a 6 → Wordlist + Mask
-a 7 → Mask + Wordlist
-a 9 → Association
```

---

# 2.2 📖 Attack Mode 0 — Wordlist Attack

## Command dasar

```bash
# Menjalankan dictionary attack (-a 0) terhadap MD5 (-m 0)
# $HASH_FILE berisi satu atau lebih target hash
# $WORDLIST berisi kandidat password satu per baris
hashcat -m 0 -a 0 "$HASH_FILE" "$WORDLIST"
```

Struktur:

```text
hashcat
 │
 ├── -m 0
 │     └── hash type = MD5
 │
 ├── -a 0
 │     └── wordlist attack
 │
 ├── $HASH_FILE
 │     └── target
 │
 └── $WORDLIST
       └── candidate source
```

---

## Status/progress

```bash
# Menjalankan wordlist attack dengan status otomatis
# --status menampilkan status berkala
# --status-timer=10 memperbarui status setiap 10 detik
hashcat -m 0 -a 0 --status --status-timer=10 "$HASH_FILE" "$WORDLIST"
```

Contoh output realistis:

```text
Session..........: hashcat
Status...........: Running
Hash.Mode........: 0 (MD5)
Hash.Target......: 5f4dcc3b5aa765d61d8327deb882cf99
Time.Started.....: Tue Sep 08 18:00:01 2026
Time.Estimated...: Tue Sep 08 18:00:02 2026
Kernel.Feature...: Pure Kernel
Guess.Base.......: File (/usr/share/wordlists/rockyou.txt)
Guess.Queue......: 1/1 (100.00%)
Speed.#1.........:  8125.4 MH/s
Recovered........: 0/1 (0.00%)
Progress.........: 1245184/14344391 (8.68%)
Rejected.........: 0/1245184 (0.00%)
Restore.Point....: 1245184/14344391
```

Status field penting yang harus kamu pahami:

```text
Status
Hash.Mode
Hash.Target
Speed
Recovered
Progress
Restore.Point
```

Hashcat mendokumentasikan field-field status seperti `Status`, `Hash.Mode`, `Hash.Target`, `Speed`, `Recovered`, `Progress`, dan `Restore.Point`.

---

## Show hasil

```bash
# Membandingkan hash file dengan potfile Hashcat
# --show hanya menampilkan hash yang sudah berhasil ditemukan
hashcat -m 0 --show "$HASH_FILE"
```

Contoh:

```text
5f4dcc3b5aa765d61d8327deb882cf99:password
```

---

## Session yang memiliki nama sendiri

```bash
# Memberi nama session agar mudah di-resume
# --session=ctf-md5 menyimpan session dengan nama tersebut
hashcat --session=ctf-md5 -m 0 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

## Restore session

```bash
# Melanjutkan session hashcat yang sebelumnya dihentikan
# --restore menggunakan nama session yang telah dibuat
hashcat --session=ctf-md5 --restore
```

Hashcat menyediakan `--session`, `--restore`, dan `--restore-file-path` untuk persistence/resume attack.

---

## Output file

```bash
# Menyimpan hash:plaintext yang berhasil ditemukan ke found.txt
# -o / --outfile menetapkan file output
hashcat -m 0 -a 0 -o found.txt "$HASH_FILE" "$WORDLIST"
```

---

# 2.3 🔥 Attack Mode 0 + Rules

Ini adalah salah satu teknik paling berguna dalam CTF.

Misalnya wordlist berisi:

```text
password
admin
welcome
summer
```

Tetapi password sebenarnya:

```text
Password1
password123
summer2026
```

Wordlist langsung:

```text
password
```

tidak cukup.

Rules mengubah kandidat:

```text
password
   │
   ├── Password
   ├── password1
   ├── password123
   ├── Password123
   └── p455w0rd
```

Hashcat menjelaskan rule-based attack sebagai mekanisme transformasi kandidat password menggunakan rule language.

---

## Rule concept

```text
INPUT
password

       │
       ├── capitalize
       ├── append digit
       ├── prepend digit
       ├── reverse
       ├── duplicate
       ├── leetspeak
       └── combine transformations

       ▼

CANDIDATE SET
Password
password1
1password
drowssap
password123
p455w0rd
```

---

## Rule locations

Lokasi yang umum pada instalasi Hashcat:

```text
/usr/share/hashcat/rules/
/usr/share/hashcat/rules/best64.rule
```

Cek:

```bash
# Melihat rule files yang tersedia di instalasi sistem
find /usr/share/hashcat -type f -name '*.rule' 2>/dev/null
```

### Rule reference

|Rule File|Lokasi Umum|Deskripsi|Cocok Untuk|
|---|---|---|---|
|`best64.rule`|`/usr/share/hashcat/rules/best64.rule`|64 transformasi umum|Quick win|
|`rockyou-30000.rule`|Bisa tersedia pada paket/collection tertentu|Banyak transformasi|CTF|
|`d3ad0ne.rule`|Tergantung collection|Rule collection|Password recovery|
|`dive.rule`|Tergantung collection|Rule collection besar|Exhaustive word mutation|
|`OneRuleToRuleThemAll.rule`|Download/manual|Rule collection besar|Advanced|
|Custom rule|Buat sendiri|Kebutuhan spesifik|Targeted attack|

> **Catatan:** jangan berasumsi semua file `.rule` selalu ada di Parrot OS. Nama/lokasi dapat berbeda berdasarkan paket. Cari dengan `find`.

---

## Best64

```bash
# Menjalankan wordlist attack menggunakan best64.rule
# -r menentukan rule file
hashcat -m 0 -a 0 "$HASH_FILE" "$WORDLIST" \
    -r /usr/share/hashcat/rules/best64.rule
```

---

## Generate candidates saja

`--stdout` berguna untuk melihat hasil transformasi tanpa cracking.

```bash
# Menghasilkan kandidat dari wordlist + best64 ke stdout
# --stdout hanya membuat candidate output dan tidak melakukan cracking
hashcat --stdout "$WORDLIST" \
    -r /usr/share/hashcat/rules/best64.rule
```

Simpan:

```bash
# Menyimpan seluruh kandidat hasil rules ke expanded.txt
hashcat --stdout "$WORDLIST" \
    -r /usr/share/hashcat/rules/best64.rule \
    > expanded.txt
```

Hashcat memang menyediakan `--stdout` untuk menghasilkan candidate tanpa melakukan hash cracking.

---

# 2.4 🎯 Attack Mode 3 — Mask Attack

Mask attack digunakan saat struktur password diketahui.

Charset bawaan:

|Charset|Makna|
|---|---|
|`?l`|lowercase|
|`?u`|uppercase|
|`?d`|digit|
|`?s`|special|
|`?a`|`?l?u?d?s`|
|`?b`|all bytes|

Hashcat mendokumentasikan built-in charsets tersebut dalam CLI reference.

---

## 4 huruf + 4 angka

```bash
# Mask 4 lowercase letters diikuti 4 digits
# -a 3 = mask/brute-force attack
hashcat -m 0 -a 3 "$HASH_FILE" '?l?l?l?l?d?d?d?d'
```

Keyspace:

```text
26^4 × 10^4
≈ 45,697,600 candidates
```

---

## 8 lowercase

```bash
# Mencoba seluruh kombinasi 8 lowercase letters
hashcat -m 0 -a 3 "$HASH_FILE" '?l?l?l?l?l?l?l?l'
```

Keyspace:

```text
26^8
= 208,827,064,576
```

Ini sudah jauh lebih besar.

### Pelajaran:

```text
4 lowercase
    ↓
456,976

8 lowercase
    ↓
208,827,064,576
```

Tambahan beberapa karakter dapat membuat ruang pencarian melonjak sangat besar.

---

## Custom charset

Misalnya password hanya menggunakan:

```text
a
b
c
```

Gunakan:

```bash
# Mendefinisikan custom charset 1 sebagai hanya a, b, dan c
# -1 "abc" membuat ?1 menjadi charset custom tersebut
hashcat -m 0 -a 3 -1 "abc" "$HASH_FILE" '?1?1?1?1'
```

---

## Literal + custom mask

Misalnya format:

```text
Flag{XXXX}
```

dengan `X` berupa lowercase:

```bash
# Mencoba format literal "Flag{" + 4 lowercase + literal "}"
hashcat -m 0 -a 3 "$HASH_FILE" 'Flag{?l?l?l?l}'
```

---

# 2.5 🧩 Attack Mode 6 — Hybrid Wordlist + Mask

Mode 6 sangat berguna ketika:

```text
WORD + SUFFIX
```

Misalnya:

```text
password123
password2026
admin123
summer2026
```

Wordlist:

```text
password
admin
summer
```

Mask:

```text
?d?d?d
```

Command:

```bash
# Menggabungkan setiap wordlist entry dengan suffix 3 digits
# -a 6 = wordlist + mask
hashcat -m 0 -a 6 "$HASH_FILE" "$WORDLIST" '?d?d?d'
```

Contoh:

```text
password000
password001
password002
...
password999
```

---

# 2.6 🔗 Combination Attack — Mode 1

Mode 1 menggabungkan dua wordlist.

Misalnya:

```text
names.txt
numbers.txt
```

```bash
# Menggabungkan satu kandidat dari wordlist pertama dengan satu kandidat dari kedua
# -a 1 = combination attack
hashcat -m 0 -a 1 "$HASH_FILE" names.txt numbers.txt
```

Misalnya:

```text
john
admin
alice
```

dan:

```text
123
2026
!
```

bisa menghasilkan:

```text
john123
john2026
john!
admin123
admin2026
admin!
...
```

---

# 🧪 BAGIAN 3 — JOHN THE RIPPER WORKFLOW

# 3.1 ⚔️ Kapan Pakai John

John berguna untuk:

```text
1. Format yang nyaman ditangani John
2. Password file
3. Encrypted ZIP
4. Encrypted PDF
5. SSH private key
6. Office files
7. Quick auto-detection
8. Banyak format Jumbo
```

Openwall menjelaskan bahwa John Jumbo mendukung berbagai format tambahan dan file seperti SSH private keys, PDF, ZIP, RAR, Office, Kerberos, dan lainnya melalui helper `*2john`.

---

# 3.2 🧰 John Command Reference

## Basic wordlist

```bash
# Menjalankan John menggunakan wordlist
# --wordlist menentukan file candidate password
john --wordlist="$WORDLIST" "$HASH_FILE"
```

---

## Single crack mode

Single mode memanfaatkan informasi seperti username/login name untuk membentuk kandidat.

```bash
# Menjalankan single crack mode pada file hash
# John akan menggunakan informasi yang ada di file untuk membuat candidate
john --single "$HASH_FILE"
```

---

## Incremental mode

```bash
# Menjalankan incremental mode yang mencoba kandidat berdasarkan generator internal John
# --incremental memilih mode brute-force/incremental
john --incremental "$HASH_FILE"
```

> Incremental dapat menjadi sangat mahal. Jangan langsung menjalankannya pada password length besar.

---

## Force format

```bash
# Memaksa John menggunakan format raw-md5
# --format=raw-md5 menghindari salah deteksi format
john --format=raw-md5 --wordlist="$WORDLIST" "$HASH_FILE"
```

---

## Show cracked hashes

```bash
# Menampilkan password yang sudah berhasil ditemukan John
john --show "$HASH_FILE"
```

---

# 3.3 📋 John Format Reference

|Hash|John Format Flag|
|---|---|
|MD5|`--format=raw-md5`|
|SHA-1|`--format=raw-sha1`|
|SHA-256|`--format=raw-sha256`|
|NTLM|`--format=nt`|
|bcrypt|`--format=bcrypt`|
|Linux SHA-512-Crypt `$6$`|`--format=sha512crypt`|

Cek format lokal:

```bash
# Menampilkan semua format yang didukung build John saat ini
john --list=formats
```

Filter:

```bash
# Mencari format yang mengandung kata "sha512"
john --list=formats | grep -i sha512
```

---

# 3.4 🔐 John untuk File Terenkripsi

## ZIP

### 1. Extract crackable representation

```bash
# Mengubah ZIP menjadi format yang dapat diproses John
# zip2john membaca struktur ZIP dan menghasilkan hash representation
zip2john protected.zip > zip_hash.txt
```

### 2. Crack

```bash
# Menjalankan John terhadap representation hasil zip2john
john --wordlist="$WORDLIST" zip_hash.txt
```

### 3. Show password

```bash
# Menampilkan password yang ditemukan untuk ZIP
john --show zip_hash.txt
```

Output realistis:

```text
protected.zip:$pkzip2$1*1*1*0*8*...:summer2026
1 password hash cracked, 0 left
```

Openwall secara resmi mendokumentasikan pola `zip2john` → John untuk ZIP.

---

# 📄 PDF

```bash
# Mengekstrak password hash representation dari PDF
# pdf2john menerima file PDF sebagai input
pdf2john protected.pdf > pdf_hash.txt
```

```bash
# Menjalankan cracking terhadap hash PDF
john --wordlist="$WORDLIST" pdf_hash.txt
```

```bash
# Menampilkan password PDF yang telah ditemukan
john --show pdf_hash.txt
```

Contoh hasil:

```text
protected.pdf:$pdf$5*6*256*-1024*1*16*...:Summer2026
1 password hash cracked, 0 left
```

---

# 🔑 SSH Private Key

```bash
# Mengekstrak representasi password-protected SSH private key
# ssh2john mengubah private key menjadi format yang dapat diproses John
ssh2john id_rsa > ssh_hash.txt
```

```bash
# Menjalankan wordlist attack terhadap SSH key hash
john --wordlist="$WORDLIST" ssh_hash.txt
```

```bash
# Menampilkan password private key yang ditemukan
john --show ssh_hash.txt
```

Contoh:

```text
id_rsa:$sshng$6$16$...:winter2026
```

---

# 📊 Office

```bash
# Mengekstrak representasi password hash dari Office document
# office2john bekerja terhadap file Microsoft Office yang didukung
office2john protected.docx > office_hash.txt
```

```bash
# Menjalankan cracking terhadap Office hash representation
john --wordlist="$WORDLIST" office_hash.txt
```

```bash
# Menampilkan hasil password cracking
john --show office_hash.txt
```

---

# 🗺️ BAGIAN 4 — WORKFLOW PER SUMBER HASH

# 4.1 🐧 Hash dari /etc/shadow

Ini adalah salah satu workflow paling penting untuk Linux CTF.

---

## 4.1.1 📄 Bentuk /etc/shadow

Contoh struktur:

```text
username:password_hash:last_change:min:max:warn:inactive:expire:reserved
```

Contoh:

```text
root:$6$rounds=5000$salt$hashvalue:19999:0:99999:7:::
```

Kolom utama:

```text
root
  │
  └── username

$6$rounds=5000$salt$hashvalue
  │
  └── password hash

19999
  │
  └── last password change

0
  │
  └── minimum age

99999
  │
  └── maximum age
```

---

## 4.1.2 🔓 Mendapatkan shadow

Hanya lakukan pada sistem yang memang kamu memiliki otorisasi.

```bash
# Membaca shadow file menggunakan root privileges
# sudo menjalankan cat dengan privilege administrator
sudo cat /etc/shadow
```

Copy satu line yang relevan.

Contoh:

```text
backup:$6$rounds=5000$abc123$HASHVALUEHERE:...
```

---

## 4.1.3 📦 Salin hash ke file

```bash
# Membuat file khusus untuk hash target
# printf menulis satu baris hash ke file tanpa newline tambahan yang tidak diperlukan
printf '%s\n' '$6$rounds=5000$abc123$HASHVALUEHERE' > shadow_hash.txt
```

Set variable:

```bash
# Menentukan file target hash
HASH_FILE="shadow_hash.txt"

# Menentukan wordlist utama
WORDLIST="/usr/share/wordlists/rockyou.txt"
```

---

## 4.1.4 🧬 Identifikasi prefix

### `$1$`

```text
MD5-Crypt
Hashcat = 500
```

### `$5$`

```text
SHA-256-Crypt
Hashcat = 7400
```

### `$6$`

```text
SHA-512-Crypt
Hashcat = 1800
```

### `$y$`

```text
yescrypt
```

Verifikasi mode lokal:

```bash
# Mencari hash mode yang mengandung kata "yescrypt"
hashcat -hh | grep -i yescrypt
```

---

## 4.1.5 🧨 SHA-512-Crypt Example

Misalnya:

```text
user:$6$rounds=5000$saltsalt$HASHVALUE...
```

Jalankan:

```bash
# -m 1800 memilih SHA-512-Crypt
# -a 0 memilih wordlist attack
hashcat -m 1800 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

## 4.1.6 🧰 John alternatif

```bash
# Menjalankan John untuk SHA-512-Crypt
# --format=sha512crypt memaksa format Linux SHA-512-Crypt
john --format=sha512crypt --wordlist="$WORDLIST" "$HASH_FILE"
```

---

## 4.1.7 🔗 unshadow

Dalam beberapa workflow, John dapat bekerja lebih nyaman dengan kombinasi:

```text
/etc/passwd
+
/etc/shadow
```

Gunakan:

```bash
# Menggabungkan passwd dan shadow menjadi format John
# unshadow menggabungkan metadata account dengan password hashes
unshadow /etc/passwd /etc/shadow > unshadowed.txt
```

Kemudian:

```bash
# Menjalankan John terhadap file gabungan
john --wordlist="$WORDLIST" unshadowed.txt
```

---

## 4.1.8 🧠 Workflow muscle memory

```text
/etc/shadow
     │
     ▼
COPY HASH
     │
     ▼
CHECK PREFIX
     │
 ┌───┼────┬─────┐
 ▼   ▼    ▼     ▼
$1   $5   $6    $y
 │   │    │     │
 ▼   ▼    ▼     ▼
500 7400 1800  VERIFY
 │   │    │      LOCAL MODE
 └───┴────┴──────────┐
                     ▼
                 ROCKYOU
                     │
                     ▼
                  RULES
                     │
                     ▼
                    MASK
```

---

# 4.2 🗄️ Hash dari Database Web

File 19 sebelumnya membahas SQL injection/data extraction. Setelah memperoleh password hash, kamu masuk ke workflow File 54.

---

## 4.2.1 🐬 MySQL

Mode umum:

```text
MySQL323
→ 200

MySQL4.1+
→ 300
```

### MySQL323

```bash
# Menjalankan dictionary attack terhadap MySQL323
# -m 200 memilih MySQL323
# -a 0 memilih wordlist attack
hashcat -m 200 -a 0 "$HASH_FILE" "$WORDLIST"
```

### MySQL 4.1+

```bash
# Menjalankan dictionary attack terhadap MySQL4.1/MySQL5
# -m 300 memilih MySQL4.1+
hashcat -m 300 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

# 4.2.2 🌐 WordPress

WordPress secara historis menggunakan PHPass untuk password storage, tetapi **WordPress 6.x+ modern** menggunakan **bcrypt** untuk password baru.

Hashcat mode:

```text
400  = phpass ($P$ / $H$)
3200 = bcrypt ($2a$ / $2b$ / $2y$)
```

Bentuk umum & cara identifikasi dari database dump:

```bash
# Cek prefix hash dari database WordPress:
# $P$ atau $H$ → PHPass → mode 400
# $2y$, $2a$, atau $2b$ → bcrypt → mode 3200

# Cara cek dari database dump:
# grep -E '^\$P\$|^\$H\$' wp_hashes.txt   → PHPass
# grep -E '^\$2[aby]\$' wp_hashes.txt    → bcrypt modern
```

Command PHPass (legacy / versi lama):

```bash
# -m 400 memilih PHPass
# -a 0 menjalankan wordlist attack
hashcat -m 400 -a 0 "$HASH_FILE" "$WORDLIST"
```

Command bcrypt (modern WordPress 6.x+):

```bash
# -m 3200 memilih bcrypt
hashcat -m 3200 -a 0 "$HASH_FILE" "$WORDLIST"
```

Dengan rules:

```bash
# Menjalankan PHPass cracking menggunakan best64 rules
hashcat -m 400 -a 0 "$HASH_FILE" "$WORDLIST" \
    -r /usr/share/hashcat/rules/best64.rule
```

> Jangan menyamakan "WordPress hash" dengan raw MD5 secara otomatis. Selalu periksa prefix hash aktual ($P$/$H$ vs $2y$).

---

# 4.2.3 📰 phpBB

Banyak format phpBB lama juga menggunakan PHPass.

```bash
# Mencoba phpBB/PHPass hash dengan Hashcat mode 400
hashcat -m 400 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

# 4.2.4 🟠 Joomla

Untuk Joomla tertentu/format legacy:

```text
mode 11 = Joomla < 2.5
```

```bash
# Mencoba Joomla legacy MD5-based hash
# -m 11 memilih Joomla mode sesuai format yang dikenali Hashcat
hashcat -m 11 -a 0 "$HASH_FILE" "$WORDLIST"
```

> Jangan menerapkan mode 11 hanya karena aplikasinya Joomla. Versi Joomla yang berbeda dapat menggunakan format password yang berbeda.

---

# 4.3 🪟 Hash dari Windows — NTLM

Sumber umum:

```text
SAM
Mimikatz output
NTDS.dit
credential dump
```

NTLM mode:

```text
1000
```

---

## 4.3.1 🔑 Format NTLM

Contoh raw NTLM:

```text
8846f7eaee8fb117ad06bdd830b7586c
```

Crack:

```bash
# -m 1000 memilih NTLM
# -a 0 menjalankan wordlist attack
hashcat -m 1000 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

## 4.3.2 👤 Hash dengan username

Contoh:

```text
Administrator:500:LMHASH:NTLMHASH:::
```

Hashcat dapat menangani beberapa format username dengan opsi:

```bash
# Mengaktifkan parsing username pada hash file
# --username membuat hashcat mengabaikan bagian username sebelum hash
hashcat -m 1000 -a 0 --username "$HASH_FILE" "$WORDLIST"
```

Namun untuk CTF, sering lebih mudah membuat file hanya berisi NTLM:

```bash
# Mengambil kolom NTLM dari contoh pwdump-style output
# cut menggunakan ":" sebagai separator dan memilih kolom keempat
cut -d ':' -f 4 dump.txt > ntlm_only.txt
```

---

# 4.3.3 ⚔️ Pass-the-Hash vs Cracking

Kesalahan umum:

> "Kalau dapat NTLM, saya harus crack dulu."

Tidak selalu.

Ada dua tujuan berbeda:

```text
Punya NTLM hash
      │
      ├── Butuh PLAINTEXT?
      │       └── CRACK
      │
      └── Butuh AUTHENTICATION?
              └── PTH/relay mungkin lebih relevan
```

### Gunakan cracking jika:

```text
Tujuan:
- mengetahui password plaintext
- memahami password policy
- password reuse testing
- credential recovery yang diotorisasi
```

### Gunakan PTH/relay path jika:

```text
Tujuan:
- membuktikan autentikasi dengan hash
- mengakses service yang menerima NTLM
- lab/CTF memang menguji credential material tanpa plaintext
```

**Cracking bukan selalu jalur tercepat menuju tujuan.**

---

# 4.4 🏢 Hash dari Active Directory

Tiga skenario penting:

```text
KERBEROASTING
AS-REP ROASTING
DCSYNC / NTLM
```

---

## 4.4.1 🔥 Kerberoasting

Kerberos TGS-REP etype 23:

```text
Hashcat mode = 13100
```

Bentuk:

```text
$krb5tgs$23$...
```

Command:

```bash
# -m 13100 memilih Kerberos 5 TGS-REP etype 23
# -a 0 menjalankan wordlist attack
hashcat -m 13100 -a 0 "$HASH_FILE" "$WORDLIST"
```

Dengan rules:

```bash
# Menjalankan Kerberoasting cracking dengan best64 rules
hashcat -m 13100 -a 0 "$HASH_FILE" "$WORDLIST" \
    -r /usr/share/hashcat/rules/best64.rule
```

Hashcat saat ini mendokumentasikan `13100` sebagai Kerberos 5 etype 23 TGS-REP.

---

## 4.4.2 🧨 AS-REP Roasting

Kerberos 5 etype 23 AS-REP:

```text
18200
```

Command:

```bash
# -m 18200 memilih Kerberos 5 AS-REP etype 23
# -a 0 menjalankan wordlist attack
hashcat -m 18200 -a 0 "$HASH_FILE" "$WORDLIST"
```

Dengan rules:

```bash
# Menjalankan AS-REP cracking menggunakan best64
hashcat -m 18200 -a 0 "$HASH_FILE" "$WORDLIST" \
    -r /usr/share/hashcat/rules/best64.rule
```

---

## 4.4.3 🔐 Kerberos Pre-Auth

Kerberos 5 etype 23 AS-REQ Pre-Auth:

```text
7500
```

Command:

```bash
# -m 7500 memilih Kerberos 5 etype 23 AS-REQ Pre-Auth
# -a 0 menggunakan wordlist attack
hashcat -m 7500 -a 0 "$HASH_FILE" "$WORDLIST"
```

Hashcat membedakan mode Kerberos berdasarkan jenis message dan encryption type; jangan menganggap semua `$krb5...` memakai mode yang sama.

---

## 4.4.4 🔑 DCSync / NTLM

Jika yang diperoleh adalah raw NTLM:

```bash
# -m 1000 memilih NTLM
# -a 0 mencoba kandidat dari wordlist
hashcat -m 1000 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

# 4.5 🧠 Hash dari Memory Dump — Volatility

Workflow konseptual:

```text
MEMORY DUMP
    │
    ▼
VOLATILITY
    │
    ▼
EXTRACT CREDENTIAL MATERIAL
    │
    ▼
NORMALIZE FORMAT
    │
    ▼
IDENTIFY HASH
    │
    ▼
HASHCAT / JOHN
```

Untuk Volatility 2, salah satu plugin klasik adalah `hashdump`.

```bash
# Menjalankan Volatility terhadap memory image Windows
# image.raw adalah memory dump yang akan dianalisis
vol.py -f image.raw hashdump
```

Output dapat menyerupai:

```text
Administrator:500:aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:...
```

Kolom penting:

```text
username
RID
LM hash
NTLM hash
```

Ambil NTLM:

```bash
# Mengambil kolom NTLM dari output pwdump-style
# cut memakai ":" sebagai delimiter dan mengambil field ke-4
cut -d ':' -f 4 hashdump.txt > ntlm.txt
```

Crack:

```bash
# -m 1000 = NTLM
hashcat -m 1000 -a 0 ntlm.txt "$WORDLIST"
```

---

# 4.6 🌐 Hash dari Network Capture — Responder

Responder dapat menghasilkan challenge-response material seperti NetNTLMv1/v2.

Untuk NetNTLMv2:

```text
Hashcat mode = 5600
```

Contoh bentuk:

```text
user::DOMAIN:challenge:response:blob
```

Command:

```bash
# -m 5600 memilih NetNTLMv2
# -a 0 menggunakan wordlist attack
hashcat -m 5600 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

## Relay vs Cracking

```text
NetNTLMv2 material
       │
       ├── Butuh password plaintext?
       │       └── Cracking
       │
       └── Butuh membuktikan authentication path?
               └── Relay/alternative protocol path
```

Jangan otomatis menghabiskan waktu melakukan brute-force jika tujuan sebenarnya dapat dicapai tanpa plaintext.

---

# ⚡ BAGIAN 5 — OPTIMISASI PERFORMA

# 5.1 🖥️ Hashcat di Parrot OS — GPU vs CPU

Cek device:

```bash
# Menampilkan backend dan compute devices yang terdeteksi Hashcat
hashcat -I
```

Hashcat 7.0.0 mendukung backend seperti CUDA/OpenCL/Metal dan menyediakan `-I/--backend-info` untuk melihat environment/device.

---

## Benchmark

```bash
# Menjalankan benchmark untuk mengukur kemampuan perangkat
hashcat -b
```

Untuk hash type tertentu:

```bash
# Benchmark hanya untuk MD5
# -m 0 memilih hash mode MD5
hashcat -b -m 0
```

---

## CPU-only

```bash
# Meminta Hashcat mengabaikan GPU backend dan menggunakan CPU backend
# --backend-ignore-cuda mencegah penggunaan CUDA
# --backend-ignore-opencl mencegah penggunaan OpenCL
hashcat --backend-ignore-cuda --backend-ignore-opencl -b
```

---

## --force

```bash
# Memaksa Hashcat melewati warning tertentu
# --force sebaiknya digunakan hanya ketika memahami warning yang diabaikan
hashcat --force -m 0 -a 0 "$HASH_FILE" "$WORDLIST"
```

**Jangan membiasakan diri selalu memakai `--force`.**

Dokumentasi Hashcat menyatakan `--force` berarti mengabaikan warnings. Artinya warning tidak hilang karena masalah sudah diperbaiki; warning hanya dilewati.

---

# 5.2 🚀 Optimasi Kecepatan

## `-O` / `--optimized-kernel-enable`

```bash
# Mengaktifkan optimized kernel
# Bisa meningkatkan speed pada beberapa algoritma
# Tetapi dapat membatasi password length yang dapat diproses kernel tersebut
hashcat -O -m 0 -a 0 "$HASH_FILE" "$WORDLIST"
```

Hashcat mendokumentasikan `--optimized-kernel-enable` sebagai opsi optimizer.

### Prinsip:

```text
-O
 │
 ├── lebih cepat pada kondisi tertentu
 └── dapat mempersempit batas panjang password
```

Untuk CTF dengan password pendek:

```text
-O → sering worth it
```

Untuk password panjang/unknown:

```text
cek kernel capability dahulu
```

---

# 5.2.2 ⚙️ Workload Profile

```bash
# Workload profile 1 = low
hashcat -w 1 -m 0 -a 0 "$HASH_FILE" "$WORDLIST"

# Workload profile 2 = default
hashcat -w 2 -m 0 -a 0 "$HASH_FILE" "$WORDLIST"

# Workload profile 3 = high
hashcat -w 3 -m 0 -a 0 "$HASH_FILE" "$WORDLIST"

# Workload profile 4 = nightmare/headless
hashcat -w 4 -m 0 -a 0 "$HASH_FILE" "$WORDLIST"
```

Hashcat mendokumentasikan:

```text
1 = Low
2 = Default
3 = High
4 = Nightmare
```

Semakin tinggi profile:

```text
performance ↑
desktop responsiveness ↓
```

---

# 5.2.3 🛠️ Kernel Accel dan Loops

Opsi:

```text
--kernel-accel
--kernel-loops
```

jangan diubah secara agresif tanpa benchmark.

Contoh:

```bash
# Contoh manual tuning parameter accelerator
# Nilai aktual sebaiknya mengikuti benchmark device dan mode hash
hashcat --kernel-accel=64 --kernel-loops=128 \
    -m 0 -a 3 "$HASH_FILE" '?l?l?l?l'
```

**Golden rule:**

```text
Benchmark
   ↓
Observe
   ↓
Tune
   ↓
Benchmark again
```

Bukan:

```text
Google command
   ↓
copy random parameters
   ↓
hope
```

---

# 5.2.4 🐌 Hash Lambat Jangan Dipaksa dengan Mask

Misalnya:

```text
bcrypt
Argon2
sha512crypt
```

Jika langsung mask besar:

```text
?a?a?a?a?a?a?a?a
```

keyspace bisa sangat besar.

Untuk slow hash:

```text
TOP WORDLIST
     ↓
RULES
     ↓
TARGETED HYBRID
     ↓
SMALL MASK
```

lebih masuk akal daripada:

```text
FULL BRUTE FORCE
```

---

# 5.3 ⏱️ Estimasi Waktu Cracking

Jangan menerima angka "GPU X GHz → crack everything".

Speed sangat bergantung pada:

```text
GPU
driver
Hashcat version
kernel
hash mode
salt
password length
candidate generation
rules
thermal throttling
```

### Contoh kisaran konseptual

|Hash|Karakteristik|Speed tipikal pada hardware kuat|14M wordlist|Full 8-char|
|---|---|--:|--:|--:|
|MD5|Sangat cepat|Bisa multi-GH/s|Sangat cepat|Dapat menjadi sangat besar|
|SHA-1|Sangat cepat|Bisa multi-GH/s|Sangat cepat|Dapat menjadi besar|
|SHA-256|Cepat|GPU dapat sangat tinggi|Sangat cepat|Dapat menjadi besar|
|SHA-512|Cepat relatif terhadap KDF|Sangat bergantung GPU|Cepat|Besar|
|bcrypt|Lambat|Biasanya jauh lebih rendah|Bisa berjam-jam|Bisa sangat lama|
|Argon2|Sangat memory-hard|Jauh lebih lambat dari raw hashes|Dapat lama|Bisa tidak praktis|

Contoh benchmark nyata sangat berbeda antar GPU. Dokumentasi Hashcat sendiri memperlihatkan contoh Argon2 sekitar beberapa ribu H/s pada konfigurasi dua RTX 4090, sementara benchmark forum menunjukkan bcrypt berada pada orde puluhan ribu H/s pada GPU tertentu, jauh berbeda dari raw MD5/SHA yang berada pada orde gigahash/second.

### Pelajaran utama:

```text
14 juta password
```

tidak selalu berarti:

```text
14 juta / 10 GH/s = instantly cracked
```

Karena:

1. speed tergantung hash
    
2. KDF lambat
    
3. overhead candidate generation
    
4. satu GPU ≠ semua GPU
    
5. hardware user mungkin CPU-only
    

---

## 5.3.1 🧮 Rumus estimasi sederhana

Secara kasar:

```text
TIME ≈ KEYSPACE / HASHRATE
```

Misalnya:

```text
KEYSPACE = 100,000,000
HASHRATE = 10,000,000 / second
```

maka:

```text
≈ 10 seconds
```

Tapi ini **estimasi matematis**, bukan jaminan.

---

## 5.3.2 🧠 Kenapa bcrypt aman?

Bukan karena:

```text
bcrypt tidak bisa dicrack
```

Tetapi karena:

```text
cost per guess
       ↑
       │
       └── sangat mahal
```

Jika raw MD5:

```text
1 password guess = sangat murah
```

bcrypt:

```text
1 password guess = jauh lebih mahal
```

Dengan demikian attacker mengalami:

```text
same candidate count
        ×
higher cost per candidate
        =
much longer attack
```

---

# 🧩 BAGIAN 6 — CUSTOM WORDLIST GENERATION

# 6.1 🌐 CeWL — Generate Wordlist dari Website

CeWL dapat digunakan untuk membangun wordlist dari kata-kata yang terlihat pada situs.

### Kapan masuk akal?

Misalnya target merupakan:

```text
internal company portal
CTF company-themed website
fictional organization
lab website
```

Dan password kemungkinan berkaitan dengan:

```text
nama
produk
proyek
brand
karakter
lokasi
```

---

## Command

```bash
# Meng-crawl target dengan depth 2
# -m 5 = minimum word length 5
# -d 2 = crawl depth 2
# -w wordlist.txt = simpan hasil ke file
cewl http://target.com -m 5 -d 2 -w wordlist.txt
```

---

# 6.1.1 🧠 Penjelasan flag

```text
-m 5
│
└── minimum panjang kata = 5

-d 2
│
└── crawl depth = 2

-w wordlist.txt
│
└── output
```

Setelah itu:

```bash
# Menghapus duplicate dan mengurutkan custom wordlist
sort -u wordlist.txt > wordlist_unique.txt
```

---

# 6.2 👤 Mentalist / CUPP

Digunakan saat password policy atau challenge mengisyaratkan bahwa password dibangun dari informasi tertentu.

Contoh informasi:

```text
nama
nickname
tahun
nama hewan
tim
kata favorit
```

CUPP:

```bash
# Mengaktifkan virtual environment atau Python interpreter bila diperlukan
# python3 menjalankan script CUPP dengan Python 3
python3 cupp.py -i
```

`-i`:

```text
interactive mode
```

### Mindset

Jangan melakukan:

```text
ambil semua informasi
   ↓
generate 100 juta password
```

lebih baik:

```text
observasi target
   ↓
hipotesis password policy
   ↓
generate targeted candidates
```

---

# 6.3 🧪 Hashcat --stdout

### Wordlist + rules

```bash
# Membuat kandidat hasil rules tanpa melakukan cracking
# --stdout = cetak kandidat saja
# -r = gunakan rule file
hashcat --stdout "$WORDLIST" \
    -r /usr/share/hashcat/rules/best64.rule \
    > expanded.txt
```

### Deduplikasi

```bash
# Menghapus duplicate dari hasil expansion
sort -u expanded.txt > expanded_unique.txt
```

---

# 6.4 🐍 Custom Wordlist Manipulation dengan Python

Script berikut melakukan:

```text
word
word0
word1
...
word9999
```

serta:

```text
capitalize
simple leetspeak
```

```python
#!/usr/bin/env python3

from pathlib import Path
import sys

# ESTIMASI UKURAN OUTPUT:
# 100 kata input × 10000 angka × rata-rata 10 bytes
# = sekitar 10 MB hanya dari suffix angka!
# Untuk CTF, gunakan range(100) atau range(2030) saja
# tergantung konteks (tahun, pin, 2-digit/4-digit number).


def leetspeak(word: str) -> str:
    """Apply a small, intentionally simple leetspeak transformation."""
    table = str.maketrans({
        "a": "4",
        "e": "3",
        "i": "1",
        "o": "0",
        "s": "5",
        "t": "7",
    })
    return word.translate(table)


def main() -> int:
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} input.txt output.txt")
        return 1

    input_file = Path(sys.argv[1])
    output_file = Path(sys.argv[2])

    if not input_file.is_file():
        print(f"[-] Input file not found: {input_file}")
        return 1

    seen: set[str] = set()

    with input_file.open("r", encoding="utf-8", errors="ignore") as src:
        for raw_line in src:
            word = raw_line.strip()

            if not word:
                continue

            candidates = {
                word,
                word.capitalize(),
                leetspeak(word),
                leetspeak(word.capitalize()),
            }

            # PERHATIAN: range(10000) menambah 10.000 kandidat PER kata!
            for number in range(10000):
                candidates.add(f"{word}{number}")

            for candidate in candidates:
                seen.add(candidate)

    with output_file.open("w", encoding="utf-8") as dst:
        for candidate in sorted(seen):
            dst.write(candidate + "\n")

    print(f"[+] Wrote {len(seen):,} unique candidates to {output_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

Jalankan:

```bash
# Menjalankan script terhadap custom wordlist
# Argumen pertama = input wordlist
# Argumen kedua = output expanded wordlist
python3 generate_wordlist.py custom.txt expanded.txt
```

> ⚠️ **Catatan Performa & Ukuran File:**  
> `range(10000)` per kata dapat membuat file output membengkak cepat.  
> - **Estimasi:** 100 kata input × 10.000 angka × ~10 bytes ≈ **10 MB**.  
> - **Rekomendasi CTF:** Gunakan `range(100)` (00-99) atau `range(1980, 2030)` (tahun lahir/event) tergantung hipotesis target.

---

# 🌍 BAGIAN 7 — ONLINE RESOURCES

# 7.1 🔎 Database Online yang Harus Dicek Dulu

Untuk hash cepat yang umum, database publik kadang dapat menemukan plaintext tanpa perlu menjalankan brute-force lokal.

Contoh layanan:

```text
CrackStation
Hashes.com
MD5Decrypt
OnlineHashCrack
```

### Tapi ada batasan penting

Database publik:

```text
tidak universal
```

Jika hash:

```text
salted
custom
rare
recent
high-cost KDF
```

kemungkinan pencarian online gagal.

---

## 7.1.1 🌐 CrackStation

Untuk hash publik seperti:

```text
MD5
SHA-1
NTLM
```

kadang bisa langsung ditemukan.

Tidak perlu menganggap layanan tersebut memiliki API publik yang selalu tersedia.

Workflow aman:

```text
HASH
 │
 ▼
Browser lookup
 │
 ├── Found → done
 └── Not found → offline cracking
```

---

# 7.1.2 🧠 Hashes.com

Dapat digunakan sebagai database/community lookup.

Gunakan hanya hash yang:

```text
kamu memang berhak analisis
```

Jangan mengunggah:

```text
password user production
credential perusahaan
data korban
```

ke layanan pihak ketiga tanpa izin.

---

# 7.2 ⚖️ Online vs Offline

```text
                 HASH
                  │
                  ▼
         ┌──────────────────┐
         │ Safe to submit?  │
         └────────┬─────────┘
                  │
            ┌─────┴─────┐
            │           │
           YES          NO
            │           │
            ▼           ▼
      Online lookup   OFFLINE
            │
      ┌─────┴─────┐
      │           │
    Found       Not Found
      │           │
      ▼           ▼
   DONE        Hashcat
```

### Rule praktis

```text
Un-salted MD5/SHA-1/NTLM
    ↓
online lookup masuk akal

Salted / bcrypt / Argon2
    ↓
offline cracking lebih masuk akal
```

---

# 🌲 BAGIAN 8 — DECISION TREE LENGKAP

```text
                         ┌────────────────────┐
                         │    HASH DITERIMA   │
                         └─────────┬──────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ 1. IDENTIFY FORMAT   │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ VALIDATE HASH SHAPE  │
                        └──────────┬───────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Safe untuk online lookup?     │
                    └──────────────┬───────────────┘
                                   │
                         ┌─────────┴─────────┐
                         ▼                   ▼
                        YES                  NO
                         │                   │
                         ▼                   │
                 ┌───────────────┐           │
                 │ Online lookup │           │
                 └───────┬───────┘           │
                         │                   │
                  ┌──────┴──────┐            │
                  ▼             ▼            │
                FOUND         NOT FOUND      │
                  │             │            │
                  ▼             └──────┬─────┘
                 DONE                  │
                                       ▼
                          ┌──────────────────────┐
                          │ Hash type / speed?   │
                          └──────────┬───────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               │                     │                     │
               ▼                     ▼                     ▼
        Fast Hash               Slow Hash             Network/AD
        MD5/SHA                 bcrypt/Argon2          Kerberos
               │                     │                     │
               ▼                     ▼                     ▼
          Wordlist              Top candidates       Correct mode
               │                     │                     │
               ▼                     ▼                     ▼
             Rules             Rules/Hybrid           Wordlist
               │                     │                     │
               ▼                     ▼                     ▼
              Mask               Limited Mask            Rules
               │                     │                     │
               └──────────────┬──────┴─────────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │   CRACKED?       │
                     └────────┬─────────┘
                              │
                       ┌──────┴──────┐
                       ▼             ▼
                      YES            NO
                       │             │
                       ▼             ▼
                     DONE       REASSESS PATH
                                      │
                ┌─────────────────────┼──────────────────────┐
                │                     │                      │
                ▼                     ▼                      ▼
            Better WL            Better rules          Alternative
            Context data         Targeted mask         PTH/relay/
            Custom candidates   Pattern hypothesis     app exploit
```

---

# 🧠 8.1 Golden Order

Untuk hash cepat:

```text
1. Identify
2. Validate
3. Online lookup if safe
4. Wordlist
5. Rules
6. Hybrid
7. Targeted mask
8. Alternative path
```

Untuk hash lambat:

```text
1. Identify exact KDF
2. Validate parameters
3. Small high-quality wordlist
4. Targeted rules
5. Targeted hybrid
6. Stop when economics become unreasonable
```

---

# 🔥 8.2 Apa yang Dilakukan Kalau Hash Tidak Bisa Dicrack?

Ini sangat penting.

Kesalahan mental:

```text
HASH TIDAK CRACK
      ↓
BRUTE FORCE LEBIH KERAS
      ↓
TUNGGU
      ↓
TUNGGU
      ↓
TUNGGU
```

Workflow profesional:

```text
HASH TIDAK CRACK
       │
       ▼
CHECK ASSUMPTION
       │
       ├── wrong hash mode?
       ├── malformed hash?
       ├── wrong extraction?
       ├── wrong username/salt handling?
       ├── bad wordlist?
       ├── wrong password hypothesis?
       └── correct hash but impossible keyspace?
       │
       ▼
REASSESS
       │
       ├── better wordlist
       ├── contextual words
       ├── rules
       ├── hybrid
       ├── targeted mask
       └── alternative access path
       │
       ▼
STILL NO?
       │
       ▼
ACCEPT THAT CRACKING IS NOT CURRENTLY PRACTICAL
       │
       ▼
FIND ANOTHER PATH
```

### Prinsip Penting

**"Tidak bisa crack" bukan berarti "challenge selesai".**

Bisa jadi ada jalur:

```text
web exploit
credential reuse
SSH key
config file
environment variable
session token
API key
backup
source code
database credential
privilege escalation
PTH
relay
```

Dalam CTF:

```text
password plaintext
```

bukan selalu tujuan utama.

Tujuannya adalah:

```text
ACCESS
PRIVILEGE
FLAG
```

---

# 🛠️ BAGIAN 9 — COMMON ERRORS & TROUBLESHOOTING

|Error|Penyebab|Solusi|
|---|---|---|
|`No hashes loaded`|Format input salah|Validasi format/hash mode|
|`Token length exception`|Panjang token tidak cocok|Periksa hash type|
|`Separator unmatched`|Separator salah|Periksa format input|
|Hashcat berhenti tiba-tiba|GPU driver/thermal/session|Cek log, temperatur, driver|
|Hash tidak ada di potfile|Format berbeda / potfile berbeda|Cek `--potfile-path`|
|Speed sangat lambat tanpa GPU|CPU lebih lambat pada banyak mode|Gunakan wordlist targeted / GPU|
|`Not enough memory`|Wordlist/rules terlalu besar|Pecah input, kurangi rules|
|`Hash has already been cracked`|Ada di potfile|Gunakan `--show`|
|`Wordlist not found`|Path salah|`ls`, `find`|
|`Rule file not found`|File rule tidak tersedia|Cari dengan `find`|
|`Invalid hash format`|Hash korup/malformed|Re-extract|
|`CUDA error`|Driver/backend problem|Check `hashcat -I`|
|Tidak ada GPU|Backend tidak menemukan device|Jangan asal `--force`|
|`$user:$hash`|Username ikut masuk input|Gunakan `--username` atau ekstrak hash|
|John format salah|Format tidak dideteksi benar|`john --list=formats`|
|`Exhausted`|Semua candidate sudah selesai|Bukan error|
|`Cracked` tapi plaintext tidak terlihat|Potfile ada tetapi output berbeda|Gunakan `--show`|
|Mask terlalu lambat|Keyspace terlalu besar|Kurangi panjang/charset|
|bcrypt sangat lambat|Memang KDF mahal|Gunakan candidate berkualitas|
|Rules menghasilkan terlalu banyak kandidat|Ruleset besar|Gunakan best64/targeted rules|
|`Approaching final keyspace - workload adjusted`|Hashcat mendekati akhir keyspace|Normal (bukan error/hang), tunggu atau tekan `[s]`|

---

# 9.1 🚨 "No hashes loaded"

Contoh:

```text
No hashes loaded.
```

Kemungkinan:

```text
1. wrong -m
2. hash malformed
3. username included
4. separator issue
5. format membutuhkan prefix
```

Diagnosis:

```bash
# Menampilkan isi hash file dengan karakter khusus agar whitespace tersembunyi terlihat
cat -A "$HASH_FILE"
```

Pastikan:

```text
1 line = 1 valid target
```

---

# 9.2 🚨 "Token length exception"

Biasanya:

```text
hashcat mode tidak sesuai
```

Contoh:

```text
32 hex characters
```

tetapi dipaksa:

```text
-m 100
```

padahal SHA-1 harus:

```text
40 hex
```

Solusi:

```bash
# Meminta Hashcat menampilkan informasi hash mode untuk investigasi
hashcat -hh | grep -i md5
```

---

# 9.3 🚨 "Separator unmatched"

Sering terjadi pada format:

```text
user:hash
```

atau:

```text
$krb5...
```

Solusi:

```bash
# Memberitahu Hashcat separator khusus jika format target memerlukannya
hashcat -p ':' -m 1000 -a 0 "$HASH_FILE" "$WORDLIST"
```

`-p` / `--separator` digunakan untuk menentukan separator hashlist/output.

---

# 9.4 🚨 Hashcat berhenti tiba-tiba

Cek:

```bash
# Memeriksa device/backend
hashcat -I
```

Cek GPU NVIDIA:

```bash
# Menampilkan status GPU NVIDIA, temperatur, dan penggunaan memory
nvidia-smi
```

Cari penyebab:

```text
driver crash
thermal issue
OOM
desktop watchdog
session killed
```

---

# 9.5 🗃️ Hash pernah di-crack tapi tidak terlihat

Hashcat menggunakan potfile.

Coba:

```bash
# Memeriksa potfile untuk hash yang sudah diketahui
hashcat -m 0 --show "$HASH_FILE"
```

Hashcat menyediakan `--show` untuk membandingkan hashlist dengan potfile dan menampilkan recovered hashes.

---

# 9.6 📁 Wordlist not found

```bash
# Memastikan path wordlist benar
ls -lh "$WORDLIST"
```

Cari:

```bash
# Mencari rockyou.txt di seluruh filesystem yang dapat diakses
find /usr/share -iname 'rockyou.txt*' 2>/dev/null
```

---

# 9.7 📜 Rule file not found

```bash
# Mencari semua rule file di instalasi Hashcat
find /usr/share/hashcat -type f -name '*.rule' 2>/dev/null
```

---

# 9.8 💾 Not enough memory

Penyebab umum:

```text
huge wordlist
+
massive rule combination
=
memory pressure
```

Solusi:

```bash
# Menghapus duplicate sebelum digunakan
sort -u huge.txt > huge_unique.txt
```

atau gunakan subset:

```bash
# Mengambil 100000 baris pertama sebagai quick-win list
head -n 100000 huge_unique.txt > top100k.txt
```

---

# 9.9 🧨 "Hash has already been cracked"

Jalankan:

```bash
# Memeriksa password yang sudah tersimpan di potfile
hashcat -m 1000 --show "$HASH_FILE"
```

---

# 9.10 ⚠️ CUDA Error

Diagnosis:

```bash
# Memeriksa apakah Hashcat melihat CUDA-capable device
hashcat -I
```

Lalu:

```bash
# Memeriksa driver NVIDIA dan GPU
nvidia-smi
```

Jangan langsung:

```bash
--force
```

karena `--force` hanya melewati warning, bukan memperbaiki driver.

---

# 9.11 👤 `$user:$hash`

Jika:

```text
admin:8846f7eaee8fb117ad06bdd830b7586c
```

gunakan:

```bash
# Mengabaikan username sebelum separator ketika memproses hashlist
hashcat --username -m 1000 -a 0 "$HASH_FILE" "$WORDLIST"
```

Atau ekstrak:

```bash
# Mengambil hanya field kedua setelah ":" sebagai raw hash
cut -d ':' -f 2 "$HASH_FILE" > clean_hashes.txt
```

---

# 9.12 🧔 John format salah

Lihat:

```bash
# Menampilkan semua format John yang tersedia
john --list=formats
```

Cari:

```bash
# Mencari format yang berkaitan dengan bcrypt
john --list=formats | grep -i bcrypt
```

Kemudian:

```bash
# Memaksa format bcrypt ketika auto-detection tidak tepat
john --format=bcrypt --wordlist="$WORDLIST" "$HASH_FILE"
```

---

# 9.13 ℹ️ "Approaching final keyspace - workload adjusted"

Pesan ini sering membuat pemula panik karena merasa Hashcat tiba-tiba melambat atau hang di akhir proses.

```text
Approaching final keyspace - workload adjusted
```

### Penjelasan & Tindakan:

```bash
# OUTPUT NORMAL: "Approaching final keyspace - workload adjusted"
# ARTINYA: Hashcat hampir selesai memproses seluruh keyspace/wordlist,
#          dan secara otomatis menyesuaikan ukuran workload GPU/CPU agar tidak meluap.
# TINDAKAN: Ini BUKAN error atau freeze. 
#          Cukup tunggu sampai selesai atau tekan [s] untuk melihat progress status.
```

---

# 📦 BAGIAN 10 — CHEATSHEET HASH CRACKING

# 10.1 ⚡ Quick Command Reference

## Set variable

```bash
# Target hash tunggal sebagai string
HASH="hash_value_here"

# File yang berisi target hash
HASH_FILE="hashes.txt"

# Wordlist utama
WORDLIST="/usr/share/wordlists/rockyou.txt"
```

---

# MD5

```bash
# -m 0 = MD5
# -a 0 = wordlist attack
hashcat -m 0 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

# SHA-256

```bash
# -m 1400 = raw SHA-256
# -a 0 = wordlist attack
hashcat -m 1400 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

# NTLM

```bash
# -m 1000 = NTLM
# -a 0 = wordlist attack
hashcat -m 1000 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

# bcrypt

```bash
# -m 3200 = bcrypt
# -a 0 = wordlist attack
hashcat -m 3200 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

# Kerberoasting

```bash
# -m 13100 = Kerberos 5 etype 23 TGS-REP
# -a 0 = wordlist attack
hashcat -m 13100 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

# AS-REP

```bash
# -m 18200 = Kerberos 5 etype 23 AS-REP
# -a 0 = wordlist attack
hashcat -m 18200 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

# SHA-512 Unix

```bash
# -m 1800 = sha512crypt Linux $6$
# -a 0 = wordlist attack
hashcat -m 1800 -a 0 "$HASH_FILE" "$WORDLIST"
```

---

# Wordlist + best64 rules

```bash
# -m 0 = MD5
# -a 0 = wordlist
# -r = rule file
hashcat -m 0 -a 0 "$HASH_FILE" "$WORDLIST" \
    -r /usr/share/hashcat/rules/best64.rule
```

---

# 8-char all lowercase

```bash
# -a 3 = mask attack
# ?l = lowercase
hashcat -m 0 -a 3 "$HASH_FILE" '?l?l?l?l?l?l?l?l'
```

---

# Hybrid

```bash
# -a 6 = wordlist + mask
# ?d?d?d = 3 digit suffix
hashcat -m 0 -a 6 "$HASH_FILE" "$WORDLIST" '?d?d?d'
```

---

# Combination

```bash
# -a 1 = combination attack
# wordlist1 + wordlist2
hashcat -m 0 -a 1 "$HASH_FILE" words1.txt words2.txt
```

---

# Show result

```bash
# Menampilkan hasil cracked dari potfile
hashcat -m 0 --show "$HASH_FILE"
```

---

# Restore

```bash
# Membuat session bernama ctf
hashcat --session=ctf -m 0 -a 0 "$HASH_FILE" "$WORDLIST"

# Melanjutkan session bernama ctf
hashcat --session=ctf --restore
```

---

# Output file

```bash
# Menulis hasil recovered hashes ke found.txt
hashcat -m 0 -a 0 -o found.txt "$HASH_FILE" "$WORDLIST"
```

---

# 10.2 ⚔️ John Quick Reference

## Generic wordlist

```bash
# Menjalankan John dengan wordlist utama
john --wordlist="$WORDLIST" "$HASH_FILE"
```

---

# MD5

```bash
# Memaksa raw-md5
john --format=raw-md5 --wordlist="$WORDLIST" "$HASH_FILE"
```

---

# SHA-1

```bash
# Memaksa raw-sha1
john --format=raw-sha1 --wordlist="$WORDLIST" "$HASH_FILE"
```

---

# SHA-256

```bash
# Memaksa raw-sha256
john --format=raw-sha256 --wordlist="$WORDLIST" "$HASH_FILE"
```

---

# NTLM

```bash
# Memaksa format NTLM
john --format=nt --wordlist="$WORDLIST" "$HASH_FILE"
```

---

# bcrypt

```bash
# Memaksa bcrypt
john --format=bcrypt --wordlist="$WORDLIST" "$HASH_FILE"
```

---

# Linux SHA-512-Crypt

```bash
# Memaksa sha512crypt Linux $6$
john --format=sha512crypt --wordlist="$WORDLIST" "$HASH_FILE"
```

---

# Show

```bash
# Menampilkan password yang telah ditemukan
john --show "$HASH_FILE"
```

---

# ZIP

```bash
# Mengubah ZIP menjadi hash representation
zip2john protected.zip > zip_hash.txt

# Crack dengan wordlist
john --wordlist="$WORDLIST" zip_hash.txt

# Show result
john --show zip_hash.txt
```

---

# PDF

```bash
# Mengekstrak hash representation dari PDF
pdf2john protected.pdf > pdf_hash.txt

# Crack dengan wordlist
john --wordlist="$WORDLIST" pdf_hash.txt

# Menampilkan password
john --show pdf_hash.txt
```

---

# SSH private key

```bash
# Mengekstrak hash representation dari encrypted private key
ssh2john id_rsa > ssh_hash.txt

# Crack menggunakan wordlist
john --wordlist="$WORDLIST" ssh_hash.txt

# Menampilkan password
john --show ssh_hash.txt
```

---

# Office

```bash
# Mengekstrak representasi password dari Office document
office2john protected.docx > office_hash.txt

# Crack menggunakan wordlist
john --wordlist="$WORDLIST" office_hash.txt

# Menampilkan password
john --show office_hash.txt
```

John mendokumentasikan pola penggunaan helper `ssh2john`, `pdf2john`, dan `zip2john` lalu meneruskan outputnya ke John; dukungan aktual bergantung pada build/Jumbo yang digunakan.

---

# 10.3 ⏱️ Workflow Cepat 5 Menit

Kalau dapat hash, jangan langsung brute-force.

Gunakan urutan ini:

```text
┌──────────────────────────────┐
│ 0:00                         │
│ HASH DITERIMA                │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 0:30                         │
│ IDENTIFY                     │
│ hashid -m / hash-identifier  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 1:00                         │
│ VALIDATE FORMAT              │
│ prefix / length / syntax     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 1:30                         │
│ ONLINE LOOKUP                │
│ hanya jika aman/diizinkan    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 2:00                         │
│ HASHCAT WORDLIST             │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 3:00                         │
│ HASHCAT + best64             │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 4:00                         │
│ HYBRID / TARGETED MASK       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ 5:00                         │
│ REASSESS                     │
│ Crack / Change path / Skip   │
└──────────────────────────────┘
```

---

# 🧠 MASTER WORKFLOW — File 53 → File 54

```text
                  FILE 53
              CRYPTO IDENTIFICATION
                       │
                       ▼
                "INI HASH APA?"
                       │
                       ▼
              ┌─────────────────┐
              │ IDENTIFY HASH   │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ VALIDATE FORMAT │
              └────────┬────────┘
                       │
                       ▼
               CHOOSE HASHCAT -m
                       │
         ┌─────────────┼──────────────┐
         │             │              │
         ▼             ▼              ▼
      FAST HASH     SLOW HASH       NETWORK/AD
         │             │              │
         ▼             ▼              ▼
      WORDLIST     TARGETED WL     CORRECT MODE
         │             │              │
         ▼             ▼              ▼
       RULES        RULES            RULES
         │             │              │
         ▼             ▼              ▼
      HYBRID       HYBRID           MASK
         │             │              │
         ▼             ▼              ▼
       MASK         LIMITED MASK     RESULT
         │             │
         └─────────────┴──────────────┐
                                      ▼
                                 CRACKED?
                                  │     │
                                YES      NO
                                  │       │
                                  ▼       ▼
                                DONE   REASSESS
                                          │
                                          ▼
                                 ALTERNATIVE PATH
```

---

# 🎯 MUSCLE MEMORY — 7 RULES

## Rule 1

```text
Identify first.
```

Jangan:

```text
hashcat -m 0
```

hanya karena hash terlihat seperti 32 hex.

---

## Rule 2

```text
Fast hash ≠ secure hash.
```

MD5/SHA-1 sangat cepat sehingga password lemah dapat diuji sangat cepat.

---

## Rule 3

```text
Wordlist first.
```

Untuk banyak CTF:

```text
rockyou
    ↓
best64
    ↓
hybrid
    ↓
mask
```

cukup efektif.

---

## Rule 4

```text
Rules > blind brute force
```

Jika password manusia:

```text
Password1
Summer2026
Admin123
```

rules sangat masuk akal.

---

## Rule 5

```text
Slow hash → quality over quantity
```

Untuk:

```text
bcrypt
Argon2
```

wordlist kecil tapi relevan sering jauh lebih rasional dibanding massive brute force.

---

## Rule 6

```text
Cracking plaintext bukan selalu tujuan.
```

NTLM mungkin lebih berguna untuk:

```text
authentication path
```

daripada dipaksa menjadi plaintext.

---

## Rule 7

```text
Failure is information.
```

Jika tidak cracked:

```text
bukan berarti "harus brute force selamanya"
```

Artinya:

```text
hipotesis sekarang belum menghasilkan akses
```

Reassess.

---

# 🧪 REALISTIC HASHCAT STATUS OUTPUT

Contoh output yang perlu dikenali pemula:

```text
Session..........: ctf-md5
Status...........: Running
Hash.Mode........: 0 (MD5)
Hash.Target......: 5f4dcc3b5aa765d61d8327deb882cf99
Time.Started.....: Tue Sep 08 18:00:01 2026
Time.Estimated...: Tue Sep 08 18:00:03 2026
Kernel.Feature...: Pure Kernel
Guess.Base.......: File (/usr/share/wordlists/rockyou.txt)
Guess.Queue......: 1/1 (100.00%)
Speed.#1.........: 8250.7 MH/s
Recovered........: 0/1 (0.00%)
Progress.........: 7434240/14344391 (51.82%)
Rejected.........: 0/7434240 (0.00%)
Restore.Point....: 7434240/14344391
Candidates.#1....: dragon -> dragons
```

Keyboard controls saat Hashcat berjalan:

```text
[s]tatus
[p]ause
[r]esume
[b]ypass
[c]heckpoint
[q]uit
```

Gunakan:

```text
s
```

untuk melihat status manual.

---

# 🚨 CRITICAL PITFALLS

## Jangan salah mengira:

```text
MD5
```

dengan:

```text
MD5-Crypt
```

Karena:

```text
raw MD5      → -m 0
MD5-Crypt    → -m 500
```

---

## Jangan salah mengira:

```text
SHA-512
```

dengan:

```text
SHA-512-Crypt
```

Karena:

```text
raw SHA-512       → -m 1700
Linux $6$         → -m 1800
```

---

## Jangan salah mengira:

```text
SHA-256
```

dengan:

```text
SHA-256-Crypt
```

Karena:

```text
raw SHA-256       → -m 1400
Linux $5$         → -m 7400
```

---

## Jangan menggunakan mode dari blog lama secara buta

Validasi:

```bash
# Memeriksa mode aktual yang didukung Hashcat versi lokal
hashcat -hh
```

Karena daftar mode Hashcat dapat berkembang/change antara release. Hashcat 7.0.0 adalah contoh konkret bahwa mode dan opsi yang tersedia harus diverifikasi terhadap instalasi lokal.

---

# 🧰 FINAL CHECKLIST

Sebelum menjalankan cracking:

```text
[ ] Hash source diketahui
[ ] Aktivitas authorized
[ ] Hash tidak malformed
[ ] Prefix diperiksa
[ ] Hash type diidentifikasi
[ ] Hashcat -m diverifikasi
[ ] Wordlist tersedia
[ ] Rule file tersedia jika dibutuhkan
[ ] Candidate strategy masuk akal
[ ] Potfile dipahami
[ ] GPU/backend diperiksa
[ ] Tidak asal menggunakan --force
[ ] Keyspace diperkirakan
[ ] Timeout/stop condition dipikirkan
[ ] Alternative path dipertimbangkan
```

---

# 🧠 FINAL MENTAL MODEL

Hash cracking bukan:

```text
"jalankan hashcat dan tunggu"
```

Hash cracking adalah:

```text
              OBSERVE
                 │
                 ▼
              IDENTIFY
                 │
                 ▼
              VALIDATE
                 │
                 ▼
            HYPOTHESIZE
                 │
                 ▼
         GENERATE CANDIDATES
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
    WORDLIST   RULES     MASK
       │         │         │
       └─────────┼─────────┘
                 ▼
              TEST
                 │
          ┌──────┴──────┐
          ▼             ▼
       SUCCESS        FAILURE
          │             │
          ▼             ▼
        DONE       REASSESS
                        │
                        ▼
                 ALTERNATIVE PATH
```

Tujuan akhirnya bukan menjadi orang yang paling banyak menjalankan command.

Tujuannya adalah menjadi orang yang:

```text
melihat hash
    ↓
langsung tahu bentuknya
    ↓
tahu mode yang benar
    ↓
tahu attack strategy yang masuk akal
    ↓
bisa menghitung apakah attack feasible
    ↓
tahu kapan harus berhenti
    ↓
tahu jalur alternatif
```

---

# 🔗 REFERENSI UTAMA

- Hashcat official documentation — attack modes, options, hash modes, workload profiles, status output.
    
- Hashcat Rule-Based Attack documentation.
    
- Hashcat current example/hash-mode documentation, termasuk Kerberos dan network hash modes.
    
- Openwall John the Ripper documentation and FAQ untuk format dan `*2john` utilities.
    

---

# 🚀 Lanjut ke File Berikutnya

## File 55 — Forensics

Setelah File 54, kamu sudah punya kemampuan:

```text
IDENTIFY HASH
      ↓
EXTRACT HASH
      ↓
CHOOSE CRACKING MODE
      ↓
WORDLIST
      ↓
RULES
      ↓
HYBRID
      ↓
MASK
      ↓
ALTERNATIVE PATH
```

Tetapi dalam banyak CTF dan pentest, hash/password material tidak selalu diberikan secara langsung.

Kadang yang kamu dapat hanya:

```text
memory dump
disk image
Windows artifacts
browser artifacts
deleted files
registry hive
event logs
USB artifacts
command history
credentials remnants
```

Maka pertanyaan berikutnya berubah dari:

```text
"Bagaimana crack hash ini?"
```

menjadi:

```text
"Di mana credential material sebenarnya berada?"
```

Di situlah **Forensics** menjadi penting.

Workflow berikutnya harus mengajarkan:

```text
EVIDENCE
   │
   ▼
ACQUISITION
   │
   ▼
IDENTIFICATION
   │
   ▼
EXTRACTION
   │
   ├── FILES
   ├── MEMORY
   ├── REGISTRY
   ├── LOGS
   ├── BROWSER
   ├── ARTIFACTS
   └── CREDENTIAL MATERIAL
   │
   ▼
ANALYSIS
   │
   ▼
CORRELATION
   │
   ▼
FIND ACCESS / FLAG
```

---

# [🔐 File 54 — Hash Cracking Workflow](/docs/hash-cracking)

# 🔐 Hash Cracking — Complete Attack Workflow

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. File ini melanjutkan langsung dari [🧭 BAGIAN 0: FONDASI CRYPTO CTF](/docs/crypto-identification) — File 53 menjawab "hash ini apa?", File 54 menjawab "bagaimana cara crack-nya?"

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export HASH_FILE=~/hash_work/target.hash
export WORDLIST="/usr/share/wordlists/rockyou.txt"
mkdir -p ~/hash_work/{hashes,output,wordlists,rules}
cd ~/hash_work

# Pastikan rockyou.txt tersedia
if [ -f /usr/share/wordlists/rockyou.txt.gz ]; then
    sudo gzip -dk /usr/share/wordlists/rockyou.txt.gz
fi

# Verifikasi tools
which hashcat john zip2john pdf2john ssh2john office2john 2>/dev/null
hashcat -I  # Cek GPU/backend tersedia
echo "[*] Wordlist: $(wc -l < $WORDLIST) kandidat"
```

**Output yang diharapkan:**

text

```
OpenCL Info:
  Platform #1: NVIDIA CUDA
  Device #1: GeForce GTX 1650
[*] Wordlist: 14344392 kandidat
```

**OUTPUT GAGAL ❌ — No devices found:**

text

```
No devices found/left
```

➡️ Gunakan CPU mode:

Bash

```
# Force CPU backend
hashcat --backend-ignore-cuda --backend-ignore-opencl -b -m 0
# Atau tambah --force (hanya jika memahami risikonya)
hashcat --force -m 0 -a 0 $HASH_FILE $WORDLIST
```

---

## ══════════════════════════════════════

## FASE 0: IDENTIFIKASI HASH

## ══════════════════════════════════════

> **WAJIB DILAKUKAN SEBELUM APAPUN.** Jangan langsung jalankan hashcat tanpa tahu hash mode yang benar.

### Langkah 0.1 — Simpan Hash & Identifikasi Format

Bash

```
# Simpan hash ke file (satu hash per baris, tanpa whitespace)
echo -n "MASUKKAN_HASH_DISINI" > ~/hash_work/hashes/target.hash
export HASH_FILE=~/hash_work/hashes/target.hash

# Verifikasi tidak ada whitespace tersembunyi
cat -A $HASH_FILE

# Command 1: hashid — identifikasi + saran hashcat mode
hashid -m -j "$(cat $HASH_FILE)"

# Command 2: hash-identifier interaktif
hash-identifier <<< "$(cat $HASH_FILE)"

# Command 3: Cek panjang untuk identifikasi manual cepat
python3 -c "
h = open('$HASH_FILE').read().strip()
print(f'Hash: {h[:50]}...' if len(h) > 50 else f'Hash: {h}')
print(f'Panjang: {len(h)} karakter')
# Identifikasi berdasarkan panjang
sizes = {32:'MD5/NTLM (-m 0/-m 1000)', 40:'SHA-1 (-m 100)', 
         56:'SHA-224 (-m 1300)', 64:'SHA-256 (-m 1400)', 
         96:'SHA-384 (-m 10800)', 128:'SHA-512 (-m 1700)'}
print(f'Kemungkinan: {sizes.get(len(h), \"Tidak cocok panjang standar\")}')
# Cek prefix
if h.startswith('\$2'): print('→ bcrypt (-m 3200)')
elif h.startswith('\$6\$'): print('→ SHA-512-Crypt Linux (-m 1800)')
elif h.startswith('\$5\$'): print('→ SHA-256-Crypt Linux (-m 7400)')
elif h.startswith('\$1\$'): print('→ MD5-Crypt (-m 500)')
elif h.startswith('\$y\$'): print('→ yescrypt — verifikasi hashcat -hh')
elif h.startswith('\$krb5tgs\$23'): print('→ Kerberoast (-m 13100)')
elif h.startswith('\$krb5asrep\$23'): print('→ AS-REP Roast (-m 18200)')
elif h.startswith('\$P\$') or h.startswith('\$H\$'): print('→ PHPass/WordPress legacy (-m 400)')
elif h.startswith('\$argon2'): print('→ Argon2 — verifikasi hashcat -hh')
"
```

**OUTPUT BERHASIL ✅ — hashid mengenali:**

text

```
Analyzing '5f4dcc3b5aa765d61d8327deb882cf99'
[+] MD5 [Hashcat Mode: 0]
[+] MD4 [Hashcat Mode: 900]

Panjang: 32 karakter
Kemungkinan: MD5/NTLM (-m 0/-m 1000)
```

➡️ Mode teridentifikasi. **Pilih mode yang paling likely, lanjut ke Fase 1.**

**OUTPUT GAGAL ❌ — cat -A menunjukkan karakter aneh:**

text

```
5f4dcc3b5aa765d61d8327deb882cf99^M$
```

➡️ Ada carriage return (`^M`) atau karakter tersembunyi:

Bash

```
# Bersihkan hash file
tr -d '\r\n' < $HASH_FILE > /tmp/clean.hash && mv /tmp/clean.hash $HASH_FILE
dos2unix $HASH_FILE 2>/dev/null || sed -i 's/\r//' $HASH_FILE
cat -A $HASH_FILE  # Verifikasi ulang
```

---

### Langkah 0.2 — Tabel Referensi Cepat

**Gunakan tabel ini untuk mapping hash → hashcat mode:**

|Hash|Contoh / Ciri|Hashcat -m|John Format|
|---|---|---|---|
|MD5|32 hex chars|`0`|`raw-md5`|
|NTLM|32 hex, dari Windows SAM|`1000`|`nt`|
|SHA-1|40 hex chars|`100`|`raw-sha1`|
|SHA-256|64 hex chars|`1400`|`raw-sha256`|
|SHA-512|128 hex chars|`1700`|`raw-sha512`|
|MD5-Crypt|`$1$...`|`500`|`md5crypt`|
|SHA-256-Crypt|`$5$...`|`7400`|`sha256crypt`|
|SHA-512-Crypt|`$6$...`|`1800`|`sha512crypt`|
|bcrypt|`$2a/$2b/$2y$...`|`3200`|`bcrypt`|
|NetNTLMv2|`user::DOMAIN:challenge:...`|`5600`|`netntlmv2`|
|NetNTLMv1|challenge response format|`5500`|`netntlmv1`|
|Kerberoast|`$krb5tgs$23$...`|`13100`|—|
|AS-REP Roast|`$krb5asrep$23$...`|`18200`|—|
|WordPress legacy|`$P$...` atau `$H$...`|`400`|`phpass`|
|WordPress modern|`$2y$...`|`3200`|`bcrypt`|
|MySQL 4.1+|`*2470C0C...` (41 chars)|`300`|—|
|KeePass|`$keepass$...`|`13400`|`keepass`|

> ⚠️ **PENTING:** Selalu verifikasi mode dengan `hashcat -hh | grep -i <nama>` karena mode bisa berbeda antar versi.

---

### Langkah 0.3 — Validasi Mode Sebelum Jalankan

Bash

```
# WAJIB: Cek mode di instalasi lokal
hashcat -hh | grep -i "md5\b" | head -5
hashcat -hh | grep -i "sha-512 crypt" | head -5
hashcat -hh | grep -i "bcrypt" | head -5
hashcat -hh | grep -i "kerberos" | head -5

# Cek keyspace sebelum jalankan (estimasi waktu)
hashcat -m 0 -a 0 $HASH_FILE $WORDLIST --keyspace 2>/dev/null || \
echo "[*] Gunakan wc -l untuk estimasi: $(wc -l < $WORDLIST) kandidat"
```

---

## ══════════════════════════════════════

## FASE 1: QUICK WIN — ONLINE LOOKUP

## ══════════════════════════════════════

> **Coba ini DULU sebelum cracking lokal.** Bisa hemat waktu berjam-jam. Gunakan HANYA untuk hash dari CTF/lab yang kamu miliki otorisasi.

### Langkah 1.1 — Online Database Lookup

Bash

```
HASH=$(cat $HASH_FILE)

# Informasi untuk lookup manual
echo "[*] Buka browser dan cek hash ini:"
echo "    Hash: $HASH"
echo ""
echo "1. CrackStation: https://crackstation.net/"
echo "   → Paste hash → Submit → Cek hasilnya"
echo ""
echo "2. Hashes.com: https://hashes.com/en/decrypt/hash"
echo "   → Input hash → Search → Lihat hasil"
echo ""
echo "3. MD5Decrypt: https://md5decrypt.net/"
echo "   → Untuk MD5 spesifik"

# Jika punya akses curl ke API (beberapa layanan punya)
# curl -s "https://hashes.com/api/v1/decrypt" --data "hash=$HASH&key=APIKEY"

read -p "Apakah online lookup berhasil? (y/n): " result
if [ "$result" = "y" ]; then
    read -p "Masukkan plaintext yang ditemukan: " plaintext
    echo "$HASH:$plaintext" >> ~/hash_work/output/cracked.txt
    echo "[+] SELESAI! Password: $plaintext"
    exit 0
fi
echo "[*] Online lookup gagal, lanjut ke cracking lokal..."
```

**OUTPUT BERHASIL ✅ — Hash ditemukan online:**

text

```
5f4dcc3b5aa765d61d8327deb882cf99 - MD5 - password
```

➡️ **SELESAI!** Simpan hasil dan lanjut gunakan password tersebut.

**OUTPUT GAGAL ❌ — Not found / No match:**

text

```
Hash not found in database
```

➡️ Hash tidak ada di database publik (mungkin salted, custom, atau rare). Lanjut ke **Fase 2 — Cracking Lokal**.

---

## ══════════════════════════════════════

## FASE 2: WORDLIST ATTACK (Attack Mode 0)

## ══════════════════════════════════════

> **Urutan yang harus diikuti: Wordlist → Rules → Hybrid → Mask. Jangan skip urutan ini.**

### Langkah 2.1 — Basic Wordlist Attack

Bash

```
HASH_MODE=0  # GANTI sesuai hasil identifikasi Fase 0

# Command 1: Basic wordlist - rockyou.txt
hashcat -m $HASH_MODE -a 0 \
    --status --status-timer=30 \
    -o ~/hash_work/output/cracked.txt \
    $HASH_FILE $WORDLIST

# Command 2: Dengan session name (bisa di-resume)
hashcat --session=crack_session \
    -m $HASH_MODE -a 0 \
    $HASH_FILE $WORDLIST

# Command 3: Dengan optimized kernel (lebih cepat untuk hash pendek)
hashcat -m $HASH_MODE -a 0 -O \
    $HASH_FILE $WORDLIST
```

**OUTPUT BERHASIL ✅ — Hash cracked:**

text

```
Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 0 (MD5)
Hash.Target......: 5f4dcc3b5aa765d61d8327deb882cf99
...
5f4dcc3b5aa765d61d8327deb882cf99:password
```

➡️ **PASSWORD KETEMU!** Simpan hasil:

Bash

```
hashcat -m $HASH_MODE --show $HASH_FILE
cat ~/hash_work/output/cracked.txt
```

**OUTPUT BERHASIL ✅ — Session selesai tapi tidak crack:**

text

```
Status...........: Exhausted
Recovered........: 0/1 (0.00%)
```

➡️ Rockyou tidak berhasil. Lanjut ke **Langkah 2.2 — Rules Attack**.

**OUTPUT GAGAL ❌ — No hashes loaded:**

text

```
No hashes loaded.
```

➡️ Format hash salah atau ada whitespace:

Bash

```
cat -A $HASH_FILE      # Cek karakter tersembunyi
hashcat -hh | grep -i "$(head -c 3 $HASH_FILE)"  # Cek prefix
# Jika ada username:hash format:
cut -d ':' -f 2 $HASH_FILE > /tmp/hash_only.txt
hashcat -m $HASH_MODE -a 0 /tmp/hash_only.txt $WORDLIST
# Atau gunakan --username flag
hashcat -m $HASH_MODE -a 0 --username $HASH_FILE $WORDLIST
```

**OUTPUT GAGAL ❌ — Token length exception:**

text

```
Token length exception
```

➡️ Hash mode salah untuk panjang hash ini:

Bash

```
# Cek panjang aktual
wc -c $HASH_FILE
# Re-identifikasi
hashid -m "$(cat $HASH_FILE)"
# Coba mode yang berbeda
```

---

### Langkah 2.2 — Rules Attack (Wordlist + Transformasi)

Bash

```
# Cek rule files yang tersedia
find /usr/share/hashcat/rules/ -name "*.rule" 2>/dev/null | head -20
ls /usr/share/hashcat/rules/ 2>/dev/null

# Command 1: best64 rules (64 transformasi umum, MULAI DARI SINI)
hashcat -m $HASH_MODE -a 0 \
    $HASH_FILE $WORDLIST \
    -r /usr/share/hashcat/rules/best64.rule \
    -o ~/hash_work/output/cracked.txt

# Command 2: Kombinasi dua rules
hashcat -m $HASH_MODE -a 0 \
    $HASH_FILE $WORDLIST \
    -r /usr/share/hashcat/rules/best64.rule \
    -r /usr/share/hashcat/rules/toggles1.rule

# Command 3: Lihat kandidat yang dihasilkan rules (tanpa cracking)
hashcat --stdout $WORDLIST \
    -r /usr/share/hashcat/rules/best64.rule | head -50

# Command 4: Simpan hasil rules expansion untuk digunakan lagi
hashcat --stdout $WORDLIST \
    -r /usr/share/hashcat/rules/best64.rule \
    > ~/hash_work/wordlists/expanded_rockyou.txt
echo "[*] Total kandidat: $(wc -l < ~/hash_work/wordlists/expanded_rockyou.txt)"
```

**OUTPUT BERHASIL ✅ — Cracked dengan rules:**

text

```
5f4dcc3b5aa765d61d8327deb882cf99:Password123
```

➡️ Rules berhasil mengubah `password` → `Password123`.

**OUTPUT GAGAL ❌ — Rules file not found:**

text

```
/usr/share/hashcat/rules/best64.rule: No such file
```

➡️ Cari lokasi rules:

Bash

```
find / -name "*.rule" 2>/dev/null | head -10
find / -name "best64.rule" 2>/dev/null
# Download jika tidak ada
wget https://raw.githubusercontent.com/hashcat/hashcat/master/rules/best64.rule \
    -O ~/hash_work/rules/best64.rule
```

**OUTPUT GAGAL ❌ — Exhausted setelah rules:**

text

```
Status...........: Exhausted
Progress.........: 903,900,416/903,900,416 (100.00%)
```

➡️ best64 tidak berhasil. Coba rules yang lebih agresif atau lanjut ke Hybrid.

---

### Langkah 2.3 — Hybrid Attack (Wordlist + Mask)

Bash

```
# Hybrid -a 6: WORDLIST + MASK (suffix)
# Contoh: password + 3 digit → password123
hashcat -m $HASH_MODE -a 6 \
    $HASH_FILE $WORDLIST '?d?d?d' \
    -o ~/hash_work/output/cracked.txt

# Contoh: wordlist + tahun → password2024
hashcat -m $HASH_MODE -a 6 \
    $HASH_FILE $WORDLIST '20?d?d'

# Contoh: wordlist + special char → password!
hashcat -m $HASH_MODE -a 6 \
    $HASH_FILE $WORDLIST '?s'

# Hybrid -a 7: MASK + WORDLIST (prefix)
# Contoh: 1 digit + wordlist → 1password
hashcat -m $HASH_MODE -a 7 \
    $HASH_FILE '?d' $WORDLIST

# Kombinasi: wordlist + huruf besar + angka
hashcat -m $HASH_MODE -a 6 \
    $HASH_FILE $WORDLIST '?u?d?d'
```

**OUTPUT BERHASIL ✅:**

text

```
Status...........: Cracked
5f4dcc3b5aa765d61d8327deb882cf99:password2024
```

**OUTPUT GAGAL ❌ — Semua Hybrid gagal:**  
➡️ Password bukan format `kata+angka`. Coba combination attack atau mask murni.

---

## ══════════════════════════════════════

## FASE 3: MASK ATTACK (Attack Mode 3)

## ══════════════════════════════════════

> Gunakan ini ketika ada info tentang format/panjang password.

### Langkah 3.1 — Mask Attack dengan Pattern Diketahui

Bash

```
# Charset reference:
# ?l = lowercase (a-z)
# ?u = uppercase (A-Z)
# ?d = digit (0-9)
# ?s = special (!@#...)
# ?a = all (?l?u?d?s)

# Command 1: 4 huruf + 4 angka (classic pattern)
hashcat -m $HASH_MODE -a 3 \
    $HASH_FILE '?l?l?l?l?d?d?d?d'

# Command 2: Capitalize + 6 lowercase + angka (Password1 style)
hashcat -m $HASH_MODE -a 3 \
    $HASH_FILE '?u?l?l?l?l?l?l?d'

# Command 3: Format flag CTF — jika tahu format
hashcat -m $HASH_MODE -a 3 \
    $HASH_FILE 'CTF{?l?l?l?l?l?l?l?l}'

# Command 4: Custom charset — hanya alfanumerik
hashcat -m $HASH_MODE -a 3 \
    -1 "?l?u?d" \
    $HASH_FILE '?1?1?1?1?1?1?1?1'

# Estimasi keyspace sebelum jalankan
hashcat -m $HASH_MODE -a 3 \
    $HASH_FILE '?l?l?l?l?d?d?d?d' \
    --keyspace
```

**OUTPUT BERHASIL ✅ — Keyspace check:**

text

```
Keyspace...: 2,821,109,907,456
```

➡️ 2.8 triliun kombinasi — estimasi waktu:

Bash

```
# Estimasi waktu = keyspace / hashrate
# Lihat Speed dari benchmark:
hashcat -b -m $HASH_MODE 2>/dev/null | grep Speed
```

**OUTPUT BERHASIL ✅ — Mask berhasil:**

text

```
Status...........: Cracked
abc12345def56789:Summer2024
```

**OUTPUT GAGAL ❌ — Mask terlalu besar/lambat:**

text

```
[s]tatus
Time.Estimated...: 3 days, 14 hours
```

➡️ Keyspace terlalu besar. Perkecil mask atau gunakan informasi konteks:

Bash

```
# Jika tau password berkaitan dengan nama perusahaan/orang
# Buat custom wordlist dulu:
cewl http://target-site.com -m 5 -d 2 -w ~/hash_work/wordlists/custom.txt 2>/dev/null
sort -u ~/hash_work/wordlists/custom.txt -o ~/hash_work/wordlists/custom.txt

# Atau gunakan CUPP (jika ada info target)
python3 cupp.py -i 2>/dev/null
```

---

### Langkah 3.2 — Combination Attack (Mode 1)

Bash

```
# Gabungkan dua wordlist
# Contoh: nama + angka/kata
cat > ~/hash_work/wordlists/names.txt << 'EOF'
john
admin
alice
diana
backup
EOF

cat > ~/hash_work/wordlists/suffixes.txt << 'EOF'
123
2024
!
@123
2023!
EOF

hashcat -m $HASH_MODE -a 1 \
    $HASH_FILE \
    ~/hash_work/wordlists/names.txt \
    ~/hash_work/wordlists/suffixes.txt

# Preview kandidat yang akan dibuat
hashcat -a 1 --stdout \
    ~/hash_work/wordlists/names.txt \
    ~/hash_work/wordlists/suffixes.txt | head -20
```

---

## ══════════════════════════════════════

## FASE 4: JOHN THE RIPPER WORKFLOW

## ══════════════════════════════════════

> **Gunakan John untuk:** file terenkripsi (ZIP, PDF, SSH key, Office), atau ketika hashcat tidak cocok.

### Langkah 4.1 — Basic John Usage

Bash

```
# Command 1: Basic wordlist
john --wordlist=$WORDLIST $HASH_FILE

# Command 2: Force format (jika auto-detect salah)
john --format=raw-md5 --wordlist=$WORDLIST $HASH_FILE
john --format=sha512crypt --wordlist=$WORDLIST $HASH_FILE
john --format=bcrypt --wordlist=$WORDLIST $HASH_FILE
john --format=nt --wordlist=$WORDLIST $HASH_FILE

# Command 3: Cek semua format yang tersedia
john --list=formats | grep -i sha512
john --list=formats | grep -i bcrypt
john --list=formats | grep -i ntlm

# Command 4: Tampilkan hasil
john --show $HASH_FILE
```

**OUTPUT BERHASIL ✅:**

text

```
Using default input encoding: UTF-8
Loaded 1 password hash (sha512crypt, crypt(3) $6$ [SHA512 256/256 AVX2 4x])
...
svc_backup       (user)
1g 0:00:01:23 DONE 0.01213g/s 172.3p/s
```

**OUTPUT GAGAL ❌ — Format salah:**

text

```
No password hashes loaded (see FAQ)
```

➡️ Cek format:

Bash

```
john --list=formats | grep -i "md5"
# Kemudian force format yang benar
john --format=raw-md5 --wordlist=$WORDLIST $HASH_FILE
```

---

### Langkah 4.2 — Crack File Terenkripsi dengan John

Bash

```
# === ZIP FILE ===
ZIP_FILE="/path/to/protected.zip"

# Step 1: Extract hash representation
zip2john $ZIP_FILE > ~/hash_work/hashes/zip_hash.txt
cat ~/hash_work/hashes/zip_hash.txt  # Lihat format

# Step 2: Crack
john --wordlist=$WORDLIST ~/hash_work/hashes/zip_hash.txt

# Step 3: Tampilkan password
john --show ~/hash_work/hashes/zip_hash.txt
```

**OUTPUT BERHASIL ✅ — ZIP cracked:**

text

```
protected.zip:summer2026::protected.zip:backup.txt:protected.zip
1 password hash cracked, 0 left
```

➡️ Password ZIP = `summer2026`. Ekstrak file:

Bash

```
unzip -P "summer2026" $ZIP_FILE -d ~/extracted/
```

Bash

```
# === PDF FILE ===
PDF_FILE="/path/to/protected.pdf"
pdf2john $PDF_FILE > ~/hash_work/hashes/pdf_hash.txt
john --wordlist=$WORDLIST ~/hash_work/hashes/pdf_hash.txt
john --show ~/hash_work/hashes/pdf_hash.txt
```

Bash

```
# === SSH PRIVATE KEY ===
KEY_FILE="/path/to/id_rsa"
ssh2john $KEY_FILE > ~/hash_work/hashes/ssh_hash.txt
john --wordlist=$WORDLIST ~/hash_work/hashes/ssh_hash.txt
john --show ~/hash_work/hashes/ssh_hash.txt
```

**OUTPUT BERHASIL ✅ — SSH key cracked:**

text

```
id_rsa:winter2026          (id_rsa)
1 password hash cracked, 0 left
```

➡️ Passphrase SSH key = `winter2026`. Gunakan:

Bash

```
chmod 600 $KEY_FILE
ssh -i $KEY_FILE -o "IdentitiesOnly=yes" user@TARGET
# Masukkan passphrase: winter2026
```

Bash

```
# === OFFICE FILE (Word/Excel) ===
OFFICE_FILE="/path/to/document.docx"
office2john $OFFICE_FILE > ~/hash_work/hashes/office_hash.txt
john --wordlist=$WORDLIST ~/hash_work/hashes/office_hash.txt
john --show ~/hash_work/hashes/office_hash.txt

# === KEEPASS DATABASE ===
KDBX_FILE="/path/to/passwords.kdbx"
keepass2john $KDBX_FILE > ~/hash_work/hashes/keepass_hash.txt
john --wordlist=$WORDLIST ~/hash_work/hashes/keepass_hash.txt
# Atau dengan hashcat:
hashcat -m 13400 ~/hash_work/hashes/keepass_hash.txt $WORDLIST
```

---

## ══════════════════════════════════════

## FASE 5: HASH SPESIFIK — WORKFLOW PER SUMBER

## ══════════════════════════════════════

### Langkah 5.1 — Hash dari /etc/shadow (Linux)

Bash

```
# Ambil dari target setelah dapat shell
# cat /etc/shadow  (butuh root)
# Atau: sudo cat /etc/shadow

# Simpan hash yang relevan
SHADOW_HASH='$6$rounds=5000$saltsalt$HASHVALUEHERE...'
echo "$SHADOW_HASH" > ~/hash_work/hashes/shadow.hash

# Identifikasi prefix
python3 -c "
h = '$SHADOW_HASH'
prefix = h.split('\$')[1] if h.startswith('\$') else 'none'
modes = {'1':'500 (MD5-Crypt)', '5':'7400 (SHA-256-Crypt)', 
         '6':'1800 (SHA-512-Crypt)', 'y':'cek hashcat -hh untuk yescrypt',
         '2a':'3200 (bcrypt)', '2b':'3200 (bcrypt)', '2y':'3200 (bcrypt)'}
print(f'Prefix: \${prefix}\$')
print(f'Mode: {modes.get(prefix, \"Unknown — gunakan hashid\")}')
"

# Crack berdasarkan prefix
# SHA-512-Crypt ($6$)
hashcat -m 1800 -a 0 \
    ~/hash_work/hashes/shadow.hash \
    $WORDLIST \
    -r /usr/share/hashcat/rules/best64.rule

# SHA-256-Crypt ($5$)
hashcat -m 7400 -a 0 \
    ~/hash_work/hashes/shadow.hash $WORDLIST

# MD5-Crypt ($1$)
hashcat -m 500 -a 0 \
    ~/hash_work/hashes/shadow.hash $WORDLIST

# Metode alternatif: unshadow + john
unshadow /etc/passwd /etc/shadow > ~/hash_work/hashes/unshadowed.txt
john --wordlist=$WORDLIST ~/hash_work/hashes/unshadowed.txt
john --show ~/hash_work/hashes/unshadowed.txt
```

**OUTPUT BERHASIL ✅ — SHA-512-Crypt cracked:**

text

```
Status...........: Cracked
$6$rounds=5000$saltsalt$HASH...:backup2023
```

➡️ Password = `backup2023`. Test login:

Bash

```
# Coba SSH atau su dengan password ini
ssh backup@$TARGET  # masukkan: backup2023
# Atau dari shell yang ada:
su - backup  # masukkan: backup2023
```

**OUTPUT GAGAL ❌ — SHA-512-Crypt sangat lambat:**

text

```
Speed.#1.........: 1,234 H/s
Time.Estimated...: 3 hours, 47 minutes
```

➡️ Normal untuk KDF lambat. Strategi untuk slow hash:

Bash

```
# Buat wordlist kontekstual yang lebih kecil
# Cari petunjuk dari nama user, hostname, files yang ditemukan
grep -r "password\|secret\|hint" ~/loot/ 2>/dev/null

# Gunakan wordlist yang lebih targeted
head -n 10000 $WORDLIST > ~/hash_work/wordlists/top10k.txt
hashcat -m 1800 -a 0 \
    ~/hash_work/hashes/shadow.hash \
    ~/hash_work/wordlists/top10k.txt \
    -r /usr/share/hashcat/rules/best64.rule
```

---

### Langkah 5.2 — Hash NTLM dari Windows (SAM/NTDS/Secretsdump)

Bash

```
# Format dari secretsdump/mimikatz:
# username:RID:LMHASH:NTLMHASH:::
# Contoh: Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe...

# Simpan dump
cat dump.txt
# Output: Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::

# Ekstrak hanya NTLM hash (kolom 4)
cut -d ':' -f 4 dump.txt > ~/hash_work/hashes/ntlm_only.hash

# Atau ambil satu hash
echo "fc525c9683e8fe067095ba2ddc971881" > ~/hash_work/hashes/ntlm.hash

# Crack NTLM
hashcat -m 1000 -a 0 \
    ~/hash_work/hashes/ntlm_only.hash \
    $WORDLIST \
    -r /usr/share/hashcat/rules/best64.rule \
    -o ~/hash_work/output/ntlm_cracked.txt

# Jika hash dalam format username:hash
hashcat -m 1000 -a 0 --username \
    dump.txt $WORDLIST

# Tampilkan hasil
hashcat -m 1000 --show ~/hash_work/hashes/ntlm_only.hash
```

**OUTPUT BERHASIL ✅ — NTLM cracked:**

text

```
fc525c9683e8fe067095ba2ddc971881:Password123!
```

➡️ Password = `Password123!`. Gunakan untuk:

Bash

```
# Test ke service lain dengan password plaintext
nxc smb $TARGET -u "Administrator" -p "Password123!"
nxc winrm $TARGET -u "Administrator" -p "Password123!"

# Atau langsung PTH tanpa crack (jika butuh auth saja)
impacket-psexec "Administrator@$TARGET" -hashes "aad3b435...:fc525c96..."
```

**PENTING — PTH vs Cracking:**

text

```
Punya NTLM hash?
│
├── Butuh PASSWORD PLAINTEXT? → Crack (hashcat -m 1000)
│   (untuk: test reuse di service lain, report, policy check)
│
└── Butuh AUTHENTICATION saja? → Pass-the-Hash langsung
    (untuk: impacket-psexec, nxc -H, evil-winrm -H)
    → LEBIH CEPAT, tidak perlu crack
```

---

### Langkah 5.3 — Hash dari Active Directory (Kerberoasting & AS-REP)

Bash

```
# Kerberoast hash (dari impacket-GetUserSPNs atau Rubeus)
# Format: $krb5tgs$23$*svc_mssql$CORP.LOCAL$...*$...

KERB_FILE="~/hash_work/hashes/kerberoast.hash"

# Crack Kerberoast
hashcat -m 13100 -a 0 \
    $KERB_FILE $WORDLIST \
    -r /usr/share/hashcat/rules/best64.rule \
    -o ~/hash_work/output/kerb_cracked.txt

# Dengan hybrid (service account sering pakai format ini)
hashcat -m 13100 -a 6 \
    $KERB_FILE $WORDLIST '?d?d?d?d'

# AS-REP Roast hash
# Format: $krb5asrep$23$user@DOMAIN:...
ASREP_FILE="~/hash_work/hashes/asrep.hash"

hashcat -m 18200 -a 0 \
    $ASREP_FILE $WORDLIST \
    -r /usr/share/hashcat/rules/best64.rule

# Tampilkan hasil
hashcat -m 13100 --show $KERB_FILE
hashcat -m 18200 --show $ASREP_FILE
```

**OUTPUT BERHASIL ✅ — Kerberoast cracked:**

text

```
$krb5tgs$23$*svc_mssql$...:Service@2024!
```

➡️ Password service account = `Service@2024!`. Gunakan untuk:

Bash

```
export USER="svc_mssql"
export PASS="Service@2024!"
# Test ke semua service
nxc smb $TARGET -u "$USER" -p "$PASS"
nxc mssql $TARGET -u "$USER" -p "$PASS"  # → ke <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
```

---

### Langkah 5.4 — Hash dari Network Capture (Responder/NetNTLM)

Bash

```
# NetNTLMv2 dari Responder
# Format: user::DOMAIN:challenge:response:blob
# Contoh: administrator::CORP:1122334455667788:ABC...

NTLMv2_FILE="~/hash_work/hashes/ntlmv2.hash"

# Crack NetNTLMv2
hashcat -m 5600 -a 0 \
    $NTLMv2_FILE $WORDLIST \
    -r /usr/share/hashcat/rules/best64.rule

# NetNTLMv1 (lebih lemah)
hashcat -m 5500 -a 0 $NTLMv2_FILE $WORDLIST

# Tampilkan hasil
hashcat -m 5600 --show $NTLMv2_FILE
```

**OUTPUT BERHASIL ✅:**

text

```
administrator::CORP:...:Welcome1
```

**⚠️ Ingat:** NetNTLMv2 bisa juga di-relay tanpa perlu crack:

Bash

```
# Jika target punya SMB signing disabled → relay lebih cepat
# → lihat <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a> Fase 8 (NTLM Relay)
```

---

### Langkah 5.5 — Hash dari Database (Web App)

Bash

```
# MySQL 4.1/5.x hash (dari database dump)
# Format: *2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19 (41 chars, starts with *)
echo "*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19" > mysql.hash
hashcat -m 300 -a 0 mysql.hash $WORDLIST

# WordPress modern (bcrypt $2y$)
# WordPress 6.x+ menggunakan bcrypt
echo '$2y$10$abcdefghijklmnopqrstuuVGewgkOoJ.FMG4pqMCqDtMqXiJA6K2' > wp.hash
hashcat -m 3200 -a 0 wp.hash $WORDLIST

# WordPress legacy (PHPass $P$)
echo '$P$BxBLMpqmY5x8B4mELjuM5kfx8k4U.' > wp_legacy.hash
hashcat -m 400 -a 0 wp_legacy.hash $WORDLIST

# Identifikasi WordPress hash type
python3 -c "
h = open('wp.hash').read().strip()
if h.startswith('\$2'): print('→ WordPress 6.x+ bcrypt: hashcat -m 3200')
elif h.startswith('\$P\$') or h.startswith('\$H\$'): print('→ WordPress legacy PHPass: hashcat -m 400')
else: print('→ Unknown, gunakan hashid')
"
```

---

## ══════════════════════════════════════

## FASE 6: CUSTOM WORDLIST GENERATION

## ══════════════════════════════════════

> Gunakan ini ketika rockyou tidak berhasil dan ada konteks tentang target.

### Langkah 6.1 — CeWL (Generate dari Website)

Bash

```
# Jika ada website terkait target
TARGET_URL="http://target.com"

# Generate wordlist dari website
cewl $TARGET_URL \
    -m 5 \
    -d 2 \
    -w ~/hash_work/wordlists/cewl_words.txt

# Cek hasil
wc -l ~/hash_work/wordlists/cewl_words.txt
cat ~/hash_work/wordlists/cewl_words.txt | head -20

# Bersihkan dan deduplicate
sort -u ~/hash_work/wordlists/cewl_words.txt -o ~/hash_work/wordlists/cewl_words.txt

# Crack dengan custom wordlist + rules
hashcat -m $HASH_MODE -a 0 \
    $HASH_FILE ~/hash_work/wordlists/cewl_words.txt \
    -r /usr/share/hashcat/rules/best64.rule
```

**OUTPUT BERHASIL ✅ — CeWL menghasilkan words:**

text

```
company
product
annual
security
admin
...
Total: 234 words
```

---

### Langkah 6.2 — Manual Context-Based Wordlist

Bash

```
# Buat wordlist berbasis konteks target
cat > ~/hash_work/wordlists/context.txt << 'EOF'
CompanyName
company
Backup
backup
Server
Admin
service
CORP
corp
2024
2023
2025
EOF

# Tambahkan variasi dengan Python
python3 << 'SCRIPT'
words = open('/root/hash_work/wordlists/context.txt').read().strip().split('\n')
output = set()

for word in words:
    output.add(word)
    output.add(word.capitalize())
    output.add(word.upper())
    output.add(word.lower())
    # Tambah angka dan tahun yang relevan
    for year in range(2020, 2026):
        output.add(f"{word}{year}")
        output.add(f"{word.capitalize()}{year}")
        output.add(f"{word}{year}!")
    for num in ['1', '12', '123', '1234', '!', '@']:
        output.add(f"{word}{num}")
        output.add(f"{word.capitalize()}{num}")

with open('/root/hash_work/wordlists/context_expanded.txt', 'w') as f:
    for w in sorted(output):
        f.write(w + '\n')

print(f"[+] Total kandidat: {len(output)}")
SCRIPT

# Crack dengan custom wordlist kontekstual
hashcat -m $HASH_MODE -a 0 \
    $HASH_FILE ~/hash_work/wordlists/context_expanded.txt
```

---

### Langkah 6.3 — Merge & Deduplicate Wordlists

Bash

```
# Gabungkan semua wordlist yang ada
cat $WORDLIST \
    ~/hash_work/wordlists/cewl_words.txt \
    ~/hash_work/wordlists/context_expanded.txt \
    > ~/hash_work/wordlists/merged.txt

# Deduplicate dan sort
sort -u ~/hash_work/wordlists/merged.txt -o ~/hash_work/wordlists/merged_unique.txt

echo "[*] Sebelum dedup: $(wc -l < ~/hash_work/wordlists/merged.txt)"
echo "[*] Setelah dedup: $(wc -l < ~/hash_work/wordlists/merged_unique.txt)"

# Crack dengan merged wordlist
hashcat -m $HASH_MODE -a 0 \
    $HASH_FILE ~/hash_work/wordlists/merged_unique.txt \
    -r /usr/share/hashcat/rules/best64.rule
```

---

## ══════════════════════════════════════

## FASE 7: OPTIMISASI & PERFORMANCE

## ══════════════════════════════════════

### Langkah 7.1 — Benchmark & Pilih Strategy

Bash

```
# Benchmark device untuk hash mode target
hashcat -b -m $HASH_MODE 2>/dev/null | grep "Speed\|Hash.Mode"

# Benchmark semua mode umum
for mode in 0 100 1000 1400 1700 1800 3200 13100 18200; do
    speed=$(hashcat -b -m $mode 2>/dev/null | grep "Speed" | awk '{print $NF}')
    echo "Mode $mode: $speed"
done
```

**Cara baca output benchmark:**

text

```
Hash.Mode.: 0 (MD5)
Speed.#1..: 8,456.7 MH/s    ← 8 BILLION per detik → rockyou (14M) selesai dalam < 1 detik

Hash.Mode.: 1800 (sha512crypt $6$, SHA512 (Unix))
Speed.#1..: 1,234 H/s        ← 1234 per detik → rockyou butuh > 3 jam

Hash.Mode.: 3200 (bcrypt)
Speed.#1..: 2,345 H/s        ← Sangat lambat → gunakan targeted wordlist saja
```

**Strategi berdasarkan kecepatan hash:**

text

```
Fast Hash (MD5/SHA-1/NTLM):
  → Rockyou full → Rules → Hybrid → Mask besar → Fine
  
Medium Hash (SHA-512/SHA-256-Crypt):
  → Rockyou → Rules → Stop jika > 3 jam
  
Slow Hash (bcrypt/Argon2):
  → Top 10K wordlist → Targeted context wordlist → Hybrid kecil
  → JANGAN mask besar — tidak feasible
```

---

### Langkah 7.2 — Optimasi Command

Bash

```
# Opsi optimasi yang bisa ditambahkan:

# -O = Optimized kernel (lebih cepat, tapi batasi panjang password)
hashcat -m $HASH_MODE -a 0 -O $HASH_FILE $WORDLIST

# -w 3 = High workload (pakai ini jika headless/dedicated)
hashcat -m $HASH_MODE -a 0 -w 3 $HASH_FILE $WORDLIST

# --session = Bisa di-resume jika terputus
hashcat --session=mysession -m $HASH_MODE -a 0 $HASH_FILE $WORDLIST
# Resume:
hashcat --session=mysession --restore

# Output ke file
hashcat -m $HASH_MODE -a 0 -o output.txt $HASH_FILE $WORDLIST

# Kombinasi optimal untuk CTF (GPU tersedia):
hashcat -m $HASH_MODE -a 0 -O -w 3 \
    --session=ctf \
    -o ~/hash_work/output/cracked.txt \
    $HASH_FILE $WORDLIST \
    -r /usr/share/hashcat/rules/best64.rule
```

**Keyboard shortcuts saat hashcat berjalan:**

text

```
[s] = tampilkan status
[p] = pause
[r] = resume
[b] = bypass (skip ke kandidat berikutnya)
[q] = quit (tapi simpan progress)
```

---

## ══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSI

## ══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`No hashes loaded`|Format salah / whitespace|`cat -A hash.txt` → clean whitespace → cek mode|
|`Token length exception`|Hash mode tidak cocok dengan panjang|Re-identifikasi dengan hashid|
|`Separator unmatched`|Hash punya separator yang confusing|`hashcat -p ':' -m MODE ...`|
|`Hash has already been cracked`|Ada di potfile|`hashcat -m MODE --show hash.txt`|
|`Wordlist not found`|Path salah|`ls -la $WORDLIST` → cek path|
|`Rule file not found`|Rule tidak ada|`find / -name "*.rule" 2>/dev/null`|
|`Not enough memory`|Wordlist + rules terlalu besar|`head -n 100000 wordlist > top100k.txt`|
|`CUDA error`|Driver GPU bermasalah|`hashcat -I` → cek driver → jangan asal `--force`|
|`Exhausted`|Semua kandidat sudah dicoba|Bukan error — ganti strategy|
|`$user:$hash` format|Username ikut masuk|`--username` flag atau `cut -d: -f4 dump.txt`|
|`Approaching final keyspace`|Normal, hampir selesai|Tunggu atau tekan `[s]` untuk cek progress|
|`bcrypt sangat lambat`|KDF mahal by design|Gunakan targeted wordlist kecil|
|`john: No password hashes loaded`|Format tidak dikenali|`john --list=formats \| grep -i <type>`|
|`No such file or directory (zip2john)`|Versi john tanpa jumbo|Install john-jumbo|

---

### Langkah Error — Jika Semua Gagal (Reassess Path)

Bash

```
# Sebelum menyerah, cek asumsi:
echo "=== CHECKLIST SEBELUM GANTI STRATEGI ==="
echo "[ ] 1. Hash mode benar? Cek lagi dengan hashid"
hashid -m "$(cat $HASH_FILE)"

echo "[ ] 2. Hash tidak malformed?"
cat -A $HASH_FILE

echo "[ ] 3. Mungkin salted? Cek ada salt di prefix?"
cat $HASH_FILE

echo "[ ] 4. Wordlist relevan? Mungkin perlu custom wordlist dari konteks?"
echo "       Nama target, nama perusahaan, nama produk?"

echo "[ ] 5. Ada petunjuk dari file lain?"
find ~/loot/ -type f -exec grep -il "password\|pass\|hint\|secret" {} \; 2>/dev/null | head

echo "[ ] 6. NTLM hash? Mungkin bisa PTH tanpa crack?"
echo "[ ] 7. Ada cara lain selain crack? (bypass login, reset, exploit, dll)"
```

**Jika hash benar-benar tidak bisa dicrack:**

text

```
HASH TIDAK CRACK
│
├── Coba: CeWL dari website target → custom wordlist
├── Coba: Konteks OSINT → nama, tanggal, produk
├── Coba: Lebih banyak wordlists (darkweb, rockyou2021)
├── Coba: Hybrid yang lebih targeted
│
└── Jika masih gagal → CARI JALUR ALTERNATIF:
    ├── Pass-The-Hash (jika NTLM)
    ├── Cari credential di file lain
    ├── Web exploit / bypass login
    ├── Privilege escalation path lain
    └── Minta hint dari admin CTF
```

---

## ══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ══════════════════════════════════════

text

```
START: Dapat Hash
│
├─ FASE 0: Identifikasi
│   ├─ hashid -m + cek prefix + cek panjang
│   └─ Tentukan hashcat -m mode yang benar
│
├─ FASE 1: Online Lookup
│   ├─ [Found] → SELESAI
│   └─ [Not Found] → Lanjut cracking lokal
│
├─ FASE 2: Wordlist Attack
│   ├─ Rockyou basic → [Cracked] SELESAI
│   ├─ Rockyou + best64 rules → [Cracked] SELESAI
│   └─ [Gagal] → Fase 3
│
├─ FASE 3: Advanced Attack
│   ├─ Hybrid (wordlist+mask) → [Cracked] SELESAI
│   ├─ Combination attack → [Cracked] SELESAI
│   └─ [Gagal] → Fase 4
│
├─ FASE 4: Mask Attack
│   ├─ [Tahu format] → mask spesifik → [Cracked] SELESAI
│   └─ [Tidak tahu] → Fase 5
│
├─ FASE 5: Custom Strategy
│   ├─ CeWL dari website target
│   ├─ Context-based wordlist
│   ├─ Merge + deduplicate
│   └─ [Cracked] SELESAI / [Gagal] → Reassess
│
└─ REASSESS: Jika semua gagal
    ├─ PTH untuk NTLM (tidak perlu plaintext)
    ├─ Cari credential di tempat lain
    └─ Ganti attack path
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export HASH_FILE=~/hash_work/hashes/target.hash
export WORDLIST=/usr/share/wordlists/rockyou.txt
export HASH_MODE=0  # Ganti sesuai hash type

# === IDENTIFIKASI ===
hashid -m "$(cat $HASH_FILE)"                          # Auto-identify
cat -A $HASH_FILE                                       # Cek hidden chars
hashcat -hh | grep -i "md5\|sha\|bcrypt"               # Cek mode lokal

# === ONLINE LOOKUP ===
# Buka: https://crackstation.net/ atau https://hashes.com/

# === WORDLIST ATTACK ===
hashcat -m $HASH_MODE -a 0 $HASH_FILE $WORDLIST        # Basic
hashcat -m $HASH_MODE -a 0 $HASH_FILE $WORDLIST -r /usr/share/hashcat/rules/best64.rule  # +rules
hashcat -m $HASH_MODE -a 6 $HASH_FILE $WORDLIST '?d?d?d?d'  # +suffix mask

# === MASK ATTACK ===
hashcat -m $HASH_MODE -a 3 $HASH_FILE '?l?l?l?l?d?d?d?d'  # 4lower+4digit
hashcat -m $HASH_MODE -a 3 $HASH_FILE '?u?l?l?l?l?l?d'    # Capital+6lower+digit

# === JOHN — FILE ENCRYPTED ===
zip2john file.zip > zip.hash && john --wordlist=$WORDLIST zip.hash
ssh2john id_rsa > ssh.hash && john --wordlist=$WORDLIST ssh.hash
pdf2john file.pdf > pdf.hash && john --wordlist=$WORDLIST pdf.hash
office2john doc.docx > office.hash && john --wordlist=$WORDLIST office.hash
keepass2john db.kdbx > keepass.hash && john --wordlist=$WORDLIST keepass.hash

# === HASH SPESIFIK ===
hashcat -m 1000 $HASH_FILE $WORDLIST    # NTLM (Windows)
hashcat -m 1800 $HASH_FILE $WORDLIST    # SHA-512-Crypt ($6$ Linux)
hashcat -m 3200 $HASH_FILE $WORDLIST    # bcrypt
hashcat -m 13100 $HASH_FILE $WORDLIST   # Kerberoast
hashcat -m 18200 $HASH_FILE $WORDLIST   # AS-REP Roast
hashcat -m 5600 $HASH_FILE $WORDLIST    # NetNTLMv2

# === SHOW RESULTS ===
hashcat -m $HASH_MODE --show $HASH_FILE  # Tampilkan yang sudah dicrack
john --show $HASH_FILE                   # John version

# === OPTIMASI ===
hashcat -m $HASH_MODE -a 0 -O -w 3 --session=s1 -o cracked.txt $HASH_FILE $WORDLIST
hashcat --session=s1 --restore           # Resume session
```

---

## 🔗 CROSS-WORKFLOW LINKS

text

```
Hash dari mana → gunakan di mana:

Hash dari SMB share (file)    → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a> (Fase 2)
Hash SSH private key          → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a> setelah crack
Hash NTLM dari secretsdump    → <a href="/docs/ntlm-relay" class="text-[#00b4d8] hover:underline font-mono font-semibold">41_ntlm_relay_workflow.md</a> / 42_lateral_movement
Hash Kerberoast               → <a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>
Hash dari /etc/shadow         → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
Hash dari memory dump         → <a href="/docs/memory-forensics" class="text-[#00b4d8] hover:underline font-mono font-semibold">58_memory_forensics_workflow.md</a>
Password dari hash cracked    → Test reuse ke semua service via 04_service_identification
KeePass database              → Isi biasanya berisi banyak credential → semua workflow
```

---

> **➡️ NEXT:** Setelah hash cracking selesai, lanjut ke **[🧭 BAGIAN 0: FONDASI FORENSICS](/docs/forensics)** — kadang credential material tidak ada dalam bentuk hash yang siap dicrack, tapi tersembunyi di dalam memory dump, disk image, registry, atau Windows/Linux artifacts. File 55 mengajarkan cara mencari dan mengekstrak material tersebut.