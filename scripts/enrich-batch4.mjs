/**
 * enrich-batch4.mjs — Final batch enrichment for remaining 13 web nodes
 * Targets:
 * 1. obs-web-registration
 * 2. obs-web-mfa-otp
 * 3. obs-web-cookie-attributes
 * 4. obs-web-url-query-param
 * 5. obs-web-search-field
 * 6. obs-web-form-input
 * 7. obs-web-error-message
 * 8. obs-web-backup-config-file
 * 9. obs-web-admin-panel
 * 10. obs-web-api-endpoint
 * 11. obs-web-oauth-sso
 * 12. obs-web-cors-headers
 * 13. obs-web-technology-fingerprint
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OBS_DIR = path.resolve(__dirname, '../src/data/observations');

const batch4Enrichments = {
  // 1. Registration
  'obs-web-registration': {
    inspection_points_add: [
      {
        id: 'reg-role-assignment-mass',
        name: '2. Mass Assignment pada Parameter Registrasi',
        why_check: 'Form pendaftaran sering mengekspos parameter tersembunyi seperti role, is_admin, atau account_type.',
        what_to_look_for: [
          'Intercept request POST /register di Burp Suite',
          'Tambahkan parameter JSON/form: "role": "admin", "is_admin": true, "group": "administrators"',
          'Periksa apakah parameter tersebut diterima tanpa validasi server-side'
        ],
        normal_baseline: 'Server mengabaikan field yang tidak diizinkan atau mengembalikan error 400 Bad Request.',
        interesting_clues: [
          'Akun baru langsung memiliki hak akses administrator setelah login',
          'Response JSON mengonfirmasi "role": "admin" pada object profil yang dibuat'
        ],
        evidence_to_capture: ['Request POST /register dengan parameter injeksi', 'Response JSON registrasi']
      },
      {
        id: 'reg-email-verification-bypass',
        name: '3. Alur Verifikasi Email & Auto-Login',
        why_check: 'Menentukan apakah aplikasi langsung memberikan sesi login aktif sebelum email divalidasi.',
        what_to_look_for: [
          'Daftar dengan email acak non-existent (misal: test@nonexistent.xyz)',
          'Periksa apakah session cookie langsung diberikan di respons',
          'Coba akses fungsionalitas sensitif tanpa klik link verifikasi email'
        ],
        normal_baseline: 'Aplikasi membatasi hak akses hingga link token verifikasi email diklik.',
        interesting_clues: [
          'Aplikasi langsung memberikan full access tanpa memverifikasi kepemilikan email'
        ],
        evidence_to_capture: ['Header Set-Cookie dari respons registrasi']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-reg-mass-assign-admin',
        inspection_point_id: 'reg-role-assignment-mass',
        signal_description: 'Injeksi parameter "is_admin": true pada endpoint registrasi berhasil membuat akun admin.',
        output_snippet: 'POST /api/v1/users/register HTTP/1.1\n{"username":"attacker","password":"Password123!","is_admin":true}\n\nHTTP/1.1 201 Created\n{"id":42,"username":"attacker","role":"admin","is_admin":true}',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Kerentanan Mass Assignment aktif pada form registrasi, memungkinkan eskalasi privilege langsung ke role administrator.',
        hypothesis_id: 'hyp-reg-mass-assign',
        evidence_to_capture: ['Full HTTP request dan response registrasi']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-reg-mass-assign',
        name: 'Privilege Escalation via Registration Mass Assignment',
        description: 'Parameter role atau admin pada request registrasi tidak difilter di sisi server.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-reg-mass-assign-admin'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Login dengan akun yang baru didaftarkan, buka endpoint panel kontrol /admin.',
            expected_output: '403 Forbidden.',
            interesting_output: '200 OK dengan dashboard admin penuh.',
            unexpected_output: 'Redirect ke halaman login.',
            interpretation: 'Akses admin berhasil → Mass assignment tervalidasi.',
            evidence_to_record: ['Screenshot dashboard admin dengan akun tester baru']
          }
        ]
      }
    ]
  },

  // 2. MFA / OTP
  'obs-web-mfa-otp': {
    inspection_points_add: [
      {
        id: 'mfa-rate-limiting-brute',
        name: '2. Ketahanan Brute-Force & Rate Limiting OTP',
        why_check: 'OTP 4-6 digit memiliki ruang kunci kecil (10.000 - 1.000.000 kemungkinan) yang rentan di-brute-force tanpa proteksi.',
        what_to_look_for: [
          'Kirim 10 request OTP salah berurutan melalui Burp Intruder',
          'Periksa apakah ada header Retry-After, status 429, atau captcha',
          'Uji apakah IP-rotation (header X-Forwarded-For) membypass pembatasan rate limit'
        ],
        normal_baseline: 'Akun dikunci atau request di-throttle setelah 3-5 kali percobaan OTP salah.',
        interesting_clues: [
          'Tidak ada delay atau blokir setelah 20+ percobaan salah',
          'Header status tetap 200 OK dengan pesan "Invalid code" tanpa pembatasan'
        ],
        evidence_to_capture: ['Tabel response Burp Intruder membuktikan ketiadaan rate limit']
      },
      {
        id: 'mfa-response-manipulation',
        name: '3. Response Code Manipulation & Direct Endpoint Browsing',
        why_check: 'Beberapa aplikasi web mengecek MFA di sisi klien (frontend) dan mengizinkan bypass jika respons JSON dimodifikasi.',
        what_to_look_for: [
          'Intercept response verifikasi OTP di Burp Suite',
          'Ubah {"success": false, "code": "INVALID"} menjadi {"success": true}',
          'Coba akses langsung URL dashboard (/dashboard) sebelum submit OTP'
        ],
        normal_baseline: 'Server memverifikasi token sesi MFA di backend pada setiap request ke endpoint dashboard.',
        interesting_clues: [
          'Browser me-redirect ke dashboard dan mengaktifkan sesi penuh setelah manipulasi respons JSON',
          'Akses langsung ke /dashboard berhasil tanpa menyelesaikan MFA'
        ],
        evidence_to_capture: ['Screenshot Burp response interception dan respons yang dimodifikasi']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-mfa-response-tamper-bypass',
        inspection_point_id: 'mfa-response-manipulation',
        signal_description: 'Mengubah status respons OTP dari 401 ke 200 dengan payload success:true membypass MFA secara menyeluruh.',
        output_snippet: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"status":"success","mfa_verified":true,"redirect":"/dashboard"}',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Validasi MFA hanya dilakukan di frontend JavaScript, backend tidak menerapkan state verification yang ketat.',
        hypothesis_id: 'hyp-mfa-client-bypass',
        evidence_to_capture: ['Burp match & replace rule', 'Screenshot dashboard yang terbuka']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-mfa-client-bypass',
        name: 'MFA Bypass via Response Tampering',
        description: 'Frontend aplikasi mempercayai status respons tanpa verifikasi state di backend.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-mfa-response-tamper-bypass'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Kirim request ke API internal sensitif (/api/user/transactions) dengan session yang dihasilkan dari bypass.',
            expected_output: '401 Unauthorized (MFA required).',
            interesting_output: '200 OK dengan data transaksi penuh.',
            unexpected_output: 'Redirect ke login.',
            interpretation: 'Data transaksi muncul → MFA bypass tervalidasi end-to-end.',
            evidence_to_record: ['Respons API transaksi sensitif']
          }
        ]
      }
    ]
  },

  // 3. Cookie Attributes
  'obs-web-cookie-attributes': {
    inspection_points_add: [
      {
        id: 'cookie-samesite-csrf',
        name: '2. Konfigurasi SameSite & Paparan CSRF',
        why_check: 'SameSite=None tanpa Secure atau ketiadaan SameSite (default browser lama) membuat cookie dikirim pada cross-origin request.',
        what_to_look_for: [
          'Periksa atribut SameSite pada header Set-Cookie: Strict vs Lax vs None',
          'Uji apakah cookie dikirim pada permintaan POST cross-origin dari form HTML lokal',
          'Cek apakah aplikasi memiliki token anti-CSRF independen'
        ],
        normal_baseline: 'SameSite=Lax atau SameSite=Strict pada semua cookie sesi sensitif.',
        interesting_clues: [
          'SameSite=None tanpa atribut anti-CSRF pada form ubah email atau ganti password'
        ],
        evidence_to_capture: ['Header Set-Cookie lengkap', 'PoC file HTML CSRF']
      },
      {
        id: 'cookie-domain-path-scoping',
        name: '3. Scoping Domain & Path Cookie',
        why_check: 'Cookie dengan Domain=.domain.com (wildcard) bocor ke seluruh subdomain termasuk subdomain rentan (staging, dev).',
        what_to_look_for: [
          'Periksa atribut Domain pada Set-Cookie: apakah ada prefix titik (.example.com)?',
          'Periksa atribut Path: apakah dibatasi ke /app atau berlaku untuk / (root)?'
        ],
        normal_baseline: 'Domain tidak menggunakan wildcard dan dibatasi hanya pada FQDN host pengirim.',
        interesting_clues: [
          'Domain=.corp.local memungkinkan pencurian session cookie dari subdomain blog atau dev yang rentan XSS'
        ],
        evidence_to_capture: ['Header Set-Cookie Domain parameter']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-cookie-wildcard-domain-leak',
        inspection_point_id: 'cookie-domain-path-scoping',
        signal_description: 'Cookie sesi dikonfigurasi dengan wildcard domain (.target.com), dapat dibaca oleh sembarang subdomain.',
        output_snippet: 'Set-Cookie: auth_token=9f8e7d6c5b; Domain=.target.com; Path=/; Secure',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Jika attacker menemukan celah XSS pada subdomain target (misal: dev.target.com), session token aplikasi utama dapat disedot.',
        hypothesis_id: 'hyp-cookie-subdomain-hijack',
        evidence_to_capture: ['Set-Cookie Domain parameter']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-cookie-subdomain-hijack',
        name: 'Session Hijacking via Subdomain Scope Overreach',
        description: 'Wildcard domain scoping membocorkan token otentikasi ke subdomain lain.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-cookie-wildcard-domain-leak'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Verifikasi di DevTools browser pada subdomain lain apakah cookie auth_token otomatis tersedia.',
            expected_output: 'Cookie tidak tersedia di subdomain lain.',
            interesting_output: 'Cookie auth_token otomatis terlampir pada request ke subdomain lain.',
            unexpected_output: 'Cookie ditolak oleh browser.',
            interpretation: 'Cookie terlampir → lingkup kebocoran terbukti.',
            evidence_to_record: ['Screenshot cookie storage pada subdomain berbeda']
          }
        ]
      }
    ]
  },

  // 4. URL Query Param
  'obs-web-url-query-param': {
    inspection_points_add: [
      {
        id: 'url-param-reflection-xss',
        name: '2. Refleksi Parameter dalam Respons (Reflected XSS / SSTI)',
        why_check: 'Nilai parameter yang dipantulkan langsung ke HTML response tanpa sanitasi adalah vektor utama XSS.',
        what_to_look_for: [
          'Injeksi string unik: ?q=HanzSecurityTest123',
          'Lihat di page source: di mana string tersebut muncul? (di dalam tag <p>, atribut value="", atau di dalam blok <script>?)',
          'Uji karakter khusus: ?q=test<>"\'/{}'
        ],
        normal_baseline: 'Karakter khusus di-encode menjadi entitas HTML (&lt;&gt;&quot;&#39;).',
        interesting_clues: [
          'Karakter < > muncul mentah tanpa encoding di dalam dokumen HTML',
          'String muncul di dalam blok <script> JavaScript langsung'
        ],
        evidence_to_capture: ['URL request lengkap', 'Cuplikan source code HTML yang memantulkan payload']
      },
      {
        id: 'url-param-open-redirect',
        name: '3. Parameter Pengalihan (Open Redirect / SSRF)',
        why_check: 'Parameter seperti redirect, return, url, next, dest sering kali mengizinkan pengalihan ke domain eksternal berbahaya.',
        what_to_look_for: [
          'Uji URL eksternal: ?redirect=https://google.com atau ?next=//evil.com',
          'Periksa kode status respons: 301, 302, atau 307 dengan header Location: https://google.com'
        ],
        normal_baseline: 'Pengalihan hanya diizinkan ke relative path (/dashboard) atau domain dalam whitelist.',
        interesting_clues: [
          'Header Location mengarahkan browser ke domain luar (Location: https://google.com)'
        ],
        evidence_to_capture: ['Header respons HTTP 302 dengan header Location']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-param-raw-html-reflection',
        inspection_point_id: 'url-param-reflection-xss',
        signal_description: 'Karakter HTML injeksi dipantulkan tanpa sanitasi di dalam tag body.',
        output_snippet: 'GET /search?q=%3Ch1%3EHanz%3C%2Fh1%3E HTTP/1.1\n\nHTTP/1.1 200 OK\n<body>Hasil pencarian untuk: <h1>Hanz</h1></body>',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Reflected XSS terkonfirmasi — browser akan mengeksekusi tag script jika dikirimkan payload JavaScript.',
        hypothesis_id: 'hyp-param-reflected-xss',
        evidence_to_capture: ['URL payload', 'Source HTML browser']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-param-reflected-xss',
        name: 'Reflected Cross-Site Scripting (XSS) via Query Parameter',
        description: 'Input pengguna di-render langsung ke browser korban tanpa encoding.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-param-raw-html-reflection'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Kirim payload non-destruktif: ?q=%3Cscript%3Econsole.log(window.origin)%3C/script%3E',
            expected_output: 'Payload di-encode atau diblokir WAF.',
            interesting_output: 'Origin website tercetak di console browser.',
            unexpected_output: '403 WAF Blocked.',
            interpretation: 'Origin tercetak → eksekusi JavaScript terbukti.',
            evidence_to_record: ['Screenshot console browser']
          }
        ]
      }
    ]
  },

  // 5. Search Field
  'obs-web-search-field': {
    inspection_points_add: [
      {
        id: 'search-sqli-probing',
        name: '2. Probing SQL Injection & Syntax Error',
        why_check: 'Fitur pencarian sering menyusun query SQL dinamis seperti: SELECT * FROM items WHERE title LIKE \'%$search%\'.',
        what_to_look_for: [
          'Injeksi karakter kutip: test\' atau test" atau test\\',
          'Periksa apakah ada pesan error database (SQL syntax error, Unclosed quotation mark)',
          'Uji boolean: test\' OR \'1\'=\'1 dan test\' AND \'1\'=\'2 (apakah jumlah hasil berbeda?)'
        ],
        normal_baseline: 'Pencarian dengan tanda kutip menghasilkan 0 item atau mencari karakter kutip secara literal tanpa error.',
        interesting_clues: [
          'Error database eksplisit (MySQL, SQLite, PostgreSQL)',
          'Hasil pencarian berubah drastis antara kondisi TRUE vs FALSE'
        ],
        evidence_to_capture: ['Teks error SQL lengkap', 'Perbedaan jumlah record antara TRUE vs FALSE']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-search-sql-syntax-error',
        inspection_point_id: 'search-sqli-probing',
        signal_description: 'Injeksi tanda kutip tunggal memicu pesan error SQL syntax dari database backend.',
        output_snippet: 'GET /items?search=phone\' HTTP/1.1\n\nHTTP/1.1 500 Internal Server Error\nFatal error: Uncaught mysqli_sql_exception: You have an error in your SQL syntax near \'\'phone\'%\' in /var/www/search.php:12',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Parameter pencarian rentan terhadap SQL Injection, memungkinkan ekstraksi seluruh database via UNION based atau Error based SQLi.',
        hypothesis_id: 'hyp-search-sqli-extract',
        evidence_to_capture: ['Error message lengkap', 'URL parameter pencarian']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-search-sqli-extract',
        name: 'Data Extraction via SQL Injection in Search Feature',
        description: 'Kueri pencarian tidak menggunakan parameterized query sehingga attacker dapat memanipulasi logika SQL.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-search-sql-syntax-error'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Uji query aman version lookup: search=phone\' UNION SELECT @@version,2,3-- -',
            expected_output: 'Query diblokir atau error.',
            interesting_output: 'Versi database (misal: 10.5.12-MariaDB) muncul di daftar hasil pencarian.',
            unexpected_output: '500 generic error.',
            interpretation: 'Versi DB muncul → UNION SQLi terbukti 100%.',
            evidence_to_record: ['Screenshot hasil pencarian yang memuat versi DB']
          }
        ]
      }
    ]
  },

  // 6. Form Input & CSRF
  'obs-web-form-input': {
    inspection_points_add: [
      {
        id: 'form-csrf-token-validation',
        name: '2. Analisis Keberadaan & Validasi CSRF Token',
        why_check: 'Form tindakan sensitif (ubah password, transfer dana, ubah email) tanpa token CSRF rentan terhadap aksi paksa.',
        what_to_look_for: [
          'Periksa apakah ada hidden input: <input type="hidden" name="csrf_token" value="...">',
          'Uji: kirim form tanpa csrf_token parameter — apakah request tetap berhasil?',
          'Uji: ubah nilai token menjadi sembarang string atau token user lain'
        ],
        normal_baseline: 'Server menolak request tanpa CSRF token yang valid (403 Forbidden / CSRF token mismatch).',
        interesting_clues: [
          'Form sensitif tidak menyertakan input CSRF token sama sekali',
          'Server menerima request ketika parameter csrf_token dihapus seluruhnya'
        ],
        evidence_to_capture: ['Source code HTML form', 'Respons HTTP saat token dihapus']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-form-missing-csrf-validation',
        inspection_point_id: 'form-csrf-token-validation',
        signal_description: 'Request perubahan password berhasil dieksekusi saat parameter csrf_token dihapus.',
        output_snippet: 'POST /user/update-email HTTP/1.1\nCookie: session=abc123\nemail=attacker@evil.com\n\nHTTP/1.1 200 OK\n{"status":"email_updated"}',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'CSRF token tidak divalidasi oleh backend, memungkinkan pembuatan halaman web jebakan yang mengubah email korban secara otomatis.',
        hypothesis_id: 'hyp-form-csrf-account-takeover',
        evidence_to_capture: ['Request POST tanpa csrf_token', 'Respons 200 OK email_updated']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-form-csrf-account-takeover',
        name: 'Cross-Site Request Forgery (CSRF) Account Takeover',
        description: 'Ketiadaan validasi CSRF token memungkinkan penyerang memalsukan request atas nama korban yang sedang login.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-form-missing-csrf-validation'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Buat file PoC HTML sederhana dengan auto-submit form ke endpoint target, buka di browser terotentikasi.',
            expected_output: 'Browser diblokir oleh SameSite atau server menolak permintaan.',
            interesting_output: 'Email akun berubah tanpa interaksi eksplisit selain membuka halaman.',
            unexpected_output: 'Captcha diminta.',
            interpretation: 'Email berubah → CSRF terkonfirmasi valid.',
            evidence_to_record: ['File PoC HTML CSRF', 'Screenshot perubahan data']
          }
        ]
      }
    ]
  },

  // 7. Error Message
  'obs-web-error-message': {
    inspection_points_add: [
      {
        id: 'err-stack-trace-secrets',
        name: '2. Stack Trace & Pembocoran Kode Sumber / Path Sistem',
        why_check: 'Pesan error debug sering mencantumkan path direktori server, nama file, konfigurasi database, dan baris kode rentan.',
        what_to_look_for: [
          'Periksa apakah error menampilkan path internal (misal: /var/www/vhosts/app/config/database.php)',
          'Lihat apakah ada potongan kode PHP/Python/Java yang ditampilkan',
          'Cari credentials atau database connection string yang tercantum dalam exception stack'
        ],
        normal_baseline: 'Halaman error generik (500 Internal Server Error kustom) tanpa detail internal.',
        interesting_clues: [
          'Stack trace lengkap framework (Django debug page, Laravel Whoops, Spring Whitelabel)',
          'Path instalasi server dan username sistem operasi bocor'
        ],
        evidence_to_capture: ['Screenshot halaman error debug lengkap', 'Path sistem yang bocor']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-err-framework-debug-active',
        inspection_point_id: 'err-stack-trace-secrets',
        signal_description: 'Halaman interaktif debug framework (Laravel Ignition / Django Debug) aktif di server produksi.',
        output_snippet: 'HTTP/1.1 500 Internal Server Error\nTitle: Flare Exception - Laravel Ignition\nEnvironment: production\nDatabase: mysql://root:SuperSecretPass@127.0.0.1:3306/prod_db',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Mode debug aktif di server produksi membocorkan database credentials dan sering kali memiliki endpoint eksekusi kode (Ignition RCE CVE-2021-3129).',
        hypothesis_id: 'hyp-err-debug-rce',
        evidence_to_capture: ['Full HTML response debug page', 'Kredensial yang bocor (redacted)']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-err-debug-rce',
        name: 'Information Disclosure & RCE via Exposed Debug Interface',
        description: 'Interface debug yang aktif mengekspos kredensial database atau mengizinkan manipulasi kode.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-err-framework-debug-active'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Verifikasi kredensial database yang bocor dengan mencoba koneksi lokal atau cek versi Ignition.',
            expected_output: 'Kredensial sudah diganti atau tidak dapat diakses dari luar.',
            interesting_output: 'Versi framework rentan CVE-2021-3129 terkonfirmasi.',
            unexpected_output: 'Halaman debug dinonaktifkan.',
            interpretation: 'Debug page aktif adalah temuan valid High/Critical.',
            evidence_to_record: ['Screenshot informasi sensitif']
          }
        ]
      }
    ]
  },

  // 8. Backup & Config Files
  'obs-web-backup-config-file': {
    inspection_points_add: [
      {
        id: 'backup-git-env-discovery',
        name: '2. Deteksi Folder .git dan File .env',
        why_check: 'Folder .git yang terekspos memungkinkan rekonstruksi seluruh source code aplikasi via git-dumper.',
        what_to_look_for: [
          'curl -I http://TARGET/.env dan curl -I http://TARGET/.git/HEAD',
          'Periksa status respons: 200 OK dengan konten "ref: refs/heads/master" untuk .git/HEAD',
          'Gunakan gobuster / ffuf dengan wordlist backup: .env, .git, config.php.bak, backup.sql'
        ],
        normal_baseline: 'Server mengembalikan 404 Not Found atau 403 Forbidden untuk semua file tersembunyi.',
        interesting_clues: [
          '.git/HEAD mengembalikan 200 OK dengan format teks Git yang valid',
          '.env mengembalikan 200 OK dengan kredensial database dan API keys'
        ],
        evidence_to_capture: ['Output curl -i http://TARGET/.git/HEAD', 'Baris pertama file .env (redacted)']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-backup-git-exposed',
        inspection_point_id: 'backup-git-env-discovery',
        signal_description: 'Direktori .git terekspos dan dapat diunduh, memungkinkan dump source code lengkap.',
        output_snippet: '$ curl -i http://192.168.1.40/.git/HEAD\nHTTP/1.1 200 OK\nContent-Type: text/plain\n\nref: refs/heads/main',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Attacker dapat menggunakan git-dumper untuk mengunduh seluruh repository termasuk commit history, source code, dan hardcoded API keys.',
        hypothesis_id: 'hyp-backup-git-source-dump',
        evidence_to_capture: ['Response curl .git/HEAD', 'Contoh commit log hasil git-dumper']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-backup-git-source-dump',
        name: 'Full Source Code Disclosure via Exposed Git Repository',
        description: 'Folder metadata .git di web root tidak diblokir web server, memungkinkan source code reconstruction.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-backup-git-exposed'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Jalankan uji aman: curl -s http://TARGET/.git/config | grep -i "url"',
            expected_output: '403 Forbidden atau 404.',
            interesting_output: 'URL repository internal atau konfigurasi Git remote muncul.',
            unexpected_output: 'HTML redirect.',
            interpretation: 'File config terbaca → dump source code tervalidasi 100%.',
            evidence_to_record: ['Cuplikan file .git/config']
          }
        ]
      }
    ]
  },

  // 9. Admin Panel
  'obs-web-admin-panel': {
    inspection_points_add: [
      {
        id: 'admin-default-cred-bypass',
        name: '2. Pengujian Kredensial Default & IP Restriction',
        why_check: 'Panel administrasi internal sering kali menggunakan password default (admin/admin) atau tidak menerapkan IP restriction.',
        what_to_look_for: [
          'Uji kombinasi default: admin:admin, admin:password, admin:123456, root:root',
          'Cek apakah IP whitelist dapat dibypass via header: X-Forwarded-For: 127.0.0.1, X-Real-IP: 127.0.0.1',
          'Periksa apakah ada mekanisme CAPTCHA atau akun lockout'
        ],
        normal_baseline: 'Panel admin dilindungi MFA, IP restricted (403), dan kredensial default diganti.',
        interesting_clues: [
          'Login berhasil dengan kredensial default vendor',
          'Header X-Forwarded-For: 127.0.0.1 mengubah status respons dari 403 ke 200 OK'
        ],
        evidence_to_capture: ['Screenshot login panel admin', 'Header manipulasi IP yang berhasil']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-admin-ip-bypass-header',
        inspection_point_id: 'admin-default-cred-bypass',
        signal_description: 'Menambahkan header X-Forwarded-For: 127.0.0.1 membypass blokir IP 403 pada panel admin.',
        output_snippet: 'GET /admin HTTP/1.1\nHost: target.com\nX-Forwarded-For: 127.0.0.1\n\nHTTP/1.1 200 OK\n<title>Enterprise Administration Dashboard</title>',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Reverse proxy / load balancer mempercayai header IP client secara membabi buta, memungkinkan bypass pembatasan jaringan internal.',
        hypothesis_id: 'hyp-admin-bypass-takeover',
        evidence_to_capture: ['Request dengan header X-Forwarded-For', 'Halaman admin yang terbuka']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-admin-bypass-takeover',
        name: 'Administrative Access via Reverse Proxy IP Spoofing',
        description: 'Pembatasan akses admin berbasis IP dapat dilewati dengan memalsukan header IP forwarding.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-admin-ip-bypass-header'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Akses halaman admin dengan dan tanpa header X-Forwarded-For, bandingkan status kodenya (403 vs 200).',
            expected_output: 'Keduanya menghasilkan 403 Forbidden.',
            interesting_output: 'Dengan header menghasilkan 200 OK, tanpa header menghasilkan 403 Forbidden.',
            unexpected_output: 'Redirect ke portal login eksternal.',
            interpretation: 'Perbedaan status membuktikan bypass IP restriction.',
            evidence_to_record: ['Perbandingan request & response berdampingan']
          }
        ]
      }
    ]
  },

  // 10. API Endpoint
  'obs-web-api-endpoint': {
    inspection_points_add: [
      {
        id: 'api-schema-swagger-docs',
        name: '2. Pencarian Skema API & Dokumentasi Swagger/OpenAPI',
        why_check: 'Dokumentasi Swagger atau OpenAPI membocorkan seluruh endpoint tersembunyi, struktur payload, dan parameter internal.',
        what_to_look_for: [
          'Cek endpoint dokumentasi standar: /swagger-ui.html, /v2/api-docs, /openapi.json, /api/swagger',
          'Periksa apakah ada endpoint versi lama yang masih aktif: /api/v1/ vs /api/v2/',
          'Cari endpoint GraphQL: /graphql, /graphiql (apakah introspection query diizinkan?)'
        ],
        normal_baseline: 'Dokumentasi API diproteksi otentikasi internal atau dinonaktifkan di environment produksi.',
        interesting_clues: [
          'Swagger UI terbuka untuk publik tanpa otentikasi',
          'GraphQL introspection query mengembalikan skema lengkap database dan mutation'
        ],
        evidence_to_capture: ['URL dokumentasi Swagger/OpenAPI yang dapat diakses', 'Daftar endpoint sensitif']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-api-swagger-public-exposed',
        inspection_point_id: 'api-schema-swagger-docs',
        signal_description: 'Dokumentasi Swagger UI terbuka ke publik, menampilkan endpoint internal administratif.',
        output_snippet: 'GET /v2/api-docs HTTP/1.1\n\nHTTP/1.1 200 OK\nContent-Type: application/json\n{"swagger":"2.0","paths":{"/api/internal/users/delete":{"post":{...}}}}',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Seluruh struktur API dapat dipelajari attacker secara instan tanpa perlu fuzzing manual.',
        hypothesis_id: 'hyp-api-schema-abuse',
        evidence_to_capture: ['Cuplikan file api-docs JSON']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-api-schema-abuse',
        name: 'Targeted API Abuse via Public Swagger Documentation',
        description: 'Endpoint internal dan parameter tidak terdokumentasi ditemukan melalui file spesifikasi OpenAPI publik.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-api-swagger-public-exposed'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Pilih satu endpoint non-destruktif dari Swagger (contoh: GET /api/v1/system/status), uji tanpa auth.',
            expected_output: '401 Unauthorized.',
            interesting_output: '200 OK dengan informasi status internal sistem.',
            unexpected_output: '404 Not Found.',
            interpretation: 'Endpoint aktif tanpa otentikasi terkonfirmasi.',
            evidence_to_record: ['Respons dari endpoint status']
          }
        ]
      }
    ]
  },

  // 11. OAuth / SSO
  'obs-web-oauth-sso': {
    inspection_points_add: [
      {
        id: 'oauth-state-csrf-redirect',
        name: '2. Parameter State & Validasi Redirect URI',
        why_check: 'Parameter state wajib melindungi alur OAuth dari serangan Login CSRF. Redirect URI yang longgar memungkinkan pencurian kode otorisasi.',
        what_to_look_for: [
          'Periksa request /oauth/authorize: apakah ada parameter &state=?',
          'Uji: kirim auth request tanpa parameter state atau dengan state statis',
          'Uji redirect_uri: ubah redirect_uri=https://target.com/callback menjadi https://evil.com atau https://target.com.evil.com'
        ],
        normal_baseline: 'Server menolak request tanpa state atau dengan redirect_uri yang tidak ada dalam exact whitelist.',
        interesting_clues: [
          'Parameter state tidak ada atau tidak divalidasi server saat callback',
          'Server menerima wildcard redirect_uri (redirect_uri=https://target.com/*)'
        ],
        evidence_to_capture: ['URL auth request lengkap', 'Respons error atau respons redirect server']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-oauth-redirect-uri-bypass',
        inspection_point_id: 'oauth-state-csrf-redirect',
        signal_description: 'Server OAuth menerima redirect_uri ke domain eksternal penyerang, membocorkan kode otorisasi.',
        output_snippet: 'GET /oauth/authorize?client_id=123&redirect_uri=https://attacker.com/callback&response_type=code HTTP/1.1\n\nHTTP/1.1 302 Found\nLocation: https://attacker.com/callback?code=AUTH_CODE_SECRET',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Attacker dapat mencuri authorization code pengguna dan menukarnya dengan akses token untuk membajak akun korban.',
        hypothesis_id: 'hyp-oauth-code-theft',
        evidence_to_capture: ['Header Location yang mengarah ke attacker.com dengan auth code']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-oauth-code-theft',
        name: 'Account Takeover via OAuth Redirect URI Poisoning',
        description: 'Validasi redirect URI yang cacat memungkinkan pencurian token atau authorization code korban.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-oauth-redirect-uri-bypass'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Uji dengan domain aman yang dikontrol tester (contoh: Burp Collaborator), verifikasi apakah code terkirim.',
            expected_output: 'Error: invalid redirect_uri.',
            interesting_output: 'Interaksi diterima di Collaborator dengan parameter ?code=.',
            unexpected_output: 'Otentikasi dibatalkan.',
            interpretation: 'Code diterima di server luar → kerentanan kritis OAuth tervalidasi.',
            evidence_to_record: ['Log Collaborator yang memuat kode otorisasi']
          }
        ]
      }
    ]
  },

  // 12. CORS Headers
  'obs-web-cors-headers': {
    inspection_points_add: [
      {
        id: 'cors-origin-reflection-creds',
        name: '2. Origin Reflection & Access-Control-Allow-Credentials',
        why_check: 'Kombinasi Origin reflection sembarang dengan Allow-Credentials: true memungkinkan situs jahat membaca data privat pengguna via AJAX.',
        what_to_look_for: [
          'Kirim request dengan header: Origin: https://evil.com',
          'Cek apakah respons memuat: Access-Control-Allow-Origin: https://evil.com',
          'Cek apakah ada: Access-Control-Allow-Credentials: true',
          'Uji variasi: Origin: null, Origin: https://target.com.evil.com'
        ],
        normal_baseline: 'Origin eksternal tidak dipantulkan atau dibatasi hanya pada domain terpercaya (Strict CORS Whitelist).',
        interesting_clues: [
          'Allow-Origin memantulkan persis domain attacker dan Allow-Credentials bernilai true',
          'Origin: null diterima dan diizinkan membawa credentials'
        ],
        evidence_to_capture: ['Request dan response headers CORS', 'PoC script JavaScript exploit']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-cors-arbitrary-origin-credentials',
        inspection_point_id: 'cors-origin-reflection-creds',
        signal_description: 'Server memantulkan sembarang Origin penyerang dan mengaktifkan Allow-Credentials: true.',
        output_snippet: 'GET /api/user/profile HTTP/1.1\nOrigin: https://attacker.com\nCookie: session=xyz\n\nHTTP/1.1 200 OK\nAccess-Control-Allow-Origin: https://attacker.com\nAccess-Control-Allow-Credentials: true',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Konfigurasi CORS rentan total — attacker dapat mencuri data PII, email, dan API token pengguna saat pengguna mengunjungi website attacker.',
        hypothesis_id: 'hyp-cors-data-theft',
        evidence_to_capture: ['Headers CORS lengkap', 'Bukti response body memuat data privat']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-cors-data-theft',
        name: 'Sensitive Data Theft via Insecure Cross-Origin Resource Sharing (CORS)',
        description: 'Origin yang tidak divalidasi memungkinkan website eksternal membaca data terautentikasi pengguna.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-cors-arbitrary-origin-credentials'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Buat file HTML lokal dengan script fetch() yang meminta data profile dengan mode credentials: "include".',
            expected_output: 'Browser memblokir pembacaan respons karena CORS policy.',
            interesting_output: 'Data JSON profil pengguna berhasil dibaca dan ditampilkan di layar.',
            unexpected_output: 'Cookie tidak terlampir.',
            interpretation: 'Data berhasil dibaca via cross-origin script → CORS exploit tervalidasi.',
            evidence_to_record: ['Screenshot data yang terbaca dari origin eksternal']
          }
        ]
      }
    ]
  },

  // 13. Technology Fingerprint
  'obs-web-technology-fingerprint': {
    inspection_points_add: [
      {
        id: 'tech-wappalyzer-whatweb-audit',
        name: '2. Fingerprinting Framework, CMS & Server Headers',
        why_check: 'Mengetahui exact stack (PHP 7.4 vs Node.js vs ASP.NET, Apache vs Nginx) memfokuskan pencarian exploit spesifik.',
        what_to_look_for: [
          'Header HTTP respons: Server, X-Powered-By, X-AspNet-Version, X-Generator',
          'Struktur cookie: PHPSESSID (PHP), JSESSIONID (Java), connect.sid (Node.js), ASP.NET_SessionId',
          'Path aset khas: /wp-content/ (WordPress), /sites/default/ (Drupal), /_next/ (Next.js)',
          'whatweb -v http://TARGET atau whatweb -a 3 http://TARGET'
        ],
        normal_baseline: 'Header versi di-strip (Server: generic) dan aset diminifikasi tanpa komentar framework.',
        interesting_clues: [
          'Header membocorkan versi detail: X-Powered-By: PHP/5.4.16 (versi usang rentan)',
          'Path halaman login khas CMS yang belum di-hardening (/wp-login.php, /administrator/)'
        ],
        evidence_to_capture: ['Output whatweb lengkap', 'Daftar header teknologi']
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-tech-obsolete-framework-leak',
        inspection_point_id: 'tech-wappalyzer-whatweb-audit',
        signal_description: 'Header dan favicon mengonfirmasi CMS WordPress versi usang dengan plugin rentan.',
        output_snippet: '$ whatweb -v http://192.168.1.60\n[ WordPress ] 5.0.1, [ PHP ] 7.2.10, [ Apache ] 2.4.29\nUncommonHeaders: x-redirect-by: WordPress',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'WordPress 5.0.1 memiliki kerentanan Remote Code Execution (CVE-2019-8942 / Crop-image RCE), siap dieksploitasi jika ada akses author.',
        hypothesis_id: 'hyp-tech-cms-cve-audit',
        evidence_to_capture: ['Output whatweb lengkap', 'Daftar plugin via wpscan']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-tech-cms-cve-audit',
        name: 'CMS Exploitation Based on Technology Fingerprint',
        description: 'Versi CMS dan plugin yang diidentifikasi dicocokkan dengan CVE database untuk eksploitasi terarah.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-tech-obsolete-framework-leak'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Jalankan scanner khusus teknologi (contoh: wpscan --url http://TARGET -e vp,vt --api-token TOKEN).',
            expected_output: '0 vulnerabilities found atau versi terupdate.',
            interesting_output: 'Ditemukan plugin dengan CVE RCE atau arbitrary file upload publik.',
            unexpected_output: 'WAF memblokir scan.',
            interpretation: 'CVE terkonfirmasi → lanjut ke workflow spesifik CMS.',
            evidence_to_record: ['Output wpscan report summary']
          }
        ]
      }
    ]
  }
};

function applyEnrichment(node, enrichment) {
  if (enrichment.inspection_points_add) {
    const existingIds = new Set((node.inspection_points || []).map(p => p.id));
    for (const ip of enrichment.inspection_points_add) {
      if (!existingIds.has(ip.id)) node.inspection_points.push(ip);
    }
  }
  if (enrichment.interesting_signals_add) {
    const existingIds = new Set((node.interesting_signals || []).map(s => s.id));
    for (const sig of enrichment.interesting_signals_add) {
      if (!existingIds.has(sig.id)) node.interesting_signals.push(sig);
    }
  }
  if (enrichment.hypotheses_add) {
    const existingIds = new Set((node.hypotheses || []).map(h => h.id));
    for (const hyp of enrichment.hypotheses_add) {
      if (!existingIds.has(hyp.id)) node.hypotheses.push(hyp);
    }
  }
  return node;
}

const files = fs.readdirSync(OBS_DIR).filter(f => f.endsWith('.json'));
let totalEnriched = 0;

for (const file of files) {
  const filePath = path.join(OBS_DIR, file);
  const nodes = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;

  for (let i = 0; i < nodes.length; i++) {
    if (batch4Enrichments[nodes[i].id]) {
      const before = JSON.stringify(nodes[i]).length;
      nodes[i] = applyEnrichment(nodes[i], batch4Enrichments[nodes[i].id]);
      const after = JSON.stringify(nodes[i]).length;
      if (after > before) {
        console.log(`✅ ${nodes[i].id}: IPs=${nodes[i].inspection_points.length}, Sigs=${nodes[i].interesting_signals.length}, Hyps=${nodes[i].hypotheses.length}`);
        changed = true;
        totalEnriched++;
      }
    }
  }

  if (changed) fs.writeFileSync(filePath, JSON.stringify(nodes, null, 2), 'utf8');
}

console.log(`\n✅ Batch 4 enrichment complete: ${totalEnriched} nodes enriched.`);
