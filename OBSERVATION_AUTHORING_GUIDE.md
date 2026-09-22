# 📖 OBSERVATION AUTHORING GUIDE
### Panduan Lengkap Membuat Observation Node Baru — Cyber Security Hanz

> **Versi Dokumen:** 1.0  
> **Tanggal:** 22 September 2026  
> **Audience:** Kontributor baru, reviewer, dan maintainer repository

---

## 🎯 Tujuan Dokumen Ini

Dokumen ini adalah **referensi tunggal dan otoritatif** untuk siapa saja yang ingin membuat atau memodifikasi observation node dalam repository Cyber Security Hanz. Setelah membaca panduan ini, Anda akan mampu:

- Memahami filosofi dasar di balik sistem observation
- Menulis JSON schema yang valid dan lengkap
- Menerapkan reasoning chain yang benar
- Lulus 12-Point Quality Audit sebelum submit

---

## 🧠 Core Philosophy

### CLUE ≠ FINDING ≠ VULNERABILITY

Kesalahan paling umum dari kontributor baru adalah menyamakan ketiga konsep ini. Berikut perbedaan fundamentalnya:

| Konsep | Definisi | Contoh |
|--------|----------|--------|
| **CLUE** (Observasi) | Sesuatu yang *terlihat* — bisa berarti apa saja tanpa konteks | Port 21 terbuka |
| **FINDING** (Temuan) | Observasi + Konteks yang mengarah ke kesimpulan tentatif | Port 21 terbuka + anonymous login diizinkan = FTP misconfiguration |
| **VULNERABILITY** | Finding yang dikonfirmasi eksploitabel dengan dampak nyata | FTP misconfiguration + file sensitif dapat diakses = Vulnerability |

> [!IMPORTANT]
> **Observation node dimulai dari CLUE, bukan dari FINDING.** Sistem ini dirancang untuk melatih seorang pentester *berpikir* dari nol — dari hal paling mentah yang terlihat, menuju hipotesis, menuju pengujian, menuju kesimpulan. Jangan "loncat" ke kesimpulan di awal.

### Prinsip-Prinsip Utama

1. **Satu Observasi, Satu Node** — Jangan gabungkan dua observasi berbeda dalam satu node
2. **Netral di Awal** — Setiap observasi bisa jadi jinak atau berbahaya; konteks yang menentukan
3. **Actionable** — Setiap node harus menghasilkan langkah nyata yang bisa dilakukan pentester
4. **Teachable** — Node harus bisa digunakan untuk mengajar, bukan hanya referensi
5. **Falsifiable** — Hipotesis dalam node harus bisa dibuktikan benar atau salah melalui pengujian

---

## ⛓️ The Reasoning Chain

Setiap observation node mengikuti **11-langkah Reasoning Chain** berikut. Ini adalah kerangka berpikir yang harus tercermin dalam konten node:

```
OBSERVE → CONTEXT → QUESTION → EXPECTED → TEST → OUTPUT → INTERPRET → HYPOTHESIZE → VALIDATE → STATE → ROUTE
```

### Penjelasan Setiap Langkah

| Langkah | Pertanyaan Kunci | Contoh (FTP) |
|---------|-----------------|--------------|
| **1. OBSERVE** | "Apa yang secara literal saya lihat?" | `Port 21/tcp open ftp vsftpd 3.0.3` |
| **2. CONTEXT** | "Di mana konteks saya? Target apa? Fase apa?" | Server web production, fase enumeration |
| **3. QUESTION** | "Pertanyaan apa yang muncul dari observasi ini?" | Apakah anonymous login diizinkan? Versi ini memiliki CVE? |
| **4. EXPECTED** | "Jika ini berbahaya, apa yang saya harapkan ditemukan?" | Anonymous login aktif, direktori dapat di-list |
| **5. TEST** | "Perintah/cara spesifik apa yang saya jalankan untuk menguji?" | `ftp <target>` → login sebagai `anonymous` |
| **6. OUTPUT** | "Output seperti apa yang menjadi bukti positif/negatif?" | `230 Login successful` = positif; `530 Login failed` = negatif |
| **7. INTERPRET** | "Apa arti output ini dalam konteks keamanan?" | Anonymous login = misconfiguration, data exposure risk |
| **8. HYPOTHESIZE** | "Hipotesis apa yang bisa saya buat berdasarkan temuan ini?" | Ada file sensitif yang bisa diakses tanpa autentikasi |
| **9. VALIDATE** | "Bagaimana saya membuktikan hipotesis ini?" | `ls`, `get <file>` — verifikasi akses aktual |
| **10. STATE** | "Apa kesimpulan akhir yang bisa saya nyatakan?" | "FTP server mengizinkan anonymous login dengan akses read ke direktori /uploads" |
| **11. ROUTE** | "Ke mana selanjutnya? Node apa yang relevan?" | → Lateral movement, credential exposure, data exfiltration |

