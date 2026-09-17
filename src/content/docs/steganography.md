---
id: "56"
title: "🏛️ Bagian 0: Fondasi Steganography"
category: "7. Cryptography & Forensics"
categoryId: "crypto_forensics"
filename: "56_steganography_workflow.md"
refs_out: ["53","54","55","57","58"]
refs_in: ["55","57"]
---

> **Target Environment:** Parrot OS XFCE (Debian-based)  
> **Prerequisites:** Memahami konsep dasar Linux CLI, hex editor, dan inspeksi file dasar (referensi: [🧭 BAGIAN 0: FONDASI FORENSICS](/docs/forensics)).  
> **Fokus Utama:** Menyelesaikan challenge steganography di platform CTF (PicoCTF, HackTheBox, TryHackMe) tanpa bergantung pada pencarian manual di Google.

---

## 📑 Daftar Isi

1. [Bagian 0: Fondasi Steganography](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-0-fondasi-steganography)
2. [Bagian 1: Image Steganography](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-1-image-steganography)
3. [Bagian 2: Audio Steganography (Deep Dive)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-2-audio-steganography)
4. [Bagian 3: Text Steganography](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-3-text-steganography)
5. [Bagian 4: Steganalysis (Deteksi Anomali)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-4-steganalysis)
6. [Bagian 5: 12 Common CTF Stego Patterns](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-5-common-ctf-stego-patterns)
7. [Bagian 6: Workflow Master Stego](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-6-workflow-master-stego)
8. [Bagian 7: Troubleshooting & Common Errors](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-7-troubleshooting--common-errors)
9. [Bagian 8: Cheatsheet Copy-Paste Ready](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-8-cheatsheet-copy-paste-ready)

---

## 🏛️ Bagian 0: Fondasi Steganography

### 0.1 Steganography vs Kriptografi

Perbedaan fundamental antara Kriptografi dan Steganography terletak pada **tujuan kerahasiaan**:

- **Kriptografi menyembunyikan ISI pesan.**  
    Pihak ketiga (adversary) mengetahui bahwa sebuah pesan rahasia sedang dikirimkan karena bentuknya terenkripsi menjadi ciphertext (contoh: `dGVzdAo=` atau string acak AES). Pihak ketiga tahu komunikasi terjadi, tetapi tidak bisa membacanya tanpa kunci.
- **Steganography menyembunyikan KEBERADAAN pesan.**  
    Pihak ketiga sama sekali tidak menyadari bahwa komunikasi rahasia sedang berlangsung. Pesan disisipkan ke dalam media pembawa normal (cover medium) seperti file audio lagu, foto pemandangan, atau teks artikel berita.

text

```
       [ Secret Payload ] 
       (Flag / Text / Zip)
               │
               ▼
   ┌───────────────────────┐
   │ Carrier / Cover File  │ ──► [ Stego Engine ] ──► [ Stego File ]
   │  (image.png / .wav)   │                          (Tampak identik dengan cover file,
   └───────────────────────┘                           namun membawa data rahasia)
```

Dalam skenario CTF, author sering menggabungkan keduanya (_Multi-layer defense_): Payload dienkripsi atau di-encode terlebih dahulu (misal: AES, XOR, Base64, ROT13), kemudian disisipkan ke dalam pixel atau spektrum audio menggunakan steganography.

### 0.2 Kategori Steganography

|Kategori|Carrier Format|Vektor Penyisipan|Tool Utama|Kesulitan CTF|
|---|---|---|---|---|
|**Image Stego**|PNG, BMP, GIF|LSB, Palet, Metadata Chunks, IDAT|`zsteg`, Python PIL, `pngcheck`|Easy - Medium|
|**Image Stego**|JPG / JPEG|Koefisien DCT, Quantization Table|`steghide`, `stegseek`, `jsteg`|Medium|
|**Audio Stego**|WAV|LSB Audio Sample, Echo Hiding|`deepsound`, Python `wave`|Medium|
|**Audio Stego**|WAV, MP3|Spectrogram Visual, Audio Infrasound|`sonic-visualiser`, `audacity`, `sox`|Easy - Medium|
|**Text Stego**|TXT, MD|Whitespace trailing, Zero-Width Chars|`stegsnow`, `zwc.py`, `sed`|Easy - Medium|
|**Network Stego**|PCAP, PCAPNG|ICMP Payload, TCP Initial Seq Num|`tshark`, `scapy`, Wireshark|Medium - Hard|

### 0.3 Setup Environment Parrot OS

Jalankan rangkaian instalasi berikut di terminal Parrot OS untuk melengkapi seluruh toolset steganography lanjutan:

Bash

```
# 1. Update package database
sudo apt update -y

# 2. Instal tool audio, image inspection, dan text stego dasar
sudo apt install -y steghide sonic-visualiser audacity sox libsox-fmt-all \
                    pngcheck imagemagick openstego stegsnow python3-pil \
                    python3-numpy python3-scipy python3-matplotlib

# 3. Instal Stegseek (Bruteforce Steghide ribuan kali lebih cepat dari stegcracker)
STEGSEEK_VER="0.6"
wget "https://github.com/RickdeJager/stegseek/releases/download/v${STEGSEEK_VER}/stegseek_${STEGSEEK_VER}-1_amd64.deb" -O /tmp/stegseek.deb
sudo apt install -y /tmp/stegseek.deb && rm /tmp/stegseek.deb

# Verifikasi instalasi Stegseek:
stegseek --version
# Expected output: StegSeek 0.6

# Jika wget/deb download gagal (misal link rilis berubah), compile manual dari source:
# sudo apt install -y build-essential cmake libmhash-dev libmcrypt-dev libjpeg-dev zlib1g-dev libssl-dev
# git clone https://github.com/RickdeJager/StegSeek.git /tmp/StegSeek
# cd /tmp/StegSeek && cmake . && make && sudo make install

# 4. Instal Jsteg (JPEG LSB analysis engine berbasis Go)
sudo apt install -y golang-go
go install github.com/lukechampine/jsteg@latest
sudo cp ~/go/bin/jsteg /usr/local/bin/

# 5. Verifikasi zsteg (Sudah terpasang dari File 55 atau pasang via Ruby Gem)
if ! command -v zsteg &> /dev/null; then
    sudo apt install -y ruby ruby-dev
    sudo gem install zsteg
fi

# 6. Catatan Tool Web-based
# Aperisolve (https://www.aperisolve.com/) digunakan sebagai alternatif cloud modern
# untuk menggantikan instalasi legacy StegSolve (Java GUI).
# ⚠️ Disclaimer Keamanan: Aperisolve adalah web tool publik — jangan upload file sensitif/perusahaan!
```

---

## 🖼️ Bagian 1: Image Steganography

### 1.1 Decision Tree Image Analysis

text

```
                      [ File Gambar Diterima ]
                                 │
                     ┌───────────┴───────────┐
                     ▼                       ▼
            [ Format Lossless ]      [ Format Lossy ]
              (PNG, BMP, GIF)             (JPEG)
                     │                       │
      ┌──────────────┴──────────────┐        ├──► Cek Metadata: exiftool target.jpg
      ▼                             ▼        ├──► Cek DCT LSB: jsteg reveal target.jpg
   [ PNG ]                       [ BMP ]     ├──► Brute Force Steghide: 
      │                             │             stegseek target.jpg /usr/share/wordlists/rockyou.txt
      ├──► pngcheck -v target.png   ├──► zsteg -a target.bmp
      ├──► zsteg -a target.png      └──► Python LSB Script
      ├──► Aperisolve / StegSolve        (Offset 54 raw bytes)
      └──► Python PIL Analysis
                     │
            [ GIF (Animasi) ]
                     │
                     └──► ImageMagick: convert target.gif -coalesce frame_%03d.png
```

---

### 1.2 PNG Steganography

Format PNG bersifat _lossless_. Data pixel disimpan dalam bentuk kompresi DEFLATE tanpa membuang informasi warna. Hal ini menjadikan PNG vektor utama untuk manipulasi _Least Significant Bit_ (LSB).

#### A. Analisis Mendalam Menggunakan `zsteg`

`zsteg` menganalisis kombinasi bit, urutan channel warna, dan arah pembacaan pixel.

Sintaks format deteksi `zsteg`:  
b[1−8],[channel],[order],[direction]b[1−8],[channel],[order],[direction]

- `b1`: Bit pertama (LSB). `b8`: Bit ke-8 (MSB).
- `rgb`: Urutan channel Red, Green, Blue.
- `lsb`: Least Significant Bit didahulukan saat rekonstruksi byte.
- `msb`: Most Significant Bit didahulukan saat rekonstruksi byte.
- `xy`: Membaca pixel secara horizontal (kiri ke kanan, baris demi baris).
- `yx`: Membaca pixel secara vertikal (atas ke bawah, kolom demi kolom).

Bash

```
# Menjalankan pemindaian otomatis terhadap semua algoritma LSB/MSB
zsteg -a target.png

# Contoh Output:
# b1,rgb,lsb,xy       .. text: "CTF{lsb_extr4ct10n_succ3ss}"
# b1,bgr,lsb,xy       .. text: "W#S%D^F*" (False positive / noise)
# b2,r,msb,xy         .. file: Zip archive data

# Ekstraksi payload berdasarkan channel spesifik yang valid:
zsteg -E "b1,rgb,lsb,xy" target.png > extracted_flag.txt

# Ekstraksi jika payload adalah file binary (seperti ZIP archive tersembunyi):
zsteg -E "b2,r,msb,xy" target.png > payload.zip
file payload.zip
```

_Kapan output zsteg dikatakan valid vs noise?_

- **Valid:** Menghasilkan string berurutan yang dapat dibaca manusia (ASCII/UTF-8), format flag (`picoCTF{`, `HTB{`), atau signature binary magic byte (`PK\x03\x04` untuk ZIP, `\x7fELF` untuk Linux executable).
- **Noise / False Positive:** Kombinasi karakter acak non-printable atau simbol tanpa struktur linguistik.

#### B. Script Python Manual Analysis (PIL & NumPy)

Ketika CTF author menggunakan custom order atau bit sequence unik yang tidak didukung oleh `zsteg`, gunakan custom script berikut.

Simpan script ini sebagai `/usr/local/bin/custom_lsb.py` dan berikan izin eksekusi (`chmod +x`):

Python

```
#!/usr/bin/env python3
import sys
import argparse
from PIL import Image

def extract_lsb(image_path, channel, bit_pos=0, direction='xy', bit_order='lsb'):
    """
    Ekstraksi bit LSB/MSB dari gambar secara manual.
    Channel: 0 (R), 1 (G), 2 (B), 3 (A), or 'all' (RGB)
    Direction: 'xy' (horizontal) atau 'yx' (vertical)
    Bit order: 'lsb' (bit digeser dari kanan) atau 'msb' (dari kiri)
    """
    try:
        img = Image.open(image_path)
    except Exception as e:
        print(f"[-] Error opening image: {e}")
        sys.exit(1)

    width, height = img.size
    pixels = img.load()
    bit_string = ""

    # Tentukan traversal koordinat:
    # Catatan: PIL.Image.load() menggunakan indeks pixels[x, y] di mana x = kolom (0..width-1) dan y = baris (0..height-1).
    # 'xy' = horizontal traversal: baris demi baris (kiri -> kanan, atas -> bawah)
    # 'yx' = vertical traversal: kolom demi kolom (atas -> bawah, kiri -> kanan)
    if direction == 'xy':
        coords = [(x, y) for y in range(height) for x in range(width)]
    else:
        coords = [(x, y) for x in range(width) for y in range(height)]

    # Ekstraksi bit
    for x, y in coords:
        pixel = pixels[x, y]
        # Pastikan format tuple (RGB/RGBA)
        if isinstance(pixel, int):
            pixel = (pixel, pixel, pixel)

        if channel == 'all':
            # Ambil R, lalu G, lalu B
            for c in range(3):
                bit = (pixel[c] >> bit_pos) & 1
                bit_string += str(bit)
        else:
            c = int(channel)
            bit = (pixel[c] >> bit_pos) & 1
            bit_string += str(bit)

    # Rekonstruksi bit ke bytes
    byte_list = bytearray()
    for i in range(0, len(bit_string), 8):
        byte_chunk = bit_string[i:i+8]
        if len(byte_chunk) < 8:
            break
        if bit_order == 'msb':
            byte_val = int(byte_chunk, 2)
        else:
            # LSB first: balik urutan bit dalam byte
            byte_val = int(byte_chunk[::-1], 2)
        byte_list.append(byte_val)

    return bytes(byte_list)

def main():
    parser = argparse.ArgumentParser(description="Advanced Image LSB Payload Extractor")
    parser.add_argument("image", help="Target image file (PNG/BMP)")
    parser.add_argument("-c", "--channel", default="all", choices=['0', '1', '2', '3', 'all'],
                        help="Channel target: 0=Red, 1=Green, 2=Blue, 3=Alpha, all=RGB (Default: all)")
    parser.add_argument("-b", "--bit", type=int, default=0, choices=range(0, 8),
                        help="Bit index (0=LSB, 7=MSB, Default: 0)")
    parser.add_argument("-d", "--direction", default="xy", choices=['xy', 'yx'],
                        help="Traversal order: xy (horizontal), yx (vertical) (Default: xy)")
    parser.add_argument("-o", "--output", help="Write output directly to binary file")
    parser.add_argument("-n", "--bytes", type=int, default=256,
                        help="Number of extracted bytes to preview (Default: 256)")

    args = parser.parse_args()

    raw_data = extract_lsb(args.image, args.channel, args.bit, args.direction)

    if args.output:
        with open(args.output, "wb") as f:
            f.write(raw_data)
        print(f"[+] Successfully extracted {len(raw_data)} bytes to {args.output}")
    else:
        print(f"[*] Previewing first {args.bytes} bytes (Raw/ASCII Printable):")
        preview = ""
        for b in raw_data[:args.bytes]:
            if 32 <= b <= 126:
                preview += chr(b)
            else:
                preview += "."
        print(preview)

if __name__ == "__main__":
    main()
```

