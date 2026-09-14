---
id: "55"
title: "🧭 BAGIAN 0: FONDASI FORENSICS"
category: "7. Cryptography & Forensics"
categoryId: "crypto_forensics"
filename: "55_forensics_workflow.md"
refs_out: ["48","53","54","56","57","58"]
refs_in: ["54","56","57","58","61","63"]
---

## 🧭 BAGIAN 0: FONDASI FORENSICS

### 0.1 Digital Forensics dalam Konteks CTF

Digital Forensics adalah disiplin ilmu merekonstruksi, memvalidasi, dan mengekstrak bukti digital dari artefak komputer tanpa merusak integritas data aslinya.
#### Perbedaan Mendasar: CTF Forensics vs Real-World Forensics

- **Real-World Incident Response:** Fokus utama berada pada _Chain of Custody_, integritas legal barang bukti (menjaga nilai hash SHA-256 asli), timeline analysis kronologis serangan, identifikasi celah masuk (_root cause_), dan pelaporan yuridis.
- **CTF Forensics:** Fokus utama adalah identifikasi pola penyembunyian data (_data hiding mechanism_), carving artefak tersembunyi, decoding struktur biner, dan ekstraksi string flag (`FLAG{...}`, `CTF{...}`). Prinsip integritas legal dikesampingkan demi kecepatan dan efisiensi waktu penyelesaian.

text

```
[ FILE CHALLENGE DITERIMA ]
             │
             ▼
┌─────────────────────────┐
│   1. IDENTIFIKASI AWAL  │ ──► file, xxd, strings, exiftool, binwalk
└─────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│   2. ISOLASI & EKSTRAKSI│ ──► File Carving, Decompress, Mount, Dump Memory
└─────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│   3. ANALISIS ARTEFAK   │ ──► Parse Metadata, Lacak Offset, Follow Stream
└─────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│    4. RECOVERY & FLAG   │ ──► Patch Header, Decode Payload -> FLAG{...}
└─────────────────────────┘
```

---

### 0.2 Mindset Praktis Analis Forensics

1. **Prinsip Piramida Kompleksitas:** Jangan langsung membuka tool analisis berat (seperti Autopsy atau Volatility) sebelum menjalankan utilitas triage dasar (`file`, `strings`, `exiftool`). Sebagian besar challenge tingkat dasar (_easy_) selesai pada tahap ini.
2. **Kekekalan Data:** Informasi yang disembunyikan harus disimpan di suatu tempat fisik di dalam array byte. Jika ukuran file mencurigakan lebih besar dari konten normalnya, terdapat payload tersembunyi.
3. **Peta Titik Sembunyi Umum (_Common Hiding Spots_):**
    - **Metadata:** Field EXIF comment, GPS tags, author, create date.
    - **Appended Data (Overlay):** Data yang ditempelkan di belakang marker penutup file resmi (misal: setelah marker `FF D9` pada JPEG atau `IEND` pada PNG).
    - **File Slack Space:** Sisa byte kosong pada cluster file system yang tidak digunakan penuh oleh file.
    - **File Header/Footer Corruption:** Sengaja dirusak agar aplikasi penampil gambar/dokumen gagal membukanya.
    - **Alternate Data Streams (NTFS ADS):** Ekstensi data tersembunyi pada filesystem Windows.
    - **Unallocated Space / Inode Terhapus:** File yang sudah di-unlink dari filesystem table namun datanya masih tertinggal di disk sector.

---

### 0.3 Setup Perangkat Lunak Forensics di Parrot OS

Buka terminal Parrot OS XFCE Anda dan jalankan perintah penyiapan dependensi berikut:

Bash

```
# 1. Update repository dan instalasi toolkit debian utama
sudo apt update && sudo apt install -y \
    binwalk \
    foremost \
    sleuthkit \
    autopsy \
    testdisk \
    libimage-exiftool-perl \
    steghide \
    bulk-extractor \
    pngcheck \
    xxd \
    tshark \
    wireshark \
    tcpdump

# 2. Instalasi Volatility 3 (Framework Analisis RAM Modern)
sudo apt install -y python3-pip git
pip3 install --upgrade pip
pip3 install volatility3

# Verifikasi akses CLI volatility
vol -h > /dev/null && echo "[+] Volatility 3 Terpasang Siap Digunakan"

# 3. Instalasi Ruby gem zsteg (Khusus analisis LSB pada format PNG/BMP)
sudo apt install -y ruby ruby-dev
sudo gem install zsteg

# 4. Instalasi parser Windows Event Log (.evtx)
pip3 install python-evtx

# 5. Siapkan StegSolve (Tool visual analysis berbasis Java)
mkdir -p ~/tools && cd ~/tools
# Download StegSolve dari GitHub mirror (URL caesum.com sudah tidak aktif)
wget https://github.com/eugenekolo/sec-tools/raw/master/stego/stegsolve/stegsolve/Stegsolve.jar \
  -O ~/tools/stegsolve.jar
chmod +x ~/tools/stegsolve.jar

# Alternatif Modern (Web-Based):
# AperiSolve (https://www.aperisolve.com/) — analisis stego otomatis di browser tanpa install Java
```

---

## 🔎 BAGIAN 1: IDENTIFIKASI FILE & TRIAGE AWAL

### 1.1 Prosedur Standar Triage (7 Langkah Berurutan)

Eksekusi urutan diagnostik ini setiap kali menerima file artefak baru:

text

```
[FILE ARTEFAK] 
      │
      ├─► Langkah 1: `file <target>`         (Cek identifikasi berdasarkan libmagic)
      ├─► Langkah 2: `xxd | head`            (Inspeksi manual 16 byte pertama / Magic Bytes)
      ├─► Langkah 3: `strings -n 8`          (Pindai jejak plain text ASCII/Unicode)
      ├─► Langkah 4: `exiftool`              (Audit properti metadata, timestamp, comments)
      ├─► Langkah 5: `binwalk -E`            (Analisis plot entropi untuk mendeteksi enkripsi/kompresi)
      ├─► Langkah 6: `binwalk <target>`      (Pindai tanda-tanda embedded file signatures)
      └─► Langkah 7: Tool Spesifik           (Buka debugger, Volatility, Wireshark, atau Sleuthkit)
```

---

### 1.1.1 ⚡ Quick Reference: Format File vs Tool Utama

|Format File|Tool Pertama (Quick Check)|Tool Kedua (Deep Inspection)|Tool Ketiga (Carving / Extraction)|
|---|---|---|---|
|`.png`|`zsteg -a`|`pngcheck -vvt`|`exiftool` / `binwalk -e`|
|`.jpg` / `.jpeg`|`steghide info`|`exiftool`|`stegsolve` / `binwalk -e`|
|`.wav` / `.mp3`|`exiftool`|`strings -n 8`|`audacity` / `sonic-visualiser`|
|`.pdf`|`exiftool`|`pdfinfo`|`pdfextract` / `pdf-parser`|
|`.raw` / `.mem`|`vol -f mem.raw windows.info`|`vol -f mem.raw linux.pslist`|`strings` / `vol dumpfiles`|
|`.img` / `.dd`|`fdisk -l`|`fls -r -p -d`|`autopsy` / `photorec`|
|`.pcap` / `.pcapng`|`strings -n 8`|`tshark -z io,phs`|`wireshark` / `tshark --export-objects`|
|`.evtx`|`evtx_dump.py`|`grep <EventID>`|`chainsaw` / `Hayabusa`|
|`.zip` / `.rar`|`unzip -l` / `7z l`|`zip2john`|`7z x` / `hashcat -m 17210`|

---

### 1.2 Tabel Referensi Magic Bytes (File Signatures)

Sistem operasi mengidentifikasi jenis file melalui deretan byte awal (_magic bytes_), bukan ekstensi namanya.

|Magic Bytes (Hexadecimal)|Format File|Ekstensi Standar|Keterangan Struktur|
|---|---|---|---|
|`FF D8 FF E0` / `FF D8 FF E1`|JPEG / JFIF Graphics|`.jpg`, `.jpeg`|Footer penutup diakhiri: `FF D9`|
|`89 50 4E 47 0D 0A 1A 0A`|PNG Image|`.png`|Chunks: `IHDR` ... `IDAT` ... `IEND`|
|`47 49 46 38 37 61` / `39 61`|GIF Image|`.gif`|Format GIF87a atau GIF89a|
|`50 4B 03 04`|ZIP Archive / DOCX / APK|`.zip`, `.docx`|Standard PKZIP compression|
|`50 4B 05 06`|ZIP (Empty Directory / EOCD)|`.zip`|End of Central Directory Record|
|`52 61 72 21 1A 07 00`|RAR Archive (v4.x)|`.rar`|Versi lama|
|`52 61 72 21 1A 07 01 00`|RAR Archive (v5.x)|`.rar`|Versi modern|
|`1F 8B 08`|GZIP Compressed Archive|`.tar.gz`, `.gz`|Menggunakan algoritma DEFLATE|
|`42 5A 68`|BZIP2 Archive|`.bz2`|Kompresi blok Burrows-Wheeler|
|`37 7A BC AF 27 1C`|7-Zip Archive|`.7z`|High-compression container|
|`FD 37 7A 58 5A 00`|XZ Compression|`.xz`|Standard tar.xz Linux|
|`7F 45 4C 46`|Executable and Linking Format|`.elf`, biner Linux|`\x7fELF`|
|`4D 5A`|DOS MZ Executable|`.exe`, `.dll`, PE|Executable Windows|
|`25 50 44 46`|Portable Document Format|`.pdf`|Header: `%PDF-`, Footer: `%%EOF`|
|`D0 CF 11 E0 A1 B1 1A E1`|MS Compound File (OLE)|`.doc`, `.xls`, `.ppt`|Format Microsoft Office lawas|
|`7B 5C 72 74 66`|Rich Text Format|`.rtf`|Sintaks: `{\rtf`|
|`4F 67 67 53`|OGG Audio Container|`.ogg`|Ogg Vorbis|
|`49 44 33`|MP3 Audio with ID3v2|`.mp3`|Header metadata musik|
|`00 00 00 18 66 74 79 70`|MP4 Video File|`.mp4`|Mengandung signature atom `ftyp`|
|`75 73 74 61 72`|POSIX Tar Archive|`.tar`|Berada di offset 0x101 (257 desimal)|

#### Pemeriksaan Manual Signature Byte

Bash

```
# 1. Deteksi berbasis libmagic sistem operasi
file suspicious_artifact.bin

# 2. Dump 16 byte awal untuk mencocokkan signature heksadesimal
xxd suspicious_artifact.bin | head -n 2

# Alternatif dengan hexdump format canonical
hexdump -C -n 32 suspicious_artifact.bin
```

---

### 1.3 Analisis Teks Mentah (`strings`)

Perintah `strings` membaca urutan karakter ASCII/Unicode yang dapat dicetak (_printable_) dari file biner.

Bash

```
# Pindai string dengan panjang minimal 8 karakter (mengurangi noise artefak biner)
strings -n 8 evidence.raw

# Pindai seluruh section biner tanpa diskriminasi data/code (-a)
strings -a evidence.raw | grep -Ei "flag\{|ctf\{|picoctf\{|htb\{"

# Cari indikasi URL atau alamat IP yang tertanam
strings evidence.raw | grep -E "https?://[a-zA-Z0-9./?=_-]+"

# Ekstraksi kemungkinan string ter-encode Base64 (panjang 24+ diakhiri '=')
strings evidence.raw | grep -E "[A-Za-z0-9+/]{24,}={0,2}"
```

---

### 1.4 Ekstraksi Metadata Menggunakan `exiftool`

Metadata menyimpan riwayat pembuatan file, perangkat kamera, perangkat lunak editor, hingga catatan pengembang.

Bash

```
# 1. Tampilkan seluruh metadata standar
exiftool image_evidence.jpg

# 2. Tampilkan seluruh tag metadata, termasuk tag tidak dikenal (-u) dan binary values (-a)
exiftool -a -u image_evidence.jpg

# 3. Filter spesifik koordinat GPS (Bisa dimasukkan ke Google Maps)
exiftool -GPS* image_evidence.jpg

# 4. Filter khusus atribut komentar (Sering menjadi tempat meletakkan flag)
exiftool -Comment -UserComment image_evidence.jpg
```

_Contoh Temuan Output Nyata:_

text

```
File Name                       : image_evidence.jpg
File Size                       : 142 kB
Camera Model Name               : Canon EOS 5D Mark IV
Date/Time Original              : 2024:02:15 14:22:01
User Comment                    : FLAG{m3t4d4t4_n3v3r_l13s_s0_ch3ck_1t}
GPS Position                    : 48 deg 51' 29.88" N, 2 deg 17' 40.20" E
```

---

### 1.5 Pemindaian File Tertanam Menggunakan `binwalk`

`binwalk` memindai file untuk mencari signature file lain yang tertanam di dalamnya (_carving target_).

Bash

```
# 1. Pindai keberadaan signature file lain di dalam file
binwalk challenge.bin

# 2. Ekstrak otomatis semua embedded files yang terdeteksi
binwalk -e challenge.bin

# 3. Ekstrak rekursif (jika di dalam ZIP terdapat file gambar yang berisi ZIP lagi)
binwalk -M -e challenge.bin

# 4. Analisis grafik entropi data (mendeteksi bagian terenkripsi/terkompresi)
binwalk -E challenge.bin
```

_Contoh Output Binwalk:_

text

```
DECIMAL       HEXADECIMAL     DESCRIPTION
--------------------------------------------------------------------------------
0             0x0             JPEG image data, JFIF standard 1.01
45120         0xB040          Zip archive data, at least v2.0 to extract, compressed size: 1024, name: secret_flag.txt
46200         0xB478          End of Zip archive, footer offset: 46200
```

_Interpretasi Hasil:_  
Mulai byte offset 45120 (Hex: `0xB040`), terdapat file ZIP yang sengaja disisipkan di dalam file gambar JPEG tersebut.

---

#### 1.5.1 💡 Cara Baca Output Binwalk: Mana yang Penting?

Pemula sering bingung saat membaca baris output `binwalk`. Berikut panduan praktisnya:

```text
DECIMAL    HEXADECIMAL    DESCRIPTION
0          0x0            PNG image, 800 x 600       <-- [1. FILE UTAMA] Skip, ini file container utama
3145728    0x300000       gzip compressed data       <-- [2. TARGET CARVING!] File tersembunyi!
3146200    0x3001D8       bzip2 compressed data      <-- [3. TARGET CARVING!] Periksa arsip ini
3146240    0x300200       Unix path: /usr/lib/...    <-- [4. FALSE POSITIVE] Hanya string teks biasa
```

**Aturan Main Membaca Output Binwalk:**
1. **Baris Pertama (Offset 0 / 0x0):** Merupakan file asli itu sendiri. Ini normal dan tidak perlu diekstrak terpisah.
2. **Baris Berikutnya (Offset > 0):** Menandakan ada payload atau file tersembunyi yang ditempelkan di belakang/dalam file. **Ini target utama kita!**
3. **Format Arsip/Gambar (`zip`, `gzip`, `png`, `jpeg`):** Indikasi kuat file tersembunyi asli. Langsung jalankan `binwalk -e <filename>`.
4. **`Unix path` / `Copyright` / `Zlib string`:** Sering kali hanyalah *false positive* (kebetulan susunan byte mirip string path). Jika `binwalk -e` tidak mengeluarkan apa-apa, abaikan baris-baris ini.