> [!NOTE]
> Tidak semua langkah harus muncul secara eksplisit sebagai field terpisah dalam JSON. Beberapa langkah direpresentasikan dalam field gabungan seperti `test_steps`, `expected_output`, dan `interpretation_guide`. Yang penting adalah *logika* chain ini terjaga dalam konten.

---

## 📐 Full JSON Schema

Berikut adalah skema JSON lengkap untuk sebuah observation node, dengan penjelasan setiap field dalam Bahasa Indonesia:

```json
{
  "id": "obs-[domain]-[nama-deskriptif]",
  "title": "Judul singkat observasi (max 60 karakter)",
  "domain": "nama-domain-dari-taksonomi",
  "phase": "enumeration | exploitation | post-exploitation | reporting",
  "severity_hint": "info | low | medium | high | critical",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "Penjelasan satu paragraf tentang apa yang diobservasi dan mengapa relevan dalam konteks keamanan.",
  "observation_trigger": "Kondisi atau hal spesifik yang memicu observasi ini — apa yang 'dilihat' pentester.",
  "context_conditions": [
    "Kondisi konteks 1 yang membuat observasi ini relevan",
    "Kondisi konteks 2 — misalnya jenis target, OS, environment"
  ],
  "questions_raised": [
    "Pertanyaan pertama yang muncul dari observasi ini",
    "Pertanyaan kedua — idealnya 3-5 pertanyaan"
  ],
  "test_steps": [
    {
      "step": 1,
      "action": "Deskripsi aksi yang dilakukan",
      "command": "perintah-literal-yang-dijalankan --dengan-flag",
      "expected_positive": "Output yang menandakan kondisi rentan/menarik",
      "expected_negative": "Output yang menandakan kondisi aman/tidak relevan"
    }
  ],
  "interpretation_guide": {
    "if_positive": "Apa arti jika output positif ditemukan — implikasi keamanannya",
    "if_negative": "Apa arti jika output negatif — apakah berarti aman atau perlu investigasi lain",
    "false_positive_notes": "Kondisi apa yang bisa menghasilkan false positive dan cara membedakannya"
  },
  "hypotheses": [
    {
      "id": "H1",
      "hypothesis": "Pernyataan hipotesis yang bisa diuji",
      "validation_method": "Cara spesifik membuktikan atau menyanggah hipotesis ini",
      "impact_if_true": "Dampak nyata jika hipotesis terbukti benar"
    }
  ],
  "findings_template": "Template teks untuk menulis finding jika observasi ini terbukti — siap parap ke laporan",
  "remediation_hints": [
    "Saran mitigasi singkat 1",
    "Saran mitigasi singkat 2"
  ],
  "references": [
    {
      "title": "Judul referensi",
      "url": "https://link-ke-referensi.com",
      "type": "cve | owasp | article | tool | writeup"
    }
  ],
  "related_nodes": ["obs-id-node-terkait-1", "obs-id-node-terkait-2"],
  "next_routes": {
    "if_vulnerable": ["obs-node-lanjutan-jika-rentan"],
    "if_benign": ["obs-node-alternatif-jika-jinak"]
  },
  "metadata": {
    "author": "handle-kontributor",
    "created": "YYYY-MM-DD",
    "last_updated": "YYYY-MM-DD",
    "version": "1.0",
    "review_status": "draft | review | approved"
  }
}
```

