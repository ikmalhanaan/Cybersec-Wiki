/**
 * enrich-sparse-nodes.mjs
 * Enriches sparse observation nodes with more inspection_points,
 * interesting_signals, and hypotheses using the correct schema.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OBS_DIR = path.resolve(__dirname, '../src/data/observations');

// ─── WEB: obs-web-session-cookie ───────────────────────────────────────
const sessionCookieEnrichment = {
  id: 'obs-web-session-cookie',
  inspection_points_add: [
    {
      id: 'cookie-value-entropy',
      name: '2. Analisis Nilai & Entropi Token',
      why_check: 'Nilai cookie dengan entropi rendah atau pola prediktif memungkinkan serangan brute-force atau forging token.',
      what_to_look_for: [
        'Perhatikan panjang value: < 16 karakter → potensi mudah di-brute',
        'Base64-decode nilai: apakah berisi JSON, user ID, atau timestamp?',
        'Bandingkan 10 cookie dari 10 request berbeda: apakah ada pola berulang?',
        'Cek apakah nilai mengandung data user (username, email, role)'
      ],
      normal_baseline: 'String acak 32-128 karakter (hex atau base64) tanpa informasi yang dapat dibaca manusia.',
      interesting_clues: [
        'Nilai tampak seperti Base64 dan setelah decode berisi JSON atau user ID',
        'Nilai hanya terdiri dari angka atau terlalu pendek (< 20 karakter)',
        'Nilai berisi "admin", "user", "role", atau angka sekuensial',
        'Nilai identik antara dua sesi berbeda'
      ],
      evidence_to_capture: [
        'Raw cookie value (sebelum dan sesudah decode)',
        'Screenshot comparison 5+ cookie dari session berbeda',
        'Output `echo "VALUE" | base64 -d` jika base64-looking'
      ]
    },
    {
      id: 'cookie-lifecycle',
      name: '3. Siklus Hidup & Rotasi Token',
      why_check: 'Token yang tidak diperbarui setelah login (session fixation) atau tidak diinvalidasi setelah logout adalah kerentanan serius.',
      what_to_look_for: [
        'Catat nilai cookie SEBELUM login (pre-auth cookie jika ada)',
        'Catat nilai cookie SETELAH login berhasil — apakah berubah?',
        'Lakukan logout, kemudian coba gunakan cookie lama ke endpoint /api/me atau /profile',
        'Cek header Set-Cookie: apakah ada Expires / Max-Age yang sangat panjang?'
      ],
      normal_baseline: 'Cookie baru di-set setelah login (nilai berubah total). Cookie lama tidak lagi valid setelah logout.',
      interesting_clues: [
        'Nilai cookie sama persis sebelum dan sesudah login (Session Fixation)',
        'Cookie lama masih valid setelah logout (Server-Side Invalidation Missing)',
        'Max-Age atau Expires melebihi 30 hari untuk sesi sensitif'
      ],
      evidence_to_capture: [
        'Cookie value pre-auth vs post-auth (screenshot berdampingan)',
        'Bukti request dengan cookie lama setelah logout + respons server (200 vs 401)',
        'Header Set-Cookie beserta Max-Age / Expires value'
      ]
    }
  ],
  interesting_signals_add: [
    {
      id: 'sig-cookie-value-contains-data',
      inspection_point_id: 'cookie-value-entropy',
      signal_description: 'Nilai cookie mengandung data yang dapat di-decode (Base64 → JSON dengan user role atau ID).',
      output_snippet: '$ echo "dXNlcl9pZD0xMjMmcm9sZT11c2Vy" | base64 -d\nuser_id=123&role=user',
      observation_confidence: 'CONFIRMED_OBSERVATION',
      interpretation: 'Cookie menyimpan state di sisi klien tanpa signature verifikasi — attacker dapat memodifikasi nilai untuk privilege escalation.',
      hypothesis_id: 'hyp-cookie-tampering',
      evidence_to_capture: [
        'Raw cookie value + hasil decode',
        'Screenshot modify cookie melalui DevTools → kirim request modifikasi'
      ]
    },
    {
      id: 'sig-session-fixation',
      inspection_point_id: 'cookie-lifecycle',
      signal_description: 'Nilai cookie tidak berubah sebelum dan sesudah login berhasil.',
      output_snippet: '# Pre-login cookie:\nSet-Cookie: session=abc123\n\n# Post-login (nilai sama!):\nSet-Cookie: session=abc123',
      observation_confidence: 'CONFIRMED_OBSERVATION',
      interpretation: 'Server tidak meng-generate session baru setelah autentikasi — potensi Session Fixation attack jika attacker bisa set cookie awal.',
      hypothesis_id: 'hyp-session-fixation',
      evidence_to_capture: [
        'Screenshot cookie pre-login vs post-login (nilai identik)',
        'Bukti bahwa cookie awal yang di-set attacker diterima server setelah korban login'
      ]
    }
  ],
  hypotheses_add: [
    {
      id: 'hyp-cookie-tampering',
      name: 'Client-Side Cookie Tampering untuk Privilege Escalation',
      description: 'Cookie menyimpan state user (role, ID) tanpa HMAC signature → attacker dapat langsung memodifikasi nilai untuk mengklaim role admin.',
      status: 'CANDIDATE',
      supporting_signals: ['sig-cookie-value-contains-data'],
      safe_validation_steps: [
        {
          step_number: 1,
          action: 'Decode cookie, ubah role=user menjadi role=admin, encode kembali, kirim request.',
          expected_output: 'Server menolak karena ada validasi signature (400 / 403 / redirect ke login).',
          interesting_output: 'Server menerima cookie yang dimodifikasi dan menampilkan panel admin.',
          unexpected_output: 'Server crash atau error 500 saat menerima cookie yang dimodifikasi.',
          interpretation: 'Jika server menerima → cookie tampering berhasil, severity Critical.',
          evidence_to_record: ['Screenshot panel admin yang berhasil diakses dengan cookie yang dimodifikasi']
        }
      ]
    },
    {
      id: 'hyp-session-fixation',
      name: 'Session Fixation Attack',
      description: 'Attacker yang dapat men-set cookie target (via XSS atau URL parameter) bisa membajak sesi korban setelah korban login.',
      status: 'CANDIDATE',
      supporting_signals: ['sig-session-fixation'],
      safe_validation_steps: [
        {
          step_number: 1,
          action: 'Di browser A (attacker), catat session cookie pre-login. Di browser B (korban), set cookie tersebut lalu login.',
          expected_output: 'Setelah login di browser B, cookie baru di-generate, browser A tidak memiliki akses.',
          interesting_output: 'Browser A (attacker) dapat mengakses akun korban menggunakan session yang sama.',
          unexpected_output: 'Server error atau logout paksa.',
          interpretation: 'Jika browser A bisa akses → Session Fixation terkonfirmasi, severity High.',
          evidence_to_record: ['Video rekaman sinkronisasi dua browser dengan session yang sama']
        }
      ]
    }
  ]
};

// ─── WEB: obs-web-password-reset ───────────────────────────────────────
const passwordResetEnrichment = {
  id: 'obs-web-password-reset',
  inspection_points_add: [
    {
      id: 'pwreset-token-generation',
      name: '2. Kualitas Token Reset & Delivery Mechanism',
      why_check: 'Token reset yang lemah (pendek, prediktif, atau tidak expire) dapat di-brute-force atau dicuri dari logs.',
      what_to_look_for: [
        'Minta reset link → periksa token di URL: panjangnya berapa karakter?',
        'Minta reset 2x untuk user yang sama: apakah token lama masih valid?',
        'Periksa apakah token di-embed di URL query param vs POST body',
        'Uji: apakah token expire setelah digunakan sekali?'
      ],
      normal_baseline: 'Token kriptografi acak 32-64 karakter, expire dalam 15-60 menit, invalid setelah sekali digunakan.',
      interesting_clues: [
        'Token hanya 6-8 karakter numerik (mudah di-brute)',
        'Token lama masih valid setelah token baru diminta',
        'Token tidak expire setelah digunakan',
        'Token di-embed di HTTP Referer header yang bocor ke third-party'
      ],
      evidence_to_capture: [
        'URL reset link lengkap dengan token',
        'Bukti token lama masih valid: request dengan token lama → response 200',
        'Response setelah token digunakan: apakah request kedua dengan token sama diterima atau ditolak?'
      ]
    },
    {
      id: 'pwreset-host-header',
      name: '3. Host Header Injection pada Email Reset Link',
      why_check: 'Jika server menggunakan Host header untuk membangun URL dalam email reset, attacker bisa memanipulasi link reset ke domain miliknya.',
      what_to_look_for: [
        'Intercept request POST /forgot-password dengan Burp Suite',
        'Modifikasi header: Host: attacker.com atau tambahkan X-Forwarded-Host: attacker.com',
        'Kirim request dan periksa email yang diterima: URL reset mengarah ke mana?',
        'Coba juga: Host: legit.com:evil.com atau Host: legit.com.attacker.com'
      ],
      normal_baseline: 'Email reset selalu berisi URL dengan domain aplikasi asli tanpa memperhatikan Host header yang dikirim.',
      interesting_clues: [
        'URL di email berubah sesuai nilai Host header yang dimanipulasi',
        'Server menggunakan X-Forwarded-Host atau X-Forwarded-For untuk membangun URL'
      ],
      evidence_to_capture: [
        'Request asli vs request dengan Host header dimodifikasi (Burp Screenshot)',
        'Konten email yang diterima — terutama URL reset link',
        'Perbandingan: Host normal vs Host attacker.com dalam email'
      ]
    }
  ],
  interesting_signals_add: [
    {
      id: 'sig-pwreset-weak-token',
      inspection_point_id: 'pwreset-token-generation',
      signal_description: 'Token reset hanya 6 digit numerik atau pola prediktif (timestamp-based).',
      output_snippet: 'GET /reset-password?token=123456\nGET /reset-password?token=1695834712',
      observation_confidence: 'CONFIRMED_OBSERVATION',
      interpretation: 'Token dengan entropi rendah dapat di-brute-force dalam hitungan menit jika tidak ada rate limiting.',
      hypothesis_id: 'hyp-pwreset-bruteforce',
      evidence_to_capture: ['URL token reset lengkap', 'Jumlah karakter dan charset token']
    },
    {
      id: 'sig-pwreset-host-injection',
      inspection_point_id: 'pwreset-host-header',
      signal_description: 'URL di email reset link berubah mengikuti nilai Host header yang dimodifikasi attacker.',
      output_snippet: '# Request dengan Host: attacker.com\n# Email yang diterima:\nKlik link: https://attacker.com/reset?token=abc123',
      observation_confidence: 'CONFIRMED_OBSERVATION',
      interpretation: 'Host Header Injection aktif — attacker dapat mengarahkan link reset ke domain kontrolnya untuk mencuri token.',
      hypothesis_id: 'hyp-pwreset-host-injection',
      evidence_to_capture: ['Screenshot Burp request dengan Host yang dimodifikasi', 'Konten email yang diterima']
    }
  ],
  hypotheses_add: [
    {
      id: 'hyp-pwreset-bruteforce',
      name: 'Brute-Force Token Reset Password (Weak Token Entropy)',
      description: 'Token numerik pendek tanpa rate limiting dapat di-enumerate untuk mereset password akun manapun.',
      status: 'CANDIDATE',
      supporting_signals: ['sig-pwreset-weak-token'],
      safe_validation_steps: [
        {
          step_number: 1,
          action: 'Verifikasi: ada rate limiting? Kirim 10 request /reset dengan token salah → apakah diblokir?',
          expected_output: 'Setelah beberapa percobaan, IP diblokir atau mendapat 429 Too Many Requests.',
          interesting_output: 'Semua 10 request mendapat response berbeda (200 valid, 400 invalid) tanpa throttling.',
          unexpected_output: 'Semua request mendapat 200 OK tanpa validasi token.',
          interpretation: 'Tanpa rate limiting + token pendek → feasible brute force attack.',
          evidence_to_record: ['Jumlah request sebelum trigger rate limit', 'Response time dan status code sequence']
        }
      ]
    },
    {
      id: 'hyp-pwreset-host-injection',
      name: 'Password Reset Poisoning via Host Header Injection',
      description: 'Attacker dapat mencuri token reset dengan memancing korban request reset lalu memodifikasi Host header untuk redirect email ke server attacker.',
      status: 'CANDIDATE',
      supporting_signals: ['sig-pwreset-host-injection'],
      safe_validation_steps: [
        {
          step_number: 1,
          action: 'Dalam lab/lab environment: set Host: [burp-collaborator-domain] pada request forgot-password.',
          expected_output: 'Tidak ada DNS lookup atau HTTP request ke Burp Collaborator.',
          interesting_output: 'Burp Collaborator menerima HTTP request dengan token reset dalam URL.',
          unexpected_output: 'Email tidak terkirim sama sekali.',
          interpretation: 'Interaksi di Collaborator → Host Header Injection terkonfirmasi, severity High/Critical.',
          evidence_to_record: ['Burp Collaborator interaction log dengan token', 'Email asli vs email poisoned']
        }
      ]
    }
  ]
};

// ─── NETWORK: obs-net-smb ────────────────────────────────────────────────
const smbEnrichment = {
  id: 'obs-net-smb',
  inspection_points_add: [
    {
      id: 'smb-null-session',
      name: '2. Null Session & Anonymous Access',
      why_check: 'Null session memungkinkan enumerasi user, grup, share, dan kebijakan password tanpa kredensial.',
      what_to_look_for: [
        'smbclient -N -L //TARGET → apakah berhasil list share?',
        'enum4linux -a TARGET → periksa output "Users via RPC", "Share Enumeration"',
        'crackmapexec smb TARGET -u "" -p "" → apakah STATUS_ACCESS_DENIED atau OK?',
        'rpcclient -U "" TARGET → apakah prompt rpcclient terbuka?'
      ],
      normal_baseline: 'Semua akses anonim ditolak: STATUS_ACCESS_DENIED atau STATUS_LOGON_FAILURE.',
      interesting_clues: [
        'Share IPC$ bisa diakses anonim',
        'rpcclient berhasil terbuka tanpa password',
        'Daftar user domain dapat di-enumerate tanpa autentikasi',
        'Share non-standar (Data, Backup, IT) visible di listing'
      ],
      evidence_to_capture: [
        'Output smbclient -N -L lengkap',
        'Output enum4linux -a (simpan ke file)',
        'Output rpcclient enumdomusers, enumdomgroups'
      ]
    },
    {
      id: 'smb-share-permissions',
      name: '3. Izin Akses Share & Konten Sensitif',
      why_check: 'Share yang dapat dibaca / ditulis mungkin mengandung credential, script, atau memungkinkan penulisan file berbahaya.',
      what_to_look_for: [
        'Untuk setiap share: smbclient //TARGET/SHARE -N → navigasi dan list file',
        'Cari: *.txt, *.conf, *.xml, *.ps1, *.bat, *.ini yang mengandung password',
        'Uji write permission: smbclient → put test.txt → apakah berhasil?',
        'Periksa share SYSVOL/NETLOGON untuk GPP Passwords (Groups.xml)'
      ],
      normal_baseline: 'Share hanya berisi file non-sensitif, akses write ditolak, tidak ada credential dalam plaintext.',
      interesting_clues: [
        'File .xml dalam SYSVOL berisi cpassword (GPP Password)',
        'Share Backup/ berisi database dump atau konfigurasi aplikasi',
        'Write access ke NETLOGON atau share umum — memungkinkan planting malicious script'
      ],
      evidence_to_capture: [
        'List file lengkap dari setiap share yang bisa diakses',
        'Konten file sensitif yang ditemukan (screen + download)',
        'Bukti write test: file test.txt berhasil di-upload'
      ]
    }
  ],
  interesting_signals_add: [
    {
      id: 'sig-smb-null-session-success',
      inspection_point_id: 'smb-null-session',
      signal_description: 'Null session berhasil — enum4linux berhasil dump daftar user dan share tanpa kredensial.',
      output_snippet: '$ enum4linux -a 192.168.1.10\n[+] Enumerating users using SID S-1-5-21-...\nuser:[Administrator] rid:[0x1f4]\nuser:[jsmith] rid:[0x44f]\nuser:[svc_backup] rid:[0x451]',
      observation_confidence: 'CONFIRMED_OBSERVATION',
      interpretation: 'Daftar username valid untuk password spraying, AS-REP roasting, dan credential stuffing.',
      hypothesis_id: 'hyp-smb-user-enum-spray',
      evidence_to_capture: ['Full enum4linux output (save to file)', 'List username untuk wordlist']
    },
    {
      id: 'sig-smb-gpp-password',
      inspection_point_id: 'smb-share-permissions',
      signal_description: 'File Groups.xml di SYSVOL berisi cpassword (GPP encrypted password).',
      output_snippet: '$ find /SYSVOL -name "Groups.xml"\n/SYSVOL/domain/Policies/{GUID}/Machine/Preferences/Groups/Groups.xml\n\n<Properties cpassword="edBSHOwhZLTjt/QS9FeIcJ7bNjA8B2lGAA==" userName="localadmin"/>',
      observation_confidence: 'CONFIRMED_OBSERVATION',
      interpretation: 'cpassword dapat di-decrypt menggunakan gpp-decrypt atau CrackMapExec karena AES key hardcoded di MSDN.',
      hypothesis_id: 'hyp-smb-gpp-cred',
      evidence_to_capture: ['Konten Groups.xml', 'Output gpp-decrypt', 'Bukti penggunaan credential yang di-decrypt']
    }
  ],
  hypotheses_add: [
    {
      id: 'hyp-smb-user-enum-spray',
      name: 'Password Spraying dari Enumerasi User via Null Session',
      description: 'Daftar user yang didapat dari null session SMB dapat digunakan untuk password spraying dengan password umum.',
      status: 'CANDIDATE',
      supporting_signals: ['sig-smb-null-session-success'],
      safe_validation_steps: [
        {
          step_number: 1,
          action: 'Verifikasi daftar user valid: crackmapexec smb TARGET -u users.txt -p "password" --continue-on-success',
          expected_output: 'Semua login gagal: STATUS_LOGON_FAILURE',
          interesting_output: 'Satu atau lebih user berhasil login: [+] TARGET\\username:password',
          unexpected_output: 'STATUS_ACCOUNT_LOCKED_OUT — terlalu banyak percobaan gagal',
          interpretation: 'Jika ada yang berhasil → credential valid, lanjut ke lateral movement.',
          evidence_to_record: ['Full CrackMapExec output', 'Credential yang berhasil']
        }
      ]
    },
    {
      id: 'hyp-smb-gpp-cred',
      name: 'Credential Retrieval via GPP Password (MS14-025)',
      description: 'cpassword dalam Groups.xml di SYSVOL dapat di-decrypt karena Microsoft mempublikasikan AES key di dokumentasi.',
      status: 'CANDIDATE',
      supporting_signals: ['sig-smb-gpp-password'],
      safe_validation_steps: [
        {
          step_number: 1,
          action: 'Download Groups.xml lalu jalankan: gpp-decrypt "CPASSWORD_VALUE"',
          expected_output: 'Error atau gibberish jika bukan GPP password yang valid.',
          interesting_output: 'Plaintext password muncul: e.g., "P@ssw0rd123!"',
          unexpected_output: 'Tool tidak tersedia — gunakan manual AES-256-CBC decrypt dengan key hardcoded.',
          interpretation: 'Plaintext credential → gunakan untuk lateral movement atau privilege escalation.',
          evidence_to_record: ['cpassword nilai asli', 'Plaintext hasil decrypt', 'Bukti penggunaan credential']
        }
      ]
    }
  ]
};

// ─── PRIVESC: obs-priv-sudo-rules ──────────────────────────────────────
const sudoRulesEnrichment = {
  id: 'obs-priv-sudo-rules',
  inspection_points_add: [
    {
      id: 'sudo-wildcard-env',
      name: '2. Wildcard, Environment Variables & Shell Escapes',
      why_check: 'Aturan sudo dengan wildcard atau env_keep dapat disalahgunakan untuk melewati pembatasan.',
      what_to_look_for: [
        'Cari NOPASSWD dan wildcard (*) dalam output sudo -l',
        'Cek env_keep: apakah LD_PRELOAD atau PYTHONPATH diizinkan?',
        'Untuk binary dengan argumen wildcard: uji path traversal (misal: /usr/bin/vim /etc/passwd)',
        'Cari GTFOBins: apakah binary di-allow punya metode shell escape?'
      ],
      normal_baseline: 'Aturan sudo spesifik tanpa wildcard, tanpa NOPASSWD untuk binary berbahaya, tanpa env_keep.',
      interesting_clues: [
        'ALL=(ALL) NOPASSWD: ALL — user bisa jadi root langsung',
        'env_keep+=LD_PRELOAD — library injection saat menjalankan sudo',
        '(root) NOPASSWD: /usr/bin/vim — vim bisa spawn shell',
        'Wildcard path: (root) /usr/bin/python* /home/user/*.py'
      ],
      evidence_to_capture: [
        'Output sudo -l verbatim',
        'GTFOBins URL yang relevan untuk binary yang ditemukan',
        'Proof-of-concept command untuk shell escape (dalam lab environment)'
      ]
    }
  ],
  hypotheses_add: [
    {
      id: 'hyp-sudo-gtfobins-escape',
      name: 'Privilege Escalation via GTFOBins Shell Escape dari Sudo Binary',
      description: 'Binary yang diizinkan via sudo (vim, python, find, dll) memiliki metode shell escape yang terdokumentasi di GTFOBins.',
      status: 'CANDIDATE',
      supporting_signals: [],
      safe_validation_steps: [
        {
          step_number: 1,
          action: 'Cek https://gtfobins.github.io/ untuk binary yang ditemukan. Contoh: sudo vim -c ":!/bin/bash"',
          expected_output: 'Perintah tidak diizinkan atau binary tidak ada dalam GTFOBins.',
          interesting_output: 'Shell prompt baru dengan euid=0 (root).',
          unexpected_output: 'Binary crash atau error permission.',
          interpretation: 'Shell dengan euid=0 → privesc via GTFOBins berhasil, severity Critical.',
          evidence_to_record: ['Output `id` dan `whoami` setelah exploit', 'GTFOBins payload yang digunakan']
        }
      ]
    }
  ]
};

// ─── APPLY ENRICHMENTS ────────────────────────────────────────────────────

const enrichmentMap = {
  'obs-web-session-cookie': sessionCookieEnrichment,
  'obs-web-password-reset': passwordResetEnrichment,
  'obs-net-smb': smbEnrichment,
  'obs-priv-sudo-rules': sudoRulesEnrichment,
};

function applyEnrichment(node, enrichment) {
  if (enrichment.inspection_points_add) {
    const existingIpIds = new Set((node.inspection_points || []).map(p => p.id));
    for (const ip of enrichment.inspection_points_add) {
      if (!existingIpIds.has(ip.id)) {
        node.inspection_points.push(ip);
      }
    }
  }
  if (enrichment.interesting_signals_add) {
    const existingSigIds = new Set((node.interesting_signals || []).map(s => s.id));
    for (const sig of enrichment.interesting_signals_add) {
      if (!existingSigIds.has(sig.id)) {
        node.interesting_signals.push(sig);
      }
    }
  }
  if (enrichment.hypotheses_add) {
    const existingHypIds = new Set((node.hypotheses || []).map(h => h.id));
    for (const hyp of enrichment.hypotheses_add) {
      if (!existingHypIds.has(hyp.id)) {
        node.hypotheses.push(hyp);
      }
    }
  }
  return node;
}

// Process each modular file
const files = fs.readdirSync(OBS_DIR).filter(f => f.endsWith('.json'));
let totalEnriched = 0;

for (const file of files) {
  const filePath = path.join(OBS_DIR, file);
  const nodes = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;

  for (let i = 0; i < nodes.length; i++) {
    const enrichment = enrichmentMap[nodes[i].id];
    if (enrichment) {
      const before = JSON.stringify(nodes[i]).length;
      nodes[i] = applyEnrichment(nodes[i], enrichment);
      const after = JSON.stringify(nodes[i]).length;
      if (after > before) {
        console.log(`✅ Enriched ${nodes[i].id} in ${file}: IPs=${nodes[i].inspection_points.length}, Sigs=${nodes[i].interesting_signals.length}, Hyps=${nodes[i].hypotheses.length}`);
        changed = true;
        totalEnriched++;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(nodes, null, 2), 'utf8');
  }
}

console.log(`\n✅ Enrichment complete: ${totalEnriched} nodes enriched across modular files.`);
console.log('Run node scripts/compile-observations.mjs to rebuild observations.json');
