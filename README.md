<div align="center">

# 🛡️ Cyber Security Hanz Wiki

**Comprehensive Offensive Security, Penetration Testing & CTF Knowledge Base**  
*Metodologi ofensif terstruktur, navigasi keputusan taktis, dan playbook eksploitasi berbasis alur kerja.*

---

[![Astro](https://img.shields.io/badge/Framework-Astro_v4-FF5D01?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build)
[![TailwindCSS](https://img.shields.io/badge/Styles-TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Cytoscape.js](https://img.shields.io/badge/Graph-Cytoscape.js-00B4D8?style=for-the-badge&logo=diagram-next&logoColor=white)](https://js.cytoscape.org/)
[![License](https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge)](LICENSE)
[![Workflows](https://img.shields.io/badge/Workflows-73_Modules-8B5CF6?style=for-the-badge)](#-taksonomi-9-domain-ofensif)
[![Navigator](https://img.shields.io/badge/Navigator-38_Decision_Nodes-EF4444?style=for-the-badge)](#-observation--decision-navigator)

</div>

---

## 📖 Ringkasan Proyek

**Cyber Security Hanz Wiki** adalah portal dokumentasi ofensif generasi baru yang dirancang untuk **penetrasi sistem (pentest)**, **persiapan sertifikasi praktis** (OSCP, eJPT, PNPT, CPTS), dan kompetisi **Capture The Flag (CTF)**. 

Bukan sekadar *cheat-sheet* perintah mentah, wiki ini memadukan **kerangka berpikir metodologis (*reasoning engine*)**, pemetaan hubungan antar-vektor serangan, serta alur investigasi konkret yang siap pakai di terminal.

### 🌟 Mengapa Wiki Ini Berbeda?
- 🧠 **CLUE ≠ FINDING ≠ VULNERABILITY**: Mengajarkan cara berpikir dari indikasi mentah (*clue*) menuju validasi teknis yang objektif.
- 🚫 **Anti-Rabbit Hole**: Setiap vektor serangan dilengkapi *Stop Conditions* dan mitigasi jalan buntu agar tidak membuang waktu.
- ⚡ **Deep Snippet Indexing**: Mesin pencari instan mengindeks cuplikan sintaks, nama tool (`nmap`, `impacket`, `sqlmap`, dll.), dan perintah terminal riil.
- 🕸️ **Visual Graph Topology**: Memvisualisasikan keterkaitan lateral antar-layanan melalui graf interaktif 2D berbasis Cytoscape.

---

## ⚡ Fitur Utama

```
                      ┌──────────────────────────────────────────────┐
                      │          CYBER SECURITY HANZ WIKI            │
                      └──────────────────────┬───────────────────────┘
                                             │
      ┌──────────────────────┬───────────────┴───────────────┬──────────────────────┐
      ▼                      ▼                               ▼                      ▼
┌─────────────┐       ┌─────────────┐                 ┌─────────────┐       ┌─────────────┐
│ 73 Playbook │       │  Navigator  │                 │ Attack Graph│       │ Deep Search │
│  Workflows  │       │  Decisions  │                 │ (Cytoscape) │       │ (CLI & Code)│
└─────────────┘       └─────────────┘                 └─────────────┘       └─────────────┘
```

### 1. ✦ Observation & Decision Navigator (`/navigator`)
Kompas investigasi cerdas saat menghadapi target baru:
- **38+ Observation Nodes Terstruktur**: Mencakup identifikasi klaster port Active Directory, form upload file, JWT token, S3 bucket misconfiguration, SUID binaries, dan banyak lagi.
- **6 Tab Konsol Investigasi**:
  1. **📋 Ringkasan & Konteks**: Apa sinyal mentah dan pertanyaan kunci sebelum bertindak.
  2. **🔬 Titik Inspeksi**: Urutan perintah terminal, baseline normal, dan bukti yang wajib di-capture.
  3. **⚡ Signal Tester**: Penafsiran output server (Confirmed vs Ambiguous).
  4. **🎯 Hipotesis & Stop Conditions**: Kapan harus melanjutkan serangan dan kapan wajib **STOP & pivot**.
  5. **⚖️ CTF vs Pentest**: Sudut pandang CTF (hunting flag) vs Real Pentest (dampak bisnis & audit).
  6. **🚀 Rute Workflow**: Link direct jump ke modul eksekusi wiki.
- **Accordion Edukatif**: *"Saya belum paham apa maksud observasi ini?"* untuk penjelasan ramah pemula.

### 2. 🕸️ Interactive Attack Graph (`/graph`)
- Peta graf jaringan interaktif yang merender **73 node modul dan 570+ edge koneksi**.
- Menunjukkan alur eksploitasi (*Attack Paths*), derajat keterkaitan (*Node Degree*), serta backlink antar modul.
- Dilengkapi fitur zoom, drag, filter kategori warna, dan navigasi langsung ke halaman terkait.

### 3. 🔍 Deep Command & Snippet Search (`/search` & `Ctrl+K`)
- Didukung oleh **Fuse.js** client-side search engine yang super cepat.
- Tidak hanya mencari judul halaman, tetapi juga **mengekstrak blok kode terminal**, tool security populer, flag perintah, dan sintaks exploit.
- Hasil pencarian menampilkan cuplikan terminal siap salin (*copy-paste ready*).

### 4. 🔗 Automated Cross-Reference Auto-Linker
- Skrip indexing otomatis (`scripts/build-index.mjs`) menyinkronkan berkas Obsidian Markdown ke halaman Astro.
- Menautkan referensi silang antar dokumen, diagram alur ASCII, dan daftar rujukan bolak-balik (*refs_in / refs_out*) secara dinamis.

---

## 🗂️ Taksonomi 9 Domain Ofensif

Wiki ini mencakup **73 modul workflow teknis** yang terbagi dalam 9 kategori strategis:

| Kategori | Warna | Jml Modul | Cakupan Utama |
|---|:---:|:---:|---|
| **1. Fondasi** | Emerald `#10B981` | 4 Modul | Mindset & Metodologi, Parrot OS Setup, Nmap Master Guide, Service Identification Tree |
| **2. Network Services** | Blue `#3B8BD4` | 13 Modul | SMB/Samba, SSH, FTP, SMTP, DNS, SNMP, LDAP, RDP, NFS, MySQL, MSSQL, PostgreSQL, Redis & MongoDB |
| **3. Web Exploitation** | Amber `#F59E0B` | 24 Modul | Web Recon, VHost Fuzzing, SQLi, Auth Bypass, Command Injection, LFI/RFI, File Upload, SSRF, XSS, CSRF, IDOR, SSTI, XXE, Deserialization, HTTP Smuggling, CORS, OAuth, JWT, CMS (WordPress, Joomla, Drupal), API Security |
| **4. Active Directory** | Red `#EF4444` | 9 Modul | Initial Enumeration, Kerberoasting & AS-REP Roasting, BloodHound, AD Delegation, NTLM Relay, AD CS, ACL Abuse, Lateral Movement, Domain Persistence |
| **5. Privilege Escalation** | Violet `#8B5CF6` | 4 Modul | Linux Privesc, Windows Privesc, Sudo/SUID/Capabilities, Token Impersonation |
| **6. Binary & Reversing** | Pink `#EC4899` | 5 Modul | Binary Analysis, Buffer Overflow, ROP Chain, Reverse Engineering, CTF Binary Patterns |
| **7. Cryptography & Forensics** | Cyan `#06B6D4` | 6 Modul | Crypto Identification, Hash Cracking, Digital Forensics, Memory Forensics, PCAP Analysis, Steganography |
| **8. Cloud & Mobile** | Indigo `#6366F1` | 3 Modul | Cloud Enumeration, AWS Pentest, Android APK Analysis |
| **9. OSINT & Misc** | Teal `#14B8A6` | 4 Modul | OSINT Framework, Password Cracking, Pivoting & Tunneling, CTF General Methodology |

---

## 🛠️ Tech Stack & Arsitektur

```
cyber-sec-wiki/
├── public/                     # Static assets & generated search index
│   └── search-index.json       # Index cuplikan kode & perintah CLI
├── scripts/                    # Automation & indexing pipeline
│   ├── build-index.mjs         # Vault sync, cross-ref linker, & graph generator
│   └── compile-observations.mjs# Validator 12-point audit & compiler observasi
├── src/
│   ├── components/             # Reusable UI components (Header, SearchModal, etc.)
│   ├── content/docs/           # 73+ Halaman konten Markdown hasil sinkronisasi
│   ├── data/                   # Metadata terstruktur
│   │   ├── categories.json     # Konfigurasi kategori & warna
│   │   ├── graph.json          # Node & edge dataset untuk Cytoscape
│   │   ├── observations.json   # 38 Master Observation Nodes
│   │   ├── observations/       # File sumber JSON per domain
│   │   └── pages.json          # Halaman & backlink manifest
│   ├── layouts/                # Base & Docs Layouts
│   └── pages/                  # Route Astro
│       ├── index.astro         # Dashboard utama & workflow catalog
│       ├── navigator.astro     # Halaman interaktif Decision Navigator
│       ├── graph.astro         # Visualisasi graf interaktif
│       ├── search.astro        # Antarmuka pencarian mendalam
│       └── docs/[slug].astro   # Dynamic render workflow markdown
```

---

## 🚀 Panduan Memulai (Quick Start)

### Prasyarat
- **Node.js**: Versi `22.12.0` atau yang lebih baru.
- **npm**: Versi `10.x` atau lebih baru.

### Instalasi & Menjalankan Dev Server

```bash
# 1. Clone repository
git clone https://github.com/ikmalhanaan/Cybersec-Wiki.git
cd Cybersec-Wiki

# 2. Install dependensi
npm install

# 3. Jalankan development server
npm run dev
```

Buka browser Anda di `http://localhost:4321`.

### Perintah Script Tersedia

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan indexing otomatis (`predev`) lalu menyalakan server lokal Astro |
| `npm run build` | Melakukan compile penuh (indexing otomatis `prebuild` + static site generation ke `./dist/`) |
| `npm run preview` | Menjalankan pratinjau hasil build `./dist/` secara lokal |
| `npm run build:index` | Menjalankan skrip indexing manual (`node scripts/build-index.mjs`) |

---

## 💡 Tips & Troubleshooting

### Windows Defender: Controlled Folder Access
Jika Anda menggunakan Windows dan mengalami error `EBADF: bad file descriptor` atau `Access is denied` saat menjalankan skrip indexing:
1. Buka **Windows Security** $\rightarrow$ **Virus & threat protection**.
2. Gulir ke bawah ke **Ransomware protection** $\rightarrow$ klik **Manage ransomware protection**.
3. Klik **Allow an app through Controlled folder access**.
4. Tambahkan `node.exe` (`C:\Program Files\nodejs\node.exe`) ke daftar aplikasi yang diizinkan.

### Sanitasi Rahasia (Secret Scanning Compliance)
Seluruh contoh dummy API key (misalnya AWS temporary credential dan token) telah disanitasi menggunakan format placeholder aman (contoh: `ASIA_EXAMPLE_TEMP_KEY` dan `AKIA_EXAMPLE_KEY_REDACTED`) untuk mencegah pemicuan false-positive pada **GitHub Secret Scanning**.

---

## ⚖️ Disclaimer & Etika Keamanan

> [!CAUTION]
> Materi, teknik, dan perintah yang disajikan dalam repository ini ditujukan semata-mata untuk **keperluan edukasi, penelitian keamanan siber, dan penetrasi berizin resmi (authorized penetration testing)**. Penggunaan teknik ini terhadap sistem tanpa izin tertulis dari pemilik aset adalah ilegal dan melanggar hukum. Penulis tidak bertanggung jawab atas penyalahgunaan informasi yang ada di dalam repositori ini.

---

<div align="center">

Dibuat dengan dedikasi untuk komunitas Ethical Hacker & Cyber Security Indonesia 🇮🇩  
*Happy Hacking & Stay Ethical!*

</div>