---

## 🗄️ BAGIAN 2: FILE FORENSICS & RECOVERY

### 2.1 Perbaikan File Rusak (_Corrupted File Header Repair_)

Skenario CTF umum: Diberikan file biner yang tidak bisa dibuka oleh image viewer atau PDF reader karena header sengaja dirusak oleh author soal.

#### Studi Kasus: Memperbaiki Magic Bytes PNG yang Rusak

File PNG resmi **harus** diawali dengan 8 byte: `89 50 4E 47 0D 0A 1A 0A`.

Bash

```
# 1. Periksa 16 byte pertama menggunakan xxd
xxd broken_image.png | head -n 1
# Output: 00000000: 00 00 00 00 0d 0a 1a 0a 00 00 00 0d 49 48 44 52  ............IHDR

# 2. Analisis: 4 byte pertama (00 00 00 00) rusak. Seharusnya: 89 50 4e 47.
# 3. Perbaiki 4 byte tersebut menggunakan Python 3 One-Liner langsung ke disk:
python3 -c '
with open("broken_image.png", "r+b") as f:
    f.seek(0)
    f.write(bytes([0x89, 0x50, 0x4E, 0x47]))
'

# 4. Validasi integritas struktur chunk PNG menggunakan pngcheck
pngcheck broken_image.png
# Output jika sukses: OK: broken_image.png (800x600, 32-bit RGB+alpha, non-interlaced, 98.2%).
```

---

### 2.2 File Carving: Mengekstrak File Tanpa Bantuan Struktur Direktori

Ketika filesystem rusak atau embedded files tidak terdeteksi utuh oleh `binwalk`, gunakan tool carving khusus:

Bash

```
# 1. Carving menggunakan Foremost (Mengekstrak otomatis berdasarkan header/footer database)
foremost -i evidence_dump.bin -o /tmp/foremost_output/

# Periksa hasil ekstraksi:
ls -la /tmp/foremost_output/
# Output direktori terpisah: /jpg /png /pdf /zip

# 2. Carving interaktif menggunakan PhotoRec (Sangat efektif untuk filesystem RAW yang corrupt)
photorec evidence_dump.bin
```

---

### 2.3 Ekstraksi Appended Data (Overlay) Menggunakan `dd`

File gambar sering kali ditempelkan payload arsip di akhir file. Format JPEG diakhiri oleh marker `FF D9`. Semua data setelah marker tersebut diabaikan oleh image viewer, tetapi tetap tersimpan di dalam file.

Bash

```
# 1. Cari letak marker EOF (End Of File) JPEG: FF D9
grep -aobP '\xFF\xD9' suspicious.jpg
# Contoh output: 52140:\xff\xd9 -> Artinya marker selesai pada byte ke-52140 + 2 = 52142

# 2. Potong dan ambil data tersembunyi yang ditempelkan di belakangnya (skip 52142 byte pertama)
dd if=suspicious.jpg of=extracted_payload.bin bs=1 skip=52142

# 3. Identifikasi jenis payload yang berhasil dipotong
file extracted_payload.bin
```

---

### 2.4 Analisis Alternate Data Streams (ADS) pada Image NTFS

NTFS mengizinkan stream data tambahan disematkan ke dalam metadata sebuah file tanpa mengubah ukuran utama file tersebut (`filename.txt:hidden_stream.zip`).

> 💡 **ANALOGI UNTUK PEMULA:**  
> Bayangkan file Word bernama `tugas.docx` — filesystem NTFS membolehkan kamu menyisipkan file ZIP tersembunyi di dalam file itu sendiri, tanpa ukurannya berubah sedikit pun di Windows Explorer!  
> File utama tetap tampil normal, tapi ada "kantong rahasia" di dalamnya.  
> *Cara akses manual di Windows:* `notepad tugas.docx:hidden.zip`

Jika menganalisis image disk Windows di Parrot OS menggunakan The Sleuth Kit (TSK):

Bash

```
# 1. Daftarkan isi direktori termasuk Alternate Data Streams (-l untuk long listing)
fls -r -p -m / ntfs_volume.dd | grep ":"

# Contoh Output TSK:
# r/rr 142-128-3: /Documents/memo.txt:flag.zip

# 2. Ekstrak data stream tersembunyi menggunakan nomor inode (142-128-3)
icat ntfs_volume.dd 142-128-3 > /tmp/recovered_flag.zip
```

---

## 🖼️ BAGIAN 3: IMAGE FORENSICS & STEGANOGRAFI

### 3.1 Least Significant Bit (LSB) Steganography

Pada gambar 24-bit RGB, setiap pixel memiliki 3 channel warna: Red (8-bit), Green (8-bit), dan Blue (8-bit). LSB menyembunyikan bit rahasia pada bit paling akhir (posisi 2<sup>0</sup>) dari nilai warna tiap byte. Perubahan nilai warna dari 255 (`11111111`) menjadi 254 (`11111110`) tidak dapat dideteksi oleh mata manusia.

> 💡 **ANALOGI VISUAL LSB:**  
> Setiap warna pixel dibuat dari 8-bit angka (0–255).  
> Mengubah bit paling ujung (bit terakhir / LSB) dari `11111111` (255) ke `11111110` (254) ibarat **mengurangi 1 tetes air dari 1 galon cat merah**. Warnanya tetap terlihat sama persis di layar, namun bit 0/1 terakhir di ribuan pixel tersebut dapat dikumpulkan untuk membentuk pesan rahasia!

#### Ekstraksi Otomatis dengan `zsteg` (Khusus format PNG dan BMP)

Bash

```
# Pindai seluruh variasi LSB channel, bit order, dan pixel layout
zsteg -a stego_target.png

# Filter langsung jika menemukan format string flag
zsteg -a stego_target.png | grep -Ei "flag\{|ctf\{"
```

#### Ekstraksi Manual Menggunakan Script Python

Jika tool otomatis gagal karena payload LSB memiliki susunan kustom (misal: hanya channel Red):

Python

```
#!/usr/bin/env python3
"""
lsb_extract.py - Ekstraksi LSB bit mentah dari channel Red gambar PNG.
"""
from PIL import Image

def extract_red_lsb(image_path, output_length=100):
    img = Image.open(image_path)
    pixels = list(img.getdata())
    
    extracted_bits = []
    for pixel in pixels:
        # Ambil nilai least significant bit dari channel Red
        r = pixel[0]
        extracted_bits.append(str(r & 1))
        
    # Gabungkan bit menjadi array byte (8 bit per karakter)
    bit_string = "".join(extracted_bits)
    byte_chunks = [bit_string[i:i+8] for i in range(0, output_length * 8, 8)]
    
    recovered_bytes = bytearray([int(b, 2) for b in byte_chunks])
    print("[+] Hasil Rekonstruksi Karakter LSB Awal:")
    print(recovered_bytes.decode(errors="ignore"))

if __name__ == "__main__":
    extract_red_lsb("stego_target.png", 64)
```

---

### 3.2 Ekstraksi Payload Menggunakan `steghide` (JPEG/WAV)

`steghide` mengamankan payload di dalam file JPEG, BMP, atau WAV menggunakan enkripsi dan embedding berbasis transformasi DCT (_Discrete Cosine Transform_).

Bash

```
# 1. Periksa informasi apakah terdapat artefak tertanam di dalam gambar
steghide info sample.jpg

# 2. Ekstrak data jika tidak menggunakan password (tekan Enter langsung)
steghide extract -sf sample.jpg

# 3. Ekstrak data jika password/passphrase diketahui
steghide extract -sf sample.jpg -p "SuperSecretPassphrase"
```

---

### 3.3 Validasi Struktur PNG Chunks

File PNG terdiri dari urutan blok terstruktur yang disebut _chunks_:

- `IHDR`: Chunk informasi dimensi, kedalaman bit, dan mode warna (harus chunk pertama).
- `IDAT`: Chunk kompresi data grafis murni.
- `tEXt` / `zTXt`: Chunk teks opsional (sering menyimpan komentar pengembang atau metadata).
- `IEND`: Chunk terminator penutup file.

Bash

```
# Validasi konsistensi nilai CRC pada masing-masing chunk PNG
pngcheck -vvt broken_chunks.png
```

_Jika output menampilkan:_  
`CRC error in IHDR chunk (computed 7a3b4c12, expected 00000000)`  
Artinya author soal sengaja memanipulasi dimensi lebar/tinggi gambar untuk menyembunyikan teks di luar canvas visual (_IHDR height tampering_).

---

## 🧠 BAGIAN 4: MEMORY FORENSICS (VOLATILITY 3)

RAM menyimpan data runtime: password plaintext, kunci enkripsi, sesi terminal aktif, koneksi jaringan, hingga malware yang didekripsi di memori.

> 💡 **KENAPA RAM MENYIMPAN PLAINTEXT PASSWORD & KREDENSIAL?**  
> Komputer (CPU) tidak bisa memproses data terenkripsi secara langsung. Saat pengguna login, membuka browser, atau menjalankan aplikasi, password & token harus didekripsi terlebih dahulu ke dalam RAM (tempat kerja aktif).  
> Akibatnya, selama aplikasi tersebut berjalan atau komputer belum di-reboot, password plaintext, session cookie, dan master key enkripsi akan tertinggal di dalam memory dump!

### 4.1 Instalasi dan Eksekusi Dasar Volatility 3

Volatility 3 tidak lagi memerlukan "profile" manual seperti Volatility 2. Arsitektur kernel dideteksi otomatis berdasarkan symbol tables.

Bash

```
# Format pemanggilan dasar Volatility 3:
vol -f <IMAGE_RAM> <PLUGIN_NAME>
```

---

### 4.2 Alur Analisis Memori RAM Windows (CTF Workflow)

Ikuti urutan analisis 10 tahap ini saat menganalisis memory dump:

text

```
[ MEMORY DUMP: mem.raw ]
           │
           ├─► [1. Info OS]        vol -f mem.raw windows.info
           ├─► [2. Proses Aktif]   vol -f mem.raw windows.pslist
           ├─► [3. Pohon Proses]   vol -f mem.raw windows.pstree
           ├─► [4. Command Line]   vol -f mem.raw windows.cmdline
           ├─► [5. Sesi Jaringan]  vol -f mem.raw windows.netscan
           ├─► [6. File Memori]    vol -f mem.raw windows.filescan
           ├─► [7. Dump File]      vol -f mem.raw windows.dumpfiles --virtaddr <ADDR>
           ├─► [8. Kredensial]     vol -f mem.raw windows.hashdump
           ├─► [9. Clipboard]      vol -f mem.raw windows.clipboard
           └─► [10. Injeksi Kode]  vol -f mem.raw windows.malfind
```

---

### 4.3 Tabel Referensi Plugin Volatility 3 (Windows)

|Kategori Investigasi|Nama Plugin Volatility 3|Contoh Perintah Praktis|Fokus Artefak Analisis|
|---|---|---|---|
|**Identifikasi Sistem**|`windows.info`|`vol -f mem.raw windows.info`|Mengetahui kernel build, arsitektur, dan waktu dump RAM|
|**Daftar Proses**|`windows.pslist`|`vol -f mem.raw windows.pslist`|Menampilkan seluruh proses, PID, PPID, dan waktu inisiasi|
|**Pohon Proses**|`windows.pstree`|`vol -f mem.raw windows.pstree`|Mengidentifikasi proses anak (_child process_) yang mencurigakan|
|**Argumen Eksekusi**|`windows.cmdline`|`vol -f mem.raw windows.cmdline`|Membaca perintah terminal lengkap yang dijalankan user/attacker|
|**Koneksi Jaringan**|`windows.netscan`|`vol -f mem.raw windows.netscan`|Menemukan IP C2, port listening, dan soket koneksi aktif|
|**Pemindaian File**|`windows.filescan`|`vol -f mem.raw windows.filescan`|Mencari pointer file object di memori (misal: mencari `flag.txt`)|
|**Ekstraksi File**|`windows.dumpfiles`|`vol -f mem.raw windows.dumpfiles --virtaddr 0xca80...`|Mengambil file fisik langsung dari cache memori RAM|
|**Dump Hash Akun**|`windows.hashdump`|`vol -f mem.raw windows.hashdump`|Ekstraksi hash password NTLM lokal dari registry SAM|
|**Clipboard History**|`windows.clipboard`|`vol -f mem.raw windows.clipboard`|Membaca data yang terakhir di-copy/paste oleh user|
|**Deteksi Injeksi**|`windows.malfind`|`vol -f mem.raw windows.malfind`|Mencari memory segment beralamat `PAGE_EXECUTE_READWRITE`|
|**Environment Vars**|`windows.envars`|`vol -f mem.raw windows.envars --pid 1044`|Membaca environment variable (sering menyimpan token API)|

---

### 4.4 Skenario Nyata Investigasi Memory Dump

Bash

```
# Tentukan variabel target file
MEMORY_FILE="victim_memory.raw"

# Langkah 1: Pindai proses terminal yang mencurigakan (powershell.exe / cmd.exe)
vol -f $MEMORY_FILE windows.cmdline
```

_Contoh Temuan Output:_

text

```
PID     Process         Args
--------------------------------------------------------------------------------
3420    powershell.exe  powershell.exe -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA...
```

_Interpretasi Hasil:_  
Proses PowerShell dijalankan dengan payload ter-encode Base64. Decode string Base64 tersebut untuk membaca perintah aslinya.

Bash

```
# Langkah 2: Mencari lokasi file flag atau dokumen rahasia di cache memori
vol -f $MEMORY_FILE windows.filescan | grep -Ei "flag|secret|desktop"
```

_Contoh Temuan Output:_

text

```
0xd0042f8819a0  \Users\Admin\Desktop\confidential_flag.txt.enc
```

Bash

```
# Langkah 3: Ekstrak file tersebut dari RAM ke disk menggunakan virtual address yang ditemukan
vol -f $MEMORY_FILE windows.dumpfiles --virtaddr 0xd0042f8819a0
# File hasil ekstraksi akan tersimpan di direktori saat ini: file.0xd0042f8819a0.0x...dat
```

---

### 4.5 🐧 Analisis Memori RAM Linux (Linux Memory Analysis)

Beberapa challenge CTF memberikan memory dump dari sistem Linux (`.raw` / `.img`). Plugin Volatility 3 untuk Linux menggunakan prefix `linux.` yang berbeda dari Windows (`windows.`):

