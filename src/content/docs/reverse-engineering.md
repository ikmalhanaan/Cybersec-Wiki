---
id: "51"
title: "🧭 BAGIAN 0: FONDASI REVERSE ENGINEERING"
category: "6. Binary & Reversing"
categoryId: "binary"
filename: "51_reverse_engineering_workflow.md"
refs_out: []
refs_in: ["48","49","50","52","53"]
---

## 🧭 BAGIAN 0: FONDASI REVERSE ENGINEERING

### 0.1 Apa Itu Reverse Engineering?

Reverse Engineering (RE) perangkat lunak adalah proses mendekonstruksi program biner terkompilasi (_compiled machine code_) kembali ke representasi logika tingkat tinggi yang dapat dipahami manusia, tanpa memiliki akses ke kode sumber (_source code_) aslinya.

> **Analogi Nyata:**  
> RE seperti mencoba merekonstruksi resep rahasia sebuah kue bolu yang sudah matang. Anda tidak memiliki catatan resep koki. Anda harus mencicipi rasanya (analisis dinamis), memeriksa tekstur dan remahannya di bawah mikroskop (analisis statis), lalu merekonstruksi daftar bahan serta langkah-langkah pembuatannya dari awal.

#### Perbedaan Mendasar: File 48 vs File 51

- **File 48 (Binary Analysis):** Mengidentifikasi _properti eksternal_ biner (Arsitektur CPU, proteksi mitigasi seperti NX/PIE/Canary via `checksec`, dynamic linker, serta metadata ELF). Fokus: _Mengetahui identitas dan karakteristik biner._
- **File 51 (Reverse Engineering):** Membongkar _alur logika internal_ biner (Algoritma enkripsi, verifikasi input, manipulasi memori, manipulasi register, flow kontrol). Fokus: _Mengetahui cara kerja dan algoritma biner._

#### Taksonomi Challenge RE di Lingkungan CTF

1. **CrackMe / Password Checker:** Program meminta input kunci/kata sandi, memvalidasinya melalui perbandingan string atau algoritma matematis, lalu mencetak pesan valid/invalid.
2. **License / Keygen Validator:** Memverifikasi format serial tertentu berdasarkan aturan logika internal (misal: checksum, modular arithmetic). Tujuannya membuat program pembuat kunci (_keygen_).
3. **Flag Encoder / Obfuscator:** Biner mengenkripsi string flag menggunakan algoritma kustom (misal: multi-layer XOR, bitwise shifting, base table swap) dan menyimpannya di memori.
4. **Custom Crypto & Virtual Machine:** Biner mengimplementasikan arsitektur VM mini lengkap dengan custom bytecode dan virtual registers yang memproses input.
5. **Anti-Analysis Binaries:** Biner menerapkan teknik anti-debugging (`ptrace`), deteksi breakpoint, enkripsi runtime (_packers_), atau pengecekan integritas lingkungan.

**Mental Model RE:** Ubah fokus berpikir dari _"Perintah apa yang mengeksploitasi biner ini?"_ menjadi _"Instruksi apa yang memproses data saya, dan kondisi apa yang dibutuhkan agar alur eksekusi menuju ke blok kode yang sukses?"_

---

### 0.2 Metodologi RE Komprehensif

text

```
               +---------------------------------------+
               |             BINARY TARGET             |
               +---------------------------------------+
                                   |
                                   v
+---------------------------------------------------------------------+
| [FASE 1] RECONNAISSANCE CEPAT (0 - 5 Menit)                         |
| - file, strings, checksec                                           |
| - Dynamic tracer awal: ltrace, strace                               |
+---------------------------------------------------------------------+
                                   |
                     +-------------+-------------+
                     |                           |
            [Trik Cepat Berhasil]       [Logika Kompleks]
                     |                           |
                     v                           v
              FLAG DITEMUKAN   +--------------------------------------+
              (Selesai)        | [FASE 2] STATIC ANALYSIS             |
                               | - Ghidra: Disassembly & Decompilation|
                               | - Identifikasi entry point / main()  |
                               | - Pemetaan fungsi, string reference  |
                               +--------------------------------------+
                                                 |
                                                 v
                               +--------------------------------------+
                               | [FASE 3] DYNAMIC ANALYSIS            |
                               | - GDB/pwndbg: Runtime inspect        |
                               | - Setting breakpoint pada branch     |
                               | - Verifikasi nilai register & stack  |
                               +--------------------------------------+
                                                 |
                                                 v
                               +--------------------------------------+
                               | [FASE 4] HIPOTESIS LOGIKA            |
                               | - Rekonstruksi model matematis/alur  |
                               | - "Input di-XOR dengan 0x5A"         |
                               +--------------------------------------+
                                                 |
                                                 v
                               +--------------------------------------+
                               | [FASE 5] VERIFIKASI & SOLVER         |
                               | - Buat script Python solver/decoder  |
                               | - Atau patch instruksi (bypass)      |
                               +--------------------------------------+
                                                 |
                                                 v
                                           SOLVED / FLAG
```

---

### 0.3 Setup Ghidra di Parrot OS XFCE

Ghidra adalah framework Software Reverse Engineering (SRE) berbasis Java yang dikembangkan oleh National Security Agency (NSA), dilengkapi disassembler grafis dan decompiler tingkat tinggi.

#### Prosedur Instalasi Dependensi & Ghidra

Bash

```
# 1. Update package index lokal
sudo apt update

# 2. Instalasi Java Development Kit (JDK 17 atau JDK 21 diwajibkan)
sudo apt install default-jdk openjdk-17-jdk unzip wget git -y

# 3. Verifikasi instalasi runtime Java
java -version
javac -version

# 4. Buat direktori kerja tools jika belum ada
mkdir -p ~/tools && cd ~/tools

# 5. Unduh rilis stabil Ghidra (Gunakan tautan resmi GitHub)
# Catatan: Sesuaikan versi release terbaru jika diperlukan
wget https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_11.0.3_build/ghidra_11.0.3_PUBLIC_20240410.zip

# 6. Ekstraksi arsip instalasi
unzip ghidra_11.0.3_PUBLIC_20240410.zip

# 7. Masuk ke direktori hasil ekstraksi
cd ghidra_11.0.3_PUBLIC

# 8. Berikan hak akses eksekusi pada script peluncur
chmod +x ghidraRun

# 9. (Opsional) Buat symbolic link ke /usr/local/bin agar bisa dipanggil dari terminal mana saja
sudo ln -sf ~/tools/ghidra_11.0.3_PUBLIC/ghidraRun /usr/local/bin/ghidra

# 10. Jalankan Ghidra
ghidra
```

#### Alur Pembuatan Project Ghidra Pertama Kali

1. **Membuat Project Baru:**
    - Klik menu `File` -> `New Project...`
    - Pilih opsi `Non-Shared Project` -> Klik `Next`.
    - Tentukan `Project Directory` (contoh: `/home/user/ctf/rev/`) dan `Project Name` (contoh: `PicoCTF_Analysis`).
    - Klik `Finish`.
2. **Mengimpor Biner Target:**
    - Tekan tombol pintas `I` atau pilih menu `File` -> `Import File...`
    - Navigasikan ke file executable target, pilih file, lalu klik `Select File to Import`.
    - Kotak dialog konfirmasi metadata format ELF (Format: Executable and Linking Format (ELF), Language: x86:LE:64:default) akan muncul secara otomatis. Klik `OK`.
    - Tunggu ringkasan informasi parsing selesai, lalu klik `OK`.
3. **Membuka Analisis Visual (CodeBrowser):**
    - Di dalam daftar folder project, klik dua kali (_double click_) pada nama biner target. Jendela utama CodeBrowser akan terbuka.
4. **Auto-Analysis:**
    - Kotak dialog konfirmasi akan muncul: `"<binary_name> has not been analyzed. Would you like to analyze it now?"` -> Klik `Yes`.
    - Pada jendela opsi analisis, biarkan semua default tercentang (termasuk _Decompiler Parameter ID_, _Stack Analysis_, dan _Apply Data Archives_).
---

### 0.4 🔤 Mini Assembly Reference (Baca Ini Dulu)

Sebelum membaca panel Listing (Assembly) atau Decompiler di Ghidra, kuasai fondasi register dan instruksi assembly x86-64 berikut:

#### Register x86-64 yang Wajib Dihafal

| Register | Ukuran | Fungsi Utama | Contoh di Decompiler / Context |
|----------|--------|--------------|----------------------|
| **RAX**  | 64-bit | Return value fungsi, hasil operasi | `iVar1 = strcmp(...)` → hasil return disimpan di RAX |
| **RDI**  | 64-bit | Argumen ke-1 fungsi (System V AMD64 ABI) | `strcmp(RDI, RSI)` → RDI = pointer string arg1 |
| **RSI**  | 64-bit | Argumen ke-2 fungsi | `strcmp(RDI, RSI)` → RSI = pointer string arg2 |
| **RDX**  | 64-bit | Argumen ke-3 fungsi | RDX = size/length/arg3 |
| **RCX**  | 64-bit | Argumen ke-4 fungsi / Loop counter | RCX = arg4 |
| **R8 / R9**| 64-bit| Argumen ke-5 / ke-6 fungsi | R8 = arg5, R9 = arg6 |
| **RSP**  | 64-bit | Stack Pointer (menunjuk puncak stack) | `x/20gx $rsp` |
| **RBP**  | 64-bit | Base Pointer (dasar stack frame) | `local_18 = [rbp-0x18]` |
| **RIP**  | 64-bit | Instruction Pointer (Program Counter) | Alamat instruksi berikutnya yang akan dieksekusi |

#### Instruksi Assembly yang Sering Muncul di CTF RE

| Instruksi | Contoh | Artinya |
|-----------|--------|---------|
| **MOV**   | `mov eax, 0x1` | Salin nilai 1 ke register EAX |
| **LEA**   | `lea rdi, [rip+0xe73]` | Load Effective Address (menghitung pointer/alamat memori) |
| **CMP**   | `cmp eax, 0x0` | Bandingkan EAX dengan 0, set EFLAGS (Zero Flag, Sign Flag) |
| **TEST**  | `test rax, rax` | Operasi bitwise AND (hanya set EFLAGS, biasa untuk cek NULL/0) |
| **JE / JZ**| `je 0x401196` | Jump if Equal / Jump if Zero (Lompat jika ZF=1) |
| **JNE / JNZ**| `jne 0x401196` | Jump if Not Equal / Jump if Not Zero (Lompat jika ZF=0) |
| **JS**    | `js 0x401160` | Jump if Sign (Lompat jika hasil negatif / SF=1) |
| **JMP**   | `jmp 0x401170` | Jump Unconditional (Lompat langsung tanpa syarat) |
| **XOR**   | `xor eax, eax` | EAX XOR EAX = 0 (Cara cepat me-reset/zero-out register) |
| **CALL**  | `call 0x401030` | Panggil fungsi (push return address ke stack, lompat ke target) |
| **RET**   | `ret` | Return (pop return address dari stack ke RIP) |
| **PUSH**  | `push rbp` | Simpan nilai RBP ke puncak stack |
| **POP**   | `pop rbp` | Ambil nilai dari puncak stack ke RBP |

#### Mode Mode Pengalamatan Memori (Memory Addressing Modes)

- `[rbp - 0x20]`: Variabel lokal fungsi pada stack frame (20 hex byte di bawah RBP).
- `[rsp + 0x10]`: Data temporary / argumen berlebih pada stack (10 hex byte di atas RSP).
- `[rip + 0xe73]`: **RIP-relative addressing** (khas 64-bit PIE) — menghitung alamat data statis di `.rodata` / `.data` relatif dari alamat RIP saat ini.

---

## ⚡ BAGIAN 1: RECONNAISSANCE CEPAT (5 MENIT)

Sebelum membuka disassembler berat seperti Ghidra, lakukan triage 5 menit pertama menggunakan CLI utilitas biner Linux standar.

### 1.1 Tools Quick Recon

#### 1. `file` — Identifikasi Format dan Arsitektur

Digunakan untuk menentukan arsitektur CPU, bitness, endianness, dan status tabel simbol.

Bash

```
# Menjalankan inspeksi metadata biner
file ./challenge_bin
```

_Contoh Output Nyata:_

text

```
./challenge_bin: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=9d94380db397e5ea77cf16ea913bd73f78a2e584, for GNU/Linux 3.2.0, stripped
```

_Interpretasi Hasil:_  
Target adalah biner 64-bit x86-64 Little-Endian (LSB), posisi alamat memori teracak jika dieksekusi (PIE), membutuhkan runtime library Linux dinamis, dan berstatus **stripped** (seluruh debugging symbols dan nama fungsi internal dihilangkan).

---

#### 2. `strings` — Ekstraksi Human-Readable Data

Mencari teks ASCII atau UTF-8 yang tertanam langsung di dalam sections biner (`.rodata`, `.data`, `.text`).

Bash

```
# Ekstraksi string dengan panjang karakter minimal 8
strings -n 8 ./challenge_bin

# Filter string berbasis pola umum flag atau validasi password
strings ./challenge_bin | grep -Ei "flag|pass|secret|wrong|correct|congrat|invalid|\{.*\}|key"
```

_Contoh Output Nyata:_

text

```
Enter the vault password: 
Authentication Failed!
Correct password! The flag is: FLAG{s1mpl3_str1ngs_ch3ck}
/lib64/ld-linux-x86-64.so.2
__libc_start_main
```

_Interpretasi Hasil:_  
Jika string flag muncul langsung, tantangan terselesaikan dalam hitungan detik (_hardcoded flag_).

---

#### 3. `ltrace` — Intersepsi Dynamic Library Calls

Mencegat dan mencetak setiap pemanggilan fungsi library bersama (_shared library_) seperti `strcmp`, `strncmp`, `malloc`, `strlen`, dan `puts`.

Bash

```
# Eksekusi interaktif dengan tracing pustaka dinamis
ltrace ./challenge_bin

# Eksekusi dengan injeksi input langsung melalui stdin
ltrace ./challenge_bin <<< "TEST_INPUT_STRING"

# Filter khusus pemanggilan perbandingan string atau array
ltrace -e strcmp,strncmp,memcmp,strlen ./challenge_bin <<< "TEST_INPUT_STRING"
```

_Contoh Output Nyata:_

text

```
__libc_start_main(0x555555555169, 1, 0x7fffffffe308 <unfinished ...>
printf("Enter password: ")                                = 16
fgets("TEST_INPUT_STRING\n", 64, 0x7ffff7fa8aa0)          = 0x7fffffffe1f0
strcmp("TEST_INPUT_STRING\n", "s3cr3t_P@ssw0rd_2024!\n")  = 1
puts("Authentication Failed!")                           = 23
+++ exited with status 0 +++
```

_Interpretasi Hasil:_  
Fungsi `strcmp` menerima dua argumen pointer: argumen pertama adalah buffer input user, argumen kedua adalah password valid target. Kunci rahasia bocor seketika di konsol.

---

#### 4. `strace` — Intersepsi System Calls

Melacak komunikasi program langsung ke kernel Linux (file access, network sockets, alokasi memori).

Bash

```
# Trace semua system call
strace ./challenge_bin

# Trace hanya system call manipulasi file descriptor dan I/O
strace -e trace=read,write,openat,access,stat ./challenge_bin
```

_Contoh Output Nyata:_

text

```
openat(AT_FDCWD, "/etc/target_secret.key", O_RDONLY) = -1 ENOENT (No such file or directory)
write(1, "Error: Keyfile missing!\n", 24) = 24
exit_group(1)                           = ?
+++ exited with status 1 +++
```

_Interpretasi Hasil:_  
Program gagal berjalan bukan karena masalah kode, melainkan mencari path file `/etc/target_secret.key` yang harus kita buat secara lokal terlebih dahulu.

---

#### 5. `nm` — Dump Symbol Table

Memeriksa tabel simbol internal untuk melihat nama fungsi dan variabel global jika biner berstatus _not stripped_.

Bash

```
# Menampilkan simbol standar
nm ./challenge_bin

# Menampilkan simbol dinamis (tetap ada walau biner di-strip)
nm -D ./challenge_bin
```

_Contoh Output Nyata:_

text

```
0000000000004010 B __bss_start
0000000000001149 T check_password
00000000000011a8 T decrypt_flag
0000000000001129 T main
                 U strcmp@@GLIBC_2.2.5
```

_Interpretasi Hasil:_  
Biner tidak di-strip. Ditemukan fungsi kritis: `check_password` dan `decrypt_flag`. Kita bisa langsung menargetkan analisis breakpoint ke alamat tersebut.

---

#### 6. `objdump` — Disassembler CLI Ringan

Menampilkan instruksi assembly mentah tanpa perlu GUI.

Bash

```
# Disassemble syntax Intel untuk fungsi main
objdump -M intel -d ./challenge_bin | grep -A 25 "<main>:"
```

---

#### 7. `readelf` — Ekstraksi Header dan Sections Struktur ELF

Mengetahui pemetaan section executable di memori.

Bash

```
# Menampilkan struktur section headers
readelf -S ./challenge_bin

# Menampilkan dependensi interpreter dan dynamic segments
readelf -l ./challenge_bin
```

---

#### 8. `xxd` / `hexdump` — Raw Hexadecimal Inspection

Bash

```
# Melihat 32 byte pertama dari file ELF (Magic bytes, architecture)
hexdump -C -n 32 ./challenge_bin
```

_Contoh Output Nyata:_

text