#### Cara Setup dan Menjalankan Script (`custom_lsb.py`):

```bash
# Option A: Setup Global agar bisa dipanggil dari mana saja (RECOMMENDED)
sudo nano /usr/local/bin/custom_lsb.py
# (Paste kode Python di atas, simpan: Ctrl+O -> Enter, Keluar: Ctrl+X)

# Beri izin eksekusi
sudo chmod +x /usr/local/bin/custom_lsb.py

# Verifikasi script bisa dipanggil dari mana saja:
custom_lsb.py --help

# Contoh penggunaan global:
custom_lsb.py target.png -c 2 -b 0 -d yx -o extracted.bin

# Option B: Simpan Lokal di Folder Tools
mkdir -p ~/tools
nano ~/tools/custom_lsb.py
python3 ~/tools/custom_lsb.py target.png -c 2 -b 0 -d yx -o extracted.bin
```

#### C. Chunk Analysis dengan `pngcheck`

Struktur file PNG dibagi menjadi blok-blok chunk:

- **Critical Chunks:** `IHDR` (Header informasi), `PLTE` (Palet warna), `IDAT` (Data gambar terkompresi), `IEND` (Akhir file).
- **Ancillary Chunks:** `tEXt`, `zTXt`, `iTXt` (Metadata tekstual), `eXIf` (Data EXIF).

Payload sering diselipkan di dalam chunk tekstual atau chunk kustom non-standar:

Bash

```
# Verifikasi integritas chunk PNG
pngcheck -v target.png
```

Contoh Output:

text

```
File: target.png (142055 bytes)
  chunk IHDR at offset 0x0000c, length 13
    1920 x 1080, 8-bit/color RGB, non-interlaced
  chunk tEXt at offset 0x00025, length 64, keyword: Comment
    flat data: "ZmxhZ3tjaHVuazNfeHRyYWN0aTBuX2NvbXBsZXRlfQ=="
  chunk IDAT at offset 0x00071, length 141914
    zlib: deflated, 32K window, fast compression
  chunk IEND at offset 0x022b77, length 0
No errors were detected in target.png (4 chunks, 99.8% compression).
```

Jika terdeteksi chunk `tEXt` mencurigakan:

Bash

```
# Decode data Base64 yang ditemukan di dalam chunk
echo "ZmxhZ3tjaHVuazNfeHRyYWN0aTBuX2NvbXBsZXRlfQ==" | base64 -d
# Output: flag{chunk3_xtracti0n_complet}
```

---

### 1.3 JPEG Steganography

JPEG menggunakan kompresi _lossy_ berbasis _Discrete Cosine Transform_ (DCT). Teknik LSB pixel biasa pada raw image tidak dapat bertahan saat konversi JPEG. Sebagai gantinya, data disisipkan ke dalam koefisien frekuensi DCT terkuantisasi.

#### A. Steghide & Stegseek Pipeline

Steghide adalah tool standar yang menyisipkan data secara merata pada koefisien DCT.

Bash

```
# 1. Periksa apakah file JPEG memuat data terenkripsi Steghide
steghide info target.jpg

# 2. Ekstraksi langsung jika passphrase kosong (sering terjadi di CTF)
steghide extract -sf target.jpg -p ""

# 3. Bruteforce passphrase menggunakan Stegseek (kecepatan jutaan kata/detik)
stegseek target.jpg /usr/share/wordlists/rockyou.txt output_flag.txt
```

Simulasi Output Stegseek yang berhasil:

text

```
Stegseek v0.6 - https://github.com/RickdeJager/stegseek
[i] Progress: 98.42% (13.2 M words)
[i] Found passphrase: "dragonball"
[i] Extracting to "output_flag.txt"
```

#### B. Jsteg (DCT Domain Hiding)

`jsteg` menggunakan algoritma berbeda dari `steghide`. `jsteg` memodifikasi bit paling tidak signifikan dari koefisien DCT bukan-nol secara linear. Tool `steghide` **tidak bisa** membaca stego buatan `jsteg`, begitu pula sebaliknya.

Bash

```
# Deteksi dan ekstraksi payload tersembunyi jsteg
jsteg reveal target.jpg extracted_secret.txt

# Baca file hasil ekstraksi
cat extracted_secret.txt
```

---

### 1.4 BMP (Bitmap) Steganography

Format BMP tidak memiliki kompresi (_raw uncompressed raster_). Struktur filenya sangat sederhana:

1. **Header (14 bytes):** Signature `BM` (0x42 0x4D), ukuran file, offset data pixel.
2. **DIB Header (40 bytes):** Resolusi lebar, tinggi, color depth (misal: 24-bit RGB).
3. **Pixel Array:** Data warna langsung dimulai dari offset byte ke-54 (0x36).

Karena strukturnya tanpa kompresi, `zsteg` dapat bekerja langsung pada file BMP:

Bash

```
zsteg -a target.bmp
```

Ekstraksi byte pixel langsung dari byte 54 menggunakan Python:

Bash

```
python3 -c '
import sys
with open("target.bmp", "rb") as f:
    f.seek(54) # Lewati BMP header
    data = f.read()
# Ambil LSB dari setiap byte pixel
bits = [str(b & 1) for b in data]
raw = [int("".join(bits[i:i+8]), 2) for i in range(0, len(bits), 8)]
sys.stdout.buffer.write(bytes(raw[:500]))
' | strings | head -n 5
```

---

### 1.5 GIF Steganography

File GIF (Graphics Interchange Format) menyimpan multiple frames dan menggunakan Indexed Color Palette (maksimal 256 warna).

Dua vektor utama pada GIF:

1. **Frame Disassembly:** Payload disembunyikan di dalam salah satu frame spesifik atau dibaca per karakter per frame.
2. **Inter-frame Delay Manipulation:** Waktu delay antar frame diatur dalam satuan millisecond untuk merepresentasikan bit biner (misal: delay 10ms = 0, delay 20ms = 1).

Bash

```
# 1. Ekstraksi semua frame animasi menjadi gambar terpisah
mkdir frames_out
convert -coalesce target.gif frames_out/frame_%04d.png

# 2. Periksa text tersembunyi pada frame individual menggunakan zsteg atau OCR
for f in frames_out/*.png; do
    res=$(zsteg "$f" 2>/dev/null | grep -iE "flag|ctf{")
    if [ -n "$res" ]; then
        echo "[+] Ditemukan di $f: $res"
    fi
done

# 3. Analisis durasi delay antar frame (Vektor Timing)
identify -format "%T\n" target.gif | tr '\n' ' '
echo ""
# Catatan: Nilai delay GIF dalam unit 1/100 detik (misal: 100 = 1s). 
# Jika delay bervariasi tidak wajar (misal: 100 110 110 97 103), angka tersebut dapat mewakili ASCII desimal.
```

---

### 1.6 Visual Analysis & Aperisolve

Terkadang payload tidak disisipkan sebagai stream data LSB sekuensial, melainkan digambar secara visual langsung pada bit plane terendah (misal: QR Code atau teks yang disisipkan di Red plane bit 0).

- **Bit-Plane 0 (R0, G0, B0):** Bidang nilai bit paling tidak signifikan. Pada gambar natural, plane ini tampak seperti noise murni (static noise). Jika saat diperiksa terlihat bentuk geometris, QR code, atau huruf, maka gambar tersebut memuat stego visual.
- **Web Tool Modern: Aperisolve**
    1. Buka browser dan akses: `https://www.aperisolve.com/`
    2. Upload gambar target (PNG/BMP/JPG/GIF).
    3. Aperisolve otomatis merender seluruh layer dekomposisi:
        - R0, R1, R2 ... R7
        - G0, G1, G2 ... G7
        - B0, B1, B2 ... B7
    4. Lihat pada bagian visual plane: jika muncul teks transparan atau QR code, scan langsung menggunakan ponsel atau tool `zbarimg`.

Bash

```
# Scan QR code langsung dari terminal Parrot OS
zbarimg visual_plane_r0.png
```

---

## 🎵 Bagian 2: Audio Steganography

### 2.1 Kenapa Audio Stego Berbeda

Audio digital (seperti format WAV PCM) merepresentasikan amplitudo gelombang suara dari waktu ke waktu pada frekuensi sampling tertentu (misal: 44.1 kHz, 16-bit per sample).

Vektor penyisipan pada audio:

1. **Spectrogram Visual:** Modulasi frekuensi tinggi audio yang tidak dapat didengar manusia (inaudible, biasanya di atas 15 kHz - 20 kHz), tetapi membentuk pola visual saat dirender sebagai spectrogram.
2. **Time Domain LSB:** Modulasi nilai amplitudo bit terendah dari setiap 16-bit PCM data sample.
3. **Morse Code / DTMF:** Nada bip tersembunyi di channel audio kiri/kanan.

---

### 2.2 Spectrogram Analysis (Metode Paling Umum di CTF)

Spectrogram adalah representasi grafis visual yang menampilkan spektrum frekuensi sinyal audio terhadap waktu.

- **Sumbu X (Horizontal):** Waktu (durasi audio).
- **Sumbu Y (Vertikal):** Frekuensi (Hz / kHz).
- **Intensitas Warna:** Amplitudo / energi pada frekuensi tersebut.

#### A. Analisis Menggunakan Sonic Visualiser

Langkah-langkah terstruktur di Sonic Visualiser (Parrot OS):

1. Buka audio via terminal:
    
    Bash
    
    ```
    sonic-visualiser secret_audio.wav &
    ```
    
2. Klik menu utama: **Layer** →→ **Add Spectrogram** (atau tekan shortcut `Shift + G`).
3. Pilih channel: _All Channels Mixed_ atau pilih _Channel 1_ lalu ulangi untuk _Channel 2_.
4. Konfigurasi parameter di panel kanan Sonic Visualiser:
    - **Colour:** Ubah dari _Default_ ke _Sunset_ atau _Green_ untuk meningkatkan kontras teks.
    - **Scale:** Ubah dari _Linear_ ke _Log_ jika teks berada di frekuensi menengah, atau tetap _Linear_ jika berada di frekuensi sangat tinggi (>15 kHz).
    - **Window Size:** Set ke `1024` atau `2048`. Window size lebih besar meningkatkan resolusi frekuensi.
    - **Max Frequency:** Tarik slider vertikal hingga mencapai 20 kHz - 22 kHz.
5. Gunakan tombol Scroll Mouse untuk memperbesar (_zoom-in_) pada area frekuensi tinggi hingga pola teks flag terbaca.

text

```
+-------------------------------------------------------------+
| FREQUENCY (Hz)                                              |
| 22 kHz |  .-.   .-.   .---.   .-.                           |
|        |  | |   | |   | o |   | |    <--- FLAG TERBACA      |
| 18 kHz |  | '---' |   |   <   | '---.     SECARA VISUAL     |
|        |  `-------'   `---'   `-----'                       |
| 10 kHz |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ (Noise musik)   |
|  0 kHz |  ================================                  |
|        +----------------------------------------------------+
|        0s                   TIME                         10s|
+-------------------------------------------------------------+
```

#### B. Analisis Menggunakan Audacity

Alternatif menggunakan Audacity:

1. Buka file audio:
    
    Bash
    
    ```
    audacity secret_audio.wav &
    ```
    
2. Di sebelah kiri waveform, klik nama track audio (menu dropdown kecil dengan panah ke bawah).
3. Ubah mode tampilan dari **Waveform** menjadi **Spectrogram**.
4. Buka menu **Audacity** →→ **Preferences** →→ **Spectrograms**:
    - Set **Max Frequency (Hz)** ke nilai maksimum sampling (misal: `22050`).
5. Flag visual akan langsung terlihat pada track window.

#### C. Headless CLI Spectrogram Generation (SoX & Python)

Jika berada di terminal SSH tanpa akses GUI, buat file spectrogram dalam bentuk gambar PNG menggunakan `sox`:

Bash

```
# Generate spectrogram resolusi tinggi menjadi file gambar spectro.png
sox target.wav -n spectrogram -Y 1024 -X 2000 -o spectro.png

# Buka gambar di Parrot OS XFCE
ristretto spectro.png &
```

Parameter `sox`:

- `-n`: Mengarahkan output audio ke null (hanya memproses efek).
- `spectrogram`: Efek rendering spektrum frekuensi.
- `-Y 1024`: Resolusi tinggi vertikal (ketinggian pixel).
- `-X 2000`: Resolusi horizontal per detik (melebarkan spektrum agar tulisan tidak gepeng).
- `-o spectro.png`: Nama file output.

---

### 2.3 Audio LSB Steganography