|Kategori Investigasi|Nama Plugin Volatility 3|Contoh Perintah Praktis|Fokus Artefak Analisis|
|---|---|---|---|
|**Riwayat Bash**|`linux.bash`|`vol -f linux_mem.raw linux.bash`|**Riwayat perintah terminal bash!** (Sering memuat flag/password)|
|**Daftar Proses**|`linux.pslist`|`vol -f linux_mem.raw linux.pslist`|Menampilkan seluruh proses Linux aktif, PID, dan PPID|
|**Pohon Proses**|`linux.pstree`|`vol -f linux_mem.raw linux.pstree`|Mengidentifikasi hubungan proses induk dan anak|
|**Koneksi Jaringan**|`linux.netstat`|`vol -f linux_mem.raw linux.netstat`|Melihat koneksi socket TCP/UDP yang sedang terhubung|
|**File Terbuka**|`linux.lsof`|`vol -f linux_mem.raw linux.lsof`|Menampilkan daftar file yang sedang dibuka oleh setiap proses|
|**Environment Vars**|`linux.envars`|`vol -f linux_mem.raw linux.envars`|Membaca variabel lingkungan sistem (misal: `FLAG=...`, API Key)|
|**Kernel Modules**|`linux.lsmod`|`vol -f linux_mem.raw linux.lsmod`|Mengecek kernel module / rootkit yang dimuat ke memori|

```bash
# Contoh Triage Cepat RAM Linux:
# 1. Cek riwayat command bash yang paling sering menyimpan flag
vol -f linux_mem.raw linux.bash

# 2. Pindai variabel lingkungan untuk menemukan token/flag
vol -f linux_mem.raw linux.envars | grep -Ei "flag|ctf|secret"
```

---

## 💾 BAGIAN 5: DISK FORENSICS & FILESYSTEM ANALYSIS

### 5.1 Penanganan Raw Disk Image (`.img`, `.dd`, `.raw`)

Jangan pernah melakukan mounting filesystem barang bukti dengan hak akses baca-tulis (_read-write_).

Bash

```
# 1. Periksa tabel partisi disk image untuk melihat sector offset
fdisk -l physical_disk.img
```

_Contoh Output:_

text

```
Device              Boot Start     End Sectors  Size Id Type
physical_disk.img1        2048  2097151 2095104 1023M 83 Linux
```

_Kalkulasi Offset Mount:_  
Start Sector = `2048`. Ukuran 1 sector standar = `512` byte.  
- **Formula:** `Byte Offset = Start Sector × Sector Size`  
- **Kalkulasi:** `2048 × 512 = 1,048,576` bytes

> 💡 **ANALOGI SLACK SPACE:**  
> Bayangkan kamu menyewa loker penyimpanan berukuran 4 KB (cluster). Kamu menyimpan surat kecil berukuran 1 KB. Sisa 3 KB ruangan loker tersebut tetap milik file itu tapi tidak terpakai (*slack space*). Penyerang bisa menyembunyikan data di sisa 3 KB ini tanpa mengubah ukuran resmi file di filesystem!

Bash

```
# 2. Buat mount point lokal
sudo mkdir -p /mnt/forensics_disk

# 3. Mount partisi secara READ-ONLY menggunakan kalkulasi offset
sudo mount -o loop,ro,offset=1048576 physical_disk.img /mnt/forensics_disk

# 4. Akses data secara aman
ls -la /mnt/forensics_disk
```

---

### 5.2 Analisis Struktur File Menggunakan The Sleuth Kit (TSK)

TSK membaca filesystem tanpa memerlukan proses mounting ke kernel Linux:

Bash

```
# 1. Tampilkan informasi teknis filesystem (Block size, Inode range)
fsstat -o 2048 physical_disk.img

# 2. Daftarkan seluruh file dan direktori secara rekursif
# Flag: -r (rekursif), -p (tampilkan path lengkap), -d (HANYA tampilkan file yang telah DIHAPUS)
fls -o 2048 -r -p -d physical_disk.img
```

_Contoh Output:_

text

```
d/d * 14221: /var/backups/flag_backup.txt.bak
```

Tanda `*` dan label `d/d` menandakan file telah dihapus (_deleted inode_). Angka `14221` adalah nomor inodenya.

Bash

```
# 3. Pulihkan (carve) file yang telah dihapus menggunakan nomor inodenya
icat -o 2048 physical_disk.img 14221 > recovered_flag.txt
cat recovered_flag.txt
```

---

### 5.3 Menjalankan Kasus Menggunakan Autopsy (GUI)

Autopsy menyediakan antarmuka analisis berbasis grafis:

Bash

```
# Jalankan engine Autopsy dari terminal
sudo autopsy
```

1. Buka browser pada URL yang diberikan: `http://localhost:9999/autopsy`.
2. Klik **New Case**, beri nama investigasi.
3. Klik **Add Host** -> **Add Image** -> Masukkan path absolut file `.img`.
4. Pilih tipe image: _Disk_ atau _Partition_.
5. Manfaatkan fitur visual:
    - **Keyword Search:** Eksekusi pencarian string global (seperti `FLAG{`).
    - **Deleted Files:** Autopsy memetakan file yang inodenya belum tertimpa.
    - **File Analysis:** Melihat timeline MACB (_Modified, Accessed, Changed, Born_).

---

## 📜 BAGIAN 6: LOG ANALYSIS & AUDIT TRAIL

### 6.1 Analisis Log Linux (`/var/log`)

Log sistem Linux menyimpan jejak teks terstruktur yang dapat disaring menggunakan kombinasi utilitas pipeline Linux.

Bash

```
# Kasus 1: Mencari 10 IP Address yang paling sering mengirimkan traffic ke Web Server
awk '{print $1}' /var/log/apache2/access.log | sort | uniq -c | sort -nr | head -n 10

# Kasus 2: Deteksi percobaan login brute-force SSH yang gagal
grep "Failed password" /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -nr

# Kasus 3: Lacak riwayat aktivitas perintah terminal user tertentu
cat /home/target_user/.bash_history | grep -Ei "flag|sudo|chmod|curl|wget"
```

---

### 6.2 Analisis Windows Event Logs (`.evtx`)

Di Parrot OS, ekstrak file biner log Windows `.evtx` menjadi teks terstruktur menggunakan library `python-evtx`:

Bash

```
# Parse file Security.evtx menjadi representasi XML/teks
evtx_dump.py Security.evtx > parsed_security_log.txt

# Cari aktivitas spesifik berdasarkan Event ID
grep -E "<EventID>4624</EventID>|<EventID>4625</EventID>" -A 10 parsed_security_log.txt
```

#### Event ID Windows Penting dalam Investigasi:

- **Event ID 4624:** _Successful Logon_ (Identifikasi user, domain, dan tipe logon; Logon Type 10 = RDP, Logon Type 3 = Network Share).
- **Event ID 4625:** _Failed Logon_ (Indikasi serangan brute-force atau salah kredensial).
- **Event ID 4688:** _New Process Creation_ (Mencatat eksekusi file `.exe`, command line argument).
- **Event ID 4720:** _User Account Created_ (Tindakan _persistence_ penyerang membuat backdoor user).
- **Event ID 7045:** _Service Installed_ (Indikasi pemasangan persistent service).
- **Event ID 1102:** _The Audit Log was Cleared_ (Upaya penghilangan jejak forensik).

---

## 🌐 BAGIAN 7: PCAP & NETWORK TRAFFIC FORENSICS

### 7.1 Triage Cepat Network Capture

Bash

```
# 1. Pindai cepat keberadaan string plaintext di seluruh paket PCAP
strings capture.pcap | grep -Ei "flag\{|ctf\{|password=|user="

# 2. Tampilkan hierarki protokol jaringan untuk melihat dominasi traffic
tshark -r capture.pcap -q -z io,phs
```

---

### 7.2 Wireshark Workflow

1. **Display Filter Sintaks Krusial:**
    - `http.request.method == "POST"`: Memeriksa submission data form web (sering memuat password/flag).
    - `frame contains "FLAG"`: Memindai payload mentah paket yang mengandung string kunci.
    - `tcp.stream eq 2`: Mengisolasi percakapan TCP tunggal pada stream index ke-2.
    - `dns.flags.response == 0`: Memeriksa request DNS keluar (identifikasi data exfiltration/DNS tunneling).
2. **Follow TCP / HTTP Stream:**
    - Klik kanan pada paket TCP/HTTP yang mencurigakan -> Pilih **Follow** -> **TCP Stream**.
    - Dialog akan merekonstruksi seluruh sesi data komunikasi antara client dan server secara utuh.
3. **Ekstraksi File dari Traffic Jaringan (_Export Objects_):**
    - Pilih menu: `File` -> `Export Objects` -> `HTTP...` (atau `SMB...`, `FTP-DATA...`).
    - Seluruh dokumen, gambar, atau executable yang ditransfer melalui koneksi tidak terenkripsi dapat langsung disimpan ke disk.

---

### 7.3 Otomasi Pemrosesan Traffic Menggunakan `tshark` CLI

Bash

```
# 1. Ekstrak seluruh URI Request HTTP yang dikunjungi
tshark -r traffic.pcap -Y "http.request" -T fields -e ip.src -e http.request.method -e http.request.full_uri

# 2. Ekstrak file yang ditransfer via protokol HTTP langsung dari terminal
tshark -r traffic.pcap --export-objects "http,/tmp/extracted_pcap_files/"

# 3. Deteksi DNS Exfiltration (Ekstraksi query subdomain yang tidak wajar)
tshark -r traffic.pcap -Y "dns.flags.response == 0" -T fields -e dns.qry.name | sort -u
```

---

### 7.4 Ekstraksi Kredensial Protokol Cleartext

Bash

```
# 1. Kredensial HTTP Basic Authentication (Format Header: Authorization: Basic <base64>)
tshark -r traffic.pcap -Y "http.authorization" -T fields -e http.authorization | while read auth; do
    echo "$auth" | awk '{print $2}' | base64 -d
    echo ""
done

# 2. Kredensial FTP (Plaintext)
tshark -r traffic.pcap -Y "ftp.request.command == 'USER' || ftp.request.command == 'PASS'" -T fields -e ftp.request.command -e ftp.request.arg
```

---

## 🗺️ BAGIAN 8: DECISION TREE FORENSICS CTF

text

```
                        [ FILE ARTEFAK CTF DITERIMA ]
                                      │
                                      ▼
                        [ EKSEKUSI TRIAGE CEPAT ]
                     file, xxd, strings, exiftool, binwalk
                                      │
         +----------------------------+----------------------------+
         │                                                         │
         ▼                                                         ▼
{ Jenis File Teridentifikasi }                             { Format Tidak Dikenal / }
         │                                                 {   Magic Bytes Rusak    }
         │                                                         │
         │                                                         ▼
         │                                            [ Buka Hex Editor / xxd ]
         │                                            Cocokkan dengan Tabel Magic Bytes
         │                                            Patch byte header menggunakan Python
         │                                                         │
         +────────────────────────────┬────────────────────────────+
                                      │
    ┌─────────────────┬───────────────┴───┬─────────────────┬─────────────────┐
    │                 │                   │                 │                 │
    ▼                 ▼                   ▼                 ▼                 ▼
[ IMAGE FILE ]  [ MEMORY DUMP ]     [ DISK IMAGE ]      [ PCAP CAPTURE ]  [ LOG AUDIT ]
 (.png, .jpg)    (.raw, .mem)        (.img, .dd)         (.pcap, .pcapng)  (.log, .evtx)
    │                 │                   │                 │                 │
    ├─ exiftool       ├─ windows.info     ├─ fdisk -l       ├─ strings (quick)├─ grep/awk
    ├─ zsteg (PNG)    ├─ windows.pstree   ├─ mount -o loop  ├─ tshark io,phs  ├─ EventID
    ├─ steghide (JPG) ├─ windows.cmdline  ├─ fls -r -p -d   ├─ Follow TCP     └─ IP freq
    ├─ strings grep   ├─ windows.filescan ├─ icat <inode>   ├─ Export Objects
    └─ binwalk -e     └─ windows.dumpfiles└─ Autopsy        └─ DNS tunnel check
         │                 │                   │                 │                 │
         └─────────────────┴───────────────┬───┴─────────────────┴─────────────────┘
                                           │
                                           ▼
                                [ EKSTRAKSI ARTEFAK ]
                                           │
                                           ▼
                                [ FLAG DIEKSEKUSI ]
                                 FLAG{...} / CTF{...}
```

---

## 🎯 BAGIAN 9: 14 COMMON CTF FORENSICS PATTERNS

### Pattern 1: Flag Disembunyikan di EXIF Metadata Comment

- **Indikasi:** Diberikan file foto asli kamera tanpa keanehan biner.
- **Perintah:**
    
    Bash
    
    ```
    exiftool challenge.jpg | grep -Ei "comment|description|artist|copyright"
    ```
    

---

### Pattern 2: Hidden Archive Di Belakang Gambar (Appended File Carving)

- **Indikasi:** Ukuran gambar besar (misal 5MB untuk icon kecil); `binwalk` mendeteksi ZIP/RAR.
- **Perintah:**
    
    Bash
    
    ```
    binwalk -e challenge.png
    # Navigasi ke folder ekstraksi:
    cd _challenge.png.extracted && ls -la
    ```
    

---

### Pattern 3: Least Significant Bit (LSB) pada Format PNG

- **Indikasi:** Gambar PNG yang tampak normal namun tidak memiliki metadata mencurigakan.
- **Perintah:**
    
    Bash
    
    ```
    zsteg -a stego_target.png | grep -E "CTF|FLAG"
    ```
    

---

### Pattern 4: Arsip ZIP Terproteksi Password di Dalam Gambar

- **Indikasi:** Carving menghasilkan file ZIP yang meminta password saat di-unzip.
- **Perintah:**
    
    Bash
    
    ```
    # 1. Ekstrak hash dari arsip ZIP
    zip2john extracted_archive.zip > zip.hash

    # 2. Crack password menggunakan dictionary attack (rockyou.txt)
    john --wordlist=/usr/share/wordlists/rockyou.txt zip.hash

    # 3. Jika rockyou.txt GAGAL, coba alternatif strategi berikut:

    # A) Wordlist custom dari deskripsi challenge/situs web:
    cewl http://target.com -d 2 -m 5 > custom.txt
    john --wordlist=custom.txt zip.hash

    # B) Hashcat dengan mask attack (misal: 6 karakter alfanumerik):
    hashcat -m 17210 zip.hash -a 3 ?a?a?a?a?a?a

    # C) Cek apakah password tersembunyi di artefak lain (EXIF comment / hint soal):
    # - Run: exiftool -Comment challenge.jpg
    # - Run: strings -n 6 challenge.jpg | grep -i password
    ```
    

---

### Pattern 5: Flag Tersimpan pada Clipboard Memori RAM

- **Indikasi:** Diberikan memory dump Windows (`.raw`); user sempat menyalin flag saat sesi aktif.
- **Perintah:**
    
    Bash
    
    ```
    vol -f memory.raw windows.clipboard
    ```
    

---

### Pattern 6: Kredensial Plaintext Berada di Terminal History Memori

- **Indikasi:** Memory dump Windows; penyerang mengeksekusi script PowerShell atau CMD.
- **Perintah:**
    
    Bash
    
    ```
    vol -f memory.raw windows.cmdline
    ```
    

---

### Pattern 7: Flag Dikirimkan Melalui HTTP POST Parameter

- **Indikasi:** Diberikan file capture jaringan `.pcap`.
- **Perintah:**
    
    Bash
    
    ```
    tshark -r capture.pcap -Y "http.request.method == 'POST'" -T fields -e http.file_data
    ```
    

---

### Pattern 8: Eksfiltrasi Data Menggunakan DNS Tunneling