```
00000000  7f 45 4c 46 02 01 01 00  00 00 00 00 00 00 00 00  |.ELF............|
00000010  03 00 3e 00 01 00 00 00  60 10 00 00 00 00 00 00  |..>.....`.......|
```

_Interpretasi Hasil:_  
Magic number `7f 45 4c 46` (`\x7fELF`), bit-format `02` (64-bit), endian `01` (Little-endian).

---

### 1.2 Decision Table: Dari Triage Menuju Eksekusi Analisis

|Temuan Hasil Output Quick Recon|Analisis Situasi|Langkah Tindakan Lanjutan|
|---|---|---|
|`strings` memunculkan format `FLAG{...}`|Flag tersimpan dalam format plain ASCII|Salin flag, selesaikan challenge (Trivial).|
|`strings` memunculkan karakter Base64 (`==`)|Terdapat encoding data internal|Decode string menggunakan CLI `base64 -d` atau CyberChef.|
|`ltrace` menampilkan argumen `strcmp(input, target)`|Verifikasi password berbasis libc plain comparison|Ambil argumen kedua sebagai flag/password valid.|
|`ltrace` menampilkan string input diproses karakter demi karakter|Terdapat pemrosesan array atau loop byte|Lakukan static analysis Ghidra untuk melihat algoritma loop.|
|`ltrace` kosong atau biner langsung keluar|Biner di-link secara statis (`statically linked`)|Beralih ke Ghidra; `ltrace` tidak berfungsi pada pustaka statis.|
|`strace` memanggil `ptrace(PTRACE_TRACEME, ...)`|Mengandung mekanisme Anti-Debugging|Biner memblokir runtime debugger. Harus dipatch / dibypass.|
|`strace` mencari path file lokal yang tidak ada|Biner membutuhkan file konfigurasi/input file|Buat file placeholder pada direktori yang diminta target.|
|`file` melaporkan biner berstatus `stripped`|Simbol fungsi (termasuk `main`) telah dihapus|Cari entry point via `_start` dan lacak argumen `__libc_start_main`.|
|Section header memiliki nama aneh (`UPX0`, `UPX1`)|Biner telah dikompresi menggunakan Packer|Gunakan workflow Unpacking pada Bagian 1.3.|

---

### 1.3 📦 Handling Packer: Deteksi & Workflow Unpacking (UPX, Custom Packer, DIE)

Packer mengompresi atau mengenkripsi kode biner asli. Jika biner ter-pack langsung diimpor ke Ghidra, decompiler hanya akan menampilkan stub unpacker sederhana, bukan kode logika program yang sebenarnya.

#### Step 1: Deteksi Packer (UPX vs Non-UPX vs Custom Packer)
```bash
# 1. Cek string indikator UPX
strings ./challenge_bin | grep -i "upx"

# 2. Test integritas header UPX
upx -t ./challenge_bin

# 3. Deteksi packer lain / custom packer menggunakan Detect-It-Easy (DIE)
sudo apt install detect-it-easy -y
die-cli ./challenge_bin     # CLI
```

#### Step 2: Unpacking UPX Standard
```bash
# Backup biner asli terlebih dahulu!
cp ./challenge_bin ./challenge_bin.bak

# Jalankan unpacking
upx -d ./challenge_bin -o ./challenge_bin_unpacked

# Verifikasi hasil unpack:
file ./challenge_bin_unpacked
strings ./challenge_bin_unpacked | head -20
```

#### Step 3: Bagaimana Jika `upx -d` Gagal atau Custom Packer?
Jika `upx -d` mengembalikan error `UnpackError: HeaderCorrupted` atau biner menggunakan custom packer:
1. **Dynamic Unpacking via Memory Dump di GDB**:
   - Program ter-pack akan mendekripsi kodenya sendiri ke RAM saat eksekusi dimulai (OEP - Original Entry Point).
   - Jalankan biner di GDB, pasang breakpoint di OEP atau pada memori executable yang baru dialokasikan (`mprotect` / `vmmap`).
   - Dump segmen memori executable yang sudah terdekripsi ke file:
     ```gdb
     (gdb) vmmap
     (gdb) dump binary memory /tmp/unpacked_text.bin <start_addr> <end_addr>
     ```
2. **Re-Analyze di Ghidra**:
   - Setelah mendapatkan biner hasil unpack (`./challenge_bin_unpacked`), impor file baru tersebut ke Ghidra untuk analisis logika lengkap.

---

## 🛠️ BAGIAN 2: GHIDRA MASTER WORKFLOW

Ghidra memproses instruksi mesin biner menjadi dua representasi visual: **Listing View** (Assembly) dan **Decompiler Window** (Representasi Pseudocode C tingkat tinggi).

---

### 2.1 Import dan Analyze Biner

1. Buka Ghidra melalui terminal: `ghidraRun` atau `ghidra`.
2. Masukkan file target via `File` -> `Import File`.
3. Buka file dalam tool **CodeBrowser** (ikon naga Ghidra).
4. Klik **Yes** pada popup analisis awal.
5. Konfirmasi dialog **Analysis Options**:
    - Centang standar yang aktif secara otomatis sudah optimal untuk sebagian besar arsitektur x86/x86_64.
    - Pastikan `Decompiler Parameter ID` aktif.
    - Klik **Analyze**.
6. **Mengecek Status Progres:** Perhatikan baris status di ujung kanan bawah layar. Tunggu label progress berubah kembali menjadi status idle (ikon status tidak lagi berputar/berjalan).

---

### 2.2 Navigasi Workspace Ghidra

Workspace CodeBrowser terdiri dari 4 panel utama:

text

```
+-----------------------------------------------------------------------------------+
|  Ghidra CodeBrowser                                                               |
+-------------------------------+-----------------------------------+---------------+
| [1] SYMBOL TREE               | [2] LISTING (DISASSEMBLY)         | [3] DECOMPILER|
| - Imports                     | 00101155: PUSH RBP                | int main(void)|
| - Exports                     | 00101156: MOV  RBP, RSP           | {             |
| - Functions                   | 00101159: SUB  RSP, 0x20          |   int var1;   |
|   * main                      | 0010115D: CALL sym.imp.puts       |   puts("Hi"); |
|   * validate                  | 00101162: CMP  EAX, 0x1           |   return 0;   |
| - Strings                     | 00101165: JZ   0x00101180         | }             |
+-------------------------------+-----------------------------------+---------------+
| [4] CONSOLE & SCRIPTING                                                           |
| Script Log, Python Interpreter, Error Reporting                                   |
+-----------------------------------------------------------------------------------+
```

#### Navigasi & Shortcut Esensial

- `G` (_Go to Address / Label_): Membuka dialog navigasi langsung ke alamat memori (contoh: `0x401126`), section (`.rodata`), atau nama fungsi (`main`).
- `L` (_Rename Label/Variable_): Mengubah nama variabel otomatis Ghidra (`local_18`, `FUN_00101230`) menjadi representasi fungsional (`user_input`, `validate_auth`).
- `T` (_Retype Variable_): Mengubah tipe data C (misal: dari `undefined4` menjadi `int`, atau `undefined8` menjadi `char *`).
- `;` (_Set Comment_): Menambahkan catatan manual pada baris assembly aktif di panel Listing.
- `Ctrl + F`: Mencari string teks atau token instruksi di dalam panel aktif.
- `Ctrl + Shift + F`: Melakukan pencarian global (_Search Memory / Program Text_).

---

### 2.3 Menemukan `main()` dan Titik Masuk Kritis

#### Metode 1: Penelusuran Langsung via Symbol Tree

- Pada panel **Symbol Tree** (kiri atas), perluas folder **Functions**.
- Gulirkan daftar alfabetis ke bawah dan cari fungsi berlabel `main`.
- Klik satu kali untuk mengarahkan panel Listing dan Decompiler secara serentak ke awal fungsi tersebut.

#### Metode 2: Pelacakan String Reference

Ketika biner tidak memiliki tabel fungsi atau nama fungsi telah diubah:

- Pilih menu utama: `Search` -> `For Strings...`
- Klik tombol `Search` pada jendela pencarian string.
- Cari string yang sebelumnya ditemukan saat recon (misal: `"Enter password:"` atau `"Correct!"`).
- Klik ganda pada string tersebut di hasil pencarian. CodeBrowser akan berpindah ke section `.rodata`.
- Pada panel Listing, perhatikan label XREF (Cross-Reference) di samping deklarasi string (contoh: `XREF[1]: main:00401142(R)`).
- Klik dua kali label `XREF` tersebut. Anda akan langsung dihantarkan ke blok instruksi fungsi yang menggunakan string tersebut.

#### Metode 3: Pelacakan Biner Ter-strip (_Stripped Binary Recovery_)

Jika biner berstatus _stripped_, fungsi `main` tidak akan memiliki label nama di Symbol Tree.

1. Pada **Symbol Tree**, arahkan ke fungsi `entry` (atau address `_start`).
2. Periksa decompiler untuk fungsi `entry`. Standard library glibc menginisialisasi program melalui signature wrapper `__libc_start_main`:

C

```
void processEntry entry(undefined8 param_1, undefined8 param_2)
{
  undefined8 in_stack_00000000;
  
  // Argumen pertama yang dikirimkan ke __libc_start_main
  // pada arsitektur x86-64 System V ABI adalah pointer fungsi main() asli.
  __libc_start_main(FUN_00101149, in_stack_00000000, &stack0x00000008,
                    FUN_001011d0, FUN_00101240, param_2);
  do {
    halt_baddata();
  } while( true );
}
```

3. Klik ganda pada parameter pertama: `FUN_00101149`.
4. Blok kode tersebut adalah fungsi **`main()` yang sebenarnya**.
5. Tekan tombol `L` pada nama `FUN_00101149`, lalu ubah namanya menjadi `main`.

---

### 2.4 Membaca dan Memahami Decompiler Output

Pseudocode Ghidra merekonstruksi assembly ke dalam sintaks C. Namun, karena hilangnya tipe data asli dan optimasi compiler, terdapat pola penamaan khas yang harus dipahami:

- `uVar1`, `iVar2`: Unsigned Variable, Integer Variable (variabel temporary).
- `local_XX`: Alokasi variabel lokal pada stack frame dengan offset heksadesimal `XX` terhadap base pointer.
- `in_RDI`, `param_1`: Parameter fungsi yang diterima dari register pemanggil konvensi x86_64.
- `*(type *)(address)`: Operasi dereference pointer langsung ke alamat memori fisik/virtual.

---

#### Analisis Kasus 1: Password Checker Biner

Berikut decompiler asli yang dihasilkan Ghidra sebelum proses pembersihan:

C

```
// Decompiler output sebelum rekonstruksi variabel:
undefined8 FUN_00101169(void)
{
  int iVar1;
  char local_48 [56];
  long local_10;
  
  local_10 = *(long *)(in_FS_OFFSET + 0x28); // Deteksi Stack Canary
  printf("Enter the secret key: ");
  fgets(local_48, 0x32, _stdin);             // Baca 50 byte dari user
  iVar1 = strcmp(local_48, "CTF{h4rdc0d3d_p4ssw0rd}\n");
  if (iVar1 == 0) {
    puts("Access Granted!");
  }
  else {
    puts("Access Denied!");
  }
  if (local_10 != *(long *)(in_FS_OFFSET + 0x28)) {
                    // Canary integrity verification
    __stack_chk_fail();
  }
  return 0;
}
```

_Bedah Alur Pseudocode:_

1. Baris `local_10 = *(long *)(in_FS_OFFSET + 0x28);` mengindikasikan compiler menyisipkan **Stack Canary** untuk memitigasi buffer overflow. Ini bukan bagian dari logika verifikasi password dan dapat diabaikan dalam konteks RE logika.
2. `fgets(local_48, 0x32, _stdin)`: Input kita dialokasikan pada buffer array stack bernama `local_48` dengan batasan panjang pembacaan `0x32` (50 desimal) byte.
3. `strcmp(local_48, "CTF{h4rdc0d3d_p4ssw0rd}\n")`: Nilai kembalian fungsi perbandingan string disimpan di `iVar1`.
4. Jika `iVar1 == 0`, program mencetak string sukses. Syarat penyelesaian: Masukkan string `"CTF{h4rdc0d3d_p4ssw0rd}"`.

---

#### Analisis Kasus 2: Loop Bitwise Transformation (XOR Check)

C

```
undefined8 FUN_001011c0(void)
{
  size_t sVar1;
  int iVar2;
  int local_4c;
  char local_48 [56];
  long local_10;
  
  local_10 = *(long *)(in_FS_OFFSET + 0x28);
  printf("Input flag: ");
  __isoc99_scanf("%40s", local_48);
  sVar1 = strlen(local_48);
  if (sVar1 == 0x10) { // Validasi panjang input harus 16 (0x10) karakter
    local_4c = 0;
    while (local_4c < 0x10) {
      // Input dimodifikasi secara in-place dengan operator XOR constant 0x5b
      local_48[local_4c] = local_48[local_4c] ^ 0x5b;
      local_4c = local_4c + 1;
    }
    // Perbandingan dilakukan terhadap memori global DAT_00102020
    iVar2 = memcmp(local_48, &DAT_00102020, 0x10);
    if (iVar2 == 0) {
      puts("Flag Valid!");
      goto LAB_00101290;
    }
  }
  puts("Invalid Flag!");
LAB_00101290:
  return 0;
}
```

_Bedah Alur Pseudocode:_

1. Program memverifikasi panjang string input melalui `strlen`: harus presisi `0x10` (16 desimal).
2. Terdapat perulangan `while` dari index `0` hingga `15`. Setiap karakter array dieksekusi dengan operasi `input[i] = input[i] ^ 0x5b`.
3. Setelah seluruh karakter ditransformasi, biner membandingkan array hasil dengan blok byte yang tersimpan pada label global `DAT_00102020`.
4. Untuk menyelesaikannya, klik dua kali pada `DAT_00102020` di Ghidra untuk menyalin 16 byte heksadesimal yang tersimpan di sana, lalu lakukan pembalikan logika (XOR kembali setiap byte dengan `0x5b`).

---

### 2.5 Refactoring: Rename Variable dan Type Cast

Untuk mempermudah pemahaman alur program, lakukan renaming langsung pada Ghidra:

1. **Ubah Nama Fungsi Utama:** Arahkan kursor pada nama fungsi `FUN_001011c0`, tekan `L`, ganti menjadi `main_logic`.
2. **Ubah Nama Variabel Input:** Arahkan kursor pada `local_48`, tekan `L`, ketik `user_buffer`.
3. **Ubah Nama Variabel Index Perulangan:** Arahkan kursor pada `local_4c`, tekan `L`, ketik `index_counter`.
4. **Ubah Tipe Data Array:** Klik kanan pada variabel `user_buffer`, pilih **Retype Variable** (Shortcut `T`), masukkan `char[16]` lalu tekan Enter.

Kode yang telah di-refactor akan berubah menjadi pseudocode C yang bersih dan mudah dianalisis:

C

```
undefined8 main_logic(void)
{
  size_t input_length;
  int cmp_result;
  int index_counter;
  char user_buffer [16];
  
  printf("Input flag: ");
  __isoc99_scanf("%40s", user_buffer);
  input_length = strlen(user_buffer);
  if (input_length == 16) {
    index_counter = 0;
    while (index_counter < 16) {
      user_buffer[index_counter] = user_buffer[index_counter] ^ 0x5b;
      index_counter = index_counter + 1;
    }
    cmp_result = memcmp(user_buffer, &EXPECTED_CIPHER_ARRAY, 16);
    if (cmp_result == 0) {
      puts("Flag Valid!");
      return 0;
    }
  }
  puts("Invalid Flag!");
  return 0;
}
```

---

### 2.6 📤 4 Cara Extract Bytes dari Ghidra ke Python Solver

Saat menemukan array bytes terenkripsi/konstanta di Ghidra (misal `CIPHER_ARRAY`), ada 4 metode praktis untuk mengekstraknya ke Python:

#### Metode 1: Manual Copy via Ghidra GUI
1. Klik alamat/simbol `CIPHER_ARRAY` di panel **Listing**.
2. Blok byte yang dibutuhkan, klik kanan → `Copy Special` → pilih `Byte String`.
3. Output di clipboard: `"09 0b 19 20 3a 1b 73 30 70 20 70 3f 7b 3b 70 3c 7a 36 30 32"`.

#### Metode 2: Parsed Byte String Langsung di Python
Jika menyalin string byte berformat hex dari Ghidra, konversi langsung di Python:
```python
raw = "09 0b 19 20 3a 1b 73 30 70 20 70 3f 7b 3b 70 3c 7a 36 30 32"
data = bytes(int(x, 16) for x in raw.split())
print(data)
# Output: b'\x09\x0b\x19...'
```

#### Metode 3: GDB Dump Memory Langsung ke File
Jika biner sedang berjalan di bawah kendali GDB, dump range memori ke file biner mentah:
```gdb
# dump binary memory <output_path> <start_addr> <end_addr>
(gdb) dump binary memory /tmp/cipher_dump.bin 0x102020 0x102034
```
Lalu baca dari Python solver script Anda:
```python
with open("/tmp/cipher_dump.bin", "rb") as f:
    data = f.read()
print("Bytes List:", list(data))
```

#### Metode 4: Ghidra Python Script (Paling Powerful & Otomatis)
Di Ghidra: Buka menu `Window` → `Script Manager` → buat New Script (`ExtractBytes.py`):
```python
# Ghidra Jython / Python Script
from ghidra.program.model.symbol import SymbolType

