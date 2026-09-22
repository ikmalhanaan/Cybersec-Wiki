import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../src/data');
const TARGET_FILE = path.join(DATA_DIR, 'observations.json');

// Read existing nodes
let existingNodes = [];
if (fs.existsSync(TARGET_FILE)) {
  try {
    existingNodes = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'));
  } catch (e) {
    existingNodes = [];
  }
}
const nodeMap = new Map(existingNodes.map(n => [n.id, n]));

// Add remaining comprehensive nodes for Phase 1 Seed Dataset
const fullSeedNodes = [
  // 1. obs-web-registration
  {
    "id": "obs-web-registration",
    "title": "Halaman Registrasi Akun Terdeteksi (User Registration Page)",
    "domain": "Authentication",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Form input pendaftaran akun: Username, Email, Password, Confirm Password",
      "Field opsional: Phone number, Invitation Code, Role selection dropdown",
      "Pesan status keberhasilan atau kegagalan saat submit pendaftaran"
    ],
    "context": "Ditemukan pada portal publik, link 'Sign Up' di dekat form login, atau saat mengakses /register.",
    "why_it_matters": "Form registrasi adalah permukaan interaksi di mana pengguna publik dapat memasukkan data baru ke database aplikasi. Di sini tester dapat menguji penanganan akun duplikat (Username Enumeration), penugasan role otomatis (Mass Assignment / Privilege Escalation), verifikasi email yang dapat di-bypass, dan auto-login setelah daftar.",
    "questions_to_ask": [
      "Bagaimana server merespons jika mendaftarkan username/email yang sudah ada di database?",
      "Apakah ada field tersembunyi seperti role=user yang dapat diubah menjadi role=admin saat pendaftaran?",
      "Apakah akun baru otomatis aktif tanpa verifikasi email atau langsung diberikan token sesi?",
      "Apakah input nama atau username disaring untuk mencegah Stored XSS saat dilihat oleh admin?"
    ],
    "inspection_points": [
      {
        "id": "reg-duplicate-handling",
        "name": "Penanganan Akun Duplikat & Username Enumeration",
        "why_check": "Melihat apakah respon registrasi membocorkan keberadaan akun tertentu (misal: admin, root, target).",
        "what_to_look_for": ["Pesan: 'Username sudah digunakan' atau 'Email already registered'"],
        "normal_baseline": "Sistem yang sangat privat menampilkan pesan netral atau mengirimkan tautan konfirmasi tanpa membedakan secara publik.",
        "interesting_clues": ["Aplikasi secara instan mengonfirmasi bahwa user 'admin' sudah ada di sistem"],
        "evidence_to_capture": ["Request POST registrasi user terdaftar", "Pesan error spesifik penolakan duplikat"]
      },
      {
        "id": "reg-mass-assignment",
        "name": "Audit Mass Assignment & Role Injection",
        "why_check": "Menguji apakah parameter role atau hak akses dapat disuntikkan langsung saat membuat akun baru.",
        "what_to_look_for": ["Menambahkan field JSON: {\"role\": \"admin\", \"is_admin\": true, \"isAdmin\": 1}"],
        "normal_baseline": "Backend mengabaikan parameter tidak dikenal dan selalu memberikan default role paling rendah (user).",
        "interesting_clues": ["Akun baru langsung dibuat dengan role 'admin' atau memiliki akses dashboard administratif"],
        "evidence_to_capture": ["Request POST dengan parameter role disuntikkan", "Respon profil akun yang menampilkan role admin"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-reg-role-elevation",
        "inspection_point_id": "reg-mass-assignment",
        "signal_description": "Menambahkan parameter role=admin pada payload JSON registrasi berhasil membuat akun berhak akses admin.",
        "output_snippet": "POST /api/register HTTP/1.1\n{\"username\": \"test_hacker\", \"password\": \"P@ssword123\", \"role\": \"admin\"}\n\nHTTP/1.1 201 Created\n{\"id\": 55, \"username\": \"test_hacker\", \"role\": \"admin\", \"active\": true}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Backend framework menggunakan model binding otomatis tanpa whitelist atribut (Mass Assignment Vulnerability).",
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
            "interesting_output": "Dapat melihat daftar seluruh user dan konfigurasi server.",
            "unexpected_output": "Akun ditolak karena belum diverifikasi manual.",
            "interpretation": "Mengonfirmasi eskalasi hak akses berhasil dibuktikan.",
            "evidence_to_record": ["Screenshot panel admin dari akun hasil registrasi"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server mengabaikan seluruh parameter tambahan dan hanya menerapkan role default user."],
    "common_mistakes": ["Lupa menguji pendaftaran dengan format JSON selain form-urlencoded."],
    "ctf_notes": "Di CTF, registrasi akun sering kali memiliki celah SQL injection pada username field atau Stored XSS yang dibaca oleh simulated admin bot.",
    "pentest_notes": "Mass Assignment pada form pendaftaran adalah temuan High/Critical karena mengizinkan sembarang orang luar menjadi admin.",
    "unknown_guide": {
      "what_is_this": "Formulir pendaftaran pengguna baru pada aplikasi web.",
      "why_does_it_exist": "Mendaftarkan profil user baru ke dalam database sistem.",
      "what_parts_matter": "Parameter input, penanganan akun duplikat, dan penentuan role awal.",
      "what_normal_looks_like": "Mendaftarkan user dengan role standar dan memvalidasi keaslian email.",
      "what_to_record_immediately": ["Format payload registrasi (JSON vs Form URL Encoded)", "Nama parameter role"]
    },
    "negative_result_guide": {
      "summary": "Form registrasi mengabaikan parameter tidak dikenal dan menerapkan rate limit.",
      "why_not_secure": "Fitur pendaftaran yang aman tidak menjamin form reset password atau login kebal dari kelemahan.",
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

  // 2. obs-web-password-reset
  {
    "id": "obs-web-password-reset",
    "title": "Alur Reset Password Terdeteksi (Password Reset Flow)",
    "domain": "Authentication",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Halaman minta reset password: /forgot-password atau /reset-password",
      "Input field meminta email atau username akun yang ingin di-reset",
      "Tautan link reset berformat: /reset?token=abc123xyz atau kode OTP 6-digit"
    ],
    "context": "Diakses saat pengguna lupa password untuk mendapatkan akses kembali ke akunnya.",
    "why_it_matters": "Alur reset password adalah salah satu titik paling kritis dalam manajemen identitas. Kelemahan pada entropi token (token yang dapat ditebak), kerentanan Host Header Poisoning (mengalihkan tautan reset ke server attacker), token reuse, atau ketiadaan kedaluwarsa dapat menyebabkan pengambilalihan akun penuh (Account Takeover).",
    "questions_to_ask": [
      "Bagaimana token reset dibuat (apakah berbasis timestamp, MD5, atau CSPRNG acak)?",
      "Apakah domain link reset di email dipengaruhi oleh header Host pada request pemohon?",
      "Apakah token masih dapat digunakan kembali setelah password berhasil diubah (Token Reuse)?",
      "Apakah token memiliki waktu kedaluwarsa yang ketat (misal: 15 menit)?"
    ],
    "inspection_points": [
      {
        "id": "reset-host-header",
        "name": "Audit Host Header Poisoning pada Email Reset",
        "why_check": "Melihat apakah server membangun tautan reset password berdasarkan header Host yang dikontrol pengguna.",
        "what_to_look_for": [
          "Ubah header: 'Host: evil.com' atau tambahkan 'X-Forwarded-Host: evil.com'",
          "Periksa apakah email reset mengirim tautan menuju http://evil.com/reset?token=..."
        ],
        "normal_baseline": "Server membangun tautan reset menggunakan konfigurasi base URL server internal yang statis.",
        "interesting_clues": ["Server merespons 200 OK dan mengirimkan email dengan tautan yang mengarah ke host penyerang"],
        "evidence_to_capture": ["Request POST forgot-password dengan Host header dimanipulasi", "Tangkapan isi email yang memuat link hasil poisoning"]
      },
      {
        "id": "reset-token-entropy",
        "name": "Analisis Entropi & Reusability Token Reset",
        "why_check": "Menentukan apakah token dapat ditebak secara matematis atau dipakai berulang kali.",
        "what_to_look_for": ["Format token di URL (?token=1711200000 atau ?token=d41d8cd98f00b204e9800998ecf8427e)"],
        "normal_baseline": "Token berukuran 256-bit acak murni yang langsung hangus begitu digunakan sekali atau setelah 15 menit.",
        "interesting_clues": [
          "Token hanya merupakan hash MD5(timestamp) atau MD5(email)",
          "Token yang sama dapat digunakan berkali-kali untuk mengganti password"
        ],
        "evidence_to_capture": ["Tiga token reset yang di-generate berturut-turut untuk perbandingan pola"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-reset-host-poison",
        "inspection_point_id": "reset-host-header",
        "signal_description": "Header X-Forwarded-Host merefleksikan domain luar ke dalam email tautan reset.",
        "output_snippet": "POST /api/forgot-password HTTP/1.1\nHost: target.com\nX-Forwarded-Host: attacker-server.com\nemail=victim@target.com\n\nHTTP/1.1 200 OK\n{\"message\": \"Password reset link sent to your email\"}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Aplikasi rentan terhadap Password Reset Poisoning, memungkinkan penyerang mencuri token korban saat korban mengklik link email.",
        "hypothesis_id": "hyp-reset-account-takeover",
        "evidence_to_capture": ["Request HTTP dengan X-Forwarded-Host", "Log webhook/server attacker yang menerima token klik korban"]
      }
    ],
    "unexpected_signals": ["Server mengembalikan token reset langsung di dalam response JSON tanpa mengirim email sama sekali"],
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
            "unexpected_output": "Server menolak request dengan status 400 Bad Request.",
            "interpretation": "Mengonfirmasi kemungkinan pengambilalihan akun secara penuh.",
            "evidence_to_record": ["Collaborator DNS/HTTP interaction log", "Tangkapan email bukti"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server menggunakan hardcoded domain name pada konfigurasi aplikasi dan menolak manipulasi Host header."],
    "common_mistakes": ["Menguji Host Header Poisoning pada akun orang lain tanpa izin tertulis."],
    "ctf_notes": "Di CTF, token reset sering kali merupakan fungsi dari `int(time.time())` yang dapat ditebak dengan script Python sederhana.",
    "pentest_notes": "Password Reset Poisoning adalah temuan High Severity di OWASP WSTG-ATHN-09.",
    "unknown_guide": {
      "what_is_this": "Mekanisme pemulihan akun bagi pengguna yang kehilangan akses password.",
      "why_does_it_exist": "Fungsionalitas self-service esensial agar helpdesk tidak terbebani permintaan reset manual.",
      "what_parts_matter": "Bagaimana token dibuat, bagaimana link dirangkai, dan apakah token hangus setelah dipakai.",
      "what_normal_looks_like": "Tautan acak berumur pendek dikirim ke email terdaftar tanpa kebocoran di sisi web client.",
      "what_to_record_immediately": ["Contoh URL reset lengkap", "Format token", "Header respon server"]
    },
    "negative_result_guide": {
      "summary": "Alur reset password menggunakan token acak kuat dan base domain statis.",
      "why_not_secure": "Aplikasi mungkin masih rentan terhadap enumerasi email pengguna pada form permintaan reset.",
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

  // 3. obs-web-mfa-otp
  {
    "id": "obs-web-mfa-otp",
    "title": "Tantangan MFA / OTP Terdeteksi (Multi-Factor Authentication / OTP Prompt)",
    "domain": "Authentication",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Layar kedua setelah login: input 6-digit angka OTP atau kode authenticator",
      "Pemberitahuan: 'Kode verifikasi telah dikirim ke nomor/email Anda'",
      "Tombol verifikasi dan opsi 'Resend Code'"
    ],
    "context": "Muncul segera setelah kredensial username dan password benar disubmit.",
    "why_it_matters": "Multi-Factor Authentication (MFA) dirancang untuk memastikan bahwa mengetahui password saja tidak cukup untuk mengakses akun. Namun implementasi yang cacat sering kali mengizinkan: Response Manipulation (mengubah respon gagal menjadi sukses di client), ketiadaan rate limit pada brute force 6 digit, atau melewati langkah verifikasi dengan langsung mengakses endpoint /dashboard.",
    "questions_to_ask": [
      "Apakah sesi otentikasi penuh sudah diberikan sebelum kode OTP diverifikasi?",
      "Bagaimana server merespons jika kode OTP acak dimasukkan berulang kali (apakah ada rate limit)?",
      "Apakah mengubah respon JSON dari {\"success\": false} menjadi {\"success\": true} meloloskan proteksi di browser?",
      "Apakah endpoint tujuan (/dashboard) dapat langsung dibuka tanpa menyelesaikan prompt OTP?"
    ],
    "inspection_points": [
      {
        "id": "mfa-direct-access",
        "name": "Uji Akses Langsung (Forced Browsing / Step Skipping)",
        "why_check": "Melihat apakah backend membatasi hak akses pada level otorisasi server atau hanya routing tampilan client.",
        "what_to_look_for": ["Akses langsung via URL ke /dashboard atau /api/user/data saat tertahan di prompt OTP"],
        "normal_baseline": "Server menolak akses dengan HTTP 403 atau me-redirect kembali ke halaman verifikasi OTP.",
        "interesting_clues": ["Halaman dashboard terbuka penuh dan API mengembalikan data sensitif meskipun OTP belum dimasukkan"],
        "evidence_to_capture": ["Request ke endpoint terproteksi beserta respon 200 OK tanpa menyelesaikan OTP"]
      },
      {
        "id": "mfa-rate-limiting",
        "name": "Audit Brute Force Kode OTP 4-6 Digit",
        "why_check": "Kode 6 digit hanya memiliki 1.000.000 kemungkinan; jika tidak ada rate limit, dapat di-crack dalam hitungan menit.",
        "what_to_look_for": ["Uji submit 10-20 kode salah berturut-turut"],
        "normal_baseline": "Sistem memblokir setelah 3-5 kali percobaan salah dan menginvalidasi sesi login.",
        "interesting_clues": ["Tidak ada pemblokiran, delay, atau status HTTP 429 setelah 50 percobaan salah"],
        "evidence_to_capture": ["Log Burp Intruder 50 percobaan submit OTP tanpa lockout"]
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
    "unexpected_signals": ["Server mengembalikan kode OTP yang benar di dalam atribut komentar HTML atau JSON response awal"],
    "hypotheses": [
      {
        "id": "hyp-mfa-bypass",
        "name": "MFA Verification Bypass via Client-Side Response Tampering",
        "description": "Server tidak memvalidasi status penyelesaian MFA pada request API berikutnya, hanya bergantung pada respon browser.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-mfa-response-manipulation"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Gunakan akun lab tester. Submit OTP salah, cegat respon di Burp Proxy, ubah status menjadi success.",
            "expected_output": "Browser melanjutkan ke dashboard, dan request data berikutnya diterima oleh server.",
            "interesting_output": "Akses akun aktif penuh tanpa kode OTP valid.",
            "unexpected_output": "Server menolak request API berikutnya dengan 401 Unauthorized.",
            "interpretation": "Membuktikan otentikasi dua faktor dapat dilewati sepenuhnya.",
            "evidence_to_record": ["Burp HTTP proxy history logs"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server mengunci akun setelah 5 percobaan OTP salah dan menolak seluruh request data sebelum OTP tervalidasi di backend."],
    "common_mistakes": ["Mengira response manipulation selalu berhasil (sering kali browser menampilkan dashboard namun backend API tetap menolak data)."],
    "ctf_notes": "Di CTF, kode OTP sering kali memiliki nomor statis (misal: 000000) atau di-generate menggunakan generator pseudo-random yang disemai dengan timestamp.",
    "pentest_notes": "MFA Bypass adalah temuan Critical/High karena melumpuhkan fungsi lapisan keamanan kedua organisasi.",
    "unknown_guide": {
      "what_is_this": "Langkah pembuktian identitas tambahan berupa kode angka singkat yang dikirim ke perangkat terpisah.",
      "why_does_it_exist": "Mencegah pencurian akun jika password pengguna bocor di tempat lain.",
      "what_parts_matter": "Apakah backend benar-benar menolak request sebelum kode ini dimasukkan, dan apakah ada batasan tebakan salah.",
      "what_normal_looks_like": "Sistem membatasi percobaan maksimal 3-5 kali dan menolak seluruh akses data sebelum kode benar diverifikasi.",
      "what_to_record_immediately": ["Endpoint penerima OTP", "Format request dan response saat kode salah dimasukkan"]
    },
    "negative_result_guide": {
      "summary": "Proteksi MFA divalidasi ketat di backend dengan rate limiting aktif.",
      "why_not_secure": "MFA yang kuat tidak melindungi dari serangan Session Hijacking jika cookie sesi berhasil dicuri setelah login selesai.",
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
        "rationale": "Pelajari teknik bypass OTP: response manipulation, rate limit bypass, dan status code tampering."
      }
    ],
    "related_observations": ["obs-web-login-page", "obs-web-session-cookie"],
    "provenance": ["OWASP WSTG-ATHN-07", "NIST SP 800-63B"]
  },

  // 4. obs-web-backup-config-file
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
    "context": "Ditemukan saat melakukan directory fuzzing dengan ffuf / gobuster menggunakan wordlist seclists/raft.",
    "why_it_matters": "Administrator dan pengembang sering membuat backup file langsung di web root (misal: `index.php.bak`). Web server tidak memproses file `.bak` sebagai script melainkan menyajikannya sebagai plaintext, membongkar seluruh kode sumber backend, string koneksi database, dan kunci rahasia API.",
    "questions_to_ask": [
      "Apakah file dapat diunduh langsung tanpa otentikasi?",
      "Apakah file memuat kredensial database (DB_USER, DB_PASSWORD, DB_HOST)?",
      "Apakah direktori /.git/ lengkap dan dapat direkonstruksi menggunakan git-dumper?",
      "Apakah ada kunci enkripsi (SECRET_KEY, JWT_SECRET, AWS_KEY) di dalam file .env?"
    ],
    "inspection_points": [
      {
        "id": "backup-content-analysis",
        "name": "Analisis Konten File Sensitif",
        "why_check": "Mengekstrak rahasia infrastruktur untuk eskalasi ke database atau privilege escalation.",
        "what_to_look_for": [
          "Password database plaintext",
          "API keys dan token integrasi payment gateway",
          "Routing internal dan endpoint rahasia"
        ],
        "normal_baseline": "File konfigurasi dan backup disimpan di luar web root atau ditolak dengan HTTP 403/404.",
        "interesting_clues": [
          "File .env dapat diunduh dan memuat kredensial AWS atau database",
          "File index.php.bak memuat algoritma hashing kustom"
        ],
        "evidence_to_capture": ["Tangkapan layar potongan isi file konfigurasi (sensor password asli)", "Header HTTP 200 OK saat mendownload file"]
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
        "description": "Kredensial database yang terekspos dapat digunakan untuk pivot ke database service atau eskalasi ke server.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-backup-env-exposed"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Uji apakah database menerima koneksi remote menggunakan kredensial tersebut atau simpan kredensial untuk login SSH/admin.",
            "expected_output": "Mengetahui apakah kredensial aktif pada layanan target.",
            "interesting_output": "Berhasil login ke MySQL atau panel admin.",
            "unexpected_output": "Access denied.",
            "interpretation": "Membuktikan validitas kredensial yang bocor.",
            "evidence_to_record": ["Log percobaan koneksi"]
          }
        ]
      }
    ],
    "stop_conditions": ["Web server mengembalikan 403 Forbidden atau 404 Not Found pada seluruh ekstensi backup."],
    "common_mistakes": ["Mengabaikan file editor swap seperti `.index.php.swp` yang ditinggalkan oleh editor Vim."],
    "ctf_notes": "Di CTF, jika ada /.git/ terbuka, gunakan tool `git-dumper` untuk merekonstruksi seluruh repo dan periksa git log untuk menemukan flag yang pernah di-commit lalu dihapus.",
    "pentest_notes": "Exposed .env atau backup database adalah temuan Critical yang wajib segera diberitahukan ke kontak darurat client.",
    "unknown_guide": {
      "what_is_this": "File cadangan atau konfigurasi sistem yang tidak sengaja diletakkan di folder publik web server.",
      "why_does_it_exist": "Ditinggalkan oleh developer saat mengedit file di server produksi atau melakukan backup manual.",
      "what_parts_matter": "Isi kode sumber, password database, API key, dan rute internal.",
      "what_normal_looks_like": "File konfigurasi tidak pernah dapat diakses melalui browser web.",
      "what_to_record_immediately": ["URL file backup", "Daftar kredensial yang tertera di dalamnya"]
    },
    "negative_result_guide": {
      "summary": "Tidak ditemukan file backup di web root.",
      "why_not_secure": "Aplikasi mungkin masih memiliki endpoint API tersembunyi atau panel admin di subdomain lain.",
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

  // 5. obs-web-admin-panel
  {
    "id": "obs-web-admin-panel",
    "title": "Panel Administrasi Terdeteksi (Admin Panel / Management Portal)",
    "domain": "Administration & Access Control",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Path URL: /admin, /administrator, /manage, /controlpanel, /cpanel, /wp-admin",
      "Judul halaman: 'Admin Dashboard', 'Management Console', 'Superuser Portal'",
      "Form login terpisah dari login pengguna umum"
    ],
    "context": "Ditemukan via fuzzing direktori, link di footer, atau crawling halaman awal.",
    "why_it_matters": "Panel admin memegang kendali tertinggi atas fungsionalitas dan data aplikasi. Menemukan panel admin membuka pengujian kredensial default vendor, pembatasan IP (IP whitelisting), autentikasi bypass, dan fitur administratif berbahaya (seperti fitur database backup, custom SQL query, atau upload plugin) yang berujung pada RCE.",
    "questions_to_ask": [
      "Apakah panel admin dapat diakses publik atau dibatasi oleh IP/VPN?",
      "Software atau CMS apa yang menjalankan panel ini (WordPress, Joomla, cPanel, custom framework)?",
      "Apakah ada kredensial default bawaan vendor yang belum diubah?",
      "Apakah ada fitur manajemen pengguna atau eksekusi perintah di dalamnya?"
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
      },
      {
        "id": "admin-default-creds",
        "name": "Uji Kredensial Default Vendor & Software",
        "why_check": "Mendeteksi apakah setup awal menggunakan password standar dokumentasi.",
        "what_to_look_for": ["admin:admin, admin:password, root:root, administrator:password"],
        "normal_baseline": "Akun default dinonaktifkan atau diwajibkan mengganti password kuat saat instalasi.",
        "interesting_clues": ["Kredensial default berhasil masuk dan membuka kontrol panel"],
        "evidence_to_capture": ["Log request & response login sukses", "Screenshot antarmuka admin aktif"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-admin-default-pass",
        "inspection_point_id": "admin-default-creds",
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
    "ctf_notes": "Di CTF, begitu masuk ke panel admin (misal: WordPress), langkah berikutnya hampir selalu upload plugin PHP jahat atau edit file template `404.php` untuk mendapatkan reverse shell.",
    "pentest_notes": "Exposed Admin Panel tanpa IP restriction adalah temuan Medium; jika dapat diakses dengan default creds, severity meningkat menjadi Critical.",
    "unknown_guide": {
      "what_is_this": "Halaman antarmuka khusus untuk administrator mengelola seluruh sistem web.",
      "why_does_it_exist": "Mempermudah staf IT mengatur pengguna, konfigurasi, dan database secara visual.",
      "what_parts_matter": "URL akses, perlindungan jaringan (IP restriction), dan kekuatan kredensial akun.",
      "what_normal_looks_like": "Hanya dapat dibuka dari jaringan internal perusahaan dan mewajibkan otentikasi MFA.",
      "what_to_record_immediately": ["URL panel admin", "Nama vendor software (jika CMS)", "Respon terhadap kredensial default"]
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

  // 6. obs-web-api-endpoint
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
    "why_it_matters": "API backend sering kali dirancang dengan asumsi bahwa pemanggilnya hanyalah aplikasi frontend mereka sendiri. Ini sering kali menyebabkan hilangnya validasi otorisasi di sisi backend (BOLA/IDOR), paparan data berlebih (Excessive Data Exposure), dan manipulasi metode HTTP (misal: GET diizinkan, namun PUT/DELETE tidak memvalidasi hak akses).",
    "questions_to_ask": [
      "Bagaimana API mengotentikasi request (Bearer Token JWT, API Key di header, atau cookie)?",
      "Apakah ada endpoint dokumentasi publik (Swagger / OpenAPI UI di /api/docs atau /swagger-ui.html)?",
      "Apakah mengubah metode HTTP (GET menjadi POST/PUT/DELETE) diterima oleh server?",
      "Apakah respon JSON memuat properti data sensitif yang tidak ditampilkan di antarmuka UI?"
    ],
    "inspection_points": [
      {
        "id": "api-excessive-data",
        "name": "Audit Paparan Data Berlebih (Excessive Data Exposure)",
        "why_check": "Melihat apakah backend mengirim seluruh objek database ke client dan hanya memfilter tampilan di JavaScript.",
        "what_to_look_for": ["Field tersembunyi di JSON: password_hash, ssn, role, internal_notes, reset_token"],
        "normal_baseline": "API hanya mengembalikan atribut spesifik yang dibutuhkan oleh antarmuka pengguna saat ini.",
        "interesting_clues": ["Respon JSON untuk profil publik memuat hash password atau alamat email pribadi user lain"],
        "evidence_to_capture": ["Body response JSON mentah lengkap dari Burp Suite"]
      },
      {
        "id": "api-docs-exposure",
        "name": "Discovery Dokumentasi API (Swagger / Postman / GraphQL)",
        "why_check": "Mendapatkan peta lengkap seluruh endpoint, parameter, dan skema request backend secara instan.",
        "what_to_look_for": ["/api/swagger.json", "/v1/api-docs", "/openapi.json", "/graphql"],
        "normal_baseline": "Dokumentasi API dimatikan di lingkungan produksi publik.",
        "interesting_clues": ["Swagger UI interaktif terbuka publik dan memungkinkan pengujian langsung seluruh endpoint"],
        "evidence_to_capture": ["Tangkapan layar halaman Swagger UI", "File schema openapi.json"]
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
    "unexpected_signals": ["Mengirim Content-Type: application/xml ke endpoint JSON menghasilkan eksekusi XML parser (XXE via API)"],
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
    "stop_conditions": ["API hanya mengembalikan data publik minimal, memvalidasi otorisasi di setiap request, dan mendokumentasikan skema secara privat."],
    "common_mistakes": ["Hanya menguji metode GET dan lupa mencoba POST, PUT, DELETE, atau PATCH pada endpoint API."],
    "ctf_notes": "Di CTF, endpoint API sering kali tidak memiliki rate limiting sehingga brute force PIN atau token reset dapat dilakukan dengan sangat cepat.",
    "pentest_notes": "Dokumentasikan endpoint yang tidak terdaftar di dokumentasi resmi (Shadow APIs) sebagai finding manajemen aset.",
    "unknown_guide": {
      "what_is_this": "Antarmuka pertukaran data antar sistem yang menggunakan format terstruktur (biasanya JSON).",
      "why_does_it_exist": "Menghubungkan frontend web atau aplikasi mobile dengan server database pusat.",
      "what_parts_matter": "Token otentikasi di header, struktur data JSON yang dikirim dan diterima, serta URL rute API.",
      "what_normal_looks_like": "Mengirim data yang terenkripsi dan memvalidasi izin pengguna secara ketat pada setiap pemanggilan.",
      "what_to_record_immediately": ["URL endpoint API", "Header Authorization yang digunakan", "Struktur body JSON"]
    },
    "negative_result_guide": {
      "summary": "Endpoint API membatasi data respon dan memvalidasi otentikasi dengan benar.",
      "why_not_secure": "Akses API mungkin aman pada versi v2, namun versi lama v1 masih aktif di server tanpa otentikasi.",
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
  }
];

for (const n of fullSeedNodes) {
  nodeMap.set(n.id, n);
}

// Write the complete updated file
const result = Array.from(nodeMap.values());
fs.writeFileSync(TARGET_FILE, JSON.stringify(result, null, 2), 'utf8');
console.log(`🎉 Successfully updated observations.json with total: ${result.length} nodes.`);