- **Indikasi:** Ribuan query DNS menuju subdomain yang panjang dan ter-encode (Hex atau Base64).
- **Perintah:**
    
    Bash
    
    ```
    # Ambil seluruh subdomain query, gabungkan, dan decode
    tshark -r capture.pcap -Y "dns.flags.response == 0" -T fields -e dns.qry.name | \
        awk -F'.' '{print $1}' | tr -d '\n' | xxd -r -p
    ```
    

---

### Pattern 9: Payload atau Flag Tersimpan dalam Web Log Ter-encode

- **Indikasi:** Log file server memuat query string URL encoding (`%20`, `%27`, dll).
- **Perintah:**
    
    Bash
    
    ```
    python3 -c '
    import urllib.parse, sys
    for line in open("access.log"):
        if "flag" in line.lower() or "select" in line.lower():
            print(urllib.parse.unquote(line.strip()))
    '
    ```
    

---

### Pattern 10: Magic Bytes PNG Sengaja Dirusak

- **Indikasi:** File biner tidak bisa dibuka oleh image viewer, tetapi strings menampilkan kata `IHDR` dan `IDAT`.
- **Perintah:**
    
    Bash
    
    ```
    # Timpa 8 byte pertama dengan standar resmi PNG
    python3 -c '
    with open("corrupted.png", "r+b") as f:
        f.seek(0)
        f.write(b"\x89PNG\r\n\x1a\n")
    '
    ```
    

---

### Pattern 11: File Dihapus dari Disk Image

- **Indikasi:** Disk image Linux/Windows; file target tidak ditemukan pada direktori aktif.
- **Perintah:**
    
    Bash
    
    ```
    # Tampilkan hanya file yang telah dihapus
    fls -r -d disk.img
    # Ambil konten file berdasarkan inodenya (misal inode 3125)
    icat disk.img 3125 > recovered_flag.txt
    ```
    

---

### Pattern 12: Multi-Layer Encoding di Dalam Gambar

- **Indikasi:** Metadata atau output LSB menghasilkan teks acak berakhiran `==` (Base64).
- **Perintah:**
    
    Bash
    
    ```
    zsteg -E "b1,bgr,lsb,xy" target.png | base64 -d
    ```
    

---

### Pattern 13: File Polyglot (JPEG Sekaligus Valid ZIP)

- **Indikasi:** File dapat dibuka sempurna sebagai gambar JPEG, namun memiliki struktur arsip internal.
- **Perintah:**
    
    Bash
    
    ```
    # Coba ekstraksi langsung menggunakan utilitas unzip standar
    unzip polyglot.jpg -d /tmp/extracted_polyglot/
    ```
    

---

### Pattern 14: Data Diletakkan pada Filesystem Slack Space

- **Indikasi:** Metadata filesystem menunjukkan perbedaan signifikan antara ukuran fisik cluster dan ukuran file riil.
- **Perintah:**
    
    Bash
    
    ```
    # Gunakan blkls dari Sleuthkit untuk mengekstrak unallocated space
    blkls disk.img > unallocated_space.raw
    strings -n 8 unallocated_space.raw | grep -Ei "FLAG\{|CTF\{"
    ```
    

---

## ⚠️ BAGIAN 10: COMMON ERRORS & TROUBLESHOOTING

|No|Gejala Error / Kendala|Penyebab Utama|Solusi Tindakan Penyelesaian|
|---|---|---|---|
|1|`binwalk -e` menghasilkan direktori kosong|False positive signature atau data terenkripsi|Gunakan carving tool lain: `foremost -i file` atau cek entropy visual via `binwalk -E`.|
|2|Volatility 3: `No suitable context or plugin`|Format memory dump salah atau OS tidak terdeteksi|Jalankan `vol -f mem.raw windows.info` terlebih dahulu untuk memastikan kernel memory valid.|
|3|`steghide: could not extract any data`|Passphrase salah atau metode embedding berbeda|Jalankan wordlist attack pada passphrase: `stegcracker target.jpg /usr/share/wordlists/rockyou.txt`.|
|4|Mounting disk image gagal: `wrong fs type, bad option`|Partisi tidak diawali pada offset 0 fisik|Gunakan perintah `fdisk -l` untuk menghitung: Start Sector×512Start Sector×512, lalu tambahkan parameter `offset=N`.|
|5|Output `strings` terlalu masif (ratusan ribu baris)|Nilai minimum default terlalu pendek (4 byte)|Tingkatkan filter panjang minimal karakter: `strings -n 12 file.bin \| grep -E ...`.|
|6|Image viewer: `Fatal error: Not a valid PNG/JPEG`|Magic bytes awal terpotong atau rusak|Periksa byte header via `xxd file \| head -n 1`, lalu sesuaikan dengan tabel magic bytes.|
|7|Wireshark: Banyak paket bertanda `[Malformed Packet]`|Paket terpotong (_truncated snaplen_) atau protokol proprietary|Klik kanan paket -> **Decode As...** -> Pilih parser protokol yang sesuai secara manual.|
|8|`icat` menghasilkan output file 0 byte|Data blocks pada inode telah tertimpa (_overwritten_)|Gunakan metode carving mentah berbasis signature: `photorec` atau `foremost`.|
|9|`zsteg: command not found`|Ruby gem belum masuk ke dalam PATH sistem|Panggil path lengkap gem: `~/.local/share/gem/ruby/X.X.0/bin/zsteg` atau install sistem `sudo gem install zsteg`.|
|10|Ekstraksi file ZIP via `unzip` menghasilkan `unsupported compression`|Menggunakan zip header tampering atau kompresi modern|Ekstrak menggunakan 7-Zip: `7z x archive.zip`.|
|11|Volatility 3 sangat lambat saat mengeksekusi plugin|File dump berukuran besar dipindai tanpa batasan|Gunakan opsi filter PID spesifik jika target proses telah diketahui: `--pid <PID>`.|
|12|Autopsy tidak bisa memproses data source RAW|User tidak memiliki hak baca file disk image|Berikan izin baca pada file: `chmod +r disk.img` atau jalankan daemon autopsy dengan sudo.|

---

## 📑 BAGIAN 11: CHEATSHEET FORENSICS

### 11.1 Quick Command Reference (Copy-Paste Ready)

Jalankan ini di awal sesi terminal untuk mengatur target artefak:

Bash

```
FILE="target_challenge.bin"
MEMORY_FILE="dump_memory.raw"
PCAP_FILE="network_traffic.pcap"
```

#### 1. Initial Triage (5 Perintah Wajib)

Bash

```
file $FILE                                            # 1. Identifikasi tipe biner
xxd $FILE | head -n 2                                 # 2. Cek magic bytes
strings -n 8 $FILE | grep -Ei "flag\{|ctf\{"          # 3. Pindai plaintext flag
exiftool $FILE                                        # 4. Tampilkan seluruh metadata
binwalk $FILE                                         # 5. Pindai embedded files
```

#### 2. Image & Stego Analysis

Bash

```
zsteg -a $FILE                                        # Pindai seluruh channel LSB (PNG)
steghide info $FILE                                   # Cek enkripsi Steghide (JPG)
steghide extract -sf $FILE -p ""                      # Ekstrak Steghide tanpa password
pngcheck -vvt $FILE                                   # Cek integritas chunk PNG
exiftool -Comment $FILE                               # Baca metadata comment
```

#### 3. Volatility 3 Memory Forensics

Bash

```
vol -f $MEMORY_FILE windows.info                      # Identifikasi kernel Windows
vol -f $MEMORY_FILE windows.pstree                    # Tampilkan hierarki proses
vol -f $MEMORY_FILE windows.cmdline                   # Tampilkan riwayat terminal proses
vol -f $MEMORY_FILE windows.netscan                   # Tampilkan socket koneksi aktif
vol -f $MEMORY_FILE windows.filescan | grep "flag"    # Pindai pointer file flag
vol -f $MEMORY_FILE windows.clipboard                 # Ekstrak data clipboard aktif
vol -f $MEMORY_FILE windows.hashdump                  # Ekstrak password hash NTLM
```

#### 4. File Carving & Recovery

Bash

```
binwalk -e $FILE                                      # Ekstraksi otomatis binwalk
foremost -i $FILE -o /tmp/carved_output/              # File carving terstruktur
fls -r -p -d $FILE                                    # List deleted files pada disk image
icat $FILE <INODE> > recovered_file                   # Recover file by inode
```

#### 5. Network Traffic Analysis (PCAP)

Bash

```
tshark -r $PCAP_FILE -q -z io,phs                     # Hierarki protokol traffic
tshark -r $PCAP_FILE -Y "http.request" -T fields -e http.request.full_uri # List URL
tshark -r $PCAP_FILE --export-objects "http,/tmp/out" # Ekstraksi file via HTTP
strings $PCAP_FILE | grep -Ei "flag\{|password="      # Pindai string mentah di PCAP
```

---

### 11.2 Alur Triage 5-Menit Pertama

Simpan instruksi berikut sebagai fungsi alias bash di `~/.bashrc` untuk menjalankan automasi triage 5 menit pertama secara instan:

Bash

```
quick_triage() {
    local TARGET="$1"
    if [ -z "$TARGET" ]; then
        echo "Usage: quick_triage <filename>"
        return 1
    fi
    echo "==================== [1. FILE SIGNATURE] ===================="
    file "$TARGET"
    echo "==================== [2. MAGIC BYTES] ======================="
    xxd "$TARGET" | head -n 2
    echo "==================== [3. EXIF METADATA] ====================="
    exiftool "$TARGET" | grep -Ei "comment|description|artist|gps|make|model"
    echo "==================== [4. EMBEDDED FILES] ===================="
    binwalk "$TARGET"
    echo "==================== [5. PLAINTEXT FLAG HUNT] ==============="
    strings -n 6 "$TARGET" | grep -Ei "flag\{|ctf\{|picoctf\{|htb\{" | head -n 10
    echo "============================================================="
}
```

---

### 11.3 🎯 Cara Verify Flag yang Ditemukan

Pemula sering kali menemukan string acak yang mencurigakan tetapi bingung apakah itu flag asli atau bukan. Gunakan metode verifikasi berikut:

#### 1. Format Flag CTF Standar
Cari prefix atau pembungkus kurung kurawal khas CTF:
- `FLAG{...}` atau `flag{...}`
- `CTF{...}` atau `ctf{...}`
- `HTB{...}`, `picoCTF{...}`, `DUCTF{...}`, `SECCON{...}`

#### 2. Identifikasi String Ter-encode / Terselubung
Jika string tampak acak tanpa format `FLAG{...}`, periksa pola karakter:
- **Diakhiri `=` atau `==`:** Kemungkinan kuat ter-encode **Base64**.
- **Hanya Uppercase `A-Z` dan angka `2-7`:** Kemungkinan **Base32**.
- **Hanya Karakter Hexadecimal `0-9, a-f`:** Kemungkinan **Hex / ASCII bytes**.
- **Format mirip `FYNQ{grfg}` (struktur flag tapi huruf teracak):** Kemungkinan **ROT13 / Caesar Cipher**.

#### 3. Quick Decode Pipeline (One-Liners Ready)

```bash
# Decode Base64:
echo "c3RyaW5n" | base64 -d

# Decode Hex:
echo "737472696e67" | xxd -r -p

# Decode ROT13 (Misal FYNQ{...} -> FLAG{...}):
echo "FYNQ{grfg}" | tr 'A-Za-z' 'N-ZA-Mn-za-m'

# Decode Base32:
echo "MZXW6YTBOI======" | base32 -d
```

---

## 🔄 RELASI MODUL & LANGKAH BERIKUTNYA

text

```
[ FILE 53: CRYPTO IDENTIFICATION ]
(Identifikasi algoritma, cipherteks, dan skema encoding)
                   │
                   ▼
[ FILE 54: HASH CRACKING WORKFLOW ]
(Memecahkan password hash yang ditemukan pada artefak memory/disk)
                   │
                   ▼
[ FILE 55: FORENSICS WORKFLOW ] <--- (ANDA BERADA DI SINI)
(Mengekstrak artefak dari memori, disk, network, dan file corrupt)
                   │
                   ▼
[ FILE 56: ADVANCED STEGANOGRAPHY & DATA HIDING ]
(Mendalami teknik steganografi tingkat lanjut: audio stego, custom LSB bit-shifting,
color palette manipulation, dan hidden carrier channel)
```

- **Kapan Mengakhiri Analisis di File 55:** Jika flag ditemukan langsung dari metadata, hasil carving arsip, perbaikan magic bytes, dump memori Volatility, atau ekstraksi traffic PCAP.
- **Kapan Harus Melanjutkan ke File 56 (Steganography):** Jika file gambar, audio, atau video telah terbukti valid dan bersih dari embedded files (tidak ada zip/payload yang ditempel), namun data flag masih disembunyikan menggunakan teknik manipulasi domain frekuensi audio, modifikasi palette index, atau algoritma steganografi kustom yang memerlukan visual tools mendalam (_pixel manipulation_).

---

# [🧭 BAGIAN 0: FONDASI FORENSICS](/docs/forensics) — Complete Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET_FILE="challenge.bin"   # Ganti sesuai file yang diterima
export WORK_DIR=~/forensics_loot
mkdir -p $WORK_DIR/{extracted,carved,memory,pcap,creds,keys,logs}
cd $WORK_DIR

echo "[*] Working directory: $WORK_DIR"
echo "[*] Target file: $TARGET_FILE"
```

**Output yang diharapkan:**

text

```
[*] Working directory: /root/forensics_loot
[*] Target file: challenge.bin
```

---

## ═══════════════════════════════════════

## FASE 0: TRIAGE AWAL — IDENTIFIKASI FILE

## ═══════════════════════════════════════

> **Tujuan:** Kenali jenis file SEBELUM menggunakan tool berat. Sebagian besar CTF easy selesai di fase ini. Jangan skip.

### Langkah 0.1 — Identifikasi Tipe File (Bukan dari ekstensi!)

Bash

```
# Command 1: Identifikasi berbasis magic bytes (paling akurat)
file $TARGET_FILE

# Command 2: Cek 32 byte pertama secara manual
xxd $TARGET_FILE | head -n 2

# Command 3: Alternatif hexdump
hexdump -C -n 32 $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — File teridentifikasi normal:**

text

```
challenge.bin: PNG image data, 800 x 600, 8-bit/color RGB, non-interlaced
```

➡️ **Kesimpulan:** File adalah PNG. Lanjut ke **Langkah 0.2**, kemudian masuk **Fase 3 (Image Forensics)**.

**OUTPUT BERHASIL ✅ — Memory dump:**

text

```
challenge.bin: data
```

Dan xxd menunjukkan:

text

```
00000000: 4d5a 4b45 524e 454c 2d44 554d 5000 0000  MZKERNEL-DUMP...
```

➡️ **Kesimpulan:** Kemungkinan memory dump. Lanjut ke **Fase 4 (Memory Forensics)**.

**OUTPUT BERHASIL ✅ — PCAP:**

text

```
challenge.bin: pcap capture file, microsecond ts (little-endian) - version 2.4
```

➡️ **Kesimpulan:** File adalah network capture. Lanjut ke **Fase 7 (PCAP Analysis)**.

**OUTPUT GAGAL ❌ — File tidak teridentifikasi / "data":**

text