symbol = getSymbol("CIPHER_ARRAY", None)
addr = symbol.getAddress()
data = [getByte(addr.add(i)) & 0xFF for i in range(20)]
print("Extracted Bytes:", [hex(b) for b in data])
```

---

## 🔍 BAGIAN 3: GDB UNTUK DYNAMIC ANALYSIS

Dynamic Analysis melengkapi analisis statis ketika logika biner terlalu terobfuskasi atau menghasilkan data dinamis yang baru didekripsi saat runtime berlangsung di memori.

---

### 3.1 Kapan Dynamic Analysis Lebih Efektif Dibandingkan Static Analysis?

1. **Self-Modifying / Packed Code:** Program biner mengeksekusi stub unpacking yang mendekripsi kode executable asli langsung ke RAM saat runtime.
2. **Algoritma Obfuskasi Matematika Ekstrem:** Ketika decompiler memproduksi ratusan baris operasi nested bitwise yang rumit, namun verifikasi akhirnya memanggil fungsi sederhana dengan parameter hasil akhir di register/stack.
3. **Deteksi Nilai State Register Runtime:** Memeriksa nilai register `RAX`, `RDI`, atau buffer memory tanpa perlu merekonstruksi seluruh struktur data internal secara manual.

---

### 3.2 GDB + Pwndbg Command Framework

Mulai debugging dengan memuat biner target menggunakan GDB:

Bash

```
# Buka biner tanpa banner berlebih
gdb -q ./challenge_bin
```

#### Perintah Esensial Dynamic Analysis

Bash

```
# 1. Menentukan breakpoint awal
break main                 # Breakpoint di simbol main (jika ada)
break *0x0000000000401149  # Breakpoint di alamat spesifik (jika biner stripped)

# 2. Menjalankan biner dengan berbagai skenario input stdin
run                        # Menjalankan program interaktif
run <<< "TEST_FLAG"        # Menjalankan program dengan direct heredoc injection
run < payload.bin          # Menjalankan program dengan input file mentah

# 3. Navigasi eksekusi instruksi CPU
nexti                      # Step Over: Eksekusi satu instruksi mesin berikutnya (lewati call)
stepi                      # Step Into: Eksekusi satu instruksi mesin, masuk ke dalam fungsi call
continue                   # Lanjutkan eksekusi hingga breakpoint berikutnya atau exit

# 4. Inspeksi data memori dan register
info registers             # Dump seluruh state register CPU (RAX, RBX, RCX, dll.)
print/x $rax               # Cetak nilai register RAX dalam format hex
print/d $rax               # Cetak nilai register RAX dalam format desimal
print (char*)$rdi          # Cast nilai pointer register RDI menjadi string C

# 5. Memeriksa isi memori (Instruksi Examine / x)
x/s $rdi                   # Cetak string ASCII yang ditunjuk oleh register RDI
x/s 0x404080               # Cetak string yang berada pada alamat statis 0x404080
x/20gx $rsp                # Dump 20 quadwords (8-byte) hex mulai dari puncak Stack (RSP)
x/16bx $rbp-0x20           # Dump 16 byte individual mulai dari buffer lokal frame pointer
x/10i $rip                 # Disassemble 10 instruksi mesin berikutnya mulai dari RIP

# 6. Pencarian data dalam ruang memori runtime
find $rsp, +0x1000, "CTF{"  # Pindai string "CTF{" sejauh 4096 byte dari stack pointer
```

---

### 3.2.1 🎯 Kalkulasi Alamat Breakpoint pada Biner PIE (Position-Independent Executable)

Pada biner modern dengan proteksi PIE aktif, alamat di Ghidra (berbasis `0x100000`) tidak sama dengan alamat runtime di GDB karena base address diacak.

```bash
# MASALAH:
# Ghidra menunjukkan fungsi main berada di 0x101149
# Tetapi breakpoint (break *0x101149) gagal / tidak pernah terpicu di GDB.

# SOLUSI KALKULASI ALAMAT PIE:

# Step 1: Jalankan biner di GDB hingga instruksi pertama (sebelum main)
gdb -q ./challenge_bin
pwndbg> starti   # Berhenti di instruksi paling awal (_start)

# Step 2: Dapatkan base address ruang memori biner dengan vmmap
pwndbg> vmmap
# Output vmmap:
# 0x555555554000 0x555555556000 r-xp ./challenge_bin  ← BASE ADDRESS BINER

# Step 3: Hitung alamat nyata di GDB
# Formula: Alamat_GDB = Base_Address + (Alamat_Ghidra - 0x100000)
# = 0x555555554000 + (0x101149 - 0x100000)
# = 0x555555554000 + 0x1149
# = 0x555555555149

# Step 4: Pasang breakpoint pada alamat yang telah dikalkulasi
pwndbg> break *0x555555555149
pwndbg> continue

# 💡 SHORTCUT PWNDBG (Otomatis Handle PIE Offset):
# Gunakan perintah piebreak langsung dengan offset dari Ghidra:
pwndbg> piebreak *0x101149
```

---

### 3.3 Menggunakan `ltrace` untuk Membaca Validasi Flag

Banyak biner pemula dan level intermediate CTF memverifikasi flag menggunakan standard library wrappers:

Bash

```
# Jalankan biner di bawah trace library libc
ltrace ./challenge_bin <<< "FLAG_PLACEHOLDER"
```

_Skenario Output Detail:_

text

```
malloc(64)                                               = 0x5555555592a0
puts("Masukkan kunci enkripsi:")                         = 26
fgets("FLAG_PLACEHOLDER\n", 64, 0x7ffff7fa8aa0)          = 0x7fffffffe1e0
strlen("FLAG_PLACEHOLDER\n")                             = 18
strncmp("FLAG_PLACEHOLDER\n", "picoCTF{d1r3ct_l1br4ry_c0mp4r1s0n}", 32) = -1
puts("Kunci Salah!")                                     = 14
```

**Analisis Hasil:** Fungsi `strncmp` menerima pointer ke string user dan string kunci target. Flag target adalah `picoCTF{d1r3ct_l1br4ry_c0mp4r1s0n}`.

---

### 3.4 Menggunakan `strace` untuk Analisis Level Kernel

Jika biner tidak mengimpor library dinamis atau tidak mencetak output ke stdout:

Bash

```
# Filter tracing hanya pada system calls I/O dasar
strace -e trace=read,write,open,openat ./challenge_bin
```

_Contoh Analisis Output:_

text

```
openat(AT_FDCWD, "flag.txt", O_RDONLY) = 3
read(3, "HTB{syscall_tr4c1ng_r0cks}\n", 128) = 27
close(3)                                = 0
write(1, "Verifikasi selesai!\n", 20)   = 20
```

Flag dibaca langsung dari file lokal ke dalam memori proses menggunakan system call `read`.

---

## 🧩 BAGIAN 4: PATTERN RECOGNITION RE

Mengidentifikasi pola arsitektural umum membantu mempercepat analisis logika program.

### 4.1 Enam Pola Utama Logika CTF

text

```
+-------------------+      +-------------------+      +-------------------+
|     Pola 1:       |      |     Pola 2:       |      |     Pola 3:       |
| Direct Comparison |      | Byte-by-Byte Loop |      | XOR Transformation|
| (strcmp, memcmp)  |      |   (Index match)   |      |  (Enc ^ Key == X) |
+-------------------+      +-------------------+      +-------------------+
          |                          |                          |
          v                          v                          v
Extract via ltrace/GDB     Dump Array & Cocokkan     XOR Balik: Flag = Enc ^ Key

+-------------------+      +-------------------+      +-------------------+
|     Pola 4:       |      |     Pola 5:       |      |     Pola 6:       |
|    Hash Matching  |      | Standard Encoders |      |    Anti-Debug     |
| (MD5, SHA, CRC32) |      | (Base64, ROT13)   |      |  (ptrace check)   |
+-------------------+      +-------------------+      +-------------------+
          |                          |                          |
          v                          v                          v
Crack via Rainbow Table    Identifikasi Alphabet /    Patch Instruksi Binary
   atau Brute-force           CyberChef Decode            atau Bypass di GDB
```

---

#### Pola 1: Direct Memory Comparison

_Karakteristik Pseudocode:_

C

```
if (strcmp(user_input, "CTF{static_string}") == 0) { ... }
```

_Solusi:_ Tangkap langsung melalui `ltrace` atau pasang breakpoint pada pemanggilan fungsi pembanding di GDB (`b *strcmp`), lalu baca register parameter (`x/s $rdi` dan `x/s $rsi`).

---

#### Pola 2: Byte-by-Byte Indexed Comparison

_Karakteristik Pseudocode:_

C

```
int is_valid = 1;
for (int i = 0; i < 24; i++) {
    if (user_input[i] != target_array[i]) {
        is_valid = 0;
        break;
    }
}
```

_Solusi:_ Buka address `target_array` pada panel Listing Ghidra, salin byte heksadesimal berurutan sebanyak 24 byte, lalu konversi nilainya menjadi karakter ASCII.

---

#### Pola 3: XOR Encryption Loop

_Karakteristik Pseudocode:_

C

```
for (int i = 0; i < len; i++) {
    if ((user_input[i] ^ 0x37) != encrypted_data[i]) {
        return 0; // Fail
    }
}
```

_Solusi:_ Karena operasi XOR bersifat simetris (`A ^ B = C` mengimplikasikan `C ^ B = A`), lakukan operasi XOR balik terhadap setiap byte `encrypted_data` menggunakan key `0x37`.

---

#### Pola 4: Hash-Based Check

_Karakteristik Pseudocode:_

C

```
MD5_Init(&ctx);
MD5_Update(&ctx, user_input, strlen(user_input));
MD5_Final(digest, &ctx);
if (memcmp(digest, expected_md5_hash, 16) == 0) { ... }
```

_Solusi:_ Biner tidak menyimpan flag langsung, melainkan representasi digest hash satu arah. Periksa ukuran output:

- 16 byte / 32 hex: Kemungkinan besar MD5.
- 20 byte / 40 hex: Kemungkinan besar SHA1.
- 32 byte / 64 hex: Kemungkinan besar SHA256.  
    Gunakan database reverse lookup seperti _CrackStation_ atau jalankan _Hashcat/John the Ripper_.

---

#### Pola 5: Standard Base-N / Shift Encoding

_Karakteristik Pseudocode:_ Terdapat string konstanta yang memuat tabel karakter/alfabet custom:  
`"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"` (Base64) atau rotasi modulus string `input[i] = (input[i] - 'A' + 13) % 26 + 'A'` (ROT13).  
_Solusi:_ Buka input terenkripsi di tool decoder seperti CyberChef.

---

#### Pola 6: Ptrace Anti-Debugging Trap

_Karakteristik Pseudocode:_

C

```
// Linux hanya mengizinkan 1 proses melakukan tracing pada sebuah PID.
// Jika program dijalankan di bawah GDB, ptrace akan mengembalikan nilai -1.
if (ptrace(PTRACE_TRACEME, 0, 1, 0) < 0) {
    puts("Debugger detected! Terminating...");
    exit(1);
}
```

_Solusi:_ Patch conditional jump atau timpa pemanggilan `ptrace` dengan instruksi `NOP` (`0x90`).

---

### 4.2 Matriks Identifikasi Skema Encoding & Kriptografi

|Ciri Visual / Karakteristik Analisis|Skema / Pola Teridentifikasi|Metode Dekripsi|
|---|---|---|
|String diakhiri tanda padding `=` atau `==`|Base64 Encoding|`echo -n "..." \| base64 -d`|
|Mengandung 16 character alphabet `0123456789abcdef`|Hex String Representation|`xxd -r -p`|
|Operasi `^` tunggal dalam perulangan byte|Single-Byte XOR Cipher|Python list comprehension XOR|
|Operasi bitwise shift berulang: `<< 4 \| >> 4`|Nibble Swapping Transformation|Balik arah shift bit menggunakan bitwise OR|
|Akses array statis ukuran 256 elemen diinisialisasi 0-255|Kriptografi RC4 (KSA State array)|Identifikasi Key, gunakan library Python Cryptodome|
|Array konstanta berisikan nilai `0x67452301`, `0xefcdab89`|Standard Hash Constants (MD5/SHA)|Flag disimpan sebagai verifikasi Hash|
|Output entropy sangat tinggi, tidak ada string terbaca|File ter-pack (UPX, Custom Packer)|Lakukan unpacking sebelum analisis statis|

---

## 💉 BAGIAN 5: BINARY PATCHING

Patching adalah seni memodifikasi opcode biner untuk membelokkan alur eksekusi, misalnya mengubah conditional branch agar selalu bernilai benar tanpa perlu mengetahui password yang valid.

---

### 5.1 Skenario Penggunaan Patching

1. Melewati pemeriksaan proteksi _Anti-Debugging_.
2. Membalikkan percabangan verifikasi otentikasi (mengubah instruksi _Jump if Equal_ `JE` menjadi _Jump if Not Equal_ `JNE`, atau `NOP` out branch failure).
3. Melewati timer delay buatan (`sleep`).

---

### 5.2 Dynamic Patching Menggunakan GDB (Runtime In-Memory Modification)

Metode ini memodifikasi memori program yang sedang berjalan tanpa mengubah file biner fisik di disk.

Bash

```
# 1. Jalankan biner di GDB
gdb -q ./challenge_bin

# 2. Letakkan breakpoint tepat pada instruksi percabangan verifikasi
(gdb) break *0x00401185
(gdb) run <<< "DUMMY_PASSWORD"

# 3. Disassemble 5 instruksi sekitar breakpoint untuk verifikasi posisi
(gdb) x/5i $rip
=> 0x401185:  cmp    eax, 0x0
   0x401188:  je     0x401196      # 0x74 0x0c (Opcode JE)
   0x40118a:  lea    rdi, [rip+0xe73] # String: "Access Denied"
   0x401191:  call   0x401030 <puts@plt>
   0x401196:  lea    rdi, [rip+0xe74] # String: "Access Granted"

# METODE RUNTIME 1: Modifikasi Flag Register CPU (ZF - Zero Flag)
# Instruksi 'je' melompat jika Zero Flag bernilai 1.
# Balikkan nilai ZF:
(gdb) set $eflags ^= (1 << 6)

# METODE RUNTIME 2: Tulis Opcode NOP (0x90) langsung ke memori instruksi JE
# Instruksi 'je 0x401196' membutuhkan 2 byte: \x74 \x0c
(gdb) set *(unsigned char*)0x401188 = 0x90
(gdb) set *(unsigned char*)0x401189 = 0x90

# 4. Lanjutkan eksekusi
(gdb) continue
Access Granted!
```

---

### 5.3 Permanent Binary Patching Menggunakan Python Script

Metode ini mengubah byte biner langsung di disk untuk menghasilkan file executable baru yang telah dipatch.

Python

```
#!/usr/bin/env python3
"""
patcher.py - Melakukan modifikasi permanen instruksi conditional jump pada biner ELF.
"""
import sys

def patch_binary(target_path, output_path, raw_file_offset, original_byte, patch_byte):
    print(f"[*] Membuka biner target: {target_path}")
    with open(target_path, "rb") as f:
        binary_data = bytearray(f.read())

    # Validasi integritas byte sebelum melakukan penimpaan
    current_byte = binary_data[raw_file_offset]
    print(f"[*] Byte saat ini pada offset {hex(raw_file_offset)}: {hex(current_byte)}")
    
    if current_byte != original_byte:
        print(f"[-] ERROR: Offset tidak cocok! Ditemukan {hex(current_byte)}, diekspektasikan {hex(original_byte)}")
        sys.exit(1)

    # Lakukan penimpaan byte
    binary_data[raw_file_offset] = patch_byte
    print(f"[+] Patching {hex(original_byte)} -> {hex(patch_byte)} pada file offset {hex(raw_file_offset)}")

    # Simpan sebagai biner baru
    with open(output_path, "wb") as f:
        f.write(binary_data)
    print(f"[+] File patched berhasil dibuat: {output_path}")

if __name__ == "__main__":
    # Skenario: Mengubah opcode JE (0x74) menjadi JNE (0x75)
    # Catatan: Offset harus RAW FILE OFFSET, bukan Virtual Memory Address!
    TARGET_BIN = "./challenge_bin"
    OUTPUT_BIN = "./challenge_bin_patched"
    FILE_OFFSET = 0x1188      # Alamat offset file mentah
    ORIGINAL_OPCODE = 0x74    # Opcode JE
    PATCHED_OPCODE = 0x75     # Opcode JNE

    patch_binary(TARGET_BIN, OUTPUT_BIN, FILE_OFFSET, ORIGINAL_OPCODE, PATCHED_OPCODE)
```

Beri izin eksekusi pada file hasil modifikasi:

Bash

```
chmod +x ./challenge_bin_patched
./challenge_bin_patched <<< "WRONG_INPUT"
# Program akan mengeksekusi branch sukses karena logika percabangan telah dibalik.
```

---

### 5.4 Cara Mencari Raw File Offset yang Tepat

Virtual Memory Address (VMA) yang ditampilkan oleh disassembler berbeda dengan posisi byte fisik (Raw File Offset) di dalam disk, terutama pada biner berproteksi PIE.

#### Metode 1: Menggunakan Ghidra

1. Klik instruksi yang ingin Anda modifikasi di panel **Listing**.
2. Arahkan kursor mouse ke panel status paling bawah atau lihat field header baris instruksi.
3. Ghidra menampilkan format alamat ganda: `[Address Virtual] : [File Offset]`. (Contoh: `00101188` dan `(RAM: 00101188 File: 0x1188)`). Nilai `File: 0x1188` adalah raw file offset-nya.

#### Metode 2: Menggunakan `objdump` dan Kalkulasi Manual

Bash

```
# Periksa mapping virtual section .text
objdump -h ./challenge_bin | grep .text
```

_Output:_

text

```
 14 .text         000003b2  0000000000001060  0000000000001060  00001060  2**4
