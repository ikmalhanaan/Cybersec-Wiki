import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../src/data');
const OBS_DIR = path.join(DATA_DIR, 'observations');

// Helper to safely extract nodes
const webNodeMap = new Map();

function addNodes(arr) {
  for (const n of arr) {
    if (n.category === 'Web') {
      webNodeMap.set(n.id, n);
    }
  }
}

// 1. Read observations.json
if (fs.existsSync(path.join(DATA_DIR, 'observations.json'))) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'observations.json'), 'utf8'));
    addNodes(raw);
  } catch(e) {}
}

// 2. Define the missing web nodes: obs-web-oauth-sso, obs-web-cors-headers, obs-web-technology-fingerprint
const missingWebNodes = [
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
    "why_it_matters": "OAuth 2.0 mendelegasikan verifikasi identitas ke Identity Provider (IdP). Miskonfigurasi validasi `redirect_uri` (mengizinkan open redirect atau subdomain wildcard) memungkinkan penyerang mencuri Authorization Code korban. Ketiadaan atau prediktabilitas parameter `state` membuka celah CSRF Login (Account Linking CSRF).",
    "questions_to_ask": [
      "Apakah parameter `state` digunakan dan memiliki nilai acak berentropi tinggi?",
      "Bagaimana server IdP memvalidasi `redirect_uri` (apakah menerima path traversal atau wildcard domain)?",
      "Bagaimana Authorization Code dipertukarkan dengan token sesi di backend?",
      "Apakah ada kebocoran kode otorisasi via header Referer ke domain pihak ketiga?"
    ],
    "inspection_points": [
      {
        "id": "oauth-redirect-validation",
        "name": "1. Audit Validasi Parameter redirect_uri",
        "why_check": "Memastikan kode otorisasi tidak dapat dibelokkan ke server penyerang.",
        "what_to_look_for": [
          "redirect_uri=https://target.com/callback -> ubah ke https://target.com.attacker.com/callback",
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
      },
      {
        "id": "oauth-state-csrf",
        "name": "2. Pemeriksaan Parameter State (CSRF Mitigation)",
        "why_check": "Mencegah penyerang menghubungkan akun sosialnya ke sesi korban.",
        "what_to_look_for": ["Parameter `state=` pada request authorize dan respon callback"],
        "normal_baseline": "Nilai `state` acak tinggi terikat ke sesi browser pengguna pemohon.",
        "interesting_clues": [
          "Parameter `state` tidak disertakan sama sekali",
          "Nilai `state` statis atau dapat diprediksi"
        ],
        "evidence_to_capture": [
          "Request OAuth tanpa parameter state yang tetap diterima server"
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
    "unexpected_signals": ["IdP mengembalikan pesan error 'Invalid client secret' di sisi browser client (kebocoran client secret)"],
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
      "Mengira OAuth flow selalu rentan hanya karena tidak menggunakan PKCE (PKCE diwajibkan untuk SPA/mobile, namun web server-side confidential client aman jika client secret terlindungi)."
    ],
    "ctf_notes": "Di CTF, OAuth challenge sering kali menggabungkan Open Redirect pada halaman internal dengan OAuth redirect_uri untuk mengekstrak token via referer header.",
    "pentest_notes": "OAuth Redirect URI Bypass adalah temuan High/Critical karena berujung pada Account Takeover tanpa interaksi password.",
    "unknown_guide": {
      "what_is_this": "Protokol standar industri untuk otorisasi yang memungkinkan pengguna login menggunakan akun pihak ketiga (Google, GitHub, Microsoft).",
      "why_does_it_exist": "Menghilangkan kebutuhan pengguna membuat dan mengingat password baru di setiap situs web.",
      "what_parts_matter": "Parameter client_id, redirect_uri, response_type, dan state.",
      "what_normal_looks_like": "Redirect URI dikunci ketat ke domain resmi dan parameter state acak digunakan untuk mencegah CSRF.",
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
      "Mengira `Access-Control-Allow-Origin: *` pada data publik (seperti font atau gambar) adalah kerentanan (ini normal dan aman jika tanpa credentials).",
      "Lupa bahwa browser memblokir kombinasi wildcard `*` dengan `Allow-Credentials: true` (eksploitasi hanya mungkin jika origin di-echo/direfleksikan)."
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
    "why_it_matters": "Mengenali arsitektur teknologi (PHP, ASP.NET, Java Spring, NodeJS, Python Flask) dan CMS yang digunakan mempersempit ribuan payload generic menjadi pengujian yang tepat sasaran. Contoh: jika target adalah ASP.NET IIS, tester fokus pada des ভerialization .NET dan bypass IIS, bukan LFI wrapper PHP. Mengidentifikasi teknologi BUKAN kerentanan; ini adalah kompas strategi.",
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
      "Mencoba payload PHP (seperti phpinfo() atau php://filter) pada aplikasi yang jelas-jelas menggunakan backend NodeJS atau Python.",
      "Mengasumsikan versi yang tertera di header selalu akurat (header sering kali dapat dipalsukan)."
    ],
    "ctf_notes": "Di CTF, melihat bahasa backend (misal: Werkzeug = Python, Express = NodeJS, PHP) langsung menentukan jenis deserialization, template injection (SSTI), atau command injection payload yang relevan.",
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

// Add missing web nodes
for (const n of missingWebNodes) {
  webNodeMap.set(n.id, n);
}

console.log(`Web node map currently has ${webNodeMap.size} nodes.`);