### Penjelasan Field per Field

| Field | Tipe | Wajib | Penjelasan |
|-------|------|-------|------------|
| `id` | string | ✅ | Identifier unik. Format: `obs-[domain-singkatan]-[nama-kebab-case]`. Contoh: `obs-net-ftp` |
| `title` | string | ✅ | Judul singkat dan deskriptif. Maksimal 60 karakter. Hindari jargon berlebihan |
| `domain` | string | ✅ | Domain dari 24 Master Taxonomy. Harus tepat sesuai nama domain resmi |
| `phase` | enum | ✅ | Fase pentest di mana observasi ini paling relevan |
| `severity_hint` | enum | ✅ | Petunjuk keparahan *jika* observasi ini mengarah ke finding. Bukan severity final |
| `tags` | array | ✅ | Minimal 2 tag. Gunakan tag dari daftar standar (lihat Bagian Tag Standar) |
| `description` | string | ✅ | 2-4 kalimat. Jelaskan *apa* diobservasi dan *mengapa* relevan secara keamanan |
| `observation_trigger` | string | ✅ | Satu kalimat spesifik: "apa yang dilihat pentester yang memicu node ini" |
| `context_conditions` | array | ✅ | 2-5 kondisi konteks. Bantu pembaca tahu kapan node ini applicable |
| `questions_raised` | array | ✅ | 3-5 pertanyaan yang muncul secara natural dari observasi ini |
| `test_steps` | array | ✅ | Minimal 1 step. Setiap step harus punya command literal yang bisa langsung dijalankan |
| `interpretation_guide` | object | ✅ | Panduan interpretasi untuk output positif, negatif, dan false positive |
| `hypotheses` | array | ✅ | Minimal 1 hipotesis yang falsifiable |
| `findings_template` | string | ✅ | Template teks siap pakai untuk laporan jika finding dikonfirmasi |
| `remediation_hints` | array | ⚠️ | Disarankan. Setidaknya 1-2 saran mitigasi dasar |
| `references` | array | ⚠️ | Disarankan. Minimal 1 referensi external yang kredibel |
| `related_nodes` | array | ⚠️ | Node lain yang berkaitan. Bangun graf pengetahuan |
| `next_routes` | object | ✅ | Routing ke node berikutnya — wajib ada minimal satu rute |
| `metadata` | object | ✅ | Informasi kontributor dan status review |

---

## ✅ 12-Point Quality Audit Checklist

Sebelum submit Pull Request atau menambahkan node ke modular JSON, **pastikan semua 12 titik ini terpenuhi**. Centang secara mental atau tulis checklist terpisah.

---

### ✅ Point 1 — ID Unik dan Format Benar

**Apa yang diperiksa:** ID node mengikuti format `obs-[domain]-[nama]` dan belum digunakan sebelumnya.

**Cara verifikasi:**
```bash
# Cari apakah ID sudah ada di repository
grep -r "\"id\": \"obs-net-ftp\"" ./observations/
# Jika tidak ada output → ID belum digunakan → ✅
```

> [!WARNING]
> ID yang duplikat akan menyebabkan konflik saat sistem memuat modular JSON. Selalu verifikasi dengan grep sebelum submit.

---

### ✅ Point 2 — Domain Sesuai Taksonomi Resmi

**Apa yang diperiksa:** Field `domain` menggunakan nama yang tepat dari 24 Master Domain Taxonomy.

**Cara verifikasi:**
- Buka `COVERAGE_AUDIT.md` dan bandingkan nama domain di kolom pertama
- Jika domain Anda tidak ada di tabel, diskusikan dulu dengan maintainer sebelum membuat domain baru

---

### ✅ Point 3 — Observation Trigger Spesifik dan Literal

**Apa yang diperiksa:** Field `observation_trigger` menggambarkan hal yang *secara literal terlihat* — bukan interpretasi atau kesimpulan.

