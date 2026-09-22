import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OBS_DIR = path.resolve(__dirname, '../src/data/observations');

fs.mkdirSync(OBS_DIR, { recursive: true });

// 1. WEB OBSERVATIONS (18 NODES)
const webNodes = [
  {
    id: "obs-web-login-page",
    title: "Halaman Login Terdeteksi (Login Page Found)",
    domain: "Authentication",
    category: "Web",
    phase: "Phase 1 Seed",
    what_do_you_see": [
      "Form input Username / Email / ID",
      "Form input Password (type='password')",
      "Tombol submit (Login / Sign In / Masuk)",
      "Link navigasi Forgot Password / Register",
      "Opsi 'Remember Me' atau pemilihan Login Provider (SSO)"
    ],
    context: "Ditemukan selama web crawling, directory fuzzing (/login, /admin, /portal), atau saat mengakses root aplikasi yang memerlukan otentikasi.",
    why_it_matters: "Halaman login adalah pintu masuk utama otentikasi. Menginspeksi perilakunya membentuk baseline bagaimana sistem memproses kredensial, menangani kesalahan, mengatur sesi, dan membatasi percobaan (rate limiting). Jangan pernah langsung berasumsi ada vulnerability hanya karena halaman login ada.",
    questions_to_ask": [
      "Apakah mekanisme otentikasi berbasis form POST standar, HTTP Basic, JSON API, atau SSO/OAuth?",
      "Bagaimana respons server ketika username salah vs password salah?",
      "Apakah ada mekanisme rate limiting atau account lockout?",
      "Bagaimana sesi atau cookie dibuat sebelum dan sesudah submit form?",
      "Apakah ada token anti-CSRF atau proteksi CAPTCHA yang disertakan?"
    ],
    inspection_points": [
      {
        id: "login-form-mechanics",
        name: "Mekanisme & Atribut Form Submit",
        why_check: "Mengetahui endpoint penerima kredensial, method HTTP, enkripsi transit, dan token pendukung.",
        what_to_look_for": [
          "Action URL (apakah mengarah ke domain yang sama atau external auth provider?)",
          "HTTP Method (POST atau GET yang mengekspos password di URL?)",
          "Transmisi HTTPS vs HTTP plaintext",
          "Hidden input fields (CSRF token, client state, client role)"
        ],
        normal_baseline": "Form mengirim HTTP POST melalui HTTPS ke endpoint otentikasi server lokal dengan token CSRF valid.",
        interesting_clues": [
          "Form submit menggunakan HTTP GET sehingga password masuk ke log browser/server",
          "Hidden field memuat role atau nilai otorisasi (contoh: <input type='hidden' name='role' value='user'>)",
          "Form submit ke protokol HTTP tidak terenkripsi"
        ],
        evidence_to_capture": [
          "Tangkapan raw HTML tag <form action='...' method='...'>",
          "Daftar input hidden beserta value default",
          "URL endpoint dan protokol jaringan"
        ]
      },
      {
        id: "login-error-differential",
        name: "Analisis Respons Error (Username Enumeration Differential)",
        why_check: "Mendeteksi apakah aplikasi membocorkan validitas akun berdasarkan perbedaan pesan kesalahan atau waktu respon.",
        what_to_look_for": [
          "Pesan saat username acak / tidak terdaftar dikirim",
          "Pesan saat username valid (misal: admin, root, test) dikirim dengan password salah",
          "Perbedaan HTTP status code, panjang respon (content-length), atau waktu respon (response time)"
        ],
        normal_baseline": "Aplikasi mengembalikan pesan generik seragam ('Invalid username or password') dengan status code dan response length yang identik.",
        interesting_clues": [
          "Pesan berbeda: 'User does not exist' vs 'Incorrect password for user admin'",
          "HTTP status code berbeda (misal: 404 saat user tidak ada vs 401 saat password salah)",
          "Perbedaan waktu respon konsisten > 500ms karena hashing bcrypt hanya berjalan jika user ditemukan"
        ],
        evidence_to_capture": [
          "Raw request & response saat username invalid (lengkap dengan Content-Length & timing)",
          "Raw request & response saat username valid (password salah)",
          "Tabel perbandingan diff respons (body diff / status diff)"
        ]
      },
      {
        id: "login-session-behavior",
        name: "Perilaku Sesi Pre & Post Otentikasi",
        why_check": "Memastikan cookie sesi diperbarui saat login untuk mencegah Session Fixation.",
        what_to_look_for": [
          "Apakah Set-Cookie diberikan sebelum login?",
          "Apakah nilai cookie tersebut berubah atau di-regenerate setelah login berhasil?"
        ],
        normal_baseline": "Sesi pra-otentikasi dimusnahkan dan Set-Cookie baru dengan ID bernilai acak tinggi diberikan setelah otentikasi berhasil.",
        interesting_clues": [
          "Cookie sesi sama persis sebelum dan sesudah login (indikasi Session Fixation)",
          "Cookie sesi tidak memiliki flag HttpOnly atau Secure"
        ],
        evidence_to_capture": [
          "Header Set-Cookie pada request GET awal",
          "Header Set-Cookie pada request POST login sukses",
          "Perbandingan token sebelum dan sesudah otentikasi"
        ]
      },
      {
        id: "login-rate-limiting",
        name: "Observasi Rate Limiting & Proteksi Brute Force",
        why_check": "Melihat apakah sistem membatasi percobaan login berulang untuk mencegah password spraying.",
        what_to_look_for": [
          "Respon setelah 5-10 kali percobaan gagal berturut-turut",
          "Adanya CAPTCHA dinamis atau status HTTP 429 Too Many Requests"
        ],
        normal_baseline": "Sistem memblokir sementara, memunculkan CAPTCHA, atau mengembalikan HTTP 429 / delay progresif.",
        interesting_clues": [
          "Puluhan percobaan gagal diterima tanpa perlambatan, CAPTCHA, atau pemblokiran IP",
          "Lockout hanya mengunci username tertentu sehingga attacker dapat melakukan DoS akun"
        ],
        evidence_to_capture": [
          "Grafik atau log 10 request berturut-turut beserta response status & latency",
          "Pesan peringatan lockout atau header Retry-After jika ada"
        ]
      }
    ],
    interesting_signals": [
      {
        id: "sig-login-user-enum",
        inspection_point_id: "login-error-differential",
        signal_description": "Pesan error membedakan antara username salah dan password salah.",
        output_snippet": "HTTP/1.1 200 OK\n{\"status\": \"error\", \"message\": \"User 'admin' found but password does not match.\"}",
        observation_confidence": "CONFIRMED_OBSERVATION",
        interpretation": "Aplikasi memverifikasi keberadaan user di database sebelum mengevaluasi hash password, memungkinkan pemetaan akun valid.",
        hypothesis_id": "hyp-login-user-enum",
        evidence_to_capture": [
          "Request POST user valid & respons",
          "Request POST user dummy acak & respons",
          "Tangkapan burp compare body response"
        ]
      },
      {
        id: "sig-login-sql-error",
        inspection_point_id: "login-form-mechanics",
        signal_description": "Input karakter quote (') menghasilkan database syntax error di respon.",
        output_snippet": "HTTP/1.1 500 Internal Server Error\nFatal error: Uncaught mysqli_sql_exception: You have an error in your SQL syntax near '''",
        observation_confidence": "CONFIRMED_OBSERVATION",
        interpretation": "Input form login disematkan langsung ke query SQL tanpa parameter binding / prepared statement.",
        hypothesis_id": "hyp-login-sqli-bypass",
        evidence_to_capture": [
          "Request dengan payload ' or 1=1-- -",
          "Respons lengkap yang memuat string database exception",
          "Parameter yang menjadi titik injeksi"
        ]
      }
    ],
    unexpected_signals": [
      "Aplikasi crash (HTTP 502 Bad Gateway) saat menerima username panjang > 500 karakter",
      "Token CSRF statis tidak pernah berubah antar session yang berbeda"
    ],
    hypotheses": [
      {
        id: "hyp-login-user-enum",
        name": "Username Enumeration via Login Error Discrepancy",
        description": "Perilaku respon memungkinkan penyerang menyusun daftar username valid sebelum melakukan password spraying tertarget.",
        status": "CANDIDATE",
        supporting_signals": ["sig-login-user-enum"],
        safe_validation_steps": [
          {
            step_number: 1,
            action: "Kirim 3 username acak berentropi tinggi (misal: xz99q_nonexistent). Catat panjang respon dan pesan error.",
            expected_output": "Pesan error konsisten: 'User not found' atau Content-Length identik.",
            interesting_output": "Pesan error berbeda dari ketika mencoba username 'admin'.",
            unexpected_output": "WAF memblokir IP tester.",
            interpretation": "Mengonfirmasi hipotesis bahwa keberadaan user dapat diverifikasi secara deterministik.",
            evidence_to_record: ["3 Request & Response mentah dengan timestamp"]
          }
        ]
      },
      {
        id: "hyp-login-sqli-bypass",
        name": "SQL Injection Authentication Bypass",
        description": "Klausa WHERE pada query otentikasi dapat dimanipulasi dengan logika boolean TRUE untuk melewati verifikasi password.",
        status": "CANDIDATE",
        supporting_signals": ["sig-login-sql-error"],
        safe_validation_steps": [
          {
            step_number: 1,
            action: "Uji parameter username dengan payload non-destruktif: admin' AND '1'='1 vs admin' AND '1'='2.",
            expected_output": "Respon berbeda antara kondisi TRUE dan FALSE tanpa merusak data database.",
            interesting_output": "Kondisi TRUE menghasilkan login berhasil atau pesan 'wrong password', sedangkan FALSE menghasilkan 'user not found'.",
            unexpected_output": "HTTP 500 Database timeout.",
            interpretation": "Mengonfirmasi input terinterpolasi langsung ke query SQL engine.",
            evidence_to_record: ["Burp repeater raw logs untuk kedua request boolean"]
          }
        ]
      }
    ],
    stop_conditions": [
      "Aplikasi mengembalikan pesan generik 'Invalid credentials' secara seragam dengan waktu dan panjang respon konstan.",
      "IP tester terkunci atau memicu CAPTCHA Cloudflare / WAF setelah 3 percobaan.",
      "Tidak ada indikasi perubahan perilaku setelah mencoba 5 username umum dan 3 karakter escape."
    ],
    common_mistakes": [
      "Langsung menjalankan Hydra dengan 10.000 password sebelum memverifikasi apakah username memang valid.",
      "Menyimpulkan 'Vulnerable SQLi' hanya karena melihat status HTTP 500 tanpa menganalisis pesan exception.",
      "Mengabaikan mekanisme rate limiting yang mengakibatkan IP pengujian di-blacklist pada lingkungan lab/engagement."
    ],
    ctf_notes": "Dalam CTF, halaman login sering kali menyembunyikan kredensial di comment HTML (`<!-- test:test -->`), atau rentan terhadap SQLi bypass klasik (`' OR 1=1 -- -`), atau NoSQL injection (`username[$ne]=null`).",
    pentest_notes": "Dalam pentest korporat resmi, catat kelemahan penanganan username enumeration sebagai finding Medium/Low (OWASP WSTG-ATHN-02). Hindari lockout akun user nyata (client personnel); uji hanya pada akun uji coba khusus.",
    unknown_guide": {
      what_is_this: "Halaman antarmuka web yang meminta entitas pembuktian identitas (kredensial) sebelum memberikan hak akses ke fungsionalitas dalam aplikasi.",
      why_does_it_exist: "Menerapkan prinsip keamanan Identification & Authentication agar server dapat mengenali identitas subjek dan membatasi otorisasi objek.",
      what_parts_matter: "Metode HTTP (POST vs GET), atribut Action form, perlakuan cookie Set-Cookie, dan variasi pesan respons saat kredensial keliru.",
      what_normal_looks_like: "Form HTTPS mengirim POST dengan token CSRF. Input salah menghasilkan pesan netral dan tidak membocorkan keberadaan username.",
      what_to_record_immediately": [
        "URL lengkap halaman login",
        "Nama parameter form (misal: user, username, email, pwd, password)",
        "Contoh header request POST dan response mentah"
      ]
    },
    negative_result_guide: {
      summary: "Form login merespons secara aman dengan pesan seragam, rate limiting aktif, dan tidak ada kelemahan SQL syntax.",
      why_not_secure: "Respon form login yang aman tidak menjamin keamanan endpoint password reset, registrasi, atau REST API otentikasi di background.",
      next_pivot_observations": [
        "obs-web-password-reset",
        "obs-web-registration",
        "obs-web-session-cookie",
        "obs-web-url-query-param"
      ]
    },
    coverage: {
      observation_coverage: "COVERED",
      workflow_coverage: "COVERED",
      gap_details": null
    },
    relevant_workflows": [
      {
        workflow_id: "18",
        slug: "authentication-bypass",
        title: "18. Authentication Bypass Workflow",
        section_title: "1.1 Identifikasi Login Page",
        anchor: "11-identifikasi-login-page",
        rationale: "Pelajari metodologi lengkap asesmen otentikasi, fuzzing kredensial, dan bypass teknik."
      },
      {
        workflow_id: "18",
        slug: "authentication-bypass",
        title: "18. Authentication Bypass Workflow",
        section_title: "1.3 Username Enumeration Dulu",
        anchor: "13-username-enumeration-dulu",
        rationale: "Langkah taktis memetakan validitas akun sebelum melakukan brute force."
      }
    ],
    related_observations: [
      "obs-web-registration",
      "obs-web-password-reset",
      "obs-web-session-cookie",
      "obs-web-mfa-otp"
    ],
    provenance: [
      "OWASP WSTG-ATHN-01",
      "OWASP WSTG-ATHN-02",
      "MITRE ATT&CK T1078",
      "MITRE ATT&CK T1110"
    ]
  }
];

console.log("Writing web module...");
fs.writeFileSync(path.join(OBS_DIR, 'web.json'), JSON.stringify(webNodes, null, 2), 'utf8');