#### A. Ekstraksi Manual Audio WAV LSB (Python Script)

Simpan script berikut sebagai `/usr/local/bin/wav_lsb.py`:

Python

```
#!/usr/bin/env python3
import wave
import sys
import argparse

def extract_wav_lsb(wav_path, num_bytes=128):
    try:
        audio = wave.open(wav_path, mode='rb')
    except Exception as e:
        print(f"[-] Gagal membuka WAV file: {e}")
        sys.exit(1)

    frame_bytes = bytearray(list(audio.readframes(audio.getnframes())))
    audio.close()

    print(f"[*] Total audio frames: {len(frame_bytes)} bytes")
    
    # Ekstraksi LSB bit dari setiap byte sample
    extracted_bits = [str(b & 1) for b in frame_bytes]
    bit_string = "".join(extracted_bits)

    # Konversi bits ke bytes
    extracted_payload = bytearray()
    for i in range(0, len(bit_string), 8):
        byte_chunk = bit_string[i:i+8]
        if len(byte_chunk) < 8:
            break
        extracted_payload.append(int(byte_chunk, 2))

    return bytes(extracted_payload)

def main():
    parser = argparse.ArgumentParser(description="WAV Audio LSB Extractor")
    parser.add_argument("wav_file", help="Path ke file WAV target")
    parser.add_argument("-o", "--output", help="Simpan raw output ke file binary")
    parser.add_argument("-n", "--bytes", type=int, default=256, help="Jumlah byte yang dipreview")
    args = parser.parse_args()

    payload = extract_wav_lsb(args.wav_file, args.bytes)

    if args.output:
        with open(args.output, "wb") as f:
            f.write(payload)
        print(f"[+] Payload berhasil disimpan ke {args.output}")
    else:
        print(f"[*] Preview {args.bytes} bytes data tersembunyi:")
        preview = ""
        for b in payload[:args.bytes]:
            if 32 <= b <= 126:
                preview += chr(b)
            else:
                preview += "."
        print(preview)

if __name__ == "__main__":
    main()
```

Eksekusi:

Bash

```
python3 /usr/local/bin/wav_lsb.py challenge.wav -n 100
```

#### B. Tool DeepSound (via Wine)

Banyak soal CTF Windows menggunakan utility **DeepSound**. Di Parrot OS, jalankan DeepSound menggunakan compatibility layer `wine`:

Bash

```
# Pastikan wine terinstal
sudo apt install -y wine

# Download DeepSound installer resmi atau portable zip
# Jalankan DeepSound under Wine environment:
wine DeepSound.exe
```

DeepSound mendukung password protection pada payload file audio WAV dan FLAC.

---

### 2.4 MP3 Metadata & Audio Streams

Pada file MP3, frame metadata ID3v2 sering menyembunyikan payload pada tag terkompresi non-standar:

Bash

```
# 1. Tampilkan seluruh metadata audio termasuk tag yang tidak terdefinisi
exiftool -a -u -s target.mp3

# Field spesifik yang wajib diperhatikan:
# - Comment
# - Lyrics / USLT (Unsynchronized lyrics transcription)
# - TXXX (User-defined text information)
# - APIC (Attached Picture / Cover art manipulation)

# 2. Ekstraksi cover image dari MP3 (Cover art bisa saja membawa LSB image stego terpisah)
ffmpeg -i target.mp3 -an -vcodec copy extracted_cover.jpg
```

---

## 📄 Bagian 3: Text Steganography

### 3.1 Whitespace Steganography (Stegsnow)

Penyisipan data pada file teks ASCII dengan mengeksploitasi karakter spasi (`0x20`) dan tabulasi (`0x09`) di akhir baris (_trailing whitespaces_). Karakter ini tidak terlihat pada teks editor biasa.

Bash

```
# 1. Deteksi keberadaan trailing whitespace menggunakan cat
cat -A target.txt | head -n 15
# Tab akan tampil sebagai '^I' dan Newline sebagai '$'.
# Trailing spaces terlihat sebagai spasi biasa yang menumpuk sebelum tanda '$' (misal: "Hello World   ^I  $").

# 2. Ekstraksi data menggunakan stegsnow tanpa password
stegsnow -C target.txt

# 3. Ekstraksi data menggunakan stegsnow dengan password
stegsnow -C -p "password123" target.txt
```

---

### 3.2 Zero-Width Characters (ZWC)

Penyisipan bit informasi biner menggunakan karakter Unicode tak kasat mata (_invisible non-printable characters_):

- `U+200B` : Zero-Width Space (sering merepresentasikan bit `0`)
- `U+200C` : Zero-Width Non-Joiner (sering merepresentasikan bit `1`)
- `U+200D` : Zero-Width Joiner
- `U+FEFF` : Zero-Width No-Break Space (BOM)

#### Deteksi CLI:

Bash

```
# Cek apakah file teks mengandung rangkaian UTF-8 hex byte e2 80 atau ef bb
cat target.txt | xxd | grep -E "e2 80|ef bb"
```

#### Script Dekoder Otomatis ZWC (Python)

Simpan script berikut sebagai `/usr/local/bin/zwc_decode.py`:

Python

```
#!/usr/bin/env python3
import sys

def decode_zwc(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    binary_str = ""
    found_zwc = False

    # Mapping representasi umum biner di CTF
    for char in content:
        cp = ord(char)
        if cp == 0x200B:      # Zero-Width Space -> Bit 0
            binary_str += "0"
            found_zwc = True
        elif cp == 0x200C:    # Zero-Width Non-Joiner -> Bit 1
            binary_str += "1"
            found_zwc = True
        elif cp == 0x200D:    # Alternatif mapping
            binary_str += " "

    if not found_zwc:
        print("[-] Tidak ditemukan karakter Zero-Width (U+200B, U+200C).")
        return

    print(f"[+] Ditemukan {len(binary_str)} bits ZWC.")

    # Rekonstruksi binary ke teks ASCII
    chars = []
    for i in range(0, len(binary_str), 8):
        byte = binary_str[i:i+8]
        if len(byte) == 8:
            chars.append(chr(int(byte, 2)))

    decoded_text = "".join(chars)
    print(f"[+] Hasil Dekode:\n{decoded_text}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file_target.txt>")
        sys.exit(1)
    decode_zwc(sys.argv[1])
```

Eksekusi:

Bash

```
python3 /usr/local/bin/zwc_decode.py secret_doc.txt
```

---

### 3.3 Homoglyph / Typo Steganography

Serangan _Homoglyph_ mengganti karakter Latin normal dengan karakter alfabet Cyrillic atau Yunani yang identik secara visual (contoh: huruf Latin `a` `[U+0061]` diganti dengan huruf Cyrillic `а` `[U+0430]`).

Bash

```
# Memeriksa kode Unicode dari setiap karakter dalam teks menggunakan Python
python3 -c '
import sys
text = open(sys.argv[1], "r", encoding="utf-8").read()
anomalies = []
for idx, c in enumerate(text):
    if ord(c) > 127: # Di luar standar ASCII 7-bit
        anomalies.append((idx, c, hex(ord(c)), ord(c)))
if anomalies:
    print(f"[!] Ditemukan {len(anomalies)} karakter non-ASCII (Homoglyph):")
    for item in anomalies[:20]:
        print(f"Index {item[0]}: char={item[1]} unicode={item[2]}")
else:
    print("[*] Teks bersih (Pure standard ASCII).")
' target.txt
```

---

## 🔍 Bagian 4: Steganalysis

Steganalysis adalah disiplin ilmu untuk mendeteksi **keberadaan data tersembunyi** tanpa harus mengekstraksinya terlebih dahulu.

### 4.1 Chi-Square (χ2χ2) Attack

Metode statistik untuk mendeteksi LSB spatial embedding. Pada gambar alami yang belum dimodifikasi, distribusi frekuensi nilai pixel genap (2k2k) dan ganjil (2k+12k+1) berbeda secara alami. Proses penulisan bit LSB acak menyamakan probabilitas kemunculan pasangan nilai ini (_Pairs of Values - PoV_).

Jika nilai statistik chi-square mendekati 1 secara linear di seluruh koordinat gambar, dapat dipastikan gambar tersebut memuat payload LSB buatan.

### 4.2 Visual Attack (Amplify Noise)

Jika bit LSB dimanipulasi, kita dapat mengekspos noise tersebut dengan memaksa level kontras bit terendah naik ke nilai maksimum (255) menggunakan `convert` dari ImageMagick:

Bash

```
# Isolasi dan perjelas noise LSB pada channel warna Red
convert target.png -channel R -evaluate and 1 -evaluate multiply 255 noise_red.png

# Buka gambar hasil amplifikasi
ristretto noise_red.png &
# Gambar natural akan menghasilkan static noise acak. 
# Jika ada teks atau bidang persegi panjang dengan noise berbeda, area tersebut memuat data LSB.
```

### 4.3 Analisis Rasio Ukuran File

|Format|Dimensi Resolusi|Estimasi Ukuran Wajar|Indikasi Anomali|
|---|---|---|---|
|**PNG (TrueColor)**|1920×10801920×1080|1.5 MB – 3.5 MB|Ukuran > 10 MB mengindikasikan payload ZIP/data terselip di IDAT / trailing.|
|**BMP (24-bit)**|800×600800×600|800×600×3+54≈1.44 MB800×600×3+54≈1.44 MB|Jika ukuran menyimpang signifikan dari rumus: Width×Height×Bpp+54Width×Height×Bpp+54, ada _appended data_.|
|**WAV (16-bit 44.1kHz Stereo)**|Durasi 10 Detik|≈1.76 MB≈1.76 MB|Ukuran audio melebihi perhitungan raw audio stream.|

---

### 4.4 Analisis Entropi Menggunakan `binwalk`

Entropi mengukur tingkat keacakan data (skala 0.0 sampai 1.0).

- **0.0 - 0.3:** Data teks biasa atau barisan byte bernilai nol (`0x00`).
- **0.8 - 0.9:** Data kompresi normal (PNG IDAT, JPEG).
- **0.95 - 1.0:** Data terenkripsi (AES) atau file arsip terkompresi kuat (ZIP, 7z).

Bash

```
# Generate visual plot kurva entropi file target
binwalk -E target.png
```

text

```
ENTROPY GRAPH:
1.0 |               ********************************* (Payload Terenkripsi/ZIP)
    |              *
0.8 | *************                                   (Normal PNG data)
    |
0.0 +-------------------------------------------------
    0 KB           500 KB                            1.2 MB
```

_Interpretasi:_ Jika terdapat kenaikan tajam entropi mendekati 1.0 di akhir file gambar atau audio, terdapat payload biner terenkripsi yang disisipkan di segmen tersebut.

---

## 🎯 Bagian 5: Common CTF Stego Patterns

Berikut adalah 12 pattern stego paling sering muncul di CTF beserta trigger, command, dan analisanya.

### Pattern 1: Spectrogram dengan Flag Visual

- **Trigger / Indikasi:** File berformat `.wav` berdurasi pendek (<30s), terdengar suara dengung (_screeching sound_) berisik di frekuensi tinggi.
- **Tool:** `sonic-visualiser` atau `sox`.
- **Command:**
    
    Bash
    
    ```
    sox challenge.wav -n spectrogram -Y 800 -X 1500 -o result.png
    ```
    
- **Cara Baca Hasil:** Buka `result.png`. Flag langsung terbaca sebagai tulisan visual pada koordinat frekuensi di atas 15.000 Hz.

---

### Pattern 2: PNG LSB Payload (Single / Combined Channel)

- **Trigger / Indikasi:** File gambar PNG terlihat normal tanpa artefak visual, metadata standar bersih.
- **Tool:** `zsteg`.
- **Command:**
    
    Bash
    
    ```
    zsteg -a target.png | grep -E "CTF\{|flag\{"
    ```
    
- **Cara Baca Hasil:** `zsteg` menandai channel yang cocok, contoh: `b1,bgr,lsb,xy .. text: "picoCTF{1sb_rulez}"`. Ekstraksi langsung dengan flag `-E`.

---

### Pattern 3: Steghide JPEG dengan Password Tersembunyi

- **Trigger / Indikasi:** Gambar format JPEG, deskripsi challenge memberi petunjuk (_hint_) seperti kata sandi atau nama karakter tertentu.
- **Tool:** `stegseek`.
- **Command:**
    
    Bash
    
    ```
    stegseek target.jpg /usr/share/wordlists/rockyou.txt
    ```
    
- **Cara Baca Hasil:** Stegseek otomatis mengekstrak file ke `target.jpg.out`. Baca menggunakan utility `file` dan `cat`.

---

### Pattern 4: Teks Rahasia di EXIF Comment / Tag Kustom

- **Trigger / Indikasi:** Challenge bernilai point rendah (_easy_), hint "look closer into details".
- **Tool:** `exiftool`.
- **Command:**
    
    Bash
    
    ```
    exiftool -all target.jpg | grep -iE "flag|comment|artist|desc"
    ```
    
- **Cara Baca Hasil:** Flag tertulis langsung di baris `Comment: flag{3x1f_d4t4_r3v34l3d}` atau di-encode Base64.

---

### Pattern 5: Appended ZIP Archive (Polyglot)