**Cara verifikasi:**

| ❌ SALAH (terlalu interpretatif) | ✅ BENAR (literal dan spesifik) |
|---|---|
| "Server FTP tidak aman" | "Output nmap menampilkan `21/tcp open ftp vsftpd 3.0.3`" |
| "Ada SQL injection" | "Field input menampilkan error message berisi syntax SQL: `You have an error in your SQL syntax`" |
| "Admin panel exposed" | "Path `/admin` mengembalikan HTTP 200 dengan form login tanpa redirect ke HTTPS" |

---

### ✅ Point 4 — Minimal 3 Questions Raised yang Relevan

**Apa yang diperiksa:** Array `questions_raised` berisi setidaknya 3 pertanyaan yang *logis muncul* dari observasi, bukan pertanyaan generik.

**Cara verifikasi:**
Baca setiap pertanyaan dan tanya: "Apakah pertanyaan ini secara khusus muncul dari observasi ini, atau bisa muncul dari observasi apa saja?"

| ❌ Terlalu Generik | ✅ Spesifik untuk Observasi |
|---|---|
| "Apakah ini vulnerable?" | "Apakah versi vsftpd 3.0.3 memiliki CVE yang diketahui?" |
| "Apakah ada masalah?" | "Apakah anonymous login diizinkan pada server ini?" |

---

### ✅ Point 5 — Test Steps Punya Command Literal

**Apa yang diperiksa:** Setiap step dalam `test_steps` memiliki field `command` yang berisi perintah yang bisa langsung di-copy-paste dan dijalankan.

**Cara verifikasi:**
Copy setiap `command` dari JSON Anda dan paste ke terminal (dalam lab environment). Jika perintah memerlukan parameter seperti `<target>`, pastikan sudah jelas bahwa itu placeholder.

```bash
# Contoh command yang VALID (ada placeholder jelas)
"command": "ftp <target-ip>"

# Contoh command yang TIDAK VALID (ambigu)
"command": "connect to the FTP server"
```

---

### ✅ Point 6 — Expected Output Terdefinisi untuk Positif DAN Negatif

**Apa yang diperiksa:** Setiap test step mendefinisikan `expected_positive` DAN `expected_negative` — pembaca tahu apa artinya kedua kemungkinan output.

**Cara verifikasi:**
Bayangkan dua skenario: (1) target rentan, (2) target tidak rentan. Apakah output dari kedua skenario sudah dijelaskan? Jika hanya ada "jika rentan" tanpa "jika tidak rentan", checklist ini gagal.

---

### ✅ Point 7 — Interpretation Guide Mencakup False Positive

**Apa yang diperiksa:** Field `interpretation_guide.false_positive_notes` berisi situasi nyata yang bisa menyebabkan false positive dan cara membedakannya.

**Cara verifikasi:**
Tanyakan: "Kondisi apa yang bisa membuat output terlihat positif tapi sebenarnya bukan masalah?" Jika Anda tidak bisa menjawab, field ini mungkin kosong atau tidak akurat.

**Contoh false positive note yang baik:**
> "Beberapa server FTP menampilkan banner 'anonymous' tapi sebenarnya mengharuskan konfirmasi email — verifikasi dengan mencoba `ls` setelah login sebelum mengklaim anonymous login aktif."

---

### ✅ Point 8 — Setidaknya 1 Hipotesis yang Falsifiable

**Apa yang diperiksa:** Array `hypotheses` berisi minimal satu hipotesis yang bisa dibuktikan benar atau salah melalui langkah konkret.

**Cara verifikasi:**
Untuk setiap hipotesis, tanyakan: "Bisakah saya membuktikan ini SALAH dengan langkah tertentu?" Jika tidak bisa — berarti hipotesis terlalu luas dan tidak falsifiable.

| ❌ Tidak Falsifiable | ✅ Falsifiable |
|---|---|
| "Server ini mungkin punya masalah keamanan" | "Anonymous FTP login mengizinkan akses ke direktori `/var/ftp/pub`" |

---

