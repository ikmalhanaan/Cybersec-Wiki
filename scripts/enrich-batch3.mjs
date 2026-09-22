/**
 * enrich-batch3.mjs — Batch 3 enrichment for 10 infrastructure & specialized nodes
 * Targets:
 * 1. obs-ad-kerberoastable-spn
 * 2. obs-net-open-port-unknown
 * 3. obs-net-service-banner
 * 4. obs-net-rpc
 * 5. obs-net-smtp
 * 6. obs-net-database
 * 7. obs-priv-writable-system
 * 8. obs-priv-credential-history
 * 9. obs-mobile-apk-debuggable
 * 10. obs-crypto-unknown-hash
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OBS_DIR = path.resolve(__dirname, '../src/data/observations');

const batch3Enrichments = {
  // 1. Kerberoasting
  'obs-ad-kerberoastable-spn': {
    inspection_points_add: [
      {
        id: 'spn-encryption-type',
        name: '2. Analisis Enkripsi Tiket TGS (RC4 vs AES)',
        why_check: 'Tiket dengan enkripsi RC4 (etype 23) jauh lebih cepat dan mudah di-crack secara offline dibanding AES-128/AES-256.',
        what_to_look_for: [
          'GetUserSPNs.py DOMAIN/user:pass -request (periksa format hash yang dihasilkan)',
          'Lihat header hash: $krb5tgs$23$ menandakan RC4-HMAC (sangat rentan)',
          'Header $krb5tgs$17$ atau $krb5tgs$18$ menandakan AES128/AES256 (jauh lebih lambat di-crack)',
          'Filter akun service ber-SPN dengan enkripsi lemah via LDAP filter'
        ],
        normal_baseline: 'Lingkungan modern memberlakukan AES-256 untuk Kerberos ticket encryption.',
        interesting_clues: [
          'Semua atau sebagian besar hash TGS menggunakan etype 23 (RC4-HMAC)',
          'Akun service ber-SPN memiliki hak administratif (Domain Admins, Server Operators)',
          'Service account password tidak pernah dirotasi (pwdLastSet sangat lama)'
        ],
        evidence_to_capture: [
          'Hash TGS lengkap ($krb5tgs$23$*...)',
          'Output GetUserSPNs.py yang mencantumkan nama akun, SPN, dan encryption type',
          'Nilai atribut pwdLastSet dari service account'
        ]
      },
      {
        id: 'spn-offline-cracking',
        name: '3. Offline Cracking TGS & Validasi Akses',
        why_check: 'Cracking dilakukan 100% offline tanpa menimbulkan network noise atau account lockout di Domain Controller.',
        what_to_look_for: [
          'hashcat -m 13100 tgs_hashes.txt rockyou.txt -r rules/best64.rule',
          'john --format=krb5tgs --wordlist=rockyou.txt tgs_hashes.txt',
          'Gunakan custom mask/rule jika password diprediksi memiliki pola korporat',
          'Batas waktu pengujian sebelum memutuskan password berentropi tinggi'
        ],
        normal_baseline: 'Password akun service memiliki panjang > 25 karakter acak dan tidak ter-crack.',
        interesting_clues: [
          'Hash berhasil di-crack dalam < 10 menit menggunakan wordlist standar',
          'Password merupakan default vendor atau variasi nama instansi'
        ],
        evidence_to_capture: [
          'Plaintext password hasil cracking',
          'Status log hashcat / john',
          'Verifikasi login: crackmapexec smb IP_DC -u svc_user -p plaintext'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-spn-rc4-tgs-dump',
        inspection_point_id: 'spn-encryption-type',
        signal_description: 'Berhasil me-request TGS ticket berformat RC4-HMAC ($krb5tgs$23$) dari akun service administratif.',
        output_snippet: '$ GetUserSPNs.py CORP.LOCAL/lowuser:Password123 -request\nServicePrincipalName  Name      MemberOf\nMSSQLSvc/db01.corp    sql_svc   CN=Domain Admins,CN=Users,DC=corp\n$krb5tgs$23$*sql_svc$CORP.LOCAL*...',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Akun Domain Admin memiliki SPN dengan enkripsi RC4, memungkinkan cracking offline untuk mengambil alih hak domain administrator.',
        hypothesis_id: 'hyp-kerberoast-privesc',
        evidence_to_capture: ['Output GetUserSPNs.py lengkap', 'Dump hash TGS $krb5tgs$23$']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-kerberoast-privesc',
        name: 'Domain Privilege Escalation via Kerberoasting Domain Admin Service Account',
        description: 'Mendapatkan plaintext credential akun privileged melalui offline cracking TGS ticket, lalu mengambil alih Domain Controller.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-spn-rc4-tgs-dump'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Jalankan hashcat -m 13100 tgs.hash rockyou.txt. Jika berhasil, verifikasi hak akses via crackmapexec.',
            expected_output: 'Hash tidak ter-crack atau password kompleks.',
            interesting_output: 'Hash ter-crack, crackmapexec menampilkan status Pwn3d! pada DC.',
            unexpected_output: 'Akun service didisable atau expired.',
            interpretation: 'Jika Pwn3d! terkonfirmasi → Domain Admin compromise tervalidasi.',
            evidence_to_record: ['Output crackmapexec smb DC -u sql_svc -p <cracked_pw>']
          }
        ]
      }
    ]
  },

  // 2. Network: Unknown Open Port
  'obs-net-open-port-unknown': {
    inspection_points_add: [
      {
        id: 'port-protocol-probing',
        name: '2. Probing Protokol (HTTP/SSL/Raw Binary Probe)',
        why_check: 'Port non-standar sering menjalankan layanan web tersembunyi, debugging console, atau custom RPC.',
        what_to_look_for: [
          'curl -ik http://TARGET:PORT/ dan curl -ik https://TARGET:PORT/',
          'nc -nv TARGET PORT lalu kirim karakter sembarang / enter untuk trigger error banner',
          'nmap -sV --version-intensity 9 -p PORT TARGET',
          'openssl s_client -connect TARGET:PORT -showcerts untuk cek SSL certificate'
        ],
        normal_baseline: 'Port merespons protokol standar dengan banner versi yang jelas atau segera menutup koneksi (RST).',
        interesting_clues: [
          'Merespons dengan header HTTP pada port non-standar (contoh: 8080, 8443, 8888, 9090)',
          'Sertifikat SSL mencantumkan CN (Common Name) / subdomain internal organisasi',
          'Banner menampilkan prompt interaktif (misal: Redis, Python CLI, Debugger)'
        ],
        evidence_to_capture: [
          'Output curl -ik mentah (request & response)',
          'Detail SSL certificate (Issuer, Subject, Subject Alternative Names)',
          'Raw probe reply dari netcat'
        ]
      },
      {
        id: 'port-firewall-nat-behavior',
        name: '3. Status State Port (Filtered vs Open vs WAF)',
        why_check: 'Menentukan apakah port dilindungi stateful firewall, port knocking, atau access control list.',
        what_to_look_for: [
          'nmap -sS vs nmap -sT vs nmap -sA (ACK scan untuk membedakan filtered vs unfiltered)',
          'Bandingkan waktu respons (RTT): delay panjang sering kali menandakan tarpit atau packet drop firewall',
          'Cek apakah port berubah status saat diakses dari IP atau subnet berbeda'
        ],
        normal_baseline: 'Port open merespons SYN-ACK segera (< 50ms di LAN, < 200ms di Internet).',
        interesting_clues: [
          'Port berubah dari filtered menjadi open setelah request tertentu (port knocking)',
          'Port hanya terbuka pada alamat IPv6 sementara IPv4 difilter'
        ],
        evidence_to_capture: [
          'Tabel nmap scanning comparison (-sS vs -sA)',
          'Packet trace wireshark / tcpdump (SYN/ACK sequence)'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-port-web-service-nonstandard',
        inspection_point_id: 'port-protocol-probing',
        signal_description: 'Port non-standar (misal: 8888) merespons dengan HTTP server header dan form login atau REST API.',
        output_snippet: '$ curl -ik http://192.168.1.50:8888/\nHTTP/1.1 200 OK\nServer: Werkzeug/2.0.1 Python/3.9.5\nContent-Type: text/html\n\n<title>Flask Debugger Console</title>',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Layanan web berbasis Python Werkzeug / Flask debugger terbuka pada port non-standar, berpotensi memiliki console PIN RCE.',
        hypothesis_id: 'hyp-unknown-port-rce',
        evidence_to_capture: ['Full HTTP request dan response headers', 'Title dan body halaman web yang bocor']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-unknown-port-rce',
        name: 'Remote Access / RCE via Exposed Debugger on Non-Standard Port',
        description: 'Layanan web pada port non-standar mengaktifkan fitur debug atau interaktif yang memungkinkan eksekusi kode.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-port-web-service-nonstandard'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Kunjungi endpoint di browser, periksa apakah endpoint console (/console) terlindungi PIN atau langsung interaktif.',
            expected_output: 'Endpoint console meminta PIN otentikasi.',
            interesting_output: 'Console interaktif terbuka tanpa PIN, atau PIN default diterima.',
            unexpected_output: '404 Not Found atau 403 Forbidden.',
            interpretation: 'Console interaktif aktif → RCE langsung dapat dibuktikan dengan perintah aman os.getuid().',
            evidence_to_record: ['Screenshot console interface', 'Bukti pembatasan PIN']
          }
        ]
      }
    ]
  },

  // 3. Service Banner
  'obs-net-service-banner': {
    inspection_points_add: [
      {
        id: 'banner-cve-correlation',
        name: '2. Korelasi Banner dengan Vulnerability Database (CVE/NVD)',
        why_check: 'Menentukan apakah versi software yang dilaporkan memiliki CVE publik atau exploit yang stabil.',
        what_to_look_for: [
          'searchsploit "Software Name Version"',
          'Periksa NVD (National Vulnerability Database) untuk vendor & product exact match',
          'Pastikan mengecek apakah distro target melakukan backporting patch (contoh: Debian/Ubuntu)',
          'Verifikasi apakah konfigurasi default yang rentan memang diaktifkan pada target'
        ],
        normal_baseline: 'Versi software adalah versi LTS terbaru atau memiliki patch backport dari vendor OS.',
        interesting_clues: [
          'Versi software sangat usang dan memiliki exploit RCE publik (misal: vsftpd 2.3.4, Apache 2.4.49, OpenSSH 7.2p2)',
          'Software merupakan build custom atau versi beta/developer'
        ],
        evidence_to_capture: [
          'String versi banner mentah yang diekstrak',
          'Daftar EDB-ID / CVE yang relevan dari searchsploit',
          'Informasi distribusi OS pengirim (misal: Ubuntu 18.04.1)'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-banner-known-cve-match',
        inspection_point_id: 'banner-cve-correlation',
        signal_description: 'Banner menampilkan versi exact software yang memiliki CVE Remote Code Execution publik.',
        output_snippet: '$ nc -vn 192.168.1.15 21\n(UNKNOWN) [192.168.1.15] 21 (ftp) open\n220 ProFTPD 1.3.5 Server (ProFTPD Default Installation)',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'ProFTPD 1.3.5 rentan terhadap mod_copy arbitrary file copy (CVE-2015-3306), memungkinkan upload webshell jika web server berada pada host yang sama.',
        hypothesis_id: 'hyp-banner-cve-exploit',
        evidence_to_capture: ['Banner teks lengkap dari netcat', 'CVE referensi']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-banner-cve-exploit',
        name: 'Service Exploitation via Version-Specific CVE',
        description: 'Mengeksploitasi kerentanan publik yang spesifik terhadap versi banner software yang teridentifikasi.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-banner-known-cve-match'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Kirim perintah non-destruktif untuk memvalidasi fitur modul yang rentan (contoh: SITE CPFR /etc/passwd).',
            expected_output: '500 Unknown command atau 550 Permission denied.',
            interesting_output: '350 File or directory exists, ready for destination name (mod_copy aktif).',
            unexpected_output: 'Koneksi terputus tiba-tiba (WAF/IPS trigger).',
            interpretation: 'Perintah mod_copy diterima → kerentanan dapat dieksploitasi secara valid.',
            evidence_to_record: ['Respons dari perintah SITE CPFR']
          }
        ]
      }
    ]
  },

  // 4. RPC
  'obs-net-rpc': {
    inspection_points_add: [
      {
        id: 'rpc-user-rid-cycle',
        name: '2. RID Cycling & SID Lookup via RPC',
        why_check: 'Mengidentifikasi akun pengguna dan grup domain melalui enumerasi RID sekuensial tanpa kredensial.',
        what_to_look_for: [
          'rpcclient -U "" -N TARGET -c "lookupsids S-1-5-21-..."',
          'crackmapexec smb TARGET -u "" -p "" --rid-brute 500-1100',
          'Periksa pemetaan RID: 500 (Administrator), 501 (Guest), 512 (Domain Admins)',
          'rpcclient -U "" -N TARGET -c "querydispinfo"'
        ],
        normal_baseline: 'Akses RPC anonim ditolak (STATUS_ACCESS_DENIED) pada server yang diamankan.',
        interesting_clues: [
          'Anonymous bind diizinkan dan mengembalikan nama-nama user korporat',
          'Ditemukan akun user dengan deskripsi berisi password sementara atau catatan admin'
        ],
        evidence_to_capture: [
          'Daftar akun hasil RID cycling beserta nomor RID masing-masing',
          'Output querydispinfo / enumdomusers'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-rpc-rid-users-found',
        inspection_point_id: 'rpc-user-rid-cycle',
        signal_description: 'RID cycling berhasil membongkar daftar nama pengguna dan grup sensitif.',
        output_snippet: '$ crackmapexec smb 192.168.1.10 -u "" -p "" --rid-brute\nSMB  192.168.1.10:445  DC01  498: DOMAIN\\Enterprise Admins (SidTypeGroup)\nSMB  192.168.1.10:445  DC01  500: DOMAIN\\Administrator (SidTypeUser)',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Seluruh struktur akun berhasil dipetakan, siap digunakan untuk serangan AS-REP Roasting dan Password Spraying.',
        hypothesis_id: 'hyp-rpc-user-spray',
        evidence_to_capture: ['Daftar username yang disimpan ke file wordlist']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-rpc-user-spray',
        name: 'Account Targeting via RPC Anonymous Enumeration',
        description: 'Daftar user dari RPC digunakan sebagai basis data target untuk serangan otentikasi bertahap.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-rpc-rid-users-found'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Ambil daftar username hasil RID brute, lakukan single password spray dengan kata sandi musim/tahun (misal: Autumn2026!).',
            expected_output: 'Semua login gagal: STATUS_LOGON_FAILURE.',
            interesting_output: '1 atau lebih user berhasil login.',
            unexpected_output: 'STATUS_ACCOUNT_LOCKED_OUT.',
            interpretation: 'Jika berhasil, credential diperoleh secara legal dan valid.',
            evidence_to_record: ['Log spray tool tanpa menampilkan plaintext jika sensitif']
          }
        ]
      }
    ]
  },

  // 5. SMTP
  'obs-net-smtp': {
    inspection_points_add: [
      {
        id: 'smtp-open-relay-vrfy',
        name: '2. Verifikasi User (VRFY/EXPN) & Open Relay Test',
        why_check: 'Perintah VRFY/EXPN membocorkan user lokal. Open relay memungkinkan pengiriman email phishing tanpa autentikasi.',
        what_to_look_for: [
          'nc -nv TARGET 25 lalu kirim: VRFY root, VRFY admin, VRFY nonexistuser',
          'nmap --script smtp-open-relay,smtp-enum-users -p 25 TARGET',
          'Kirim sequence test: MAIL FROM:<test@external.com> lalu RCPT TO:<victim@otherdomain.com>',
          'Periksa kode respons: 250 (Diterima / Valid) vs 550 (Relaying denied / User not found)'
        ],
        normal_baseline: 'VRFY dinonaktifkan (252 Cannot VRFY user) dan Open Relay ditolak (550 5.7.1 Relaying denied).',
        interesting_clues: [
          'VRFY mengembalikan kode 250 dengan nama lengkap pengguna',
          'RCPT TO domain eksternal diterima dengan status 250 OK (Open Relay aktif)'
        ],
        evidence_to_capture: [
          'Transkrip dialog SMTP mentah (EHLO, VRFY, MAIL FROM, RCPT TO)',
          'Output nmap script smtp-open-relay'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-smtp-open-relay-active',
        inspection_point_id: 'smtp-open-relay-vrfy',
        signal_description: 'Server SMTP mengizinkan pengiriman email ke domain eksternal tanpa autentikasi (Open Relay).',
        output_snippet: 'MAIL FROM:<attacker@evil.com>\n250 2.1.0 Ok\nRCPT TO:<target@partner.com>\n250 2.1.5 Ok',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Server dapat disalahgunakan untuk spoofing email resmi organisasi atau relay phishing campaign.',
        hypothesis_id: 'hyp-smtp-relay-abuse',
        evidence_to_capture: ['Dialog SMTP lengkap dengan respons 250 2.1.5 Ok']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-smtp-relay-abuse',
        name: 'Email Spoofing & Phishing via Open Mail Relay',
        description: 'Server bertindak sebagai open relay yang memungkinkan pengiriman email berpura-pura menjadi domain terpercaya.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-smtp-open-relay-active'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Kirim email uji ke mailbox tester internal sendiri menggunakan alamat pengirim simulasi.',
            expected_output: 'Email diblokir oleh filter spam eksternal atau relay ditolak.',
            interesting_output: 'Email uji berhasil masuk ke inbox mailbox tester.',
            unexpected_output: 'Server meminta STARTTLS atau AUTH sebelum melanjutkan.',
            interpretation: 'Jika email diterima → open relay terbukti berdampak tinggi pada reputasi domain.',
            evidence_to_record: ['Header email uji yang diterima membuktikan relay IP']
          }
        ]
      }
    ]
  },

  // 6. Database (MySQL/MSSQL/Postgres/Redis/MongoDB)
  'obs-net-database': {
    inspection_points_add: [
      {
        id: 'db-default-credentials',
        name: '2. Pengujian Akun Default & Unauthenticated Access',
        why_check: 'Database sering kali diinstal dengan akun bawaan tanpa kata sandi atau password default pabrik.',
        what_to_look_for: [
          'MySQL (3306): mysql -h TARGET -u root (tanpa password)',
          'Postgres (5432): psql -h TARGET -U postgres (password: postgres)',
          'Redis (6379): redis-cli -h TARGET ping (apakah PONG tanpa AUTH?)',
          'MongoDB (27017): mongosh --host TARGET (apakah prompt database terbuka?)',
          'MSSQL (1433): crackmapexec mssql TARGET -u sa -p "" atau sa:sa'
        ],
        normal_baseline: 'Semua koneksi remote ditolak, meminta otentikasi password kuat, atau hanya bind ke 127.0.0.1.',
        interesting_clues: [
          'Redis merespons +PONG langsung tanpa perintah AUTH',
          'MongoDB menampilkan database admin/config tanpa otentikasi',
          'MySQL mengizinkan koneksi user root dari sembarang host (%)'
        ],
        evidence_to_capture: [
          'Screenshot / teks dialog CLI database yang berhasil login',
          'Daftar nama database (SHOW DATABASES / \l)',
          'Versi database dan privileges pengguna saat ini'
        ]
      },
      {
        id: 'db-rce-primitives',
        name: '3. Fitur Eksekusi Kode (RCE Primitives)',
        why_check: 'Jika memiliki akses database berhak tinggi, evaluasi apakah fungsionalitas sistem operasi dapat diakses.',
        what_to_look_for: [
          'MSSQL: Periksa apakah xp_cmdshell dapat diaktifkan via sp_configure',
          'PostgreSQL: Cek hak pembuatan fungsi eksternal atau COPY PROGRAM',
          'MySQL: Cek @@secure_file_priv untuk kemungkinan INTO OUTFILE webshell',
          'Redis: Cek hak perintah CONFIG SET dir / CONFIG SET dbfilename (SSH key overwrite / cron injection)'
        ],
        normal_baseline: 'Eksekusi fungsi sistem operasi dinonaktifkan atau dibatasi oleh izin OS level rendah.',
        interesting_clues: [
          'xp_cmdshell berhasil di-enable pada user SA',
          'secure_file_priv bernilai kosong ("") memungkinkan penulisan file ke sembarang direktori web'
        ],
        evidence_to_capture: [
          'Output pengecekan konfigurasi (SELECT @@secure_file_priv / sp_configure)',
          'Output eksekusi perintah aman (whoami / id)'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-db-redis-unauth-rce',
        inspection_point_id: 'db-default-credentials',
        signal_description: 'Redis server terbuka ke publik tanpa otentikasi dan menerima perintah tulis file sistem.',
        output_snippet: '$ redis-cli -h 192.168.1.30\n192.168.1.30:6379> ping\nPONG\n192.168.1.30:6379> CONFIG GET dir\n1) "dir"\n2) "/var/lib/redis"',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Redis tanpa password dapat dieksploitasi untuk Remote Code Execution dengan menulis SSH authorized_keys ke /root/.ssh/ atau cron job ke /etc/cron.d/.',
        hypothesis_id: 'hyp-redis-unauth-rce',
        evidence_to_capture: ['Output redis-cli ping & config get dir', 'Versi Redis dari INFO server']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-redis-unauth-rce',
        name: 'Full Host Takeover via Unauthenticated Redis File Write',
        description: 'Menulis file SSH public key atau reverse shell cron job melalui perintah Redis CONFIG SET.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-db-redis-unauth-rce'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Verifikasi izin tulis direktori non-kritis: CONFIG SET dir /tmp lalu CONFIG SET dbfilename test.rdb lalu SAVE.',
            expected_output: 'ERR (error permission denied) jika Redis berjalan dengan restricted privileges.',
            interesting_output: 'OK (file berhasil ditulis ke /tmp).',
            unexpected_output: 'Koneksi ditutup atau dinonaktifkan oleh protected-mode.',
            interpretation: 'Jika OK → izin tulis terkonfirmasi tanpa merusak konfigurasi sistem utama.',
            evidence_to_record: ['Respons OK dari perintah SAVE di /tmp']
          }
        ]
      }
    ]
  },

  // 7. PrivEsc: Writable System Files/Directories
  'obs-priv-writable-system': {
    inspection_points_add: [
      {
        id: 'priv-writable-services-cron',
        name: '2. Cron Jobs & Systemd Service Misconfigurations',
        why_check: 'Script yang dijalankan berkala oleh root namun dapat dimodifikasi oleh user biasa adalah jalur privesc 100% reliabel.',
        what_to_look_for: [
          'cat /etc/crontab dan ls -la /etc/cron.* /var/spool/cron/crontabs/',
          'pspy64 (monitor proses background yang dijalankan root secara real-time)',
          'systemctl list-timers --all',
          'Cari script cron: apakah permissions-nya -rwxrwxrwx atau dimiliki grup user?'
        ],
        normal_baseline: 'Semua file cron dan systemd service dimiliki oleh root:root dengan permission 644/755.',
        interesting_clues: [
          'File script di /etc/cron.d/ memiliki izin tulis (writable) oleh user biasa',
          'Systemd service unit file memiliki permissions 777 atau writable oleh group tester',
          'Cron job memanggil script di direktori home user atau /tmp'
        ],
        evidence_to_capture: [
          'Output ls -la path_ke_script_cron',
          'Output crontab yang membuktikan script berjalan sebagai root (UID 0)',
          'Pspy capture log proses eksekusi berkala'
        ]
      },
      {
        id: 'priv-writable-etc-passwd',
        name: '3. World-Writable /etc/passwd atau /etc/shadow',
        why_check: 'Jika file /etc/passwd dapat ditulis, attacker dapat menambahkan user baru dengan UID 0 (root).',
        what_to_look_for: [
          'ls -l /etc/passwd /etc/shadow',
          'openssl passwd -1 -salt newpass password123 (generate password hash)',
          'Format injeksi baris baru: newroot:HASH:0:0:root:/root:/bin/bash'
        ],
        normal_baseline: '/etc/passwd permission -rw-r--r-- (hanya root yang bisa tulis), /etc/shadow 640/000.',
        interesting_clues: [
          '/etc/passwd writable oleh user biasa (-rw-rw-rw- atau -rw-r--rw-)',
          '/etc/shadow readable oleh user biasa'
        ],
        evidence_to_capture: [
          'Output ls -l /etc/passwd',
          'Bukti penambahan baris akun baru'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-writable-cron-script',
        inspection_point_id: 'priv-writable-services-cron',
        signal_description: 'Script backup berkala yang dijalankan root setiap 5 menit memiliki izin tulis untuk user biasa.',
        output_snippet: '$ cat /etc/crontab\n*/5 * * * * root /opt/scripts/backup.sh\n\n$ ls -l /opt/scripts/backup.sh\n-rwxrwxrwx 1 root root 214 Jan 10 12:00 /opt/scripts/backup.sh',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Attacker dapat menambahkan payload reverse shell ke dalam /opt/scripts/backup.sh dan menunggu root mengeksekusinya dalam < 5 menit.',
        hypothesis_id: 'hyp-cron-script-privesc',
        evidence_to_capture: ['Output crontab lengkap', 'ls -la izin file backup.sh']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-cron-script-privesc',
        name: 'Root Privilege Escalation via Writable Cron Job Script',
        description: 'Memodifikasi script yang dieksekusi berkala oleh root untuk menginjeksi perintah eskalasi hak akses.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-writable-cron-script'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Tambahkan baris aman ke akhir script: id > /tmp/proof_root.txt, tunggu siklus cron berjalan.',
            expected_output: 'File /tmp/proof_root.txt tidak muncul atau cron tidak berjalan.',
            interesting_output: 'File /tmp/proof_root.txt terbentuk dengan isi: uid=0(root) gid=0(root).',
            unexpected_output: 'Cron error pada log syslog.',
            interpretation: 'File terbentuk sebagai root → Privilege Escalation tervalidasi 100% tanpa payload berbahaya.',
            evidence_to_record: ['Isi file /tmp/proof_root.txt', 'ls -la /tmp/proof_root.txt']
          }
        ]
      }
    ]
  },

  // 8. Credential History & Configuration Hunting
  'obs-priv-credential-history': {
    inspection_points_add: [
      {
        id: 'cred-env-memory-hunting',
        name: '2. Environment Variables & Memory Leaks',
        why_check: 'Variabel lingkungan sering kali menyimpan token API, secret key, atau database credentials proses aktif.',
        what_to_look_for: [
          'env atau printenv (periksa AWS_KEY, DB_PASS, SECRET_KEY)',
          'cat /proc/[PID]/environ | tr "\\0" "\\n" untuk proses yang berjalan sebagai user lain jika readable',
          'Cek history file lain: ~/.mysql_history, ~/.zsh_history, ~/.nano_history'
        ],
        normal_baseline: 'Environment hanya berisi konfigurasi PATH, LANG, USER standar tanpa hardcoded secrets.',
        interesting_clues: [
          'Variabel lingkungan memuat string PASSWORD, TOKEN, API_KEY',
          'History MySQL memuat perintah INSERT INTO users VALUES ("admin", "plaintext_pass")'
        ],
        evidence_to_capture: [
          'Output printenv (redacted token sensitif)',
          'Line history yang memuat kredensial mentah'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-history-password-leak',
        inspection_point_id: 'cred-env-memory-hunting',
        signal_description: 'File .bash_history memuat perintah eksekusi langsung dengan parameter password.',
        output_snippet: '$ cat ~/.bash_history | grep -i pass\nmysql -u root -pP@ssw0rdSecure2026! production_db\nsshpass -p "AdminPass#99" ssh deploy@internal.srv',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Kredensial tersimpan dalam riwayat bash dapat digunakan langsung untuk akses ke database dan server internal lain.',
        hypothesis_id: 'hyp-history-cred-reuse',
        evidence_to_capture: ['Cuplikan .bash_history', 'Uji validitas password pada layanan terkait']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-history-cred-reuse',
        name: 'Credential Reuse via Shell History Leakage',
        description: 'Password yang bocor pada file riwayat dicoba pada akun user lain atau sudo prompt.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-history-password-leak'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Coba password yang ditemukan pada perintah: sudo -l atau su - root.',
            expected_output: 'Sorry, try again (password salah).',
            interesting_output: 'Sudo privileges ditampilkan atau shell root terbuka.',
            unexpected_output: 'Account locked out.',
            interpretation: 'Password reuse berhasil → eskalasi lokal atau lateral tervalidasi.',
            evidence_to_record: ['Output sudo -l dengan password yang ditemukan']
          }
        ]
      }
    ]
  },

  // 9. Mobile Security: Debuggable APK
  'obs-mobile-apk-debuggable': {
    inspection_points_add: [
      {
        id: 'apk-exported-components',
        name: '2. Analisis Exported Activities & Broadcast Receivers',
        why_check: 'Komponen yang di-export tanpa permission filter dapat dipanggil oleh aplikasi jahat lain pada perangkat.',
        what_to_look_for: [
          'Decompile APK menggunakan jadx-gui atau apktool',
          'Periksa AndroidManifest.xml: cari android:exported="true"',
          'Coba panggil Activity via ADB: adb shell am start -n com.app/.SecretActivity',
          'Periksa Intent filter data schemes untuk Deep Link vulnerabilities'
        ],
        normal_baseline: 'Hanya MainActivity yang di-export; semua activity internal memiliki android:exported="false".',
        interesting_clues: [
          'Activity administratif atau panel debug memiliki exported="true" tanpa permission khusus',
          'Aplikasi mengekspos ContentProvider dengan query tanpa filter SQL'
        ],
        evidence_to_capture: [
          'Potongan AndroidManifest.xml yang memuat android:exported="true"',
          'Perintah adb am start yang berhasil menampilkan layar tersembunyi'
        ]
      },
      {
        id: 'apk-hardcoded-secrets',
        name: '3. Hardcoded Secrets & API Keys dalam Bytecode',
        why_check: 'Developer sering menyimpan endpoint rahasia, secret key OAuth, atau API token di dalam kode aplikasi mobile.',
        what_to_look_for: [
          'strings classes.dex | grep -iE "api_key|secret|firebase|token"',
          'Gunakan apkleaks atau trufflehog pada folder decompiled jadx',
          'Cari file res/values/strings.xml untuk token Firebase atau Google Maps API'
        ],
        normal_baseline: 'Tidak ada private API secret yang disimpan di client-side APK; autentikasi menggunakan backend session token.',
        interesting_clues: [
          'Ditemukan Firebase database URL dengan akses read/write tanpa auth (.json)',
          'Ditemukan AWS Access Key atau private encryption key AES hardcoded'
        ],
        evidence_to_capture: [
          'String secret yang ditemukan beserta path class file tempatnya berada',
          'Bukti verifikasi akses API key (read-only verification)'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-apk-exported-admin-activity',
        inspection_point_id: 'apk-exported-components',
        signal_description: 'Activity manajemen akun internal berhasil dibuka langsung tanpa login via adb intent.',
        output_snippet: '$ adb shell am start -n com.target.bank/.ui.debug.AdminConsoleActivity\nStarting: Intent { cmp=com.target.bank/.ui.debug.AdminConsoleActivity }\nStatus: Activity terbuka di layar emulator tanpa prompt login.',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Exported activity tanpa perlindungan memungkinkan bypass autentikasi total pada aplikasi mobile.',
        hypothesis_id: 'hyp-apk-auth-bypass',
        evidence_to_capture: ['Screenshot emulator menampilkan layar admin', 'Perintah adb yang digunakan']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-apk-auth-bypass',
        name: 'Authentication Bypass via Unprotected Exported Component',
        description: 'Memanggil activity sensitif secara langsung melewati alur verifikasi login aplikasi.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-apk-exported-admin-activity'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Kirim intent via ADB pada perangkat uji/emulator, amati apakah data profil pengguna dapat diakses.',
            expected_output: 'SecurityException: Permission Denial.',
            interesting_output: 'Tampilan profil terbuka dengan fungsionalitas edit aktif.',
            unexpected_output: 'Aplikasi force close (NullPointerException karena session kosong).',
            interpretation: 'Jika terbuka stabil → exported component vulnerability terkonfirmasi.',
            evidence_to_record: ['Logcat error/output saat intent dieksekusi']
          }
        ]
      }
    ]
  },

  // 10. Cryptography: Unknown Hash
  'obs-crypto-unknown-hash': {
    inspection_points_add: [
      {
        id: 'hash-entropy-salt-format',
        name: '2. Identifikasi Salt, Prefix Magic & Modul Hashcat',
        why_check: 'Prefix ($6$, $2b$, $1$) dan separator (titik dua, dollar) menentukan algoritma hashing eksak dan opsi hashcat.',
        what_to_look_for: [
          'hashid "STRING_HASH" atau nth "STRING_HASH"',
          '$1$ = MD5-Crypt (Hashcat -m 500)',
          '$5$ = SHA256-Crypt (Hashcat -m 7400)',
          '$6$ = SHA512-Crypt (Hashcat -m 1800)',
          '$2a$ / $2b$ / $2y$ = Bcrypt (Hashcat -m 3200)',
          'Panjang 32 hex = MD5 / NTLM, panjang 40 hex = SHA1'
        ],
        normal_baseline: 'Sistem modern menggunakan hash adaptif dengan work factor tinggi seperti Argon2id atau Bcrypt.',
        interesting_clues: [
          'Hash tidak memiliki salt dan panjang 32 karakter hex (kemungkinan besar MD5 murni atau NTLM)',
          'Ditemukan salt terpisah yang disimpan dalam kolom database berdampingan'
        ],
        evidence_to_capture: [
          'Format string hash lengkap',
          'Rekomendasi mode hashcat (-m number)',
          'Hasil identifikasi dari hashid/nth'
        ]
      },
      {
        id: 'hash-rainbow-online-lookup',
        name: '3. Lookup Rainbow Table & Dictionary Testing',
        why_check: 'Hash tanpa salt dari algoritma cepat (MD5/SHA1/NTLM) sering kali sudah terindeks di database rainbow table online.',
        what_to_look_for: [
          'Pencarian hash pada database online (CrackStation, DeHashed) untuk hash non-sensitif publik',
          'hashcat -m [MODE] hash.txt rockyou.txt',
          'Evaluasi apakah hash dapat di-crack < 5 detik dengan dictionary dasar'
        ],
        normal_baseline: 'Hash tidak ditemukan di rainbow table dan membutuhkan waktu komputasi besar.',
        interesting_clues: [
          'Hash langsung ditemukan di CrackStation dalam hitungan milidetik',
          'Plaintext adalah password default seperti "admin" atau "123456"'
        ],
        evidence_to_capture: [
          'Plaintext password hasil lookup/cracking',
          'Nama sumber database rainbow table / Hashcat status'
        ]
      }
    ],
    interesting_signals_add: [
      {
        id: 'sig-hash-ntlm-cracked-instantly',
        inspection_point_id: 'hash-entropy-salt-format',
        signal_description: 'Hash 32 karakter hex teridentifikasi sebagai NTLM dan langsung ter-crack via dictionary.',
        output_snippet: '$ hashid -m 31d6cfe0d16ae931b73c59d7e0c089c0\n[+] NTLM [Hashcat Mode: 1000]\n\n$ hashcat -m 1000 31d6cfe0d16ae931b73c59d7e0c089c0 rockyou.txt\n31d6cfe0d16ae931b73c59d7e0c089c0:Password2026\nStatus: Cracked',
        observation_confidence: 'CONFIRMED_OBSERVATION',
        interpretation: 'Hash NTLM tidak menggunakan salt sehingga sangat rentan terhadap dictionary attack dan Pass-the-Hash langsung tanpa cracking.',
        hypothesis_id: 'hyp-hash-pth-or-login',
        evidence_to_capture: ['Plaintext credential', 'Status cracked hashcat']
      }
    ],
    hypotheses_add: [
      {
        id: 'hyp-hash-pth-or-login',
        name: 'Authentication via Cracked Hash or Pass-the-Hash Technique',
        description: 'Menggunakan plaintext hasil crack atau menggunakan hash NTLM secara langsung melalui teknik Pass-the-Hash.',
        status: 'CANDIDATE',
        supporting_signals: ['sig-hash-ntlm-cracked-instantly'],
        safe_validation_steps: [
          {
            step_number: 1,
            action: 'Verifikasi login dengan plaintext yang berhasil di-crack pada layanan terkait (SSH, Web, SMB).',
            expected_output: 'Login gagal.',
            interesting_output: 'Login berhasil.',
            unexpected_output: 'Account disabled.',
            interpretation: 'Jika berhasil → credential access tervalidasi.',
            evidence_to_record: ['Screenshot keberhasilan otentikasi']
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
    if (batch3Enrichments[nodes[i].id]) {
      const before = JSON.stringify(nodes[i]).length;
      nodes[i] = applyEnrichment(nodes[i], batch3Enrichments[nodes[i].id]);
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

console.log(`\n✅ Batch 3 enrichment complete: ${totalEnriched} nodes enriched.`);