```
challenge.bin: data
```

➡️ Magic bytes mungkin rusak atau file diobfuscate. Lanjut ke **Langkah 0.2** untuk inspeksi manual.

**OUTPUT GAGAL ❌ — File teridentifikasi tapi ekstensi berbeda:**

text

```
challenge.png: JPEG image data, JFIF standard 1.01
```

➡️ Ekstensi dipalsukan. Catat tipe aslinya, proses sesuai tipe asli (JPEG bukan PNG).

---

### Langkah 0.2 — Cocokkan Magic Bytes Manual

Bash

```
# Lihat 16 byte pertama
xxd $TARGET_FILE | head -n 1
```

**Tabel Magic Bytes — Cocokkan Output:**

|Magic Bytes yang Terlihat|Format Asli|Langkah Selanjutnya|
|---|---|---|
|`89 50 4E 47 0D 0A 1A 0A`|PNG|→ Fase 3 (Image)|
|`FF D8 FF`|JPEG|→ Fase 3 (Image)|
|`47 49 46 38`|GIF|→ Fase 3 (Image)|
|`50 4B 03 04`|ZIP / DOCX / APK|→ Fase 2 (File Forensics)|
|`52 61 72 21`|RAR|→ Fase 2 (File Forensics)|
|`1F 8B 08`|GZIP|→ Fase 2 (File Forensics)|
|`25 50 44 46`|PDF|→ Fase 2 (File Forensics)|
|`7F 45 4C 46`|ELF Binary|→ File 48 (Binary Analysis)|
|`4D 5A`|PE/EXE Windows|→ File 48 (Binary Analysis)|
|`00 00 00` (atau rusak)|Header corrupt|→ Langkah 0.3 (Repair)|

**OUTPUT GAGAL ❌ — Byte pertama semua `00` atau tidak ada pola:**

text

```
00000000: 0000 0000 0000 0000 0000 0000 4948 4452  ............IHDR
```

➡️ Lihat apakah ada keyword di bagian lain (`IHDR` = PNG yang headernya rusak). Lanjut **Langkah 0.3**.

---

### Langkah 0.3 — Repair Header yang Rusak

Bash

```
# Deteksi: apakah file PNG dengan header rusak?
# Tanda: ada string IHDR, IDAT, IEND tapi tidak bisa dibuka
strings $TARGET_FILE | grep -E "IHDR|IDAT|IEND|JFIF|Exif"
```

**OUTPUT BERHASIL ✅ — Terlihat IHDR/IDAT (PNG rusak):**

text

```
IHDR
IDAT
IEND
```

➡️ Perbaiki header PNG:

Bash

```
# Timpa 8 byte pertama dengan magic bytes PNG yang benar
python3 -c '
with open("'$TARGET_FILE'", "r+b") as f:
    f.seek(0)
    f.write(bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
print("[+] Header PNG diperbaiki!")
'

# Validasi hasil repair
pngcheck $TARGET_FILE
file $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — pngcheck setelah repair:**

text

```
OK: challenge.bin (800x600, 32-bit RGB+alpha, non-interlaced, 98.2%)
```

➡️ File valid! Buka dengan image viewer, lanjut **Fase 3 (Image Forensics)**.

**OUTPUT GAGAL ❌ — pngcheck masih error:**

text

```
CRC error in IHDR chunk (computed 7a3b4c12, expected 00000000)
```

➡️ Bukan hanya header yang rusak, tapi juga dimensi/CRC dalam chunk IHDR dimanipulasi:

Bash

```
# Lihat detail chunk IHDR
python3 -c '
import struct, zlib

with open("'$TARGET_FILE'", "rb") as f:
    f.seek(8)  # Skip magic bytes
    chunk_len = struct.unpack(">I", f.read(4))[0]
    chunk_type = f.read(4)
    chunk_data = f.read(chunk_len)
    crc_stored = struct.unpack(">I", f.read(4))[0]
    crc_calc = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
    
    width, height = struct.unpack(">II", chunk_data[:8])
    print(f"Width: {width}, Height: {height}")
    print(f"CRC stored: {hex(crc_stored)}, CRC calculated: {hex(crc_calc)}")
    print(f"CRC match: {crc_stored == crc_calc}")
'
```

> 💡 **Hint:** Jika dimensi gambar sengaja dimanipulasi (height dikecilkan untuk menyembunyikan baris pixel di bawah), ubah height ke nilai yang benar lalu recalculate CRC. Search: **"PNG IHDR height tampering CTF"**

**OUTPUT BERHASIL ✅ — JPEG rusak (ada string JFIF/Exif):**

text

```
Exif
JFIF
```

➡️ Repair header JPEG:

Bash

```
python3 -c '
with open("'$TARGET_FILE'", "r+b") as f:
    f.seek(0)
    f.write(bytes([0xFF, 0xD8, 0xFF, 0xE0]))
print("[+] Header JPEG diperbaiki!")
'
file $TARGET_FILE
```

---

### Langkah 0.4 — Quick Flag Hunt (Sering Ketemu di CTF Easy)

Bash

```
# Jalankan SEMUA ini sekaligus sebelum lanjut ke fase berikutnya
# Sering banget flag langsung ketemu di sini

# Hunt 1: Plaintext flag langsung
strings -n 6 $TARGET_FILE | grep -Ei "flag\{|ctf\{|htb\{|picoctf\{|thm\{"

# Hunt 2: Base64 yang mungkin mengandung flag
strings $TARGET_FILE | grep -E "[A-Za-z0-9+/]{24,}={0,2}" | while read b64; do
    decoded=$(echo "$b64" | base64 -d 2>/dev/null)
    echo "$decoded" | grep -Ei "flag\{|ctf\{" && echo "  Source: $b64"
done

# Hunt 3: Metadata langsung
exiftool $TARGET_FILE | grep -Ei "comment|description|artist|copyright|software|usercomment"

# Hunt 4: Embedded files indicator
binwalk $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — Flag langsung ketemu di strings:**

text

```
FLAG{m3t4d4t4_1s_y0ur_fr13nd}
```

➡️ **SELESAI!** Verifikasi dan submit flag.

**OUTPUT BERHASIL ✅ — Flag ketemu di metadata:**

text

```
User Comment                    : FLAG{m3t4d4t4_n3v3r_l13s}
```

➡️ **SELESAI!** Verifikasi dan submit flag.

**OUTPUT GAGAL ❌ — Tidak ada flag, ada embedded files:**

text

```
DECIMAL    HEXADECIMAL    DESCRIPTION
0          0x0            PNG image data
45120      0xB040         Zip archive data...
```

➡️ Ada file tersembunyi! Lanjut **Fase 2 (File Forensics & Carving)**.

**OUTPUT GAGAL ❌ — Tidak ada apapun yang mencurigakan:**  
➡️ Proses sesuai tipe file ke Fase yang tepat (3/4/5/7).

---

## ═══════════════════════════════════════

## FASE 1: METADATA DEEP DIVE

## ═══════════════════════════════════════

> **Tujuan:** Gali semua informasi dari metadata. Banyak CTF menyembunyikan flag, password, atau hint di sini.

### Langkah 1.1 — Ekstraksi Metadata Lengkap

Bash

```
# Command 1: Semua metadata termasuk tag tersembunyi
exiftool -a -u $TARGET_FILE

# Command 2: Filter field yang sering mengandung flag/hint
exiftool -a -u $TARGET_FILE | grep -Ei \
    "comment|description|artist|author|copyright|software|usercomment|GPS|warning|error|note|maker|serial"

# Command 3: GPS coordinates jika ada (cek di Google Maps untuk hint)
exiftool -GPS* $TARGET_FILE

# Command 4: Lihat timestamp (untuk timeline challenge)
exiftool -Time:All $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — Ada password/flag di comment:**

text

```
User Comment                    : FLAG{m3t4d4t4_n3v3r_l13s_s0_ch3ck_1t}
```

atau

text

```
Description                     : password: SuperSecret123
```

➡️ Simpan password, akan digunakan jika ada encrypted archive/steghide:

Bash

```
export STEG_PASS="SuperSecret123"
echo "$STEG_PASS" >> $WORK_DIR/creds/found_passwords.txt
```

**OUTPUT BERHASIL ✅ — Ada GPS coordinates:**

text

```
GPS Position                    : 48 deg 51' 29.88" N, 2 deg 17' 40.20" E
```

➡️ Ini mungkin coordinate-based challenge. Masukkan ke Google Maps, lihat lokasinya (bisa jadi nama tempat = password atau bagian flag).

**OUTPUT BERHASIL ✅ — Ada software watermark mencurigakan:**

text

```
Software                        : gimp 2.10.0 (secret_msg_hidden_here)
```

➡️ Decode field tersebut.

**OUTPUT GAGAL ❌ — Metadata kosong / standard:**

text

```
File Name                       : challenge.jpg
File Size                       : 142 kB
Camera Model Name               : Canon EOS 5D Mark IV
```

➡️ Tidak ada hint di metadata. Lanjut **Langkah 1.2**.

---

### Langkah 1.2 — Analisis Entropy (Deteksi Enkripsi/Hidden Data)

Bash

```
# Plot entropy — mendeteksi area terenkripsi atau terkompresi
binwalk -E $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — Entropy flat ~0.0 (teks biasa):**

text

```
# Grafik menunjukkan nilai rendah
```

➡️ File berisi data plaintext, tidak terenkripsi.

**OUTPUT BERHASIL ✅ — Entropy spike mendekati 1.0:**

text

```
# Area tertentu spike ke 0.95+
```

➡️ Ada data terenkripsi atau terkompresi di area itu. Catat offset-nya, lanjut ke **Fase 2 untuk carving**.

**OUTPUT BERHASIL ✅ — Entropy konsisten ~0.8:**  
➡️ Seluruh file terenkripsi. Cari kunci/password dari sumber lain.

---

## ═══════════════════════════════════════

## FASE 2: FILE FORENSICS & CARVING

## ═══════════════════════════════════════

> **Tujuan:** Ekstrak file tersembunyi, repair file rusak, recover file terhapus.

### Langkah 2.1 — Binwalk Extraction

Bash

```
# Command 1: Lihat apa yang ada di dalam file
binwalk $TARGET_FILE

# Command 2: Ekstrak otomatis
binwalk -e $TARGET_FILE -C $WORK_DIR/extracted/

# Command 3: Ekstrak rekursif (jika ada nested archive)
binwalk -M -e $TARGET_FILE -C $WORK_DIR/extracted/
```

**OUTPUT BERHASIL ✅ — Deteksi ZIP di dalam file:**

text

```
DECIMAL    HEXADECIMAL    DESCRIPTION
0          0x0            JPEG image data, JFIF standard 1.01
45120      0xB040         Zip archive data, compressed size: 1024, name: secret_flag.txt
46200      0xB478         End of Zip archive
```

➡️ Cek hasil ekstraksi:

Bash

```
ls -la $WORK_DIR/extracted/
ls -la $WORK_DIR/extracted/_$TARGET_FILE.extracted/
cat $WORK_DIR/extracted/_$TARGET_FILE.extracted/secret_flag.txt 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Flag langsung di file yang diekstrak:**

text

```
FLAG{h1dd3n_z1p_1ns1d3_jpg}
```

➡️ **SELESAI!**

**OUTPUT BERHASIL ✅ — ZIP meminta password:**

text

```
Archive:  extracted.zip
   skipping: flag.txt                need PK compat. v5.1 (can do v4.6)