```

Jika VMA instruksi adalah `0x1188`, dan VMA awal `.text` adalah `0x1060` dengan file offset `.text` di `0x1060`, maka:  
File Offset=VMA−VMA Section+File Offset SectionFile Offset=VMA−VMA Section+File Offset Section  
File Offset=0x1188−0x1060+0x1060=0x1188File Offset=0x1188−0x1060+0x1060=0x1188

---

## 🏆 BAGIAN 6: FULL CTF WALKTHROUGH RE

Berikut tiga studi kasus komprehensif yang merepresentasikan skenario tantangan CTF nyata dari tingkat dasar hingga menengah.

---

### 6.1 Skenario A — Simple CrackMe

#### 1. Deskripsi Tantangan

Target biner bernama `./easy_crackme`. Program meminta password melalui prompt CLI, lalu memvalidasi input tersebut.

#### 2. Tahap 1: Triage Cepat

Bash

```
file ./easy_crackme
# Output: ELF 64-bit LSB pie executable, x86-64, dynamically linked, not stripped

strings ./easy_crackme | grep -i "pass"
# Output: "Enter the master password: "

# Jalankan ltrace untuk menguji implementasi fungsi pembanding
ltrace ./easy_crackme <<< "dummy_test"
```

_Tangkapan Output ltrace:_

text

```
printf("Enter the master password: ")                   = 28
__isoc99_scanf("%63s", 0x7fffffffe1a0)                   = 1
strcmp("dummy_test", "super_secret_ctf_p@ssw0rd!")       = 1
puts("Incorrect password, try again.")                  = 31
```

#### 3. Tahap 2: Solusi

Fungsi `strcmp` menerima password langsung tanpa enkripsi.  
**Flag/Kunci:** `super_secret_ctf_p@ssw0rd!`

---

### 6.2 Skenario B — XOR Encoded Flag Challenge

#### 1. Deskripsi Tantangan

Biner bernama `./xor_rev`. Hasil `ltrace` tidak memunculkan string target secara langsung.

#### 2. Tahap 1: Analisis Statis Ghidra

Buka biner di Ghidra, temukan fungsi `main`, lalu refactor variabelnya. Diperoleh logika decompiler sebagai berikut:

C

```
undefined8 main(void)
{
  int is_valid;
  size_t len;
  int i;
  char user_input [40];
  
  printf("Masukkan Flag: ");
  __isoc99_scanf("%39s", user_input);
  len = strlen(user_input);
  
  if (len != 20) {
    puts("Panjang flag salah!");
    return 1;
  }
  
  for (i = 0; i < 20; i = i + 1) {
    // Setiap karakter input di-XOR dengan 0x4f
    if ((user_input[i] ^ 0x4f) != (char)CIPHER_ARRAY[i]) {
      puts("Flag salah!");
      return 1;
    }
  }
  
  puts("Selamat! Anda menyelesaikan tantangan!");
  return 0;
}
```

#### 3. Tahap 2: Ekstraksi Cipher Array dari Memori

Klik dua kali pada simbol `CIPHER_ARRAY` di Ghidra. Pada panel Listing, terlihat susunan 20 byte data heksadesimal:

text

```
CIPHER_ARRAY:
00102020    09 0b 19 20 3a 1b 73 30 70 20 70 3f 7b 3b 70 3c 7a 36 30 32
```

#### 4. Tahap 3: Pembuatan Solver Script Python

Karena operasi XOR bersifat reversibel:  
Flag[i]=CIPHER_ARRAY[i]⊕0x4fFlag[i]=CIPHER_ARRAY[i]⊕0x4f

Python

```
#!/usr/bin/env python3
"""
solve_xor.py - Script pemecah otomatis skenario B.
"""

CIPHER_ARRAY = [
    0x09, 0x0b, 0x19, 0x20, 0x3a, 0x1b, 0x73, 0x30, 
    0x70, 0x20, 0x70, 0x3f, 0x7b, 0x3b, 0x70, 0x3c, 
    0x7a, 0x36, 0x30, 0x32
]

XOR_KEY = 0x4f

# Dekonstruksi byte demi byte
recovered_flag_chars = []
for byte in CIPHER_ARRAY:
    original_char = chr(byte ^ XOR_KEY)
    recovered_flag_chars.append(original_char)

flag = "".join(recovered_flag_chars)
print(f"[+] Flag berhasil didekripsi: {flag}")
```

Eksekusi solver:

Bash

```
python3 solve_xor.py
# Output: [+] Flag berhasil didekripsi: FLAG{x0r_1s_r3v3rs1bl3}
```

---

### 6.3 Skenario C — Anti-Debugging via `ptrace` Bypass

#### 1. Deskripsi Tantangan

Target `./protected_vault` langsung crash atau exit ketika dibuka di bawah kendali GDB.

#### 2. Tahap 1: Inspeksi Alur Anti-Debug

Decompiler Ghidra menunjukkan validasi awal sebelum memproses input:

C

```
undefined8 main(void)
{
  long ptrace_status;
  
  // Deteksi debugger
  ptrace_status = ptrace(PTRACE_TRACEME, 0, 1, 0);
  if (ptrace_status < 0) {
    puts("Terdeteksi debugger! Program dihentikan.");
    exit(1);
  }
  
  puts("Debugger check passed. Membuka brankas...");
  decrypt_vault_and_print_flag();
  return 0;
}
```

Disassembly instruksi percabangan tersebut pada Listing:

text

```
00401140: CALL sym.imp.ptrace
00401145: TEST RAX, RAX
00401148: JS   0x00401160      ; Jump if Sign (RAX < 0 / Negatif) -> Menuju exit(1)
0040114a: LEA  RDI, [0x402008] ; Menuju flow sukses
```

#### 3. Tahap 2: Solusi Menggunakan GDB Catchpoint & Register Manipulation

Kita dapat membypass proteksi ini secara dinamis tanpa mengubah file di disk:

Bash

```
gdb -q ./protected_vault
```

text

```
# 1. Pasang interceptor tepat pada system call ptrace
(gdb) catch syscall ptrace
Catchpoint 1 (syscall 'ptrace' [101])

# Catatan: Angka [101] adalah nomor syscall ptrace pada Linux x86-64.
# Pada biner 32-bit (i386), gunakan: (gdb) catch syscall 26
# Verifikasi nomor syscall: grep -r ptrace /usr/include/asm/unistd_64.h

# 2. Jalankan program
(gdb) run
Starting program: ./protected_vault
Catchpoint 1 (call to syscall ptrace), 0x00007ffff7ed3b87 in ptrace () from /lib/x86_64-linux-gnu/libc.so.6

# 3. Lanjutkan eksekusi hingga syscall ptrace selesai (finish)
(gdb) finish
Run till exit from #0  0x00007ffff7ed3b87 in ptrace () from /lib/x86_64-linux-gnu/libc.so.6
Value returned is $1 = -1

# 4. Nilai return value ptrace berada di register RAX.
# Karena program mendeteksi debugger, RAX bernilai -1 (0xffffffffffffffff).
# Paksa register RAX menjadi 0 (status sukses):
(gdb) set $rax = 0

# 5. Lanjutkan eksekusi normal
(gdb) continue
Continuing.
Debugger check passed. Membuka brankas...
FLAG: FLAG{ptr4c3_4nt1_d3bug_byp4ss3d}
[Inferior 1 (process 31420) exited normally]
```

---

## ⚠️ BAGIAN 7: COMMON ERRORS & TROUBLESHOOTING

|No|Kondisi Error / Anomali|Indikasi Penyebab Utama|Solusi Tindakan Penyelesaian|
|---|---|---|---|
|1|Ghidra: `Unable to open/import file`|Permission biner atau file terkorupsi saat diunduh|Periksa integrity biner dengan `file ./bin`. Berikan `chmod +r ./bin`.|
|2|Auto-Analysis Ghidra berhenti / _hang_|File biner sangat masif atau alokasi RAM JVM kurang|Buka `ghidraRun`, naikkan alokasi heap JVM di `ghidraRun.sh` (`MAXMEM=4G`).|
|3|Biner _stripped_: Tidak ada nama fungsi|Simbol dihapus compiler via opsi `-s`|Lacak entry point `_start` -> temukan argumen ke-1 `__libc_start_main`.|
|4|Decompiler menghasilkan kode _garbled_|Ghidra salah menebak tipe data atau fungsi|Klik kanan pada pointer -> _Retype Variable_, gunakan signature fungsi C standar.|
|5|GDB: `Cannot find bounds of current function`|Simbol tabel hilang (Biner stripped)|Gunakan breakpoint berbasis alamat virtual memory langsung: `break *0x401120`.|
|6|`ltrace` tidak memunculkan output library|Biner dikompilasi secara statis (_statically linked_)|`ltrace` hanya mencegat PLT dinamis. Beralihlah ke Static Analysis Ghidra atau `strace`.|
|7|`strace`: `Operation not permitted`|Larangan kernel ptrace (Yama LSM hardening)|Jalankan: `sudo sysctl -w kernel.yama.ptrace_scope=0` pada terminal Parrot OS Anda.|
|8|Biner crash seketika saat di-attach GDB|Mekanisme anti-debug aktif (`ptrace`, timing checks)|Pasang breakpoint sebelum check (`catch syscall ptrace`) lalu paksa return register RAX = 0.|
|9|File biner patched menghasilkan `Segmentation Fault`|Merusak struktur alignment opcode / offset geser|Pastikan panjang pengganti persis sama dengan ukuran instruksi asli (gunakan `0x90` NOP padding).|
|10|Python XOR Solver menghasilkan karakter non-ASCII|Penggunaan Single-byte Key yang keliru|Pastikan endianness byte benar dan kunci XOR tidak bergeser (coba multi-byte keys).|
|11|`strcmp` tidak muncul sama sekali di tracer|Program memakai algoritma pengecekan kustom per-karakter|Buka decompiler Ghidra, lacak loop verifikasi array karakter secara statis.|
|12|Ketidakcocokan instruksi 32-bit vs 64-bit|Menggunakan debugger dengan arsitektur yang salah|Pastikan GDB mendukung multi-arch atau biner dijalankan dengan dependensi `libc6-i386`.|
|13|Alamat memori di Ghidra berubah saat di GDB|Proteksi PIE (_Position Independent Executable_) aktif|Alamat di Ghidra berbasis base 0x100000. Di GDB, temukan base address via `vmmap`, lalu tambahkan offset.|
|14|Biner ter-strip dan terkompresi sekaligus|Double protection (Packer + Stripped)|Analisis signature dengan `strings`. Jika UPX, gunakan `upx -d ./bin` sebelum analisis.|
|15|GDB stuck/timeout saat menunggu input|Biner membaca buffer stream stdin yang belum di-flush|Berikan input piping langsung saat run: `run <<< $(python3 -c 'print("A"*20)')`.|

---

## 🌳 BAGIAN 8: DECISION TREE RE

```text
                  [ BINARY RE CHALLENGE DITERIMA ]
                                 │
                                 ▼
                 [ EKSEKUSI TRIAGE CEPAT (5 MENIT) ]
               file, strings, ltrace, strace, checksec
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
       { String / Flag Plain }         { Flag Tidak Ditemukan }
                 │                               │
                 ▼                               ▼
          [ CTF SELESAI ]             [ UJI COBA ltrace / strace ]
                                                 │
                                 ┌───────────────┴───────────────┐
                                 │                               │
                       { ltrace Membocorkan }        { Output ltrace Bisu / }
                       { Argumen Pembanding }        { Statically Linked /  }
                                 │                   { Ter-Pack (Packer)    }
                                 ▼                               │
                          [ CTF SELESAI ]                        ▼
                                                     [ APABILA TER-PACK? ]
                                                     die-cli / upx -d
                                                                 │
                                                                 ▼
                                                        [ BUKA DI GHIDRA ]
                                                                 │
                                                 ┌───────────────┴───────────────┐
                                                 │                               │
                                       { Biner Not Stripped }          { Biner Stripped }
                                                 │                               │
                                                 ▼                               ▼
                                        Navigasi ke main()             Cari entry (_start) ->
                                                 │                     __libc_start_main arg1
                                                 │                               │
                                                 └───────────────┬───────────────┘
                                                                 │
                                                                 ▼
                                                    [ BACA DECOMPILER WINDOW ]
                                                  Refactor Tipe & Nama Variabel
                                                                 │
                                 ┌───────────────────────────────┼───────────────────────────────┐
                                 │                               │                               │
                                 ▼                               ▼                               ▼
                       [ Pola Logika XOR ]             [ Pola Anti-Debugging ]         [ Custom / Complex VM ]
                                 │                               │                               │
                                 ▼                               ▼                               ▼
                        Ekstraksi Array Byte           catch syscall ptrace            Break & Trace Register
                        Buat Python Solver             Patch Opcode (JE->JNE)          Dump Memori State
                                 │                               │                               │
                                 ▼                               ▼                               ▼
                          [ FLAG VALID ]                  [ ALUR TERBUKA ]                [ ANALISIS TRACE ]
```

---

## 📑 BAGIAN 9: CHEATSHEET RE

### 9.1 Perintah CLI Esensial

Bash

```
# === TRIAGE AWAL ===
file ./binary                                         # Identifikasi arsitektur ELF & status stripping
strings -n 8 ./binary | grep -Ei "flag|key|pass"      # Cari readable strings
checksec ./binary                                     # Periksa mitigasi NX, PIE, Canary, RELRO (atau: checksec --file ./binary)
ltrace -e strcmp,strncmp,memcmp ./binary <<< "INPUT"  # Intersepsi komparasi library standar
strace -e trace=open,openat,read,write ./binary       # Intersepsi interaksi level kernel

# === GDB COMMAND RUNTIME ===
gdb -q ./binary
(gdb) break *main                                     # Break di main
(gdb) break *0x401150                                 # Break di alamat instruksi spesifik
(gdb) run <<< $(python3 -c 'print("A"*32)')           # Jalankan dengan payload spesifik
(gdb) x/s $rdi                                        # Cetak pointer string di RDI (Argumen 1 pada x86_64)
(gdb) x/s $rsi                                        # Cetak pointer string di RSI (Argumen 2 pada x86_64)
(gdb) x/32xb $rsp                                     # Dump 32 byte memori stack dalam format hex
(gdb) set $rax = 0                                    # Ubah nilai register secara dinamis
(gdb) set {char}0x401122 = 0x90                       # Tulis opcode NOP (0x90) ke alamat tertentu
```

---

### 9.2 Template Python Solvers

#### 1. Single-Byte XOR Solver

Python

```
#!/usr/bin/env python3
# Template solver untuk tantangan XOR sederhana
CIPHERTEXT_BYTES = bytes([0x23, 0x3a, 0x3b, 0x24, 0x18, 0x61, 0x7a])
KEY = 0x5b

plaintext = bytes([b ^ KEY for b in CIPHERTEXT_BYTES])
print(f"Decoded: {plaintext.decode(errors='ignore')}")
```

#### 2. Multi-Byte Repeating Key XOR Solver

Python

```
#!/usr/bin/env python3
# Template solver untuk XOR dengan key berulang (misal: "SECRET")
CIPHERTEXT = bytes.fromhex("1a0b3c4d2e1f")
KEY = b"SECRET"

decrypted = bytearray()
for i in range(len(CIPHERTEXT)):
    decrypted.append(CIPHERTEXT[i] ^ KEY[i % len(KEY)])

print(f"Decoded Repeating XOR: {decrypted.decode(errors='ignore')}")
```

#### 3. ROT13 & Caesar Cipher Universal Solver

Python

```
#!/usr/bin/env python3
import codecs

encoded_str = "synt{ebg13_vf_abg_frpher}"
# Native decode ROT13
decoded_rot13 = codecs.decode(encoded_str, 'rot_13')
print(f"ROT13: {decoded_rot13}")

# Brute-force seluruh kemungkinan rotasi (Caesar Cipher 1 - 25)
def caesar_bruteforce(ciphertext):
    for shift in range(1, 26):
        res = []
        for c in ciphertext:
            if c.isalpha():
                base = ord('A') if c.isupper() else ord('a')
                res.append(chr((ord(c) - base - shift) % 26 + base))
            else:
                res.append(c)
        print(f"Shift {shift:02d}: {''.join(res)}")

caesar_bruteforce("encrypted_string_here")
```

#### 4. Base64 Decoder dengan Custom Alphabet

Python

```
#!/usr/bin/env python3
import base64

# Gunakan ini jika biner memakai tabel Base64 yang diacak
STANDARD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
CUSTOM_ALPHABET   = "ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba9876543210+/"

encoded_data = "Vm0wd2Qy..."

# Terjemahkan custom alphabet kembali ke standard alphabet sebelum mendecode
translation_table = str.maketrans(CUSTOM_ALPHABET, STANDARD_ALPHABET)
normalized_data = encoded_data.translate(translation_table)

