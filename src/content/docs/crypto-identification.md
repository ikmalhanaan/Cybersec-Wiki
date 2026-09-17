---
id: "53"
title: "🧭 BAGIAN 0: FONDASI CRYPTO CTF"
category: "7. Cryptography & Forensics"
categoryId: "crypto_forensics"
filename: "53_crypto_identification_workflow.md"
refs_out: ["06","28","37","51","52","54","63"]
refs_in: ["52","54","55","56"]
---

## 🧭 BAGIAN 0: FONDASI CRYPTO CTF

### 0.1 Apa Itu Crypto dalam Konteks CTF?

Dalam dunia Capture The Flag (CTF), kategori Kriptografi menguji pemahaman Anda terhadap algoritma matematika, implementasi protokol keamanan, kelemahan pseudorandom generator, dan kesalahan konfigurasi sistem kriptografi.

#### Perbedaan Mendasar: Crypto CTF vs Crypto pada Binary RE

- **Crypto pada Binary RE (Reverse Engineering):** Kriptografi digunakan sebagai mekanisme _obfuscation_ untuk menyembunyikan string atau melindungi alur program. Kuncinya biasanya tersimpan di dalam memori, biner, atau diturunkan dari input user. Solusinya sering kali cukup dengan mengekstrak kunci atau membalik algoritma langsung dari decompilation.
- **Crypto CTF (Murni):** Algoritma dan parameter kriptografinya biasanya diberikan secara terbuka (disediakan _source code_ Python atau deskripsi matematika). Tantangannya bukan mencari kodenya, melainkan menemukan kelemahan matematis pada implementasi algoritma tersebut (misal: faktorisasi RSA, ECB oracle, nonce reuse pada AES-CTR/GCM).

#### Perbedaan Mendasar: Encoding vs Hash vs Encryption

Pemula sering keliru membedakan ketiga konsep ini:

1. **Encoding:** Representasi data dalam format lain untuk keperluan transmisi atau penyimpanan data (bukan untuk keamanan). **Tidak membutuhkan kunci rahasia.** Contoh: Base64, Hex, URL Encoding, ASCII. Dapat dikembalikan ke bentuk asli 100% secara deterministik.
2. **Hashing:** Fungsi matematis satu arah (_one-way function_) yang mengubah input berukuran arbitrer menjadi output berukuran tetap (_digest_). **Tidak dapat didekripsi** karena informasi telah dikompresi; pemecahannya mengandalkan pencocokan kamus (_rainbow table/brute force_). Contoh: MD5, SHA-256, bcrypt.
3. **Encryption (Symmetric & Asymmetric):** Transformasi data plaintext menjadi ciphertext menggunakan algoritma matematis dan **kunci rahasia (_secret key_)**. Hanya pihak yang memegang kunci yang valid yang dapat membaca kembali plaintext aslinya. Contoh: AES, RSA, DES, ChaCha20.

text

```
CIPHERTEXT / DATA MENTAH
          │
          ▼
┌──────────────────────────────────────────────┐
│ [FASE 1] IDENTIFIKASI KARAKTERISTIK          │
│ Panjang byte, Karakter set, Format visual    │
└──────────────────────────────────────────────┘
          │
          ├────────────────────────┬────────────────────────┐
          ▼                        ▼                        ▼
     [ENCODING]                 [HASH]                [ENCRYPTION]
  Base64, Hex, URL          MD5, SHA, bcrypt       Classical, AES, RSA
          │                        │                        │
          ▼                        ▼                        ▼
   Langsung Decode       Lookup / Hashcat Crack    Analisis Parameter & Kunci
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                                   ▼
                         PLAINTEXT / CTF FLAG
```

**Mindset Utama:** _"Identify first, solve second."_ Menghabiskan waktu 5 menit untuk identifikasi awal lebih efektif daripada mencoba berbagai decoder secara acak selama berjam-jam.

---

### 0.2 Kategori Utama Crypto CTF

|Kategori|Karakteristik Utama|Contoh Algoritma|Tools Utama|Estimasi Kesulitan|
|---|---|---|---|---|
|**Encoding**|Memiliki padding, character set terbatas, no key|Base64, Hex, Base32, URL|CyberChef, CLI|Trivial|
|**Classical**|Teks alfabetis, mono/polyalphabetic shift|Caesar, Vigenere, Atbash|CyberChef, dcode.fr|Easy|
|**Hash**|Output ukuran tetap, alfanumerik hex|MD5, SHA-1, SHA-256, NTLM|Hashcat, John, CrackStation|Easy - Medium|
|**Symmetric**|Panjang kelipatan blok (16 bytes), IV, nonce|AES-CBC, AES-ECB, XOR, ChaCha|Python (PyCryptodome)|Medium|
|**Asymmetric**|Parameter besar: n,e,cn,e,c, modulo arithmetic|RSA, Diffie-Hellman, ECC|RsaCtfTool, SageMath|Medium - Hard|
|**Custom Math**|Script Python kustom, LCG, Matrix PRNG|Custom PRNG, Linear Algebra|Python, z3-solver|Variable|

---

### 0.3 Setup Tools Kriptografi di Parrot OS

Parrot OS XFCE telah menyertakan sebagian besar utilitas dasar. Langkah berikut melengkapi dependensi yang sering dibutuhkan untuk crypto challenge.

Bash

```
# 1. Update sistem dan dependensi package
sudo apt update && sudo apt install -y python3-pip python3-dev libgmp-dev libmpfr-dev libmpc-dev hashid hash-identifier john hashcat

# 2. Instalasi modul Python Kriptografi esensial
pip3 install --upgrade pip
pip3 install pycryptodome gmpy2 sympy z3-solver cryptography requests

# 3. Instalasi RsaCtfTool (Framework eksploitasi RSA otomatis)
cd ~/tools 2>/dev/null || mkdir -p ~/tools && cd ~/tools
git clone https://github.com/RsaCtfTool/RsaCtfTool.git
cd RsaCtfTool
pip3 install -r requirements.txt
./RsaCtfTool.py --help > /dev/null && echo "[+] RsaCtfTool terpasang sempurna!"

# 4. Setup CyberChef Lokal (Akses Offline)
# Sangat krusial jika bertanding di CTF environment tanpa koneksi internet (air-gapped)
cd ~/tools
wget https://github.com/gchq/CyberChef/releases/download/v10.18.2/CyberChef_v10.18.2.zip
unzip CyberChef_v10.18.2.zip -d cyberchef_offline
# Akses melalui browser Parrot OS:
# firefox ~/tools/cyberchef_offline/CyberChef_v10.18.2.html &
```

---

## 🔍 BAGIAN 1: IDENTIFICATION WORKFLOW

### 1.1 Prinsip "Identify Before Solve"

Sebelum menjalankan skrip atau mencoba mendekripsi ciphertext, lakukan checklist analisis visual secara berurutan:

1. **Panjang Output (_Byte / Character Count_):** Hitung jumlah karakter string. Apakah bernilai tepat 32, 40, atau 64 (indikasi hash)? Apakah kelipatan 16 (indikasi block cipher AES)?
2. **Karakter Set (_Character Set_):** Apakah hanya terdiri dari huruf besar (`A-Z`), hex (`0-9, a-f`), alfanumerik (`A-Za-z0-9`), atau melibatkan simbol khusus seperti `+`, `/`, `=`?
3. **Pola Visual & Format Khusus:** Periksa padding (karakter `=` di akhir), delimiter titik dua (`:`), tanda dolar (`$`), format prefix/suffix, atau escape sequence (`%`, `\x`).
4. **Konteks Challenge:** Periksa nama challenge atau deskripsinya. Petunjuk sering disisipkan secara halus (misal: judul _"Caesar Salad"_ menandakan Caesar cipher; _"Base jumping"_ menandakan Base encoding).

---

### 1.2 Visual Identification Guide (Tabel Master Identifikasi)

Gunakan tabel referensi berikut untuk mengenali pola ciphertext secara instan:

|No|Tampilan / Ciri Visual Ciphertext|Karakteristik Kunci|Kemungkinan Encoding / Algoritma|Tool Langkah Pertama|
|---|---|---|---|---|
|1|`VGVzdF9TdHJpbmc=`|Diakhiri 1 atau 2 tanda `=`|Base64 Encoding|`base64 -d` / CyberChef|
|2|`JBSWY3DPEBLW64TMMQ======`|Huruf besar `A-Z`, angka `2-7`, padding `=`|Base32 Encoding|`base32 -d` / CyberChef|
|3|`4861636b546865426f78`|Angka `0-9` dan huruf `a-f` (panjang genap)|Hexadecimal (Base16)|`xxd -r -p` / CyberChef|
|4|`1101000 1101001`|Hanya memuat karakter `0` dan `1`|Binary (ASCII Bitstream)|CyberChef (_From Binary_)|
|5|`150 141 143 153`|Angka `0-7` dipisahkan spasi|Octal Representation|CyberChef (_From Octal_)|
|6|`d41d8cd98f00b204e9800998ecf8427e`|Tepat 32 karakter hexadecimal|MD5 Hash|CrackStation / Hashcat|
|7|`da39a3ee5e6b4b0d3255bfef95601890afd80709`|Tepat 40 karakter hexadecimal|SHA-1 Hash|CrackStation / Hashcat|
|8|`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`|Tepat 64 karakter hexadecimal|SHA-256 Hash|Hashcat (`-m 1400`)|
|9|`cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e`|Tepat 128 karakter hexadecimal|SHA-512 Hash|Hashcat (`-m 1700`)|
|10|`$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW`|Prefix `$2a$`, `$2b$`, atau `$2y$`|bcrypt Password Hash|Hashcat (`-m 3200`)|
|11|`$1$ras$e.Kss7.mI3e6TjW01e1xP/`|Prefix `$1$`|MD5 Crypt (Unix)|Hashcat (`-m 500`)|
|12|`$5$rounds=5000$saltsalt...`|Prefix `$5$`|SHA-256 Crypt (Unix)|Hashcat (`-m 7400`)|
|13|`$6$rounds=5000$saltsalt...`|Prefix `$6$`|SHA-512 Crypt (Unix)|Hashcat (`-m 1800`)|
|14|`31d6cfe0d16ae931b73c59d7e0c089c0`|Tepat 32 hex, umum pada Windows auth|NTLM Hash|Hashcat (`-m 1000`)|
|15|`Grfg_Synt{abg_n_erny_synt}`|Struktur teks/flag terbaca, hanya bergeser|Caesar Cipher / ROT13|CyberChef (_ROT13_)|
|16|`Gsv jfrxp yildm ulc...`|Huruf terbaca, format simetris terbalik|Atbash Cipher (A↔ZA↔Z)|CyberChef (_Atbash_)|
|17|`..- -.-. - ..-.`|Rangkaian titik `.` dan garis `-`|Morse Code|CyberChef (_From Morse_)|
|18|`%48%61%63%6b%54%68%65%42%6f%78`|Format `%` diikuti 2 digit hex|URL Encoding|`urllib.parse` / CyberChef|
|19|`&#72;&#97;&#99;&#107;`|Format `&#` diikuti angka desimal|HTML Entity (Decimal)|CyberChef (_From HTML Entity_)|
|20|`&lt;script&gt;&amp;amp;`|Entity simbol HTML standar|HTML Entity (Named)|CyberChef|
|21|`\x48\x61\x63\x6b\x54\x68\x65\x42\x6f\x78`|Format escape sequence `\x`|Python/C Escaped Hex String|Python `bytes.fromhex`|
|22|`\u0048\u0061\u0063\u006b`|Format escape sequence `\u`|Unicode Escaped String|CyberChef (_Unescape Unicode_)|
|23|`++++++++++[>+++++++>...`|Karakter `+ - < > [ ] . ,`|Brainfuck Esolang|dcode.fr (_Brainfuck_)|
|24|`[][(![]+[])[+[]]+...`|Hanya kombinasi simbol `[ ] ( ) ! +`|JSFuck (Obfuscated JS)|Node.js console / Browser|
|25|Kombinasi tabulasi dan spasi saja|String transparan / whitespace|Whitespace Esolang|dcode.fr (_Whitespace_)|
|26|`BAAAB AAABA ABABA`|Blok 5 karakter `A` dan `B`|Baconian Cipher|CyberChef (_Bacon Cipher_)|
|27|`FA DD XG AG VF FA`|Hanya memuat huruf `A, D, F, G, V, X`|ADFGVX Cipher (WWI)|dcode.fr (_ADFGVX_)|
|28|`13-01-19-20-05-18`|Angka `1-26` dipisahkan tanda strip|A1Z26 Cipher|CyberChef (_A1Z26_)|
|29|`-----BEGIN PGP MESSAGE-----`|Header teks terstruktur PGP|PPG / GPG Encrypted Block|GnuPG CLI (`gpg`)|
|30|`-----BEGIN PUBLIC KEY-----`|Header PEM format Base64|Asymmetric Key File (RSA/ECC)|OpenSSL / RsaCtfTool|
|31|`n = 0x8a1... e = 65537 c = 0x5f...`|Tiga parameter eksplisit n,e,cn,e,c|RSA Asymmetric Challenge|RsaCtfTool / Python math|
|32|Byte acak, panjang kelipatan 16 (IV + Data)|Raw bytes biner, block size 128-bit|AES Block Cipher (CBC/ECB)|Python PyCryptodome|
|33|Byte acak, pola panjang sama dengan flag|Ciphertext panjangnya sama persis dengan format flag|XOR Cipher / One-Time Pad|Python brute-force XOR|
|34|`eyJhbGciOiJIUzI1...`|Prefix `eyJ`, 3 bagian dipisah tanda titik `.`|JWT Token (JSON Web Token)|`jwt.io` / Python `pyjwt` / `jwt_tool`|
|35|`$argon2id$v=19$m=...`|Prefix `$argon2id$` / `$argon2i$`|Argon2 Password Hash|Hashcat (`-m 35700` / `-m 35800`)|
|36|`-----BEGIN OPENSSH PRIVATE KEY-----`|PEM format multi-baris|SSH Private Key|`ssh-keygen -y -f key` / `ssh2john`|

---

### 1.3 Analisis Entropi (_Entropy Analysis_)

Entropi Shannon mengukur tingkat keacakan (_randomness_) data pada skala 0.0 hingga 8.0:

- **Entropi Rendah (0.0 - 4.5):** Teks biasa (_plain English text_), representasi source code, atau data terstruktur (misal: encoding Hex/Base64 sederhana).
- **Entropi Sedang (4.5 - 6.5):** Data terkompresi ringan atau gabungan teks dengan karakter khusus.
- **Entropi Tinggi (7.0 - 8.0):** Data terenkripsi dengan algoritma modern (AES, RSA, ChaCha20), data hasil kompresi tinggi (Gzip, ZIP), atau hasil fungsi hash kriptografis.

#### Python Script: Kalkulator Entropi Shannon Mandiri

Simpan script ini sebagai `~/tools/entropy_calc.py`:

Python

```
#!/usr/bin/env python3
import sys
import math
from collections import Counter

def calculate_shannon_entropy(data: bytes) -> float:
    """Menghitung Shannon Entropy dari input bytes (skala 0.0 - 8.0)."""
    if not data:
        return 0.0
    
    entropy = 0.0
    length = len(data)
    byte_counts = Counter(data)
    
    for count in byte_counts.values():
        probability = count / length
        entropy -= probability * math.log2(probability)
        
    return entropy

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <string_or_filepath>")
        sys.exit(1)
        
    target = sys.argv[1]
    try:
        # Coba buka sebagai file terlebih dahulu
        with open(target, "rb") as f:
            content = f.read()
    except (FileNotFoundError, OSError):
        # Jika bukan path file, evaluasi argumen sebagai string mentah
        content = target.encode("utf-8")
        
    ent = calculate_shannon_entropy(content)
    print(f"[*] Panjang Data : {len(content)} bytes")
    print(f"[*] Entropi Nilai: {ent:.4f} / 8.0000")
    
    if ent > 7.2:
        print("[+] Klasifikasi  : Kemungkinan besar TERENKRIPSI (Modern Cipher) atau TERKOMPRESI.")
    elif ent > 5.0:
        print("[+] Klasifikasi  : Kemungkinan ENCODING Kompleks atau Teks Campuran.")
    else:
        print("[+] Klasifikasi  : Kemungkinan BESAR PLAINTEXT, Classical Cipher, atau Weak Encoding.")
```

---

## 📦 BAGIAN 2: ENCODING CHALLENGES

Encoding mengubah representasi biner data agar aman dikirimkan melalui protokol berbasis teks (seperti email atau HTTP). Encoding tidak menggunakan kunci enkripsi.

### 2.1 Hierarchy Encoding Detection

text