### ✅ Point 9 — Findings Template Siap Pakai untuk Laporan

**Apa yang diperiksa:** Field `findings_template` berisi teks yang bisa langsung digunakan (dengan sedikit edit) sebagai bagian dari laporan pentest profesional.

**Cara verifikasi:**
Copy teks dari `findings_template` ke dokumen laporan kosong. Apakah terlihat profesional dan informatif tanpa edit besar? Template yang baik biasanya berisi:
- Deskripsi temuan
- Bukti (placeholder untuk screenshot/output)
- Dampak
- Referensi

---

### ✅ Point 10 — Remediation Hints Spesifik dan Actionable

**Apa yang diperiksa:** Array `remediation_hints` berisi saran yang spesifik dan bisa langsung diimplementasikan oleh developer/admin — bukan saran generik.

| ❌ Terlalu Generik | ✅ Spesifik dan Actionable |
|---|---|
| "Perbaiki konfigurasi FTP" | "Nonaktifkan anonymous login di vsftpd dengan `anonymous_enable=NO` di `/etc/vsftpd.conf`" |
| "Gunakan password yang kuat" | "Terapkan kebijakan password minimum 12 karakter dengan complexity requirement via PAM" |

---

### ✅ Point 11 — Related Nodes dan Next Routes Terhubung dengan Benar

**Apa yang diperiksa:** Semua ID di `related_nodes` dan `next_routes` merujuk ke node yang *benar-benar ada* di repository.

**Cara verifikasi:**
```bash
# Untuk setiap ID di related_nodes dan next_routes:
grep -r "\"id\": \"obs-net-smb\"" ./observations/
# Jika tidak ada output → node belum ada → ganti dengan komentar atau hapus referensi
```

> [!WARNING]
> Referensi ke node yang tidak ada (dangling references) merusak integritas graf pengetahuan. Jika node tujuan belum ada tapi direncanakan, gunakan komentar `// TODO: obs-net-smb belum dibuat` di luar JSON dan pastikan tidak masuk ke field array.

---

### ✅ Point 12 — Metadata Lengkap dan Review Status Benar

**Apa yang diperiksa:** Semua field dalam `metadata` terisi — terutama `author`, `created`, dan `review_status`.

**Cara verifikasi:**
- `author`: Handle GitHub Anda atau nama kontributor
- `created`: Tanggal hari ini dalam format `YYYY-MM-DD`
- `review_status`: Harus `"draft"` untuk submission baru. Maintainer akan mengubah ke `"review"` dan kemudian `"approved"`

---

## 🧩 Contoh Minimal Lengkap — Node yang Valid

Berikut adalah contoh observation node yang memenuhi semua 12 titik quality audit. Gunakan ini sebagai template awal:

