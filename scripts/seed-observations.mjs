import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../src/data');
const TARGET_FILE = path.join(DATA_DIR, 'observations.json');

// Read existing first 7 nodes if present
let existingNodes = [];
if (fs.existsSync(TARGET_FILE)) {
  try {
    existingNodes = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'));
  } catch (e) {
    existingNodes = [];
  }
}

const existingMap = new Map(existingNodes.map(n => [n.id, n]));

// Define the full set of 37 nodes
const additionalNodes = [
  {
    id: "obs-web-cookie-attributes",
    title: "Atribut Cookie Keamanan Mendalam (HttpOnly, Secure, SameSite, Scope)",
    domain: "Session Management",
    category: "Web",
    phase: "Phase 1 Seed",
    what_do_you_see": [
      "Set-Cookie header memuat atau kekurangan flag: HttpOnly, Secure, SameSite",
      "Parameter Domain=.target.com (wildcard subdomain scope)",
      "Parameter Path=/ (aplikasi luas) vs Path=/app/admin"
    ],
    "context": "Diinspeksi pada setiap respon HTTP yang mengeluarkan cookie otentikasi atau preferensi.",
    "why_it_matters": "Atribut cookie adalah pertahanan lapis pertama terhadap pencurian sesi via Cross-Site Scripting (XSS), penyadapan lalu lintas jaringan (Man-in-the-Middle), dan serangan pemalsuan permintaan antar situs (CSRF).",
    "questions_to_ask": [
      "Apakah flag HttpOnly aktif untuk mencegah akses via document.cookie?",
      "Apakah flag Secure aktif agar cookie tidak pernah dikirim via koneksi HTTP plaintext?",
      "Apakah SameSite diset ke Strict atau Lax untuk memitigasi CSRF?",
      "Apakah Domain scope terlalu longgar sehingga dapat dibaca oleh subdomain yang rentan?"
    ],
    "inspection_points": [
      {
        "id": "point-cookie-flags",
        "name": "Audit Flag Proteksi (HttpOnly & Secure)",
        "why_check": "Mencegah pencurian kredensial sesi oleh skrip berbahaya dan sniffing jaringan.",
        "what_to_look_for": ["HttpOnly", "Secure"],
        "normal_baseline": "Kedua flag selalu disematkan pada seluruh cookie sesi otentikasi.",
        "interesting_clues": ["Flag HttpOnly hilang pada cookie sesi sensitif", "Flag Secure hilang pada situs HTTPS"],
        "evidence_to_capture": ["Header Set-Cookie mentah", "Console output document.cookie"]
      },
      {
        "id": "point-cookie-samesite",
        "name": "Audit SameSite & Scope Boundary",
        "why_check": "Menentukan apakah browser akan menyertakan cookie pada request cross-site (CSRF vector).",
        "what_to_look_for": ["SameSite=Strict", "SameSite=Lax", "SameSite=None", "Domain wildcard"],
        "normal_baseline": "SameSite=Lax atau Strict pada seluruh form dengan mutasi data state.",
        "interesting_clues": ["SameSite=None tanpa flag Secure", "SameSite tidak didefinisikan sama sekali pada browser legacy"],
        "evidence_to_capture": ["Atribut SameSite pada Set-Cookie", "PoC request cross-origin"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-cookie-no-flags",
        "inspection_point_id": "point-cookie-flags",
        "signal_description": "Cookie otentikasi dikirim tanpa HttpOnly dan Secure di lingkungan HTTPS.",
        "output_snippet": "Set-Cookie: auth=a8f7c9e2b1; Path=/; Domain=example.com",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Cookie rentan dibaca via XSS dan bocor jika ada link HTTP yang tidak sengaja dibuka.",
        "hypothesis_id": "hyp-cookie-flag-leak",
        "evidence_to_capture": ["Header respons lengkap", "URL halaman yang mengeluarkan cookie"]
      }
    ],
    "unexpected_signals": ["Cookie memiliki atribut Max-Age negatif atau tanggal kadaluwarsa tahun 1970 (penghapusan cookie)"],
    "hypotheses": [
      {
        "id": "hyp-cookie-flag-leak",
        "name": "Session Exposure via Missing Cookie Security Flags",
        "description": "Ketiadaan flag proteksi memperbesar dampak kerentanan XSS dan network sniffing.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-cookie-no-flags"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Verifikasi keterbacaan cookie dari console JavaScript: `console.log(document.cookie)`.",
            "expected_output": "Cookie sesi tidak tampil jika terlindungi HttpOnly.",
            "interesting_output": "Token otentikasi muncul dalam string.",
            "unexpected_output": "Peringatan CSP.",
            "interpretation": "Mengonfirmasi aksesibilitas client-side script.",
            "evidence_to_record": ["Screenshot console log"]
          }
        ]
      }
    ],
    "stop_conditions": ["Flag HttpOnly, Secure, dan SameSite=Lax/Strict terpasang lengkap."],
    "common_mistakes": ["Menganggap missing flag sebagai kerentanan kritis mandiri tanpa adanya XSS atau man-in-the-middle."],
    "ctf_notes": "Di CTF XSS challenge, jika HttpOnly tidak ada, tujuannya hampir pasti mencuri cookie admin bot.",
    "pentest_notes": "Di laporan pentest resmi, catat sebagai Informational atau Low Severity sesuai standar OWASP.",
    "unknown_guide": {
      "what_is_this": "Atribut tambahan di belakang Set-Cookie yang mengatur hak akses browser terhadap cookie tersebut.",
      "why_does_it_exist": "Memberikan kontrol keamanan kepada web developer atas perilaku browser menyimpan dan mengirim cookie.",
      "what_parts_matter": "HttpOnly, Secure, SameSite, Domain, dan Path.",
      "what_normal_looks_like": "Set-Cookie: sess=...; Path=/; Secure; HttpOnly; SameSite=Lax",
      "what_to_record_immediately": ["Seluruh baris Set-Cookie dari header response"]
    },
    "negative_result_guide": {
      "summary": "Seluruh atribut keamanan cookie dikonfigurasi dengan benar.",
      "why_not_secure": "Aplikasi tetap dapat rentan terhadap SQLi atau IDOR di endpoint backend.",
      "next_pivot_observations": ["obs-web-id-parameter", "obs-web-url-query-param"]
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
        "section_title": "11.3 Cookie Security Analysis",
        "anchor": "113-cookie-security-analysis",
        "rationale": "Audit menyeluruh atribut cookie dan dampaknya terhadap sesi pengguna."
      }
    ],
    "related_observations": ["obs-web-session-cookie", "obs-web-login-page"],
    "provenance": ["RFC 6265bis", "OWASP WSTG-SESS-02"]
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
    "why_it_matters": "Parameter URL adalah input langsung dari pengguna ke server. Menjadi titik masuk utama untuk Local File Inclusion (LFI), Server-Side Request Forgery (SSRF), SQL Injection, Cross-Site Scripting (XSS), dan Open Redirect. Adanya parameter query adalah pola arsitektur normal.",
    "questions_to_ask": [
      "Bagaimana server menggunakan nilai parameter (apakah dimuat ke database, direfleksikan ke HTML, atau diakses dari filesystem)?",
      "Apakah nilai parameter menyerupai path file, nama file, URL eksternal, atau template?",
      "Bagaimana respons server jika nilai parameter dikosongkan atau diisi karakter escape (' \" < > `)?",
      "Apakah ada perbedaan panjang respon atau status code?"
    ],
    "inspection_points": [
      {
        "id": "point-param-purpose",
        "name": "Analisis Tujuan Parameter (File, URL, Database, Refleksi)",
        "why_check": "Menentukan vektor pengujian yang relevan berdasarkan semantik nama dan nilai parameter.",
        "what_to_look_for": [
          "Parameter file/path: ?file=, ?page=, ?include=, ?doc=",
          "Parameter URL/link: ?url=, ?redirect=, ?next=, ?dest=, ?target=",
          "Parameter database: ?cat=, ?id=, ?sort=, ?order="
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
    "unexpected_signals": ["HTTP 500 saat parameter diisi karakter khusus (indikasi parsing error backend)"],
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
            "action": "Kirim payload karakter aman: `test<b>bold</b>123` dan periksa apakah tag `<b>` dirender atau di-encode menjadi `&lt;b&gt;`.",
            "expected_output": "Server meng-encode karakter HTML menjadi entitas teks aman.",
            "interesting_output": "Teks 'bold' dirender tebal oleh browser (HTML injection terkonfirmasi).",
            "unexpected_output": "WAF blocking.",
            "interpretation": "Mengonfirmasi apakah konteks HTML mengizinkan injeksi tag.",
            "evidence_to_record": ["Source view HTML dari respons"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server meng-encode seluruh karakter khusus menjadi HTML entities dan parameter divalidasi dengan whitelist."],
    "common_mistakes": ["Langsung menembakkan payload alert(1) tanpa memeriksa konteks refleksi (apakah di dalam tag, atribut, atau script block)."],
    "ctf_notes": "Di CTF, parameter ?page=index hampir selalu merupakan LFI ke file flag (`?page=../../../../flag`).",
    "pentest_notes": "Di pentest resmi, pastikan mendokumentasikan dampak XSS terhadap pencurian cookie atau manipulasi DOM.",
    "unknown_guide": {
      "what_is_this": "Bagian URL setelah tanda tanya (?) yang mengirimkan variabel input ke server web.",
      "why_does_it_exist": "Meneruskan data navigasi, query pencarian, dan preferensi tampilan antar request.",
      "what_parts_matter": "Nama variabel parameter dan bagaimana server memproses nilainya.",
      "what_normal_looks_like": "Parameter memproses input standar tanpa mengubah struktur halaman secara berbahaya.",
      "what_to_record_immediately": ["URL lengkap", "Nama parameter", "Respon saat nilai diubah"]
    },
    "negative_result_guide": {
      "summary": "Parameter query disanitasi dan di-encode dengan aman.",
      "why_not_secure": "Aplikasi mungkin masih memiliki parameter tersembunyi yang belum ditemukan (hidden parameters).",
      "next_pivot_observations": ["obs-web-search-field", "obs-web-form-input", "obs-web-id-parameter"]
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
      },
      {
        "workflow_id": "20",
        "slug": "xss",
        "title": "20. XSS Workflow",
        "section_title": "1.1 Identifikasi Input Refleksi",
        "anchor": "11-identifikasi-input-refleksi",
        "rationale": "Audit refleksi input pengguna dan teknik bypass filter XSS."
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
      "Tombol 'Search' atau icon kaca pembesar",
      "Halaman menampilkan hasil pencarian dengan teks refleksi: 'Hasil untuk: ...'"
    ],
    "context": "Ditemukan pada portal berita, e-commerce, blog CMS, dan dashboard aplikasi.",
    "why_it_matters": "Field pencarian umumnya terhubung langsung ke query backend (SQL LIKE '%...%', Elasticsearch, LDAP, atau template engine). Selain itu, query hampir selalu direfleksikan kembali ke halaman web, menjadikannya vektor utama pengujian SQLi, XSS, dan SSTI.",
    "questions_to_ask": [
      "Di mana nilai pencarian ditampilkan kembali pada halaman (HTML body, input value atribut, script tag)?",
      "Bagaimana aplikasi menangani karakter wildcard SQL (% dan _)?",
      "Bagaimana jika ekspresi matematika dimasukkan (misal: {{7*7}} atau ${7*7})?",
      "Apakah ada perbedaan jika query tidak ditemukan vs query kosong?"
    ],
    "inspection_points": [
      {
        "id": "point-search-reflection",
        "name": "Audit Refleksi Teks Hasil Pencarian",
        "why_check": "Melihat apakah query pengguna di-encode saat dicetak ulang di HTML.",
        "what_to_look_for": ["<div>Hasil pencarian untuk: [INPUT]</div>", "<input value='[INPUT]'>"],
        "normal_baseline": "Query ditampilkan dengan HTML encoding penuh (misal: &lt;tag&gt;).",
        "interesting_clues": ["Tag HTML disisipkan mentah ke dalam halaman", "Input disisipkan ke dalam string JavaScript inline"],
        "evidence_to_capture": ["Tangkapan source view browser pada baris refleksi query"]
      },
      {
        "id": "point-search-template-eval",
        "name": "Pemeriksaan Evaluasi Template (SSTI Check)",
        "why_check": "Mendeteksi apakah engine pencarian menggunakan template engine (Jinja2, Twig, Smarty).",
        "what_to_look_for": ["Input: {{7*7}}", "Input: ${7*7}", "Input: <%= 7*7 %>"],
        "normal_baseline": "Teks {{7*7}} dicetak persis secara literal sebagai teks biasa.",
        "interesting_clues": ["Halaman menampilkan angka '49' di tempat teks query (SSTI terkonfirmasi!)"],
        "evidence_to_capture": ["Request dengan payload ekspresi matematika", "Response yang menampilkan hasil evaluasi angka 49"]
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
    "unexpected_signals": ["Database error 'Unclosed quotation mark before the character string' saat query memuat kutip (')"],
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
    "common_mistakes": ["Menganggap semua angka 49 adalah SSTI tanpa memverifikasi apakah input 7*7 memang dievaluasi matematis."],
    "ctf_notes": "SSTI pada Flask/Jinja2 adalah salah satu challenge paling populer di CTF Web modern.",
    "pentest_notes": "SSTI umumnya bernilai Critical karena jalur eksploitasinya hampir selalu berujung pada RCE.",
    "unknown_guide": {
      "what_is_this": "Kolom input teks di aplikasi web yang memungkinkan pencarian konten.",
      "why_does_it_exist": "Fitur navigasi standar untuk memudahkan pengguna menemukan informasi.",
      "what_parts_matter": "Bagaimana input disaring sebelum dikirim ke database atau template engine.",
      "what_normal_looks_like": "Pencarian menampilkan konten yang cocok tanpa mengeksekusi kode.",
      "what_to_record_immediately": ["Nama parameter pencarian", "Respon saat diuji karakter kutip dan kurung kurawal"]
    },
    "negative_result_guide": {
      "summary": "Field pencarian aman dari injeksi template dan SQL injection.",
      "why_not_secure": "Fitur filter kategori atau pagination di bawah hasil pencarian mungkin memiliki parameter rentan.",
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
      },
      {
        "workflow_id": "20",
        "slug": "xss",
        "title": "20. XSS Workflow",
        "section_title": "1.1 Identifikasi Input Refleksi",
        "anchor": "11-identifikasi-input-refleksi",
        "rationale": "Pengujian XSS pada konteks field pencarian."
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
      "Field form yang dinonaktifkan (disabled / readonly) di sisi browser",
      "Parameter harga, role, status pembayaran, atau user ID di dalam form submit"
    ],
    "context": "Ditemukan saat menginspeksi halaman checkout belanja, edit profile, atau formulir pendaftaran akun.",
    "why_it_matters": "Pengembang sering kali salah berasumsi bahwa input yang tidak terlihat oleh pengguna (hidden field) atau dinonaktifkan oleh CSS/JavaScript tidak dapat diubah. Penyerang dapat memodifikasi nilai hidden input via proxy untuk melakukan Mass Assignment, Price Tampering, atau Privilege Escalation.",
    "questions_to_ask": [
      "Apa fungsi dari masing-masing hidden input field?",
      "Apakah ada parameter sensitif seperti 'role', 'is_admin', 'price', atau 'discount'?",
      "Apakah server memvalidasi integritas data hidden field di backend atau mempercayai nilai dari client?",
      "Apakah form menyertakan token proteksi CSRF?"
    ],
    "inspection_points": [
      {
        "id": "point-hidden-fields",
        "name": "Audit Field Tersembunyi (Hidden Inputs Audit)",
        "why_check": "Menemukan parameter bisnis sensitif yang dikirim secara tidak aman melalui client.",
        "what_to_look_for": [
          "<input type='hidden' name='role' value='user'>",
          "<input type='hidden' name='price' value='99.99'>",
          "<input type='hidden' name='userId' value='1001'>"
        ],
        "normal_baseline": "Hidden field hanya digunakan untuk state navigasi aman atau token anti-CSRF acak.",
        "interesting_clues": [
          "Parameter role atau otorisasi dapat diedit langsung",
          "Parameter harga atau diskon dapat dimanipulasi ke nilai negatif atau 0.01"
        ],
        "evidence_to_capture": ["Tangkapan layar inspect element HTML form", "Request POST mentah di Burp Suite"]
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
    "unexpected_signals": ["Server mengembalikan error 'HMAC validation failed' saat hidden field diubah (tanda proteksi data integrity aktif)"],
    "hypotheses": [
      {
        "id": "hyp-form-logic-tampering",
        "name": "Business Logic Parameter Tampering",
        "description": "Manipulasi parameter bisnis di form client mengarah pada manipulasi status transaksi atau role akun.",
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
    "stop_conditions": ["Server menolak nilai yang diubah dan menghitung harga secara eksklusif di backend database."],
    "common_mistakes": ["Mengira field disabled di HTML aman dari manipulasi (client-side restriction selalu dapat dilewati)."],
    "ctf_notes": "Di CTF, inspeksi source code HTML sering kali menemukan hidden field dengan komentar author atau flag parsial.",
    "pentest_notes": "Di pentest resmi, Business Logic Flaw seperti Price Tampering adalah temuan High Severity dengan dampak finansial langsung.",
    "unknown_guide": {
      "what_is_this": "Elemen form HTML yang tidak terlihat di layar pengguna namun tetap dikirim saat form disubmit.",
      "why_does_it_exist": "Menyimpan variabel state seperti session id, token CSRF, atau ID barang antar halaman.",
      "what_parts_matter": "Nama variabel dan apakah nilainya berisi data penting yang tidak boleh diubah pengguna.",
      "what_normal_looks_like": "Hanya membawa token CSRF atau nilai referensi yang divalidasi ketat di server.",
      "what_to_record_immediately": ["Kode HTML tag form lengkap", "Daftar input hidden beserta valuenya"]
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
      },
      {
        "workflow_id": "27",
        "slug": "idor-access-control",
        "title": "27. IDOR & Access Control Workflow",
        "section_title": "1.1 IDOR Identification",
        "anchor": "11-idor-identification",
        "rationale": "Manipulasi parameter user_id dan role di form."
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
      "Pesan database exception: MySQL, PostgreSQL, MSSQL, Oracle, SQLite syntax error",
      "Path direktori absolut server: /var/www/html/app/controllers/user.php line 42 atau C:\\inetpub\\wwwroot\\...",
      "Versi framework/bahasa tertera jelas: Django debug page, Laravel Whoops, Spring Boot Whitelabel"
    ],
    "context": "Muncul saat mengirimkan input tak terduga, karakter kutip ganda, array kosong, atau format tipe data salah.",
    "why_it_matters": "Verbose error message adalah kebocoran informasi berharga (Information Disclosure). Pesan ini membongkar struktur internal aplikasi, nama tabel/kolom database, path direktori absolut untuk LFI, dan versi spesifik dependensi yang memudahkan penemuan CVE publik. Error BUKAN eksploitasi, melainkan kompas penunjuk titik lemah.",
    "questions_to_ask": [
      "Teknologi apa yang disebutkan dalam pesan error (nama database, framework, versi bahasa)?",
      "Apakah path file lokal (/var/www/...) terungkap?",
      "Apakah potongan query SQL asli tercetak di halaman?",
      "Input apa yang secara khusus memicu kondisi error tersebut?"
    ],
    "inspection_points": [
      {
        "id": "point-error-tech-leak",
        "name": "Ekstraksi Komponen Teknologi & Path",
        "why_check": "Mendapatkan informasi lingkungan backend tanpa menebak.",
        "what_to_look_for": [
          "Nama database (MySQL, PostgreSQL, etc.)",
          "Path direktori web root (membantu eksploitasi LFI atau write webshell)",
          "Nama function atau file internal controller"
        ],
        "normal_baseline": "Aplikasi menampilkan halaman error kustom yang rapi tanpa rincian teknis (misal: 'Terjadi kesalahan pada sistem. Silakan coba lagi.').",
        "interesting_clues": [
          "Potongan query SQL lengkap terlihat: SELECT * FROM users WHERE id = '...'",
          "Framework debug mode aktif (misal: Laravel Whoops atau Django Debug = True yang memuat environment variables)"
        ],
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
      },
      {
        "id": "sig-error-debug-env",
        "inspection_point_id": "point-error-tech-leak",
        "signal_description": "Halaman debug framework (misal: Django/Laravel) memuat environment variables (DB_PASSWORD, APP_KEY).",
        "output_snippet": "Environment Variables:\nAPP_KEY=base64:7K...DB_PASSWORD=SuperSecretPass123",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Mode debug produksi aktif, membocorkan kredensial kritis dan encryption key.",
        "hypothesis_id": "hyp-error-env-leak",
        "evidence_to_capture": ["Tangkapan layar bagian environment variables (sensor kredensial di laporan)"]
      }
    ],
    "unexpected_signals": ["Server mengembalikan error 'Out of Memory' saat menerima payload berulang"],
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
            "action": "Kirim payload konversi tipe data aman (misal: CAST('1' AS INT) atau sintaks non-destruktif) untuk memverifikasi eksekusi SQL.",
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
    "common_mistakes": ["Mengira semua status HTTP 500 adalah SQL injection (banyak error 500 hanya merupakan null-pointer exception murni)."],
    "ctf_notes": "Di CTF, Django debug mode atau Werkzeug debugger console aktif sering kali memiliki fitur interactive console yang dapat dieksekusi menjadi RCE via pin.",
    "pentest_notes": "Information Disclosure via Stack Trace dicatat sebagai Low/Medium tergantung ada tidaknya kredensial sensitif di environment variables.",
    "unknown_guide": {
      "what_is_this": "Pesan kesalahan teknis dari server ketika terjadi kegagalan eksekusi kode internal.",
      "why_does_it_exist": "Membantu programmer menemukan letak bug saat tahap pengembangan (development).",
      "what_parts_matter": "Nama file, baris kode, nama database, dan informasi rahasia yang mungkin ikut tercetak.",
      "what_normal_looks_like": "Halaman error yang ramah pengguna tanpa rincian baris kode atau stack trace.",
      "what_to_record_immediately": ["Teks pesan error lengkap", "Input yang memicu munculnya pesan tersebut"]
    },
    "negative_result_guide": {
      "summary": "Server menangani exception dengan aman dan menyembunyikan stack trace.",
      "why_not_secure": "Penanganan error yang rapi tidak menjamin aplikasi kebal dari Time-Based Blind SQLi atau Boolean Blind SQLi.",
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
  }
];

// Add the additional nodes into our collection
for (const node of additionalNodes) {
  existingMap.set(node.id, node);
}

// Write the compiled dataset
const finalArray = Array.from(existingMap.values());
fs.writeFileSync(TARGET_FILE, JSON.stringify(finalArray, null, 2), 'utf8');
console.log(`✅ observations.json now contains ${finalArray.length} nodes.`);