```

atau

text

```
[extracted.zip] flag.txt password:
```

➡️ Lanjut **Langkah 2.2 (Crack ZIP Password)**.

**OUTPUT GAGAL ❌ — Binwalk output banyak tapi folder ekstraksi kosong:**

text

```
# Binwalk deteksi banyak hal tapi semua false positive
```

➡️ Coba carving manual:

Bash

```
# Gunakan foremost sebagai alternatif
foremost -i $TARGET_FILE -o $WORK_DIR/carved/
ls -la $WORK_DIR/carved/
```

**OUTPUT GAGAL ❌ — Tidak ada yang terdeteksi:**  
➡️ Tidak ada embedded file. Lanjut ke fase sesuai tipe file.

---

### Langkah 2.2 — Crack ZIP / RAR Password

Bash

```
# Method 1: Extract hash dulu
zip2john $WORK_DIR/extracted/*.zip > $WORK_DIR/creds/zip.hash 2>/dev/null
rar2john $WORK_DIR/extracted/*.rar > $WORK_DIR/creds/rar.hash 2>/dev/null

# Cek isi hash
cat $WORK_DIR/creds/zip.hash

# Method 2: Crack dengan john
john --wordlist=/usr/share/wordlists/rockyou.txt $WORK_DIR/creds/zip.hash

# Method 3: Crack dengan hashcat (lebih cepat untuk GPU)
# ZIP (classic): -m 17200, ZIP (AES): -m 13600
hashcat -m 17200 $WORK_DIR/creds/zip.hash /usr/share/wordlists/rockyou.txt

# Method 4: Coba password yang sudah ditemukan dari metadata
if [ ! -z "$STEG_PASS" ]; then
    unzip -P "$STEG_PASS" $WORK_DIR/extracted/*.zip -d $WORK_DIR/extracted/unzipped/
fi

# Method 5: Coba password umum CTF dulu (hemat waktu)
for pass in "" "password" "123456" "flag" "ctf" "secret" "hidden"; do
    result=$(unzip -P "$pass" $WORK_DIR/extracted/*.zip -d /tmp/test_$$ 2>&1)
    if echo "$result" | grep -q "inflating"; then
        echo "[+] PASSWORD FOUND: '$pass'"
        break
    fi
    rm -rf /tmp/test_$$
done
```

**OUTPUT BERHASIL ✅ — John crack berhasil:**

text

```
Press 'q' or Ctrl-C to abort, almost any other key for status
rockyou123       (extracted.zip/flag.txt)
1g 0:00:00:03 DONE
```

➡️ Password adalah `rockyou123`:

Bash

```
unzip -P "rockyou123" $WORK_DIR/extracted/*.zip -d $WORK_DIR/extracted/unzipped/
cat $WORK_DIR/extracted/unzipped/flag.txt
```

**OUTPUT GAGAL ❌ — John tidak bisa crack (rockyou.txt habis):**

text

```
0 password hashes cracked, 0 left
```

➡️ Coba strategi lain:

Bash

```
# Opsi 1: Wordlist lebih besar
john --wordlist=/usr/share/seclists/Passwords/darkweb2017-top10000.txt $WORK_DIR/creds/zip.hash

# Opsi 2: Rules attack
john --wordlist=/usr/share/wordlists/rockyou.txt --rules=Best64 $WORK_DIR/creds/zip.hash

# Opsi 3: Mask attack (jika tahu format, misal 6 karakter)
hashcat -m 17200 $WORK_DIR/creds/zip.hash -a 3 ?l?l?l?l?l?l

# Opsi 4: Buat wordlist dari challenge description / nama file
# (cewl tidak berlaku untuk CTF offline, buat manual)
echo -e "forensics\ndigital\nevidence\nartifact\nchallenge" > /tmp/ctf_custom.txt
john --wordlist=/tmp/ctf_custom.txt $WORK_DIR/creds/zip.hash

# Opsi 5: Jika ZIP menggunakan kompresi tidak standar
7z x $WORK_DIR/extracted/*.zip -o$WORK_DIR/extracted/7z_extracted/
```

> 🔍 **Google hint:** Jika semua gagal, search: `"[nama CTF] [nama challenge] writeup zip password forensics`

---

### Langkah 2.3 — Ekstraksi Appended Data (Overlay)

Bash

```
# Scenario: Ada data yang ditempel SETELAH marker EOF file

# Untuk JPEG: cari marker FF D9
grep -aobP '\xFF\xD9' $TARGET_FILE

# Untuk PNG: cari chunk IEND (signature: 49 45 4E 44)
grep -aobP '\x49\x45\x4E\x44' $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — Ketemu offset marker EOF:**

text

```
52140:  # JPEG EOF marker ditemukan di byte 52140
```

Bash

```
# Hitung total: offset + 2 byte marker = 52142
# Ekstrak data setelah marker (skip 52142 byte pertama)
dd if=$TARGET_FILE of=$WORK_DIR/extracted/appended_data.bin bs=1 skip=52142

# Identifikasi jenis data yang terekstrak
file $WORK_DIR/extracted/appended_data.bin
xxd $WORK_DIR/extracted/appended_data.bin | head -n 3
```

**OUTPUT BERHASIL ✅ — Appended data adalah ZIP:**

text

```
/root/forensics_loot/extracted/appended_data.bin: Zip archive data
```

Bash

```
unzip $WORK_DIR/extracted/appended_data.bin -d $WORK_DIR/extracted/appended_unzipped/
ls -la $WORK_DIR/extracted/appended_unzipped/
```

**OUTPUT GAGAL ❌ — Tidak ada data setelah EOF:**

text

```
# dd menghasilkan file 0 byte
```

➡️ Tidak ada overlay. Data tersembunyi bukan di sini. Coba metode lain.

---

## ═══════════════════════════════════════

## FASE 3: IMAGE FORENSICS & STEGANOGRAFI

## ═══════════════════════════════════════

> **Tujuan:** Ekstrak data tersembunyi dari file gambar (PNG, JPEG, BMP, GIF).

### Langkah 3.1 — Quick Check Image (Semua Tool Sekaligus)

Bash

```
# Jalankan semua ini, lihat output mana yang menarik

# Check 1: LSB steganography (KHUSUS PNG/BMP)
zsteg -a $TARGET_FILE 2>/dev/null | head -50

# Check 2: Steghide info (JPEG/WAV)
steghide info $TARGET_FILE 2>/dev/null

# Check 3: PNG chunk integrity
pngcheck -vvt $TARGET_FILE 2>/dev/null

# Check 4: Cek ukuran file vs konten (anomali ukuran = hidden data)
ls -la $TARGET_FILE
identify $TARGET_FILE 2>/dev/null    # imagemagick
```

**OUTPUT BERHASIL ✅ — zsteg menemukan flag:**

text

```
b1,r,lsb,xy         .. text: "FLAG{lsb_stego_found}"
```

➡️ **SELESAI!**

**OUTPUT BERHASIL ✅ — zsteg menemukan data tapi bukan flag langsung:**

text

```
b1,rgb,lsb,xy       .. text: "cmxhZ3tsc2JfdGVzdH0="
```

➡️ Decode:

Bash

```
echo "cmxhZ3tsc2JfdGVzdH0=" | base64 -d
```

**OUTPUT BERHASIL ✅ — steghide ada data embedded:**

text

```
"challenge.jpg":
  format: jpeg
  capacity: 1.2 KB
  Try to get information about the embedded data ?
  (will require password)
```

➡️ Lanjut **Langkah 3.2 (steghide extraction)**.

**OUTPUT BERHASIL ✅ — pngcheck CRC error:**

text

```
CRC error in IHDR chunk (computed 7a3b4c12, expected 00000000)
```

➡️ Dimensi PNG dimanipulasi. Lanjut **Langkah 3.3**.

**OUTPUT GAGAL ❌ — Semua clean:**  
➡️ Steganografi mungkin menggunakan metode custom. Lanjut **Langkah 3.4 (Manual LSB)**.

---

### Langkah 3.2 — Steghide Extraction

Bash

```
# Coba tanpa password dulu
steghide extract -sf $TARGET_FILE -p "" -f -q 2>/dev/null
cat steghide_output.txt 2>/dev/null

# Jika ada password dari metadata/hint
steghide extract -sf $TARGET_FILE -p "$STEG_PASS" -q

# Jika tidak tahu password: brute force
# Install stegcracker jika belum ada: pip3 install stegcracker
stegcracker $TARGET_FILE /usr/share/wordlists/rockyou.txt
```

**OUTPUT BERHASIL ✅ — Ekstraksi berhasil:**

text

```
wrote extracted data to "secret.txt".
```

Bash

```
cat secret.txt
file secret.txt   # Mungkin bukan plaintext, mungkin ada file lain
```

**OUTPUT GAGAL ❌ — steghide: could not extract any data:**

text

```
steghide: could not extract any data with that passphrase!
```

➡️ Password salah. Jalankan stegcracker dengan wordlist:

Bash

```
stegcracker $TARGET_FILE /usr/share/wordlists/rockyou.txt

# Jika stegcracker tidak terinstall
for pass in $(cat /usr/share/wordlists/rockyou.txt | head -1000); do
    result=$(steghide extract -sf $TARGET_FILE -p "$pass" -f -q 2>&1)
    if ! echo "$result" | grep -q "could not extract"; then
        echo "[+] PASSWORD: $pass"
        break
    fi
done
```

> 🔍 **Google hint jika buntu:** Search `"steghide alternative tool ctf"` — ada tool lain seperti `OpenStego`, `SilentEye` yang format berbeda.

---

### Langkah 3.3 — PNG IHDR Height Tampering Fix

Bash

```
# Baca dimensi current vs yang seharusnya
python3 << 'EOF'
import struct, zlib

with open("challenge.png", "rb") as f:
    magic = f.read(8)
    chunk_len = struct.unpack(">I", f.read(4))[0]
    chunk_type = f.read(4)
    chunk_data = f.read(chunk_len)
    crc_stored = struct.unpack(">I", f.read(4))[0]
    
    width, height = struct.unpack(">II", chunk_data[:8])
    print(f"[*] Dimensi tersimpan: {width} x {height}")
    
    # Kalkulasi CRC seharusnya
    crc_calc = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
    print(f"[*] CRC tersimpan: {hex(crc_stored)}")
    print(f"[*] CRC seharusnya: {hex(crc_calc)}")
    
    if crc_stored != crc_calc:
        print("[!] CRC MISMATCH - dimensi mungkin dimanipulasi!")
EOF
```

**OUTPUT BERHASIL ✅ — CRC mismatch, height mencurigakan:**

text

```
[*] Dimensi tersimpan: 800 x 200
[*] CRC tersimpan: 0x00000000
[*] CRC seharusnya: 0x7a3b4c12
[!] CRC MISMATCH - dimensi mungkin dimanipulasi!
```

➡️ Height dikecilkan untuk menyembunyikan bagian bawah gambar. Fix:

Bash

```
python3 << 'EOF'
import struct, zlib

with open("challenge.png", "r+b") as f:
    f.seek(8 + 4 + 4)   # Skip magic, chunk_len, chunk_type
    chunk_data = bytearray(f.read(13))  # IHDR = 13 bytes
    
    # Coba berbagai nilai height sampai gambar valid
    # Biasanya height asli = 2x, 3x, atau 4x dari yang tersimpan
    current_height = struct.unpack(">I", chunk_data[4:8])[0]
    
    for multiplier in [2, 3, 4, 6, 8]:
        new_height = current_height * multiplier
        chunk_data[4:8] = struct.pack(">I", new_height)
        
        # Recalculate CRC
        new_crc = zlib.crc32(b"IHDR" + bytes(chunk_data)) & 0xFFFFFFFF
        
        f.seek(8 + 4 + 4)
        f.write(chunk_data)
        f.seek(8 + 4 + 4 + 13)
        f.write(struct.pack(">I", new_crc))
        
        print(f"[*] Mencoba height: {new_height} (multiplier {multiplier}x)")
        break  # Test satu per satu, cek hasilnya

print("[+] Selesai. Buka file dan cek apakah gambar memperlihatkan konten baru.")
EOF

# Buka gambar dan lihat
eog challenge.png &    # Parrot OS: Eye of GNOME
```

---

### Langkah 3.4 — Manual LSB Extraction (Jika zsteg Gagal)

Bash

```
# Coba berbagai kombinasi channel dan bit order
python3 << 'EOF'
from PIL import Image

img = Image.open("challenge.png")
pixels = list(img.getdata())

# Method 1: RGB LSB standard (R, G, B masing-masing 1 bit)
bits = []
for pixel in pixels:
    for channel in range(3):  # R, G, B
        bits.append(str(pixel[channel] & 1))

# Konversi ke string
result = ""
for i in range(0, min(len(bits)-7, 800), 8):
    byte_val = int("".join(bits[i:i+8]), 2)
    if 32 <= byte_val <= 126:
        result += chr(byte_val)
    else:
        result += "."

print(f"[RGB LSB]: {result[:100]}")

# Method 2: Hanya channel Red
bits_r = [str(pixel[0] & 1) for pixel in pixels]
result_r = ""
for i in range(0, min(len(bits_r)-7, 800), 8):
    byte_val = int("".join(bits_r[i:i+8]), 2)
    if 32 <= byte_val <= 126:
        result_r += chr(byte_val)
    else:
        result_r += "."
print(f"[Red LSB]: {result_r[:100]}")

# Method 3: Alpha channel LSB (jika RGBA)
if img.mode == "RGBA":
    bits_a = [str(pixel[3] & 1) for pixel in pixels]
    result_a = ""
    for i in range(0, min(len(bits_a)-7, 800), 8):
        byte_val = int("".join(bits_a[i:i+8]), 2)
        if 32 <= byte_val <= 126:
            result_a += chr(byte_val)
        else:
            result_a += "."
    print(f"[Alpha LSB]: {result_a[:100]}")
EOF
```

**OUTPUT BERHASIL ✅ — Terlihat teks bermakna:**

text

```
[Red LSB]: FLAG{custom_lsb_r3d_ch4nn3l}...
```

➡️ **SELESAI!**

**OUTPUT GAGAL ❌ — Semua output noise:**

text

```
[RGB LSB]: .N..M.!.../..x.T..
[Red LSB]: ...@.#.!..(..
```

➡️ Mungkin bit order terbalik (MSB), atau menggunakan bit ke-2, ke-3. Coba:

Bash

```
# Gunakan zsteg dengan semua kombinasi
zsteg -a $TARGET_FILE 2>/dev/null | grep -v "^$" | head -100

# Atau upload ke AperiSolve (online, analisis otomatis):
# https://www.aperisolve.com/
echo "[*] Coba upload ke https://www.aperisolve.com/ untuk analisis otomatis"
```

> 🔍 **Google hint:** Search `"zsteg alternative CTF image steganography"` atau `"stegsolve java CTF"`

---

## ═══════════════════════════════════════

## FASE 4: MEMORY FORENSICS (VOLATILITY 3)

## ═══════════════════════════════════════

> **Tujuan:** Analisis memory dump untuk menemukan flag, credentials, proses mencurigakan.

### Langkah 4.1 — Identifikasi OS dari Memory Dump

Bash

```
export MEMORY_FILE="$TARGET_FILE"

# Command 1: Identifikasi OS Windows
vol -f $MEMORY_FILE windows.info 2>/dev/null

# Command 2: Identifikasi OS Linux  
vol -f $MEMORY_FILE linux.pslist 2>/dev/null | head -5

# Command 3: Jika tidak yakin, coba strings dulu
strings $MEMORY_FILE | grep -Ei "windows|linux|ubuntu|debian" | head -10
```

**OUTPUT BERHASIL ✅ — Windows memory dump:**

text

```
Variable        Value
Kernel Base     0xf80002a48000
DTB             0x187000
Symbols         file:///usr/lib/python3/dist-packages/.../windows/ntkrnlmp.pdb/...
Is64Bit         True
IsPAE           False
primary         WindowsIntel32e
layer_name      0 WindowsIntel32e
memory_layer    1 FileLayer
KdVersionBlock  0xf80002c3f398
Major/Minor     15.17763
MachineType     34404
KeNumberProcessors 2
SystemTime      2024-02-15 14:22:01
NtSystemRoot    C:\Windows
NtProductType   NtProductWinNt
NtMajorVersion  10
NtMinorVersion  0
```

➡️ Windows 10 Build 17763. Lanjut **Langkah 4.2**.

**OUTPUT BERHASIL ✅ — Linux memory dump:**

text

```
PID PPID ImageFileName   ...
1   0    systemd
...
```

➡️ Linux. Lanjut **Langkah 4.5**.

**OUTPUT GAGAL ❌ — Volatility error: "No suitable context":**

text

```
ERROR: No suitable context could be auto-detected from the file
```

➡️ Format memory dump mungkin tidak standard:

Bash

```
# Cek apakah perlu plugin tambahan atau format berbeda
strings $MEMORY_FILE | grep -i "volatility\|profile\|windows\|linux" | head -5

# Coba dengan Volatility 2 (jika Volatility 3 tidak bisa)
python2 vol.py -f $MEMORY_FILE imageinfo

# Atau coba identifikasi manual
file $MEMORY_FILE
xxd $MEMORY_FILE | head -n 5
```

> 🔍 **Google hint:** Search `"volatility 3 cannot detect profile memory forensics CTF"` atau `"[format file] volatility plugin"`

---

### Langkah 4.2 — Process Analysis (Windows)

Bash

```
# Jalankan urutan ini untuk mendapatkan gambaran aktivitas

# Step 1: Daftar semua proses
vol -f $MEMORY_FILE windows.pslist 2>/dev/null | tee $WORK_DIR/memory/pslist.txt

# Step 2: Pohon proses (cari parent-child yang mencurigakan)
vol -f $MEMORY_FILE windows.pstree 2>/dev/null | tee $WORK_DIR/memory/pstree.txt

# Step 3: Command line setiap proses (KRITIS - sering ada payload di sini)
vol -f $MEMORY_FILE windows.cmdline 2>/dev/null | tee $WORK_DIR/memory/cmdline.txt
```

**OUTPUT BERHASIL ✅ — Proses PowerShell dengan encoded payload:**

text

```
PID    Process         Args
3420   powershell.exe  powershell.exe -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA...
```

➡️ Decode Base64 PowerShell payload:

Bash

```
# Ekstrak string base64
B64_PAYLOAD="SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA"

# Decode (PowerShell -enc menggunakan UTF-16LE)
echo "$B64_PAYLOAD" | base64 -d | strings

# Atau dengan python (lebih akurat untuk UTF-16LE)
python3 -c "
import base64
payload = '$B64_PAYLOAD'
decoded = base64.b64decode(payload).decode('utf-16-le', errors='ignore')
print(decoded)
"
```

**OUTPUT BERHASIL ✅ — Proses CMD dengan path mencurigakan:**

text

```
3100   cmd.exe   cmd.exe /c type C:\Users\Admin\Desktop\flag.txt
```

➡️ Ada file flag.txt! Cari di memory dump:

Bash

```
# Cari file tersebut
vol -f $MEMORY_FILE windows.filescan 2>/dev/null | grep -i "flag"
```

**OUTPUT GAGAL ❌ — Proses semua normal:**  
➡️ Tidak ada proses mencurigakan. Lanjut ke langkah berikutnya.

---

### Langkah 4.3 — File & Network Analysis (Windows)

Bash

```
# Cari file flag di cache memori
vol -f $MEMORY_FILE windows.filescan 2>/dev/null | grep -Ei "flag|secret|password|cred" \
    | tee $WORK_DIR/memory/filescan_flaghunt.txt

# Lihat koneksi jaringan (C2 server, IP asing)
vol -f $MEMORY_FILE windows.netscan 2>/dev/null | tee $WORK_DIR/memory/netscan.txt

# Cek clipboard (user mungkin copy-paste flag)
vol -f $MEMORY_FILE windows.clipboard 2>/dev/null

# Cek environment variables (bisa ada API key / token / flag)
vol -f $MEMORY_FILE windows.envars 2>/dev/null | grep -Ei "flag|secret|key|token|pass"
```

**OUTPUT BERHASIL ✅ — File flag ditemukan di filescan:**

text

```
0xd0042f8819a0   \Users\Admin\Desktop\flag.txt
```

➡️ Ekstrak file dari memory:

Bash

```
VIRTUAL_ADDR="0xd0042f8819a0"

vol -f $MEMORY_FILE windows.dumpfiles --virtaddr $VIRTUAL_ADDR \
    -o $WORK_DIR/memory/ 2>/dev/null

# Lihat file hasil dump
ls -la $WORK_DIR/memory/
cat $WORK_DIR/memory/file.*.dat 2>/dev/null
strings $WORK_DIR/memory/file.*.dat 2>/dev/null | grep -Ei "flag\{|ctf\{"
```

**OUTPUT BERHASIL ✅ — Clipboard mengandung flag:**

text

```
Value
FLAG{cl1pb04rd_1s_4_g0ld_m1n3}
```

➡️ **SELESAI!**

**OUTPUT BERHASIL ✅ — Koneksi ke IP asing:**

text

```
Offset    Proto   LocalAddr    ForeignAddr   State    PID   Owner
0x...     TCPv4   10.0.0.5:80  185.1.2.3:443 CLOSED   3420  powershell.exe
```

➡️ IP `185.1.2.3` adalah C2 server. Catat, mungkin relevan untuk challenge berikutnya.

---

### Langkah 4.4 — Credential Extraction (Windows)

Bash

```
# Dump password hash dari SAM (butuh SYSTEM privileges di dump)
vol -f $MEMORY_FILE windows.hashdump 2>/dev/null | tee $WORK_DIR/creds/ntlm_hashes.txt

# Deteksi injeksi kode (malware yang decrypt di memory)
vol -f $MEMORY_FILE windows.malfind 2>/dev/null | tee $WORK_DIR/memory/malfind.txt

# Dump proses yang mencurigakan dari malfind
# (Lihat PID dari malfind output)
# vol -f $MEMORY_FILE windows.dumpfiles --pid <PID> -o $WORK_DIR/memory/
```

**OUTPUT BERHASIL ✅ — Hash ditemukan:**

text

```
User     rid    lmhash                           nthash
Administrator  500  aad3b435b51404eeaad3b435b51404ee  fc525c9683e8fe067095ba2ddc971881
```

➡️ Crack hash:

Bash

```
echo "fc525c9683e8fe067095ba2ddc971881" > /tmp/ntlm.hash

# Cek hash database online (cepat)
echo "[*] Coba cek di: https://crackstation.net/"

# Atau crack offline
hashcat -m 1000 /tmp/ntlm.hash /usr/share/wordlists/rockyou.txt

# Hasil hash bisa jadi password untuk arsip/steghide di challenge ini
```

---

### Langkah 4.5 — Linux Memory Analysis

Bash

```
export MEMORY_FILE="$TARGET_FILE"

# Step 1: Bash history (PALING SERING mengandung flag langsung!)
vol -f $MEMORY_FILE linux.bash 2>/dev/null | tee $WORK_DIR/memory/bash_history.txt
grep -Ei "flag\{|ctf\{|cat.*flag|echo.*flag" $WORK_DIR/memory/bash_history.txt

# Step 2: Environment variables
vol -f $MEMORY_FILE linux.envars 2>/dev/null | grep -Ei "flag|secret|token|pass|key"

# Step 3: Process list
vol -f $MEMORY_FILE linux.pslist 2>/dev/null | tee $WORK_DIR/memory/linux_pslist.txt

# Step 4: Network connections
vol -f $MEMORY_FILE linux.netstat 2>/dev/null | tee $WORK_DIR/memory/linux_netstat.txt

# Step 5: Open files
vol -f $MEMORY_FILE linux.lsof 2>/dev/null | grep -Ei "flag|secret" 
```

**OUTPUT BERHASIL ✅ — Flag di bash history:**

text

```
PID   Process  CommandTime        Command
1234  bash     2024-02-15...      cat /home/user/flag.txt
1234  bash     2024-02-15...      echo "FLAG{l1nux_m3m0ry_b4sh_h1st}"
```

➡️ **SELESAI!**

**OUTPUT BERHASIL ✅ — Flag di environment:**

text

```
PID   Process   Variable   Value
1234  python3   FLAG       FLAG{3nv_v4r_h1dd3n}
```

➡️ **SELESAI!**

---

## ═══════════════════════════════════════

## FASE 5: DISK FORENSICS & FILESYSTEM

## ═══════════════════════════════════════

> **Tujuan:** Analisis disk image, recover deleted files, cek filesystem artefak.

### Langkah 5.1 — Identifikasi Disk Image

Bash

```
export DISK_IMAGE="$TARGET_FILE"

# Cek tabel partisi
fdisk -l $DISK_IMAGE

# Alternatif dengan mmls (Sleuth Kit)
mmls $DISK_IMAGE
```

**OUTPUT BERHASIL ✅ — Partisi terdeteksi:**

text

```
Device               Boot  Start     End   Sectors  Size  Id  Type
physical_disk.img1         2048  2097151   2095104  1023M  83  Linux
```

➡️ Kalkulasi offset: `2048 × 512 = 1048576`

Bash

```
# Mount read-only
sudo mkdir -p /mnt/forensics_disk
sudo mount -o loop,ro,offset=1048576 $DISK_IMAGE /mnt/forensics_disk

# Lihat isi
ls -la /mnt/forensics_disk/
find /mnt/forensics_disk/ -name "*flag*" -o -name "*secret*" 2>/dev/null
```

**OUTPUT GAGAL ❌ — fdisk tidak bisa baca:**

text

```
fdisk: cannot open /dev/loop: No such file or directory
```

➡️ Coba dengan Sleuth Kit langsung tanpa mount:

Bash

```
# List semua file tanpa mount
fls -r -p $DISK_IMAGE 2>/dev/null | head -50

# Dengan offset jika ada
fls -r -p -o 2048 $DISK_IMAGE 2>/dev/null
```

---

### Langkah 5.2 — Recover File yang Dihapus

Bash

```
# List HANYA file yang telah dihapus (tanda * = deleted)
fls -r -p -d $DISK_IMAGE 2>/dev/null | tee $WORK_DIR/logs/deleted_files.txt

# Atau dengan offset
fls -r -p -d -o 2048 $DISK_IMAGE 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Ada file terhapus:**

text

```
d/d * 14221: /var/backups/flag_backup.txt.bak
r/r * 14222: /home/user/.secret_notes.txt
```

Bash

```
# Recover menggunakan inode number
icat $DISK_IMAGE 14221 > $WORK_DIR/extracted/recovered_flag.txt 2>/dev/null
# Jika perlu offset:
icat -o 2048 $DISK_IMAGE 14221 > $WORK_DIR/extracted/recovered_flag.txt

# Baca hasilnya
cat $WORK_DIR/extracted/recovered_flag.txt
file $WORK_DIR/extracted/recovered_flag.txt
```

**OUTPUT BERHASIL ✅ — File berisi flag:**

text

```
FLAG{d3l3t3d_f1l3s_4r3_n0t_g0n3}
```

➡️ **SELESAI!**

**OUTPUT GAGAL ❌ — icat output kosong (data overwritten):**

text

```
# File 0 bytes - data sudah tertimpa
```

➡️ Data blocks sudah overwrite. Coba carving:

Bash

```
# PhotoRec: carving berbasis signature
photorec $DISK_IMAGE

# Foremost: carving otomatis
foremost -i $DISK_IMAGE -o $WORK_DIR/carved/

ls -la $WORK_DIR/carved/
```

---

### Langkah 5.3 — Analisis Filesystem Slack Space

Bash

```
# Ekstrak unallocated space
blkls $DISK_IMAGE > $WORK_DIR/extracted/unallocated.raw 2>/dev/null
# Dengan offset:
blkls -o 2048 $DISK_IMAGE > $WORK_DIR/extracted/unallocated.raw

# Cari flag di unallocated space
strings -n 8 $WORK_DIR/extracted/unallocated.raw | grep -Ei "flag\{|ctf\{" 

# Lebih lengkap dengan bulk_extractor
bulk_extractor $DISK_IMAGE -o $WORK_DIR/bulk_output/
cat $WORK_DIR/bulk_output/strings.txt | grep -Ei "flag\{|ctf\{"
```

**OUTPUT BERHASIL ✅ — Flag di slack space:**

text

```
FLAG{sl4ck_sp4c3_h1dd3n_d4t4}
```

➡️ **SELESAI!**

---

## ═══════════════════════════════════════

## FASE 6: LOG ANALYSIS

## ═══════════════════════════════════════

> **Tujuan:** Analisis log file untuk temukan aktivitas mencurigakan, credential, atau flag tersembunyi.

### Langkah 6.1 — Identifikasi Tipe Log

Bash

```
# Cek tipe file log
file $TARGET_FILE

# Jika plaintext log
head -20 $TARGET_FILE
tail -20 $TARGET_FILE

# Jika Windows Event Log (.evtx)
file $TARGET_FILE | grep -i evtx
```

**OUTPUT BERHASIL ✅ — Windows .evtx:**

text

```
challenge.evtx: MS Windows Vista Event Log, 1 chunks (no. 0 in use), 513 records
```

➡️ Parse dulu:

Bash

```
evtx_dump.py $TARGET_FILE > $WORK_DIR/logs/parsed_events.txt 2>/dev/null

# Atau dengan python-evtx
python3 -c "
from Evtx.Evtx import Evtx
import Evtx.Views as e_views

with Evtx('$TARGET_FILE') as log:
    for record in log.records():
        print(record.xml())
" > $WORK_DIR/logs/parsed_events.txt 2>/dev/null

wc -l $WORK_DIR/logs/parsed_events.txt
```

**OUTPUT BERHASIL ✅ — Apache/Nginx access log:**

text

```
10.10.10.5 - - [15/Feb/2024:14:22:01 +0000] "GET /flag.php HTTP/1.1" 200 1234
```

➡️ Lanjut **Langkah 6.2**.

---

### Langkah 6.2 — Analisis Log untuk Flag/Credential

Bash

```
# Untuk Windows Event Log yang sudah diparsed
grep -Ei "flag\{|ctf\{" $WORK_DIR/logs/parsed_events.txt

# Cari Event ID penting
grep -E "EventID>4624|EventID>4625|EventID>4688|EventID>4720" \
    $WORK_DIR/logs/parsed_events.txt | head -50

# Untuk Apache log — cari query mencurigakan
grep -E "flag|secret|passwd|admin" $TARGET_FILE | head -20

# Cari URL-encoded payloads
grep -E "%27|%20|%3D|SELECT|UNION" $TARGET_FILE | head -20

# Decode URL-encoded lines
python3 -c "
import urllib.parse, sys

with open('$TARGET_FILE') as f:
    for line in f:
        if any(kw in line.lower() for kw in ['flag', 'select', 'union', 'password']):
            print(urllib.parse.unquote(line.strip()))
"

# Top 10 IP addresses (anomali traffic)
awk '{print \$1}' $TARGET_FILE | sort | uniq -c | sort -nr | head -10

# Detect brute force SSH
grep "Failed password" $TARGET_FILE | awk '{print \$(NF-3)}' | sort | uniq -c | sort -nr
```

**OUTPUT BERHASIL ✅ — Flag di event log field:**

text

```
<Data Name='CommandLine'>powershell.exe -c "Write-Host FLAG{3v3nt_l0g_s3cr3ts}"</Data>
```

➡️ **SELESAI!**

**OUTPUT BERHASIL ✅ — Encoded payload di URL:**

text

```
GET /?search=FLAG%7Burl_enc0d3d_fl4g%7D HTTP/1.1
```

Bash

```
python3 -c "import urllib.parse; print(urllib.parse.unquote('FLAG%7Burl_enc0d3d_fl4g%7D'))"
```

Output: `FLAG{url_enc0d3d_fl4g}`  
➡️ **SELESAI!**

---

## ═══════════════════════════════════════

## FASE 7: PCAP & NETWORK TRAFFIC ANALYSIS

## ═══════════════════════════════════════

> **Tujuan:** Ekstrak flag, credential, dan artefak dari network capture.

### Langkah 7.1 — Quick Triage PCAP

Bash

```
export PCAP_FILE="$TARGET_FILE"

# Command 1: Cepat cek ada flag di strings
strings $PCAP_FILE | grep -Ei "flag\{|ctf\{|htb\{"

# Command 2: Hierarki protokol
tshark -r $PCAP_FILE -q -z io,phs

# Command 3: Statistik konversasi
tshark -r $PCAP_FILE -q -z conv,tcp | head -20
```

**OUTPUT BERHASIL ✅ — Flag langsung di strings:**

text

```
FLAG{plaintext_captured}
```

➡️ **SELESAI!**

**OUTPUT BERHASIL ✅ — Protokol hierarchy menunjukkan dominasi HTTP:**

text

```
http       frames:245   bytes:185420
```

➡️ Banyak HTTP traffic. Lanjut **Langkah 7.2**.

**OUTPUT BERHASIL ✅ — Dominasi DNS:**

text

```
dns        frames:1523  bytes:98234
```

➡️ Bisa DNS tunneling. Lanjut **Langkah 7.4**.

**OUTPUT BERHASIL ✅ — FTP traffic:**

text

```
ftp        frames:45    bytes:3421
ftp-data   frames:12    bytes:52840
```

➡️ FTP transfer terdeteksi. Lanjut **Langkah 7.3 (Extract Objects)**.

---

### Langkah 7.2 — HTTP Traffic Analysis

Bash

```
# Ekstrak semua HTTP request URLs
tshark -r $PCAP_FILE -Y "http.request" \
    -T fields -e ip.src -e ip.dst -e http.request.method -e http.request.full_uri \
    | tee $WORK_DIR/pcap/http_requests.txt

# Cari POST request (submission form, mungkin ada password/flag)
tshark -r $PCAP_FILE -Y "http.request.method == 'POST'" \
    -T fields -e ip.src -e http.request.full_uri -e http.file_data

# Ekstrak semua file yang ditransfer via HTTP
tshark -r $PCAP_FILE --export-objects "http,$WORK_DIR/pcap/http_extracted/" 2>/dev/null
ls -la $WORK_DIR/pcap/http_extracted/

# Cari credentials HTTP Basic Auth
tshark -r $PCAP_FILE -Y "http.authorization" \
    -T fields -e ip.src -e http.authorization | while read auth; do
    echo "$auth" | awk '{print $2}' | base64 -d 2>/dev/null && echo ""
done

# Follow semua TCP stream dan cari flag
tshark -r $PCAP_FILE -q -z follow,tcp,ascii,0 2>/dev/null | grep -Ei "flag\{|ctf\{"
```

**OUTPUT BERHASIL ✅ — File terekstrak mengandung flag:**

text

```
/root/forensics_loot/pcap/http_extracted/
total 45
-rw-r--r-- 1 root root  234  flag.txt
-rw-r--r-- 1 root root 8192  image.png
```

Bash

```
cat $WORK_DIR/pcap/http_extracted/flag.txt
```

**OUTPUT BERHASIL ✅ — Credentials di Basic Auth:**

text

```
admin:SuperSecret123
```

➡️ Simpan credentials:

Bash

```
echo "admin:SuperSecret123" >> $WORK_DIR/creds/found_creds.txt
# Mungkin digunakan untuk decrypt/extract di challenge ini
export STEG_PASS="SuperSecret123"
```

---

### Langkah 7.3 — FTP / SMB File Extraction

Bash

```
# Ekstrak file yang ditransfer via FTP
tshark -r $PCAP_FILE --export-objects "ftp-data,$WORK_DIR/pcap/ftp_extracted/" 2>/dev/null

# Ekstrak credentials FTP (USER dan PASS)
tshark -r $PCAP_FILE -Y "ftp.request.command == 'USER' || ftp.request.command == 'PASS'" \
    -T fields -e ftp.request.command -e ftp.request.arg

# Ekstrak file SMB
tshark -r $PCAP_FILE --export-objects "smb,$WORK_DIR/pcap/smb_extracted/" 2>/dev/null
tshark -r $PCAP_FILE --export-objects "smb2,$WORK_DIR/pcap/smb_extracted/" 2>/dev/null

# Lihat hasil
ls -la $WORK_DIR/pcap/ftp_extracted/ 2>/dev/null
ls -la $WORK_DIR/pcap/smb_extracted/ 2>/dev/null
```

**OUTPUT BERHASIL ✅ — File berhasil diekstrak:**

Bash

```
# Cek semua file yang diekstrak
for f in $WORK_DIR/pcap/ftp_extracted/*; do
    echo "=== $f ==="
    file "$f"
    strings "$f" | grep -Ei "flag\{|ctf\{"
    echo ""
done
```

---

### Langkah 7.4 — DNS Tunneling Detection & Decode

Bash

```
# Lihat semua DNS queries
tshark -r $PCAP_FILE -Y "dns.flags.response == 0" \
    -T fields -e dns.qry.name | sort -u | head -50

# Deteksi anomali: subdomains yang panjang dan random = tunneling
tshark -r $PCAP_FILE -Y "dns.flags.response == 0" \
    -T fields -e dns.qry.name \
    | awk -F'.' '{print length($1), $0}' \
    | sort -rn | head -20
```

**OUTPUT BERHASIL ✅ — Subdomain sangat panjang (tunneling):**

text

```
48  4647494c4542...7474702e636f6d.tunnel.evil.com
52  464c41477b64...
```

➡️ Subdomain mengandung hex/base64. Decode:

Bash

```
# Kumpulkan semua subdomain, gabungkan, decode
tshark -r $PCAP_FILE -Y "dns.flags.response == 0" \
    -T fields -e dns.qry.name \
    | awk -F'.' '{print $1}' \
    | tr -d '\n' \
    | xxd -r -p 2>/dev/null

# Jika base64 bukan hex:
tshark -r $PCAP_FILE -Y "dns.flags.response == 0" \
    -T fields -e dns.qry.name \
    | awk -F'.' '{print $1}' \
    | tr -d '\n' \
    | base64 -d 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Decode menghasilkan flag:**

text

```
FLAG{dns_tunn3l_3xf1ltr4t10n}
```

➡️ **SELESAI!**

---

## ═══════════════════════════════════════

## FASE 8: VERIFY & DECODE FLAG

## ═══════════════════════════════════════

> **Tujuan:** String yang ditemukan mungkin masih di-encode. Decode sampai dapat format FLAG{...}.

### Langkah 8.1 — Identifikasi Encoding

Bash

```
SUSPICIOUS_STRING="cmxhZ3tsc2JfdGVzdH0="

# Cek pola encoding
echo "String: $SUSPICIOUS_STRING"

# Base64 check (berakhiran = atau ==, karakter A-Za-z0-9+/)
echo "$SUSPICIOUS_STRING" | base64 -d 2>/dev/null && echo ""

# Hex check (hanya 0-9, a-f)
echo "$SUSPICIOUS_STRING" | xxd -r -p 2>/dev/null && echo ""

# ROT13 check
echo "$SUSPICIOUS_STRING" | tr 'A-Za-z' 'N-ZA-Mn-za-m'

# Base32 check (hanya A-Z, 2-7, berakhiran =)
echo "$SUSPICIOUS_STRING" | base32 -d 2>/dev/null && echo ""

# URL decode
python3 -c "import urllib.parse; print(urllib.parse.unquote('$SUSPICIOUS_STRING'))"
```

**OUTPUT BERHASIL ✅ — Base64 decode menghasilkan flag:**

text

```
FLAG{b4s364_d3c0d3d}
```

➡️ **SELESAI!**

**OUTPUT GAGAL ❌ — Semua decode menghasilkan noise:**  
➡️ Mungkin multi-layer encoding:

Bash

```
# Coba layer by layer
python3 << 'EOF'
import base64

s = "cmxhZ3tsc2JfdGVzdH0="

# Layer 1: Base64
try:
    layer1 = base64.b64decode(s).decode()
    print(f"Layer 1 (B64): {layer1}")
    
    # Layer 2: ROT13
    import codecs
    layer2 = codecs.encode(layer1, 'rot_13')
    print(f"Layer 2 (ROT13): {layer2}")
    
    # Layer 3: Hex
    try:
        layer3 = bytes.fromhex(layer1).decode()
        print(f"Layer 2 (Hex): {layer3}")
    except:
        pass
except Exception as e:
    print(f"Error: {e}")
EOF
```

> 🔍 **Online tools:** `https://cyberchef.org` — paste string, klik "Magic" untuk auto-detect encoding chain.

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`binwalk -e` menghasilkan folder kosong|False positive atau data terenkripsi|Gunakan `foremost -i file` atau cek entropy via `binwalk -E`|
|`volatility: No suitable context`|Format dump tidak dikenal|Coba `windows.info` dulu, atau coba Volatility 2|
|`steghide: could not extract any data`|Passphrase salah atau metode berbeda|Jalankan `stegcracker target.jpg rockyou.txt`|
|`mount: wrong fs type`|Offset partisi salah|Hitung ulang: `Start × 512`, tambah `offset=N`|
|`strings` output terlalu masif|Threshold terlalu rendah|Tambah `-n 12` dan pipe ke `grep`|
|`file: data` (tidak teridentifikasi)|Header rusak|Cek magic bytes manual dengan `xxd`, lihat tabel|
|`pngcheck: CRC error in IHDR`|Dimensi dimanipulasi|Recalculate CRC setelah fix dimensi dengan Python|
|`icat` output 0 bytes|Data blocks sudah overwrite|Gunakan `photorec` atau `foremost` untuk carving|
|`zsteg: command not found`|Gem belum di PATH|`~/.local/share/gem/ruby/X.X.0/bin/zsteg` atau `sudo gem install zsteg`|
|`unzip: unsupported compression`|Zip menggunakan kompresi modern|Ekstrak dengan `7z x archive.zip`|
|Volatility 3 sangat lambat|File dump besar|Filter dengan `--pid <PID>` jika target proses sudah diketahui|
|`evtx_dump.py: not found`|Library tidak terinstall|`pip3 install python-evtx`|
|`tshark: permission denied`|Bukan root|`sudo tshark ...` atau `sudo chmod a+r /dev/null`|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: File Artefak Diterima
│
├─ FASE 0: Triage Awal
│   ├─ file, xxd → Identifikasi tipe
│   ├─ strings → Quick flag hunt → [FLAG DITEMUKAN? SELESAI]
│   ├─ exiftool → Metadata hunt → [FLAG/HINT DITEMUKAN? SELESAI/SIMPAN]
│   └─ binwalk → Embedded file scan
│
├─ FASE 1: Metadata Deep Dive
│   ├─ [Flag/password di comment] → SELESAI / gunakan password
│   └─ [Entropy anomali] → Ada hidden data
│
├─ FASE 2: File Forensics (jika ada embedded/appended data)
│   ├─ binwalk -e → Ekstrak
│   ├─ [ZIP berpassword] → Crack → Buka → FLAG
│   ├─ [Appended data] → dd skip → Identifikasi → Proses
│   └─ foremost/photorec → File carving
│
├─ FASE 3: Image Forensics (PNG/JPEG/GIF/BMP)
│   ├─ zsteg -a → LSB analysis → [FLAG DITEMUKAN? SELESAI]
│   ├─ steghide extract → [Berhasil? Baca output]
│   ├─ pngcheck → CRC error → Fix IHDR tampering
│   └─ Manual LSB script → Decode
│
├─ FASE 4: Memory Forensics (.raw/.mem/.dmp)
│   ├─ windows.info → Identifikasi OS
│   ├─ windows.cmdline → PowerShell base64 payload
│   ├─ windows.filescan → Cari flag.txt → dumpfiles
│   ├─ windows.clipboard → Flag di clipboard
│   ├─ linux.bash → Bash history → FLAG
│   └─ linux.envars → Environment variable FLAG
│
├─ FASE 5: Disk Forensics (.img/.dd)
│   ├─ fdisk -l → offset → mount -o loop,ro,offset=N
│   ├─ fls -r -d → Deleted files → icat → Recover
│   └─ blkls → Slack space → strings → FLAG
│
├─ FASE 6: Log Analysis (.log/.evtx)
│   ├─ evtx_dump → grep EventID → Aktivitas mencurigakan
│   ├─ grep "flag\{" → Direct flag
│   └─ URL decode → Encoded payload
│
└─ FASE 7: PCAP Analysis (.pcap/.pcapng)
    ├─ strings → Quick flag
    ├─ tshark io,phs → Dominan protokol
    ├─ HTTP: export-objects → File extraction → FLAG
    ├─ FTP/SMB: export-objects → File extraction
    └─ DNS: long subdomain → hex/base64 decode → FLAG
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET_FILE="challenge.bin"
export WORK_DIR=~/forensics_loot
mkdir -p $WORK_DIR/{extracted,carved,memory,pcap,creds,logs}

# === TRIAGE (5 Langkah Wajib) ===
file $TARGET_FILE                                    # Identifikasi tipe
xxd $TARGET_FILE | head -n 2                         # Magic bytes manual
strings -n 6 $TARGET_FILE | grep -Ei "flag\{|ctf\{" # Quick flag hunt
exiftool $TARGET_FILE                                 # Semua metadata
binwalk $TARGET_FILE                                  # Embedded files scan

# === IMAGE FORENSICS ===
zsteg -a $TARGET_FILE                                # LSB analysis PNG
steghide info $TARGET_FILE                            # Check steghide
steghide extract -sf $TARGET_FILE -p ""              # Extract tanpa password
steghide extract -sf $TARGET_FILE -p "$STEG_PASS"   # Extract dengan password
pngcheck -vvt $TARGET_FILE                           # PNG chunk integrity
stegcracker $TARGET_FILE /usr/share/wordlists/rockyou.txt  # Brute force

# === FILE CARVING ===
binwalk -e $TARGET_FILE -C $WORK_DIR/extracted/      # Auto extract
binwalk -M -e $TARGET_FILE -C $WORK_DIR/extracted/   # Recursive extract
foremost -i $TARGET_FILE -o $WORK_DIR/carved/        # Alternative carving
zip2john extracted.zip > zip.hash && john --wordlist=/usr/share/wordlists/rockyou.txt zip.hash

# === MEMORY FORENSICS (Windows) ===
vol -f $TARGET_FILE windows.info                      # Identifikasi
vol -f $TARGET_FILE windows.cmdline                  # Proses & args (PowerShell payload)
vol -f $TARGET_FILE windows.filescan | grep -i flag  # Cari file flag
vol -f $TARGET_FILE windows.clipboard                # Clipboard data
vol -f $TARGET_FILE windows.hashdump                 # NTLM hashes

# === MEMORY FORENSICS (Linux) ===
vol -f $TARGET_FILE linux.bash                       # Bash history!
vol -f $TARGET_FILE linux.envars | grep -i flag      # Environment vars
vol -f $TARGET_FILE linux.pslist                     # Process list

# === DISK FORENSICS ===
fdisk -l $TARGET_FILE                                # Partition table
fls -r -p -d $TARGET_FILE                           # Deleted files
icat $TARGET_FILE <INODE> > recovered.txt            # Recover by inode
blkls $TARGET_FILE | strings | grep -i flag          # Slack space

# === PCAP ANALYSIS ===
strings $TARGET_FILE | grep -Ei "flag\{|ctf\{"       # Quick scan
tshark -r $TARGET_FILE -q -z io,phs                  # Protocol hierarchy
tshark -r $TARGET_FILE --export-objects "http,$WORK_DIR/pcap/http/" # Extract HTTP files
tshark -r $TARGET_FILE -Y "ftp.request.command == 'PASS'" -T fields -e ftp.request.arg

# === DECODE ===
echo "STRING" | base64 -d                            # Base64
echo "STRING" | xxd -r -p                            # Hex
echo "STRING" | tr 'A-Za-z' 'N-ZA-Mn-za-m'          # ROT13
echo "STRING" | base32 -d                            # Base32
python3 -c "import urllib.parse; print(urllib.parse.unquote('STRING'))"  # URL decode
```

---

> **➡️ CROSS-REFERENCE:**
> 
> - Flag berisi **hash** → `<a href="/docs/hash-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">54_hash_cracking_workflow.md</a>`
> - File adalah **binary/ELF** → `<a href="/docs/binary-analysis" class="text-[#00b4d8] hover:underline font-mono font-semibold">48_binary_analysis_workflow.md</a>`
> - File **audio** dengan steganografi → `<a href="/docs/steganography" class="text-[#00b4d8] hover:underline font-mono font-semibold">56_steganography_workflow.md</a>`
> - **PCAP dengan TLS** → `<a href="/docs/pcap-analysis" class="text-[#00b4d8] hover:underline font-mono font-semibold">57_pcap_analysis_workflow.md</a>` (full pcap workflow)
> - **Memory dump** lanjutan → `<a href="/docs/memory-forensics" class="text-[#00b4d8] hover:underline font-mono font-semibold">58_memory_forensics_workflow.md</a>`
> - **Encoding/crypto** tidak dikenal → `<a href="/docs/crypto-identification" class="text-[#00b4d8] hover:underline font-mono font-semibold">53_crypto_identification_workflow.md</a>`