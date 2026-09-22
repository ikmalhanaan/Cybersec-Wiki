import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OBS_DIR = path.resolve(__dirname, '../src/data/observations');

// Collect all 19 web nodes
const webNodes = [
  // 1. obs-web-login-page
  {
    "id": "obs-web-login-page",
    "title": "Halaman Login Terdeteksi (Login Page Found)",
    "domain": "Authentication",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Form input Username / Email / ID",
      "Form input Password (type='password')",
      "Tombol submit (Login / Sign In / Masuk)",
      "Link navigasi Forgot Password / Register",
      "Opsi 'Remember Me' atau pemilihan Login Provider (SSO)"
    ],
    "context": "Ditemukan selama web crawling, directory fuzzing (/login, /admin, /portal), atau saat mengakses root aplikasi yang memerlukan otentikasi.",
    "why_it_matters": "Halaman login adalah pintu masuk utama otentikasi. Menginspeksi perilakunya membentuk baseline bagaimana sistem memproses kredensial, menangani kesalahan, mengatur sesi, dan membatasi percobaan (rate limiting). Jangan pernah langsung berasumsi ada vulnerability hanya karena halaman login ada.",
    "questions_to_ask": [
      "Apakah mekanisme otentikasi berbasis form POST standar, HTTP Basic, JSON API, atau SSO/OAuth?",
      "Bagaimana respons server ketika username salah vs password salah?",
      "Apakah ada mekanisme rate limiting atau account lockout?",
      "Bagaimana sesi atau cookie dibuat sebelum dan sesudah submit form?",
      "Apakah ada token anti-CSRF atau proteksi CAPTCHA yang disertakan?"
    ],
    "inspection_points": [
      {
        "id": "login-form-mechanics",
        "name": "Mekanisme & Atribut Form Submit",
        "why_check": "Mengetahui endpoint penerima kredensial, method HTTP, enkripsi transit, dan token pendukung.",
        "what_to_look_for": [
          "Action URL (apakah mengarah ke domain yang sama atau external auth provider?)",
          "HTTP Method (POST atau GET yang mengekspos password di URL?)",
          "Transmisi HTTPS vs HTTP plaintext",
          "Hidden input fields (CSRF token, client state, client role)"
        ],
        "normal_baseline": "Form mengirim HTTP POST melalui HTTPS ke endpoint otentikasi server lokal dengan token CSRF valid.",
        "interesting_clues": [
          "Form submit menggunakan HTTP GET sehingga password masuk ke log browser/server",
          "Hidden field memuat role atau nilai otorisasi (contoh: <input type='hidden' name='role' value='user'>)",
          "Form submit ke protokol HTTP tidak terenkripsi"
        ],
        "evidence_to_capture": [
          "Tangkapan raw HTML tag <form action='...' method='...'>",
          "Daftar input hidden beserta value default",
          "URL endpoint dan protokol jaringan"
        ]
      },
      {
        "id": "login-error-differential",
        "name": "Analisis Respons Error (Username Enumeration Differential)",
        "why_check": "Mendeteksi apakah aplikasi membocorkan validitas akun berdasarkan perbedaan pesan kesalahan atau waktu respon.",
        "what_to_look_for": [
          "Pesan saat username acak / tidak terdaftar dikirim",
          "Pesan saat username valid (misal: admin, root, test) dikirim dengan password salah",
          "Perbedaan HTTP status code, panjang respon (content-length), atau waktu respon (response time)"
        ],
        "normal_baseline": "Aplikasi mengembalikan pesan generik seragam ('Invalid username or password') dengan status code dan response length yang identik.",
        "interesting_clues": [
          "Pesan berbeda: 'User does not exist' vs 'Incorrect password for user admin'",
          "HTTP status code berbeda (misal: 404 saat user tidak ada vs 401 saat password salah)",
          "Perbedaan waktu respon konsisten > 500ms karena hashing bcrypt hanya berjalan jika user ditemukan"
        ],
        "evidence_to_capture": [
          "Raw request & response saat username invalid (lengkap dengan Content-Length & timing)",
          "Raw request & response saat username valid (password salah)",
          "Tabel perbandingan diff respons (body diff / status diff)"
        ]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-login-user-enum",
        "inspection_point_id": "login-error-differential",
        "signal_description": "Pesan error membedakan antara username salah dan password salah.",
        "output_snippet": "HTTP/1.1 200 OK\n{\"status\": \"error\", \"message\": \"User 'admin' found but password does not match.\"}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Aplikasi memverifikasi keberadaan user di database sebelum mengevaluasi hash password, memungkinkan pemetaan akun valid.",
        "hypothesis_id": "hyp-login-user-enum",
        "evidence_to_capture": [
          "Request POST user valid & respons",
          "Request POST user dummy acak & respons",
          "Tangkapan burp compare body response"
        ]
      }
    ],
    "unexpected_signals": [
      "Aplikasi crash (HTTP 502 Bad Gateway) saat menerima username panjang > 500 karakter",
      "Token CSRF statis tidak pernah berubah antar session yang berbeda"
    ],
    "hypotheses": [
      {
        "id": "hyp-login-user-enum",
        "name": "Username Enumeration via Login Error Discrepancy",
        "description": "Perilaku respon memungkinkan penyerang menyusun daftar username valid sebelum melakukan password spraying tertarget.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-login-user-enum"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Kirim 3 username acak berentropi tinggi (misal: xz99q_nonexistent). Catat panjang respon dan pesan error.",
            "expected_output": "Pesan error konsisten: 'User not found' atau Content-Length identik.",
            "interesting_output": "Pesan error berbeda dari ketika mencoba username 'admin'.",
            "unexpected_output": "WAF memblokir IP tester.",
            "interpretation": "Mengonfirmasi hipotesis bahwa keberadaan user dapat diverifikasi secara deterministik.",
            "evidence_to_record": ["3 Request & Response mentah dengan timestamp"]
          }
        ]
      }
    ],
    "stop_conditions": [
      "Aplikasi mengembalikan pesan generik 'Invalid credentials' secara seragam dengan waktu dan panjang respon konstan.",
      "IP tester terkunci atau memicu CAPTCHA Cloudflare / WAF setelah 3 percobaan."
    ],
    "common_mistakes": [
      "Langsung menjalankan Hydra dengan 10.000 password sebelum memverifikasi apakah username memang valid.",
      "Menyimpulkan 'Vulnerable SQLi' hanya karena melihat status HTTP 500 tanpa menganalisis pesan exception."
    ],
    "ctf_notes": "Dalam CTF, halaman login sering kali menyembunyikan kredensial di comment HTML (`<!-- test:test -->`), atau rentan terhadap SQLi bypass klasik (`' OR 1=1 -- -`), atau NoSQL injection (`username[$ne]=null`).",
    "pentest_notes": "Dalam pentest korporat resmi, catat kelemahan penanganan username enumeration sebagai finding Medium/Low (OWASP WSTG-ATHN-02). Hindari lockout akun user nyata (client personnel); uji hanya pada akun uji coba khusus.",
    "unknown_guide": {
      "what_is_this": "Halaman antarmuka web yang meminta entitas pembuktian identitas (kredensial) sebelum memberikan hak akses ke fungsionalitas dalam aplikasi.",
      "why_does_it_exist": "Menerapkan prinsip keamanan Identification & Authentication agar server dapat mengenali identitas subjek dan membatasi otorisasi objek.",
      "what_parts_matter": "Metode HTTP (POST vs GET), atribut Action form, perlakuan cookie Set-Cookie, dan variasi pesan respons saat kredensial keliru.",
      "what_normal_looks_like": "Form HTTPS mengirim POST dengan token CSRF. Input salah menghasilkan pesan netral dan tidak membocorkan keberadaan username.",
      "what_to_record_immediately": [
        "URL lengkap halaman login",
        "Nama parameter form (misal: user, username, email, pwd, password)",
        "Contoh header request POST dan response mentah"
      ]
    },
    "negative_result_guide": {
      "summary": "Form login merespons secara aman dengan pesan seragam, rate limiting aktif, dan tidak ada kelemahan SQL syntax.",
      "why_not_secure": "Respon form login yang aman tidak menjamin keamanan endpoint password reset, registrasi, atau REST API otentikasi di background.",
      "next_pivot_observations": [
        "obs-web-password-reset",
        "obs-web-registration",
        "obs-web-session-cookie"
      ]
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
        "section_title": "1.1 Identifikasi Login Page",
        "anchor": "11-identifikasi-login-page",
        "rationale": "Pelajari metodologi lengkap asesmen otentikasi, fuzzing kredensial, dan bypass teknik."
      },
      {
        "workflow_id": "18",
        "slug": "authentication-bypass",
        "title": "18. Authentication Bypass Workflow",
        "section_title": "1.3 Username Enumeration Dulu",
        "anchor": "13-username-enumeration-dulu",
        "rationale": "Langkah taktis memetakan validitas akun sebelum melakukan brute force."
      }
    ],
    "related_observations": [
      "obs-web-registration",
      "obs-web-password-reset",
      "obs-web-session-cookie"
    ],
    "provenance": [
      "OWASP WSTG-ATHN-01",
      "OWASP WSTG-ATHN-02",
      "MITRE ATT&CK T1078"
    ]
  },

  // 2. obs-web-session-cookie
  {
    "id": "obs-web-session-cookie",
    "title": "Cookie Sesi Terdeteksi (Session Cookie Inspection)",
    "domain": "Session Management",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Header respons HTTP: 'Set-Cookie: NAME=VALUE; ...'",
      "Header request HTTP: 'Cookie: NAME=VALUE; ...'",
      "Storage browser (Application / Storage / Cookies di DevTools)"
    ],
    "context": "Muncul saat pertama kali mengunjungi situs atau segera setelah submit form login.",
    "why_it_matters": "Cookie sesi adalah token pembawa identitas sementara pada protokol HTTP yang stateless. Memeriksa atribut dan siklus hidup cookie sangat penting untuk mencegah pembajakan sesi (Session Hijacking).",
    "questions_to_ask": [
      "Apakah cookie ini membawa token identitas otentikasi?",
      "Atribut keamanan apa saja yang disematkan (Secure, HttpOnly, SameSite)?",
      "Apakah nilai cookie memiliki entropi acak tinggi?",
      "Apakah cookie diperbarui setelah login dan logout?"
    ],
    "inspection_points": [
      {
        "id": "cookie-security-attributes",
        "name": "1. Atribut Keamanan & Proteksi Flag",
        "why_check": "Memverifikasi proteksi dari transit sniffing dan pembacaan skrip client.",
        "what_to_look_for": ["HttpOnly", "Secure", "SameSite"],
        "normal_baseline": "Set-Cookie: session=...; Path=/; Secure; HttpOnly; SameSite=Lax",
        "interesting_clues": ["HttpOnly tidak ada pada cookie otentikasi", "Secure flag tidak ada pada situs HTTPS"],
        "evidence_to_capture": ["Header Set-Cookie mentah", "Console output document.cookie"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-cookie-no-httponly",
        "inspection_point_id": "cookie-security-attributes",
        "signal_description": "Set-Cookie tidak menyertakan flag HttpOnly pada token sesi.",
        "output_snippet": "HTTP/1.1 200 OK\nSet-Cookie: sessionid=k8s9d7f6a5s4d3f2; Path=/; Secure",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Token sesi dapat diakses oleh skrip JavaScript via document.cookie jika terjadi celah XSS.",
        "hypothesis_id": "hyp-cookie-xss-theft",
        "evidence_to_capture": ["Header Set-Cookie lengkap dari respon server"]
      }
    ],
    "unexpected_signals": ["Nilai cookie berubah secara acak pada setiap klik halaman"],
    "hypotheses": [
      {
        "id": "hyp-cookie-xss-theft",
        "name": "Session Hijacking via Missing HttpOnly & XSS Chaining",
        "description": "Ketiadaan flag HttpOnly memungkinkan attacker yang menemukan XSS untuk mencuri token sesi langsung.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-cookie-no-httponly"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Jalankan console browser: document.cookie pada halaman terotentikasi.",
            "expected_output": "Cookie sesi tidak muncul jika HttpOnly aktif.",
            "interesting_output": "Cookie sesi muncul jelas dalam output string.",
            "unexpected_output": "Console error CSP blocking.",
            "interpretation": "Mengonfirmasi aksesibilitas client-side script.",
            "evidence_to_record": ["Screenshot console browser document.cookie"]
          }
        ]
      }
    ],
    "stop_conditions": ["Cookie memiliki flag Secure, HttpOnly, SameSite=Strict/Lax lengkap."],
    "common_mistakes": ["Melaporkan 'Missing HttpOnly' sebagai High Severity tanpa ada bukti jalur XSS."],
    "ctf_notes": "Di CTF Web, cookie sering kali berisi serialisasi objek atau token JWT yang dapat dimodifikasi.",
    "pentest_notes": "Insecure Cookie Attributes umumnya diklasifikasikan sebagai Low / Informational.",
    "unknown_guide": {
      "what_is_this": "Data teks kecil yang dikirim oleh server ke browser web tester untuk disimpan dan dikirim kembali pada request berikutnya.",
      "why_does_it_exist": "Menjaga status login pengguna antar request halaman.",
      "what_parts_matter": "Nama cookie, nilainya, dan flag keamanan (Secure, HttpOnly, SameSite).",
      "what_normal_looks_like": "String acak panjang dengan flag Secure dan HttpOnly.",
      "what_to_record_immediately": ["Header Set-Cookie lengkap beserta seluruh atributnya"]
    },
    "negative_result_guide": {
      "summary": "Cookie sesi dikonfigurasi dengan flag keamanan lengkap dan entropi tinggi.",
      "why_not_secure": "Keamanan cookie tidak melindungi dari IDOR atau SQL injection.",
      "next_pivot_observations": ["obs-web-id-parameter", "obs-web-api-endpoint"]
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
        "rationale": "Pelajari tabel atribut cookie, risiko ketiadaan flag, dan langkah audit keamanan sesi."
      }
    ],
    "related_observations": ["obs-web-login-page", "obs-web-cookie-attributes"],
    "provenance": ["RFC 6265", "OWASP WSTG-SESS-02"]
  }
];

console.log("Web generator ready");