```json
{
  "id": "obs-net-ftp",
  "title": "FTP Service Terdeteksi pada Port 21",
  "domain": "Network Services",
  "phase": "enumeration",
  "severity_hint": "medium",
  "tags": ["ftp", "cleartext", "authentication", "file-transfer", "network"],
  "description": "Port 21 terbuka menandakan adanya layanan FTP aktif pada target. FTP adalah protokol transfer file yang mengirimkan data termasuk kredensial dalam bentuk plaintext, menjadikannya target potensial untuk credential sniffing. Selain itu, konfigurasi default beberapa server FTP mengizinkan anonymous login yang membuka akses tanpa autentikasi.",
  "observation_trigger": "Output nmap atau port scan menampilkan '21/tcp open ftp' beserta banner versi server FTP.",
  "context_conditions": [
    "Target adalah server yang terekspos ke internet atau jaringan internal",
    "Fase aktif adalah network enumeration atau service discovery",
    "FTP belum tentu berbahaya — konteks (anonymous login, versi, CVE) yang menentukan"
  ],
  "questions_raised": [
    "Apakah anonymous login diizinkan pada server FTP ini?",
    "Apakah versi server FTP yang terdeteksi memiliki CVE yang diketahui?",
    "Apakah ada file sensitif yang dapat diakses melalui FTP?",
    "Apakah credential FTP sama dengan credential sistem atau layanan lain?",
    "Apakah koneksi FTP dienkripsi (FTPS/SFTP) atau plaintext?"
  ],
  "test_steps": [
    {
      "step": 1,
      "action": "Coba anonymous login ke server FTP",
      "command": "ftp <target-ip>",
      "expected_positive": "Server merespons dengan '230 Login successful' setelah memasukkan username 'anonymous' dan password sembarang (misal email)",
      "expected_negative": "Server merespons dengan '530 Login incorrect' atau '530 This FTP server is anonymous only' yang berarti anonymous login dinonaktifkan"
    },
    {
      "step": 2,
      "action": "Jika anonymous login berhasil, list isi direktori",
      "command": "ls -la",
      "expected_positive": "Daftar file dan direktori tampil — periksa file sensitif seperti config, backup, credential",
      "expected_negative": "Direktori kosong atau permission denied — anonymous login ada tapi tidak ada file yang bisa diakses"
    },
    {
      "step": 3,
      "action": "Cek versi server FTP terhadap CVE yang diketahui",
      "command": "searchsploit vsftpd 3.0.3",
      "expected_positive": "Ada exploit yang listed untuk versi ini",
      "expected_negative": "Tidak ada hasil exploit — versi ini tidak memiliki CVE yang diketahui di Exploit-DB"
    }
  ],
  "interpretation_guide": {
    "if_positive": "Anonymous login aktif berarti siapa pun dapat mengakses file yang tersedia tanpa kredensial. Ini adalah misconfiguration yang harus dilaporkan. Periksa isi direktori untuk menentukan tingkat keparahan aktual — direktori kosong berbeda dampaknya dengan direktori berisi config file atau backup database.",
    "if_negative": "Anonymous login tidak aktif adalah kondisi yang diharapkan. Namun FTP tetap menggunakan plaintext — jika ada akun FTP yang digunakan, credential bisa disadap jika traffic tidak dienkripsi. Pertimbangkan untuk merekomendasikan migrasi ke SFTP.",
    "false_positive_notes": "Beberapa server FTP menampilkan banner yang menyebut 'anonymous' dalam pesan selamat datang tapi sebenarnya tidak mengizinkan anonymous login. Selalu verifikasi dengan mencoba login aktual sebelum melaporkan sebagai temuan. Juga perhatikan bahwa 'ftp' dalam output nmap tidak selalu berarti FTP — bisa juga FTP over TLS (FTPS) yang berbeda secara keamanan."
  },
  "hypotheses": [
    {
      "id": "H1",
      "hypothesis": "Server FTP mengizinkan anonymous login dan direktori yang dapat diakses berisi file sensitif",
      "validation_method": "Login sebagai anonymous, jalankan 'ls -la', download file yang tersedia dengan 'get <filename>', periksa konten",
      "impact_if_true": "Data sensitif (config, backup, credential) dapat diakses oleh siapa saja tanpa autentikasi — potensi data breach"
    },
    {
      "id": "H2",
      "hypothesis": "Versi FTP server memiliki vulnerability yang dapat dieksploitasi untuk RCE atau privilege escalation",
      "validation_method": "Ambil versi exact dari banner, cari di CVE database dan Exploit-DB, coba exploit di lab environment dulu",
      "impact_if_true": "Remote Code Execution atau privilege escalation pada server target"
    }
  ],
  "findings_template": "**FTP Anonymous Login Enabled**\n\nSelama pengujian, ditemukan bahwa layanan FTP pada [TARGET-IP]:21 mengizinkan anonymous login tanpa autentikasi. Penyerang yang tidak terautentikasi dapat mengakses direktori FTP dan mengunduh file yang tersedia.\n\n**Bukti:**\n```\n[SISIPKAN OUTPUT FTP LOGIN DI SINI]\n```\n\n**Dampak:** Akses tidak sah ke file yang disimpan di server FTP. Tergantung konten direktori, dampak dapat berkisar dari pengungkapan informasi rendah hingga kompromisi data sensitif.\n\n**Rekomendasi:** Nonaktifkan anonymous login kecuali benar-benar diperlukan. Jika FTP harus digunakan, migrasikan ke SFTP untuk mencegah credential sniffing.",
  "remediation_hints": [
    "Nonaktifkan anonymous login: set `anonymous_enable=NO` di `/etc/vsftpd.conf` (vsftpd) atau `<Anonymous enabled='false'>` di konfigurasi ProFTPD",
    "Migrasikan dari FTP ke SFTP (SSH File Transfer Protocol) untuk enkripsi end-to-end",
    "Jika FTP harus dipertahankan, gunakan FTPS (FTP over TLS) dengan sertifikat yang valid",
    "Batasi akses FTP hanya ke IP/range tertentu menggunakan firewall rules"
  ],
  "references": [
    {
      "title": "vsftpd - Very Secure FTP Daemon Documentation",
      "url": "https://security.appspot.com/vsftpd.html",
      "type": "article"
    },
    {
      "title": "OWASP - Testing for FTP",
      "url": "https://owasp.org/www-project-web-security-testing-guide/",
      "type": "owasp"
    }
  ],
  "related_nodes": [
    "obs-net-service-banner",
    "obs-net-smb"
  ],
  "next_routes": {
    "if_vulnerable": ["obs-priv-credential-history"],
    "if_benign": ["obs-net-service-banner"]
  },
  "metadata": {
    "author": "cyber-sec-hanz",
    "created": "2026-09-22",
    "last_updated": "2026-09-22",
    "version": "1.0",
    "review_status": "approved"
  }
}
```

