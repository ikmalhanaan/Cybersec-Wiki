import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_JSON = path.resolve(__dirname, '../src/data/observations/web.json');

const nodes = JSON.parse(fs.readFileSync(WEB_JSON, 'utf8'));
const map = new Map(nodes.map(n => [n.id, n]));

const batch2 = [
  {
    "id": "obs-web-id-parameter",
    "title": "Parameter Identitas / Objek Terdeteksi (ID / Object Reference Parameter)",
    "domain": "Authorization & Access Control",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "URL query parameter: ?id=101, ?user_id=45, ?account=A88, ?doc_id=9281",
      "REST URL path: /api/v1/users/42, /orders/1002/invoice, /patient/554/records",
      "JSON body field: {\"accountId\": 1044, \"reportId\": 88}",
      "Header kustom: X-User-Id: 50"
    ],
    "context": "Ditemukan saat membuka profil user, melihat riwayat transaksi, mengunduh file faktur, atau mengedit data akun sendiri.",
    "why_it_matters": "Ketika aplikasi menerima pengidentifikasi objek langsung dari client untuk menentukan data mana yang akan diakses, server wajib melakukan verifikasi otorisasi: 'Apakah pengguna yang sedang login berhak melihat/mengubah objek ini?'. Mengubah ID adalah tes otorisasi, bukan bukti IDOR sebelum data objek milik user lain berhasil diakses.",
    "questions_to_ask": [
      "Apakah nilai ID berupa angka sequential (1, 2, 3...) atau GUID/UUID berentropi tinggi?",
      "Bagaimana server merespons jika nilai ID diubah ke ID milik user lain atau ID dummy?",
      "Apakah endpoint ini memerlukan otentikasi (cookie/token) atau dapat diakses publik?",
      "Metode HTTP apa saja yang didukung (GET untuk baca, PUT/DELETE untuk ubah/hapus)?"
    ],
    "inspection_points": [
      {
        "id": "id-predictability",
        "name": "1. Format & Prediktabilitas Pengidentifikasi (ID Predictability)",
        "why_check": "Mengetahui seberapa mudah penyerang dapat menebak atau mengiterasi objek lain.",
        "what_to_look_for": [
          "Sequential integer (101, 102, 103)",
          "Pola hash yang dapat di-rekonstruksi (misal: MD5 dari username atau timestamp)",
          "UUID v1 vs UUID v4"
        ],
        "normal_baseline": "Aplikasi modern menggunakan pengidentifikasi non-prediktif (UUID v4) atau memeriksa kepemilikan objek di session server.",
        "interesting_clues": [
          "ID berupa angka sequential kecil yang dapat di-increment dengan mudah",
          "ID merupakan string base64 dari ID numerik"
        ],
        "evidence_to_capture": [
          "Contoh URL dan nilai parameter ID dari akun tester",
          "Pola penomoran ID yang diamati"
        ]
      },
      {
        "id": "id-authorization-boundary",
        "name": "2. Batas Otorisasi Objek (Horizontal & Vertical Boundary)",
        "why_check": "Menguji apakah server memeriksa kepemilikan objek terhadap sesi user aktif.",
        "what_to_look_for": [
          "Respon saat ID diubah menjadi ID milik akun tester kedua dengan role setara",
          "Respon saat ID diubah menjadi ID objek milik akun admin"
        ],
        "normal_baseline": "Server menolak akses dengan HTTP 403 Forbidden atau 404 Not Found.",
        "interesting_clues": [
          "Server mengembalikan HTTP 200 OK dengan payload data lengkap milik pengguna lain",
          "Data berhasil terubah saat mengirim method PUT/POST dengan ID pengguna lain"
        ],
        "evidence_to_capture": [
          "Request & Response akun A saat mengakses objek A",
          "Request & Response akun A saat mengakses objek B",
          "Data sensitif yang terungkap"
        ]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-idor-success",
        "inspection_point_id": "id-authorization-boundary",
        "signal_description": "Mengubah ID parameter mengembalikan data profil pengguna lain dengan status 200 OK.",
        "output_snippet": "GET /api/user?id=102 HTTP/1.1\nCookie: session_user_101\n\nHTTP/1.1 200 OK\n{\"id\": 102, \"name\": \"Bob Smith\", \"email\": \"bob@corp.local\", \"salary\": 85000}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Aplikasi mengambil objek dari database hanya berdasarkan parameter ID tanpa mencocokkan session ID pemanggil (Insecure Direct Object Reference / BOLA).",
        "hypothesis_id": "hyp-idor-horizontal",
        "evidence_to_capture": [
          "Request akun tester 1 mengakses objek 101",
          "Request akun tester 1 mengakses objek 102 beserta respons berisi data akun tester 2"
        ]
      }
    ],
    "unexpected_signals": [
      "HTTP 500 SQL syntax error saat parameter ID diisi karakter kutip tunggal"
    ],
    "hypotheses": [
      {
        "id": "hyp-idor-horizontal",
        "name": "Horizontal Insecure Direct Object Reference (IDOR / BOLA)",
        "description": "Pengguna dapat membaca atau memodifikasi data milik pengguna lain pada tingkat hak akses yang sama.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-idor-success"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Buat 2 akun uji coba mandiri: Akun A (ID: 101) dan Akun B (ID: 102).",
            "expected_output": "Akun A hanya dapat mengakses objek 101.",
            "interesting_output": "Akun A dapat melihat invoice/profil milik objek 102.",
            "unexpected_output": "Akun terkunci.",
            "interpretation": "Membuktikan ketiadaan validasi ACL pada backend.",
            "evidence_to_record": ["Side-by-side burp repeater logs"]
          }
        ]
      }
    ],
    "stop_conditions": [
      "Server konsisten mengembalikan HTTP 403 Forbidden atau 401 Unauthorized saat ID diubah.",
      "Aplikasi mengabaikan parameter ID dan selalu menampilkan data dari sesi user aktif."
    ],
    "common_mistakes": [
      "Menguji IDOR pada data pengguna nyata tanpa izin (selalu gunakan 2 akun milik tester sendiri)."
    ],
    "ctf_notes": "Di CTF, IDOR sering kali berupa parameter numerik sederhana pada fitur invoice (?id=1) atau catatan rahasia admin (/api/notes/1).",
    "pentest_notes": "IDOR / BOLA adalah temuan peringkat #1 di OWASP API Security Top 10.",
    "unknown_guide": {
      "what_is_this": "Bagian dari URL, body, atau header yang menentukan nomor file atau baris database yang diminta.",
      "why_does_it_exist": "Memberitahu backend objek mana yang ingin ditampilkan atau diedit oleh client.",
      "what_parts_matter": "Nama variabel parameter, nilai identifier, dan apakah server memeriksa hak akses kepemilikan objek.",
      "what_normal_looks_like": "Server hanya mengizinkan user mengakses ID yang terikat dengan session akunnya sendiri.",
      "what_to_record_immediately": ["URL lengkap dan nama parameter ID", "Nilai ID akun Anda sendiri"]
    },
    "negative_result_guide": {
      "summary": "Server menolak akses ke objek lain dengan HTTP 403 Forbidden yang benar.",
      "why_not_secure": "Proteksi IDOR pada endpoint profil tidak menjamin endpoint ekspor PDF atau update password memiliki proteksi serupa.",
      "next_pivot_observations": ["obs-web-api-endpoint", "obs-web-form-input"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "27",
        "slug": "idor-access-control",
        "title": "27. IDOR & Access Control Workflow",
        "section_title": "1.1 IDOR Identification",
        "anchor": "11-idor-identification",
        "rationale": "Pelajari metodologi sistematis menemukan dan mengeksploitasi IDOR horizontal dan vertikal."
      }
    ],
    "related_observations": ["obs-web-url-query-param", "obs-web-api-endpoint"],
    "provenance": ["OWASP WSTG-ATHZ-04", "OWASP API Security Top 10 API1:2023"]
  },
  {
    "id": "obs-web-url-query-param",
    "title": "Parameter Query URL Terdeteksi (URL Query Parameter Inspection)",
    "domain": "Web Application",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Karakter tanda tanya dan pasangan key=value pada URL: ?page=about, ?file=data.txt, ?url=https://...",
      "Parameter pencarian, filter, navigasi, redirect, dan view"
    ],
    "context": "Terlihat di address bar browser, link internal, atau riwayat traffic proxy (Burp Suite).",
    "why_it_matters": "Parameter URL adalah input langsung dari pengguna ke server. Menjadi titik masuk utama untuk Local File Inclusion (LFI), Server-Side Request Forgery (SSRF), SQL Injection, Cross-Site Scripting (XSS), dan Open Redirect.",
    "questions_to_ask": [
      "Bagaimana server menggunakan nilai parameter (apakah dimuat ke database atau diakses dari filesystem)?",
      "Apakah nilai parameter menyerupai path file, nama file, URL eksternal, atau template?",
      "Bagaimana respons server jika nilai parameter dikosongkan atau diisi karakter escape (' \" < > `)?"
    ],
    "inspection_points": [
      {
        "id": "point-param-purpose",
        "name": "Analisis Tujuan Parameter (File, URL, Database, Refleksi)",
        "why_check": "Menentukan vektor pengujian yang relevan berdasarkan semantik nama dan nilai parameter.",
        "what_to_look_for": [
          "Parameter file/path: ?file=, ?page=, ?include=, ?doc=",
          "Parameter URL/link: ?url=, ?redirect=, ?next=, ?dest=, ?target="
        ],
        "normal_baseline": "Parameter hanya menerima nilai dari whitelist terbatas.",
        "interesting_clues": [
          "Parameter ?file=about.php memuat isi file dari server",
          "Parameter ?url=http://... memuat resource dari server remote (SSRF suspect)"
        ],
        "evidence_to_capture": ["URL lengkap dengan query string", "Contoh respon server"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-param-reflection",
        "inspection_point_id": "point-param-purpose",
        "signal_description": "Nilai parameter direfleksikan mentah ke dalam body response HTML tanpa sanitasi.",
        "output_snippet": "GET /search?q=test123\nHTTP/1.1 200 OK\n<div>Hasil untuk: test123</div>",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Aplikasi menampilkan kembali input pengguna ke browser, membuka hipotesis Reflected XSS jika karakter HTML tidak di-encode.",
        "hypothesis_id": "hyp-param-xss",
        "evidence_to_capture": ["Request dengan string unik", "Response mentah yang menunjukkan refleksi"]
      }
    ],
    "unexpected_signals": ["HTTP 500 saat parameter diisi karakter khusus"],
    "hypotheses": [
      {
        "id": "hyp-param-xss",
        "name": "Reflected Cross-Site Scripting (XSS)",
        "description": "Input pengguna dieksekusi sebagai kode HTML/JavaScript di browser korban.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-param-reflection"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Kirim payload karakter aman: `test<b>bold</b>123` dan periksa apakah tag `<b>` dirender.",
            "expected_output": "Server meng-encode karakter HTML menjadi entitas teks aman.",
            "interesting_output": "Teks 'bold' dirender tebal oleh browser.",
            "unexpected_output": "WAF blocking.",
            "interpretation": "Mengonfirmasi apakah konteks HTML mengizinkan injeksi tag.",
            "evidence_to_record": ["Source view HTML dari respons"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server meng-encode seluruh karakter khusus menjadi HTML entities."],
    "common_mistakes": ["Langsung menembakkan payload alert(1) tanpa memeriksa konteks refleksi."],
    "ctf_notes": "Di CTF, parameter ?page=index hampir selalu merupakan LFI ke file flag.",
    "pentest_notes": "Di pentest resmi, pastikan mendokumentasikan dampak XSS terhadap pencurian cookie.",
    "unknown_guide": {
      "what_is_this": "Bagian URL setelah tanda tanya (?) yang mengirimkan variabel input ke server web.",
      "why_does_it_exist": "Meneruskan data navigasi, query pencarian, dan preferensi tampilan antar request.",
      "what_parts_matter": "Nama variabel parameter dan bagaimana server memproses nilainya.",
      "what_normal_looks_like": "Parameter memproses input standar tanpa mengubah struktur halaman secara berbahaya.",
      "what_to_record_immediately": ["URL lengkap", "Nama parameter"]
    },
    "negative_result_guide": {
      "summary": "Parameter query disanitasi dan di-encode dengan aman.",
      "why_not_secure": "Aplikasi mungkin masih memiliki hidden parameters yang belum ditemukan.",
      "next_pivot_observations": ["obs-web-search-field", "obs-web-form-input"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "19",
        "slug": "sql-injection",
        "title": "19. SQL Injection Workflow",
        "section_title": "1.1 Identifikasi Parameter Rentan",
        "anchor": "11-identifikasi-parameter-rentan",
        "rationale": "Pelajari cara mengenali dan menguji parameter query yang terhubung ke query database."
      }
    ],
    "related_observations": ["obs-web-id-parameter", "obs-web-search-field"],
    "provenance": ["OWASP WSTG-INPV-01", "MITRE ATT&CK T1059.007"]
  },
  {
    "id": "obs-web-search-field",
    "title": "Field Pencarian Terdeteksi (Search Input Field)",
    "domain": "Web Application",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Input text pencarian: <input type='search'> atau <input name='q'>",
      "Halaman menampilkan hasil pencarian dengan teks refleksi"
    ],
    "context": "Ditemukan pada portal berita, e-commerce, blog CMS, dan dashboard aplikasi.",
    "why_it_matters": "Field pencarian umumnya terhubung langsung ke query backend (SQL LIKE '%...%', Elasticsearch, LDAP, atau template engine).",
    "questions_to_ask": [
      "Di mana nilai pencarian ditampilkan kembali pada halaman?",
      "Bagaimana jika ekspresi matematika dimasukkan (misal: {{7*7}} atau ${7*7})?"
    ],
    "inspection_points": [
      {
        "id": "point-search-template-eval",
        "name": "Pemeriksaan Evaluasi Template (SSTI Check)",
        "why_check": "Mendeteksi apakah engine pencarian menggunakan template engine.",
        "what_to_look_for": ["Input: {{7*7}}", "Input: ${7*7}"],
        "normal_baseline": "Teks {{7*7}} dicetak persis secara literal sebagai teks biasa.",
        "interesting_clues": ["Halaman menampilkan angka '49' di tempat teks query (SSTI terkonfirmasi)"],
        "evidence_to_capture": ["Request payload ekspresi matematika", "Response merender angka 49"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-search-ssti-49",
        "inspection_point_id": "point-search-template-eval",
        "signal_description": "Input {{7*7}} dievaluasi menjadi 49 pada halaman hasil pencarian.",
        "output_snippet": "GET /search?query={{7*7}}\nHTTP/1.1 200 OK\n<h1>Hasil pencarian untuk: 49</h1>",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Backend template engine mengeksekusi ekspresi dinamis yang disuplai pengguna (Server-Side Template Injection / SSTI).",
        "hypothesis_id": "hyp-search-ssti-rce",
        "evidence_to_capture": ["Request HTTP mentah dengan {{7*7}}", "Response HTML yang merender angka 49"]
      }
    ],
    "unexpected_signals": ["Database error saat query memuat kutip (')"],
    "hypotheses": [
      {
        "id": "hyp-search-ssti-rce",
        "name": "Server-Side Template Injection (SSTI)",
        "description": "Template engine backend mengeksekusi ekspresi pengguna yang berpotensi ditingkatkan menjadi Remote Code Execution.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-search-ssti-49"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Kirim payload pembeda template engine: `{{7*'7'}}`. Jika hasilnya `7777777` adalah Jinja2/Python; jika `49` adalah Twig/PHP.",
            "expected_output": "Mengetahui spesifikasi template engine yang digunakan.",
            "interesting_output": "Identifikasi engine Jinja2 atau Twig secara akurat.",
            "unexpected_output": "Template syntax error.",
            "interpretation": "Menentukan payload escalation yang sesuai.",
            "evidence_to_record": ["Output body response"]
          }
        ]
      }
    ],
    "stop_conditions": ["Aplikasi meng-encode seluruh karakter dan tidak mengevaluasi template syntax."],
    "common_mistakes": ["Menganggap semua angka 49 adalah SSTI tanpa memverifikasi evaluasi."],
    "ctf_notes": "SSTI pada Flask/Jinja2 adalah salah satu challenge paling populer di CTF Web modern.",
    "pentest_notes": "SSTI umumnya bernilai Critical karena berujung pada RCE.",
    "unknown_guide": {
      "what_is_this": "Kolom input teks di aplikasi web yang memungkinkan pencarian konten.",
      "why_does_it_exist": "Fitur navigasi standar untuk memudahkan pengguna menemukan informasi.",
      "what_parts_matter": "Bagaimana input disaring sebelum dikirim ke database atau template engine.",
      "what_normal_looks_like": "Pencarian menampilkan konten yang cocok tanpa mengeksekusi kode.",
      "what_to_record_immediately": ["Nama parameter pencarian"]
    },
    "negative_result_guide": {
      "summary": "Field pencarian aman dari injeksi template dan SQL injection.",
      "why_not_secure": "Fitur filter kategori atau pagination mungkin memiliki parameter rentan.",
      "next_pivot_observations": ["obs-web-url-query-param", "obs-web-form-input"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "23",
        "slug": "ssti",
        "title": "23. Server-Side Template Injection Workflow",
        "section_title": "1.1 Template Engine Identification",
        "anchor": "11-identifikasi-template-engine",
        "rationale": "Panduan identifikasi engine template (Jinja, Twig, Smarty) dan payload RCE."
      }
    ],
    "related_observations": ["obs-web-url-query-param", "obs-web-error-message"],
    "provenance": ["OWASP WSTG-INPV-18", "CWE-1336"]
  },
  {
    "id": "obs-web-form-input",
    "title": "Input Form & Hidden Field Terdeteksi (Form Inputs & Hidden Fields)",
    "domain": "Client-Side Security",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Tag HTML form: <input type='hidden' name='...' value='...'>",
      "Field form yang dinonaktifkan (disabled / readonly) di sisi browser"
    ],
    "context": "Ditemukan saat menginspeksi halaman checkout belanja, edit profile, atau formulir pendaftaran.",
    "why_it_matters": "Pengembang sering kali salah berasumsi bahwa input yang tidak terlihat oleh pengguna (hidden field) tidak dapat diubah. Penyerang dapat memodifikasi nilai hidden input via proxy untuk melakukan Mass Assignment atau Price Tampering.",
    "questions_to_ask": [
      "Apa fungsi dari masing-masing hidden input field?",
      "Apakah ada parameter sensitif seperti 'role', 'is_admin', 'price', atau 'discount'?"
    ],
    "inspection_points": [
      {
        "id": "point-hidden-fields",
        "name": "Audit Field Tersembunyi (Hidden Inputs Audit)",
        "why_check": "Menemukan parameter bisnis sensitif yang dikirim secara tidak aman melalui client.",
        "what_to_look_for": ["<input type='hidden' name='role' value='user'>", "<input type='hidden' name='price' value='99.99'>"],
        "normal_baseline": "Hidden field hanya digunakan untuk state navigasi aman atau token anti-CSRF acak.",
        "interesting_clues": ["Parameter role atau harga dapat diedit langsung"],
        "evidence_to_capture": ["Tangkapan layar inspect element HTML form", "Request POST mentah"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-form-price-tamper",
        "inspection_point_id": "point-hidden-fields",
        "signal_description": "Mengubah hidden input 'price' dari 100 menjadi 1 berhasil diproses oleh gateway checkout.",
        "output_snippet": "POST /checkout HTTP/1.1\nitem_id=42&price=1.00\n\nHTTP/1.1 200 OK\n{\"order_id\": \"9812\", \"status\": \"paid_success\", \"total\": 1.00}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Aplikasi mempercayai harga dari client tanpa validasi ulang terhadap database produk di backend (Business Logic Flaw).",
        "hypothesis_id": "hyp-form-logic-tampering",
        "evidence_to_capture": ["Request POST dengan harga diubah", "Respon konfirmasi order sukses"]
      }
    ],
    "unexpected_signals": ["Server mengembalikan error 'HMAC validation failed'"],
    "hypotheses": [
      {
        "id": "hyp-form-logic-tampering",
        "name": "Business Logic Parameter Tampering",
        "description": "Manipulasi parameter bisnis di form client mengarah pada manipulasi status transaksi.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-form-price-tamper"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Kirim request dengan nilai harga normal untuk mencatat baseline transaksi, lalu kirim request uji dengan nilai yang diubah pada item lab.",
            "expected_output": "Server menolak transaksi atau mengambil harga dari database backend.",
            "interesting_output": "Transaksi diproses menggunakan harga manipulasi.",
            "unexpected_output": "Account lockout.",
            "interpretation": "Membuktikan ketiadaan validasi server-side pada input tersembunyi.",
            "evidence_to_record": ["Bukti transaksi Burp Repeater"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server menolak nilai yang diubah dan menghitung harga secara eksklusif di backend."],
    "common_mistakes": ["Mengira field disabled di HTML aman dari manipulasi."],
    "ctf_notes": "Di CTF, inspeksi source code HTML sering kali menemukan hidden field dengan komentar author.",
    "pentest_notes": "Price Tampering adalah temuan High Severity dengan dampak finansial langsung.",
    "unknown_guide": {
      "what_is_this": "Elemen form HTML yang tidak terlihat di layar pengguna namun tetap dikirim saat form disubmit.",
      "why_does_it_exist": "Menyimpan variabel state seperti session id atau token CSRF.",
      "what_parts_matter": "Nama variabel dan apakah nilainya berisi data penting.",
      "what_normal_looks_like": "Hanya membawa token CSRF atau nilai referensi yang divalidasi ketat.",
      "what_to_record_immediately": ["Kode HTML tag form lengkap"]
    },
    "negative_result_guide": {
      "summary": "Seluruh data form divalidasi ulang di backend database.",
      "why_not_secure": "Form mungkin masih rentan terhadap CSRF jika tidak memiliki anti-CSRF token yang valid.",
      "next_pivot_observations": ["obs-web-error-message", "obs-web-api-endpoint"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "29",
        "slug": "csrf",
        "title": "29. CSRF Workflow",
        "section_title": "1.1 CSRF Token Inspection",
        "anchor": "11-csrf-token-inspection",
        "rationale": "Analisis keberadaan dan validasi token anti-CSRF pada form web."
      }
    ],
    "related_observations": ["obs-web-id-parameter", "obs-web-url-query-param"],
    "provenance": ["OWASP WSTG-BUSL-04", "CWE-472"]
  },
  {
    "id": "obs-web-error-message",
    "title": "Pesan Kesalahan Rinci / Stack Trace Terdeteksi (Verbose Error / Stack Trace)",
    "domain": "Information Disclosure",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Halaman error HTTP 500 memuat jejak tumpukan (Stack Trace) kode sumber",
      "Pesan database exception: MySQL, PostgreSQL, MSSQL, Oracle, SQLite syntax error"
    ],
    "context": "Muncul saat mengirimkan input tak terduga, karakter kutip ganda, atau format tipe data salah.",
    "why_it_matters": "Verbose error message adalah kebocoran informasi berharga (Information Disclosure). Pesan ini membongkar struktur internal aplikasi, nama tabel/kolom database, dan path direktori absolut.",
    "questions_to_ask": [
      "Teknologi apa yang disebutkan dalam pesan error?",
      "Apakah path file lokal (/var/www/...) terungkap?",
      "Apakah potongan query SQL asli tercetak di halaman?"
    ],
    "inspection_points": [
      {
        "id": "point-error-tech-leak",
        "name": "Ekstraksi Komponen Teknologi & Path",
        "why_check": "Mendapatkan informasi lingkungan backend tanpa menebak.",
        "what_to_look_for": ["Nama database", "Path direktori web root"],
        "normal_baseline": "Aplikasi menampilkan halaman error kustom yang rapi tanpa rincian teknis.",
        "interesting_clues": ["Potongan query SQL lengkap terlihat: SELECT * FROM users WHERE id = '...'"],
        "evidence_to_capture": ["Tangkapan layar pesan error lengkap", "Teks traceback mentah"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-error-sqli-syntax",
        "inspection_point_id": "point-error-tech-leak",
        "signal_description": "Pesan error membocorkan sintaks SQL engine secara spesifik.",
        "output_snippet": "mysqli_query(): You have an error in your SQL syntax near '1'' at line 1 in /var/www/html/catalog.php on line 34",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Input pengguna dikonkatenasi langsung ke perintah SQL database (Error-Based SQL Injection vector).",
        "hypothesis_id": "hyp-error-sqli",
        "evidence_to_capture": ["Request pemicu error", "Pesan error mysqli lengkap"]
      }
    ],
    "unexpected_signals": ["Server mengembalikan error 'Out of Memory'"],
    "hypotheses": [
      {
        "id": "hyp-error-sqli",
        "name": "Error-Based SQL Injection",
        "description": "Pesan error database dapat dimanfaatkan untuk mengekstrak data sensitif menggunakan fungsi error generator.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-error-sqli-syntax"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Kirim payload konversi tipe data aman (misal: CAST('1' AS INT)) untuk memverifikasi eksekusi SQL.",
            "expected_output": "Pesan error terprediksi dari database engine.",
            "interesting_output": "Data versi database tercetak di dalam teks pesan error.",
            "unexpected_output": "WAF drop connection.",
            "interpretation": "Mengonfirmasi kapabilitas Error-Based SQL Injection.",
            "evidence_to_record": ["Burp repeater raw response"]
          }
        ]
      }
    ],
    "stop_conditions": ["Aplikasi dinonaktifkan mode debug-nya dan menampilkan generic 500 error page."],
    "common_mistakes": ["Mengira semua status HTTP 500 adalah SQL injection."],
    "ctf_notes": "Di CTF, Werkzeug debugger console aktif sering kali memiliki fitur interactive console yang dapat dieksekusi menjadi RCE via pin.",
    "pentest_notes": "Information Disclosure via Stack Trace dicatat sebagai Low/Medium.",
    "unknown_guide": {
      "what_is_this": "Pesan kesalahan teknis dari server ketika terjadi kegagalan eksekusi kode internal.",
      "why_does_it_exist": "Membantu programmer menemukan letak bug saat tahap pengembangan.",
      "what_parts_matter": "Nama file, baris kode, nama database, dan informasi rahasia.",
      "what_normal_looks_like": "Halaman error yang ramah pengguna tanpa rincian baris kode.",
      "what_to_record_immediately": ["Teks pesan error lengkap"]
    },
    "negative_result_guide": {
      "summary": "Server menangani exception dengan aman dan menyembunyikan stack trace.",
      "why_not_secure": "Penanganan error yang rapi tidak menjamin aplikasi kebal dari Time-Based Blind SQLi.",
      "next_pivot_observations": ["obs-web-url-query-param", "obs-web-api-endpoint"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "19",
        "slug": "sql-injection",
        "title": "19. SQL Injection Workflow",
        "section_title": "4.1 Error-Based SQLi",
        "anchor": "41-error-based-sqli",
        "rationale": "Pelajari teknik ekstraksi data memanfaatkan fungsi error database."
      }
    ],
    "related_observations": ["obs-web-url-query-param", "obs-web-search-field"],
    "provenance": ["OWASP WSTG-INFO-05", "CWE-209"]
  },
  {
    "id": "obs-web-file-upload",
    "title": "Fitur Unggah File Terdeteksi (File Upload Interface)",
    "domain": "Server-Side Vulnerabilities",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Form input HTML: <input type='file' name='avatar'>",
      "Drag-and-drop zone untuk file upload",
      "Header request HTTP: Content-Type: multipart/form-data"
    ],
    "context": "Ditemukan pada pengaturan profil user, form pendaftaran kerja, atau sistem ticketing.",
    "why_it_matters": "Jika server menyimpan file di direktori web-accessible dan mengeksekusinya via web server handler (PHP, ASPX, JSP, Python), penyerang dapat mencapai Remote Code Execution (RCE).",
    "questions_to_ask": [
      "Tipe file apa yang diharapkan oleh aplikasi?",
      "Apakah validasi dilakukan di client-side atau server-side?",
      "Di mana file disimpan? Apakah dapat diakses langsung via URL?"
    ],
    "inspection_points": [
      {
        "id": "upload-validation-layers",
        "name": "1. Lapisan Validasi File (Extension, MIME, Content)",
        "why_check": "Mengetahui di mana dan bagaimana filter upload diterapkan.",
        "what_to_look_for": ["Ekstensi file", "Header Content-Type", "Magic bytes"],
        "normal_baseline": "Server memverifikasi ekstensi terhadap whitelist ketat dan memeriksa magic bytes.",
        "interesting_clues": ["Validasi hanya berjalan di JavaScript browser", "Blacklist filtering tidak lengkap (.phtml)"],
        "evidence_to_capture": ["Tangkapan request multipart mentah", "Daftar ekstensi"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-upload-ext-bypass",
        "inspection_point_id": "upload-validation-layers",
        "signal_description": "File berekstensi script alternatif (.phtml) berhasil diunggah dengan status 200 OK.",
        "output_snippet": "POST /upload.php HTTP/1.1\nContent-Disposition: form-data; name=\"file\"; filename=\"test.phtml\"\n\nHTTP/1.1 200 OK\n{\"status\": \"success\", \"url\": \"/uploads/test.phtml\"}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Filter ekstensi server berbasis blacklist yang tidak lengkap, memblokir .php namun melewatkan ekstensi eksekutabel sekunder.",
        "hypothesis_id": "hyp-upload-rce",
        "evidence_to_capture": ["Request upload file .phtml beserta respon 200 OK"]
      }
    ],
    "unexpected_signals": ["HTTP 500 Image Processing Exception saat mengunggah file SVG"],
    "hypotheses": [
      {
        "id": "hyp-upload-rce",
        "name": "Remote Code Execution via Unrestricted Web Shell Upload",
        "description": "File skrip dieksekusi oleh web server backend saat diakses melalui browser.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-upload-ext-bypass"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Unggah file uji coba non-destruktif: info.phtml berisi `<?php echo 'SAFE_TEST_VERIFIED'; ?>`.",
            "expected_output": "File ditolak atau jika diakses menampilkan kode sumber mentah.",
            "interesting_output": "Halaman /uploads/info.phtml merender teks 'SAFE_TEST_VERIFIED'.",
            "unexpected_output": "File didownload otomatis sebagai binary.",
            "interpretation": "Mengonfirmasi server mengeksekusi skrip pengguna secara langsung.",
            "evidence_to_record": ["Curl output /uploads/info.phtml"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server menolak seluruh file selain whitelist (.jpg, .png)."],
    "common_mistakes": ["Langsung mengunggah webshell destruktif sebelum memvalidasi eksekusi secara aman."],
    "ctf_notes": "Di CTF, upload filter sering kali dapat dilewati dengan Null Byte atau Double Extension.",
    "pentest_notes": "Dalam pentest resmi, selalu gunakan payload non-destruktif.",
    "unknown_guide": {
      "what_is_this": "Mekanisme formulir web yang memungkinkan client mentransfer file lokal ke server target.",
      "why_does_it_exist": "Fungsionalitas bisnis umum untuk upload dokumen atau avatar profil.",
      "what_parts_matter": "Ekstensi file, Content-Type, dan keterjangkauan file via URL.",
      "what_normal_looks_like": "Server hanya menerima tipe file yang relevan dan menyimpan di folder terisolasi.",
      "what_to_record_immediately": ["Request upload mentah", "Respon server dan URL file"]
    },
    "negative_result_guide": {
      "summary": "Form upload memvalidasi file secara ketat di server-side.",
      "why_not_secure": "Keamanan form upload tidak menjamin aplikasi kebal terhadap LFI via PHP wrapper.",
      "next_pivot_observations": ["obs-web-url-query-param", "obs-web-error-message"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "25",
        "slug": "file-upload",
        "title": "25. File Upload Vulnerability Workflow",
        "section_title": "1.1 File Upload Reconnaissance",
        "anchor": "11-file-upload-reconnaissance",
        "rationale": "Pelajari taksonomi lengkap bypass upload: MIME, Extension, Magic Bytes, dan Race Condition."
      }
    ],
    "related_observations": ["obs-web-url-query-param", "obs-web-form-input"],
    "provenance": ["OWASP WSTG-BUSL-08", "CWE-434"]
  },
  {
    "id": "obs-web-backup-config-file",
    "title": "File Backup & Konfigurasi Terekspos (Exposed Backup & Config Files)",
    "domain": "Information Disclosure",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "File berekstensi backup: .bak, .old, .swp, .save, ~",
      "File arsip terkompresi di web root: backup.zip, site.tar.gz, dump.sql",
      "Folder kontrol versi terekspos: /.git/, /.env, /web.config, /settings.py"
    ],
    "context": "Ditemukan saat melakukan directory fuzzing dengan ffuf / gobuster.",
    "why_it_matters": "Web server tidak memproses file .bak sebagai script melainkan menyajikannya sebagai plaintext, membongkar seluruh kode sumber backend dan password database.",
    "questions_to_ask": [
      "Apakah file dapat diunduh langsung tanpa otentikasi?",
      "Apakah file memuat kredensial database?"
    ],
    "inspection_points": [
      {
        "id": "backup-content-analysis",
        "name": "Analisis Konten File Sensitif",
        "why_check": "Mengekstrak rahasia infrastruktur untuk eskalasi.",
        "what_to_look_for": ["Password database plaintext", "API keys"],
        "normal_baseline": "File konfigurasi ditolak dengan HTTP 403/404.",
        "interesting_clues": ["File .env dapat diunduh dan memuat kredensial AWS atau database"],
        "evidence_to_capture": ["Tangkapan layar potongan isi file konfigurasi", "Header HTTP 200 OK"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-backup-env-exposed",
        "inspection_point_id": "backup-content-analysis",
        "signal_description": "File /.env berhasil diunduh dan memuat kredensial MySQL root dan APP_KEY.",
        "output_snippet": "$ curl http://target.com/.env\nDB_CONNECTION=mysql\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_DATABASE=production\nDB_USERNAME=root\nDB_PASSWORD=SuperSecurePass99!",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Aplikasi mengekspos environment variable ke publik (Critical Information Disclosure).",
        "hypothesis_id": "hyp-backup-cred-access",
        "evidence_to_capture": ["Output curl http://target.com/.env", "Status respon 200 OK"]
      }
    ],
    "unexpected_signals": ["File .git/HEAD terdeteksi dan mengembalikan teks: 'ref: refs/heads/main'"],
    "hypotheses": [
      {
        "id": "hyp-backup-cred-access",
        "name": "Credential Access via Exposed Environment Configuration",
        "description": "Kredensial database yang terekspos dapat digunakan untuk pivot ke database service.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-backup-env-exposed"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Uji apakah database menerima koneksi remote menggunakan kredensial tersebut.",
            "expected_output": "Mengetahui apakah kredensial aktif pada layanan target.",
            "interesting_output": "Berhasil login ke MySQL.",
            "unexpected_output": "Access denied.",
            "interpretation": "Membuktikan validitas kredensial yang bocor.",
            "evidence_to_record": ["Log percobaan koneksi"]
          }
        ]
      }
    ],
    "stop_conditions": ["Web server mengembalikan 403 Forbidden atau 404 Not Found pada seluruh ekstensi backup."],
    "common_mistakes": ["Mengabaikan file editor swap seperti .index.php.swp."],
    "ctf_notes": "Di CTF, gunakan tool git-dumper untuk merekonstruksi seluruh repo jika folder .git terbuka.",
    "pentest_notes": "Exposed .env atau backup database adalah temuan Critical.",
    "unknown_guide": {
      "what_is_this": "File cadangan atau konfigurasi sistem yang tidak sengaja diletakkan di folder publik web server.",
      "why_does_it_exist": "Ditinggalkan oleh developer saat mengedit file di server produksi.",
      "what_parts_matter": "Isi kode sumber, password database, dan API key.",
      "what_normal_looks_like": "File konfigurasi tidak pernah dapat diakses melalui browser web.",
      "what_to_record_immediately": ["URL file backup", "Daftar kredensial yang tertera di dalamnya"]
    },
    "negative_result_guide": {
      "summary": "Tidak ditemukan file backup di web root.",
      "why_not_secure": "Aplikasi mungkin masih memiliki endpoint API tersembunyi.",
      "next_pivot_observations": ["obs-web-admin-panel", "obs-web-api-endpoint"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "16",
        "slug": "directory-vhost-fuzzing",
        "title": "16. Directory & VHost Fuzzing Workflow",
        "section_title": "2.1 Backup Files Discovery",
        "anchor": "21-backup-files-discovery",
        "rationale": "Pelajari strategi wordlist fuzzing untuk menemukan file backup, ekstensi .swp, dan folder .git."
      }
    ],
    "related_observations": ["obs-web-admin-panel", "obs-priv-credential-history"],
    "provenance": ["OWASP WSTG-CONF-04", "MITRE ATT&CK T1552.001"]
  },
  {
    "id": "obs-web-admin-panel",
    "title": "Panel Administrasi Terdeteksi (Admin Panel / Management Portal)",
    "domain": "Administration & Access Control",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Path URL: /admin, /administrator, /manage, /controlpanel, /cpanel, /wp-admin",
      "Judul halaman: 'Admin Dashboard', 'Management Console'",
      "Form login terpisah dari login pengguna umum"
    ],
    "context": "Ditemukan via fuzzing direktori, link di footer, atau crawling halaman awal.",
    "why_it_matters": "Panel admin memegang kendali tertinggi atas fungsionalitas dan data aplikasi. Menemukan panel admin membuka pengujian kredensial default vendor, pembatasan IP (IP whitelisting), dan fitur administratif berbahaya yang berujung pada RCE.",
    "questions_to_ask": [
      "Apakah panel admin dapat diakses publik atau dibatasi oleh IP/VPN?",
      "Software atau CMS apa yang menjalankan panel ini?",
      "Apakah ada kredensial default bawaan vendor yang belum diubah?"
    ],
    "inspection_points": [
      {
        "id": "admin-ip-restriction",
        "name": "Audit Pembatasan Akses Jaringan (IP Whitelisting)",
        "why_check": "Memastikan antarmuka administratif tidak terekspos ke internet publik.",
        "what_to_look_for": ["Status code 200 OK dari sembarang IP publik vs 403 Forbidden"],
        "normal_baseline": "Akses ke panel admin hanya diizinkan dari subnet kantor atau IP VPN internal.",
        "interesting_clues": ["Panel admin terbuka penuh untuk koneksi internet publik tanpa perlambatan"],
        "evidence_to_capture": ["Tangkapan layar form login admin", "Alamat IP publik tester"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-admin-default-pass",
        "inspection_point_id": "admin-ip-restriction",
        "signal_description": "Kredensial bawaan admin:admin berhasil membuka konsol administrasi.",
        "output_snippet": "POST /admin/login HTTP/1.1\nuser=admin&pass=admin\n\nHTTP/1.1 302 Found\nLocation: /admin/dashboard\nSet-Cookie: admin_auth=true",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Administrator mengabaikan hardening konfigurasi awal (Default Administrative Credentials).",
        "hypothesis_id": "hyp-admin-takeover",
        "evidence_to_capture": ["Request POST login admin", "Screenshot dashboard pengelolaan sistem"]
      }
    ],
    "unexpected_signals": ["Panel admin menampilkan phpinfo() atau debug panel di halaman awal tanpa login"],
    "hypotheses": [
      {
        "id": "hyp-admin-takeover",
        "name": "Administrative Takeover via Default Credentials",
        "description": "Pengendalian sistem penuh diperoleh melalui kredensial administratif default pabrikan.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-admin-default-pass"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Periksa halaman pengaturan sistem untuk mencari fitur upload file atau backup database.",
            "expected_output": "Mengidentifikasi vektor eksploitasi lanjutan yang sah di panel admin.",
            "interesting_output": "Menemukan fitur upload template/plugin PHP.",
            "unexpected_output": "Akses logout paksa.",
            "interpretation": "Membuka attack path langsung menuju Remote Code Execution.",
            "evidence_to_record": ["Screenshot menu administratif"]
          }
        ]
      }
    ],
    "stop_conditions": ["Panel admin meminta 2FA perangkat keras atau menolak koneksi dari luar VPN internal."],
    "common_mistakes": ["Mencoba brute force ribuan password pada panel admin yang memiliki proteksi lockout aktif."],
    "ctf_notes": "Di CTF, begitu masuk ke panel admin (misal: WordPress), langkah berikutnya hampir selalu upload plugin PHP jahat.",
    "pentest_notes": "Exposed Admin Panel tanpa IP restriction adalah temuan Medium; jika dapat diakses dengan default creds, severity menjadi Critical.",
    "unknown_guide": {
      "what_is_this": "Halaman antarmuka khusus untuk administrator mengelola seluruh sistem web.",
      "why_does_it_exist": "Mempermudah staf IT mengatur pengguna dan database secara visual.",
      "what_parts_matter": "URL akses, perlindungan jaringan (IP restriction), dan kekuatan kredensial akun.",
      "what_normal_looks_like": "Hanya dapat dibuka dari jaringan internal perusahaan dan mewajibkan otentikasi MFA.",
      "what_to_record_immediately": ["URL panel admin", "Nama vendor software (jika CMS)"]
    },
    "negative_result_guide": {
      "summary": "Panel admin terproteksi dengan MFA dan kredensial kuat.",
      "why_not_secure": "Backend API yang mendukung panel admin mungkin tidak memvalidasi otorisasi jika diakses langsung.",
      "next_pivot_observations": ["obs-web-api-endpoint", "obs-web-cors-headers"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "18",
        "slug": "authentication-bypass",
        "title": "18. Authentication Bypass Workflow",
        "section_title": "3.1 Tabel Default Credentials",
        "anchor": "31-tabel-default-credentials",
        "rationale": "Daftar kredensial default berbagai perangkat keras, router, CMS, dan software server."
      }
    ],
    "related_observations": ["obs-web-login-page", "obs-web-backup-config-file"],
    "provenance": ["OWASP WSTG-CONF-05", "MITRE ATT&CK T1078.001"]
  },
  {
    "id": "obs-web-api-endpoint",
    "title": "Endpoint API REST / JSON Terdeteksi (API Endpoint Inspection)",
    "domain": "API Security",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "URL pola API: /api/v1/..., /rest/..., /graphql, /swagger.json, /v2/data",
      "Header respons HTTP: Content-Type: application/json",
      "Struktur data respon berupa objek atau array JSON: {\"status\": \"ok\", \"data\": [...]}"
    ],
    "context": "Teramati pada network tab DevTools browser saat aplikasi modern melakukan background data fetch (XHR/Fetch).",
    "why_it_matters": "API backend sering kali dirancang dengan asumsi bahwa pemanggilnya hanyalah aplikasi frontend mereka sendiri. Ini sering kali menyebabkan hilangnya validasi otorisasi di sisi backend (BOLA/IDOR) dan paparan data berlebih (Excessive Data Exposure).",
    "questions_to_ask": [
      "Bagaimana API mengotentikasi request (Bearer Token JWT atau cookie)?",
      "Apakah ada endpoint dokumentasi publik (Swagger / OpenAPI UI)?",
      "Apakah respon JSON memuat properti data sensitif yang tidak ditampilkan di antarmuka UI?"
    ],
    "inspection_points": [
      {
        "id": "api-excessive-data",
        "name": "Audit Paparan Data Berlebih (Excessive Data Exposure)",
        "why_check": "Melihat apakah backend mengirim seluruh objek database ke client dan hanya memfilter tampilan di JavaScript.",
        "what_to_look_for": ["Field tersembunyi di JSON: password_hash, ssn, role, internal_notes"],
        "normal_baseline": "API hanya mengembalikan atribut spesifik yang dibutuhkan oleh antarmuka pengguna saat ini.",
        "interesting_clues": ["Respon JSON untuk profil publik memuat hash password atau alamat email pribadi user lain"],
        "evidence_to_capture": ["Body response JSON mentah lengkap dari Burp Suite"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-api-excessive-data",
        "inspection_point_id": "api-excessive-data",
        "signal_description": "Respon endpoint /api/users/1 mengembalikan kolom password_hash dan role admin di payload JSON.",
        "output_snippet": "GET /api/users/1 HTTP/1.1\n\nHTTP/1.1 200 OK\n{\"id\": 1, \"name\": \"Admin\", \"password_hash\": \"$2y$12$e8F...\", \"role\": \"superadmin\"}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Aplikasi tidak menggunakan Data Transfer Object (DTO) dan membocorkan data sensitif langsung dari model database (OWASP API3: Excessive Data Exposure).",
        "hypothesis_id": "hyp-api-data-leak",
        "evidence_to_capture": ["Request & Response lengkap endpoint profil"]
      }
    ],
    "unexpected_signals": ["Mengirim Content-Type: application/xml menghasilkan eksekusi XML parser (XXE)"],
    "hypotheses": [
      {
        "id": "hyp-api-data-leak",
        "name": "Excessive Data Exposure & Mass Assignment on API",
        "description": "Paparan data sensitif di API memudahkan peretasan kredensial dan pemahaman skema database.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-api-excessive-data"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Analisis apakah field yang terekspos (misal: role) dapat dikirim balik melalui request PUT /api/users/1.",
            "expected_output": "Server menolak atau mengabaikan field role.",
            "interesting_output": "Role berhasil diperbarui di database.",
            "unexpected_output": "HTTP 405 Method Not Allowed.",
            "interpretation": "Membuktikan kombinasi Excessive Data Exposure dan Mass Assignment.",
            "evidence_to_record": ["Perubahan status profil sebelum dan sesudah PUT"]
          }
        ]
      }
    ],
    "stop_conditions": ["API hanya mengembalikan data publik minimal dan memvalidasi otorisasi di setiap request."],
    "common_mistakes": ["Hanya menguji metode GET dan lupa mencoba POST, PUT, DELETE, atau PATCH pada endpoint API."],
    "ctf_notes": "Di CTF, endpoint API sering kali tidak memiliki rate limiting sehingga brute force PIN dapat dilakukan sangat cepat.",
    "pentest_notes": "Dokumentasikan endpoint yang tidak terdaftar di dokumentasi resmi (Shadow APIs) sebagai finding manajemen aset.",
    "unknown_guide": {
      "what_is_this": "Antarmuka pertukaran data antar sistem yang menggunakan format terstruktur (biasanya JSON).",
      "why_does_it_exist": "Menghubungkan frontend web atau aplikasi mobile dengan server database pusat.",
      "what_parts_matter": "Token otentikasi di header dan struktur data JSON yang dikirim dan diterima.",
      "what_normal_looks_like": "Mengirim data yang terenkripsi dan memvalidasi izin pengguna secara ketat.",
      "what_to_record_immediately": ["URL endpoint API", "Header Authorization yang digunakan"]
    },
    "negative_result_guide": {
      "summary": "Endpoint API membatasi data respon dan memvalidasi otentikasi dengan benar.",
      "why_not_secure": "Versi lama v1 masih mungkin aktif di server tanpa otentikasi.",
      "next_pivot_observations": ["obs-web-id-parameter", "obs-web-jwt", "obs-web-cors-headers"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "30",
        "slug": "api-security",
        "title": "30. API Security Workflow",
        "section_title": "1.1 API Endpoint Discovery",
        "anchor": "11-api-endpoint-discovery",
        "rationale": "Pelajari teknik pemetaan API, pengujian BOLA/IDOR, BFLA, dan Mass Assignment."
      }
    ],
    "related_observations": ["obs-web-id-parameter", "obs-web-jwt"],
    "provenance": ["OWASP API Security Top 10", "RFC 7231"]
  },
  {
    "id": "obs-web-jwt",
    "title": "Token JWT Terdeteksi (JSON Web Token Found)",
    "domain": "Authentication & Session",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "String terbagi menjadi 3 bagian yang dipisahkan oleh karakter titik (header.payload.signature)",
      "Karakter awal tipikal Base64Url: eyJ...",
      "Ditemukan di header HTTP: Authorization: Bearer eyJhbGci..."
    ],
    "context": "Muncul pada Single Page Applications (SPA), autentikasi REST API modern, dan microservices.",
    "why_it_matters": "JWT adalah standar RFC 7519 untuk pertukaran klaim terotentikasi secara stateless. Kelemahan verifikasi tanda tangan kriptografis (algoritma 'none' atau weak HMAC secret) dapat memungkinkan penyerang memalsukan identitas dan hak akses admin.",
    "questions_to_ask": [
      "Algoritma apa yang dideklarasikan pada header JWT ('alg': 'HS256', 'RS256', 'none')?",
      "Klaim apa saja yang dibawa dalam payload (sub, role, admin)?",
      "Apakah server benar-benar memvalidasi signature pada setiap request?",
      "Apakah kunci simetris HS256 rentan terhadap dictionary attack offline?"
    ],
    "inspection_points": [
      {
        "id": "jwt-header-algorithm",
        "name": "1. Inspeksi Header & Algoritma Tanda Tangan",
        "why_check": "Melihat mekanisme kriptografi yang diharapkan server.",
        "what_to_look_for": ["Nilai klaim 'alg'", "Klaim 'kid'"],
        "normal_baseline": "Algoritma asimetris kuat (RS256) atau HS256 dengan secret key panjang acak.",
        "interesting_clues": ["Header 'alg' diset ke 'none'", "Klaim 'kid' memuat path traversal"],
        "evidence_to_capture": ["JSON decoded header mentah", "Nilai string JWT asli"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-jwt-none-accepted",
        "inspection_point_id": "jwt-header-algorithm",
        "signal_description": "Server menerima JWT dengan header 'alg': 'none' dan signature kosong.",
        "output_snippet": "GET /api/admin/metrics HTTP/1.1\nAuthorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.\n\nHTTP/1.1 200 OK\n{\"metrics\": \"secret_admin_data\"}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Backend parser JWT mengizinkan cipher none tanpa memverifikasi tanda tangan kriptografis.",
        "hypothesis_id": "hyp-jwt-none-bypass",
        "evidence_to_capture": ["Raw request dengan JWT unsigned", "Respon 200 OK administratif"]
      }
    ],
    "unexpected_signals": ["HTTP 500 JSON Parser Exception saat payload didekodekan"],
    "hypotheses": [
      {
        "id": "hyp-jwt-none-bypass",
        "name": "JWT None Algorithm Authentication Bypass",
        "description": "Penyerang dapat memodifikasi payload menjadi 'admin' dan menghapus signature untuk mendapatkan hak akses penuh.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-jwt-none-accepted"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Kirim request profil dengan token asli. Catat respon baseline. Ubah ke alg: none dan kirim ulang.",
            "expected_output": "Profil user normal.",
            "interesting_output": "Profil tetap terbaca normal atau berubah role saat alg: none digunakan.",
            "unexpected_output": "HTTP 401 Signature verification failed.",
            "interpretation": "Mengonfirmasi bypass tanda tangan token.",
            "evidence_to_record": ["Side-by-side burp repeater logs"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server menolak seluruh token dengan signature tidak valid (HTTP 401)."],
    "common_mistakes": ["Menganggap keberadaan JWT adalah kerentanan."],
    "ctf_notes": "Di CTF, token JWT sering rentan terhadap Algorithm Confusion (RS256 public key treated as HS256 secret).",
    "pentest_notes": "Secret key lemah pada JWT diklasifikasikan sebagai High Severity.",
    "unknown_guide": {
      "what_is_this": "Token string kompak dan aman-URL yang membawa klaim terstruktur antar pihak.",
      "why_does_it_exist": "Memungkinkan autentikasi tanpa harus menyimpan sesi di memori server.",
      "what_parts_matter": "Tiga komponen: Header (algoritma), Payload (data user), dan Signature (keaslian).",
      "what_normal_looks_like": "Token berumur pendek yang ditandatangani dengan kunci privat kuat.",
      "what_to_record_immediately": ["String lengkap token JWT", "Hasil decode Header dan Payload"]
    },
    "negative_result_guide": {
      "summary": "JWT ditandatangani dengan algoritma kuat dan divalidasi ketat.",
      "why_not_secure": "Validitas JWT tidak mencegah penyerang mengeksploitasi IDOR di endpoint API.",
      "next_pivot_observations": ["obs-web-id-parameter", "obs-web-api-endpoint"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "28",
        "slug": "jwt",
        "title": "28. JWT Security Workflow",
        "section_title": "1.1 JWT Structure Analysis",
        "anchor": "11-jwt-structure-analysis",
        "rationale": "Pelajari anatomi token, pembedahan header, dan teknik eksploitasi none-alg & brute force."
      }
    ],
    "related_observations": ["obs-web-session-cookie", "obs-web-api-endpoint"],
    "provenance": ["RFC 7519", "OWASP WSTG-SESS-10"]
  },
  {
    "id": "obs-web-oauth-sso",
    "title": "Alur Autentikasi OAuth 2.0 / SSO Terdeteksi (OAuth & SSO Flow)",
    "domain": "Federated Identity & OAuth",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Tombol login pihak ketiga: 'Login with Google', 'Sign in with GitHub', 'Microsoft SSO'",
      "Redirect URL menuju: https://auth.provider.com/oauth/authorize?client_id=...&redirect_uri=...",
      "Parameter OAuth di URL: client_id, redirect_uri, response_type=code, scope, state"
    ],
    "context": "Ditemukan pada portal SaaS modern atau login aplikasi multi-tenant.",
    "why_it_matters": "OAuth 2.0 mendelegasikan verifikasi identitas ke Identity Provider (IdP). Miskonfigurasi validasi redirect_uri memungkinkan penyerang mencuri Authorization Code korban. Ketiadaan atau prediktabilitas parameter state membuka celah CSRF Login (Account Linking CSRF).",
    "questions_to_ask": [
      "Apakah parameter state digunakan dan memiliki nilai acak berentropi tinggi?",
      "Bagaimana server IdP memvalidasi redirect_uri?",
      "Bagaimana Authorization Code dipertukarkan dengan token sesi di backend?"
    ],
    "inspection_points": [
      {
        "id": "oauth-redirect-validation",
        "name": "1. Audit Validasi Parameter redirect_uri",
        "why_check": "Memastikan kode otorisasi tidak dapat dibelokkan ke server penyerang.",
        "what_to_look_for": [
          "redirect_uri=https://target.com/callback -> ubah ke https://attacker.com",
          "redirect_uri=https://target.com/callback/../../attacker"
        ],
        "normal_baseline": "IdP menolak request dengan pesan 'redirect_uri mismatch' yang ketat.",
        "interesting_clues": [
          "IdP menerima redirect_uri ke domain sembarang atau wildcard subdomain",
          "IdP menerima path traversal yang mengarah ke Open Redirect di domain target"
        ],
        "evidence_to_capture": [
          "URL lengkap request otorisasi OAuth",
          "Respon server saat redirect_uri dimanipulasi"
        ]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-oauth-wildcard-redirect",
        "inspection_point_id": "oauth-redirect-validation",
        "signal_description": "IdP menerima manipulasi redirect_uri ke domain luar dan mengirimkan authorization code via 302 redirect.",
        "output_snippet": "GET /oauth/authorize?client_id=123&redirect_uri=https://attacker.com/cb&response_type=code HTTP/1.1\n\nHTTP/1.1 302 Found\nLocation: https://attacker.com/cb?code=SPLIT_TOKEN_AUTH_9981",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Miskonfigurasi validasi whitelist redirect_uri memungkinkan pencurian kode otorisasi untuk pengambilalihan akun korban (Account Takeover).",
        "hypothesis_id": "hyp-oauth-code-theft",
        "evidence_to_capture": ["Header respon 302 Found dengan kode otorisasi bocor"]
      }
    ],
    "unexpected_signals": ["IdP mengembalikan pesan error 'Invalid client secret' di sisi browser client"],
    "hypotheses": [
      {
        "id": "hyp-oauth-code-theft",
        "name": "OAuth Account Takeover via Redirect URI Manipulation",
        "description": "Membelokkan authorization code ke server penyerang untuk menukarkannya dengan session token korban.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-oauth-wildcard-redirect"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Uji apakah IdP menerima domain tester terkontrol (`https://burpcollaborator.net`).",
            "expected_output": "IdP menolak request dengan pesan error 'Redirect URI not registered'.",
            "interesting_output": "Collaborator menerima request HTTP memuat parameter code.",
            "unexpected_output": "Server crash.",
            "interpretation": "Mengonfirmasi kerentanan pencurian token otorisasi OAuth.",
            "evidence_to_record": ["Collaborator HTTP access log"]
          }
        ]
      }
    ],
    "stop_conditions": [
      "IdP menerapkan exact matching pada whitelist redirect_uri.",
      "Parameter state divalidasi ketat dan menolak request yang tidak memiliki token state valid."
    ],
    "common_mistakes": [
      "Mengira OAuth flow selalu rentan hanya karena tidak menggunakan PKCE."
    ],
    "ctf_notes": "Di CTF, OAuth challenge sering kali menggabungkan Open Redirect pada halaman internal dengan OAuth redirect_uri.",
    "pentest_notes": "OAuth Redirect URI Bypass adalah temuan High/Critical.",
    "unknown_guide": {
      "what_is_this": "Protokol standar industri untuk otorisasi yang memungkinkan pengguna login menggunakan akun pihak ketiga.",
      "why_does_it_exist": "Menghilangkan kebutuhan pengguna membuat dan mengingat password baru di setiap situs web.",
      "what_parts_matter": "Parameter client_id, redirect_uri, response_type, dan state.",
      "what_normal_looks_like": "Redirect URI dikunci ketat ke domain resmi dan parameter state acak digunakan.",
      "what_to_record_immediately": ["URL otorisasi lengkap beserta seluruh parameternya"]
    },
    "negative_result_guide": {
      "summary": "Alur OAuth menerapkan validasi redirect URI yang ketat dan state token yang aman.",
      "why_not_secure": "Aplikasi mungkin masih rentan pada endpoint callback internal saat menukar code dengan sesi lokal.",
      "next_pivot_observations": ["obs-web-session-cookie", "obs-web-jwt"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "34",
        "slug": "oauth-sso",
        "title": "34. OAuth & SSO Workflow",
        "section_title": "1.1 OAuth Flow Reconnaissance",
        "anchor": "11-oauth-flow-reconnaissance",
        "rationale": "Pelajari taksonomi OAuth 2.0 grant types, kelemahan redirect_uri, dan token interception."
      }
    ],
    "related_observations": ["obs-web-login-page", "obs-web-jwt"],
    "provenance": ["RFC 6749 (The OAuth 2.0 Authorization Framework)", "OWASP WSTG-ATHN-05"]
  },
  {
    "id": "obs-web-cors-headers",
    "title": "Header CORS Terdeteksi (Cross-Origin Resource Sharing Headers)",
    "domain": "Client-Side Security",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Header respons HTTP: Access-Control-Allow-Origin: * atau origin yang disuplai client",
      "Header respons HTTP: Access-Control-Allow-Credentials: true",
      "Header request HTTP: Origin: https://evil.com"
    ],
    "context": "Ditemukan pada endpoint API, portal data pengguna, atau backend microservices yang melayani frontend terpisah.",
    "why_it_matters": "Cross-Origin Resource Sharing (CORS) adalah mekanisme browser untuk melonggarkan aturan Same-Origin Policy (SOP). Miskonfigurasi kritis terjadi jika server merefleksikan header Origin dari client secara dinamis DAN menyetel `Access-Control-Allow-Credentials: true`. Ini memungkinkan situs jahat milik penyerang mengeksekusi request silang dan membaca data pribadi korban secara penuh.",
    "questions_to_ask": [
      "Bagaimana server merespons jika dikirim header 'Origin: https://attacker.com'?",
      "Apakah server merefleksikan domain tersebut di 'Access-Control-Allow-Origin'?",
      "Apakah header 'Access-Control-Allow-Credentials: true' aktif?",
      "Apakah nilai 'null' origin diterima (Origin: null)?"
    ],
    "inspection_points": [
      {
        "id": "cors-origin-reflection",
        "name": "1. Uji Refleksi Header Origin & Credentials",
        "why_check": "Mendeteksi apakah SOP browser dilumpuhkan untuk domain pihak ketiga.",
        "what_to_look_for": [
          "Kirim request dengan header `Origin: https://evil.com`",
          "Periksa apakah respon memuat `Access-Control-Allow-Origin: https://evil.com` dan `Access-Control-Allow-Credentials: true`"
        ],
        "normal_baseline": "Server menolak origin tidak dikenal atau tidak menyertakan header CORS sama sekali.",
        "interesting_clues": [
          "Server merefleksikan sembarang Origin domain yang dikirim client",
          "Server menerima 'Origin: null' (eksploitasi via iframe sandbox)"
        ],
        "evidence_to_capture": [
          "Header request dengan Origin manipulasi",
          "Header respons Access-Control-Allow-Origin dan Access-Control-Allow-Credentials"
        ]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-cors-vulnerable-reflection",
        "inspection_point_id": "cors-origin-reflection",
        "signal_description": "Server merefleksikan sembarang Origin domain bersamaan dengan flag Allow-Credentials: true.",
        "output_snippet": "GET /api/account/details HTTP/1.1\nOrigin: https://evil.com\nCookie: session=xyz9812\n\nHTTP/1.1 200 OK\nAccess-Control-Allow-Origin: https://evil.com\nAccess-Control-Allow-Credentials: true\n\n{\"email\": \"victim@corp.com\", \"balance\": 50000}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Miskonfigurasi CORS memungkinkan skrip JavaScript di website luar membaca data rahasia akun pengguna saat pengguna mengunjungi website tersebut.",
        "hypothesis_id": "hyp-cors-data-theft",
        "evidence_to_capture": ["Request curl dengan Origin luar dan respons CORS lengkap"]
      }
    ],
    "unexpected_signals": ["Server mengembalikan error 403 Forbidden saat header Origin tidak cocok"],
    "hypotheses": [
      {
        "id": "hyp-cors-data-theft",
        "name": "Cross-Origin Data Exfiltration via Misconfigured CORS",
        "description": "Penyerang dapat membuat halaman web jebakan yang membaca data profil korban di background dan mengirimkannya ke server penyerang.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-cors-vulnerable-reflection"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Buat file HTML PoC lokal yang melakukan fetch() ke endpoint target dengan `credentials: 'include'` dan periksa apakah data JSON terbaca di console.",
            "expected_output": "Browser memblokir pembacaan data jika CORS aman.",
            "interesting_output": "Data JSON berhasil dicetak di console browser lokal.",
            "unexpected_output": "Network error.",
            "interpretation": "Mengonfirmasi eksfiltrasi data lintas asal berhasil.",
            "evidence_to_record": ["Tangkapan layar console log data hasil fetch CORS PoC"]
          }
        ]
      }
    ],
    "stop_conditions": [
      "Server menolak origin sembarang dan hanya mengizinkan whitelist domain terpercaya yang ketat.",
      "Access-Control-Allow-Credentials tidak pernah diset true bersamaan dengan origin dinamis."
    ],
    "common_mistakes": [
      "Mengira `Access-Control-Allow-Origin: *` pada data publik (seperti font atau gambar) adalah kerentanan (ini normal dan aman jika tanpa credentials)."
    ],
    "ctf_notes": "Di CTF Web, CORS sering kali dikombinasikan dengan simulated admin bot untuk mencuri token API atau flag dari profil bot.",
    "pentest_notes": "CORS misconfiguration yang mengekspos data pribadi (PII) diklasifikasikan sebagai High Severity.",
    "unknown_guide": {
      "what_is_this": "Header HTTP yang memberi tahu browser apakah halaman web dari situs lain diizinkan membaca data dari server ini.",
      "why_does_it_exist": "Memungkinkan integrasi API yang sah antar domain yang berbeda milik perusahaan yang sama.",
      "what_parts_matter": "Access-Control-Allow-Origin dan Access-Control-Allow-Credentials.",
      "what_normal_looks_like": "Hanya mengizinkan domain asal yang sama atau subdomain terpercaya.",
      "what_to_record_immediately": ["Header Access-Control-* lengkap", "Origin uji coba yang digunakan"]
    },
    "negative_result_guide": {
      "summary": "Konfigurasi CORS menolak domain luar yang tidak sah.",
      "why_not_secure": "Aplikasi tetap dapat rentan terhadap CSRF jika mutasi data menggunakan form standar tanpa anti-CSRF token.",
      "next_pivot_observations": ["obs-web-form-input", "obs-web-api-endpoint"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "33",
        "slug": "cors",
        "title": "33. CORS Misconfiguration Workflow",
        "section_title": "1.1 CORS Header Inspection",
        "anchor": "11-cors-header-inspection",
        "rationale": "Pelajari eksploitasi Origin reflection, null origin trust, dan pembuatan script PoC eksfiltrasi."
      }
    ],
    "related_observations": ["obs-web-api-endpoint", "obs-web-session-cookie"],
    "provenance": ["W3C CORS Specification", "OWASP WSTG-CONF-07"]
  },
  {
    "id": "obs-web-technology-fingerprint",
    "title": "Sidik Jari Teknologi & Header Server Terdeteksi (Technology Fingerprint & Version Banner)",
    "domain": "Web Reconnaissance",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Header HTTP: Server: nginx/1.18.0, X-Powered-By: PHP/7.4.3, X-AspNet-Version: 4.0.30319",
      "Karakteristik path CMS: /wp-content/, /templates/rhuk_milkyway, /sites/default/files",
      "Output Wappalyzer / WhatWeb: WordPress 5.8, jQuery 3.5.1, Bootstrap 4"
    ],
    "context": "Fase awal pengintaian aplikasi web (Reconnaissance) pada setiap request HTTP.",
    "why_it_matters": "Mengenali arsitektur teknologi (PHP, ASP.NET, Java Spring, NodeJS, Python Flask) dan CMS yang digunakan mempersempit ribuan payload generic menjadi pengujian yang tepat sasaran. Contoh: jika target adalah ASP.NET IIS, tester fokus pada deserialization .NET dan bypass IIS, bukan LFI wrapper PHP. Mengidentifikasi teknologi BUKAN kerentanan; ini adalah kompas strategi.",
    "questions_to_ask": [
      "Web server apa yang melayani request (Nginx, Apache, IIS, Caddy)?",
      "Bahasa pemrograman backend apa yang digunakan (PHP, Python, Ruby, C#)?",
      "Apakah ada CMS pihak ketiga (WordPress, Drupal, Joomla, Ghost) yang terpasang?",
      "Apakah ada Web Application Firewall (WAF) seperti Cloudflare, AWS WAF, atau ModSecurity di depan target?"
    ],
    "inspection_points": [
      {
        "id": "fingerprint-headers",
        "name": "1. Ekstraksi Header Identifikasi Server & Runtime",
        "why_check": "Mendapatkan deklarasi teknologi langsung dari respon server.",
        "what_to_look_for": [
          "curl -I http://target.com",
          "Server, X-Powered-By, X-Generator, X-Drupal-Cache"
        ],
        "normal_baseline": "Header server generik tanpa rincian versi (misal: Server: webserver).",
        "interesting_clues": [
          "Header membocorkan versi lama (misal: X-Powered-By: PHP/5.3.3)",
          "Header WAF terdeteksi (CF-RAY, X-Sucuri-ID)"
        ],
        "evidence_to_capture": [
          "Output curl -I mentah lengkap"
        ]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-fingerprint-legacy-php",
        "inspection_point_id": "fingerprint-headers",
        "signal_description": "Header X-Powered-By membocorkan versi PHP yang sudah End-Of-Life (PHP 5.4.16).",
        "output_snippet": "HTTP/1.1 200 OK\nServer: Apache/2.4.6 (CentOS)\nX-Powered-By: PHP/5.4.16",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Sistem menjalankan lingkungan legacy yang berpotensi rentan terhadap null-byte injection pada manipulasi file (%00 LFI) atau PHP wrapper lawas.",
        "hypothesis_id": "hyp-fingerprint-legacy-vector",
        "evidence_to_capture": ["Header respons HTTP", "Status EOL versi software"]
      }
    ],
    "unexpected_signals": ["Server mengembalikan status 403 Forbidden saat User-Agent curl digunakan (indikasi proteksi WAF aktif)"],
    "hypotheses": [
      {
        "id": "hyp-fingerprint-legacy-vector",
        "name": "Targeted Attack Vector Selection Based on Tech Stack",
        "description": "Menyesuaikan payload pengujian dengan kelemahan spesifik arsitektur PHP/Apache CentOS lawas.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-fingerprint-legacy-php"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Jalankan scanner non-destruktif spesifik CMS (misal: `wpscan` jika WordPress atau `nikto` jika Apache) untuk mencari modul usang.",
            "expected_output": "Mendapatkan daftar plugin atau modul yang aktif.",
            "interesting_output": "Menemukan plugin dengan CVE unauthenticated RCE.",
            "unexpected_output": "IP di-throttle oleh firewall.",
            "interpretation": "Memetakan permukaan serangan software pihak ketiga.",
            "evidence_to_record": ["Output ringkasan wpscan"]
          }
        ]
      }
    ],
    "stop_conditions": [
      "Teknologi telah diidentifikasi dan tester siap memilih modul pengujian spesifik.",
      "Seluruh header telah disamarkan dan target merespons secara seragam."
    ],
    "common_mistakes": [
      "Mencoba payload PHP pada aplikasi yang jelas-jelas menggunakan backend NodeJS atau Python.",
      "Mengasumsikan versi yang tertera di header selalu akurat."
    ],
    "ctf_notes": "Di CTF, melihat bahasa backend langsung menentukan jenis deserialization, template injection (SSTI), atau command injection payload yang relevan.",
    "pentest_notes": "Version Disclosure pada banner server dicatat sebagai Low / Informational pada laporan resmi.",
    "unknown_guide": {
      "what_is_this": "Proses mengenali sistem operasi, web server, database, dan bahasa pemrograman yang digunakan aplikasi web.",
      "why_does_it_exist": "Setiap software meninggalkan karakteristik unik dalam cara mengirim header dan merender HTML.",
      "what_parts_matter": "Header Server, X-Powered-By, struktur direktori CMS, dan cookie session bawaan.",
      "what_normal_looks_like": "Server menyembunyikan nomor versi spesifik untuk memperlambat pengintaian penyerang.",
      "what_to_record_immediately": ["Seluruh header HTTP awal", "Nama software dan framework yang terdeteksi"]
    },
    "negative_result_guide": {
      "summary": "Server menyembunyikan banner dan tidak membocorkan versi teknologi.",
      "why_not_secure": "Penyembunyian banner (Security through Obscurity) tidak memperbaiki kerentanan di logika kode aplikasi.",
      "next_pivot_observations": ["obs-web-login-page", "obs-web-url-query-param", "obs-web-file-upload"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "15",
        "slug": "web-recon",
        "title": "15. Web Reconnaissance Workflow",
        "section_title": "1.2 Technology Fingerprinting",
        "anchor": "12-technology-fingerprinting",
        "rationale": "Pelajari tool WhatWeb, Wappalyzer, cURL banner grabbing, dan WAF detection."
      }
    ],
    "related_observations": ["obs-net-service-banner", "obs-web-login-page"],
    "provenance": ["OWASP WSTG-INFO-02 (Fingerprint Web Server)", "OWASP WSTG-INFO-08 (Fingerprint Web Application Framework)"]
  }
];

for (const n of batch2) {
  map.set(n.id, n);
}

fs.writeFileSync(WEB_JSON, JSON.stringify(Array.from(map.values()), null, 2), 'utf8');
console.log(`✅ Final web.json saved with ${map.size} nodes.`);
