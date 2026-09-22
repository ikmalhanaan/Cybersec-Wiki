import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_JSON = path.resolve(__dirname, '../src/data/observations/web.json');

const nodes = JSON.parse(fs.readFileSync(WEB_JSON, 'utf8'));
const map = new Map(nodes.map(n => [n.id, n]));

const batch1 = [
  {
    "id": "obs-web-registration",
    "title": "Halaman Registrasi Akun Terdeteksi (User Registration Page)",
    "domain": "Authentication",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Form input pendaftaran akun: Username, Email, Password, Confirm Password",
      "Field opsional: Phone number, Invitation Code, Role selection dropdown"
    ],
    "context": "Ditemukan pada portal publik, link 'Sign Up' di dekat form login.",
    "why_it_matters": "Form registrasi adalah permukaan interaksi di mana pengguna publik dapat memasukkan data baru ke database. Di sini tester dapat menguji penanganan akun duplikat (Username Enumeration) dan penugasan role otomatis (Mass Assignment / Privilege Escalation).",
    "questions_to_ask": [
      "Bagaimana server merespons jika mendaftarkan username/email yang sudah ada di database?",
      "Apakah ada field tersembunyi seperti role=user yang dapat diubah menjadi role=admin saat pendaftaran?",
      "Apakah akun baru otomatis aktif tanpa verifikasi email?"
    ],
    "inspection_points": [
      {
        "id": "reg-duplicate-handling",
        "name": "Penanganan Akun Duplikat & Username Enumeration",
        "why_check": "Melihat apakah respon registrasi membocorkan keberadaan akun tertentu.",
        "what_to_look_for": ["Pesan 'Username sudah digunakan'"],
        "normal_baseline": "Sistem privat menampilkan pesan netral atau mengirimkan tautan konfirmasi tanpa membedakan secara publik.",
        "interesting_clues": ["Aplikasi mengonfirmasi secara instan bahwa user admin sudah ada di sistem"],
        "evidence_to_capture": ["Request POST registrasi user terdaftar", "Pesan error penolakan duplikat"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-reg-role-elevation",
        "inspection_point_id": "reg-duplicate-handling",
        "signal_description": "Menambahkan parameter role=admin pada payload JSON registrasi berhasil membuat akun berhak akses admin.",
        "output_snippet": "POST /api/register HTTP/1.1\n{\"username\": \"test_hacker\", \"password\": \"P@ssword123\", \"role\": \"admin\"}\n\nHTTP/1.1 201 Created\n{\"id\": 55, \"role\": \"admin\"}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Backend framework menggunakan model binding otomatis tanpa whitelist atribut (Mass Assignment).",
        "hypothesis_id": "hyp-reg-mass-assignment",
        "evidence_to_capture": ["Request pendaftaran", "Response 201 Created dengan role admin"]
      }
    ],
    "unexpected_signals": ["Server mengirimkan pesan konfirmasi pendaftaran beserta password plaintext di body response"],
    "hypotheses": [
      {
        "id": "hyp-reg-mass-assignment",
        "name": "Privilege Escalation via Mass Assignment on Registration",
        "description": "Pengguna dapat menaikkan hak aksesnya sendiri menjadi administrator saat pertama kali mendaftar.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-reg-role-elevation"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Login dengan akun baru tersebut dan coba akses endpoint terproteksi /admin/users.",
            "expected_output": "Mendapatkan akses penuh ke panel kontrol sistem.",
            "interesting_output": "Dapat melihat daftar seluruh user.",
            "unexpected_output": "Akun ditolak.",
            "interpretation": "Mengonfirmasi eskalasi hak akses berhasil.",
            "evidence_to_record": ["Screenshot panel admin"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server mengabaikan seluruh parameter tambahan dan hanya menerapkan role default user."],
    "common_mistakes": ["Lupa menguji pendaftaran dengan format JSON selain form-urlencoded."],
    "ctf_notes": "Di CTF, registrasi akun sering kali memiliki celah SQL injection pada username field atau Stored XSS.",
    "pentest_notes": "Mass Assignment pada form pendaftaran adalah temuan High/Critical.",
    "unknown_guide": {
      "what_is_this": "Formulir pendaftaran pengguna baru pada aplikasi web.",
      "why_does_it_exist": "Mendaftarkan profil user baru ke dalam database sistem.",
      "what_parts_matter": "Parameter input, penanganan akun duplikat, dan penentuan role awal.",
      "what_normal_looks_like": "Mendaftarkan user dengan role standar.",
      "what_to_record_immediately": ["Format payload registrasi (JSON vs Form URL Encoded)", "Nama parameter role"]
    },
    "negative_result_guide": {
      "summary": "Form registrasi mengabaikan parameter tidak dikenal dan menerapkan rate limit.",
      "why_not_secure": "Fitur pendaftaran yang aman tidak menjamin form reset password kebal dari kelemahan.",
      "next_pivot_observations": ["obs-web-password-reset", "obs-web-login-page"]
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
        "section_title": "1.3 Username Enumeration Dulu",
        "anchor": "13-username-enumeration-dulu",
        "rationale": "Analisis enumerasi user via pesan penolakan pendaftaran duplikat."
      }
    ],
    "related_observations": ["obs-web-login-page", "obs-web-password-reset"],
    "provenance": ["OWASP WSTG-ATHN-02", "CWE-915"]
  },
  {
    "id": "obs-web-password-reset",
    "title": "Alur Reset Password Terdeteksi (Password Reset Flow)",
    "domain": "Authentication",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Halaman minta reset password: /forgot-password atau /reset-password",
      "Input field meminta email atau username akun yang ingin di-reset",
      "Tautan link reset berformat: /reset?token=abc123xyz"
    ],
    "context": "Diakses saat pengguna lupa password untuk mendapatkan akses kembali ke akunnya.",
    "why_it_matters": "Kelemahan pada entropi token, Host Header Poisoning, token reuse, atau ketiadaan kedaluwarsa dapat menyebabkan pengambilalihan akun penuh (Account Takeover).",
    "questions_to_ask": [
      "Bagaimana token reset dibuat?",
      "Apakah domain link reset di email dipengaruhi oleh header Host pada request pemohon?",
      "Apakah token masih dapat digunakan kembali setelah password berhasil diubah (Token Reuse)?"
    ],
    "inspection_points": [
      {
        "id": "reset-host-header",
        "name": "Audit Host Header Poisoning pada Email Reset",
        "why_check": "Melihat apakah server membangun tautan reset password berdasarkan header Host yang dikontrol pengguna.",
        "what_to_look_for": ["Header: 'Host: evil.com' atau 'X-Forwarded-Host: evil.com'"],
        "normal_baseline": "Server membangun tautan reset menggunakan konfigurasi base URL server internal yang statis.",
        "interesting_clues": ["Server merespons 200 OK dan mengirimkan email dengan tautan yang mengarah ke host penyerang"],
        "evidence_to_capture": ["Request POST forgot-password dengan Host header dimanipulasi", "Tangkapan isi email"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-reset-host-poison",
        "inspection_point_id": "reset-host-header",
        "signal_description": "Header X-Forwarded-Host merefleksikan domain luar ke dalam email tautan reset.",
        "output_snippet": "POST /api/forgot-password HTTP/1.1\nHost: target.com\nX-Forwarded-Host: attacker-server.com\nemail=victim@target.com\n\nHTTP/1.1 200 OK",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Aplikasi rentan terhadap Password Reset Poisoning, memungkinkan penyerang mencuri token korban.",
        "hypothesis_id": "hyp-reset-account-takeover",
        "evidence_to_capture": ["Request HTTP dengan X-Forwarded-Host"]
      }
    ],
    "unexpected_signals": ["Server mengembalikan token reset langsung di dalam response JSON"],
    "hypotheses": [
      {
        "id": "hyp-reset-account-takeover",
        "name": "Account Takeover via Host Header Poisoning",
        "description": "Penyerang memanipulasi domain pengiriman link reset untuk memanen token rahasia pengguna lain.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-reset-host-poison"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Kirim request reset untuk akun tester sendiri dengan menyetel `X-Forwarded-Host: burpcollaborator.net`.",
            "expected_output": "Email yang diterima tester memuat link menuju collaborator domain.",
            "interesting_output": "Collaborator menerima interaksi HTTP GET dengan parameter ?token=...",
            "unexpected_output": "Server menolak request dengan 400 Bad Request.",
            "interpretation": "Mengonfirmasi kemungkinan pengambilalihan akun secara penuh.",
            "evidence_to_record": ["Collaborator DNS/HTTP interaction log"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server menggunakan hardcoded domain name pada konfigurasi aplikasi."],
    "common_mistakes": ["Menguji Host Header Poisoning pada akun orang lain tanpa izin."],
    "ctf_notes": "Di CTF, token reset sering kali merupakan fungsi dari timestamp yang dapat ditebak.",
    "pentest_notes": "Password Reset Poisoning adalah temuan High Severity di OWASP WSTG-ATHN-09.",
    "unknown_guide": {
      "what_is_this": "Mekanisme pemulihan akun bagi pengguna yang kehilangan akses password.",
      "why_does_it_exist": "Fungsionalitas self-service agar pengguna dapat mereset kredensial.",
      "what_parts_matter": "Bagaimana token dibuat dan bagaimana link dirangkai.",
      "what_normal_looks_like": "Tautan acak berumur pendek dikirim ke email terdaftar.",
      "what_to_record_immediately": ["Contoh URL reset lengkap", "Format token"]
    },
    "negative_result_guide": {
      "summary": "Alur reset password menggunakan token acak kuat dan base domain statis.",
      "why_not_secure": "Aplikasi mungkin masih rentan terhadap enumerasi email pengguna.",
      "next_pivot_observations": ["obs-web-mfa-otp", "obs-web-login-page"]
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
        "section_title": "5.1 Predictable Reset Token",
        "anchor": "51-predictable-reset-token",
        "rationale": "Pelajari teknik identifikasi token lemah dan enkripsi token reset."
      },
      {
        "workflow_id": "18",
        "slug": "authentication-bypass",
        "title": "18. Authentication Bypass Workflow",
        "section_title": "5.2 Host Header Poisoning di Password Reset",
        "anchor": "52-host-header-poisoning-di-password-reset",
        "rationale": "Metodologi eksploitasi Host Header Poisoning pada pengiriman email reset."
      }
    ],
    "related_observations": ["obs-web-login-page", "obs-web-registration"],
    "provenance": ["OWASP WSTG-ATHN-09", "CWE-640"]
  },
  {
    "id": "obs-web-mfa-otp",
    "title": "Tantangan MFA / OTP Terdeteksi (Multi-Factor Authentication / OTP Prompt)",
    "domain": "Authentication",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Input 6-digit angka OTP atau kode authenticator",
      "Pemberitahuan: 'Kode verifikasi telah dikirim ke nomor/email Anda'"
    ],
    "context": "Muncul segera setelah kredensial username dan password benar disubmit.",
    "why_it_matters": "Implementasi yang cacat sering kali mengizinkan: Response Manipulation (mengubah respon gagal menjadi sukses di client), ketiadaan rate limit pada brute force 6 digit, atau melewati langkah verifikasi dengan langsung mengakses endpoint /dashboard.",
    "questions_to_ask": [
      "Apakah sesi otentikasi penuh sudah diberikan sebelum kode OTP diverifikasi?",
      "Bagaimana server merespons jika kode OTP acak dimasukkan berulang kali?",
      "Apakah mengubah respon JSON dari false menjadi true meloloskan proteksi di browser?"
    ],
    "inspection_points": [
      {
        "id": "mfa-direct-access",
        "name": "Uji Akses Langsung (Forced Browsing / Step Skipping)",
        "why_check": "Melihat apakah backend membatasi hak akses pada level otorisasi server.",
        "what_to_look_for": ["Akses langsung via URL ke /dashboard saat tertahan di prompt OTP"],
        "normal_baseline": "Server menolak akses dengan HTTP 403 atau me-redirect kembali ke halaman OTP.",
        "interesting_clues": ["Halaman dashboard terbuka penuh meskipun OTP belum dimasukkan"],
        "evidence_to_capture": ["Request ke endpoint terproteksi beserta respon 200 OK tanpa OTP"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-mfa-response-manipulation",
        "inspection_point_id": "mfa-direct-access",
        "signal_description": "Mengubah body respon server dari error menjadi success meloloskan verifikasi MFA di browser.",
        "output_snippet": "Client receives:\nHTTP/1.1 200 OK\n{\"status\": \"success\", \"mfa_verified\": true, \"redirect\": \"/dashboard\"}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Otorisasi MFA hanya divalidasi oleh JavaScript sisi client (Client-Side Enforcement Flaw).",
        "hypothesis_id": "hyp-mfa-bypass",
        "evidence_to_capture": ["Tangkapan layar Burp Match & Replace rules", "Akses sukses ke dashboard"]
      }
    ],
    "unexpected_signals": ["Server mengembalikan kode OTP yang benar di dalam atribut komentar HTML"],
    "hypotheses": [
      {
        "id": "hyp-mfa-bypass",
        "name": "MFA Verification Bypass via Client-Side Response Tampering",
        "description": "Server tidak memvalidasi status penyelesaian MFA pada request API berikutnya.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-mfa-response-manipulation"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Gunakan akun lab tester. Submit OTP salah, cegat respon di Burp Proxy, ubah status menjadi success.",
            "expected_output": "Browser melanjutkan ke dashboard.",
            "interesting_output": "Akses akun aktif penuh tanpa kode OTP valid.",
            "unexpected_output": "Server menolak request API berikutnya dengan 401 Unauthorized.",
            "interpretation": "Membuktikan otentikasi dua faktor dapat dilewati.",
            "evidence_to_record": ["Burp HTTP proxy history logs"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server mengunci akun setelah 5 percobaan OTP salah."],
    "common_mistakes": ["Mengira response manipulation selalu berhasil."],
    "ctf_notes": "Di CTF, kode OTP sering kali memiliki nomor statis (misal: 000000).",
    "pentest_notes": "MFA Bypass adalah temuan Critical/High.",
    "unknown_guide": {
      "what_is_this": "Langkah pembuktian identitas tambahan berupa kode angka singkat.",
      "why_does_it_exist": "Mencegah pencurian akun jika password pengguna bocor di tempat lain.",
      "what_parts_matter": "Apakah backend benar-benar menolak request sebelum kode ini dimasukkan.",
      "what_normal_looks_like": "Sistem membatasi percobaan maksimal 3-5 kali.",
      "what_to_record_immediately": ["Endpoint penerima OTP", "Format request"]
    },
    "negative_result_guide": {
      "summary": "Proteksi MFA divalidasi ketat di backend dengan rate limiting aktif.",
      "why_not_secure": "MFA yang kuat tidak melindungi dari Session Hijacking jika cookie sesi berhasil dicuri.",
      "next_pivot_observations": ["obs-web-session-cookie", "obs-web-id-parameter"]
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
        "section_title": "10.1 OTP Bypass Techniques",
        "anchor": "101-otp-bypass-techniques",
        "rationale": "Pelajari teknik bypass OTP: response manipulation dan rate limit bypass."
      }
    ],
    "related_observations": ["obs-web-login-page", "obs-web-session-cookie"],
    "provenance": ["OWASP WSTG-ATHN-07", "NIST SP 800-63B"]
  },
  {
    "id": "obs-web-cookie-attributes",
    "title": "Atribut Cookie Keamanan Mendalam (HttpOnly, Secure, SameSite, Scope)",
    "domain": "Session Management",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Set-Cookie header memuat atau kekurangan flag: HttpOnly, Secure, SameSite",
      "Parameter Domain=.target.com (wildcard subdomain scope)",
      "Parameter Path=/ (aplikasi luas) vs Path=/app/admin"
    ],
    "context": "Diinspeksi pada setiap respon HTTP yang mengeluarkan cookie otentikasi atau preferensi.",
    "why_it_matters": "Atribut cookie adalah pertahanan lapis pertama terhadap pencurian sesi via Cross-Site Scripting (XSS), penyadapan lalu lintas jaringan (Man-in-the-Middle), dan serangan CSRF.",
    "questions_to_ask": [
      "Apakah flag HttpOnly aktif untuk mencegah akses via document.cookie?",
      "Apakah flag Secure aktif agar cookie tidak pernah dikirim via koneksi HTTP plaintext?",
      "Apakah SameSite diset ke Strict atau Lax untuk memitigasi CSRF?"
    ],
    "inspection_points": [
      {
        "id": "point-cookie-flags",
        "name": "Audit Flag Proteksi (HttpOnly & Secure)",
        "why_check": "Mencegah pencurian kredensial sesi oleh skrip berbahaya dan sniffing jaringan.",
        "what_to_look_for": ["HttpOnly", "Secure"],
        "normal_baseline": "Kedua flag selalu disematkan pada seluruh cookie sesi otentikasi.",
        "interesting_clues": ["Flag HttpOnly hilang pada cookie sesi sensitif"],
        "evidence_to_capture": ["Header Set-Cookie mentah", "Console output document.cookie"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-cookie-no-flags",
        "inspection_point_id": "point-cookie-flags",
        "signal_description": "Cookie otentikasi dikirim tanpa HttpOnly dan Secure di lingkungan HTTPS.",
        "output_snippet": "Set-Cookie: auth=a8f7c9e2b1; Path=/; Domain=example.com",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Cookie rentan dibaca via XSS dan bocor jika ada link HTTP yang dibuka.",
        "hypothesis_id": "hyp-cookie-flag-leak",
        "evidence_to_capture": ["Header respons lengkap", "URL halaman yang mengeluarkan cookie"]
      }
    ],
    "unexpected_signals": ["Cookie memiliki atribut Max-Age negatif"],
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
    "common_mistakes": ["Menganggap missing flag sebagai kerentanan kritis mandiri tanpa adanya XSS."],
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
  }
];

for (const n of batch1) {
  map.set(n.id, n);
}

fs.writeFileSync(WEB_JSON, JSON.stringify(Array.from(map.values()), null, 2), 'utf8');
console.log(`Updated web.json with batch 1. Total: ${map.size} nodes.`);