---

## 🚫 Anti-Patterns dan Kesalahan Umum

### Anti-Pattern 1: Loncat ke Kesimpulan

```json
// ❌ SALAH — observation_trigger sudah berupa kesimpulan
"observation_trigger": "Server FTP vulnerable terhadap anonymous login"

// ✅ BENAR — literal apa yang dilihat
"observation_trigger": "Port 21/tcp terbuka pada hasil nmap dengan banner 'vsftpd 3.0.3'"
```

### Anti-Pattern 2: Test Step Tanpa Command Literal

```json
// ❌ SALAH — tidak actionable
"command": "Test apakah FTP bisa diakses"

// ✅ BENAR — bisa langsung dijalankan
"command": "ftp <target-ip>"
```

### Anti-Pattern 3: Satu Node untuk Banyak Observasi

```json
// ❌ SALAH — node ini menggabungkan FTP DAN SMB
"title": "FTP dan SMB Service Terdeteksi"

// ✅ BENAR — pisahkan menjadi obs-net-ftp dan obs-net-smb
"title": "FTP Service Terdeteksi pada Port 21"
```

### Anti-Pattern 4: Severity Hint Berlebihan

```json
// ❌ SALAH — port terbuka saja bukan critical
"severity_hint": "critical"

// ✅ BENAR — severity_hint hanya hint, bukan keputusan final
"severity_hint": "medium"
```

> [!NOTE]
> `severity_hint` adalah *petunjuk awal* berdasarkan potensi dampak jika hipotesis terbukti benar. Severity final ditentukan saat finding dikonfirmasi, dengan mempertimbangkan exploitability, impact, dan konteks target.

### Anti-Pattern 5: Findings Template yang Terlalu Teknis atau Terlalu Generik

```json
// ❌ SALAH — terlalu generik, tidak berguna untuk laporan
"findings_template": "Ditemukan masalah FTP pada server."

// ❌ SALAH — terlalu teknis, penuh jargon tanpa struktur
"findings_template": "vsftpd 3.0.3 anon_enable=YES misconfiguration leading to potential data exfil via PORT command"

// ✅ BENAR — profesional, terstruktur, dan siap pakai
"findings_template": "**FTP Anonymous Login Enabled**\n\n[Deskripsi singkat...]"
```

### Anti-Pattern 6: Related Nodes Menunjuk ke Node yang Tidak Ada