result = base64.b64decode(normalized_data)
print(f"Decoded Custom Base64: {result.decode(errors='ignore')}")
```

---

## 📜 BAGIAN 10: GOLDEN RULES OF REVERSE ENGINEERING

1. **Jalankan `ltrace` Sebelum Membuka Ghidra:** Menghemat waktu. Banyak pembuat soal CTF pemula langsung menggunakan `strcmp`/`memcmp` tanpa proteksi, yang langsung terbaca lewat tracing pustaka dinamis.
2. **Refactor Identitas Sebelum Membaca Logika:** Jangan pernah membaca pseudocode dengan nama variabel bawaan (`local_18`, `FUN_...`). Segera ganti nama variabel dan tipe datanya begitu tujuannya dipahami.
3. **Dynamic Analysis Kerap Lebih Efektif dari Static Analysis:** Jika fungsi verifikasi memiliki logika algoritma yang rumit, cukup pasang breakpoint di akhir fungsi pada GDB dan periksa argumen pembandingnya di memori atau register.
4. **Eliminasi Kode Redundan:** Biner sering kali memuat fungsi boilerplate dari runtime compiler (seperti registrasi exception handler, frame unwind, stack canary check). Fokuskan waktu analisis hanya pada blok kode yang memproses input user.
5. **Cari Titik Kritis Terlebih Dahulu:** Mulai analisis dari titik percabangan sukses (_Success Point_), lalu telusuri alur eksekusinya ke belakang (_Backward Slicing_) untuk menemukan syarat input yang dibutuhkan.
6. **Biner Ter-strip Bukan Berarti Tidak Bisa Dianalisis:** Identifikasi entry point biner melalui `_start`, lalu ambil parameter fungsi pertama yang dipanggil oleh `__libc_start_main`. Itu adalah fungsi `main()` Anda.
7. **Netralkan Anti-Debugging di Awal:** Jangan buang waktu menganalisis biner yang tertutup proteksi anti-debug. Identifikasi pemanggilan `ptrace` atau deteksi file status, lalu patch instruksi conditional jump-nya secara permanen atau manipulasi via GDB.
8. **Validasi Setiap Hipotesis Menggunakan Sampel Kecil:** Buat input tiruan dengan panjang tertentu untuk melihat perubahan pada transformasi memori, pastikan model hipotesis Anda valid sebelum membuat script solver.
9. **Manfaatkan CyberChef untuk Verifikasi Pola:** Jangan langsung menulis script Python untuk hal-hal sederhana. Gunakan CyberChef untuk menguji tebakan skema encoding (Base64, Hex, XOR, Bit Shift) secara instan.
10. **Kombinasikan Tiga Pilar Alat Analisis:** Disassembler statis (Ghidra) untuk memahami peta logika keseluruhan, Tracer (ltrace/strace) untuk gambaran cepat pemanggilan eksternal, dan Debugger dinamis (GDB) untuk inspeksi status runtime secara langsung.

---

## 🔄 BAGIAN 11: CROSS-WORKFLOW & RELASI MODUL

Reverse engineering adalah fondasi yang menghubungkan seluruh materi eksploitasi biner:

text

```
[ FILE 48: BINARY ANALYSIS ]
(Mengetahui tipe biner, proteksi mitigasi NX, PIE, Canary, RELRO)
             |
             v
[ FILE 51: REVERSE ENGINEERING WORKFLOW ] <--- (ANDA BERADA DI SINI)
(Membongkar algoritma internal biner, mapping logic kontrol, dan patching instruksi)
             |
             +---------------------------------------+
             |                                       |
             v                                       v
[ FILE 49: BUFFER OVERFLOW ]            [ FILE 50: ROP CHAIN EXPLOITATION ]
- Mencari letak vulnerable function     - Menemukan stack pivoting gadget
  (gets, strcpy, read) via Ghidra         di dalam biner ter-strip
- Menghitung offset buffer pada stack    - Memetakan PLT/GOT table target libc
  frame decompiler secara akurat          lewat penelusuran cross-reference
             |                                       |
             +-------------------+-------------------+
                                 |
                                 v
                 [ FILE 52: CTF BINARY PATTERNS ]
                 (Pola integrasi tingkat lanjut: Reverse Engineering
                  terlebih dahulu untuk menemukan logic flaw,
                  dilanjutkan dengan weaponisasi payload eksploitasi)
```

---

# [🧭 BAGIAN 0: FONDASI REVERSE ENGINEERING](/docs/reverse-engineering)

## Reverse Engineering Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali ada instruksi eksplisit.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET_BIN="./challenge_bin"     # Path ke binary target
export LHOST="10.10.14.5"               # IP kamu (untuk CTF remote)
export LPORT="4444"
mkdir -p ~/re_loot/{strings,dumps,solvers,patched,notes}
cd ~/re_loot

echo "[*] Target Binary: $TARGET_BIN"
echo "[*] Working Dir: $(pwd)"

# Copy binary ke working dir agar tidak merusak original
cp $TARGET_BIN ~/re_loot/target_bin.orig
cp $TARGET_BIN ~/re_loot/target_bin
export TARGET_BIN="~/re_loot/target_bin"
```

**Output yang diharapkan:**

text

```
[*] Target Binary: ./challenge_bin
[*] Working Dir: /root/re_loot
```

---

## ═══════════════════════════════════════

## FASE 0: TRIAGE CEPAT (5 MENIT PERTAMA)

## ═══════════════════════════════════════

> **Tujuan:** Sebelum buka Ghidra atau GDB, jalankan semua recon CLI dulu. Sering kali flag langsung ketemu di fase ini. Jangan skip.

### Langkah 0.1 — Identifikasi Binary dengan `file`

Bash

```
# Command 1: Identifikasi format, arsitektur, dan status stripping
file $TARGET_BIN

# Command 2: Cek semua binary di folder (jika multiple files)
file *
```

**OUTPUT BERHASIL ✅ — ELF 64-bit dinamis, not stripped:**

text

```
./challenge_bin: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), 
dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, 
BuildID[sha1]=9d94380db397e5ea77cf16ea913bd73f78a2e584, for GNU/Linux 3.2.0, not stripped
```

**Cara baca output — CATAT SEMUA:**

|Field|Nilai Contoh|Arti & Tindakan|
|---|---|---|
|`ELF 64-bit`|64-bit|Arsitektur x86-64 standard|
|`LSB`|Little-endian|Byte order untuk decode manual|
|`pie executable`|PIE aktif|**Alamat berubah tiap run!** Harus kalkulasi offset di GDB|
|`dynamically linked`|Dynamic|`ltrace` bisa digunakan|
|`not stripped`|Simbol ada|Nama fungsi (`main`, `check_flag`) tersedia di Ghidra|
|`stripped`|Simbol dihapus|Harus cari `main` manual via `_start` → `__libc_start_main`|

**OUTPUT BERHASIL ✅ — ELF 32-bit:**

text

```
./challenge_bin: ELF 32-bit LSB executable, Intel 80386, version 1 (SYSV),
dynamically linked, interpreter /lib/ld-linux.so.2, not stripped
```

➡️ Binary 32-bit. Konvensi argumen berbeda (via stack, bukan register). Catat ini untuk GDB nanti.

**OUTPUT BERHASIL ✅ — Statically linked:**

text

```
./challenge_bin: ELF 64-bit LSB executable, x86-64, statically linked, stripped
```

➡️ **PENTING:** `ltrace` tidak akan bekerja! Langsung ke Fase 2 (Ghidra) setelah strings check.

**OUTPUT BERHASIL ✅ — Windows PE (dalam CTF Linux):**

text

```
./challenge.exe: PE32+ executable (console) x86-64, for MS Windows
```

➡️ Binary Windows. Gunakan `wine ./challenge.exe` untuk run, atau Ghidra tetap bisa analisis PE.

**OUTPUT BERBEDA ❌ — Bukan ELF:**

text

```
./challenge: Python script, ASCII text executable
./challenge: Zip archive data
./challenge: data
```

Tindakan per kasus:

Bash

```
# Python script
cat ./challenge          # Baca langsung source code-nya

# Zip archive (mungkin ada hidden file)
unzip -l ./challenge
unzip ./challenge -d extracted/

# "data" = binary unknown format
xxd ./challenge | head -20    # Lihat magic bytes
hexdump -C ./challenge | head -5
```

**OUTPUT GAGAL ❌ — Permission denied:**

text

```
file: ./challenge_bin: Permission denied
```

Bash

```
chmod +x ./challenge_bin
chmod +r ./challenge_bin
```

---

### Langkah 0.2 — Cek Security Mitigasi dengan `checksec`

Bash

```
# Command 1: checksec standar
checksec $TARGET_BIN

# Command 2: Format alternatif
checksec --file=$TARGET_BIN

# Command 3: Jika checksec tidak ada
python3 -c "
import subprocess
r = subprocess.run(['readelf', '-l', '$TARGET_BIN'], capture_output=True, text=True)
print(r.stdout)
"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] '/root/re_loot/target_bin'
    Arch:     amd64-64-little
    RELRO:    Partial RELRO
    Stack:    Canary found
    NX:       NX enabled
    PIE:      PIE enabled
```

**Cara baca checksec — Implikasi ke Strategi:**

|Proteksi|Status|Implikasi RE|
|---|---|---|
|`PIE: PIE enabled`|Aktif|Offset Ghidra ≠ GDB runtime address. Harus kalkulasi base address|
|`PIE: No PIE`|Nonaktif|Alamat Ghidra = GDB. Langsung pakai|
|`Stack: Canary found`|Aktif|Buffer overflow susah, tapi RE logic masih bisa bypass|
|`Stack: No canary`|Nonaktif|BOF lebih mudah jika nanti dibutuhkan|
|`NX: NX enabled`|Aktif|Shellcode di stack tidak bisa dieksekusi|
|`RELRO: Full RELRO`|Aktif|GOT read-only, susah untuk GOT overwrite|

➡️ **Catat hasil checksec ke notes:**

Bash

```
checksec $TARGET_BIN > ~/re_loot/notes/checksec.txt
```

---

### Langkah 0.3 — Ekstraksi Strings (Cek Flag Tersembunyi)

Bash

```
# Command 1: Default strings (min length 4)
strings $TARGET_BIN

# Command 2: Lebih aggressive, min 8 karakter
strings -n 8 $TARGET_BIN

# Command 3: Filter keyword kritis — ini yang paling penting dulu
strings $TARGET_BIN | grep -Ei "flag|pass|secret|wrong|correct|congrat|invalid|key|ctf\{|htb\{|thm\{|picoctf\{"

# Command 4: Cari format flag yang umum
strings $TARGET_BIN | grep -E "\{[^}]+\}"

# Command 5: Cari semua string ke file untuk analisis lambat
strings -n 6 $TARGET_BIN > ~/re_loot/strings/all_strings.txt
wc -l ~/re_loot/strings/all_strings.txt
```

**OUTPUT BERHASIL ✅ — Flag langsung ketemu (Trivial):**

text

```
Enter the vault password: 
Authentication Failed!
Correct password! The flag is: FLAG{s1mpl3_str1ngs_ch3ck}
```

➡️ **SELESAI!** Submit flag `FLAG{s1mpl3_str1ngs_ch3ck}`. Tidak perlu lanjut.

**OUTPUT BERHASIL ✅ — Ada string mencurigakan tapi bukan flag:**

text

```
Enter the secret key: 
Access Denied!
Access Granted!
s3cr3t_k3y_h3r3
/etc/passwd
```

➡️ String `s3cr3t_k3y_h3r3` adalah kandidat password. Simpan:

Bash

```
echo "Candidate password: s3cr3t_k3y_h3r3" >> ~/re_loot/notes/candidates.txt
# Coba langsung
echo "s3cr3t_k3y_h3r3" | ./target_bin
```

**OUTPUT BERHASIL ✅ — Ada Base64:**

text

```
dGhpcyBpcyBhIHNlY3JldA==
VGhpcyBpcyBub3QgdGhlIGZsYWc=
```

Bash

```
# Decode semua string base64 yang ditemukan
strings $TARGET_BIN | grep -E "^[A-Za-z0-9+/]{8,}={0,2}$" | while read line; do
    decoded=$(echo "$line" | base64 -d 2>/dev/null)
    [ -n "$decoded" ] && echo "B64: $line => $decoded"
done
```

**OUTPUT GAGAL ❌ — Strings sangat sedikit / tidak ada yang readable:**

text

```
UPX0
UPX1
$Info: This file is packed with the UPX executable packer
```

➡️ **Binary ter-pack!** Langsung ke **Langkah 0.5 (Unpack)**.

**OUTPUT GAGAL ❌ — Output sangat banyak tapi tidak ada flag:**

text

```
[ribuan baris library functions, path, dll]
```

➡️ Normal untuk binary kompleks. Lanjut ke Langkah 0.4 `ltrace`.

---

### Langkah 0.4 — Dynamic Library Tracing dengan `ltrace`

> **KAPAN SKIP:** Binary statically linked (dari Langkah 0.1). Jika dynamic, wajib coba ini dulu.

Bash

```
# Command 1: Basic ltrace interaktif
ltrace $TARGET_BIN

# Command 2: Inject input langsung (paling efisien)
ltrace $TARGET_BIN <<< "TEST_INPUT_STRING"

# Command 3: Filter hanya fungsi perbandingan string (paling relevan)
ltrace -e strcmp,strncmp,memcmp,strcasecmp $TARGET_BIN <<< "test_password"

# Command 4: Filter lebih luas
ltrace -e strcmp,strncmp,memcmp,strlen,malloc,fgets,scanf,printf $TARGET_BIN <<< "AAAAAAAAAAAA"

# Command 5: Simpan output ke file (stderr capture)
ltrace $TARGET_BIN <<< "test" 2>&1 | tee ~/re_loot/notes/ltrace_output.txt
```

**OUTPUT BERHASIL ✅ — strcmp membocorkan password:**

text

```
__libc_start_main(0x555555555169, 1, 0x7fffffffe308 <unfinished ...>
printf("Enter password: ") = 16
fgets("TEST_INPUT_STRING\n", 64, 0x7ffff7fa8aa0) = 0x7fffffffe1f0
strcmp("TEST_INPUT_STRING\n", "s3cr3t_P@ssw0rd_2024!\n") = 1
puts("Authentication Failed!") = 23
+++ exited with status 0 +++
```

**Cara baca output ltrace:**

- `strcmp(arg1, arg2)` → arg1 = input kita, arg2 = **PASSWORD YANG BENAR**
- Nilai return: `0` = sama (berhasil), non-zero = berbeda (gagal)
- **Password target:** `s3cr3t_P@ssw0rd_2024!` (tanpa `\n`)

Bash

```
# Verifikasi langsung
echo "s3cr3t_P@ssw0rd_2024!" | $TARGET_BIN
# atau
echo -n "s3cr3t_P@ssw0rd_2024!" | $TARGET_BIN
```

**OUTPUT BERHASIL ✅ — strncmp dengan panjang tertentu:**

text

```
strncmp("TEST_INPUT\n", "picoCTF{d1r3ct_l1br4ry_c0mp4r1s0n}", 32) = -1
```

➡️ Password: `picoCTF{d1r3ct_l1br4ry_c0mp4r1s0n}` (ambil hingga 32 karakter).

**OUTPUT BERHASIL ✅ — memcmp (byte-by-byte):**

text

```
memcmp(0x7fffffffe1a0, 0x555555558020, 16) = -1
```

➡️ `memcmp` tidak menampilkan string langsung. Perlu GDB untuk dump address `0x555555558020`. Lanjut ke **Fase 3 (GDB)**.

**OUTPUT BERBEDA ❌ — ltrace kosong / tidak ada output:**

text

```
+++ exited with status 1 +++
```

Kemungkinan:

1. Binary statically linked → Skip ltrace, langsung ke Ghidra
2. Binary punya anti-debug yang detect ltrace
3. Binary langsung exit tanpa perlu input

Bash

```
# Cek apakah statically linked
file $TARGET_BIN | grep -o "statically linked\|dynamically linked"

# Cek menggunakan strace
strace $TARGET_BIN <<< "test" 2>&1 | head -20
```

**OUTPUT BERBEDA ❌ — ltrace crash / SIGSEGV:**

text

```
Program received signal SIGSEGV
```

➡️ Binary punya anti-debug atau buffer issue. Lanjut ke Fase 2 (Ghidra static analysis).

---

### Langkah 0.5 — Deteksi dan Unpack Packer

Bash

```
# Command 1: Cek string UPX
strings $TARGET_BIN | grep -i "upx\|packed\|packer"

# Command 2: Test UPX header integrity
upx -t $TARGET_BIN

# Command 3: Deteksi packer lain dengan DIE (Detect-It-Easy)
# Install jika belum ada:
sudo apt install detect-it-easy -y
die $TARGET_BIN        # GUI
die-cli $TARGET_BIN    # CLI

# Command 4: Entropy check (packed binary punya entropy tinggi)
python3 -c "
import math, collections
data = open('$TARGET_BIN', 'rb').read()
freq = collections.Counter(data)
entropy = -sum((f/len(data)) * math.log2(f/len(data)) for f in freq.values())
print(f'Entropy: {entropy:.2f} / 8.0')
print('HIGH ENTROPY (packed/encrypted): ' + ('YES' if entropy > 7.0 else 'NO'))
"
```

**OUTPUT BERHASIL ✅ — UPX terdeteksi:**

text

```
upx -t ./challenge_bin
                       Ultimate Packer for eXecutables
                          Copyright (C) 1996 - 2024
UPX 4.2.1: ./challenge_bin [OK]
```

Bash

```
# Unpack UPX
cp $TARGET_BIN ${TARGET_BIN}.upx_original    # Backup!
upx -d $TARGET_BIN -o ~/re_loot/target_bin_unpacked

# Verifikasi hasil unpack
file ~/re_loot/target_bin_unpacked
strings ~/re_loot/target_bin_unpacked | head -20

# Update TARGET_BIN ke yang sudah di-unpack
export TARGET_BIN="~/re_loot/target_bin_unpacked"
```

**OUTPUT BERHASIL ✅ — Berhasil unpack:**

text

```
                       Ultimate Packer for eXecutables
unpacked 1 file
```