- **Trigger / Indikasi:** Ukuran file lebih besar dari biasanya; hex editor memperlihatkan header kedua di tengah file. _(Referensi File 55: Forensics)_.
- **Tool:** `binwalk`.
- **Command:**
    
    Bash
    
    ```
    binwalk -e target.png
    ```
    
- **Cara Baca Hasil:** Ekstraksi menghasilkan folder `_target.png.extracted/` yang memuat file arsip ZIP atau file biner lainnya.

---

### Pattern 6: Multi-layer Pipeline (LSB →→ Base64 →→ ROT13)

- **Trigger / Indikasi:** Hasil ekstraksi LSB memunculkan string terenkode (misal: diakhiri `=` atau karakter bergeser).
- **Tool:** `zsteg` + bash pipeline (`base64`, `tr`).
- **Command:**
    
    Bash
    
    ```
    zsteg -E "b1,rgb,lsb,xy" target.png | base64 -d | tr 'A-Za-z' 'N-ZA-Mn-za-m'
    ```
    
- **Cara Baca Hasil:** Payload LSB di-decode dari Base64, lalu diputar 13 karakter (ROT13) hingga terbaca format flag yang valid.

---

### Pattern 7: BMP Raw LSB Manual Parsing

- **Trigger / Indikasi:** Format file adalah `.bmp`, `zsteg` gagal atau tidak terpasang.
- **Tool:** Python CLI.
- **Command:**
    
    Bash
    
    ```
    python3 /usr/local/bin/custom_lsb.py challenge.bmp -c 0 -b 0 -d xy
    ```
    
- **Cara Baca Hasil:** Data karakter flag tampil langsung pada terminal preview.

---

### Pattern 8: Audio Morse Code pada Kanal Tertentu

- **Trigger / Indikasi:** Suara audio memuat nada ketukan pendek (_dot_) dan panjang (_dash_), terkadang hanya terdengar di kanal kiri (_left ear_).
- **Tool:** Audacity.
- **Command:** Buka file audio di Audacity. Periksa track Waveform.
- **Cara Baca Hasil:** Amplitudo gelombang menampilkan pulsa pendek (`.`) dan pulsa panjang (`-`). Salin pola ke online decoder Morse atau decode manual: `... --- ...` = `SOS`.

---

### Pattern 9: Zero-Width Characters di File Teks/Markdown

- **Trigger / Indikasi:** Deskripsi soal berupa file `.txt` atau `.md` yang tampak biasa saja, namun ukuran file beberapa kilobyte lebih besar daripada jumlah karakter kasat mata.
- **Tool:** `zwc_decode.py`.
- **Command:**
    
    Bash
    
    ```
    python3 /usr/local/bin/zwc_decode.py document.txt
    ```
    
- **Cara Baca Hasil:** Script menerjemahkan spasi invisible (U+200B/U+200C) menjadi untaian biner dan menampilkannya sebagai teks ASCII flag.

---

### Pattern 10: Stegsnow Whitespace Payload

- **Trigger / Indikasi:** File teks ASCII yang memiliki tab dan spasi berlebih di akhir setiap baris (`cat -A target.txt` menampilkan `..^I$`).
- **Tool:** `stegsnow`.
- **Command:**
    
    Bash
    
    ```
    stegsnow -C target.txt
    ```
    
- **Cara Baca Hasil:** Teks payload langsung dicetak di baris terminal berikutnya.

---

### Pattern 11: GIF Frame Timing / Palette Delay Anomalies

- **Trigger / Indikasi:** File animasi GIF berkedip cepat atau nilai delay antar frame tampak tidak wajar.
- **Penjelasan & Keterangan:**  
  Nilai GIF frame delay secara standar dihitung dalam unit **1/100 detik** (misal: delay `100` = 1 detik). Jika delay antar frame memperlihatkan pola nilai desimal tidak biasa (misal angka 100, 110, 110, 97, 103), author CTF kemungkinan menyisipkan karakter ASCII desimal di nilai delay tersebut.
- **Tool:** `identify` (ImageMagick), `convert`, `python3`.
- **Command & Workflow:**
    
    Bash
    
    ```
    # 1. Cek nilai delay (1/100s) antar frame
    identify -format "%T " target.gif
    
    # 2. Jika delay membentuk pola ASCII desimal (misal: 100 110 110 97 103):
    python3 -c 'print("".join(chr(d) for d in [100,110,110,97,103]))'
    # Output: dnnag

    # 3. METODE UMUM GIF: Ekstrak seluruh frame GIF untuk dianalisis terpisah
    mkdir -p frames && convert -coalesce target.gif frames/frame_%03d.png
    for f in frames/*.png; do zsteg "$f" 2>/dev/null | grep -iE "flag|ctf{"; done
    ```

---

### Pattern 12: PNG Chunk tEXt Tersembunyi

- **Trigger / Indikasi:** `pngcheck -v` menampilkan peringatan (_warning_) atau mendeteksi chunk metadata `tEXt` atau `zTXt`.
- **Tool:** `pngcheck` & Python.
- **Command:**
    
    Bash
    
    ```
    python3 -c '
    import zlib, sys
    with open("target.png", "rb") as f:
        data = f.read()
    idx = 0
    while True:
        idx = data.find(b"tEXt", idx)
        if idx == -1: break
        length = int.from_bytes(data[idx-4:idx], "big")
        print("[+] Chunk tEXt:", data[idx+4:idx+4+length])
        idx += 4
    '
    ```
    
- **Cara Baca Hasil:** Script membedah isi data chunk `tEXt` langsung dari byte struktur tanpa terpengaruh integritas display renderer.

---

## 🗺️ Bagian 6: Workflow Master Stego

Gunakan peta alur keputusan berikut setiap kali menerima file tantangan steganography:

text

```
                          [ ANALISIS FILE MASUK ]
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
      [ GAMBAR ]                  [ AUDIO ]                 [ TEKS ]
           │                         │                         │
  ┌────────┴────────┐       ┌────────┴────────┐       ┌────────┴────────┐
  ▼                 ▼       ▼                 ▼       ▼                 ▼
[PNG/BMP]         [JPG]   [WAV]             [MP3]   [TRAIL SPACE]     [ZWC]
  │                 │       │                 │       │                 │
  ├► pngcheck       ├► exif ├► Spectrogram    ├► exif ├► cat -A         ├► xxd grep
  ├► zsteg -a       ├► steg    (Sonic/SoX)    ├► id3v ├► stegsnow -C    │  "e2 80"
  ├► Aperisolve     │  seek ├► wav_lsb.py     └► Lame └► stegsnow -p    └► zwc_decode
  └► custom_lsb     └► jsteg└► deepsound         tag
```

---

## 🛠️ Bagian 7: Troubleshooting & Common Errors

### 1. `zsteg` Mengembalikan Zero Result (Tidak Ada Text Terbaca)

- **Penyebab:** Bit payload dienkripsi dengan XOR/password, disisipkan pada bit selain bit 0, atau channel gambar terbalik (misal: BGR bukan RGB).
- **Solusi:** Jalankan pemindaian ekstensif:
    
    Bash
    
    ```
    zsteg -a -v target.png
    ```
    
    Jika tetap nihil, buka di Aperisolve untuk memeriksa kemungkinan penyisipan visual plane.

### 2. Steghide: "could not extract any data with that passphrase!"

- **Penyebab:** Passphrase salah, atau file JPEG tersebut sama sekali tidak dibuat menggunakan algoritma Steghide (kemungkinan menggunakan `jsteg`, `outguess`, atau payload berada di EXIF).
- **Solusi:**
    
    Bash
    
    ```
    # 1. Bruteforce menggunakan stegseek
    stegseek target.jpg /usr/share/wordlists/rockyou.txt
    # 2. Coba engine jsteg jika stegseek gagal
    jsteg reveal target.jpg out.txt
    ```
    

### 3. Stegseek: "0 results from rockyou.txt"

- **Penyebab:** Password tidak ada di wordlist default, atau password diambil dari petunjuk konteks soal (nama file, author, judul challenge).
- **Solusi:** Buat custom wordlist menggunakan petunjuk challenge:
    
    Bash
    
    ```
    echo -e "ChallengeName\nChallengeName2024\nAuthorName" > custom_pass.txt
    stegseek target.jpg custom_pass.txt
    ```
    

### 4. Spectrogram Sonic Visualiser Gelap / Tidak Ada Tulisan Visual

- **Penyebab:** Skala frekuensi salah, audio terlalu pelan (_gain_ rendah), atau teks berada di frekuensi sangat rendah (sub-bass).
- **Solusi:** Di panel kanan Sonic Visualiser:
    - Ubah skala dari `Log` ke `Linear`.
    - Ubah parameter **Min Frequency** ke `0 Hz` dan **Max Frequency** ke `22050 Hz`.
    - Naikkan slider **Gain/Threshold** untuk memperjelas kontras sinyal yang lemah.

### 5. Output LSB Tampak Random / High Entropy

- **Penyebab:** Penulis soal mengenkripsi string flag menggunakan XOR atau AES sebelum disisipkan ke LSB.
- **Solusi:** Ekstraksi byte tersebut ke file mentah (`.bin`), lalu analisis menggunakan CyberChef (Magic Recipe) atau cari kunci XOR sederhana:
    
    Bash
    
    ```
    zsteg -E "b1,rgb,lsb,xy" target.png > raw.bin
    xortool raw.bin
    ```
    

### 6. File Audio Corrupt / Tidak Bisa Diputar Setelah Diunduh

- **Penyebab:** Header RIFF/WAV rusak akibat mode transfer binary/ASCII FTP yang keliru, atau ukuran byte header terpotong.
- **Solusi:** Periksa dan perbaiki header RIFF menggunakan hex editor (`ghex` atau `hexedit`): 4 byte pertama wajib bernilai `52 49 46 46` (`RIFF`) dan byte 8-11 bernilai `57 41 56 45` (`WAVE`).

### 7. Hasil Ekstraksi `stegsnow` Berupa Karakter Rusak

- **Penyebab:** File teks diproteksi password, atau teks terkompresi menggunakan algoritma kompresi bawaan snow.
- **Solusi:** Selalu coba flag `-C` (kompresi) dan supply wordlist jika ada dugaan penggunaan password.

### 8. `pngcheck` Melaporkan: "CRC error in chunk ... calculated ..."

- **Penyebab:** Dimensi lebar atau tinggi PNG sengaja diubah oleh author untuk menyembunyikan bagian bawah gambar (_PNG Height Manipulation_).
- **Solusi:** _(Lihat File 55: Fix PNG Dimensions using CRC checksum calculation)_.

### 9. Python Script PIL Melaporkan: "DecompressionBombError"

- **Penyebab:** Gambar target berukuran resolusi raksasa (Pixel Flood / Zip Bomb style).
- **Solusi:** Tambahkan baris berikut di awal script Python sebelum membuka gambar:
    
    Python
    
    ```
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    ```
    

### 10. Aperisolve Web Gagal Memproses File (>50MB)

- **Penyebab:** Limitasi upload server Aperisolve.
- **Solusi:** Lakukan analisis dekomposisi bit-plane secara lokal menggunakan ImageMagick:
    
    Bash
    
    ```
    for b in {0..7}; do
        convert target.png -channel R -evaluate and $((1 << b)) -evaluate multiply 255 "r_plane_${b}.png"
    done
    ```
    

---

## 📋 Bagian 8: Cheatsheet Stego Copy-Paste Ready

### Image Steganography

Bash

```
# PNG/BMP Full Auto Scan
zsteg -a target.png

# PNG Specific Channel Extraction to Binary
zsteg -E "b1,rgb,lsb,xy" target.png > payload.bin

# JPEG Fast Brute Force
stegseek target.jpg /usr/share/wordlists/rockyou.txt flag.txt

# JPEG Jsteg Reveal
jsteg reveal target.jpg out.txt

# PNG Chunk Verbose Verification
pngcheck -vtp target.png

# Visual Plane R0 Isolation
convert target.png -channel R -evaluate and 1 -evaluate multiply 255 visual_r0.png
```

### Audio Steganography

Bash

```
# Headless High-Res Spectrogram Generation
sox target.wav -n spectrogram -Y 1024 -X 2000 -o spectro.png

# GUI Spectrogram Launch
sonic-visualiser target.wav &

# Audio Metadata Full Dump
exiftool -a -u -s target.mp3

# Extract Audio Cover Art
ffmpeg -i target.mp3 -an -vcodec copy cover.jpg
```

### Text Steganography

Bash

```
# Stegsnow Decompress & Extract
stegsnow -C target.txt

# Stegsnow With Password
stegsnow -C -p "pass123" target.txt

# Detect Trailing Whitespaces
cat -A target.txt | grep "\s\\$"

# Check for Zero-Width Characters Hex Sequence
xxd target.txt | grep -E "e2 80|ef bb"
```

### Clean & Verify Flag dari Output Binary

Bash

```
# 1. Pindai string flag langsung dari file binary hasil ekstraksi
strings extracted.bin | grep -Ei "flag\{|ctf\{|picoctf\{|htb\{"

# 2. Tampilkan semua karakter printable (menghapus NULL bytes & noise)
cat extracted.bin | tr -cd '[:print:]' | head -c 200

# 3. Jika hasil ekstraksi berupa Base64 ter-encode:
cat extracted.bin | base64 -d 2>/dev/null | strings | grep -i flag
```

---