```
Input Ciphertext
      │
      ├─ Mengandung '%'? ──────────────► URL Decode
      ├─ Mengandung '&#...;'? ─────────► HTML Entity Decode
      ├─ Hanya memuat 0 dan 1? ────────► Binary Decode (8-bit)
      ├─ Hanya memuat [0-9a-fA-F]? ────► Hex (Base16) Decode
      ├─ Karakter [A-Za-z0-9+/=]? ─────► Base64 Decode
      ├─ Karakter [A-Z2-7=]? ──────────► Base32 Decode
      └─ Karakter [1-9A-HJ-NP-Za-km-z]? ► Base58 Decode (Tanpa 0, O, I, l)
```

---

### 2.2 Base64

Menggunakan 64 karakter: `A-Z`, `a-z`, `0-9`, `+`, `/` dan padding `=`.

Bash

```
# 1. Dekode via terminal Linux
echo -n "SGVsbG8gV29ybGQh" | base64 -d

# 2. Base64 URL-Safe (Karakter '+' diganti '-', '/' diganti '_')
echo -n "SGVsbG8tV29ybGQ_" | tr -- '-_' '+/' | base64 -d
```

#### Custom Alphabet Base64

Beberapa challenge CTF mengacak urutan tabel alfabet Base64 standar:

Python

```
#!/usr/bin/env python3
import base64

# Tabel standar vs tabel custom dari challenge
STANDARD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
CUSTOM_ALPHABET   = "ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba9876543210+/"

encoded_flag = "d20wZ2R5..."

# Terjemahkan custom alphabet kembali ke standar alphabet
translation_rule = str.maketrans(CUSTOM_ALPHABET, STANDARD_ALPHABET)
normalized_input = encoded_flag.translate(translation_rule)

# Decode menggunakan implementasi standar
plaintext = base64.b64decode(normalized_input)
print(f"[+] Hasil Decode: {plaintext.decode(errors='ignore')}")
```

---

### 2.3 Base32 & Base16 (Hex)

Bash

```
# Base32: Karakter A-Z dan angka 2-7
echo -n "JBSWY3DPEBLW64TMMQ======" | base32 -d

# Base16 / Hexadecimal: Karakter 0-9 dan a-f
echo -n "4861636b546865426f78" | xxd -r -p
# Alternatif:
python3 -c 'import sys; print(bytes.fromhex("4861636b").decode())'
```

---

### 2.4 Base58

Base58 membuang karakter ambigu yang sering membingungkan pembaca: angka nol (`0`), huruf O besar (`O`), huruf I besar (`I`), dan huruf L kecil (`l`). Sering digunakan dalam alamat Bitcoin dan protokol IPFS.

Python

```
#!/usr/bin/env python3
# Instal dependensi jika belum ada: pip3 install base58
import base58

encoded_data = "StV1DL6CwTryKyV"
decoded_bytes = base58.b58decode(encoded_data)
print(f"[+] Decoded Base58: {decoded_bytes.decode(errors='ignore')}")
```

---

### 2.5 Binary, Octal, dan URL Encoding

Python

```
#!/usr/bin/env python3
import urllib.parse

# 1. Binary String (8-bit array)
bin_data = "01000011 01010100 01000110"
chars = [chr(int(b, 2)) for b in bin_data.split()]
print("[+] From Binary:", "".join(chars))

# 2. Octal String
oct_data = "103 124 106"
oct_chars = [chr(int(o, 8)) for o in oct_data.split()]
print("[+] From Octal :", "".join(oct_chars))

# 3. URL Encoding
url_data = "%46%4c%41%47%7b%75%72%6c%5f%64%65%63%6f%64%65%64%7d"
print("[+] From URL   :", urllib.parse.unquote(url_data))
```

---

### 2.6 Multi-Layer Encoding Automation

Challenge tingkat dasar sering menerapkan encoding berlapis-lapis (misal: Hex di dalam Base64, lalu di dalam URL encoding). Script berikut melakukan dekode rekursif secara otomatis hingga mencapai string terbaca:

Python

```
#!/usr/bin/env python3
import base64
import binascii
import urllib.parse

def recursive_decoder(payload: str, depth: int = 0) -> str:
    """Mendekode payload multi-layer secara rekursif hingga mencapai plaintext."""
    if depth > 15:
        return payload

    payload = payload.strip()

    # Coba URL Decode
    if "%" in payload:
        unquoted = urllib.parse.unquote(payload)
        if unquoted != payload:
            print(f"[Depth {depth}] URL Decoded")
            return recursive_decoder(unquoted, depth + 1)

    # Coba Base64 Decode
    try:
        # Tambahkan padding jika hilang
        padded = payload + "=" * (-len(payload) % 4)
        b64_attempt = base64.b64decode(padded, validate=True).decode('utf-8')
        if b64_attempt.isprintable() and len(b64_attempt) > 0:
            print(f"[Depth {depth}] Base64 Decoded")
            return recursive_decoder(b64_attempt, depth + 1)
    except Exception:
        pass

    # Coba Hexadecimal Decode
    try:
        hex_attempt = binascii.unhexlify(payload).decode('utf-8')
        if hex_attempt.isprintable() and len(hex_attempt) > 0:
            print(f"[Depth {depth}] Hex Decoded")
            return recursive_decoder(hex_attempt, depth + 1)
    except Exception:
        pass

    return payload

if __name__ == "__main__":
    test_layer = "NDY2YTYxNjc3YjYxNzg2NTZkNWY2MzY4NjE2YTZjNjU2ZTc3NjU2ZDJkNTM2ZjZjNzY2NTY0N2Q="
    print("[*] Memulai Autodecode...")
    final_output = recursive_decoder(test_layer)
    print(f"[+] Output Akhir: {final_output}")
```

---

## 📜 BAGIAN 3: CLASSICAL CIPHERS

Algoritma kriptografi klasik memanipulasi alfabet teks secara langsung melalui pergeseran (_shift_) atau substitusi karakter.

### 3.1 ROT13 & Caesar Cipher

Caesar cipher menggeser setiap karakter alfabet sejauh kk langkah (antara 1 hingga 25). ROT13 adalah implementasi khusus dengan k=13k=13.

Python

```
#!/usr/bin/env python3
import codecs

# 1. Penyelesaian ROT13 Instan
rot13_ciphertext = "Synt{ebg13_vf_abg_rapelcgvba}"
print("[+] ROT13 Decoded:", codecs.decode(rot13_ciphertext, 'rot_13'))

# 2. Caesar Cipher Brute-Force (Semua 25 Kemungkinan Rotasi)
def solve_caesar(ciphertext: str):
    print("\n[*] Menjalankan Brute-force Caesar (Shift 1-25):")
    for shift in range(1, 26):
        decrypted = []
        for char in ciphertext:
            if char.isalpha():
                base = ord('A') if char.isupper() else ord('a')
                # Balikkan pergeseran: (c - base - shift) mod 26
                decrypted.append(chr((ord(char) - base - shift) % 26 + base))
            else:
                decrypted.append(char)
        print(f"Shift {shift:02d}: {''.join(decrypted)}")

solve_caesar("Wklv lv d whvw phvvdjh IRU FWI")
```

---

### 3.2 Vigenère Cipher

Vigenère menggunakan kunci kata untuk menentukan pergeseran karakter alfabet yang dinamis pada setiap posisi.