```json
// ❌ SALAH — node ini belum dibuat
"related_nodes": ["obs-net-telnet", "obs-net-rlogin"]

// ✅ BENAR — hanya referensi node yang ada
"related_nodes": ["obs-net-service-banner", "obs-net-smb"]
```

---

## 📤 Workflow Submit Observation Node Baru

Ikuti langkah berikut setiap kali Anda ingin menambahkan observation node baru ke repository:

```
1. RISET
   └── Pahami domain target, pelajari teknik terkait
   └── Baca node yang sudah ada di domain yang sama

2. DRAFT
   └── Buat file JSON baru: observations/[domain]/obs-[domain]-[nama].json
   └── Isi semua field wajib menggunakan schema di atas
   └── Gunakan contoh minimal sebagai referensi

3. SELF-AUDIT
   └── Jalankan 12-Point Quality Audit Checklist
   └── Perbaiki semua titik yang gagal sebelum lanjut

4. VALIDASI JSON
   └── Pastikan JSON valid secara sintaks:
       $ python3 -c "import json; json.load(open('obs-net-ftp.json'))"
   └── Atau gunakan jq:
       $ jq . obs-net-ftp.json

5. CEK DUPLIKAT ID
   └── grep -r "\"id\": \"obs-net-ftp\"" ./observations/
   └── Pastikan tidak ada output (ID belum digunakan)

6. UPDATE INDEX
   └── Tambahkan entry ke file index modular JSON yang sesuai
   └── Biasanya: observations/[domain]/index.json

7. UPDATE COVERAGE AUDIT
   └── Buka COVERAGE_AUDIT.md
   └── Tambahkan ID node baru ke kolom "Phase 1 Seed Nodes" domain terkait
   └── Perbarui tanggal audit

8. COMMIT DAN SUBMIT
   └── git add observations/[domain]/obs-[nama].json
   └── git add cyber-sec-wiki/COVERAGE_AUDIT.md
   └── git commit -m "feat(obs): add obs-[domain]-[nama] — [deskripsi singkat]"
   └── Buat Pull Request dengan template yang disediakan
```

> [!TIP]
> Gunakan prefix commit message yang konsisten:
> - `feat(obs):` untuk node baru
> - `fix(obs):` untuk perbaikan node yang ada
> - `docs(wiki):` untuk update dokumentasi
> - `refactor(obs):` untuk restructuring schema tanpa mengubah konten

---

## 📋 Tag Standar yang Direkomendasikan

Gunakan tag dari daftar berikut untuk konsistensi. Anda bisa menambahkan tag baru jika benar-benar tidak ada yang cocok, tapi diskusikan dulu dengan maintainer.

| Kategori Tag | Tag yang Tersedia |
|---|---|
| **Protokol** | `ftp`, `ssh`, `smb`, `rdp`, `http`, `https`, `dns`, `smtp`, `snmp`, `ldap` |
| **Teknik Serangan** | `sqli`, `xss`, `csrf`, `ssrf`, `ssti`, `xxe`, `idor`, `lfi`, `rfi`, `rce` |
| **Authentication** | `authentication`, `authorization`, `session`, `jwt`, `oauth`, `mfa`, `brute-force` |
| **Network** | `network`, `port-scan`, `service-discovery`, `cleartext`, `encryption` |
| **Web** | `web`, `api`, `rest`, `graphql`, `websocket`, `cors`, `csp` |
| **System** | `linux`, `windows`, `privilege-escalation`, `suid`, `sudo`, `kernel` |
| **Cloud** | `cloud`, `aws`, `s3`, `iam`, `container`, `kubernetes`, `docker` |
| **Mobile** | `mobile`, `android`, `ios`, `apk`, `ipa` |
| **Crypto** | `cryptography`, `hash`, `tls`, `ssl`, `certificate`, `weak-cipher` |
| **Impact** | `data-exposure`, `credential-theft`, `rce`, `dos`, `information-disclosure` |

---

*Dokumen ini adalah living document — update setiap kali schema atau proses berubah. Untuk pertanyaan atau diskusi, buka issue di repository dengan label `docs`.*