# [🏛️ Bagian 0: Fondasi Steganography](/docs/steganography) — Complete Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET_FILE="challenge.png"   # Ganti sesuai file yang diterima
export WORK_DIR=~/stego_loot
mkdir -p $WORK_DIR/{extracted,audio,text,output,creds}
cd $WORK_DIR

echo "[*] Target: $TARGET_FILE"
echo "[*] Work dir: $WORK_DIR"

# Salin file ke work dir agar aman (jangan modifikasi original)
cp "$TARGET_FILE" $WORK_DIR/
TARGET_FILE="$WORK_DIR/$(basename $TARGET_FILE)"
```

**Output yang diharapkan:**

text

```
[*] Target: challenge.png
[*] Work dir: /root/stego_loot
```

---

## ═══════════════════════════════════════

## FASE 0: IDENTIFIKASI & TRIAGE AWAL

## ═══════════════════════════════════════

> **Tujuan:** Kenali jenis file dan cari flag sebelum masuk ke teknik spesifik. Sering CTF easy selesai di sini.

### Langkah 0.1 — Identifikasi Tipe File

Bash

```
# Command 1: Identifikasi berbasis magic bytes
file $TARGET_FILE

# Command 2: Cek 32 byte pertama
xxd $TARGET_FILE | head -n 2

# Command 3: Cek ukuran file (anomali ukuran = hidden data)
ls -lah $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — PNG:**

text

```
challenge.png: PNG image data, 800 x 600, 8-bit/color RGB, non-interlaced
```

➡️ Lanjut ke **Fase 1 (Image Stego — PNG)**

**OUTPUT BERHASIL ✅ — JPEG:**

text

```
challenge.jpg: JPEG image data, JFIF standard 1.01, resolution (DPI), density 96x96
```

➡️ Lanjut ke **Fase 2 (Image Stego — JPEG)**

**OUTPUT BERHASIL ✅ — BMP:**

text

```
challenge.bmp: PC bitmap, Windows 3.x format, 640 x 480 x 24
```

➡️ Lanjut ke **Fase 3 (Image Stego — BMP)**

**OUTPUT BERHASIL ✅ — GIF:**

text

```
challenge.gif: GIF image data, version 89a, 400 x 300
```

➡️ Lanjut ke **Fase 4 (Image Stego — GIF)**

**OUTPUT BERHASIL ✅ — Audio WAV:**

text

```
challenge.wav: RIFF (little-endian) data, WAVE audio, Microsoft PCM, 16 bit, stereo 44100 Hz
```

➡️ Lanjut ke **Fase 5 (Audio Stego)**

**OUTPUT BERHASIL ✅ — Audio MP3:**

text

```
challenge.mp3: Audio file with ID3 version 2.3.0
```

➡️ Lanjut ke **Fase 5 (Audio Stego)**

**OUTPUT BERHASIL ✅ — Text file:**

text

```
challenge.txt: ASCII text
```

atau

text

```
challenge.txt: UTF-8 Unicode text
```

➡️ Lanjut ke **Fase 6 (Text Stego)**

**OUTPUT GAGAL ❌ — File tidak teridentifikasi ("data"):**

text

```
challenge.bin: data
```

➡️ Magic bytes mungkin rusak. Jalankan:

Bash

```
# Lihat raw magic bytes
xxd $TARGET_FILE | head -n 1
# Cocokkan dengan tabel di bawah
```

|Magic Bytes|Format|Langkah|
|---|---|---|
|`89 50 4E 47`|PNG|→ Fase 1|
|`FF D8 FF`|JPEG|→ Fase 2|
|`42 4D`|BMP|→ Fase 3|
|`47 49 46 38`|GIF|→ Fase 4|
|`52 49 46 46` + `57 41 56 45`|WAV|→ Fase 5|
|`49 44 33`|MP3|→ Fase 5|
|Tidak ada pola|Corrupt/Obfuscated|→ Langkah 0.2|

---

### Langkah 0.2 — Quick Flag Hunt (Sering Ketemu!)

Bash

```
# Hunt 1: Flag langsung di strings
strings -n 6 $TARGET_FILE | grep -Ei "flag\{|ctf\{|htb\{|picoctf\{|thm\{"

# Hunt 2: Metadata langsung
exiftool $TARGET_FILE | grep -Ei "comment|description|artist|copyright|software|usercomment|warning"

# Hunt 3: Base64 tersembunyi yang mengandung flag
strings $TARGET_FILE | grep -E "[A-Za-z0-9+/]{24,}={0,2}" | while read b64; do
    decoded=$(echo "$b64" | base64 -d 2>/dev/null)
    echo "$decoded" | grep -qEi "flag\{|ctf\{" && echo "[+] BASE64 FLAG: $decoded (from: $b64)"
done

# Hunt 4: Embedded files
binwalk $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — Flag langsung di strings:**

text

```
FLAG{pl41nt3xt_h1dd3n}
```

➡️ **SELESAI!** Submit flag.

**OUTPUT BERHASIL ✅ — Flag di metadata:**

text

```
User Comment                    : FLAG{m3t4d4t4_3xp0s3d}
```

➡️ **SELESAI!** Submit flag.

**OUTPUT BERHASIL ✅ — Ada embedded files dari binwalk:**

text

```
45120    0xB040    Zip archive data, compressed size: 1024, name: flag.txt
```

➡️ Extract dulu:

Bash

```
binwalk -e $TARGET_FILE -C $WORK_DIR/extracted/
ls -la $WORK_DIR/extracted/_*.extracted/
cat $WORK_DIR/extracted/_*.extracted/flag.txt 2>/dev/null
```

**OUTPUT GAGAL ❌ — Tidak ada yang obvious:**  
➡️ Lanjut ke fase sesuai tipe file yang teridentifikasi di Langkah 0.1.

---

## ═══════════════════════════════════════

## FASE 1: IMAGE STEGO — PNG / BMP

## ═══════════════════════════════════════

> **PNG & BMP = format lossless → vektor utama LSB steganography**

### Langkah 1.1 — zsteg Full Scan (Tool Paling Cepat untuk PNG/BMP)

Bash

```
# Command 1: Scan otomatis semua kombinasi LSB/MSB (JALANKAN INI DULU)
zsteg -a $TARGET_FILE

# Command 2: Filter langsung untuk flag
zsteg -a $TARGET_FILE | grep -Ei "flag\{|ctf\{|htb\{|picoctf\{"

# Command 3: Verbose output (lebih detail)
zsteg -a -v $TARGET_FILE | head -100
```

**OUTPUT BERHASIL ✅ — Flag ditemukan langsung:**

text

```
b1,rgb,lsb,xy         .. text: "FLAG{lsb_rgb_easy}"
b1,bgr,lsb,xy         .. text: "W#S%" (noise — ignore)
b2,r,msb,xy           .. file: Zip archive data
```

➡️ Flag ditemukan di `b1,rgb,lsb,xy`. **SELESAI!**

**OUTPUT BERHASIL ✅ — Ada file ZIP tersembunyi:**

text

```
b2,r,msb,xy           .. file: Zip archive data
```

➡️ Ekstrak file tersebut:

Bash

```
# Ekstrak ke file
zsteg -E "b2,r,msb,xy" $TARGET_FILE > $WORK_DIR/extracted/hidden.zip
file $WORK_DIR/extracted/hidden.zip

