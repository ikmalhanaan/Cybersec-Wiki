import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../src/data');
const OBS_DIR = path.join(DATA_DIR, 'observations');

const webMap = new Map();

// Helper to add nodes
function addNodes(nodes) {
  if (Array.isArray(nodes)) {
    for (const n of nodes) {
      if (n && n.category === 'Web') {
        webMap.set(n.id, n);
      }
    }
  }
}

// 1. From observations.json
if (fs.existsSync(path.join(DATA_DIR, 'observations.json'))) {
  try {
    addNodes(JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'observations.json'), 'utf8')));
  } catch(e) {}
}

// 2. Add remaining nodes
const extraNodes = [
  {
    "id": "obs-web-id-parameter",
    "title": "Parameter Identitas / Objek Terdeteksi (ID / Object Reference Parameter)",
    "domain": "Authorization & Access Control",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "URL query parameter: ?id=101, ?user_id=45, ?account=A88, ?doc_id=9281",
      "REST URL path: /api/v1/users/42, /orders/1002/invoice, /patient/554/records",
      "JSON body field: {\"accountId\": 1044, \"reportId\": 88}",
      "Header kustom: X-User-Id: 50"
    ],
    "context": "Ditemukan saat membuka profil user, melihat riwayat transaksi, mengunduh file faktur, atau mengedit data akun sendiri.",
    "why_it_matters": "Ketika aplikasi menerima pengidentifikasi objek langsung dari client untuk menentukan data mana yang akan diakses, server wajib melakukan verifikasi otorisasi: 'Apakah pengguna yang sedang login berhak melihat/mengubah objek ini?'. Mengubah ID adalah tes otorisasi, bukan bukti IDOR sebelum data objek milik user lain berhasil diakses.",
    "questions_to_ask": [
      "Apakah nilai ID berupa angka sequential (1, 2, 3...) atau GUID/UUID berentropi tinggi?",
      "Bagaimana server merespons jika nilai ID diubah ke ID milik user lain atau ID dummy?",
      "Apakah endpoint ini memerlukan otentikasi (cookie/token) atau dapat diakses publik?",
      "Metode HTTP apa saja yang didukung (GET untuk baca, PUT/DELETE untuk ubah/hapus)?"
    ],
    "inspection_points": [
      {
        "id": "id-predictability",
        "name": "1. Format & Prediktabilitas Pengidentifikasi (ID Predictability)",
        "why_check": "Mengetahui seberapa mudah penyerang dapat menebak atau mengiterasi objek lain.",
        "what_to_look_for": [
          "Sequential integer (101, 102, 103)",
          "Pola hash yang dapat di-rekonstruksi (misal: MD5 dari username atau timestamp)",
          "UUID v1 vs UUID v4"
        ],
        "normal_baseline": "Aplikasi modern menggunakan pengidentifikasi non-prediktif (UUID v4) atau memeriksa kepemilikan objek di session server.",
        "interesting_clues": [
          "ID berupa angka sequential kecil yang dapat di-increment dengan mudah",
          "ID merupakan string base64 dari ID numerik"
        ],
        "evidence_to_capture": [
          "Contoh URL dan nilai parameter ID dari akun tester",
          "Pola penomoran ID yang diamati"
        ]
      },
      {
        "id": "id-authorization-boundary",
        "name": "2. Batas Otorisasi Objek (Horizontal & Vertical Boundary)",
        "why_check": "Menguji apakah server memeriksa kepemilikan objek terhadap sesi user aktif.",
        "what_to_look_for": [
          "Respon saat ID diubah menjadi ID milik akun tester kedua dengan role setara",
          "Respon saat ID diubah menjadi ID objek milik akun admin"
        ],
        "normal_baseline": "Server menolak akses dengan HTTP 403 Forbidden atau 404 Not Found.",
        "interesting_clues": [
          "Server mengembalikan HTTP 200 OK dengan payload data lengkap milik pengguna lain",
          "Data berhasil terubah saat mengirim method PUT/POST dengan ID pengguna lain"
        ],
        "evidence_to_capture": [
          "Request & Response akun A saat mengakses objek A",
          "Request & Response akun A saat mengakses objek B",
          "Data sensitif yang terungkap"
        ]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-idor-success",
        "inspection_point_id": "id-authorization-boundary",
        "signal_description": "Mengubah ID parameter mengembalikan data profil pengguna lain dengan status 200 OK.",
        "output_snippet": "GET /api/user?id=102 HTTP/1.1\nCookie: session_user_101\n\nHTTP/1.1 200 OK\n{\"id\": 102, \"name\": \"Bob Smith\", \"email\": \"bob@corp.local\", \"salary\": 85000}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Aplikasi mengambil objek dari database hanya berdasarkan parameter ID tanpa mencocokkan session ID pemanggil (Insecure Direct Object Reference / BOLA).",
        "hypothesis_id": "hyp-idor-horizontal",
        "evidence_to_capture": [
          "Request akun tester 1 mengakses objek 101",
          "Request akun tester 1 mengakses objek 102 beserta respons berisi data akun tester 2"
        ]
      }
    ],
    "unexpected_signals": [
      "HTTP 500 SQL syntax error saat parameter ID diisi karakter kutip tunggal"
    ],
    "hypotheses": [
      {
        "id": "hyp-idor-horizontal",
        "name": "Horizontal Insecure Direct Object Reference (IDOR / BOLA)",
        "description": "Pengguna dapat membaca atau memodifikasi data milik pengguna lain pada tingkat hak akses yang sama.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-idor-success"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Buat 2 akun uji coba mandiri: Akun A (ID: 101) dan Akun B (ID: 102).",
            "expected_output": "Akun A hanya dapat mengakses objek 101.",
            "interesting_output": "Akun A dapat melihat invoice/profil milik objek 102.",
            "unexpected_output": "Akun terkunci.",
            "interpretation": "Membuktikan ketiadaan validasi ACL pada backend.",
            "evidence_to_record": ["Side-by-side burp repeater logs"]
          }
        ]
      }
    ],
    "stop_conditions": [
      "Server konsisten mengembalikan HTTP 403 Forbidden atau 401 Unauthorized saat ID diubah.",
      "Aplikasi mengabaikan parameter ID dan selalu menampilkan data dari sesi user aktif."
    ],
    "common_mistakes": [
      "Menguji IDOR pada data pengguna nyata tanpa izin (selalu gunakan 2 akun milik tester sendiri)."
    ],
    "ctf_notes": "Di CTF, IDOR sering kali berupa parameter numerik sederhana pada fitur invoice (?id=1) atau catatan rahasia admin (/api/notes/1).",
    "pentest_notes": "IDOR / BOLA adalah temuan peringkat #1 di OWASP API Security Top 10.",
    "unknown_guide": {
      "what_is_this": "Bagian dari URL, body, atau header yang menentukan nomor file atau baris database yang diminta.",
      "why_does_it_exist": "Memberitahu backend objek mana yang ingin ditampilkan atau diedit oleh client.",
      "what_parts_matter": "Nama variabel parameter, nilai identifier, dan apakah server memeriksa hak akses kepemilikan objek.",
      "what_normal_looks_like": "Server hanya mengizinkan user mengakses ID yang terikat dengan session akunnya sendiri.",
      "what_to_record_immediately": ["URL lengkap dan nama parameter ID", "Nilai ID akun Anda sendiri"]
    },
    "negative_result_guide": {
      "summary": "Server menolak akses ke objek lain dengan HTTP 403 Forbidden yang benar.",
      "why_not_secure": "Proteksi IDOR pada endpoint profil tidak menjamin endpoint ekspor PDF atau update password memiliki proteksi serupa.",
      "next_pivot_observations": ["obs-web-api-endpoint", "obs-web-form-input"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "27",
        "slug": "idor-access-control",
        "title": "27. IDOR & Access Control Workflow",
        "section_title": "1.1 IDOR Identification",
        "anchor": "11-idor-identification",
        "rationale": "Pelajari metodologi sistematis menemukan dan mengeksploitasi IDOR horizontal dan vertikal."
      }
    ],
    "related_observations": ["obs-web-url-query-param", "obs-web-api-endpoint"],
    "provenance": ["OWASP WSTG-ATHZ-04", "OWASP API Security Top 10 API1:2023"]
  },
  {
    "id": "obs-web-file-upload",
    "title": "Fitur Unggah File Terdeteksi (File Upload Interface)",
    "domain": "Server-Side Vulnerabilities",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "Form input HTML: <input type='file' name='avatar'>",
      "Drag-and-drop zone untuk file upload",
      "Header request HTTP: Content-Type: multipart/form-data"
    ],
    "context": "Ditemukan pada pengaturan profil user, form pendaftaran kerja, atau sistem ticketing.",
    "why_it_matters": "Jika server menyimpan file di direktori web-accessible dan mengeksekusinya via web server handler (PHP, ASPX, JSP, Python), penyerang dapat mencapai Remote Code Execution (RCE).",
    "questions_to_ask": [
      "Tipe file apa yang diharapkan oleh aplikasi?",
      "Apakah validasi dilakukan di client-side (JavaScript) atau server-side?",
      "Di mana file disimpan? Apakah direktori penyimpanan dapat diakses langsung via URL browser?",
      "Apakah direktori penyimpanan memiliki izin eksekusi script?"
    ],
    "inspection_points": [
      {
        "id": "upload-validation-layers",
        "name": "1. Lapisan Validasi File (Extension, MIME, Content)",
        "why_check": "Mengetahui di mana dan bagaimana filter upload diterapkan.",
        "what_to_look_for": ["Ekstensi file", "Header Content-Type", "Magic bytes"],
        "normal_baseline": "Server memverifikasi ekstensi terhadap whitelist ketat dan memeriksa magic bytes.",
        "interesting_clues": [
          "Validasi hanya berjalan di JavaScript browser",
          "Blacklist filtering tidak lengkap (.phtml lolos filter .php)"
        ],
        "evidence_to_capture": ["Tangkapan request multipart mentah", "Daftar ekstensi yang diterima vs ditolak"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-upload-ext-bypass",
        "inspection_point_id": "upload-validation-layers",
        "signal_description": "File berekstensi script alternatif (.phtml) berhasil diunggah dengan status 200 OK.",
        "output_snippet": "POST /upload.php HTTP/1.1\nContent-Disposition: form-data; name=\"file\"; filename=\"test.phtml\"\n\nHTTP/1.1 200 OK\n{\"status\": \"success\", \"url\": \"/uploads/test.phtml\"}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Filter ekstensi server berbasis blacklist yang tidak lengkap, memblokir .php namun melewatkan ekstensi eksekutabel sekunder.",
        "hypothesis_id": "hyp-upload-rce",
        "evidence_to_capture": ["Request upload file .phtml beserta respon 200 OK"]
      }
    ],
    "unexpected_signals": ["HTTP 500 Image Processing Exception saat mengunggah file SVG"],
    "hypotheses": [
      {
        "id": "hyp-upload-rce",
        "name": "Remote Code Execution via Unrestricted Web Shell Upload",
        "description": "File skrip dieksekusi oleh web server backend saat diakses melalui browser.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-upload-ext-bypass"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Unggah file uji coba non-destruktif: info.phtml berisi `<?php echo 'SAFE_TEST_VERIFIED'; ?>`.",
            "expected_output": "File ditolak atau jika diakses menampilkan kode sumber mentah.",
            "interesting_output": "Halaman /uploads/info.phtml merender teks 'SAFE_TEST_VERIFIED'.",
            "unexpected_output": "File didownload otomatis sebagai binary.",
            "interpretation": "Mengonfirmasi server mengeksekusi skrip pengguna secara langsung.",
            "evidence_to_record": ["Curl output /uploads/info.phtml"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server menolak seluruh file selain whitelist (.jpg, .png) dan me-reencode gambar."],
    "common_mistakes": ["Langsung mengunggah webshell destruktif sebelum memvalidasi eksekusi secara aman."],
    "ctf_notes": "Di CTF, upload filter sering kali dapat dilewati dengan Null Byte atau Double Extension (.php.jpg).",
    "pentest_notes": "Dalam pentest resmi, selalu gunakan payload non-destruktif (phpinfo atau echo identifier).",
    "unknown_guide": {
      "what_is_this": "Mekanisme formulir web yang memungkinkan client mentransfer file lokal ke server target.",
      "why_does_it_exist": "Fungsionalitas bisnis umum untuk upload dokumen, avatar profil, atau laporan.",
      "what_parts_matter": "Ekstensi file, Content-Type, dan apakah direktori penyimpanan file dapat diakses publik.",
      "what_normal_looks_like": "Server hanya menerima tipe file yang relevan dan menyimpan di folder terisolasi.",
      "what_to_record_immediately": ["Request upload mentah", "Respon server dan URL file"]
    },
    "negative_result_guide": {
      "summary": "Form upload memvalidasi file secara ketat di server-side.",
      "why_not_secure": "Keamanan form upload tidak menjamin aplikasi kebal terhadap LFI via PHP wrapper.",
      "next_pivot_observations": ["obs-web-url-query-param", "obs-web-error-message"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "25",
        "slug": "file-upload",
        "title": "25. File Upload Vulnerability Workflow",
        "section_title": "1.1 File Upload Reconnaissance",
        "anchor": "11-file-upload-reconnaissance",
        "rationale": "Pelajari taksonomi lengkap bypass upload: MIME, Extension, Magic Bytes, dan Race Condition."
      }
    ],
    "related_observations": ["obs-web-url-query-param", "obs-web-form-input"],
    "provenance": ["OWASP WSTG-BUSL-08", "CWE-434"]
  },
  {
    "id": "obs-web-jwt",
    "title": "Token JWT Terdeteksi (JSON Web Token Found)",
    "domain": "Authentication & Session",
    "category": "Web",
    "phase": "Phase 1 Seed",
    "what_do_you_see": [
      "String terbagi menjadi 3 bagian yang dipisahkan oleh karakter titik (header.payload.signature)",
      "Karakter awal tipikal Base64Url: eyJ...",
      "Ditemukan di header HTTP: Authorization: Bearer eyJhbGci..."
    ],
    "context": "Muncul pada Single Page Applications (SPA), autentikasi REST API modern, dan microservices.",
    "why_it_matters": "JWT adalah standar RFC 7519 untuk pertukaran klaim terotentikasi secara stateless. Kelemahan verifikasi tanda tangan kriptografis (algoritma 'none' atau weak HMAC secret) dapat memungkinkan penyerang memalsukan identitas dan hak akses admin.",
    "questions_to_ask": [
      "Algoritma apa yang dideklarasikan pada header JWT ('alg': 'HS256', 'RS256', 'none')?",
      "Klaim apa saja yang dibawa dalam payload (sub, role, admin)?",
      "Apakah server benar-benar memvalidasi signature pada setiap request?",
      "Apakah kunci simetris HS256 rentan terhadap dictionary attack offline?"
    ],
    "inspection_points": [
      {
        "id": "jwt-header-algorithm",
        "name": "1. Inspeksi Header & Algoritma Tanda Tangan",
        "why_check": "Melihat mekanisme kriptografi yang diharapkan server.",
        "what_to_look_for": ["Nilai klaim 'alg'", "Klaim 'kid'"],
        "normal_baseline": "Algoritma asimetris kuat (RS256) atau HS256 dengan secret key panjang acak.",
        "interesting_clues": ["Header 'alg' diset ke 'none'", "Klaim 'kid' memuat path traversal"],
        "evidence_to_capture": ["JSON decoded header mentah", "Nilai string JWT asli"]
      }
    ],
    "interesting_signals": [
      {
        "id": "sig-jwt-none-accepted",
        "inspection_point_id": "jwt-header-algorithm",
        "signal_description": "Server menerima JWT dengan header 'alg': 'none' dan signature kosong.",
        "output_snippet": "GET /api/admin/metrics HTTP/1.1\nAuthorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.\n\nHTTP/1.1 200 OK\n{\"metrics\": \"secret_admin_data\"}",
        "observation_confidence": "CONFIRMED_OBSERVATION",
        "interpretation": "Backend parser JWT mengizinkan cipher none tanpa memverifikasi tanda tangan kriptografis.",
        "hypothesis_id": "hyp-jwt-none-bypass",
        "evidence_to_capture": ["Raw request dengan JWT unsigned", "Respon 200 OK administratif"]
      }
    ],
    "unexpected_signals": ["HTTP 500 JSON Parser Exception saat payload didekodekan"],
    "hypotheses": [
      {
        "id": "hyp-jwt-none-bypass",
        "name": "JWT None Algorithm Authentication Bypass",
        "description": "Penyerang dapat memodifikasi payload menjadi 'admin' dan menghapus signature untuk mendapatkan hak akses penuh.",
        "status": "CANDIDATE",
        "supporting_signals": ["sig-jwt-none-accepted"],
        "safe_validation_steps": [
          {
            "step_number": 1,
            "action": "Kirim request profil dengan token asli. Catat respon baseline. Ubah ke alg: none dan kirim ulang.",
            "expected_output": "Profil user normal.",
            "interesting_output": "Profil tetap terbaca normal atau berubah role saat alg: none digunakan.",
            "unexpected_output": "HTTP 401 Signature verification failed.",
            "interpretation": "Mengonfirmasi bypass tanda tangan token.",
            "evidence_to_record": ["Side-by-side burp repeater logs"]
          }
        ]
      }
    ],
    "stop_conditions": ["Server menolak seluruh token dengan signature tidak valid (HTTP 401)."],
    "common_mistakes": ["Menganggap keberadaan JWT adalah kerentanan."],
    "ctf_notes": "Di CTF, token JWT sering rentan terhadap Algorithm Confusion (RS256 public key treated as HS256 secret).",
    "pentest_notes": "Secret key lemah pada JWT diklasifikasikan sebagai High Severity.",
    "unknown_guide": {
      "what_is_this": "Token string kompak dan aman-URL yang membawa klaim terstruktur antar pihak.",
      "why_does_it_exist": "Memungkinkan autentikasi tanpa harus menyimpan sesi di memori server.",
      "what_parts_matter": "Tiga komponen: Header (algoritma), Payload (data user), dan Signature (keaslian).",
      "what_normal_looks_like": "Token berumur pendek yang ditandatangani dengan kunci privat kuat.",
      "what_to_record_immediately": ["String lengkap token JWT", "Hasil decode Header dan Payload"]
    },
    "negative_result_guide": {
      "summary": "JWT ditandatangani dengan algoritma kuat dan divalidasi ketat.",
      "why_not_secure": "Validitas JWT tidak mencegah penyerang mengeksploitasi IDOR di endpoint API.",
      "next_pivot_observations": ["obs-web-id-parameter", "obs-web-api-endpoint"]
    },
    "coverage": {
      "observation_coverage": "COVERED",
      "workflow_coverage": "COVERED",
      "gap_details": null
    },
    "relevant_workflows": [
      {
        "workflow_id": "28",
        "slug": "jwt",
        "title": "28. JWT Security Workflow",
        "section_title": "1.1 JWT Structure Analysis",
        "anchor": "11-jwt-structure-analysis",
        "rationale": "Pelajari anatomi token, pembedahan header, dan teknik eksploitasi none-alg & brute force."
      }
    ],
    "related_observations": ["obs-web-session-cookie", "obs-web-api-endpoint"],
    "provenance": ["RFC 7519", "OWASP WSTG-SESS-10"]
  }
];

addNodes(extraNodes);

// Read from seed-observations.mjs and seed-more-observations.mjs
// We can also require or read their contents
const filesToRead = ['scripts/seed-observations.mjs', 'scripts/assemble-web-nodes.mjs'];
for (const f of filesToRead) {
  if (fs.existsSync(f)) {
    try {
      const code = fs.readFileSync(f, 'utf8');
      // Extract objects matching id: "obs-web-...
      const matches = code.matchAll(/\{\s*"id":\s*"(obs-web-[^"]+)"[\s\S]*?\}\s*(\]|,)/g);
      // It's safer to extract JSON arrays or parse
    } catch(e) {}
  }
}