➡️ Lanjut ke Langkah 0.3 (strings) lagi dengan binary yang sudah di-unpack.

**OUTPUT GAGAL ❌ — upx -d gagal (header corrupted / custom packer):**

text

```
upx: target_bin: UnpackingException: header corrupted
```

➡️ Custom packer. Harus unpack dinamis via GDB memory dump:

Bash

```
# Buka di GDB, biarkan unpacking stub berjalan, dump memori setelah decryption
gdb -q $TARGET_BIN
(gdb) starti    # Stop di instruksi paling awal
(gdb) continue  # Biarkan jalan dulu, OEP (Original Entry Point) akan tercapai
# Saat program pause/crash/stop:
(gdb) vmmap     # Lihat range memori yang executable
# Dump segment executable:
(gdb) dump binary memory ~/re_loot/dumps/unpacked_dump.bin 0x400000 0x500000
```

Bash

```
# Load dump ke Ghidra sebagai raw binary untuk analisis
# Di Ghidra: Import File → Format: Raw Binary → Architecture: x86-64
```

---

### Langkah 0.6 — Strace untuk System Call Analysis

Bash

```
# Command 1: Trace semua syscall
strace $TARGET_BIN <<< "test"

# Command 2: Filter I/O dan file access saja
strace -e trace=read,write,openat,access,stat $TARGET_BIN <<< "test"

# Command 3: Simpan ke file
strace $TARGET_BIN <<< "test" 2>&1 | tee ~/re_loot/notes/strace_output.txt
```

**OUTPUT BERHASIL ✅ — Program baca dari file:**

text

```
openat(AT_FDCWD, "flag.txt", O_RDONLY) = 3
read(3, "CTF{syscall_tr4c1ng_r0cks}\n", 128) = 27
write(1, "Verifikasi selesai!\n", 20) = 20
```

➡️ **FLAG ketemu di syscall read!** `CTF{syscall_tr4c1ng_r0cks}`

**OUTPUT BERHASIL ✅ — Program cari file yang tidak ada:**

text

```
openat(AT_FDCWD, "/etc/target_secret.key", O_RDONLY) = -1 ENOENT (No such file or directory)
write(1, "Error: Keyfile missing!\n", 24) = 24
```

➡️ Buat file placeholder dan jalankan lagi:

Bash

```
echo "dummy_key_content" | sudo tee /etc/target_secret.key
$TARGET_BIN
```

**OUTPUT BERHASIL ✅ — Anti-debug via ptrace detected:**

text

```
ptrace(PTRACE_TRACEME)          = -1 EPERM (Operation not permitted)
write(1, "Debugger detected!\n", 19) = 19
exit_group(1)                   = ?
```

➡️ Binary punya anti-debug. Catat ini, nanti bypass di GDB. Lanjut ke Fase 2 untuk analisis static dulu.

---

### Langkah 0.7 — Cek Symbol Table dengan `nm`

Bash

```
# Command 1: Simbol standar (untuk not stripped binary)
nm $TARGET_BIN 2>/dev/null | head -30

# Command 2: Simbol dinamis (ada meski binary stripped)
nm -D $TARGET_BIN 2>/dev/null

# Command 3: Filter fungsi yang interessant
nm $TARGET_BIN 2>/dev/null | grep -Ei "check|flag|pass|decrypt|encode|validate|main"

# Command 4: Sort by address
nm -n $TARGET_BIN 2>/dev/null | grep " T " | head -20
```

**OUTPUT BERHASIL ✅ — Fungsi kritis ditemukan:**

text

```
0000000000001149 T check_password
00000000000011a8 T decrypt_flag
0000000000001129 T main
0000000000001200 T validate_serial
                 U strcmp@@GLIBC_2.2.5
                 U printf@@GLIBC_2.2.5
```

**Cara baca:**

- `T` = fungsi di .text section (kode program)
- `U` = undefined (imported dari library)
- Catat alamat semua fungsi kritis:

Bash

```
nm $TARGET_BIN 2>/dev/null | grep " T " > ~/re_loot/notes/functions.txt
cat ~/re_loot/notes/functions.txt
```

➡️ Langsung ke fungsi `check_password` dan `decrypt_flag` di Ghidra.

**OUTPUT GAGAL ❌ — nm kosong (stripped):**

text

```
nm: target_bin: no symbols
```

➡️ Normal untuk stripped binary. Harus cari `main` manual di Ghidra via `_start` → `__libc_start_main`.

---

### Langkah 0.8 — Decision Point Setelah Triage

Berdasarkan hasil Langkah 0.1 - 0.7, pilih jalur:

text

```
HASIL TRIAGE
│
├─ [Flag ketemu di strings/ltrace/strace] → SELESAI, submit flag
│
├─ [strcmp/strncmp bocorkan password di ltrace] → Coba password, jika flag muncul SELESAI
│
├─ [memcmp di ltrace, address tidak terbaca] → FASE 3 (GDB) untuk dump memory
│
├─ [Binary statically linked / ltrace bisu] → FASE 2 (Ghidra static analysis)
│
├─ [Binary ter-pack dan sudah di-unpack] → Kembali ke Langkah 0.3 dengan binary baru
│
├─ [Anti-debug ptrace terdeteksi] → FASE 2 (identifikasi) + FASE 3 (bypass)
│
└─ [Tidak ada hint sama sekali] → FASE 2 (Ghidra full analysis)
```

---

## ═══════════════════════════════════════

## FASE 1: STATIC ANALYSIS — GHIDRA MASTER WORKFLOW

## ═══════════════════════════════════════

> **Tujuan:** Bongkar logika internal binary tanpa menjalankannya. Pahami algoritma, temukan kondisi sukses, ekstrak data tersembunyi.

### Langkah 1.1 — Import Binary ke Ghidra

Bash

```
# Pastikan Ghidra terinstall
ghidra --version 2>/dev/null || echo "Ghidra not found, install first"

# Install jika belum ada
mkdir -p ~/tools && cd ~/tools
wget https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_11.0.3_build/ghidra_11.0.3_PUBLIC_20240410.zip
unzip ghidra_11.0.3_PUBLIC_20240410.zip
sudo ln -sf ~/tools/ghidra_11.0.3_PUBLIC/ghidraRun /usr/local/bin/ghidra

# Jalankan Ghidra
ghidra &
```

**Prosedur Import di GUI Ghidra:**

1. **Buat Project Baru:**
    
    - `File` → `New Project` → `Non-Shared Project` → Next
    - Directory: `/root/re_loot/ghidra_projects/`
    - Name: nama_challenge (contoh: `PicoCTF_Rev1`)
    - Finish
2. **Import Binary:**
    
    - Tekan `I` atau `File` → `Import File`
    - Pilih `$TARGET_BIN`
    - Konfirmasi format: `ELF` / `PE` / `Raw Binary`
    - Klik `OK`
3. **Buka di CodeBrowser:**
    
    - Double-click file di project tree
    - Klik **Yes** saat diminta analisis
    - Di Analysis Options: biarkan default, centang `Decompiler Parameter ID`
    - Klik **Analyze**
    - **Tunggu hingga progress bar di kanan bawah selesai**

**OUTPUT BERHASIL ✅ — Ghidra berhasil analisis:**

text

```
Analysis complete.
[Status bar kanan bawah: tidak ada spinner aktif]
```

➡️ Lanjut ke Langkah 1.2.

**OUTPUT GAGAL ❌ — Ghidra hang / crash:**

text

```
Java heap space error / Out of memory
```

Bash

```
# Edit script untuk naikkan memory JVM
nano ~/tools/ghidra_11.0.3_PUBLIC/support/launch.properties
# Ubah: MAXMEM=2G → MAXMEM=4G
# Restart Ghidra
```

**OUTPUT GAGAL ❌ — Format tidak dikenali:**

text

```
Import failed: No loader matched the file format
```

Bash

```
# Cek magic bytes dulu
xxd $TARGET_BIN | head -3
# Lalu di Ghidra: Import → pilih format "Raw Binary" → set architecture manual
```

---

### Langkah 1.2 — Menemukan `main()` dan Titik Masuk

**Metode 1: Symbol Tree Langsung (Not Stripped Binary)**

Di panel Symbol Tree (kiri):

text

```
Functions/
├── main          ← Klik ini
├── check_password
├── decrypt_flag
└── validate_serial
```

➡️ Klik `main` → Panel Listing dan Decompiler otomatis pindah ke sana.

**Metode 2: Search String Reference**

text

```
Di Ghidra:
Search → For Strings → Search

Cari string yang ditemukan di ltrace/strings:
- "Enter password"
- "Correct!"
- "Wrong!"

Double-click hasil → Masuk ke .rodata
Lihat XREF[1]: main:0x401142(R)
Double-click XREF → Masuk ke fungsi yang menggunakan string itu
```

**Metode 3: Stripped Binary — Lacak via `_start`**

text

```
Symbol Tree → Functions → entry (atau _start)
```

Decompiler akan menampilkan:

C

```
void processEntry entry(undefined8 param_1, undefined8 param_2)
{
    undefined8 in_stack_00000000;
    
    // Argumen PERTAMA ke __libc_start_main adalah pointer ke main()
    __libc_start_main(FUN_00101149, in_stack_00000000, &stack0x00000008,
                      FUN_001011d0, FUN_00101240, param_2);
    do {
        halt_baddata();
    } while(true);
}
```

➡️ Double-click `FUN_00101149` → Ini adalah `main()` yang sebenarnya  
➡️ Rename: tekan `L` pada nama fungsi → ketik `main` → Enter

**OUTPUT BERHASIL ✅ — Menemukan main():**

C

```
// Di Decompiler Window:
undefined8 main(void)
{
    char local_48 [56];
    printf("Enter the secret key: ");
    fgets(local_48, 0x32, _stdin);
    ...
}
```

**OUTPUT GAGAL ❌ — Terlalu banyak fungsi FUN_XXXXXXXX:**

text

```
FUN_00101000, FUN_00101050, FUN_00101149, ... (ratusan fungsi)
```

text

```
Search → For Strings → cari "Enter" atau string yang diketahui
Double-click → XREF akan mengarah ke fungsi yang benar
```

---

### Langkah 1.3 — Refactor Variable Names (WAJIB DILAKUKAN)

> Jangan baca pseudocode tanpa rename dulu. `local_18` dan `FUN_...` tidak bermakna.

**Prosedur di Ghidra Decompiler:**

text

```
Shortcut:
- L  = Rename variabel/fungsi
- T  = Retype (ubah tipe data)
- ;  = Tambah comment
- G  = Go to address
- Ctrl+F = Search dalam panel aktif
```

**Contoh sebelum refactor:**

C

```
undefined8 FUN_001011c0(void)
{
    size_t sVar1;
    int iVar2;
    int local_4c;
    char local_48 [56];
    long local_10;
    
    local_10 = *(long *)(in_FS_OFFSET + 0x28);
    printf("Input flag: ");
    __isoc99_scanf("%40s", local_48);
    sVar1 = strlen(local_48);
    if (sVar1 == 0x10) {
        local_4c = 0;
        while (local_4c < 0x10) {
            local_48[local_4c] = local_48[local_4c] ^ 0x5b;
            local_4c = local_4c + 1;
        }
        iVar2 = memcmp(local_48, &DAT_00102020, 0x10);
```

**Langkah rename:**

1. Klik `FUN_001011c0` → tekan `L` → ketik `main_logic`
2. Klik `local_48` → tekan `L` → ketik `user_buffer`
3. Klik `local_4c` → tekan `L` → ketik `loop_index`
4. Klik `iVar2` → tekan `L` → ketik `cmp_result`
5. Klik `DAT_00102020` → tekan `L` → ketik `CIPHER_ARRAY`
6. Klik `local_48` di deklarasi → `T` → ketik `char[16]` → Enter

**Hasil setelah refactor:**

C

```
undefined8 main_logic(void)
{
    size_t input_length;
    int cmp_result;
    int loop_index;
    char user_buffer [16];
    
    printf("Input flag: ");
    __isoc99_scanf("%40s", user_buffer);
    input_length = strlen(user_buffer);
    if (input_length == 16) {
        loop_index = 0;
        while (loop_index < 16) {
            user_buffer[loop_index] = user_buffer[loop_index] ^ 0x5b;
            loop_index = loop_index + 1;
        }
        cmp_result = memcmp(user_buffer, &CIPHER_ARRAY, 16);
```

**OUTPUT BERHASIL ✅ — Pseudocode jadi readable:**

text

```
Logika terbaca: input XOR 0x5b, dibandingkan dengan CIPHER_ARRAY
→ Perlu ekstrak isi CIPHER_ARRAY → buat solver XOR
```

---

### Langkah 1.4 — Identifikasi Pola Logika (Pattern Recognition)

Setelah refactor, identifikasi pola dari 6 kategori berikut:

#### POLA 1: Direct String Comparison

C

```
// Di decompiler:
if (strcmp(user_buffer, "CTF{static_string}") == 0) {
    puts("Correct!");
}
```

**Cara solve:**

Bash

```
# Langsung submit
echo "CTF{static_string}" | $TARGET_BIN

# Atau via ltrace (harusnya ketangkap di Fase 0)
ltrace $TARGET_BIN <<< "test"
```

#### POLA 2: Byte-by-Byte Comparison

C

```
int is_valid = 1;
for (int i = 0; i < 24; i++) {
    if (user_input[i] != TARGET_ARRAY[i]) {
        is_valid = 0;
    }
}
```

**Cara solve:**

text

```
Di Ghidra, klik TARGET_ARRAY → Listing akan pindah ke data section
Salin 24 byte hex yang tersimpan → konversi ke ASCII
```

Bash

```
# Konversi hex ke ASCII
python3 -c "
data = bytes([0x43, 0x54, 0x46, 0x7b, 0x73, 0x74, 0x61, 0x74, 0x69, 0x63, 0x7d])
print(data.decode())
"
```

#### POLA 3: XOR Transformation

C

```
for (int i = 0; i < len; i++) {
    if ((user_input[i] ^ KEY) != CIPHER_ARRAY[i]) {
        return FAIL;
    }
}
```

**Cara solve:** XOR bersifat simetris → `FLAG[i] = CIPHER_ARRAY[i] ^ KEY`

Bash

```
# Ekstrak CIPHER_ARRAY dari Ghidra:
# Klik CIPHER_ARRAY → Listing → klik kanan → Copy Special → Byte String
# Contoh hasil: "09 0b 19 20 3a 1b 73 30"

python3 ~/re_loot/solvers/xor_solver.py
```

#### POLA 4: Hash-Based Verification

C

```
MD5_Final(digest, &ctx);
if (memcmp(digest, expected_hash, 16) == 0) { /* success */ }
```

**Identifikasi ukuran hash:**

- 16 bytes / 32 hex chars = MD5
- 20 bytes / 40 hex chars = SHA1
- 32 bytes / 64 hex chars = SHA256

**Cara solve:**

Bash

```
# Ekstrak expected_hash dari Ghidra (lihat CIPHER_ARRAY/DAT_ yang ukurannya 16/20/32)
# Crack via hashcat atau online:
# CrackStation: https://crackstation.net/
# MD5: hashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt
# SHA1: hashcat -m 100 hash.txt /usr/share/wordlists/rockyou.txt
```

#### POLA 5: Standard Encoding (Base64/ROT13)

C

```
// Indikasi: ada tabel karakter panjang di .rodata
// "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
// atau rotasi: input[i] = (input[i] - 'a' + 13) % 26 + 'a'
```

Bash

```
# Cek apakah ada tabel base64 di strings output
strings $TARGET_BIN | grep -E "^[A-Z]{26}[a-z]{26}"

# Decode di CyberChef atau CLI
echo "dGVzdA==" | base64 -d
echo "gur synt vf..." | tr 'A-Za-z' 'N-ZA-Mn-za-m'    # ROT13
```

#### POLA 6: Anti-Debugging via ptrace

C

```
if (ptrace(PTRACE_TRACEME, 0, 1, 0) < 0) {
    puts("Debugger detected!");
    exit(1);
}
```

**Identifikasi di Ghidra:**

- Ada pemanggilan `ptrace` di awal `main()`
- Conditional jump setelah `TEST RAX, RAX` atau `CMP RAX, 0`
- Jika RAX < 0 → exit

➡️ **Bypass di Fase 3 (GDB)** — jangan analisis lebih lanjut dulu.

---

### Langkah 1.5 — Ekstraksi Bytes dari Ghidra ke Python Solver

**Metode 1: Manual Copy via GUI**

text

```
1. Klik alamat CIPHER_ARRAY di Listing panel
2. Block byte yang dibutuhkan (Shift + klik)
3. Klik kanan → Copy Special → Byte String
4. Output di clipboard: "09 0b 19 20 3a 1b 73 30 70 20 70 3f 7b 3b"
```

**Metode 2: Parse di Python**

Python

```
# Paste hasil Copy Special di sini
raw = "09 0b 19 20 3a 1b 73 30 70 20 70 3f 7b 3b 70 3c 7a 36 30 32"
data = bytes(int(x, 16) for x in raw.split())
print("Bytes:", data)
print("As string:", data.decode(errors='replace'))
```

**Metode 3: GDB Memory Dump**

Bash

```
# Jika biner sedang berjalan di GDB
(gdb) dump binary memory ~/re_loot/dumps/cipher_array.bin 0x102020 0x102034
```

Python

```
with open("/root/re_loot/dumps/cipher_array.bin", "rb") as f:
    data = f.read()
print("Bytes:", list(data))
print("Hex:", data.hex())
```

**Metode 4: Ghidra Python Script (Otomatis)**