# Jika valid ZIP:
unzip $WORK_DIR/extracted/hidden.zip -d $WORK_DIR/extracted/unzipped/
cat $WORK_DIR/extracted/unzipped/*
```

**OUTPUT BERHASIL ✅ — Ada base64 tersembunyi:**

text

```
b1,rgb,lsb,xy         .. text: "RkxBR3tsc2JfYjY0X2RlY29kZWR9"
```

➡️ Decode:

Bash

```
echo "RkxBR3tsc2JfYjY0X2RlY29kZWR9" | base64 -d
# Output: FLAG{lsb_b64_decoded}
```

**OUTPUT GAGAL ❌ — zsteg output semua noise:**

text

```
b1,rgb,lsb,xy         .. text: ".N..M.!../..x"
b1,bgr,lsb,xy         .. text: "...@.#.!.."
```

➡️ Tidak ada LSB standar. Lanjut **Langkah 1.2**.

**OUTPUT GAGAL ❌ — zsteg: command not found:**

text

```
bash: zsteg: command not found
```

➡️ Install dulu:

Bash

```
sudo apt install -y ruby ruby-dev
sudo gem install zsteg
# Jika masih tidak bisa, panggil langsung:
~/.local/share/gem/ruby/3.0.0/bin/zsteg -a $TARGET_FILE
```

---

### Langkah 1.2 — PNG Chunk Analysis

Bash

```
# Verifikasi integritas chunk PNG
pngcheck -vtp $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — Ada chunk tEXt mencurigakan:**

text

```
File: challenge.png (142055 bytes)
  chunk IHDR at offset 0x0000c, length 13
    800 x 600, 8-bit/color RGB, non-interlaced
  chunk tEXt at offset 0x00025, length 64, keyword: Comment
    flat data: "ZmxhZ3tjaHVuazNfeHRyYWN0aTBuX2NvbXBsZXRlfQ=="
  chunk IDAT at offset 0x00071, length 141914
  chunk IEND at offset 0x022b77, length 0
No errors detected.
```

➡️ Ada Base64 di chunk tEXt! Decode:

Bash

```
echo "ZmxhZ3tjaHVuazNfeHRyYWN0aTBuX2NvbXBsZXRlfQ==" | base64 -d
# Output: flag{chunk3_xtracti0n_complet}
```

➡️ **SELESAI!**

**OUTPUT BERHASIL ✅ — CRC error di IHDR (dimensi dimanipulasi):**

text

```
CRC error in chunk IHDR (computed 7a3b4c12, expected 00000000)
```

➡️ PNG height tampering! Perbaiki:

Bash

```
# Cek dimensi saat ini vs yang seharusnya
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
    
    crc_calc = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
    print(f"[*] CRC tersimpan: {hex(crc_stored)}")
    print(f"[*] CRC seharusnya: {hex(crc_calc)}")
    print(f"[!] CRC mismatch — height kemungkinan dimanipulasi!")
EOF
```

Bash

```
# Fix dengan mencoba berbagai height multiplier
python3 << 'EOF'
import struct, zlib, shutil

shutil.copy("challenge.png", "challenge_fixed.png")

with open("challenge_fixed.png", "r+b") as f:
    f.seek(8)  # Skip magic
    chunk_len = struct.unpack(">I", f.read(4))[0]
    f.seek(8 + 4)  # Back to chunk type
    chunk_type = f.read(4)
    chunk_data = bytearray(f.read(chunk_len))
    
    current_height = struct.unpack(">I", chunk_data[4:8])[0]
    print(f"[*] Current height: {current_height}")
    
    # Coba 2x dulu (paling umum)
    for mult in [2, 3, 4, 6, 8]:
        new_height = current_height * mult
        chunk_data[4:8] = struct.pack(">I", new_height)
        new_crc = zlib.crc32(b"IHDR" + bytes(chunk_data)) & 0xFFFFFFFF
        
        f.seek(8 + 4 + 4)  # Jump to chunk data
        f.write(chunk_data)
        f.seek(8 + 4 + 4 + chunk_len)
        f.write(struct.pack(">I", new_crc))
        
        print(f"[*] Mencoba height {new_height} (x{mult}) → CRC: {hex(new_crc)}")
        print("[*] Buka challenge_fixed.png dan cek apakah ada konten baru di bawah!")
        break  # Test satu per satu
EOF

# Buka dan cek
eog challenge_fixed.png &
```

**OUTPUT GAGAL ❌ — pngcheck: command not found:**

Bash

```
sudo apt install -y pngcheck
```

---

### Langkah 1.3 — Visual Plane Analysis (BitPlane)

Bash

```
# Isolasi bit plane terendah (LSB) dari channel Red
# Jika ada teks/QR code di sini = stego visual
convert $TARGET_FILE -channel R -evaluate and 1 -evaluate multiply 255 \
    $WORK_DIR/output/r_plane0.png

# Lakukan untuk semua channel dan beberapa bit
for channel in R G B; do
    for bit in 0 1 2; do
        val=$((1 << bit))
        convert $TARGET_FILE -channel $channel \
            -evaluate and $val -evaluate multiply 255 \
            $WORK_DIR/output/plane_${channel}${bit}.png
    done
done

echo "[*] Buka semua plane image dan cari teks/QR code"
ls -la $WORK_DIR/output/
```

**OUTPUT BERHASIL ✅ — Buka image, ada teks atau QR code terlihat:**  
➡️ Screenshot area tersebut atau scan QR:

Bash

```
# Jika ada QR code di bit plane
zbarimg $WORK_DIR/output/plane_R0.png

# Jika ada teks langsung:
# Baca secara manual dengan eye of gnome
eog $WORK_DIR/output/plane_R0.png
```

**OUTPUT GAGAL ❌ — Semua plane terlihat noise random:**  
➡️ Tidak ada stego visual. Lanjut **Langkah 1.4**.

---

### Langkah 1.4 — Custom LSB Extraction (Manual Script)

> Gunakan ini jika zsteg gagal karena penulis soal menggunakan urutan channel/bit custom.

Bash

```
# Simpan script ini sebagai ~/tools/custom_lsb.py
cat > ~/tools/custom_lsb.py << 'SCRIPT'
#!/usr/bin/env python3
import sys
from PIL import Image

def extract_lsb(image_path, channel='all', bit_pos=0, direction='xy'):
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None  # Bypass size limit
    
    img = Image.open(image_path)
    width, height = img.size
    pixels = img.load()
    
    if direction == 'xy':
        coords = [(x, y) for y in range(height) for x in range(width)]
    else:  # yx = vertical
        coords = [(x, y) for x in range(width) for y in range(height)]
    
    bits = []
    for x, y in coords:
        pixel = pixels[x, y]
        if isinstance(pixel, int):
            pixel = (pixel, pixel, pixel)
        
        if channel == 'all':
            for c in range(3):
                bits.append(str((pixel[c] >> bit_pos) & 1))
        else:
            c = int(channel)
            bits.append(str((pixel[c] >> bit_pos) & 1))
    
    # Reconstruct bytes
    result = bytearray()
    for i in range(0, len(bits) - 7, 8):
        byte_val = int("".join(bits[i:i+8]), 2)
        result.append(byte_val)
    
    return bytes(result)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: custom_lsb.py <image> [-c 0|1|2|all] [-b 0-7] [-d xy|yx]")
        sys.exit(1)
    
    args = sys.argv[1:]
    img_path = args[0]
    channel = 'all'
    bit_pos = 0
    direction = 'xy'
    
    if '-c' in args: channel = args[args.index('-c') + 1]
    if '-b' in args: bit_pos = int(args[args.index('-b') + 1])
    if '-d' in args: direction = args[args.index('-d') + 1]
    
    data = extract_lsb(img_path, channel, bit_pos, direction)
    
    # Preview
    preview = ""
    for b in data[:300]:
        preview += chr(b) if 32 <= b <= 126 else "."
    print(f"[*] Channel={channel} Bit={bit_pos} Dir={direction}")
    print(f"[*] Preview: {preview[:150]}")
SCRIPT

chmod +x ~/tools/custom_lsb.py

# Coba semua kombinasi umum
for channel in all 0 1 2; do
    for bit in 0 1; do
        for direction in xy yx; do
            result=$(python3 ~/tools/custom_lsb.py $TARGET_FILE -c $channel -b $bit -d $direction 2>/dev/null | grep "Preview:" | grep -Ei "flag\{|ctf\{")
            if [ ! -z "$result" ]; then
                echo "[+] FOUND! channel=$channel bit=$bit direction=$direction"
                echo "$result"
            fi
        done
    done
done
```

**OUTPUT BERHASIL ✅ — Flag ditemukan:**

text

```
[+] FOUND! channel=0 bit=0 direction=yx
[*] Preview: FLAG{custom_lsb_v3rt1c4l}
```

➡️ **SELESAI!**

**OUTPUT GAGAL ❌ — Semua preview noise:**  
➡️ Payload mungkin XOR-encrypted setelah LSB. Lanjut ke:

Bash

```
# Ekstrak raw bytes lalu analisis
python3 ~/tools/custom_lsb.py $TARGET_FILE -c all -b 0 -d xy > $WORK_DIR/output/raw_lsb.bin

# Cek dengan binwalk (mungkin ada embedded file)
binwalk $WORK_DIR/output/raw_lsb.bin

# Coba XOR decrypt (jika key pendek)
# Install xortool dulu jika belum
pip3 install xortool 2>/dev/null
xortool $WORK_DIR/output/raw_lsb.bin

# Atau gunakan CyberChef online untuk analisis
echo "[*] Upload raw_lsb.bin ke https://cyberchef.org → klik 'Magic'"
```

---

### Langkah 1.5 — Aperisolve (Online Tool — Jika Semua CLI Gagal)

Bash

```
# Jika semua tool lokal gagal, gunakan web tool
echo "[*] Upload file ke https://www.aperisolve.com/"
echo "[*] Tool ini otomatis run: zsteg, steghide, exiftool, strings, dll"
echo "[!] WARNING: Jangan upload file sensitif/confidential!"
echo "[*] File path: $TARGET_FILE"
```

**OUTPUT BERHASIL ✅ — Aperisolve menemukan data:**  
➡️ Screenshot hasil, catat tool apa yang berhasil, replicate secara lokal.

---

## ═══════════════════════════════════════

## FASE 2: IMAGE STEGO — JPEG

## ═══════════════════════════════════════

> **JPEG = lossy compression (DCT) → LSB pixel tidak bertahan → pakai steghide/jsteg**

### Langkah 2.1 — Metadata & Quick Checks

Bash

```
# Command 1: Full metadata scan
exiftool -a -u $TARGET_FILE

# Command 2: Filter field yang sering mengandung flag/password
exiftool -a -u $TARGET_FILE | grep -Ei \
    "comment|description|artist|author|copyright|software|usercomment|warning|note"

# Command 3: GPS coordinates (bisa jadi clue)
exiftool -GPS* $TARGET_FILE

# Command 4: Cek apakah ada payload steghide
steghide info $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — Flag di comment:**

text

```
User Comment                    : FLAG{ex1f_d4t4_l34k3d}
```

➡️ **SELESAI!**

**OUTPUT BERHASIL ✅ — GPS coordinates:**

text

```
GPS Position                    : 48 deg 51' 29.88" N, 2 deg 17' 40.20" E
```

➡️ Masukkan ke Google Maps. Nama tempat mungkin = password. Catat.

**OUTPUT BERHASIL ✅ — steghide info mendeteksi ada data:**

text

```
"challenge.jpg":
  format: jpeg
  capacity: 1.2 KB
  Try to get information about the embedded data ?
  (will require password)
```

➡️ Ada data! Lanjut **Langkah 2.2**.

**OUTPUT GAGAL ❌ — Metadata biasa, steghide tidak ada data:**  
➡️ Lanjut **Langkah 2.2** tetap (harus dicoba bruteforce).

---

### Langkah 2.2 — Steghide Extraction

Bash

```
# Method 1: Coba tanpa password dulu (sering kosong di CTF easy)
steghide extract -sf $TARGET_FILE -p "" -f
cat steghide_output.txt 2>/dev/null || ls -la

# Method 2: Jika ada password dari metadata/hint
steghide extract -sf $TARGET_FILE -p "password_dari_metadata" -f

# Method 3: Bruteforce dengan stegseek (JAUH lebih cepat dari stegcracker)
stegseek $TARGET_FILE /usr/share/wordlists/rockyou.txt $WORK_DIR/output/stegseek_out.txt
```

**OUTPUT BERHASIL ✅ — steghide tanpa password:**

text

```
wrote extracted data to "secret.txt".
```

Bash

```
cat secret.txt
file secret.txt   # Mungkin bukan plaintext
```

**OUTPUT BERHASIL ✅ — stegseek menemukan password:**

text

```
StegSeek 0.6 - https://github.com/RickdeJager/stegseek
[i] Found passphrase: "dragonball"
[i] Extracting to "stegseek_out.txt"
```

Bash

```
# Baca file hasil ekstraksi
cat $WORK_DIR/output/stegseek_out.txt
file $WORK_DIR/output/stegseek_out.txt

# Simpan password yang ditemukan
echo "dragonball" >> $WORK_DIR/creds/found_passwords.txt
```

➡️ **SELESAI!** (atau proses file hasil ekstraksi lebih lanjut)

**OUTPUT GAGAL ❌ — steghide: could not extract any data:**

text

```
steghide: could not extract any data with that passphrase!
```

➡️ Password salah atau bukan steghide. Coba jsteg:

Bash

```
# Coba jsteg (algoritma berbeda dari steghide)
jsteg reveal $TARGET_FILE $WORK_DIR/output/jsteg_out.txt
cat $WORK_DIR/output/jsteg_out.txt 2>/dev/null
```

**OUTPUT GAGAL ❌ — stegseek: 0 results from rockyou.txt:**

text

```
[!] 0 results from rockyou.txt
```

➡️ Password tidak ada di rockyou. Buat custom wordlist:

Bash

```
# Dari nama file, judul challenge, hint soal
cat > /tmp/custom_pass.txt << 'EOF'
admin
password
secret
hidden
steganography
stego
flag
challenge
CTF
picoCTF
EOF

# Tambahkan kata-kata dari deskripsi soal
# (manual: baca deskripsi challenge, tambahkan nama, tanggal, tema)

# Run stegseek dengan custom wordlist
stegseek $TARGET_FILE /tmp/custom_pass.txt $WORK_DIR/output/custom_steg_out.txt

# Jika masih gagal:
# Coba brute force dengan hashcat mask (jika tahu format)
# steghide extract -sf target.jpg -p "PASSWORD" → loop manual
```

> 🔍 **Google hint jika buntu:** Search `"[nama CTF] [nama challenge] steghide writeup"` atau `"steghide alternative tool jsteg outguess"`

---

### Langkah 2.3 — jsteg & Outguess

Bash

```
# jsteg: algoritma DCT LSB berbeda dari steghide
jsteg reveal $TARGET_FILE $WORK_DIR/output/jsteg_result.txt
cat $WORK_DIR/output/jsteg_result.txt

# Outguess (tool steganografi JPEG lainnya)
# Install jika belum: sudo apt install outguess
outguess -r $TARGET_FILE $WORK_DIR/output/outguess_result.txt
cat $WORK_DIR/output/outguess_result.txt
```

**OUTPUT BERHASIL ✅ — jsteg menemukan data:**

text

```
FLAG{jst3g_dct_h1dd3n}
```

➡️ **SELESAI!**

**OUTPUT GAGAL ❌ — jsteg: no hidden data:**

text

```
# No output or error
```

➡️ Coba binwalk untuk appended data (polyglot JPEG+ZIP):

Bash

```
binwalk $TARGET_FILE
binwalk -e $TARGET_FILE -C $WORK_DIR/extracted/
ls -la $WORK_DIR/extracted/
```

---

## ═══════════════════════════════════════

## FASE 3: IMAGE STEGO — BMP

## ═══════════════════════════════════════

> **BMP = raw uncompressed → pixel data mulai offset 54 bytes**

### Langkah 3.1 — BMP Analysis

Bash

```
# BMP sangat compatible dengan zsteg
zsteg -a $TARGET_FILE

# Jika zsteg tidak terinstall, manual BMP parsing
python3 << EOF
import sys

with open("$TARGET_FILE", "rb") as f:
    header = f.read(54)  # BMP header = 54 bytes
    
    # Parse header
    sig = header[:2]
    file_size = int.from_bytes(header[2:6], 'little')
    pixel_offset = int.from_bytes(header[10:14], 'little')
    width = int.from_bytes(header[18:22], 'little')
    height = int.from_bytes(header[22:26], 'little')
    bpp = int.from_bytes(header[28:30], 'little')
    
    print(f"[*] Signature: {sig}")
    print(f"[*] File size: {file_size} bytes")
    print(f"[*] Pixel offset: {pixel_offset}")
    print(f"[*] Dimensions: {width} x {height}")
    print(f"[*] Bits per pixel: {bpp}")
    
    expected_size = width * height * (bpp // 8) + pixel_offset
    print(f"[*] Expected size: {expected_size} bytes")
    
    if file_size > expected_size + 100:
        print(f"[!] ANOMALI: File {file_size - expected_size} bytes lebih besar dari normal!")
        print("[!] Kemungkinan ada appended data")
    
    # Read pixel data dan extract LSB
    f.seek(pixel_offset)
    pixel_data = f.read()
    
    bits = [str(b & 1) for b in pixel_data]
    preview = ""
    for i in range(0, min(len(bits)-7, 300*8), 8):
        byte_val = int("".join(bits[i:i+8]), 2)
        preview += chr(byte_val) if 32 <= byte_val <= 126 else "."
    
    print(f"\n[*] LSB Preview (300 chars):")
    print(preview[:150])
EOF
```

**OUTPUT BERHASIL ✅ — Preview menampilkan flag:**

text

```
[*] LSB Preview:
FLAG{bmp_r4w_lsb_3xtr4ct3d}....
```

➡️ **SELESAI!**

**OUTPUT BERHASIL ✅ — File size anomali:**

text

```
[!] ANOMALI: File 52480 bytes lebih besar dari normal!
[!] Kemungkinan ada appended data
```

➡️ Ada appended data! Extract:

Bash

```
# Cari appended data offset
EXPECTED_SIZE=<nilai dari output di atas>

dd if=$TARGET_FILE of=$WORK_DIR/extracted/appended.bin bs=1 skip=$EXPECTED_SIZE
file $WORK_DIR/extracted/appended.bin
strings $WORK_DIR/extracted/appended.bin | head -20
```

---

## ═══════════════════════════════════════

## FASE 4: IMAGE STEGO — GIF

## ═══════════════════════════════════════

> **GIF = multi-frame + indexed color palette → cek per frame & frame timing**

### Langkah 4.1 — GIF Frame Analysis

Bash

```
# Command 1: Info dasar GIF
identify $TARGET_FILE
file $TARGET_FILE

# Command 2: Cek frame delay timing (anomali = encoded data)
identify -format "%T " $TARGET_FILE
echo ""
```

**OUTPUT BERHASIL ✅ — Frame delay anomali (ASCII encoding):**

text

```
70 108 97 103 123 103 105 102 95 100 101 108 97 121 125
```

➡️ Nilai delay = ASCII desimal! Decode:

Bash

```
# Decode ASCII desimal dari frame delays
identify -format "%T " $TARGET_FILE | tr ' ' '\n' | while read delay; do
    if [ ! -z "$delay" ] && [ "$delay" -gt 31 ] && [ "$delay" -lt 127 ] 2>/dev/null; then
        printf "\\$(printf '%03o' $delay)"
    fi
done
echo ""

# Atau dengan python
delays=$(identify -format "%T " $TARGET_FILE)
python3 -c "delays='$delays'.split(); print(''.join(chr(int(d)) for d in delays if 32 <= int(d) <= 126))"
```

**OUTPUT GAGAL ❌ — Delay semua sama/normal:**

text

```
10 10 10 10 10 10
```

➡️ Tidak ada timing stego. Lanjut ke frame analysis:

Bash

```
# Ekstrak semua frame
mkdir -p $WORK_DIR/output/gif_frames/
convert -coalesce $TARGET_FILE $WORK_DIR/output/gif_frames/frame_%04d.png

echo "[*] Jumlah frame: $(ls $WORK_DIR/output/gif_frames/*.png | wc -l)"

# Cari flag di setiap frame
for frame in $WORK_DIR/output/gif_frames/*.png; do
    # zsteg per frame
    result=$(zsteg -a "$frame" 2>/dev/null | grep -Ei "flag\{|ctf\{")
    if [ ! -z "$result" ]; then
        echo "[+] FLAG DI FRAME: $frame"
        echo "$result"
    fi
    
    # strings per frame
    result2=$(strings "$frame" | grep -Ei "flag\{|ctf\{")
    if [ ! -z "$result2" ]; then
        echo "[+] STRING DI FRAME: $frame → $result2"
    fi
done
```

**OUTPUT BERHASIL ✅ — Flag di salah satu frame:**

text

```
[+] FLAG DI FRAME: /root/stego_loot/output/gif_frames/frame_0003.png
b1,rgb,lsb,xy   .. text: "FLAG{gif_fr4m3_h1dd3n}"
```

➡️ **SELESAI!**

---

## ═══════════════════════════════════════

## FASE 5: AUDIO STEGO — WAV / MP3

## ═══════════════════════════════════════

> **Audio = spectrogram visual (paling umum) + LSB sample + metadata**

### Langkah 5.1 — Quick Audio Triage

Bash

```
# Command 1: Metadata audio
exiftool -a -u $TARGET_FILE

# Command 2: Strings (kadang flag ada plaintext)
strings $TARGET_FILE | grep -Ei "flag\{|ctf\{"

# Command 3: Cek format dan properties
file $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — Flag di metadata/comment:**

text

```
Comment                         : FLAG{aud10_m3t4d4t4}
```

➡️ **SELESAI!**

**OUTPUT GAGAL ❌ — Tidak ada yang obvious:**  
➡️ Lanjut ke spectrogram analysis.

---

### Langkah 5.2 — Spectrogram Analysis (PALING UMUM!)

Bash

```
# Method 1: CLI dengan sox (tidak perlu GUI)
sox $TARGET_FILE -n spectrogram -Y 1024 -X 2000 -o $WORK_DIR/output/spectro.png

# Buka gambar spectrogram
eog $WORK_DIR/output/spectro.png &
# Atau: display $WORK_DIR/output/spectro.png

echo "[*] LIHAT GAMBAR: Cari teks/flag di area frekuensi TINGGI (bagian atas)"
echo "[*] Jika tidak terlihat, coba parameter berbeda:"
```

**OUTPUT BERHASIL ✅ — Ada teks/flag terlihat di spectrogram:**

text

```
# Tidak ada output terminal, flag terlihat VISUAL di gambar
# Contoh: tulisan "FLAG{sp3ctr0gr4m_h1dd3n}" terlihat di frekuensi 18-22 kHz
```

➡️ Baca flag dari gambar. **SELESAI!**

**OUTPUT GAGAL ❌ — Spectrogram tidak ada teks terlihat:**

Bash

```
# Coba dengan resolusi berbeda dan parameter berbeda
sox $TARGET_FILE -n spectrogram -Y 512 -X 500 -o $WORK_DIR/output/spectro_low.png
sox $TARGET_FILE -n spectrogram -Y 2048 -X 5000 -o $WORK_DIR/output/spectro_high.png

# Coba per channel (left/right)
sox $TARGET_FILE remix 1 /tmp/left.wav
sox $TARGET_FILE remix 2 /tmp/right.wav
sox /tmp/left.wav -n spectrogram -Y 1024 -X 2000 -o $WORK_DIR/output/spectro_left.png
sox /tmp/right.wav -n spectrogram -Y 1024 -X 2000 -o $WORK_DIR/output/spectro_right.png

eog $WORK_DIR/output/spectro_left.png &
eog $WORK_DIR/output/spectro_right.png &
```

**OUTPUT GAGAL ❌ — sox: command not found:**

Bash

```
sudo apt install -y sox libsox-fmt-all
```

**OUTPUT GAGAL ❌ — Spectrogram tetap tidak ada teks:**  
➡️ Mungkin bukan spectrogram stego. Lanjut ke LSB audio:

---

### Langkah 5.3 — Audio LSB Extraction

Bash

```
# Hanya berlaku untuk WAV (PCM)
# Simpan script WAV LSB extractor
cat > ~/tools/wav_lsb.py << 'SCRIPT'
#!/usr/bin/env python3
import wave, sys

def extract_wav_lsb(wav_path, num_bytes=256):
    try:
        audio = wave.open(wav_path, mode='rb')
    except Exception as e:
        print(f"[-] Error: {e}")
        sys.exit(1)
    
    frame_bytes = bytearray(list(audio.readframes(audio.getnframes())))
    audio.close()
    
    print(f"[*] Total frames: {len(frame_bytes)} bytes")
    print(f"[*] Channels: {audio.getnchannels()}, Sample width: {audio.getsampwidth()}")
    
    bits = [str(b & 1) for b in frame_bytes]
    
    payload = bytearray()
    for i in range(0, len(bits) - 7, 8):
        payload.append(int("".join(bits[i:i+8]), 2))
    
    return bytes(payload)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: wav_lsb.py <wav_file> [-o output.bin]")
        sys.exit(1)
    
    data = extract_wav_lsb(sys.argv[1])
    
    if '-o' in sys.argv:
        out_path = sys.argv[sys.argv.index('-o') + 1]
        with open(out_path, 'wb') as f:
            f.write(data)
        print(f"[+] Saved to {out_path}")
    else:
        preview = ""
        for b in data[:300]:
            preview += chr(b) if 32 <= b <= 126 else "."
        print(f"[*] LSB Preview: {preview[:150]}")
SCRIPT

chmod +x ~/tools/wav_lsb.py

# Jalankan ekstraksi
python3 ~/tools/wav_lsb.py $TARGET_FILE

# Jika ada flag terlihat, simpan full output
python3 ~/tools/wav_lsb.py $TARGET_FILE -o $WORK_DIR/output/wav_lsb.bin
strings $WORK_DIR/output/wav_lsb.bin | grep -Ei "flag\{|ctf\{"
file $WORK_DIR/output/wav_lsb.bin
```

**OUTPUT BERHASIL ✅ — Flag di WAV LSB:**

text

```
[*] LSB Preview: FLAG{w4v_4ud10_lsb_3xtr4ct3d}....
```

➡️ **SELESAI!**

**OUTPUT BERHASIL ✅ — wav_lsb.bin teridentifikasi sebagai ZIP/file lain:**

text

```
/root/stego_loot/output/wav_lsb.bin: Zip archive data
```

Bash

```
unzip $WORK_DIR/output/wav_lsb.bin -d $WORK_DIR/extracted/wav_zip/
cat $WORK_DIR/extracted/wav_zip/*
```

**OUTPUT GAGAL ❌ — Preview noise:**  
➡️ Lanjut ke MP3 metadata atau DeepSound:

---

### Langkah 5.4 — MP3 Metadata & Cover Art

Bash

```
# Full metadata MP3 (termasuk tag custom)
exiftool -a -u -s $TARGET_FILE

# Field yang sering mengandung payload:
# - Comment, Lyrics, TXXX, USLT, APIC

# Ekstrak cover art dari MP3 (cover bisa jadi gambar dengan stego)
ffmpeg -i $TARGET_FILE -an -vcodec copy $WORK_DIR/extracted/cover_art.jpg 2>/dev/null
file $WORK_DIR/extracted/cover_art.jpg

# Jika cover art valid, analisis sebagai gambar stego (kembali ke Fase 2)
echo "[*] Jika cover art valid, jalankan steghide/jsteg pada:"
echo "[*] $WORK_DIR/extracted/cover_art.jpg"
```

**OUTPUT BERHASIL ✅ — Flag di tag TXXX atau Comment:**

text

```
Comment                         : FLAG{mp3_t4g_h1dd3n}
TXXX                            : FLAG{us3r_d3f1n3d_t4g}
```

➡️ **SELESAI!**

**OUTPUT BERHASIL ✅ — Cover art berhasil diekstrak:**

Bash

```
# Analisis cover art sebagai image stego
steghide info $WORK_DIR/extracted/cover_art.jpg
stegseek $WORK_DIR/extracted/cover_art.jpg /usr/share/wordlists/rockyou.txt
jsteg reveal $WORK_DIR/extracted/cover_art.jpg /tmp/cover_out.txt
```

---

### Langkah 5.5 — Morse Code & DTMF Detection

Bash

```
# Buka di audacity untuk analisis visual waveform
audacity $TARGET_FILE &

echo "[*] Di Audacity:"
echo "[*] 1. Lihat waveform — pulsa pendek=dot(.) panjang=dash(-)"  
echo "[*] 2. Track menu → ubah ke Spectrogram"
echo "[*] 3. Cek channel kiri DAN kanan terpisah"

# Jika morse terdeteksi, decode manual atau online:
# https://morsecode.world/international/decoder/audio-decoder-adaptive.html
```

**OUTPUT BERHASIL ✅ — Pola morse terlihat:**

text

```
# Visual di audacity: .-- . .-.. .-.. / -.. --- -. . 
# Decode: WELL DONE
# Flag mungkin = FLAG{WELLDONE} atau hint untuk langkah berikutnya
```

---

## ═══════════════════════════════════════

## FASE 6: TEXT STEGANOGRAPHY

## ═══════════════════════════════════════

> **Text file = whitespace stego (stegsnow) atau zero-width characters (ZWC)**

### Langkah 6.1 — Deteksi Tipe Text Stego

Bash

```
# Command 1: Cek trailing whitespace (stegsnow)
cat -A $TARGET_FILE | head -20
# Tab = ^I, Trailing spaces sebelum $ = stegsnow candidate

# Command 2: Cek zero-width characters (ZWC)
xxd $TARGET_FILE | grep -E "e2 80|ef bb" | head -10

# Command 3: Cek karakter non-ASCII (homoglyph attack)
python3 -c "
text = open('$TARGET_FILE', 'r', encoding='utf-8').read()
anomalies = [(i, c, hex(ord(c))) for i, c in enumerate(text) if ord(c) > 127]
print(f'Non-ASCII chars: {len(anomalies)}')
for item in anomalies[:10]:
    print(f'  Index {item[0]}: \"{item[1]}\" = {item[2]}')
"

# Command 4: File size vs visible content anomaly
wc -c $TARGET_FILE
wc -m $TARGET_FILE
```

**OUTPUT BERHASIL ✅ — Ada trailing whitespace (`^I` atau spaces sebelum `$`):**

text

```
Hello World   ^I$
This is text    $
```

➡️ Stegsnow! Lanjut **Langkah 6.2**.

**OUTPUT BERHASIL ✅ — Ada `e2 80` di xxd (ZWC):**

text

```
00000050: 6865 6c6c 6f20 e280 8b77 6f72 6c64  hello ..world
```

➡️ Zero-Width Characters! Lanjut **Langkah 6.3**.

**OUTPUT BERHASIL ✅ — Banyak non-ASCII chars:**

text

```
Non-ASCII chars: 24
  Index 5: "а" = 0x430  ← Cyrillic 'a' bukan Latin 'a'!
```

➡️ Homoglyph attack! Lanjut **Langkah 6.4**.

---

### Langkah 6.2 — Stegsnow Extraction

Bash

```
# Method 1: Tanpa password
stegsnow -C $TARGET_FILE

# Method 2: Dengan kompresi
stegsnow -C -m "compressed" $TARGET_FILE

# Method 3: Dengan password (jika ada hint)
stegsnow -C -p "password123" $TARGET_FILE
```

**OUTPUT BERHASIL ✅:**

text

```
FLAG{wh1t3sp4c3_h1dd3n_by_sn0w}
```

➡️ **SELESAI!**

**OUTPUT GAGAL ❌ — Output kosong atau karakter rusak:**

text

```
# Tidak ada output atau gibberish
```

➡️ Mungkin ada password. Coba:

Bash

```
# Coba password dari nama file atau deskripsi challenge
for pass in "" "snow" "stego" "steganography" "secret" "hidden"; do
    result=$(stegsnow -C -p "$pass" $TARGET_FILE 2>/dev/null)
    if [ ! -z "$result" ] && echo "$result" | grep -qEi "[a-zA-Z]{3,}"; then
        echo "[+] PASSWORD: '$pass' → $result"
        break
    fi
done
```

---

### Langkah 6.3 — Zero-Width Characters Decode

Bash

```
# Simpan script ZWC decoder
cat > ~/tools/zwc_decode.py << 'SCRIPT'
#!/usr/bin/env python3
import sys

def decode_zwc(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    binary_str = ""
    count = 0
    
    for char in content:
        cp = ord(char)
        if cp == 0x200B:    # Zero-Width Space → bit 0
            binary_str += "0"
            count += 1
        elif cp == 0x200C:  # Zero-Width Non-Joiner → bit 1
            binary_str += "1"
            count += 1
        elif cp == 0x200D:  # Zero-Width Joiner → word separator
            binary_str += " "
        elif cp == 0xFEFF:  # BOM → bit 0 (alternative mapping)
            binary_str += "0"
            count += 1
    
    if count == 0:
        print("[-] Tidak ada ZWC ditemukan (U+200B, U+200C)")
        return
    
    print(f"[+] Ditemukan {count} ZWC bits")
    
    # Rekonstruksi binary ke ASCII
    chars = []
    for i in range(0, len(binary_str.replace(" ", "")), 8):
        clean = binary_str.replace(" ", "")
        byte = clean[i:i+8]
        if len(byte) == 8:
            chars.append(chr(int(byte, 2)))
    
    print(f"[+] Decoded: {''.join(chars)}")

if __name__ == "__main__":
    decode_zwc(sys.argv[1] if len(sys.argv) > 1 else "/dev/stdin")
SCRIPT

chmod +x ~/tools/zwc_decode.py

# Jalankan
python3 ~/tools/zwc_decode.py $TARGET_FILE
```

**OUTPUT BERHASIL ✅:**

text

```
[+] Ditemukan 64 ZWC bits
[+] Decoded: FLAG{z3r0_w1dth_ch4rs}
```

➡️ **SELESAI!**

**OUTPUT GAGAL ❌ — Tidak ada ZWC:**

text

```
[-] Tidak ada ZWC ditemukan
```

➡️ Coba decode dengan mapping berbeda (tool online):

Bash

```
echo "[*] Coba: https://330k.github.io/misc_tools/unicode_steganography.html"
echo "[*] Paste konten file, klik decode"
```

---

### Langkah 6.4 — Homoglyph Detection & Decode

Bash

```
# Identifikasi semua karakter Cyrillic/Greek yang menyerupai Latin
python3 << 'EOF'
text = open("$TARGET_FILE", "r", encoding="utf-8").read()

# Mapping Cyrillic → bit atau pesan
cyrillic_chars = []
for i, c in enumerate(text):
    if ord(c) > 127:
        context = text[max(0,i-5):i+5]
        cyrillic_chars.append((i, c, hex(ord(c)), repr(context)))

print(f"[*] Total non-ASCII: {len(cyrillic_chars)}")
for item in cyrillic_chars[:20]:
    print(f"  idx={item[0]} char='{item[1]}' unicode={item[2]} context={item[3]}")

# Ekstrak semua non-ASCII karakter
hidden = "".join(c for c in text if ord(c) > 127)
print(f"\n[*] Hidden chars: {repr(hidden)}")
EOF
```

**OUTPUT BERHASIL ✅ — Pola terlihat di hidden chars:**

text

```
[*] Hidden chars: 'аbcде' → Cyrillic a, b, c, d, e
```

➡️ Mungkin setiap karakter Cyrillic merepresentasikan bit atau karakter tertentu. Analisis lebih lanjut dengan CyberChef.

---

## ═══════════════════════════════════════

## FASE 7: MULTI-LAYER STEGO PIPELINE

## ═══════════════════════════════════════

> **Jika payload yang diekstrak BELUM berupa flag — mungkin ada layer encoding tambahan**

### Langkah 7.1 — Decode Pipeline

Bash

```
PAYLOAD="[hasil ekstraksi dari fase sebelumnya]"

# Layer 1: Cek apakah Base64
echo "$PAYLOAD" | base64 -d 2>/dev/null && echo ""

# Layer 2: Cek ROT13
echo "$PAYLOAD" | tr 'A-Za-z' 'N-ZA-Mn-za-m'

# Layer 3: Cek Hex
echo "$PAYLOAD" | xxd -r -p 2>/dev/null && echo ""

# Layer 4: Cek URL encode
python3 -c "import urllib.parse; print(urllib.parse.unquote('$PAYLOAD'))"

# Layer 5: Cek Base32
echo "$PAYLOAD" | base32 -d 2>/dev/null && echo ""

# Layer 6: Multi-layer (base64 → ROT13)
echo "$PAYLOAD" | base64 -d 2>/dev/null | tr 'A-Za-z' 'N-ZA-Mn-za-m'

# Layer 7: CyberChef Magic (otomatis detect chain)
echo "[*] Jika bingung, upload ke: https://cyberchef.org → klik 'Magic'"
```

**OUTPUT BERHASIL ✅ — Setelah decode ketemu flag:**

text

```
FLAG{mult1_l4y3r_3nc0d1ng}
```

➡️ **SELESAI!**

---

### Langkah 7.2 — XOR Decryption (Jika Payload Terenkripsi)

Bash

```
# Ekstrak raw LSB ke file binary dulu
# Lalu cari XOR key

# Install xortool
pip3 install xortool 2>/dev/null || pip install xortool

# Analisis XOR
xortool $WORK_DIR/output/raw_lsb.bin

# Jika tahu XOR key (misal dari hint)
KEY="\x41"  # contoh key satu byte
python3 -c "
data = open('$WORK_DIR/output/raw_lsb.bin', 'rb').read()
key = b'\x41'  # Ganti dengan key yang ditemukan
result = bytes(b ^ key[i % len(key)] for i, b in enumerate(data))
print(result[:200])
"
```

> 🔍 **Google hint:** Search `"CTF xor stego key recovery"` atau `"xortool tutorial"`

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`zsteg: command not found`|Gem tidak di PATH|`sudo gem install zsteg` atau `~/.local/share/gem/ruby/X.X.0/bin/zsteg`|
|`stegseek: 0 results from rockyou.txt`|Password tidak di wordlist|Buat custom wordlist dari deskripsi challenge|
|`steghide: could not extract`|Wrong password atau bukan steghide|Coba `jsteg`, `outguess`, atau `stegseek`|
|`zsteg -a` semua noise|Payload encrypted atau channel custom|Coba `custom_lsb.py` semua kombinasi, atau CyberChef|
|Spectrogram gelap/kosong|Skala salah atau frekuensi rendah|Ubah `-Y` lebih besar, coba `-X` berbeda|
|`PIL: DecompressionBombError`|Gambar resolusi sangat besar|Tambah `Image.MAX_IMAGE_PIXELS = None` di script|
|`pngcheck: CRC error IHDR`|Height/width dimanipulasi|Recalculate CRC setelah fix dimensi dengan Python|
|`sox: unknown file type 'mp3'`|Codec MP3 tidak terinstall|`sudo apt install libsox-fmt-mp3`|
|`stegsnow` output kosong|File teks tidak ada whitespace|Cek dengan `cat -A`, mungkin ZWC bukan whitespace|
|`jsteg: command not found`|jsteg belum diinstall|`go install github.com/lukechampine/jsteg@latest`|
|Aperisolve gagal upload|File > 50MB|Gunakan script manual lokal|
|`ffmpeg: no such file`|ffmpeg belum install|`sudo apt install ffmpeg`|
|`convert: not found`|ImageMagick belum install|`sudo apt install imagemagick`|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: File Stego Diterima
│
├─ FASE 0: Triage Awal
│   ├─ file → identifikasi tipe
│   ├─ strings → quick flag hunt → [FLAG? SELESAI]
│   ├─ exiftool → metadata → [FLAG/PASSWORD? SELESAI/SIMPAN]
│   └─ binwalk → embedded files → [Extract → SELESAI]
│
├─ FASE 1: PNG / BMP
│   ├─ zsteg -a → [FLAG? SELESAI]
│   ├─ pngcheck → CRC error → fix IHDR height tampering
│   ├─ bit plane isolation → visual stego/QR code
│   └─ custom_lsb.py semua kombinasi → XOR decrypt
│
├─ FASE 2: JPEG
│   ├─ exiftool → [FLAG? SELESAI]
│   ├─ steghide extract -p "" → [FLAG? SELESAI]
│   ├─ stegseek rockyou.txt → crack password → extract
│   └─ jsteg reveal → outguess → binwalk appended
│
├─ FASE 3: BMP
│   ├─ zsteg -a → [FLAG? SELESAI]
│   └─ Python raw pixel LSB → appended data check
│
├─ FASE 4: GIF
│   ├─ identify → frame delay anomali → ASCII decode
│   └─ convert -coalesce → extract frames → zsteg per frame
│
├─ FASE 5: WAV / MP3
│   ├─ exiftool → [FLAG? SELESAI]
│   ├─ sox spectrogram → visual flag → [SELESAI]
│   ├─ wav_lsb.py → WAV LSB extraction
│   ├─ ffmpeg cover art → analisis sebagai JPEG stego
│   └─ Audacity → morse code / DTMF
│
├─ FASE 6: TEXT
│   ├─ cat -A → trailing whitespace → stegsnow -C
│   ├─ xxd → e2 80 → ZWC → zwc_decode.py
│   └─ python3 → non-ASCII → homoglyph detection
│
└─ FASE 7: Multi-layer / XOR
    ├─ Base64 → ROT13 → Hex → URL decode
    └─ xortool → XOR key recovery
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET_FILE="challenge.png"
export WORK_DIR=~/stego_loot
mkdir -p $WORK_DIR/{extracted,audio,text,output,creds}

# === TRIAGE (Selalu jalankan ini dulu) ===
file $TARGET_FILE                                           # Identifikasi tipe
strings -n 6 $TARGET_FILE | grep -Ei "flag\{|ctf\{"       # Quick flag hunt
exiftool -a -u $TARGET_FILE | grep -Ei "comment|flag|pass" # Metadata
binwalk $TARGET_FILE                                        # Embedded files

# === IMAGE STEGO: PNG / BMP ===
zsteg -a $TARGET_FILE                                       # LSB scan otomatis
zsteg -E "b1,rgb,lsb,xy" $TARGET_FILE > payload.bin        # Extract specific channel
pngcheck -vtp $TARGET_FILE                                  # PNG chunk check

# === IMAGE STEGO: JPEG ===
steghide info $TARGET_FILE                                  # Check ada data?
steghide extract -sf $TARGET_FILE -p ""                     # Extract tanpa password
stegseek $TARGET_FILE /usr/share/wordlists/rockyou.txt out.txt  # Bruteforce
jsteg reveal $TARGET_FILE output.txt                        # jsteg DCT

# === AUDIO STEGO: WAV ===
sox $TARGET_FILE -n spectrogram -Y 1024 -X 2000 -o spectro.png  # Spectrogram CLI
sonic-visualiser $TARGET_FILE &                             # Spectrogram GUI
python3 ~/tools/wav_lsb.py $TARGET_FILE                    # WAV LSB extract

# === AUDIO STEGO: MP3 ===
exiftool -a -u -s $TARGET_FILE                              # Full metadata
ffmpeg -i $TARGET_FILE -an -vcodec copy cover.jpg           # Extract cover art

# === TEXT STEGO ===
stegsnow -C $TARGET_FILE                                    # Whitespace stego
cat -A $TARGET_FILE | head -20                              # Check trailing space
xxd $TARGET_FILE | grep -E "e2 80|ef bb"                   # Check ZWC
python3 ~/tools/zwc_decode.py $TARGET_FILE                  # ZWC decode

# === VISUAL PLANE ===
for ch in R G B; do
    convert $TARGET_FILE -channel $ch -evaluate and 1 -evaluate multiply 255 \
        plane_${ch}0.png
done

# === DECODE PIPELINE ===
echo "PAYLOAD" | base64 -d                                  # Base64
echo "PAYLOAD" | tr 'A-Za-z' 'N-ZA-Mn-za-m'                # ROT13
echo "PAYLOAD" | xxd -r -p                                  # Hex to ASCII

# === TOOLS CHECK ===
which zsteg stegseek steghide jsteg sox audacity pngcheck exiftool binwalk
```

---

> **➡️ CROSS-REFERENCE:**
> 
> - File gambar mengandung **embedded ZIP/file** → `<a href="/docs/forensics" class="text-[#00b4d8] hover:underline font-mono font-semibold">55_forensics_workflow.md</a>` (Fase 2)
> - Hasil ekstraksi berupa **hash** → `<a href="/docs/hash-cracking" class="text-[#00b4d8] hover:underline font-mono font-semibold">54_hash_cracking_workflow.md</a>`
> - File PCAP mengandung **network stego** → `<a href="/docs/pcap-analysis" class="text-[#00b4d8] hover:underline font-mono font-semibold">57_pcap_analysis_workflow.md</a>`
> - Stego di **memory dump** → `<a href="/docs/memory-forensics" class="text-[#00b4d8] hover:underline font-mono font-semibold">58_memory_forensics_workflow.md</a>`
> - **Encoding/cipher** tidak dikenal → `<a href="/docs/crypto-identification" class="text-[#00b4d8] hover:underline font-mono font-semibold">53_crypto_identification_workflow.md</a>`