- **Cara Deteksi:** Pola huruf masih tampak seperti kata-kata alami, namun analisis frekuensi karakter tunggal tampak lebih datar karena menggunakan beberapa alfabet pergeseran sekaligus (_polyalphabetic_).
- **Solusi Otomatis:**
    - Gunakan tool online seperti [dcode.fr Vigenère Solver](https://www.dcode.fr/vigenere-cipher) untuk melakukan uji Kasiski dan Index of Coincidence secara otomatis guna menemukan panjang kunci.

---

### 3.3 Atbash Cipher

Atbash memetakan karakter alfabet secara terbalik: A↔Z,B↔Y,C↔XA↔Z,B↔Y,C↔X.

Python

```
#!/usr/bin/env python3
def atbash_cipher(text: str) -> str:
    result = []
    for char in text:
        if 'A' <= char <= 'Z':
            result.append(chr(ord('Z') - (ord(char) - ord('A'))))
        elif 'a' <= char <= 'z':
            result.append(chr(ord('z') - (ord(char) - ord('a'))))
        else:
            result.append(char)
    return "".join(result)

print("[+] Atbash Decode:", atbash_cipher("Gsv hzxivw flag rh zgyzhs"))
```

---

### 3.4 Affine Cipher

Transformasi matematis karakter berbasis rumus:  
E(x)=(a⋅x+b)(mod26)E(x)=(a⋅x+b)(mod26)  
Dekripsinya:  
D(y)=a−1⋅(y−b)(mod26)D(y)=a−1⋅(y−b)(mod26)  
di mana aa harus koprima dengan 26 (gcd⁡(a,26)=1gcd(a,26)=1).

Python

```
#!/usr/bin/env python3
from gmpy2 import invert

def solve_affine(ciphertext: str, a: int, b: int) -> str:
    """Mendekripsi Affine Cipher dengan nilai coprime a dan offset b."""
    a_inv = int(invert(a, 26))
    plaintext = []
    for c in ciphertext:
        if c.isalpha():
            base = ord('A') if c.isupper() else ord('a')
            val = ord(c) - base
            decrypted_char = chr((a_inv * (val - b)) % 26 + base)
            plaintext.append(decrypted_char)
        else:
            plaintext.append(c)
    return "".join(plaintext)

# Contoh penggunaan jika parameter a dan b diketahui dari analisis
print("[+] Affine:", solve_affine("Ihsso Wgerm!", a=5, b=8))
```

---

### 3.5 Monoalphabetic Substitution & Analisis Frekuensi

Pada monoalphabetic substitution, setiap huruf digantikan oleh huruf unik lain secara konsisten di seluruh teks.

- **Teknik Analisis:** Membandingkan frekuensi kemunculan karakter pada ciphertext dengan distribusi frekuensi bahasa Inggris standar.
- **Tabel Distribusi Frekuensi Karakter Bahasa Inggris:**
    - **Paling sering:** `E` (~12.7%), `T` (~9.1%), `A` (~8.2%), `O` (~7.5%), `I` (~7.0%), `N` (~6.7%)
    - **Digram paling sering:** `TH`, `HE`, `IN`, `ER`, `AN`, `RE`
    - **Trigram paling sering:** `THE`, `AND`, `THA`, `ENT`
- **Solusi Instan:** Untuk ciphertext panjang (>100 karakter), gunakan solver otomatis berbasis model bahasa seperti [quipquip.com](https://quipquip.com/).

---

## #️⃣ BAGIAN 4: HASH IDENTIFICATION & CRACKING

### 4.1 Identifikasi Hash

Fungsi hash mengubah input menjadi representasi byte berukuran tetap (_fixed length digest_).

Bash

```
# 1. Identifikasi hash menggunakan utilitas hashid
hashid -m -j "d41d8cd98f00b204e9800998ecf8427e"

# 2. Identifikasi menggunakan hash-identifier interaktif
hash-identifier
```

#### Panduan Panjang Karakter Hash Mentah (Hex Representation)

|Panjang String Hex|Ukuran Bit|Kemungkinan Algoritma Hash|Hashcat Mode (`-m`)|
|---|---|---|---|
|**32 Karakter**|128-bit|MD5 / NTLM / MD4|`0` (MD5), `1000` (NTLM)|
|**40 Karakter**|160-bit|SHA-1 / RIPEMD-160|`100` (SHA-1)|
|**56 Karakter**|224-bit|SHA-224 / SHA3-224|`1730` (SHA-224)|
|**64 Karakter**|256-bit|SHA-256 / SHA3-256 / BLAKE2s|`1400` (SHA-256)|
|**96 Karakter**|384-bit|SHA-384 / SHA3-384|`10800` (SHA-384)|
|**128 Karakter**|512-bit|SHA-512 / Whirlpool / BLAKE2b|`1700` (SHA-512)|

---

### 4.2 Hash Cracking Strategy

text

```
Target Hash Diterima
         │
         ▼
[LANGKAH 1: Database Lookup Online]
Periksa di CrackStation.net atau Hashes.com
         │
         ├─ Ditemukan? ──► Selesai (Simpan Plaintext)
         │
         ▼ (Tidak Ditemukan)
[LANGKAH 2: Wordlist Attack (Offline)]
Gunakan Hashcat / John the Ripper dengan rockyou.txt
         │
         ├─ Berhasil? ───► Selesai
         │
         ▼ (Gagal)
[LANGKAH 3: Rule-Based Transformation]
Tambahkan rules umum (misal: Best64 / OneRuleToRuleThemAll)
         │
         ▼ (Gagal)
[LANGKAH 4: Mask Attack / Brute-Force Terarah]
Jika pola password diketahui sebagian (misal: Flag{?d?d?d?d})
```

---

### 4.3 Hashcat Workflow di Parrot OS

Persiapkan wordlist standar di Parrot OS:

Bash

```
# Uncompress wordlist rockyou jika masih dalam format gz
if [ -f /usr/share/wordlists/rockyou.txt.gz ]; then
    sudo gunzip /usr/share/wordlists/rockyou.txt.gz
fi
```

#### Perintah Esensial Hashcat untuk CTF

Bash

```
# Template Umum:
# hashcat -m <HASH_MODE> -a <ATTACK_MODE> <HASH_FILE_ATAU_STRING> <WORDLIST>

# 1. Crack MD5 (-m 0) dengan rockyou
hashcat -m 0 "5d41402abc4b2a76b9719d911017c592" /usr/share/wordlists/rockyou.txt

# 2. Crack SHA-256 (-m 1400)
hashcat -m 1400 "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae" /usr/share/wordlists/rockyou.txt

# 3. Crack NTLM Windows Hash (-m 1000)
hashcat -m 1000 "cc32028f0380811b601669c0704983a5" /usr/share/wordlists/rockyou.txt

# 4. Wordlist + Rules Transformation (Memperluas variasi password)
hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# 5. Mask Attack (Menebak format spesifik: 4 huruf kecil + 3 angka)
hashcat -m 0 hashes.txt -a 3 ?l?l?l?l?d?d?d

# 6. Menampilkan hasil crack yang tersimpan di potfile
hashcat -m 0 --show hashes.txt
```

---

## ⚡ BAGIAN 5: XOR CHALLENGES

Operasi bitwise XOR (⊕⊕) adalah fondasi utama kriptografi simetris modern karena efisien dan memiliki sifat reversibilitas matematis.

### 5.1 Sifat Matematis XOR

1. **Komutatif & Asosiatif:**  
    A⊕B=B⊕AA⊕B=B⊕A  
    (A⊕B)⊕C=A⊕(B⊕C)(A⊕B)⊕C=A⊕(B⊕C)
2. **Involutif (Self-Inverting):**  
    A⊕A=0A⊕A=0  
    A⊕0=AA⊕0=A
3. **Reversibilitas Sempurna:**  
    Jika C=P⊕K  ⟹  P=C⊕KdanK=C⊕PJika C=P⊕K⟹P=C⊕KdanK=C⊕P  
    Jika Anda mengetahui ciphertext dan kunci, Anda mendapatkan plaintext. **Jika Anda mengetahui ciphertext dan sebagian plaintext (seperti format flag `CTF{`), Anda dapat merekonstruksi kuncinya.**

---

### 5.2 Single-Byte XOR Brute-Force

Jika ciphertext dienkripsi dengan 1 byte kunci (0−2550−255), coba seluruh 256 kemungkinan dan beri skor berdasarkan karakter alfabet bahasa Inggris:

Python

```
#!/usr/bin/env python3
def score_english_text(text: bytes) -> int:
    """Menilai kecocokan frekuensi string terhadap karakter ASCII alfabetik."""
    score = 0
    common_chars = b"ETAOIN SHRDLUetaoinshrdlu"
    for b in text:
        if b in common_chars:
            score += 2
        elif 32 <= b <= 126: # Printable ASCII
            score += 1
        else:
            score -= 3       # Non-printable penalty
    return score

def solve_single_byte_xor(ciphertext: bytes):
    best_score = -float('inf')
    best_candidate = None
    best_key = None

    for key_candidate in range(256):
        # Operasi XOR terhadap setiap byte data
        decrypted = bytes([b ^ key_candidate for b in ciphertext])
        current_score = score_english_text(decrypted)
        
        if current_score > best_score:
            best_score = current_score
            best_candidate = decrypted
            best_key = key_candidate

    print(f"[+] Kunci Ditemukan : {hex(best_key)} (char: {chr(best_key)!r})")
    print(f"[+] Hasil Plaintext : {best_candidate.decode(errors='ignore')}")

if __name__ == "__main__":
    # Contoh ciphertext hasil single-byte XOR
    cipher_hex = "1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736"
    solve_single_byte_xor(bytes.fromhex(cipher_hex))
```

---

### 5.3 Repeating-Key XOR (Vigenère XOR)

Enkripsi XOR dengan string kunci yang diulang sepanjang ukuran ciphertext:  
C[i]=P[i]⊕K[i(modlen(K))]C[i]=P[i]⊕K[i(modlen(K))]

Python

```
#!/usr/bin/env python3
def repeating_key_xor(data: bytes, key: bytes) -> bytes:
    """Melakukan enkripsi atau dekripsi Repeating Key XOR."""
    return bytes([data[i] ^ key[i % len(key)] for i in range(len(data))])

ciphertext = bytes.fromhex("0b0a3c26001a1b023b201a08061d4b22030a")
key = b"SECRET"
print("[+] Plaintext:", repeating_key_xor(ciphertext, key).decode(errors='ignore'))
```

---

### 5.4 Known-Plaintext XOR Attack

Jika Anda mengetahui awalan plaintext tertentu (misal format flag: `FLAG{` atau `picoCTF{`), Anda dapat mengekstrak awal kunci enkripsinya:

K[0..m]=C[0..m]⊕P[0..m]K[0..m]=C[0..m]⊕P[0..m]

Python

```
#!/usr/bin/env python3
ciphertext = bytes.fromhex("14161c2817452d3a01103f5b0d01")
known_prefix = b"FLAG{"

# Rekonstruksi key sepanjang prefix yang diketahui
partial_key = bytes([c ^ p for c, p in zip(ciphertext, known_prefix)])
print(f"[+] Partial Key Terbaca: {partial_key}")
# Jika partial_key terbaca 'k3y!k', kita dapat menyimpulkan key penuhnya adalah b"k3y!"
```

---

### 5.5 Two-Time Pad Attack (Keystream Reuse)

Jika dua plaintext berbeda dienkripsi menggunakan keystream atau One-Time Pad (KK) yang sama persis:  
C1=P1⊕KC1​=P1​⊕K  
C2=P2⊕KC2​=P2​⊕K  
Maka:  
C1⊕C2=(P1⊕K)⊕(P2⊕K)=P1⊕P2C1​⊕C2​=(P1​⊕K)⊕(P2​⊕K)=P1​⊕P2​  
Nilai kunci KK tereliminasi. Anda kini memiliki XOR dari dua plaintext, yang dapat dipisahkan menggunakan teknik crib-dragging.

---

## 🔑 BAGIAN 6: RSA CHALLENGES

RSA adalah algoritma kriptografi kunci-publik (_asymmetric_). Keamanannya bertumpu pada kesulitan komputasi memfaktorkan perkalian dua bilangan prima besar.

### 6.1 Parameter Matematika RSA

- p,qp,q: Dua bilangan prima rahasia berukuran besar.
- n=p⋅qn=p⋅q: Modulus publik (diumumkan ke publik).
- ϕ(n)=(p−1)(q−1)ϕ(n)=(p−1)(q−1): Fungsi Euler's Totient.
- ee: Eksponen enkripsi publik (umumnya bernilai standar 6553765537 atau 0x100010x10001; terkadang bernilai kecil seperti 33).
- dd: Eksponen dekripsi rahasia: d≡e−1(modϕ(n))d≡e−1(modϕ(n)).
- **Enkripsi:** c≡me(modn)c≡me(modn)
- **Dekripsi:** m≡cd(modn)m≡cd(modn)

> 💡 **ANALOGI UNTUK PEMULA:**
> RSA seperti gembok kombinasi dengan 2 angka rahasia prima ($p$ dan $q$).
> - Yang kamu punya: gembok terkunci ($n = p \times q$), cara mengunci ($e$), dan ciphertext ($c$).
> - Tujuanmu: buka gemboknya untuk mendapatkan isi pesan mentah ($m$).
> - Caranya: temukan 2 angka rahasia prima tersebut ($p$ dan $q$) dengan memfaktorkan $n$, lalu hitung kunci pembuka ($d$).

---

### 6.2 Pohon Keputusan Serangan RSA

text

```
Parameter RSA Diberikan: n, e, c
               │
               ▼
   [Periksa Ukuran Modulus n]
               │
               ├─ Ukuran n < 512 bit? ───────► Faktorkan langsung dengan FactorDB / yafu
               │
               ▼
   [Periksa Eksponen Enkripsi e]
               │
               ├─ e = 3 dan c kecil (m^e < n)? ► Ambil Akar Pangkat 3 Murni (Cube Root)
               ├─ e kecil, m^e > n? ──────────► Hastad Broadcast Attack (jika multiple c)
               ├─ e sangat besar (mendekati n)► Wiener's Attack (d kecil: d < 1/3 * n^0.25)
               │
               ▼
   [Periksa Relasi Eksponen & Modulus]
               │
               ├─ n sama, pesan sama, e1 & e2 beda? ► Common Modulus Attack
               └─ Modulus n1 dan n2 berbagi faktor prima? ► GCD Attack: gcd(n1, n2) = p
```

---

### 6.3 Eksploitasi Otomatis via RsaCtfTool

RsaCtfTool secara otomatis menguji puluhan teknik penyerangan RSA:

Bash

```bash
# 1. Menyerang dengan parameter eksplisit n, e, dan c
python3 ~/tools/RsaCtfTool/RsaCtfTool.py -n 0x8a1... -e 65537 --uncipher 0x5f...

# 2. Menyerang menggunakan public key file (.pem / .pub)
python3 ~/tools/RsaCtfTool/RsaCtfTool.py --publickey target_key.pem --uncipherfile flag.enc

# 3. Dump private key yang berhasil direkonstruksi
python3 ~/tools/RsaCtfTool/RsaCtfTool.py --publickey target_key.pem --dumpkey
```

#### 🔍 Cara Membaca Output RsaCtfTool:

Pemula sering bingung saat membaca log keluaran `RsaCtfTool`. Berikut contoh output nyata dan bagian mana yang merupakan flag target:

```text
[*] Testing key /tmp/public.pem.
[*] Performing attack: Fermat factorization
[*] Performing attack: factordb
[+] Time elapsed: 2.3s
Results for /tmp/public.pem:

PublicKey details:
n: 109120...
e: 65537
d: 891234...  ← Private exponent d yang berhasil direcovery!
p: 10453...   ← Faktor prima pertama p
q: 10432...   ← Faktor prima kedua q

Unciphered data:
HEX : 0x5049436f435446...         ← Hasil dekripsi format Hexadecimal
INT (big endian) : 544...         ← Hasil dekripsi format Big-Endian Integer
STR : picoCTF{r5a_15_3z_ch4ll}   ← FLAG / PLAINTEXT ADA DI SINI! (Lihat baris STR)
```

---

### 6.4 Skenario Solusi Teknis RSA

#### Skenario 1: Parameter pp dan qq Diketahui (Standar)

Jika nn berhasil difaktorkan (misalnya melalui [factordb.com](http://factordb.com/)):

Python

```
#!/usr/bin/env python3
from Crypto.Util.number import inverse, long_to_bytes

n = 1014278931... # Masukkan nilai modulus n
e = 65537
c = 8527319412... # Masukkan ciphertext c
p = 31337...      # Faktor prima p
q = n // p        # Faktor prima q

# 1. Hitung Euler's Totient: phi(n) = (p-1)*(q-1)
phi = (p - 1) * (q - 1)

# 2. Turunkan private exponent d
d = inverse(e, phi)

# 3. Dekripsi ciphertext: m = c^d mod n
m = pow(c, d, n)

# 4. Konversi representasi integer kembali ke bytes
flag = long_to_bytes(m)
print(f"[+] Flag Ditemukan: {flag.decode(errors='ignore')}")
```

#### Skenario 2: Eksponen Kecil (e=3e=3) Tanpa Padding (me<nme<n)

Jika pesan pendek dienkripsi dengan eksponen 33 dan tidak ditambahkan padding, nilai m3m3 tidak melampaui nilai nn. Modulo arithmetic tidak terjadi, sehingga dekripsi cukup dengan mengambil akar pangkat tiga secara normal:

Python

```
#!/usr/bin/env python3
import gmpy2
from Crypto.Util.number import long_to_bytes

c = 195312500000... # Nilai ciphertext
e = 3

# Hitung akar pangkat 3 murni secara presisi tinggi
m, is_exact = gmpy2.iroot(c, e)

if is_exact:
    print(f"[+] Pesan Terdekripsi: {long_to_bytes(int(m)).decode(errors='ignore')}")
else:
    print("[-] Nilai m^e melewati n, membutuhkan k*n offset.")
```

#### Skenario 3: Common Factor / GCD Attack

Jika terdapat dua modulus RSA berbeda (n1n1​ dan n2n2​) yang dihasilkan oleh sistem yang memiliki kelemahan generator acak, keduanya mungkin berbagi satu faktor prima yang sama: gcd⁡(n1,n2)=pgcd(n1​,n2​)=p.

Python

```
#!/usr/bin/env python3
import math
from Crypto.Util.number import inverse, long_to_bytes

# Diberikan n1, c1 dan n2, c2 dengan e yang sama
p = math.gcd(n1, n2)
if p > 1:
    q1 = n1 // p
    phi1 = (p - 1) * (q1 - 1)
    d1 = inverse(e, phi1)
    m = pow(c1, d1, n1)
    print(f"[+] Flag GCD Attack: {long_to_bytes(m).decode(errors='ignore')}")
```

---

## 🔒 BAGIAN 7: AES & SYMMETRIC CIPHERS

Advanced Encryption Standard (AES) memproses data dalam blok-blok berukuran 128-bit (16 byte).

### 7.1 Karakteristik Mode Operasi AES

- **ECB (Electronic Codebook):** Setiap blok 16-byte dienkripsi secara independen dengan kunci yang sama. **Sangat tidak aman.** Jika ada dua blok plaintext yang identik, keduanya akan menghasilkan ciphertext blok yang identik pula (_ECB Penguin Vulnerability_).
- **CBC (Cipher Block Chaining):** Setiap blok plaintext di-XOR dengan blok ciphertext sebelumnya sebelum dienkripsi. Blok pertama di-XOR dengan _Initialization Vector_ (IV). Rentan terhadap _Padding Oracle Attacks_ jika server membocorkan pesan error validasi padding.
- **CTR (Counter Mode):** Mengubah block cipher menjadi stream cipher dengan mengenkripsi kombinasi nonce dan counter. Rentan terhadap serangan _Keystream Reuse_ jika nonce digunakan kembali.

---

### 7.2 Analisis ECB Byte-at-a-Time Decryption

Jika sebuah layanan web menerima input kita, menggabungkannya dengan flag rahasia, lalu mengenkripsinya menggunakan AES-ECB:  
Output=AES-ECB(User Input+Secret Flag)Output=AES-ECB(User Input+Secret Flag)

text

```
Blok 1 (16 bytes): [ A A A A A A A A A A A A A A A ? ]
                                                    │
Kirimkan 15 byte 'A'. Posisi ke-16 akan diisi ──────┘
oleh karakter PERTAMA dari secret flag.
Bandingkan blok tersebut dengan kamus tebakan 256 karakter (A*15 + char).
```

Python

```
#!/usr/bin/env python3
# Template Konseptual Dekripsi Byte-at-a-Time ECB Oracle
def ecb_oracle_attack(oracle_function):
    recovered_secret = b""
    block_size = 16

    for byte_index in range(1, 33): # Panjang tebakan flag
        padding_len = (block_size - (len(recovered_secret) % block_size) - 1)
        crafted_input = b"A" * padding_len
        target_block = oracle_function(crafted_input)[:block_size]

        # Brute-force 256 kemungkinan karakter
        for char in range(256):
            test_payload = crafted_input + recovered_secret + bytes([char])
            output = oracle_function(test_payload)
            if output[:block_size] == target_block:
                recovered_secret += bytes([char])
                print(f"[+] Progress: {recovered_secret}")
                break

    return recovered_secret
```

---

### 7.3 CBC Padding Oracle

Standar padding PKCS#7 mengisi kekurangan blok memori:

- Kekurangan 1 byte: `\x01`
- Kekurangan 2 byte: `\x02\x02`
- Kekurangan 5 byte: `\x05\x05\x05\x05\x05`

Jika server merespons dengan pesan berbeda saat padding valid vs padding invalid (misal: HTTP 200 vs HTTP 500), penyerang dapat memodifikasi ciphertext blok sebelumnya ($C_{i-1}$) untuk merekonstruksi plaintext ($P_i$) byte demi byte tanpa mengetahui kunci rahasianya.

#### Python Script Template: CBC Padding Oracle Attack

```python
#!/usr/bin/env python3
# Template CBC Padding Oracle Exploit
# Asumsi: oracle_query(ciphertext) -> True jika padding valid, False jika invalid

def padding_oracle_decrypt(ciphertext: bytes, oracle_query, block_size=16):
    """
    Dekripsi CBC Padding Oracle satu blok.
    Ciphertext = IV (16 bytes) + Encrypted Block (16 bytes)
    """
    # Pisahkan IV dan ciphertext block
    iv = ciphertext[:block_size]
    ct_block = ciphertext[block_size:block_size*2]
    
    intermediate = bytearray(block_size)  # Nilai intermediate setelah dekripsi AES
    plaintext = bytearray(block_size)
    
    # Dekripsi dari byte terakhir ke pertama
    for byte_pos in range(block_size - 1, -1, -1):
        padding_val = block_size - byte_pos
        
        # Craft IV yang sudah dimodifikasi
        crafted_iv = bytearray(block_size)
        for i in range(byte_pos + 1, block_size):
            crafted_iv[i] = intermediate[i] ^ padding_val
        
        # Brute-force 256 kemungkinan nilai byte
        for guess in range(256):
            crafted_iv[byte_pos] = guess
            test_payload = bytes(crafted_iv) + ct_block
            
            if oracle_query(test_payload):
                # Temukan intermediate byte
                intermediate[byte_pos] = guess ^ padding_val
                # Recover plaintext byte
                plaintext[byte_pos] = intermediate[byte_pos] ^ iv[byte_pos]
                print(f"[+] Byte {byte_pos}: {chr(plaintext[byte_pos])!r}")
                break
    
    return bytes(plaintext)

# Contoh Penggunaan:
# import requests
# def my_oracle(ct): 
#     response = requests.post("http://target.ctf/decrypt", data={'ct': ct.hex()})
#     return response.status_code == 200  # Returns True if padding valid
#
# result = padding_oracle_decrypt(target_ciphertext, my_oracle)
```

---

## 🐍 BAGIAN 8: PYTHON CRYPTO TOOLKIT & CYBERCHEF

### 8.0 📂 Cara Membaca Berbagai Format File CTF ke Python

Dalam CTF Crypto, Anda akan sering diberikan file (`.bin`, `.enc`, `.txt`, atau file tanpa ekstensi). Berikut template membaca berbagai format file ke Python:

```python
#!/usr/bin/env python3
# === CARA BACA FILE CTF KE PYTHON ===

# 1. File binary mentah / encrypted bytes (.bin, .enc) → bytes
with open("flag.enc", "rb") as f:
    raw_bytes = f.read()
print(f"[*] Panjang: {len(raw_bytes)} bytes")
print(f"[*] Hex: {raw_bytes.hex()}")

# 2. File teks berisi hex string → bytes  
with open("output.txt", "r") as f:
    hex_string = f.read().strip()
raw_bytes = bytes.fromhex(hex_string)

# 3. File teks berisi Base64 → bytes
import base64
with open("encoded.txt", "r") as f:
    b64_string = f.read().strip()
raw_bytes = base64.b64decode(b64_string + "==")

# 4. File teks berisi angka besar / parameter RSA (n, e, c)
with open("params.txt", "r") as f:
    lines = f.read().strip().split('\n')

params = {}
for line in lines:
    if '=' in line:
        key, val = line.split('=', 1)
        params[key.strip()] = int(val.strip(), 0)  # 0 = auto detect hex/dec (0x atau decimal)

print(f"[*] n = {params.get('n', 'not found')}")
print(f"[*] e = {params.get('e', 'not found')}")
print(f"[*] c = {params.get('c', 'not found')}")
```

---

### 8.1 Library Esensial

Verifikasi kelengkapan toolkit Anda:

Bash

```
python3 -c '
import Crypto
import gmpy2
import sympy
import z3
print("[+] Seluruh dependensi kriptografi Python terinstal dan siap digunakan.")
'
```

---

### 8.2 Fungsi Utility Mandiri (_Template Script_)

Simpan file helper ini sebagai `~/tools/crypto_utils.py` untuk diimpor saat kompetisi:

Python

```
#!/usr/bin/env python3
"""
crypto_utils.py - Kumpulan fungsi pembantu (helper) untuk tantangan Crypto CTF.
"""
from Crypto.Util.number import long_to_bytes, bytes_to_long, inverse
import base64
import binascii

def xor(data: bytes, key: bytes) -> bytes:
    """Melakukan XOR pada dua rangkaian bytes dengan pengulangan kunci otomatis."""
    return bytes([b ^ key[i % len(key)] for i, b in enumerate(data)])

def str_to_hex(s: str) -> str:
    """Konversi string ASCII langsung ke format string Hexadecimal."""
    return s.encode('utf-8').hex()

def hex_to_str(h: str) -> str:
    """Konversi string Hexadecimal kembali ke representasi string ASCII."""
    return bytes.fromhex(h).decode('utf-8', errors='ignore')

def int_to_bytes(n: int) -> bytes:
    """Konversi integer matematika besar ke representasi bytes (Big-Endian)."""
    return long_to_bytes(n)

def bytes_to_int(b: bytes) -> int:
    """Konversi bytes ke nilai integer matematika besar."""
    return bytes_to_long(b)

def rsa_decrypt(c: int, d: int, n: int) -> bytes:
    """Melakukan operasi dekripsi matematika RSA standar."""
    m = pow(c, d, n)
    return long_to_bytes(m)

def mod_inv(a: int, m: int) -> int:
    """Menghitung Modular Multiplicative Inverse (Extended Euclidean)."""
    return int(inverse(a, m))
```

---

### 8.3 CyberChef: Resep Operasi Terpenting

CyberChef adalah antarmuka visual untuk manipulasi data. Buka instance offline lokal Anda:  
`firefox ~/tools/cyberchef_offline/CyberChef_v10.18.2.html &`

#### 10 Resep Operasi (_Recipes_) Esensial:

1. **From Base64:** Konversi data Base64 ke plaintext.
2. **To Base64:** Konversi data plaintext ke Base64.
3. **From Hex:** Mengubah representasi heksadesimal menjadi raw bytes.
4. **XOR:** Operasi XOR dengan opsi kunci format UTF-8, Hex, atau Decimal.
5. **ROT13:** Rotasi karakter alfabet dengan nilai offset dinamis (1-25).
6. **URL Decode:** Membersihkan karakter encoding web `%XX`.
7. **Entropy:** Menghitung skor acak Shannon data secara visual.
8. **Magic:** Mendeteksi dan mendekode representasi encoding bersarang secara otomatis.
9. **Parse X.509 Certificate:** Membedah informasi kunci publik, penerbit, dan masa berlaku sertifikat SSL/TLS.
10. **Regular Expression:** Mengekstrak format flag secara presisi (contoh regex: `FLAG\{[A-Za-z0-9_]+\}`).

---

## 🗺️ BAGIAN 9: IDENTIFICATION DECISION TREE

### 9.1 Decision Tree: Encoding & Classical Ciphers

text

```
[ CIPHERTEXT / STRINGS DITERIMA ]
               │
               ▼
   [Periksa Karakter Set]
               │
               ├─ Terdiri dari alfabet murni (A-Z, a-z)?
               │         │
               │         ├─ Format kata alami masih tampak bergeser? ──► [Caesar / ROT13]
               │         ├─ Terbalik simetris (A jadi Z)? ─────────────► [Atbash]
               │         └─ Frekuensi karakter tidak wajar? ──────────► [Vigenère / Monoalphabetic]
               │
               ├─ Mengandung karakter padding '=' di akhir?
               │         │
               │         ├─ Mengandung [A-Za-z0-9+/]? ─────────────────► [Base64]
               │         └─ Mengandung [A-Z2-7]? ──────────────────────► [Base32]
               │
               ├─ Terdiri dari angka dan huruf [0-9a-fA-F]?
               │         │
               │         ├─ Panjang genap, merepresentasikan byte teks? ► [Hex / Base16]
               │         └─ Panjang tetap: 32 / 40 / 64 karakter? ─────► [Beralih ke Hash Tree]
               │
               └─ Memuat simbol struktural khusus?
                         │
                         ├─ Simbol '%XX'? ─────────────────────────────► [URL Encoding]
                         ├─ Rangkaian '.' dan '-'? ────────────────────► [Morse Code]
                         └─ Simbol '><+-[],.'? ────────────────────────► [Brainfuck Esolang]
```

---

### 9.2 Decision Tree: Cryptographic Challenges

text

```
[ TANTANGAN KRIPTOGRAFI CTF ]
               │
               ▼
   [Tinjau Deskripsi & File Lampiran]
               │
               ├─ Diberikan Hash String (MD5, SHA, bcrypt)?
               │         │
               │         └─► Jalankan CrackStation ──(Gagal)──► Hashcat Wordlist Attack
               │
               ├─ Diberikan Parameter Matematika (n, e, c)?
               │         │
               │         └─► Faktorkan n di FactorDB ──(Gagal)──► Eksekusi RsaCtfTool
               │
               ├─ Diberikan Script Layanan Python (AES, Padding)?
               │         │
               │         ├─ Mode ECB terdeteksi? ────────► Byte-at-a-Time Attack
               │         ├─ Mode CBC + Error Unpadding? ─► Padding Oracle Attack
               │         └─ Nonce digunakan berulang? ───► Two-Time Pad / Keystream Attack
               │
               └─ Ciphertext tampak acak murni, panjangnya sama dengan flag?
                         │
                         └─► Known-Plaintext Attack pada XOR ──► Analisis Single-Byte / OTP
```

---

## 🎯 BAGIAN 10: COMMON CTF CRYPTO PATTERNS

### 10.1 Pattern 1: Nested Multi-Layer Encoding

- **Karakteristik:** Output hasil decode pertama masih berupa string ter-encode lainnya (misal: Hex menghasilkan Base64, yang membungkus Base32).
- **Solusi:** Jalankan script `recursive_decoder` dari Bagian 2.6 atau gunakan recipe _Magic_ pada CyberChef.

---

### 10.2 Pattern 2: Weak RSA Modulus (n=p⋅qn=p⋅q dengan pp Kecil)

- **Karakteristik:** Parameter nn memiliki ukuran bit kecil (<512<512 bit) atau nilai pp berada di dekat angka nol.
- **Solusi:** Akses [factordb.com](http://factordb.com/), masukkan nilai desimal nn. Jika status berubah menjadi **FF** (Fully Factored), ambil nilai pp dan qq, lalu jalankan skrip dekripsi standar.

---

### 10.3 Pattern 3: XOR Menggunakan Known Plaintext Format Flag

- **Karakteristik:** Ciphertext biner dengan panjang pendek/sedang, dan challenge menyebutkan format flag target (contoh: `picoCTF{...}`).
- **Solusi:** Lakukan XOR antara karakter awal ciphertext dengan `picoCTF{` untuk mendapatkan kunci enkripsi:

Python

```
#!/usr/bin/env python3
ciphertext = bytes.fromhex("3b18070c633a2d2c1b2d07113b2c")
known_flag_header = b"picoCTF{"

# Kunci diperoleh dari hasil XOR ciphertext dengan known plaintext
recovered_key = bytes([c ^ p for c, p in zip(ciphertext, known_flag_header)])
print(f"[+] Kunci Terdeteksi: {recovered_key}")
```

---

### 10.4 Pattern 4: Hash Cracking dari `/etc/shadow`

- **Karakteristik:** Format baris hash Linux: `$id$salt$hashed_value`.
- **Solusi:** Potong string hash lengkap, simpan ke file teks, lalu crack menggunakan Hashcat mode sistem Unix:
    - Prefix `$6$`: SHA-512 Crypt (`hashcat -m 1800 shadow.txt /usr/share/wordlists/rockyou.txt`)
    - Prefix `$y$` atau `$7$`: yescrypt (`hashcat -m 29500 shadow.txt ...`)

---

### 10.5 Pattern 5: Small ee RSA Cube Root Attack

- **Karakteristik:** File challenge mencantumkan e=3e=3, dan ciphertext cc secara numerik bernilai lebih kecil dari nn.
- **Solusi:** Plaintext diperoleh langsung melalui akar pangkat tiga matematika: `gmpy2.iroot(c, 3)`.

---

## ⚠️ BAGIAN 11: COMMON ERRORS & TROUBLESHOOTING

|No|Gejala Error / Kendala|Penyebab Utama|Solusi Tindakan Penyelesaian|
|---|---|---|---|
|1|`binascii.Error: Incorrect padding` pada Base64|String kehilangan karakter padding `=` di akhir|Tambahkan padding manual via Python: `s += "=" * (-len(s) % 4)`.|
|2|Hashcat: `No hashes loaded`|Format hash tidak sesuai dengan mode `-m`|Bersihkan whitespace, hilangkan spasi, atau verifikasi mode menggunakan `hashid`.|
|3|Hashcat: `Token length exception`|Jumlah karakter hash kurang atau berlebih|Periksa apakah hash terpotong saat proses copy-paste dari terminal.|
|4|Output dekripsi RSA berupa byte acak|Parameter pp dan qq tertukar atau nilai dd salah|Pastikan d=inverse(e,(p−1)(q−1))d=inverse(e,(p−1)(q−1)), bukan modulo nn.|
|5|`ZeroDivisionError` pada modular inverse|Nilai gcd⁡(e,ϕ(n))≠1gcd(e,ϕ(n))=1 (tidak koprima)|Parameter ee berbagi faktor dengan ϕ(n)ϕ(n). Gunakan perbaikan GCD atau Pohlig-Hellman.|
|6|ModuleNotFoundError: `No module named 'Crypto'`|Paket Cryptodome belum terkonfigurasi|Jalankan instalasi: `pip3 install pycryptodome` (bukan paket `crypto` lama).|
|7|ModuleNotFoundError: `No module named 'gmpy2'`|Dependensi C belum lengkap pada sistem|Install dependensi OS: `sudo apt install libgmp-dev libmpfr-dev libmpc-dev`, lalu `pip3 install gmpy2`.|
|8|Nilai ciphertext hex panjangnya ganjil|Karakter awal `0` terpotong saat ekspor integer|Tambahkan padding angka nol di depan: `h = "0" + h if len(h) % 2 != 0 else h`.|
|9|Single-byte XOR solver memunculkan karakter non-ASCII|Skoring frekuensi teks mengabaikan karakter kontrol|Tingkatkan penalti untuk karakter di luar rentang printable ASCII (`32-126`).|
|10|RsaCtfTool berhenti / crash tanpa hasil|Format kunci publik rusak atau library timeout|Ekstrak parameter nn dan ee secara manual via OpenSSL: `openssl rsa -pubin -in key.pem -text -noout`.|
|11|FactorDB menampilkan status "C" (Composite)|Modulus nn belum pernah difaktorkan di database publik|Gunakan serangan spesifik (Wiener, ECM, Small e) atau faktorkan lokal dengan `yafu`.|
|12|Hasil dekripsi ASCII terpotong di tengah|Terdapat null-byte (`\x00`) di dalam data|Gunakan penanganan bytes mentah: simpan langsung ke file via `open('out.bin', 'wb').write(data)`.|
|13|CyberChef menghasilkan string error merah|Resep operasi tidak cocok dengan tipe input|Pastikan input tidak memiliki baris baru (_newline_). Matikan opsi _Auto-bake_.|
|14|AES-CBC decryption menghasilkan `Invalid Padding`|Nilai IV salah atau ciphertext rusak|Pastikan IV diambil tepat dari 16-byte pertama rangkaian ciphertext.|
|15|Dekode URL tidak mengubah karakter|Karakter hex bukan bagian dari reserved character URL|Gunakan unquote ganda jika server menerapkan teknik _double encoding_.|

---

## 📑 BAGIAN 12: CHEATSHEET CRYPTO CTF

### 12.1 Quick Identification Table (Print-Ready)

|Pola Karakter Visual|Ukuran / Karakteristik|Dugaan Algoritma|Langkah Pertama|
|---|---|---|---|
|`[A-Za-z0-9+/=]`|Diakhiri `=`|Base64 Encoding|`base64 -d`|
|`[0-9a-fA-F]`|Panjang 32 karakter|MD5 / NTLM Hash|CrackStation.net|
|`[0-9a-fA-F]`|Panjang 40 karakter|SHA-1 Hash|CrackStation.net|
|`[0-9a-fA-F]`|Panjang 64 karakter|SHA-256 Hash|Hashcat (`-m 1400`)|
|`[A-Za-z]`|Struktur kata bergeser|Caesar / ROT13|CyberChef (_ROT13_)|
|`0x...` / Angka Besar|Diberikan parameter n,e,cn,e,c|RSA Cryptosystem|FactorDB / RsaCtfTool|
|Byte Acak|Panjang kelipatan 16 byte|AES Block Cipher|Analisis Mode (ECB/CBC)|

---

### 12.2 Hashcat Mode Quick Reference

Bash

```
hashcat -m 0      <hash> <wordlist>   # MD5
hashcat -m 100    <hash> <wordlist>   # SHA-1
hashcat -m 1000   <hash> <wordlist>   # NTLM (Windows)
hashcat -m 1400   <hash> <wordlist>   # SHA-256
hashcat -m 1700   <hash> <wordlist>   # SHA-512
hashcat -m 1800   <hash> <wordlist>   # SHA-512 Crypt ($6$ Unix)
hashcat -m 3200   <hash> <wordlist>   # bcrypt ($2a$, $2b$)
```

---

### 12.3 Python One-Liners Esensial

Python

```
# 1. Base64 Decode
python3 -c 'import base64; print(base64.b64decode("VGVzdCE=").decode())'

# 2. Hex to ASCII String
python3 -c 'print(bytes.fromhex("41424344").decode())'

# 3. String to Hex
python3 -c 'print("FLAG".encode().hex())'

# 4. XOR Two Hex Strings
python3 -c 'h1, h2 = "1c01", "6865"; print(bytes([a^b for a,b in zip(bytes.fromhex(h1), bytes.fromhex(h2))]))'

# 5. Modular Inverse
python3 -c 'from Crypto.Util.number import inverse; print(inverse(65537, 1000000007))'

# 6. Integer to ASCII String
python3 -c 'from Crypto.Util.number import long_to_bytes; print(long_to_bytes(0x464c4147))'
```

---

### 12.4 Sumber Daya Online Esensial

- **CyberChef Web:** [gchq.github.io/CyberChef](https://gchq.github.io/CyberChef/)
- **Dcode.fr (Classical Cipher Solvers):** [dcode.fr](https://www.dcode.fr/)
- **FactorDB (RSA Modulus Factorization):** [factordb.com](http://factordb.com/)
- **CrackStation (Rainbow Table Lookup):** [crackstation.net](https://crackstation.net/)
- **Hashes.com (Escrow Hash Decryption):** [hashes.com](https://hashes.com/)
- **QuipQuip (Fast Substitution Solver):** [quipquip.com](https://quipquip.com/)

---

## 📜 BAGIAN 13: GOLDEN RULES OF CRYPTO CTF

1. **Identifikasi Format Sebelum Mengeksekusi Solusi:** Kenali karakteristik visual, panjang string, dan rentang karakter sebelum mencoba mendekripsi secara acak.
2. **Periksa Database Online Terlebih Dahulu:** Jangan membuang daya komputasi lokal untuk melakukan cracking jika hash atau faktor modulus RSA sudah terindeks di CrackStation atau FactorDB.
3. **Encoding Bukanlah Enkripsi:** Menemukan string berakhiran `=` menandakan data hanya di-encode (Base64), bukan dienkripsi. Buka langsung menggunakan decoder standar tanpa perlu mencari kunci.
4. **Manfaatkan Format Flag Sebagai Known-Plaintext:** Gunakan awalan flag yang sudah diketahui (seperti `FLAG{` atau `HTB{`) untuk merekonstruksi kunci XOR atau memvalidasi hasil dekripsi.
5. **Waspadai Padding Base64 yang Hilang:** Lengkapi padding string Base64 yang tidak lengkap dengan menambahkan karakter `=` hingga panjang string habis dibagi 4.
6. **Periksa Eksponen Publik RSA (ee):** Jika e=3e=3, selalu uji kemungkinan _Cube Root Attack_ sebelum mencoba metode faktorisasi yang kompleks.
7. **ECB Mode Selalu Membocorkan Pola:** Enkripsi AES tanpa Initial Vector (ECB) bersifat deterministik; blok plaintext yang identik akan selalu menghasilkan blok ciphertext yang sama.
8. **Nilai Nonce yang Dipakai Berulang Menghancurkan Keamanan:** Penggunaan ulang nonce pada mode stream cipher (AES-CTR, ChaCha20) memungkinkan pemulihan plaintext melalui teknik _Two-Time Pad_.
9. **Entropi Tinggi Menandakan Data Terenkripsi:** Jika entropi berada di atas 7.57.5, ciphertext diamankan dengan algoritma modern atau berada dalam format terkompresi.
10. **Gunakan Integer Presisi Tinggi untuk Kriptografi Asimetris:** Operasi matematika RSA melibatkan angka ratusan digit. Gunakan library seperti `gmpy2` untuk menghindari pembulatan nilai desimal.
11. **Perhatikan Kasus Karakter (_Case Sensitivity_):** Hash MD5 bersifat case-insensitive terhadap representasi hex, tetapi algoritma classical cipher (seperti Caesar dan Vigenere) mempertahankan huruf besar dan kecil.
12. **Simpan Dependensi Analisis Secara Lokal:** Pastikan file HTML CyberChef dan wordlist `rockyou.txt` selalu tersedia di lingkungan lokal Parrot OS Anda untuk mengantisipasi jaringan yang terisolasi.

---

## 🔄 BAGIAN 14: CROSS-WORKFLOW & RELASI MODUL

Kriptografi berfungsi sebagai jembatan analisis antara logika biner, transmisi jaringan, dan investigasi forensik:

text

```
[ FILE 51: REVERSE ENGINEERING WORKFLOW ]
(Membongkar alur logika biner dan menemukan fungsi enkripsi kustom)
                   │
                   ▼
[ FILE 52: CTF BINARY PATTERNS ]
(Menemukan hardcoded key, XOR loop, dan struktur ciphertext di dalam memori)
                   │
                   ▼
[ FILE 53: CRYPTO IDENTIFICATION WORKFLOW ] <--- (ANDA BERADA DI SINI)
(Mengidentifikasi format ciphertext, algoritma kriptografi, dan mengekstrak plaintext)
                   │
                   ▼
[ FILE 54: HASH CRACKING WORKFLOW ]
(Mendalami teknik brute-force terdistribusi, rule-based mutation, dan GPU acceleration)
```

---

# [🧭 BAGIAN 0: FONDASI CRYPTO CTF](/docs/crypto-identification)

# 🔐 Crypto Identification — Complete Attack Workflow

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export CHALLENGE_DIR=~/crypto_work
mkdir -p $CHALLENGE_DIR/{files,scripts,hashes,keys,output}
cd $CHALLENGE_DIR

# Verifikasi semua tools tersedia
python3 -c "import Crypto, gmpy2, sympy, z3; print('[+] All crypto libs OK')"
echo "[*] Tools check:"
which hashcat john hashid hash-identifier cyberchef 2>/dev/null || echo "[-] Some tools missing"

# Setup RsaCtfTool jika belum ada
ls ~/tools/RsaCtfTool/RsaCtfTool.py 2>/dev/null || {
    mkdir -p ~/tools && cd ~/tools
    git clone https://github.com/RsaCtfTool/RsaCtfTool.git
    cd RsaCtfTool && pip3 install -r requirements.txt
    cd $CHALLENGE_DIR
}

# Pastikan rockyou.txt tersedia
[ -f /usr/share/wordlists/rockyou.txt ] || sudo gunzip /usr/share/wordlists/rockyou.txt.gz
echo "[*] rockyou.txt: $(wc -l < /usr/share/wordlists/rockyou.txt) lines"
```

**Output yang diharapkan:**

text

```
[+] All crypto libs OK
[*] rockyou.txt: 14344392 lines
```

**OUTPUT GAGAL ❌ — Import error:**

text

```
ModuleNotFoundError: No module named 'Crypto'
```

➡️ Fix:

Bash

```
pip3 install pycryptodome gmpy2 sympy z3-solver
# BUKAN 'pip3 install crypto' — itu paket berbeda!
sudo apt install -y libgmp-dev libmpfr-dev libmpc-dev
pip3 install gmpy2  # rebuild dengan dependencies lengkap
```

---

## ══════════════════════════════════════

## FASE 0: TERIMA DATA & ANALISIS AWAL

## ══════════════════════════════════════

> **Tujuan:** Sebelum apapun, pahami APA yang kamu punya. Jangan langsung coba decode/decrypt tanpa identifikasi.

### Langkah 0.1 — Simpan & Kategorikan File Challenge

Bash

```
# Lihat semua file yang diberikan challenge
ls -la ~/Downloads/crypto_challenge/ 2>/dev/null || ls -la .
file *  # Deteksi tipe file otomatis

# Untuk setiap file yang ada, cek kontennya
for f in *; do
    echo "=== $f ==="
    echo "Size: $(wc -c < "$f") bytes"
    echo "Type: $(file -b "$f")"
    echo "First 100 chars: $(head -c 100 "$f" | cat -v)"
    echo ""
done
```

**OUTPUT BERHASIL ✅ — File teks berisi string:**

text

```
=== output.txt ===
Size: 44 bytes
Type: ASCII text
First 100 chars: VGhpcyBpcyBhIHRlc3QgbWVzc2FnZQ==
```

➡️ String dengan `=` di akhir → kemungkinan **Base64**. Lanjut ke **Fase 1**

**OUTPUT BERHASIL ✅ — File binary:**

text

```
=== flag.enc ===
Size: 32 bytes
Type: data
First 100 chars: M-^?M-;M-AM-8^BM-4...
```

➡️ Binary data → kemungkinan **AES/encrypted**. Lanjut ke **Fase 1** dengan pendekatan binary.

**OUTPUT BERHASIL ✅ — File Python/script:**

text

```
=== challenge.py ===
Type: Python script, ASCII text executable
```

➡️ **BACA SCRIPTNYA DULU** — ini memberikan algoritma yang digunakan:

Bash

```
cat challenge.py
# Cari: mode AES (ECB/CBC/CTR), parameter RSA (n,e,p,q), XOR key, hash function
```

---

### Langkah 0.2 — Analisis Visual Cepat (30 detik)

Bash

```
# Taruh ciphertext/data di variabel
CIPHER=$(cat output.txt)
echo "=== ANALISIS VISUAL ==="
echo "String: $CIPHER"
echo "Panjang: ${#CIPHER} karakter"
echo ""

# Hitung entropi (indikator utama)
python3 ~/tools/entropy_calc.py "$CIPHER" 2>/dev/null || \
python3 -c "
import sys, math
from collections import Counter
data = '$CIPHER'.encode()
freq = Counter(data)
ent = -sum((c/len(data))*math.log2(c/len(data)) for c in freq.values())
print(f'Entropi: {ent:.2f}/8.0')
if ent > 7.2: print('→ Kemungkinan TERENKRIPSI (AES/RSA)')
elif ent > 5.0: print('→ Kemungkinan ENCODING kompleks atau compressed')
else: print('→ Kemungkinan PLAINTEXT, Classical Cipher, atau Encoding sederhana')
"
```

**Panduan membaca panjang string — deteksi hash:**

|Panjang|Algoritma Kemungkinan|Langkah|
|---|---|---|
|32 karakter hex|MD5 atau NTLM|→ Fase 4 Hash Cracking|
|40 karakter hex|SHA-1|→ Fase 4|
|64 karakter hex|SHA-256|→ Fase 4|
|128 karakter hex|SHA-512|→ Fase 4|
|Kelipatan 4, ada `=`|Base64|→ Fase 1 Encoding|
|Panjang sama dengan flag format|XOR/OTP|→ Fase 3 XOR|

---

### Langkah 0.3 — Magic Auto-Detection

Bash

```
# Method 1: hashid (paling cepat untuk hash)
hashid "$CIPHER" 2>/dev/null | head -20

# Method 2: hash-identifier interaktif
echo "$CIPHER" | hash-identifier 2>/dev/null

# Method 3: CyberChef Magic (buka di browser)
firefox ~/tools/cyberchef_offline/CyberChef_v10.18.2.html &
# Di CyberChef: Input → string kamu → Operations: "Magic" → Run
# Magic akan auto-detect dan suggest encoding/cipher

# Method 4: Coba semua encoding sekaligus (script cepat)
python3 << 'EOF'
import base64, binascii, urllib.parse, codecs

cipher = "VGhpcyBpcyBhIHRlc3QgbWVzc2FnZQ=="  # GANTI dengan cipher kamu

print("=== AUTO-TRY SEMUA ENCODING ===")

# Base64
try:
    r = base64.b64decode(cipher + "==").decode('utf-8', errors='ignore')
    if r.isprintable(): print(f"[+] Base64: {r}")
except: pass

# Hex
try:
    r = bytes.fromhex(cipher).decode('utf-8', errors='ignore')
    if r.isprintable(): print(f"[+] Hex: {r}")
except: pass

# ROT13
try:
    r = codecs.decode(cipher, 'rot_13')
    if r.isprintable(): print(f"[+] ROT13: {r}")
except: pass

# URL decode
r = urllib.parse.unquote(cipher)
if r != cipher: print(f"[+] URL Decoded: {r}")

# Base32
try:
    r = base64.b32decode(cipher + "=" * (-len(cipher) % 8)).decode()
    if r.isprintable(): print(f"[+] Base32: {r}")
except: pass

print("[*] Selesai auto-try")
EOF
```

**OUTPUT BERHASIL ✅ — hashid mengenali:**

text

```
Analyzing 'd41d8cd98f00b204e9800998ecf8427e'
[+] MD5 [Hashcat Mode: 0][JtR Format: raw-md5]
[+] MD4 [Hashcat Mode: 900][JtR Format: raw-md4]
```

➡️ Langsung ke **Fase 4 — Hash Cracking**

**OUTPUT BERHASIL ✅ — auto-try berhasil decode:**

text

```
[+] Base64: This is a test message
```

➡️ Langsung ketemu! Tapi cek apakah ini flag atau ada layer lagi.

**OUTPUT GAGAL ❌ — semua gagal/tidak readable:**

text

```
[-] Tidak ada yang berhasil auto-decode
```

➡️ Lanjut ke **Fase 1** untuk identifikasi manual lebih detail.

---

## ══════════════════════════════════════

## FASE 1: IDENTIFIKASI KARAKTER SET

## ══════════════════════════════════════

> **Tujuan:** Tentukan KATEGORI cipher berdasarkan visual inspection. Ini menentukan semua langkah selanjutnya.

### Langkah 1.1 — Visual Identification Checklist

Bash

```
python3 << 'EOF'
cipher = input("Masukkan ciphertext: ")

print("\n=== CHECKLIST IDENTIFIKASI ===")

# Cek 1: Hanya 0 dan 1?
if all(c in '01 ' for c in cipher):
    print("[!] BINARY — Coba: CyberChef 'From Binary'")

# Cek 2: Hanya hex?
clean = cipher.replace(' ', '').replace('\n', '')
try:
    bytes.fromhex(clean)
    l = len(clean)
    print(f"[!] HEX valid, panjang {l} karakter")
    if l == 32: print("    → Sangat mungkin MD5 hash")
    elif l == 40: print("    → Sangat mungkin SHA-1 hash")
    elif l == 64: print("    → Sangat mungkin SHA-256 hash")
    elif l == 128: print("    → Sangat mungkin SHA-512 hash")
    elif l % 2 == 0: print("    → Data binary ter-hexencode")
except: pass

# Cek 3: Base64?
import base64
if all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=' for c in cipher):
    print("[!] Karakter set Base64 — Coba decode")
    try:
        r = base64.b64decode(cipher + "==")
        print(f"    → Decoded: {r[:50]}")
    except: pass

# Cek 4: Base32?
if all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=' for c in cipher.upper()):
    print("[!] Kemungkinan Base32 (A-Z, 2-7)")

# Cek 5: Hanya alfabet?
if cipher.replace(' ', '').isalpha():
    print("[!] Hanya alfabet — Caesar/Vigenere/Atbash/Monoalphabetic")

# Cek 6: Ada % XX?
if '%' in cipher and any(cipher[i] == '%' for i in range(len(cipher)-2)):
    print("[!] URL Encoding terdeteksi")

# Cek 7: Titik dan garis?
if all(c in '. -/' for c in cipher):
    print("[!] Kemungkinan Morse Code")

# Cek 8: $2a$ prefix?
if cipher.startswith('$2'):
    print("[!] bcrypt hash — Hashcat mode 3200")
elif cipher.startswith('$6$'):
    print("[!] SHA-512 Crypt — Hashcat mode 1800")
elif cipher.startswith('$1$'):
    print("[!] MD5 Crypt — Hashcat mode 500")
elif cipher.startswith('$argon2'):
    print("[!] Argon2 hash — Hashcat mode 35700")

# Cek 9: JWT?
parts = cipher.split('.')
if len(parts) == 3 and cipher.startswith('eyJ'):
    print("[!] JWT Token — Gunakan jwt.io atau jwt_tool")

# Cek 10: RSA params?
if 'n =' in cipher or 'e =' in cipher or '0x' in cipher:
    print("[!] Kemungkinan RSA parameters — Ke Fase 6 RSA")

# Cek 11: PGP?
if '-----BEGIN' in cipher:
    print("[!] PEM/PGP format terdeteksi")
    if 'PGP' in cipher: print("    → GPG encrypted, perlu private key")
    if 'PUBLIC KEY' in cipher: print("    → RSA/EC public key file")
    if 'OPENSSH' in cipher: print("    → SSH private key — ssh2john untuk crack passphrase")

print("\n[*] Berdasarkan analisis di atas, pilih fase yang sesuai")
EOF
```

**OUTPUT BERHASIL ✅ — Teridentifikasi encoding:**

text

```
[!] Karakter set Base64 — Coba decode
    → Decoded: b'Hello World - this is a secret'
```

➡️ Ke **Fase 2 — Encoding Challenges**

**OUTPUT BERHASIL ✅ — Teridentifikasi hash:**

text

```
[!] HEX valid, panjang 32 karakter
    → Sangat mungkin MD5 hash
```

➡️ Ke **Fase 4 — Hash Cracking**

**OUTPUT BERHASIL ✅ — Hanya alfabet:**

text

```
[!] Hanya alfabet — Caesar/Vigenere/Atbash/Monoalphabetic
```

➡️ Ke **Fase 3 — Classical Ciphers**

---

## ══════════════════════════════════════

## FASE 2: ENCODING CHALLENGES

## ══════════════════════════════════════

> **Prasyarat:** Teridentifikasi sebagai encoding (Base64/32/16/Binary/URL dll)

### Langkah 2.1 — Single Layer Decode

Bash

```
# Simpan cipher ke variable
CIPHER="VGhpcyBpcyBhIHRlc3QgbWVzc2FnZQ=="

# Command 1: Base64 decode
echo "$CIPHER" | base64 -d

# Command 2: Base64 URL-safe variant (+ → -, / → _)
echo "$CIPHER" | tr -- '-_' '+/' | base64 -d

# Command 3: Base32
echo "$CIPHER" | base32 -d

# Command 4: Hex decode
echo "$CIPHER" | xxd -r -p
# Atau:
python3 -c "print(bytes.fromhex('$CIPHER').decode())"

# Command 5: Binary decode
python3 -c "
bits = '01001000 01100101 01101100 01101100 01101111'  # GANTI
chars = [chr(int(b, 2)) for b in bits.split()]
print(''.join(chars))
"

# Command 6: URL decode
python3 -c "import urllib.parse; print(urllib.parse.unquote('$CIPHER'))"

# Command 7: Morse code
# Gunakan dcode.fr atau CyberChef "From Morse Code"
# Contoh morse: "- . ... -"
```

**OUTPUT BERHASIL ✅ — Terdecode jadi teks:**

text

```
This is a test message
```

➡️ Cek apakah ini flag atau ada layer lagi → lanjut ke **Langkah 2.2**

**OUTPUT BERHASIL ✅ — Terdecode tapi masih encoded:**

text

```
NDQ2YTYxNjc3YjYx...
```

➡️ Ada **multi-layer encoding**! Lanjut ke **Langkah 2.3**

**OUTPUT GAGAL ❌ — Error padding:**

text

```
binascii.Error: Incorrect padding
```

➡️ Fix padding Base64:

Bash

```
python3 << 'EOF'
import base64
s = "VGhpcyBpcyBhIHRlc3QgbWVzc2FnZ"  # GANTI — string tanpa padding
# Tambah padding otomatis
padded = s + "=" * (-len(s) % 4)
print(base64.b64decode(padded).decode(errors='ignore'))
EOF
```

**OUTPUT GAGAL ❌ — Decode tapi output aneh (non-printable):**

text

```
\x1f\x8b\x08\x00...
```

➡️ Mungkin **compressed data**:

Bash

```
# Cek magic bytes
python3 -c "
data = bytes.fromhex('$CIPHER')  # atau dari file
print('First bytes:', data[:4].hex())
# 1f8b = GZIP
# 504b = ZIP  
# fd37 = XZ
# 425a = BZIP2
"

# Decompress GZIP
echo "$CIPHER" | base64 -d | gunzip 2>/dev/null
# Atau:
python3 -c "
import base64, gzip
data = base64.b64decode('$CIPHER')
print(gzip.decompress(data).decode())
"
```

---

### Langkah 2.2 — Deteksi dan Handle Multi-Layer Encoding

Bash

```
# Jalankan recursive decoder
python3 << 'SCRIPT'
import base64, binascii, urllib.parse, codecs

def recursive_decoder(payload, depth=0):
    if depth > 15:
        return payload
    payload = payload.strip()
    
    # URL Decode
    if "%" in payload:
        unquoted = urllib.parse.unquote(payload)
        if unquoted != payload:
            print(f"[Depth {depth}] URL Decoded → {unquoted[:50]}")
            return recursive_decoder(unquoted, depth+1)
    
    # Base64 Decode
    try:
        padded = payload + "=" * (-len(payload) % 4)
        result = base64.b64decode(padded, validate=True).decode('utf-8')
        if result.isprintable() and len(result) > 0:
            print(f"[Depth {depth}] Base64 Decoded → {result[:50]}")
            return recursive_decoder(result, depth+1)
    except: pass
    
    # Hex Decode
    try:
        result = binascii.unhexlify(payload).decode('utf-8')
        if result.isprintable() and len(result) > 0:
            print(f"[Depth {depth}] Hex Decoded → {result[:50]}")
            return recursive_decoder(result, depth+1)
    except: pass
    
    # ROT13
    rot = codecs.decode(payload, 'rot_13')
    if rot != payload and rot.isprintable():
        # Cek apakah output terlihat lebih "bermakna"
        english_score = sum(1 for c in rot.lower() if c in 'etaoinshrdlu ')
        original_score = sum(1 for c in payload.lower() if c in 'etaoinshrdlu ')
        if english_score > original_score:
            print(f"[Depth {depth}] ROT13 Applied → {rot[:50]}")
            return recursive_decoder(rot, depth+1)
    
    print(f"[Depth {depth}] Final output: {payload}")
    return payload

# GANTI dengan ciphertext kamu
test = "NDQ2YTYxNjc3YjYxNzg2NTZkNWY2MzY0..."
print("[*] Memulai recursive decode...")
final = recursive_decoder(test)
print(f"\n[+] HASIL AKHIR: {final}")
SCRIPT
```

**OUTPUT BERHASIL ✅:**

text

```
[Depth 0] Base64 Decoded → 446a616777b617...
[Depth 1] Hex Decoded → Djagw{axe...
[Depth 2] ROT13 Applied → flag{nkr...
[Depth 3] Final output: flag{nkr_15_3z_ch4ll}

[+] HASIL AKHIR: flag{nkr_15_3z_ch4ll}
```

➡️ **FLAG KETEMU!**

**OUTPUT GAGAL ❌ — Recursive decoder berhenti terlalu cepat:**  
➡️ Coba CyberChef Magic recipe secara manual:

text

```
1. Buka CyberChef
2. Input: teks cipher kamu
3. Operations: ketik "Magic" → add
4. Magic depth: 3
5. Klik BAKE
```

---

### Langkah 2.3 — Custom/Non-Standard Base Encoding

Bash

```
# Base58 (digunakan Bitcoin, IPFS — tidak ada 0, O, I, l)
pip3 install base58 -q
python3 -c "
import base58
data = 'StV1DL6CwTryKyV'  # GANTI
print(base58.b58decode(data).decode(errors='ignore'))
"

# Custom Alphabet Base64 (alfabet diacak)
python3 << 'EOF'
import base64

# Standard vs Custom (dari source code challenge)
STANDARD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
CUSTOM   = "ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba9876543210+/"  # GANTI

encoded = "d20wZ2R5..."  # GANTI dengan encoded string dari challenge

# Translate custom alphabet ke standard
translation = str.maketrans(CUSTOM, STANDARD)
normalized = encoded.translate(translation)
result = base64.b64decode(normalized + "==")
print(f"[+] Custom Base64 Decoded: {result.decode(errors='ignore')}")
EOF
```

**OUTPUT GAGAL ❌ — Tidak tahu custom alphabet:**  
➡️ Cari di source code Python challenge:

Bash

```
grep -i "alphabet\|charset\|table\|BASE" challenge.py
grep -E "[A-Za-z0-9+/]{64}" challenge.py  # Base64 alphabet biasanya 64 chars
```

---

## ══════════════════════════════════════

## FASE 3: CLASSICAL CIPHERS

## ══════════════════════════════════════

> **Prasyarat:** Ciphertext hanya terdiri dari alfabet (A-Z, a-z), mungkin dengan spasi dan tanda baca.

### Langkah 3.1 — Caesar / ROT Brute Force

Bash

```
python3 << 'EOF'
import codecs

cipher = "Grfg Synt{abg_n_erny_synt}"  # GANTI

print("=== CAESAR BRUTE FORCE (Shift 1-25) ===")
for shift in range(1, 26):
    decrypted = []
    for c in cipher:
        if c.isalpha():
            base = ord('A') if c.isupper() else ord('a')
            decrypted.append(chr((ord(c) - base - shift) % 26 + base))
        else:
            decrypted.append(c)
    result = ''.join(decrypted)
    # Highlight jika mengandung kata umum atau format flag
    if any(word in result.lower() for word in ['flag', 'ctf', 'the', 'and', 'key']):
        print(f"Shift {shift:02d}: {result}  ← KEMUNGKINAN BENAR!")
    else:
        print(f"Shift {shift:02d}: {result}")

print("\n[+] ROT13 khusus:")
print(f"ROT13: {codecs.decode(cipher, 'rot_13')}")
EOF
```

**OUTPUT BERHASIL ✅ — Shift 13 terbaca:**

text

```
Shift 13: Test Flag{not_a_real_flag}  ← KEMUNGKINAN BENAR!
```

➡️ **FLAG KETEMU!** Format flag = `Flag{not_a_real_flag}`

**OUTPUT GAGAL ❌ — Semua 25 shift tidak terbaca:**

text

```
Shift 01: Ftfm Xmbh{...
Shift 02: Guge Ynci{...
...tidak ada yang readable...
```

➡️ Bukan Caesar monoalphabetic. Kemungkinan:

- **Vigenere** (polyalphabetic) → **Langkah 3.2**
- **Atbash** → **Langkah 3.3**
- **Substitution kustom** → **Langkah 3.5**

---

### Langkah 3.2 — Atbash Cipher

Bash

```
python3 << 'EOF'
cipher = "Gsv jfrxp yildm ulc"  # GANTI

def atbash(text):
    result = []
    for c in text:
        if 'A' <= c <= 'Z':
            result.append(chr(ord('Z') - (ord(c) - ord('A'))))
        elif 'a' <= c <= 'z':
            result.append(chr(ord('z') - (ord(c) - ord('a'))))
        else:
            result.append(c)
    return ''.join(result)

print(f"[+] Atbash: {atbash(cipher)}")
EOF
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Atbash: The quick brown fox
```

**OUTPUT GAGAL ❌ — Output tidak terbaca:**  
➡️ Lanjut ke **Langkah 3.3 Vigenere**

---

### Langkah 3.3 — Vigenere Cipher (Jika Ada Key / Brute Force)

Bash

```
# Jika key diketahui dari challenge
python3 << 'EOF'
def vigenere_decrypt(cipher, key):
    result = []
    key = key.upper()
    ki = 0
    for c in cipher:
        if c.isalpha():
            base = ord('A') if c.isupper() else ord('a')
            shift = ord(key[ki % len(key)]) - ord('A')
            result.append(chr((ord(c) - base - shift) % 26 + base))
            ki += 1
        else:
            result.append(c)
    return ''.join(result)

cipher = "Lxfopvefrnhr"  # GANTI
key = "LEMON"           # GANTI — dari hint challenge

print(f"[+] Vigenere ({key}): {vigenere_decrypt(cipher, key)}")
EOF

# Jika key TIDAK diketahui → gunakan online solver
echo "[*] Vigenere tanpa key → Buka dcode.fr:"
echo "    URL: https://www.dcode.fr/vigenere-cipher"
echo "    Klik 'Automatic decryption' → Kasih cipher → Submit"
echo "    Tool akan auto-crack key dengan Index of Coincidence"
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Vigenere (LEMON): Attackatdawn
```

**OUTPUT GAGAL ❌ — Key tidak diketahui dan dcode.fr gagal:**  
➡️ Cipher terlalu pendek untuk analisis frekuensi (butuh >100 karakter). Cari hint key di:

Bash

```
# Cari di nama challenge, deskripsi, atau file lain
grep -r "key\|password\|secret" . 2>/dev/null
# Cek metadata file
exiftool * 2>/dev/null | grep -i "comment\|author\|description"
```

---

### Langkah 3.4 — Affine Cipher

Bash

```
python3 << 'EOF'
from math import gcd

cipher = "Ihsso Wgerm!"  # GANTI
# a dan b dari challenge atau brute force
a_given = 5   # GANTI jika diketahui
b_given = 8   # GANTI jika diketahui

def affine_decrypt(text, a, b):
    # a harus coprime dengan 26: gcd(a, 26) == 1
    # Valid a values: 1,3,5,7,9,11,15,17,19,21,23,25
    def mod_inv(a, m):
        for i in range(m):
            if (a * i) % m == 1:
                return i
        return None
    
    a_inv = mod_inv(a, 26)
    if a_inv is None:
        return f"a={a} tidak valid (gcd(a,26)≠1)"
    
    result = []
    for c in text:
        if c.isalpha():
            base = ord('A') if c.isupper() else ord('a')
            val = ord(c) - base
            dec = (a_inv * (val - b)) % 26
            result.append(chr(dec + base))
        else:
            result.append(c)
    return ''.join(result)

# Jika parameter diketahui
if a_given and b_given:
    print(f"[+] Affine (a={a_given}, b={b_given}): {affine_decrypt(cipher, a_given, b_given)}")

# Jika tidak diketahui — brute force semua kombinasi valid
print("\n=== BRUTE FORCE AFFINE ===")
valid_a = [1,3,5,7,9,11,15,17,19,21,23,25]
for a in valid_a:
    for b in range(26):
        result = affine_decrypt(cipher, a, b)
        if any(w in result.lower() for w in ['flag', 'ctf', 'the', 'and']):
            print(f"a={a}, b={b}: {result}  ← KEMUNGKINAN BENAR!")
EOF
```

---

### Langkah 3.5 — Monoalphabetic Substitution (Analisis Frekuensi)

Bash

```
python3 << 'EOF'
from collections import Counter

cipher = """Iy iye cvooz xzlzxfz"""  # GANTI — butuh teks panjang >100 char

# Analisis frekuensi
freq = Counter(c.upper() for c in cipher if c.isalpha())
total = sum(freq.values())
print("=== FREKUENSI KARAKTER ===")
for char, count in sorted(freq.items(), key=lambda x: -x[1]):
    bar = '█' * int(count/total*50)
    print(f"{char}: {count:3d} ({count/total*100:5.1f}%) {bar}")

print("\n=== ENGLISH FREQUENCY REFERENCE ===")
print("E:12.7% T:9.1% A:8.2% O:7.5% I:7.0% N:6.7% S:6.3% H:6.1%")
print("R:6.0% D:4.3% L:4.0% U:2.8%")
print("\n[*] Huruf cipher yang paling sering → kemungkinan 'E' atau 'T'")
print("[*] Gunakan quipquip.com untuk auto-solve jika teks > 100 karakter")
EOF

# Untuk teks panjang — gunakan online solver
echo "[*] Jika cipher > 100 karakter, buka:"
echo "    https://quipquip.com/"
echo "    Paste cipher → Submit → Auto-solve substitution"
```

---

## ══════════════════════════════════════

## FASE 4: HASH IDENTIFICATION & CRACKING

## ══════════════════════════════════════

> **Prasyarat:** String teridentifikasi sebagai hash (output ukuran tetap, alfanumerik hex, atau format prefixprefix)

### Langkah 4.1 — Identifikasi Hash Mode

Bash

```
HASH="d41d8cd98f00b204e9800998ecf8427e"  # GANTI

# Command 1: hashid (paling lengkap)
hashid -m -j "$HASH"

# Command 2: hash-identifier
echo "$HASH" | hash-identifier

# Command 3: Manual cek panjang
python3 -c "
h = '$HASH'
l = len(h)
print(f'Panjang: {l} karakter')
modes = {32:'MD5 (-m 0) / NTLM (-m 1000)', 40:'SHA-1 (-m 100)', 
         56:'SHA-224 (-m 1730)', 64:'SHA-256 (-m 1400)', 
         96:'SHA-384 (-m 10800)', 128:'SHA-512 (-m 1700)'}
print(f'Hashcat mode: {modes.get(l, \"Tidak diketahui — cek hashid\")}')
"
```

**OUTPUT BERHASIL ✅:**

text

```
Analyzing 'd41d8cd98f00b204e9800998ecf8427e'
[+] MD5 [Hashcat Mode: 0]
Panjang: 32 karakter
Hashcat mode: MD5 (-m 0) / NTLM (-m 1000)
```

➡️ Mode diketahui, lanjut ke **Langkah 4.2**

---

### Langkah 4.2 — Crack Strategi (Urutan dari Cepat ke Lambat)

Bash

```
HASH="5d41402abc4b2a76b9719d911017c592"  # GANTI
HASH_FILE=~/crypto_work/hashes/target.hash
echo "$HASH" > $HASH_FILE

# LANGKAH 1: Online lookup dulu (paling cepat — 0 detik)
echo "[*] Step 1: Cek online..."
echo "    → Buka https://crackstation.net/"
echo "    → Paste hash: $HASH"
echo "    → Submit — jika ditemukan, SELESAI"
echo ""
echo "    → Atau: https://hashes.com/en/decrypt/hash"
echo ""
read -p "Apakah online lookup berhasil? (y/n): " online_result
[ "$online_result" = "y" ] && echo "Selesai!" && exit 0

# LANGKAH 2: Hashcat wordlist attack (rockyou)
echo "[*] Step 2: Hashcat wordlist..."
# MD5
hashcat -m 0 $HASH_FILE /usr/share/wordlists/rockyou.txt --force
# SHA-1
# hashcat -m 100 $HASH_FILE /usr/share/wordlists/rockyou.txt --force
# SHA-256
# hashcat -m 1400 $HASH_FILE /usr/share/wordlists/rockyou.txt --force
# NTLM
# hashcat -m 1000 $HASH_FILE /usr/share/wordlists/rockyou.txt --force

# LANGKAH 3: Jika gagal — tambah rules
echo "[*] Step 3: Dengan rules..."
hashcat -m 0 $HASH_FILE /usr/share/wordlists/rockyou.txt \
    -r /usr/share/hashcat/rules/best64.rule --force

# Lihat hasil
hashcat -m 0 $HASH_FILE --show
```

**OUTPUT BERHASIL ✅ — Hash cracked:**

text

```
5d41402abc4b2a76b9719d911017c592:hello

Session..........: hashcat
Status...........: Cracked
```

➡️ Password = `hello`. Simpan:

Bash

```
echo "HASH:$HASH PLAINTEXT:hello" >> ~/crypto_work/output/cracked.txt
```

**OUTPUT BERHASIL ✅ — CrackStation menemukan:**

text

```
5d41402abc4b2a76b9719d911017c592 - MD5 - hello
```

**OUTPUT GAGAL ❌ — Rockyou + rules gagal:**

text

```
Status...........: Exhausted
```

➡️ Coba mask attack atau wordlist yang lebih besar:

Bash

```
# Mask attack — jika tahu format password
# ?l = lowercase, ?u = uppercase, ?d = digit, ?s = special
hashcat -m 0 $HASH_FILE -a 3 ?l?l?l?l?d?d?d?d  # 4 huruf + 4 angka
hashcat -m 0 $HASH_FILE -a 3 Flag{?l?l?l?l?l}   # Format flag spesifik

# Wordlist lebih besar
hashcat -m 0 $HASH_FILE /usr/share/seclists/Passwords/xato-net-10-million-passwords.txt

# John dengan rules berbeda
john $HASH_FILE --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt --rules=KoreLogic
```

**OUTPUT GAGAL ❌ — Hash bcrypt (2a2a) sangat lambat:**

text

```
$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW
```

➡️ bcrypt sangat lambat di CPU. Gunakan GPU jika ada, atau john:

Bash

```
# bcrypt — hashcat mode 3200
hashcat -m 3200 $HASH_FILE /usr/share/wordlists/rockyou.txt --force
# ATAU john (lebih baik untuk bcrypt di CPU)
john $HASH_FILE --format=bcrypt --wordlist=/usr/share/wordlists/rockyou.txt
```

**OUTPUT GAGAL ❌ — Token length exception:**

text

```
Hashcat: Token length exception
```

➡️ Hash terpotong atau format salah:

Bash

```
# Cek apakah ada whitespace/newline
cat -A $HASH_FILE    # Tampilkan karakter tersembunyi
sed -i 's/[[:space:]]//g' $HASH_FILE  # Hapus whitespace
# Verifikasi panjang setelah clean
wc -c $HASH_FILE
```

---

### Langkah 4.3 — Hash dari `/etc/shadow` (Linux)

Bash

```
# Format shadow: username:$id$salt$hash:...
# Ekstrak hash saja
SHADOW_LINE="root:\$6\$rounds=5000\$saltsalt\$hashvalue:18000:0:99999:7:::"

# Method: hashcat langsung dengan shadow format
hashcat -m 1800 shadow.txt /usr/share/wordlists/rockyou.txt  # SHA-512 crypt $6$
hashcat -m 500  shadow.txt /usr/share/wordlists/rockyou.txt  # MD5 crypt $1$

# John lebih mudah untuk shadow
john shadow.txt --wordlist=/usr/share/wordlists/rockyou.txt
john shadow.txt --show  # Tampilkan hasil
```

---

## ══════════════════════════════════════

## FASE 5: XOR CHALLENGES

## ══════════════════════════════════════

> **Prasyarat:** Ciphertext binary/hex dengan panjang sama atau mendekati flag, atau source code menunjukkan XOR

### Langkah 5.1 — Identifikasi Tipe XOR

Bash

```
python3 << 'EOF'
# Dari source code challenge — cek tipe XOR:
# 1. Single-byte: key = 0x41 atau key = ord('A')
# 2. Multi-byte/repeating: key = b"SECRET" 
# 3. Known-plaintext: kita tahu format flag

# Baca ciphertext dari file
import sys

# Jika file hex
cipher_hex = "1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736"
ciphertext = bytes.fromhex(cipher_hex)

print(f"[*] Ciphertext length: {len(ciphertext)} bytes")
print(f"[*] Jika flag format 'CTF{{...}}', panjang flag kemungkinan sama: {len(ciphertext)}")

# Cek apakah mungkin single-byte XOR
print("\n[?] Ada petunjuk tipe XOR di source code?")
print("    - key = 0xXX           → Single-byte XOR")
print("    - key = b'word'        → Repeating-key XOR") 
print("    - Panjang cipher == panjang flag → Known-plaintext attack")
EOF
```

---

### Langkah 5.2 — Single-Byte XOR Brute Force

Bash

```
python3 << 'EOF'
def score_english(text):
    score = 0
    common = b"ETAOINSHRDLUetaoinshrdlu "
    for b in text:
        if b in common: score += 2
        elif 32 <= b <= 126: score += 1
        else: score -= 3
    return score

def solve_single_xor(cipher_hex):
    ciphertext = bytes.fromhex(cipher_hex)
    best = {'score': -float('inf'), 'key': 0, 'text': b''}
    
    for key in range(256):
        decrypted = bytes([b ^ key for b in ciphertext])
        s = score_english(decrypted)
        if s > best['score']:
            best = {'score': s, 'key': key, 'text': decrypted}
    
    print(f"[+] Best key: 0x{best['key']:02x} ({chr(best['key'])!r})")
    print(f"[+] Score: {best['score']}")
    print(f"[+] Plaintext: {best['text'].decode(errors='ignore')}")
    return best

# GANTI dengan cipher kamu
cipher_hex = "1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736"
solve_single_xor(cipher_hex)
EOF
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Best key: 0x58 ('X')
[+] Score: 124
[+] Plaintext: Cooking MC's like a pound of bacon
```

**OUTPUT GAGAL ❌ — Output tidak readable, semua score rendah:**

text

```
Best key: 0x01 ('\x01')
Score: -23
Plaintext: [garbled]
```

➡️ Kemungkinan **bukan** single-byte XOR. Coba repeating-key.

---

### Langkah 5.3 — Repeating-Key XOR (Key Diketahui)

Bash

```
python3 << 'EOF'
def repeating_xor(data: bytes, key: bytes) -> bytes:
    return bytes([data[i] ^ key[i % len(key)] for i in range(len(data))])

# Jika key diketahui dari challenge
ciphertext = bytes.fromhex("0b3637272a2b2e63622c2e69692a23693a2a3c6324202d623d63343c2a26226324272765272a282b2f20430a652e2c652a3124333a653e2b2027630c692b20283165286326302e27282f")
key = b"ICE"  # GANTI dengan key dari challenge

plaintext = repeating_xor(ciphertext, key)
print(f"[+] Plaintext: {plaintext.decode(errors='ignore')}")
EOF
```

---

### Langkah 5.4 — Known-Plaintext XOR Attack (Tidak Tahu Key)

Bash

```
python3 << 'EOF'
# Jika kamu tahu FORMAT flag (misal: "CTF{" atau "FLAG{" atau "picoCTF{")
# dan ciphertext bisa XOR dengan plaintext yang diketahui untuk dapat kunci

ciphertext = bytes.fromhex("14161c2817452d3a01103f")  # GANTI

# Known prefix — sesuaikan dengan format CTF yang sedang dikerjakan
known_prefixes = [b"CTF{", b"FLAG{", b"flag{", b"picoCTF{", b"HTB{", b"THM{"]

for prefix in known_prefixes:
    if len(prefix) <= len(ciphertext):
        # XOR ciphertext dengan known prefix → dapat partial key
        partial_key = bytes([c ^ p for c, p in zip(ciphertext, prefix)])
        print(f"[*] Jika prefix '{prefix.decode()}': key starts with {partial_key}")
        
        # Coba extend key jika terlihat repeating pattern
        # Contoh: jika partial_key = b"k3y!k" → key mungkin b"k3y!"
        # Coba semua kemungkinan panjang key
        for key_len in range(1, len(partial_key)):
            candidate_key = partial_key[:key_len]
            # Cek apakah key berulang
            if partial_key == (candidate_key * (len(partial_key)//key_len + 1))[:len(partial_key)]:
                # Decrypt full ciphertext
                plaintext = bytes([ciphertext[i] ^ candidate_key[i % key_len] for i in range(len(ciphertext))])
                print(f"    → Key length {key_len}: key={candidate_key}, plaintext={plaintext.decode(errors='ignore')}")
EOF
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Jika prefix 'CTF{': key starts with b'k3y!k'
    → Key length 4: key=b'k3y!', plaintext=CTF{xor_is_symmetric}
```

➡️ **FLAG KETEMU!** `CTF{xor_is_symmetric}`

---

### Langkah 5.5 — Two-Time Pad Attack

Bash

```
# Prasyarat: Dua ciphertext yang dienkripsi dengan KEY YANG SAMA
python3 << 'EOF'
c1 = bytes.fromhex("1c0111001f010100061a024b53535009181c")  # GANTI
c2 = bytes.fromhex("686974207468652062756c6c277320657965")  # GANTI

# XOR kedua ciphertext → dapat XOR dari dua plaintext
xor_plaintexts = bytes([a ^ b for a, b in zip(c1, c2)])
print(f"[*] C1 XOR C2: {xor_plaintexts.hex()}")
print(f"[*] Decoded: {xor_plaintexts.decode(errors='ignore')}")

# Teknik crib-dragging: coba 'crib' (known plaintext word)
cribs = [b"the ", b"and ", b"CTF{", b"flag", b"key ", b"    "]
print("\n=== CRIB DRAGGING ===")
for crib in cribs:
    for pos in range(len(xor_plaintexts) - len(crib)):
        # Jika XOR di posisi ini dengan crib menghasilkan printable text
        guess = bytes([xor_plaintexts[pos+i] ^ crib[i] for i in range(len(crib))])
        if all(32 <= b <= 126 for b in guess):
            print(f"Pos {pos}, crib '{crib.decode()}': other_plaintext[{pos}:{pos+len(crib)}] = '{guess.decode()}'")
EOF
```

---

## ══════════════════════════════════════

## FASE 6: RSA CHALLENGES

## ══════════════════════════════════════

> **Prasyarat:** Diberikan parameter RSA: n, e, c (dan mungkin p, q, d)

### Langkah 6.1 — Parse Parameter RSA

Bash

```
# Baca file parameter RSA
cat challenge.txt

# Script parsing otomatis
python3 << 'EOF'
# Format umum: "n = 0x..." atau "n = 12345..." atau JSON
import re

with open("challenge.txt", "r") as f:
    content = f.read()

# Parse n, e, c
patterns = {
    'n': r'n\s*=\s*(0x[0-9a-fA-F]+|\d+)',
    'e': r'e\s*=\s*(0x[0-9a-fA-F]+|\d+)',
    'c': r'c\s*=\s*(0x[0-9a-fA-F]+|\d+)',
    'p': r'p\s*=\s*(0x[0-9a-fA-F]+|\d+)',
    'q': r'q\s*=\s*(0x[0-9a-fA-F]+|\d+)',
}

params = {}
for key, pattern in patterns.items():
    match = re.search(pattern, content)
    if match:
        val = match.group(1)
        params[key] = int(val, 0)  # 0 = auto-detect hex/decimal
        print(f"[+] {key} = {params[key]}")
        print(f"    Bit length: {params[key].bit_length()} bits")

print(f"\n[*] Parameters found: {list(params.keys())}")
EOF
```

**Tabel keputusan berdasarkan parameter yang ada:**

|Parameter yang Ada|Serangan|Langkah|
|---|---|---|
|n, e, c (standar)|Faktorkan n|Langkah 6.2|
|n, e, c (e=3, c kecil)|Cube Root|Langkah 6.4|
|n1, n2, e, c1, c2 (shared n)|Common Modulus|Langkah 6.5|
|p, q, e, c|Langsung decrypt|Langkah 6.3|
|n sangat besar e|Wiener's Attack|RsaCtfTool|

---

### Langkah 6.2 — Faktorkan n (Serangan Utama)

Bash

```
# LANGKAH 1: RsaCtfTool otomatis (SELALU COBA INI DULU)
python3 ~/tools/RsaCtfTool/RsaCtfTool.py \
    -n <nilai_n> \
    -e <nilai_e> \
    --uncipher <nilai_c>

# Dengan file .pem
python3 ~/tools/RsaCtfTool/RsaCtfTool.py \
    --publickey public.pem \
    --uncipherfile flag.enc

# LANGKAH 2: FactorDB online
echo "[*] Cek FactorDB: http://factordb.com/"
echo "    Masukkan nilai n → Submit"
echo "    Jika status 'FF' (Fully Factored) → ambil p dan q"
python3 -c "
n = 1234567891011  # GANTI
print(f'Cek di FactorDB: http://factordb.com/index.php?query={n}')
"

# LANGKAH 3: Fermat Factorization (jika p dan q berdekatan)
python3 << 'EOF'
import gmpy2, math

n = 17 * 19  # GANTI dengan n dari challenge
n = gmpy2.mpz(n)

a = gmpy2.isqrt(n) + 1
while True:
    b2 = a*a - n
    b, is_perfect = gmpy2.isqrt_rem(b2)
    if is_perfect == 0:  # b2 adalah perfect square
        p = int(a - b)
        q = int(a + b)
        print(f"[+] p = {p}")
        print(f"[+] q = {q}")
        assert p * q == int(n)
        break
    a += 1
    if a > gmpy2.isqrt(n) + 10000:
        print("[-] Fermat factorization gagal (p dan q terlalu jauh)")
        break
EOF
```

**OUTPUT BERHASIL ✅ — RsaCtfTool berhasil:**

text

```
[*] Performing attack: factordb
[+] Time elapsed: 2.3s

Results for /tmp/public.pem:
d: 891234...
p: 10453...
q: 10432...

Unciphered data:
STR : picoCTF{r5a_15_3z_ch4ll}  ← FLAG DI SINI
```

➡️ **FLAG KETEMU!** Baca di baris `STR`

**OUTPUT BERHASIL ✅ — FactorDB status FF:**

text

```
Status: FF
Factors: 10000019 × 10000007
```

➡️ p dan q ketemu, lanjut ke **Langkah 6.3**

**OUTPUT GAGAL ❌ — RsaCtfTool semua attack gagal:**

text

```
[-] No attacks succeeded.
```

➡️ Coba serangan spesifik:

Bash

```
# Cek apakah e sangat besar (Wiener's attack)
python3 -c "
e = 65537  # GANTI
n = 123456789  # GANTI
print(f'e/n ratio: {e/n:.6f}')
if e > n // 4:
    print('→ e besar, coba Wiener Attack')
"

# Coba yafu lokal (lebih kuat dari factordb)
# Install: sudo apt install yafu
yafu "factor(<nilai_n>)"
```

---

### Langkah 6.3 — Decrypt RSA (Sudah Punya p dan q)

Bash

```
python3 << 'EOF'
from Crypto.Util.number import inverse, long_to_bytes

# ISI NILAI INI DARI CHALLENGE / HASIL FAKTORISASI
n = 3233
e = 17
c = 2790  # ciphertext
p = 61    # faktor prima 1
q = 53    # faktor prima 2

# Verifikasi p * q == n
assert p * q == n, "ERROR: p * q != n, cek nilai!"

# Step 1: Hitung phi(n)
phi = (p - 1) * (q - 1)
print(f"[*] phi(n) = {phi}")

# Step 2: Hitung private exponent d
d = inverse(e, phi)
print(f"[*] d = {d}")

# Step 3: Decrypt: m = c^d mod n
m = pow(c, d, n)
print(f"[*] m (integer) = {m}")

# Step 4: Konversi ke string
flag = long_to_bytes(m)
print(f"[+] FLAG: {flag.decode(errors='ignore')}")
EOF
```

**OUTPUT BERHASIL ✅:**

text

```
[*] phi(n) = 3120
[*] d = 2753
[*] m (integer) = 65
[+] FLAG: A
```

**OUTPUT GAGAL ❌ — ZeroDivisionError:**

text

```
ZeroDivisionError: No inverse exists
```

➡️ `gcd(e, phi) ≠ 1` — e dan phi tidak coprime. Kemungkinan:

Bash

```
python3 -c "
from math import gcd
e = 65537  # GANTI
p = 61     # GANTI
q = 53     # GANTI
phi = (p-1)*(q-1)
print(f'gcd(e, phi) = {gcd(e, phi)}')
# Jika bukan 1, gunakan pendekatan lain
# Kemungkinan challenge menggunakan CRT atau parameter yang salah di soal
"
```

---

### Langkah 6.4 — Cube Root Attack (e=3, m^e < n)

Bash

```
python3 << 'EOF'
import gmpy2
from Crypto.Util.number import long_to_bytes

# e = 3 dan pesan pendek
c = 195312500000000000000000000000000000000  # GANTI
e = 3

# Hitung akar pangkat 3 murni
m, is_exact = gmpy2.iroot(gmpy2.mpz(c), e)

if is_exact:
    print(f"[+] m^e < n — Direct cube root!")
    flag = long_to_bytes(int(m))
    print(f"[+] FLAG: {flag.decode(errors='ignore')}")
else:
    print(f"[-] Bukan perfect cube — m^e > n")
    print(f"    Coba: m ≈ {m}")
    # Coba dengan k*n offset (jika m^e melewati n beberapa kali)
    # Ini Hastad broadcast attack — butuh minimal 3 ciphertext
    print("    → Mungkin perlu Hastad Broadcast Attack (butuh e=3 pesan + n berbeda)")
EOF
```

---

### Langkah 6.5 — Common Modulus Attack & GCD Attack

Bash

```
python3 << 'EOF'
import math
from Crypto.Util.number import inverse, long_to_bytes

# Skenario: Dua pubkey dengan n yang SAMA, e berbeda, plaintext SAMA
n = 123456789012345678901234567890  # GANTI — n sama untuk keduanya
e1 = 3                              # GANTI
e2 = 65537                          # GANTI
c1 = 12345678901234                 # GANTI — ciphertext 1
c2 = 98765432109876                 # GANTI — ciphertext 2

# Common Modulus Attack
g, s1, s2 = 0, 0, 0
# Extended GCD
def egcd(a, b):
    if a == 0: return b, 0, 1
    g, s, t = egcd(b % a, a)
    return g, t - (b // a) * s, s

g, s1, s2 = egcd(e1, e2)
if g == 1:
    if s1 < 0:
        s1 = -s1
        c1 = inverse(c1, n)
    if s2 < 0:
        s2 = -s2
        c2 = inverse(c2, n)
    m = (pow(c1, s1, n) * pow(c2, s2, n)) % n
    flag = long_to_bytes(m)
    print(f"[+] Common Modulus Attack: {flag.decode(errors='ignore')}")

# Skenario GCD: Dua n BERBEDA yang share faktor prima
n1 = 340282366920938463463374607431768211503  # GANTI
n2 = 340282366920938463463374607431768211457  # GANTI  
p = math.gcd(n1, n2)
if p > 1:
    print(f"[+] GCD Attack berhasil! Shared prime p = {p}")
    q1 = n1 // p
    print(f"[+] q1 = {q1}")
    # Lanjut decrypt seperti Langkah 6.3
EOF
```

---

## ══════════════════════════════════════

## FASE 7: AES & SYMMETRIC CIPHERS

## ══════════════════════════════════════

> **Prasyarat:** Source code Python menunjukkan AES, atau ciphertext binary panjang kelipatan 16 bytes

### Langkah 7.1 — Identifikasi Mode AES dari Source Code

Bash

```
# Baca source code challenge
cat challenge.py

# Grep mode AES
grep -E "ECB|CBC|CTR|GCM|CFB|OFB|MODE_" challenge.py

# Deteksi vulnerability dari mode:
python3 << 'EOF'
# Baca source
with open("challenge.py", "r") as f:
    code = f.read()

if "MODE_ECB" in code:
    print("[!] AES-ECB TERDETEKSI!")
    print("    ECB adalah mode PALING LEMAH")
    print("    → Vulnerability: Identical plaintext blocks = identical ciphertext blocks")
    print("    → Attack: ECB Byte-at-a-Time (jika ada oracle)")
    print("    → Attack: ECB Block Detection (jika bisa lihat pattern)")

if "MODE_CBC" in code:
    print("[!] AES-CBC TERDETEKSI")
    if "pad" in code.lower() or "pkcs" in code.lower():
        print("    → Ada padding! Cek apakah server return error berbeda")
        print("    → Vulnerability: Padding Oracle Attack jika ada error oracle")
    print("    → Cek: apakah IV digunakan ulang atau terprediksi?")
    
if "MODE_CTR" in code or "nonce" in code.lower():
    print("[!] AES-CTR/Nonce TERDETEKSI")
    if "nonce = 0" in code or "nonce=0" in code:
        print("    → NONCE = 0! Ini adalah fixed nonce!")
        print("    → Vulnerability: Keystream reuse = Two-Time Pad attack!")

if "key = FLAG" in code or "key = flag" in code or "key = secret" in code:
    print("[!] KEY DERIVED FROM FLAG!")
    print("    → Berbagai attack mungkin untuk recover key")
EOF
```

---

### Langkah 7.2 — ECB Byte-at-a-Time Attack

Bash

```
# Jika ada server/oracle yang encrypt input kita
python3 << 'EOF'
# Template untuk ECB oracle attack
# Asumsi: oracle(input) mengenkripsi input + SECRET_FLAG dengan AES-ECB

import requests  # atau koneksi TCP

def oracle(plaintext: bytes) -> bytes:
    """Kirim ke server, terima ciphertext — GANTI DENGAN KONEKSI NYATA"""
    # Contoh HTTP oracle:
    # r = requests.post("http://challenge.ctf/encrypt", data={'data': plaintext.hex()})
    # return bytes.fromhex(r.json()['ciphertext'])
    
    # Contoh AES-ECB lokal (untuk testing):
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import pad
    key = b"secret_key_1234!"  # Key yang tidak kita tahu
    secret = b"FLAG{ecb_is_weak}"  # Secret yang ingin kita recover
    cipher = AES.new(key, AES.MODE_ECB)
    return cipher.encrypt(pad(plaintext + secret, 16))

def detect_block_size(oracle_fn):
    initial = len(oracle_fn(b""))
    for i in range(1, 64):
        new_len = len(oracle_fn(b"A" * i))
        if new_len != initial:
            return new_len - initial
    return 16  # default

def ecb_oracle_attack(oracle_fn):
    block_size = detect_block_size(oracle_fn)
    print(f"[*] Block size: {block_size}")
    
    # Verifikasi ECB mode
    test = oracle_fn(b"A" * block_size * 2)
    if test[:block_size] == test[block_size:block_size*2]:
        print("[+] ECB mode TERKONFIRMASI!")
    
    recovered = b""
    while True:
        padding_len = block_size - (len(recovered) % block_size) - 1
        crafted = b"A" * padding_len
        target_block_num = len(recovered) // block_size
        target = oracle_fn(crafted)[target_block_num*block_size:(target_block_num+1)*block_size]
        
        found = False
        for byte_val in range(256):
            test_input = crafted + recovered + bytes([byte_val])
            result = oracle_fn(test_input)[target_block_num*block_size:(target_block_num+1)*block_size]
            if result == target:
                recovered += bytes([byte_val])
                print(f"[+] Progress: {recovered.decode(errors='ignore')}")
                found = True
                break
        
        if not found:
            break
    
    return recovered

result = ecb_oracle_attack(oracle)
print(f"\n[+] RECOVERED SECRET: {result.decode(errors='ignore')}")
EOF
```

---

### Langkah 7.3 — Nonce Reuse / Fixed Nonce AES-CTR

Bash

```
python3 << 'EOF'
# Jika dua atau lebih plaintext dienkripsi dengan nonce yang sama
# C1 = P1 XOR Keystream
# C2 = P2 XOR Keystream
# C1 XOR C2 = P1 XOR P2

c1 = bytes.fromhex("CIPHERTEXT1_HEX")  # GANTI
c2 = bytes.fromhex("CIPHERTEXT2_HEX")  # GANTI

# XOR kedua ciphertext
xored = bytes([a ^ b for a, b in zip(c1, c2)])
print(f"[*] C1 XOR C2: {xored.hex()}")
print(f"[*] ASCII: {xored.decode(errors='ignore')}")

# Lakukan crib-dragging untuk recover plaintext
# (sama seperti Two-Time Pad di Fase 5.5)
print("\n[*] Gunakan teknik crib-dragging dari Fase 5.5")
EOF
```

---

## ══════════════════════════════════════

## FASE 8: ADVANCED & CUSTOM CRYPTO

## ══════════════════════════════════════

### Langkah 8.1 — JWT Token Analysis

Bash

```
# Jika mendapat JWT (format: eyJ...eyJ...signature)
JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWRtaW4ifQ.signature"

# Decode header dan payload (tidak perlu key)
python3 << 'EOF'
import base64, json

jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWRtaW4ifQ.sig"  # GANTI

parts = jwt.split('.')
for i, part in enumerate(parts[:2]):
    padded = part + "=" * (-len(part) % 4)
    decoded = base64.b64decode(padded).decode(errors='ignore')
    print(f"Part {i}: {decoded}")
    try:
        print(f"  → JSON: {json.loads(decoded)}")
    except: pass
EOF

# Attack 1: Algorithm confusion (alg: none)
pip3 install pyjwt -q
python3 -c "
import jwt
# Buat token palsu dengan alg=none
payload = {'user': 'admin', 'role': 'administrator'}
fake_token = jwt.encode(payload, '', algorithm='none')
print(f'[+] alg:none token: {fake_token}')
"

# Attack 2: Brute force secret key
pip3 install jwt_tool -q 2>/dev/null
# Atau pakai hashcat
echo "$JWT" > jwt.txt
hashcat -a 0 -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt
```

**OUTPUT BERHASIL ✅ — alg:none accepted:**  
➡️ Server menerima token palsu → akses sebagai admin!

**OUTPUT BERHASIL ✅ — Secret key cracked:**

text

```
eyJ...: secret
```

➡️ Secret = `secret`, forge token dengan key ini.

---

### Langkah 8.2 — Custom Python Script Analysis (Saat Diberi Source)

Bash

```
# Baca dan analisis source code challenge dengan teliti
cat challenge.py

# Cari pattern vulnerability spesifik
grep -n "random\|seed\|time\|getrandbits" challenge.py  # Weak RNG
grep -n "nonce\|iv\|counter" challenge.py                # IV/nonce usage
grep -n "mode\|MODE_" challenge.py                       # AES mode
grep -n "assert\|check\|verify" challenge.py             # Constraint checks
grep -n "flag\|secret\|key" challenge.py                 # Key derivation

# Tanda bahaya yang perlu dicari:
python3 << 'EOF'
with open("challenge.py", "r") as f:
    code = f.read()

vulnerabilities = {
    "random.seed(time.time())": "Weak seed — predictable RNG!",
    "random.seed(0)":           "Fixed seed — deterministic output!",
    "nonce = 0":                "Fixed nonce — keystream reuse!",
    "getrandbits(16)":          "16-bit random — only 65536 possibilities!",
    "e = 3":                    "Small e — cube root attack possible!",
    "MODE_ECB":                 "ECB mode — oracle attack possible!",
    "key = b'\\x00' * 16":     "Null key!",
    "p = q":                    "p == q — trivially factor n!",
}

for pattern, desc in vulnerabilities.items():
    if pattern.lower() in code.lower():
        print(f"[!!!] VULNERABILITY: {desc}")
        print(f"      Pattern: '{pattern}'")
EOF
```

---

## ══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSI

## ══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`binascii.Error: Incorrect padding`|Base64 tanpa `=`|`s += "=" * (-len(s) % 4)`|
|`No hashes loaded` di hashcat|Format hash salah|Verifikasi mode dengan `hashid`|
|`Token length exception`|Hash terpotong|`sed -i 's/\s//g' hash.txt`|
|`No module named 'Crypto'`|Package salah|`pip3 install pycryptodome` (bukan `crypto`)|
|`No module named 'gmpy2'`|Missing C libs|`sudo apt install libgmp-dev && pip3 install gmpy2`|
|`ZeroDivisionError` di RSA|`gcd(e,phi) ≠ 1`|e dan phi tidak coprime, cek parameter|
|Hex panjang ganjil|Leading zero hilang|`h = "0" + h if len(h) % 2 else h`|
|RsaCtfTool crash|Key rusak|`openssl rsa -pubin -in key.pem -text -noout`|
|FactorDB status "C"|Belum difaktorkan|Coba `yafu`, Wiener, atau ECM attack|
|CBC decrypt → Invalid Padding|IV salah|IV = 16 byte pertama dari ciphertext|
|CyberChef output merah|Resep tidak cocok|Disable Autobake, hapus newline di input|
|Output RSA berupa byte acak|p,q tertukar atau d salah|Verifikasi `p * q == n`|

---

## ══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ══════════════════════════════════════

text

```
START: Terima file/string challenge
│
├─ FASE 0: Pre-analysis
│   ├─ File Python? → BACA SOURCE DULU (cari algoritma & bug)
│   ├─ File binary? → file command + entropy check
│   └─ File teks? → Langkah 0.2 analisis visual
│
├─ FASE 1: Identifikasi karakter set
│   ├─ [A-Za-z0-9+/=] ada = → Base64 → FASE 2
│   ├─ [A-Z2-7=] huruf besar → Base32 → FASE 2
│   ├─ [0-9a-f] panjang 32/40/64 → Hash → FASE 4
│   ├─ Hanya alfabet → Classical → FASE 3
│   ├─ n,e,c parameter → RSA → FASE 6
│   ├─ Binary file + source AES → AES → FASE 7
│   └─ Panjang = flag length, binary → XOR → FASE 5
│
├─ FASE 2: Encoding
│   ├─ [Satu layer] → decode langsung
│   ├─ [Multi-layer] → recursive_decoder script
│   └─ [Custom alphabet] → translate dulu
│
├─ FASE 3: Classical Ciphers
│   ├─ [Shift pattern] → Caesar brute force 1-25
│   ├─ [A↔Z pattern] → Atbash
│   ├─ [Key ada] → Vigenere decrypt
│   └─ [Tanpa key] → dcode.fr auto-solve
│
├─ FASE 4: Hash Cracking
│   ├─ [Online lookup] → CrackStation.net → SELESAI
│   ├─ [Offline] → hashcat + rockyou
│   └─ [Gagal] → rules / mask attack
│
├─ FASE 5: XOR
│   ├─ [Single-byte] → brute force 256 keys
│   ├─ [Key diketahui] → repeating XOR decrypt
│   ├─ [Known prefix] → XOR untuk dapat key
│   └─ [Two ciphertexts] → Two-Time Pad + crib-dragging
│
├─ FASE 6: RSA
│   ├─ [RsaCtfTool] → otomatis puluhan attack
│   ├─ [FactorDB] → lookup n → p,q → decrypt
│   ├─ [e=3, c kecil] → cube root attack
│   └─ [Dua n share faktor] → GCD attack
│
└─ FASE 7-8: AES & Advanced
    ├─ [ECB mode] → block oracle / byte-at-a-time
    ├─ [CBC + padding error] → padding oracle
    ├─ [CTR + nonce reuse] → keystream reuse / two-time pad
    └─ [JWT] → alg:none atau brute force secret
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export CHALLENGE_DIR=~/crypto_work
mkdir -p $CHALLENGE_DIR/{files,scripts,hashes,keys,output}

# === QUICK IDENTIFICATION ===
hashid -m "$HASH"                                            # Identify hash type
python3 ~/tools/entropy_calc.py "$CIPHER"                   # Entropy check
file *                                                       # File type detection

# === ENCODING DECODE ===
echo "$CIPHER" | base64 -d                                   # Base64
echo "$CIPHER" | base32 -d                                   # Base32
echo "$CIPHER" | xxd -r -p                                   # Hex
python3 -c "import codecs; print(codecs.decode('$CIPHER', 'rot_13'))"  # ROT13
python3 -c "import urllib.parse; print(urllib.parse.unquote('$CIPHER'))"  # URL

# === HASH CRACKING ===
hashcat -m 0    hash.txt /usr/share/wordlists/rockyou.txt   # MD5
hashcat -m 100  hash.txt /usr/share/wordlists/rockyou.txt   # SHA-1
hashcat -m 1400 hash.txt /usr/share/wordlists/rockyou.txt   # SHA-256
hashcat -m 1000 hash.txt /usr/share/wordlists/rockyou.txt   # NTLM
hashcat -m 3200 hash.txt /usr/share/wordlists/rockyou.txt   # bcrypt
hashcat -m 0 hash.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule  # +rules
hashcat -m 0 hash.txt --show                                 # Show cracked

# === RSA ===
python3 ~/tools/RsaCtfTool/RsaCtfTool.py -n <n> -e <e> --uncipher <c>  # Auto
python3 ~/tools/RsaCtfTool/RsaCtfTool.py --publickey pub.pem --uncipherfile flag.enc
python3 -c "from Crypto.Util.number import inverse,long_to_bytes; p=61;q=53;e=17;c=2790; phi=(p-1)*(q-1); d=inverse(e,phi); print(long_to_bytes(pow(c,d,p*q)))"

# === XOR QUICK ===
python3 -c "c=bytes.fromhex('1b37'); print(max(range(256),key=lambda k:sum(1 for b in bytes([x^k for x in c]) if 32<=b<=126)))"  # Single-byte brute

# === PYTHON ONE-LINERS ===
python3 -c "import base64; print(base64.b64decode('VGVzdA==').decode())"
python3 -c "print(bytes.fromhex('41424344').decode())"
python3 -c "print('FLAG'.encode().hex())"
python3 -c "from Crypto.Util.number import long_to_bytes; print(long_to_bytes(0x464c4147))"
```

---

## 🔗 CROSS-WORKFLOW LINKS

text

```
Crypto output → gunakan di workflow lain:

Dapat hash dari file SMB/FTP → <a href="/docs/password-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">63_password_cracking_workflow.md</a>
Dapat JWT dari web app      → <a href="/docs/jwt" class="text-[#00b4d8] hover:underline font-mono font-semibold">28_jwt_workflow.md</a>  
Dapat RSA key/cert          → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a> (jika SSH private key)
Dapat hash NTLM dari AD     → <a href="/docs/kerberoasting-asreproasting" class="text-[#00b4d8] hover:underline font-mono font-semibold">37_kerberoasting_asreproasting_workflow.md</a>
Dapat encrypted ZIP/KeePass → <a href="/docs/password-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">63_password_cracking_workflow.md</a>
Crypto di binary challenge  → <a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a> + [🧩 File 52 — CTF Binary Patterns](/docs/ctf-binary-patterns)
Hash cracking deep-dive     → <a href="/docs/hash-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">54_hash_cracking_workflow.md</a> (file berikutnya)
```

---

> **➡️ NEXT:** Setelah berhasil identifikasi dan solve crypto challenge, lanjut ke **[🔐 File 54 — Hash Cracking Workflow](/docs/hash-cracking)** untuk teknik hash cracking yang lebih advanced — GPU acceleration, distributed cracking, dan custom rule creation.