text

```
Window → Script Manager → New Script → Python → nama: extract_bytes.py
```

Python

```
# Ghidra Jython Script
symbol = getSymbol("CIPHER_ARRAY", None)
if symbol:
    addr = symbol.getAddress()
    data = [getByte(addr.add(i)) & 0xFF for i in range(20)]
    print("Extracted:", [hex(b) for b in data])
    print("As bytes:", bytes(data))
else:
    print("Symbol not found, try searching by address")
    # Manual: ganti dengan address dari Listing
    addr = toAddr(0x102020)
    data = [getByte(addr.add(i)) & 0xFF for i in range(20)]
    print("Manual extract:", [hex(b) for b in data])
```

---

## ═══════════════════════════════════════

## FASE 2: DYNAMIC ANALYSIS — GDB + PWNDBG

## ═══════════════════════════════════════

> **Tujuan:** Verifikasi hipotesis dari Ghidra, inspect nilai runtime, bypass anti-debug, dump memori.

### Langkah 2.1 — Setup GDB dan Breakpoint Dasar

Bash

```
# Install pwndbg (GDB enhancement) jika belum
git clone https://github.com/pwndbg/pwndbg.git ~/tools/pwndbg
cd ~/tools/pwndbg && ./setup.sh

# Buka binary di GDB
gdb -q $TARGET_BIN

# Cek apakah pwndbg aktif
(gdb) pwndbg    # Harus muncul pwndbg banner
```

**Setup breakpoint awal:**

Bash

```
# Jika not stripped:
(gdb) break main
(gdb) break check_password    # Jika fungsi ini ada dari nm output

# Jika stripped (gunakan alamat dari Ghidra):
(gdb) break *0x0000000000401149

# Jalankan program
(gdb) run <<< "TEST_INPUT"
# atau interaktif:
(gdb) run
```

**OUTPUT BERHASIL ✅ — Hit breakpoint:**

text

```
Breakpoint 1, 0x0000555555555149 in main ()

─────────────────────────[ REGISTERS ]─────────────────────────
 RAX  0x555555555149 (main) ◂— push rbp
 ...

─────────────────────────[ DISASM ]────────────────────────────
 ► 0x555555555149 <main>    push   rbp
   0x55555555514a <main+1>  mov    rbp, rsp
```

➡️ Program berhenti di `main`. Siap untuk analisis runtime.

**OUTPUT GAGAL ❌ — Breakpoint tidak pernah hit:**

text

```
Program received signal SIGSEGV, Segmentation fault.
```

atau program exit tanpa hit breakpoint.

Bash

```
# Kemungkinan PIE — alamat Ghidra tidak sama dengan runtime
# Gunakan starti untuk stop di instruksi pertama
(gdb) starti

# Cek base address
(gdb) vmmap
# Output: 0x555555554000 0x555555556000 r-xp ./target_bin
# Base address = 0x555555554000

# Kalkulasi alamat runtime:
# Ghidra address: 0x101149
# Runtime: 0x555555554000 + (0x101149 - 0x100000) = 0x555555555149
(gdb) break *0x555555555149

# SHORTCUT pwndbg untuk PIE:
(gdb) piebreak *0x101149    # Otomatis kalkulasi PIE offset
```

---

### Langkah 2.2 — Kalkulasi PIE Offset (CRITICAL untuk Binary Modern)

Bash

```
# Step 1: Stop di instruksi paling awal
gdb -q $TARGET_BIN
(gdb) starti

# Step 2: Lihat memory mapping
(gdb) vmmap
```

**OUTPUT BERHASIL ✅ — vmmap:**

text

```
LEGEND: STACK | HEAP | CODE | DATA | RWX | RODATA
    0x555555554000     0x555555556000 r-xp     2000 0      /root/re_loot/target_bin
    0x555555755000     0x555555756000 r--p     1000 1000   /root/re_loot/target_bin
    0x555555756000     0x555555757000 rw-p     1000 2000   /root/re_loot/target_bin
```

Bash

```
# Base address binary = 0x555555554000

# Formula kalkulasi:
# Runtime_addr = Base_addr + (Ghidra_addr - 0x100000)
# Contoh: main di Ghidra = 0x101149
# Runtime: 0x555555554000 + 0x101149 - 0x100000 = 0x555555555149

python3 -c "
base = 0x555555554000
ghidra_addr = 0x101149
runtime = base + (ghidra_addr - 0x100000)
print(f'Runtime address: {hex(runtime)}')
"

# Set breakpoint
(gdb) break *0x555555555149
(gdb) continue
```

---

### Langkah 2.3 — Inspeksi Register dan Memory

Bash

```
# === REGISTER INSPECTION ===
(gdb) info registers          # Semua register
(gdb) print/x $rax            # RAX dalam hex (return value / operand)
(gdb) print/x $rdi            # RDI = argumen ke-1 fungsi
(gdb) print/x $rsi            # RSI = argumen ke-2 fungsi
(gdb) print (char*)$rdi       # Cast pointer ke string

# === MEMORY INSPECTION ===
(gdb) x/s $rdi                # Print string di alamat RDI
(gdb) x/s $rsi                # Print string di alamat RSI (sering = target password!)
(gdb) x/s 0x555555558020      # Print string di alamat spesifik
(gdb) x/20gx $rsp             # Dump 20 qword dari stack
(gdb) x/16bx $rbp-0x20       # Dump 16 byte dari buffer lokal
(gdb) x/10i $rip              # Disassemble 10 instruksi ke depan

# === NAVIGATION ===
(gdb) nexti                   # Step over (lewati CALL)
(gdb) stepi                   # Step into (masuk ke CALL)
(gdb) continue                # Lanjut sampai breakpoint berikutnya
(gdb) finish                  # Jalankan sampai fungsi return

# === MEMORY SEARCH ===
(gdb) find $rsp, +0x1000, "CTF{"    # Cari string di stack
(gdb) find 0x555555554000, +0x10000, "FLAG"  # Cari di seluruh binary
```

**Skenario: Break tepat sebelum strcmp/memcmp, baca argumen:**

Bash

```
# Break di strcmp
(gdb) break strcmp
(gdb) run <<< "wrong_input"

# Saat hit:
(gdb) x/s $rdi    # Argumen 1 = input kita
(gdb) x/s $rsi    # Argumen 2 = TARGET PASSWORD!
```

**OUTPUT BERHASIL ✅:**

text

```
(gdb) x/s $rdi
0x7fffffffe1a0: "wrong_input"
(gdb) x/s $rsi
0x555555556020: "CTF{r3al_p4ssw0rd_h3r3}"
```

➡️ **PASSWORD KETEMU!** `CTF{r3al_p4ssw0rd_h3r3}`

---

### Langkah 2.4 — Bypass Anti-Debugging

**Scenario: ptrace anti-debug**

Bash

```
gdb -q $TARGET_BIN

# Method 1: Catch syscall ptrace
(gdb) catch syscall ptrace
Catchpoint 1 (syscall 'ptrace' [101])

(gdb) run <<< "test"
# Program berhenti di pemanggilan ptrace

(gdb) finish    # Tunggu ptrace return
# "Value returned is $1 = -1"  ← ptrace mengembalikan -1 karena ada debugger

# Paksa return value menjadi 0 (sukses = tidak ada debugger)
(gdb) set $rax = 0

(gdb) continue    # Program pikir tidak ada debugger, lanjut normal
```

**OUTPUT BERHASIL ✅:**

text

```
Continuing.
Debugger check passed. Membuka brankas...
FLAG: FLAG{ptr4c3_4nt1_d3bug_byp4ss3d}
```

**Method 2: NOP instruksi ptrace call (permanent patch)**

Bash

```
# Temukan alamat CALL ptrace di Ghidra atau GDB
(gdb) break main
(gdb) run
(gdb) x/20i $rip    # Cari instruksi CALL yang menuju ptrace

# Contoh: ptrace dipanggil di 0x555555555140
# NOP instruksi CALL (5 bytes untuk relative CALL, atau cari ukurannya)
(gdb) set *(unsigned char*)0x555555555140 = 0x90   # NOP byte 1
(gdb) set *(unsigned char*)0x555555555141 = 0x90   # NOP byte 2
# ... sesuai panjang instruksi CALL
(gdb) continue
```

**Scenario: Timing check anti-debug**

Bash

```
# Binary ngecek apakah eksekusi terlalu lambat (menandakan ada debugger)
# Identifikasi di Ghidra: ada pemanggilan clock_gettime() + perbandingan

# Bypass: set nilai register waktu secara manual saat break
(gdb) break *0x401200    # Alamat setelah clock_gettime
(gdb) run
(gdb) set $rax = 0       # Return value clock_gettime = 0 (waktu awal)
(gdb) continue
(gdb) break *0x401250    # Alamat setelah clock_gettime ke-2
(gdb) set $rax = 0       # Waktu akhir = 0 juga, selisih = 0 (cepat)
(gdb) continue
```

---

### Langkah 2.5 — Dump Memory untuk Analisis

Bash

```
# Dump range memori ke file binary
(gdb) dump binary memory ~/re_loot/dumps/mem_dump.bin 0x555555554000 0x555555560000

# Dump stack frame
(gdb) dump binary memory ~/re_loot/dumps/stack.bin $rsp $rsp+0x1000

# Cari flag pattern di dump
strings ~/re_loot/dumps/mem_dump.bin | grep -E "CTF\{|FLAG\{|HTB\{"
xxd ~/re_loot/dumps/mem_dump.bin | grep -A2 "43 54 46"    # "CTF" in hex
```

---

## ═══════════════════════════════════════

## FASE 3: BINARY PATCHING

## ═══════════════════════════════════════

> **Tujuan:** Modifikasi binary agar selalu masuk ke branch sukses tanpa perlu tahu password yang valid.

### Langkah 3.1 — Temukan Instruksi yang Akan di-Patch

**Di Ghidra, identifikasi percabangan kritis:**

text

```
Listing panel:
00401185: CMP  EAX, 0x0
00401188: JE   0x00401196      ← JE = Jump if Equal (saat password benar)
0040118a: LEA  RDI, "Wrong!"
00401191: CALL puts
00401196: LEA  RDI, "Correct!" ← Kita mau selalu lompat ke sini
```

**Tabel opcode jump yang perlu diketahui:**

|Instruksi|Opcode|Kebalikan|Opcode Kebalikan|
|---|---|---|---|
|`JE` / `JZ`|`0x74`|`JNE` / `JNZ`|`0x75`|
|`JNE` / `JNZ`|`0x75`|`JE` / `JZ`|`0x74`|
|`JS` (Sign)|`0x78`|`JNS`|`0x79`|
|`JL` (Less)|`0x7c`|`JGE`|`0x7d`|
|`JMP` (Always)|`0xeb`|-|-|
|`NOP`|`0x90`|-|-|

**Strategi patching:**

|Skenario|Target|Patch Ke|Tujuan|
|---|---|---|---|
|`JE success_block` (lompat jika benar)|`0x74`|`0xeb` (JMP)|Selalu lompat ke sukses|
|`JNE fail_block` (lompat jika salah)|`0x75`|`0x90 0x90` (NOP)|Tidak pernah lompat ke gagal|
|`JS exit_block` (anti-debug check)|`0x78`|`0x90 0x90`|Bypass check|

---

### Langkah 3.2 — Dynamic Patching via GDB (Tidak Ubah File)

Bash

```
gdb -q $TARGET_BIN

# Pasang breakpoint SEBELUM instruksi jump
(gdb) break *0x401185    # Alamat instruksi CMP
(gdb) run <<< "wrong_password"

# Saat break, lihat instruksi
(gdb) x/5i $rip
```

**OUTPUT:**

text

```
=> 0x401185:  cmp    eax,0x0
   0x401188:  je     0x401196    ← Ini yang mau kita bypass
   0x40118a:  lea    rdi,[rip+0xe73]
```

Bash

```
# Method 1: Ubah Zero Flag (ZF) untuk paksa JE lompat
(gdb) set $eflags |= (1 << 6)    # Set ZF = 1 → JE akan lompat

# Method 2: NOP instruksi JE langsung
(gdb) set *(unsigned char*)0x401188 = 0x90    # NOP byte 1
(gdb) set *(unsigned char*)0x401189 = 0x90    # NOP byte 2

# Method 3: Ubah ke JMP (selalu lompat)
(gdb) set *(unsigned char*)0x401188 = 0xeb    # JMP short
# Offset byte tetap sama (0x0c → lompat 12 byte ke depan)

(gdb) continue    # Lanjut eksekusi
```

**OUTPUT BERHASIL ✅:**

text

```
Continuing.
Access Granted!
FLAG{p4tch3d_succ3ssfully}
```

---

### Langkah 3.3 — Permanent Binary Patching via Python

Bash

```
# Cari raw file offset dari instruksi yang mau di-patch
# Di Ghidra: Klik instruksi JE → lihat status bar bawah
# Format: "Address: 0x101188 (file offset: 0x1188)"

# ATAU kalkulasi manual:
objdump -h $TARGET_BIN | grep .text
# Output: .text 000003b2  0000000000001060  0000000000001060  00001060  2**4
# Formula: file_offset = VMA - VMA_section_start + file_offset_section
# Contoh: 0x101188 - 0x101060 + 0x1060 = 0x1188
```

Python

```
#!/usr/bin/env python3
# ~/re_loot/solvers/patch_binary.py

import sys, shutil

def patch_binary(source, output, offset, original_bytes, patch_bytes):
    """
    source       : path binary asli
    output       : path output binary yang dipatch
    offset       : raw file offset (int)
    original_bytes: list byte yang diharapkan di posisi itu (untuk validasi)
    patch_bytes  : list byte pengganti
    """
    # Backup
    shutil.copy2(source, output)
    
    with open(output, 'r+b') as f:
        f.seek(offset)
        current = list(f.read(len(original_bytes)))
        
        print(f"[*] At file offset: {hex(offset)}")
        print(f"[*] Current bytes:  {[hex(b) for b in current]}")
        print(f"[*] Expected:       {[hex(b) for b in original_bytes]}")
        
        if current != original_bytes:
            print(f"[-] MISMATCH! Offset mungkin salah.")
            sys.exit(1)
        
        f.seek(offset)
        f.write(bytes(patch_bytes))
        print(f"[+] Patched with:   {[hex(b) for b in patch_bytes]}")
    
    print(f"[+] Patched binary saved: {output}")

if __name__ == "__main__":
    SOURCE  = "/root/re_loot/target_bin.orig"
    OUTPUT  = "/root/re_loot/target_bin_patched"
    
    # Contoh: patch JE (0x74 0x0c) di offset 0x1188 menjadi JMP (0xeb 0x0c)
    FILE_OFFSET    = 0x1188
    ORIGINAL_BYTES = [0x74, 0x0c]   # JE +12
    PATCH_BYTES    = [0xeb, 0x0c]   # JMP +12

    # Contoh: NOP dua byte
    # FILE_OFFSET    = 0x1188
    # ORIGINAL_BYTES = [0x74, 0x0c]
    # PATCH_BYTES    = [0x90, 0x90]
    
    patch_binary(SOURCE, OUTPUT, FILE_OFFSET, ORIGINAL_BYTES, PATCH_BYTES)
```

Bash

```
python3 ~/re_loot/solvers/patch_binary.py

# Jalankan hasil patch
chmod +x ~/re_loot/target_bin_patched
~/re_loot/target_bin_patched <<< "any_input_here"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] At file offset: 0x1188
[*] Current bytes:  ['0x74', '0xc']
[*] Expected:       ['0x74', '0xc']
[+] Patched with:   ['0xeb', '0xc']
[+] Patched binary saved: /root/re_loot/target_bin_patched

# Eksekusi:
Access Granted!
FLAG{p4tch_w0rks_p3rm4n3ntly}
```

**OUTPUT GAGAL ❌ — Segmentation fault setelah patch:**

text

```
Segmentation fault (core dumped)
```

➡️ Patch menyebabkan alignment issue. Coba NOP instead:

Python

```
# Ganti PATCH_BYTES dengan NOP sequence yang tepat ukurannya
PATCH_BYTES = [0x90] * len(ORIGINAL_BYTES)
```

---

## ═══════════════════════════════════════

## FASE 4: SOLVER SCRIPTS

## ═══════════════════════════════════════

> **Tujuan:** Reverse matematika dari algoritma yang ditemukan di Ghidra, tulis script solver Python.

### Langkah 4.1 — XOR Solver (Pola Paling Umum)

Python

```
#!/usr/bin/env python3
# ~/re_loot/solvers/xor_solver.py
# Gunakan ini ketika: user_input[i] XOR KEY == CIPHER_ARRAY[i]

# === ISI INI DARI GHIDRA ===
# Paste hasil Copy Special dari Cipher Array di Ghidra
CIPHER_HEX = "09 0b 19 20 3a 1b 73 30 70 20 70 3f 7b 3b 70 3c 7a 36 30 32"
XOR_KEY = 0x4f   # Key dari decompiler: user_input[i] ^ 0x4f
# ===========================

# Parse hex string ke bytes
CIPHER_BYTES = bytes(int(x, 16) for x in CIPHER_HEX.split())

# Reverse: flag[i] = cipher[i] ^ key
flag = bytes([b ^ XOR_KEY for b in CIPHER_BYTES])

print(f"[*] Cipher bytes: {CIPHER_BYTES.hex()}")
print(f"[*] XOR Key:      {hex(XOR_KEY)}")
print(f"[+] Recovered flag: {flag}")
try:
    print(f"[+] As string: {flag.decode('utf-8')}")
except:
    print(f"[!] Non-ASCII bytes, hex: {flag.hex()}")
    print(f"[!] Printable only: {flag.decode('ascii', errors='replace')}")
```

**Jalankan:**

Bash

```
python3 ~/re_loot/solvers/xor_solver.py
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Cipher bytes: 090b19203a1b73307020703f7b3b703c7a363032
[*] XOR Key:      0x4f
[+] Recovered flag: b'FLAG{x0r_1s_r3v3rs1bl3}'
[+] As string: FLAG{x0r_1s_r3v3rs1bl3}
```

**OUTPUT GAGAL ❌ — Output bukan printable ASCII:**

text

```
[+] Recovered flag: b'\x01\xff\x32...'
[!] Non-ASCII bytes
```

➡️ Key salah atau ada transformasi tambahan. Kembali ke Ghidra, cek lebih teliti:

Bash

```
# Brute-force single byte XOR key (256 kemungkinan)
python3 -c "
cipher = bytes.fromhex('090b19203a1b7330')
for key in range(256):
    result = bytes([b ^ key for b in cipher])
    try:
        s = result.decode('ascii')
        if all(32 <= c < 127 for c in result):
            print(f'Key 0x{key:02x}: {s}')
    except:
        pass
"
```

---

### Langkah 4.2 — Multi-Byte Repeating Key XOR Solver

Python

```
#!/usr/bin/env python3
# ~/re_loot/solvers/multi_xor_solver.py
# Gunakan ketika: input[i] ^ key[i % len(key)] == cipher[i]

CIPHER_HEX = "1a0b3c4d2e1f3a2b"
KEY = b"FLAG"    # Key string yang ditemukan di binary (cari di strings output)

cipher = bytes.fromhex(CIPHER_HEX)
result = bytes([cipher[i] ^ KEY[i % len(KEY)] for i in range(len(cipher))])

print(f"[+] Decrypted: {result}")
try:
    print(f"[+] As string: {result.decode()}")
except:
    print(f"[!] Hex: {result.hex()}")
```

---

### Langkah 4.3 — Caesar/ROT Brute Force Solver

Python

```
#!/usr/bin/env python3
# ~/re_loot/solvers/rot_solver.py

import codecs

ciphertext = "synt{ebg13_vf_abg_frpher}"

# Method 1: ROT13
decoded_rot13 = codecs.decode(ciphertext, 'rot_13')
print(f"ROT13: {decoded_rot13}")

# Method 2: Brute-force semua rotasi (Caesar 1-25)
print("\nAll Caesar shifts:")
for shift in range(1, 26):
    result = []
    for c in ciphertext:
        if c.isalpha():
            base = ord('A') if c.isupper() else ord('a')
            result.append(chr((ord(c) - base - shift) % 26 + base))
        else:
            result.append(c)
    plain = ''.join(result)
    # Filter: hanya tampilkan yang ada kata "flag" atau format CTF
    if 'flag' in plain.lower() or '{' in plain:
        print(f"  Shift {shift:2d}: {plain}  ← POSSIBLE FLAG!")
    else:
        print(f"  Shift {shift:2d}: {plain}")
```

---

### Langkah 4.4 — Byte Array Direct Comparison Solver

Python

```
#!/usr/bin/env python3
# ~/re_loot/solvers/byte_array_solver.py
# Gunakan ketika: input[i] == TARGET_ARRAY[i] langsung tanpa transformasi

# Paste dari Ghidra (Copy Special → Byte String dari TARGET_ARRAY)
TARGET_HEX = "43 54 46 7b 62 79 74 33 5f 34 72 72 34 79 5f 63 6f 6d 70 34 72 33 7d"

target_bytes = bytes(int(x, 16) for x in TARGET_HEX.split())
print(f"[+] Target bytes ({len(target_bytes)} bytes): {target_bytes.hex()}")

try:
    flag = target_bytes.decode('ascii')
    print(f"[+] FLAG: {flag}")
except UnicodeDecodeError:
    # Tidak semua printable ASCII
    printable = ''.join(chr(b) if 32 <= b < 127 else f'\\x{b:02x}' for b in target_bytes)
    print(f"[+] Mixed: {printable}")
```

---

### Langkah 4.5 — Hash Cracking (Jika Binary Pakai Hash Verification)

Bash

```
# Identifikasi hash dari Ghidra: lihat ukuran array yang dibandingkan
# 16 bytes = MD5, 20 bytes = SHA1, 32 bytes = SHA256

# Copy hash hex dari Ghidra ke sini:
HASH_HEX="5f4dcc3b5aa765d61d8327deb882cf99"

# Cek tipe hash
echo "$HASH_HEX" | wc -c
# 33 chars (32 + newline) = MD5
# 41 chars (40 + newline) = SHA1
# 65 chars (64 + newline) = SHA256

# Crack dengan hashcat
# MD5:
hashcat -m 0 $HASH_HEX /usr/share/wordlists/rockyou.txt --show

# SHA1:
hashcat -m 100 $HASH_HEX /usr/share/wordlists/rockyou.txt --show

# SHA256:
hashcat -m 1400 $HASH_HEX /usr/share/wordlists/rockyou.txt --show

# Atau online (tanpa crack local):
# https://crackstation.net/ ← Paste hash, cek instantly
# https://md5hashing.net/
```

**OUTPUT BERHASIL ✅ — Hash cracked:**

text

```
5f4dcc3b5aa765d61d8327deb882cf99:password
```

➡️ Password adalah `password`. Submit ke binary:

Bash

```
echo "password" | $TARGET_BIN
```

**OUTPUT GAGAL ❌ — Hash tidak ada di wordlist:**

text

```
Approaching final keyspace - workload adjusted.
Session..........: hashcat
Status...........: Exhausted
```

➡️ Coba dengan rules atau wordlist lebih besar:

Bash

```
# Dengan rules (lebih powerful)
hashcat -m 0 $HASH_HEX /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# Wordlist lebih lengkap dari SecLists
hashcat -m 0 $HASH_HEX /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt.tar.gz

# Brute force pendek (jika tahu panjang password)
hashcat -m 0 $HASH_HEX -a 3 ?a?a?a?a?a?a    # 6 karakter semua charset
```

---

## ═══════════════════════════════════════

## FASE 5: ADVANCED — ANTI-ANALYSIS & OBFUSCATION

## ═══════════════════════════════════════

### Langkah 5.1 — Handling Binary Stripped + PIE + Anti-Debug Sekaligus

> Kombinasi paling susah. Systematic approach:

Bash

```
# Step 1: Unpack jika perlu (Langkah 0.5)

# Step 2: Ghidra analysis, temukan fungsi anti-debug via ptrace
# Cari di Ghidra: Window → References → Find ptrace calls

# Step 3: Identifikasi semua anti-debug checks
# Cari di Ghidra Search → For Strings → "ptrace", "debugger", "traced"

# Step 4: Buat GDB script untuk bypass semua sekaligus
cat > ~/re_loot/bypass_antidebug.gdb << 'EOF'
# bypass_antidebug.gdb
set pagination off
set confirm off

# Catch semua ptrace calls
catch syscall ptrace

# Jalankan
run <<< "TEST_INPUT"

# Loop: setiap kali ptrace dipanggil, paksa return 0
while 1
    # Tunggu sampai hit catchpoint ptrace
    continue
    # Cek apakah ini ptrace catchpoint
    if $pc != 0
        # Set return value = 0 (no debugger)
        finish
        set $rax = 0
    end
end
EOF

gdb -q $TARGET_BIN -x ~/re_loot/bypass_antidebug.gdb
```

### Langkah 5.2 — Identifikasi Custom Crypto / VM

Jika decompiler Ghidra menampilkan ratusan operasi bitwise kompleks yang tidak dikenali:

Bash

```
# Cari tanda-tanda custom VM di Ghidra:
# 1. Ada loop besar dengan dispatch table (array fungsi pointer)
# 2. Ada opcode interpreter: switch(bytecode[pc]) { case 0: ...; case 1: ...; }
# 3. Ada register virtual: v_regs[0], v_regs[1], dll
# 4. Ada PC virtual yang increment di setiap loop

# Strategy untuk custom VM:
# 1. Identifikasi bytecode input (mungkin ada di .rodata atau dibaca dari file)
# 2. Identifikasi operasi tiap opcode di switch statement
# 3. Trace eksekusi bytecode secara manual atau buat interpreter Python

# Search di Google:
# "CTF <binary_name> writeup"
# "CTF custom VM reverse engineering"
```

Python

```
#!/usr/bin/env python3
# Template untuk trace custom VM bytecode
# Sesuaikan dengan opcode yang ditemukan di Ghidra

BYTECODE = bytes.fromhex("0102030405")  # Isi dengan bytecode dari binary

def emulate_vm(bytecode):
    pc = 0
    registers = [0] * 8
    stack = []
    output = []
    
    while pc < len(bytecode):
        opcode = bytecode[pc]
        pc += 1
        
        if opcode == 0x01:    # PUSH imm
            val = bytecode[pc]
            pc += 1
            stack.append(val)
            print(f"PUSH {hex(val)}")
            
        elif opcode == 0x02:  # XOR top two stack values
            a = stack.pop()
            b = stack.pop()
            stack.append(a ^ b)
            print(f"XOR {hex(a)} ^ {hex(b)} = {hex(a^b)}")
            
        elif opcode == 0x03:  # PRINT top of stack
            val = stack.pop()
            output.append(chr(val))
            print(f"PRINT {chr(val)}")
            
        # Tambah opcode lain sesuai temuan di Ghidra
        
    return ''.join(output)

result = emulate_vm(BYTECODE)
print(f"\n[+] VM Output: {result}")
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|No|Error / Anomali|Penyebab|Solusi|
|---|---|---|---|
|1|Ghidra: `Unable to import file`|Permission atau file rusak|`chmod +r ./bin`, redownload|
|2|Ghidra auto-analysis hang|RAM JVM kurang|Edit `MAXMEM=4G` di `ghidraRun` support|
|3|Binary stripped, tidak ada `main`|Simbol dihapus compiler|Lacak `_start` → `__libc_start_main` arg1|
|4|Decompiler output garbled|Tipe data salah|`Retype Variable` → gunakan tipe C standar|
|5|GDB: `Cannot find bounds of current function`|Stripped binary|`break *0x401120` langsung alamat|
|6|`ltrace` tidak ada output|Statically linked|Langsung ke Ghidra, ltrace tidak berfungsi|
|7|`strace`: `Operation not permitted`|Kernel ptrace hardening|`sudo sysctl -w kernel.yama.ptrace_scope=0`|
|8|Binary crash saat di-attach GDB|Anti-debug aktif|`catch syscall ptrace` → `finish` → `set $rax=0`|
|9|Binary patched → Segfault|Misalignment opcode|Gunakan NOP (`0x90`) padding sama panjang instruksi asli|
|10|XOR solver output non-ASCII|Key salah atau multi-byte key|Brute-force 256 kemungkinan key|
|11|`strcmp` tidak muncul di ltrace|Custom comparison loop|Ghidra static analysis loop array|
|12|Mismatch 32-bit vs 64-bit|Arsitektur salah|Install `libc6-i386` untuk 32-bit binary di 64-bit OS|
|13|PIE: alamat Ghidra ≠ GDB|PIE randomization|Kalkulasi: `base + (ghidra_addr - 0x100000)` atau `piebreak`|
|14|Binary stripped + packed sekaligus|Double protection|Unpack dulu → analisis Ghidra|
|15|GDB stuck menunggu input|Binary baca stdin yang belum flush|`run <<< $(python3 -c 'print("A"*20)')`|
|16|Hash tidak ada di rockyou|Password unik/custom|Coba rules hashcat, coba wordlist CTF-specific|
|17|Custom VM — tidak tahu opcode|Tidak ada referensi|Search CTF platform writeup dari nama soal|

**Google Search Template untuk situasi buntu:**

text

```
"ctf reverse engineering <binary_type> <platform_name>"
"ghidra <error_message>"
"gdb pie binary breakpoint"
"upx custom packer unpack gdb"
"<binary_name> ctf writeup"
```

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Binary RE Challenge
│
├─ FASE 0: TRIAGE CEPAT (5 menit)
│   ├─ file → Arsitektur, PIE status, stripped/not
│   ├─ checksec → NX, Canary, PIE, RELRO
│   ├─ strings → [FLAG ditemukan?] → SELESAI
│   ├─ ltrace → [strcmp bocor password?] → Coba, SELESAI
│   ├─ strace → [baca file? ptrace?] → Handle per kasus
│   ├─ nm → [fungsi kritis ditemukan?] → Target langsung di Ghidra
│   └─ upx/die → [packed?] → Unpack dulu
│
├─ FASE 1: STATIC ANALYSIS (Ghidra)
│   ├─ Import binary → Auto-analyze
│   ├─ Temukan main() via Symbol Tree atau XREF string
│   ├─ Rename variabel (L key) + Retype (T key)
│   ├─ Identifikasi pola:
│   │   ├─ [strcmp/memcmp direct] → Extract password, submit
│   │   ├─ [XOR loop] → Extract cipher array, buat XOR solver
│   │   ├─ [Hash check] → Extract hash, crack hashcat/online
│   │   ├─ [Encoding B64/ROT] → Decode di CLI/CyberChef
│   │   ├─ [Anti-debug ptrace] → Bypass di Fase 2 GDB
│   │   └─ [Custom VM] → Trace bytecode, emulate
│   └─ Extract bytes dari Ghidra ke Python solver
│
├─ FASE 2: DYNAMIC ANALYSIS (GDB)
│   ├─ Break di main/strcmp/memcmp
│   ├─ [PIE binary] → vmmap → kalkulasi offset → piebreak
│   ├─ x/s $rdi + x/s $rsi → [Password ketahuan?] → SELESAI
│   ├─ [Anti-debug] → catch syscall ptrace → finish → set $rax=0
│   └─ dump memory → strings/xxd → cari flag
│
├─ FASE 3: BINARY PATCHING
│   ├─ Temukan conditional jump di Ghidra (JE/JNE/JS)
│   ├─ Dynamic: GDB → set $eflags atau NOP di memory
│   └─ Permanent: Python patcher → JE(0x74) → JMP(0xeb)
│
├─ FASE 4: SOLVER SCRIPTS
│   ├─ [XOR] → xor_solver.py
│   ├─ [Multi-key XOR] → multi_xor_solver.py
│   ├─ [Caesar/ROT] → rot_solver.py
│   ├─ [Byte array] → byte_array_solver.py
│   └─ [Hash] → hashcat / CrackStation
│
└─ FASE 5: ADVANCED
    ├─ [Stripped + PIE + Anti-debug] → Kombinasi semua bypass
    └─ [Custom VM] → Emulate VM di Python
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === TRIAGE ===
file ./binary
checksec ./binary
strings -n 8 ./binary | grep -Ei "flag|pass|secret|ctf\{|htb\{"
ltrace -e strcmp,strncmp,memcmp ./binary <<< "TEST_INPUT" 2>&1
strace -e trace=read,write,openat,access ./binary <<< "TEST_INPUT" 2>&1
nm ./binary 2>/dev/null | grep -Ei "check|flag|pass|main"
upx -t ./binary 2>/dev/null; die-cli ./binary 2>/dev/null

# === UNPACK ===
cp ./binary ./binary.bak
upx -d ./binary -o ./binary_unpacked

# === GDB ESSENTIALS ===
gdb -q ./binary
(gdb) starti && vmmap                    # PIE base address
(gdb) piebreak *0x101149                 # Break dengan PIE offset
(gdb) catch syscall ptrace               # Catch anti-debug
(gdb) break strcmp                       # Break di semua strcmp
(gdb) x/s $rdi && x/s $rsi             # Print string argumen
(gdb) finish && set $rax = 0            # Bypass ptrace return
(gdb) dump binary memory /tmp/dump.bin $rsp $rsp+0x1000

# === PYTHON SOLVERS ===
# XOR solver one-liner:
python3 -c "
cipher = bytes.fromhex('090b19203a1b7330702070')
key = 0x4f
print(bytes([b ^ key for b in cipher]).decode('ascii', errors='replace'))
"

# Brute-force XOR key:
python3 -c "
cipher = bytes.fromhex('090b19')
for k in range(256):
    r = bytes([b^k for b in cipher])
    if all(32<=x<127 for x in r): print(f'Key {hex(k)}: {r.decode()}')
"

# ROT13:
python3 -c "import codecs; print(codecs.decode('synt{grfg}', 'rot_13'))"

# Base64:
echo "dGVzdA==" | base64 -d

# === BINARY PATCH ONE-LINER ===
# NOP sebuah byte di offset 0x1188:
python3 -c "
data = bytearray(open('./binary','rb').read())
data[0x1188] = 0x90  # NOP
data[0x1189] = 0x90  # NOP
open('./binary_patched','wb').write(data)
print('Patched!')
"
chmod +x ./binary_patched && ./binary_patched <<< "wrong_input"
```

---

> **➡️ CROSS-WORKFLOW REFERENCES:**
> 
> - **File 48** (`binary_analysis_workflow.md`) — Analisis properti eksternal binary (checksec, ELF headers) dilakukan SEBELUM workflow ini
> - **File 49** (`buffer_overflow_workflow.md`) — Jika RE menemukan fungsi `gets()`/`strcpy()` yang vulnerable, lanjut ke BOF workflow
> - **File 50** (`rop_chain_workflow.md`) — Jika PIE + NX aktif dan butuh ROP gadget setelah memahami binary via RE
> - **File 52** (`ctf_binary_patterns.md`) — Pola CTF lanjutan yang menggabungkan RE + exploitation