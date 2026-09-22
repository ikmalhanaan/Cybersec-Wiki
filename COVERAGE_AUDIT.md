# 🛡️ COVERAGE AUDIT — Master Domain Taxonomy vs Repository Coverage

> **Proyek:** Cyber Security Hanz  
> **Tanggal Audit:** 22 September 2026  
> **Versi Audit:** 1.0  
> **Status Dokumen:** Living Document — diperbarui setiap Phase baru selesai

---

## ⚠️ Disclaimer Penting

> [!IMPORTANT]
> **38 node yang terdaftar di bawah ini adalah Phase 1 Seed — bukan klaim coverage lengkap.**
> Tujuan Phase 1 adalah membangun fondasi modular dan memvalidasi skema JSON serta alur reasoning chain. Coverage penuh terhadap seluruh 24+ domain taksonomi akan dicapai secara bertahap melalui Phase 2, Phase 3, dan seterusnya. Jangan interpretasikan keberadaan satu node dalam suatu domain sebagai "domain tersebut sudah selesai dicakup".

---

## 📚 Tentang 24 Master Domain Taxonomy

Cyber Security Hanz mengorganisir seluruh pengetahuan keamanan siber ke dalam **24 Master Domain Taxonomy**. Setiap domain merepresentasikan area teknis yang berdiri sendiri, namun saling terhubung melalui jaringan observation node.

Taksonomi ini dirancang untuk mencakup:

| Kategori Besar | Cakupan |
|---|---|
| **Infrastructure & Network** | AD, Network Discovery, Services, Protocols |
| **Web Application** | Auth, Session, Authorization, Input Handling, APIs |
| **Post-Exploitation** | PrivEsc, Lateral Movement, Persistence, Pivoting |
| **Cloud & Modern Stack** | Cloud, Container/K8s, Serverless |
| **Client & Mobile** | Mobile APK, DOM Attacks, Client-Side |
| **Advanced Exploitation** | Binary, Reverse Engineering, Crypto |
| **Emerging Attack Surfaces** | GraphQL, WebSocket, HTTP Smuggling, Race Condition |
| **Intelligence & Recon** | OSINT, Reconnaissance |

Setiap observation node (`obs-*`) dalam repository ini dipetakan ke **tepat satu domain primer** dan dapat memiliki referensi silang ke domain sekunder.

---

## 📊 Tabel Audit Matrix: Domain × Coverage

> [!NOTE]
> Kolom **Gap Nodes** merujuk pada node yang *diidentifikasi perlu dibuat* namun belum ada di repository. Ini adalah daftar non-exhaustive — gap aktual bisa lebih besar.

| # | Domain | Phase 1 Seed Nodes | Workflow Coverage | Gap Nodes (Belum Dibuat) | Status |
|---|--------|--------------------|--------------------|--------------------------|--------|
| 01 | **Identity & Active Directory** | `obs-ad-dc-port-group` `obs-ad-asrep-roastable` `obs-ad-kerberoastable-spn` | Enumeration DC, AS-REP Roasting, Kerberoasting | BloodHound ingestion, ACL abuse, DCSync, Pass-the-Hash, Pass-the-Ticket, Golden/Silver Ticket, LDAP enumeration, GPO abuse | 🟡 Partial |
| 02 | **Network Discovery** | `obs-net-open-port-unknown` | Port scanning, unknown service fingerprinting | Host discovery, OS fingerprinting, TTL analysis, firewall evasion indicators, network topology mapping | 🟡 Partial |
| 03 | **Service Enumeration** | `obs-net-service-banner` | Banner grabbing, version fingerprinting | Service version correlation, CVE lookup integration, null session enumeration | 🟡 Partial |
| 04 | **Network Services** | `obs-net-ftp` `obs-net-ssh` `obs-net-smb` `obs-net-rpc` `obs-net-snmp` `obs-net-smtp` | FTP anon login, SSH weak config, SMB enum, RPC null, SNMP community, SMTP relay | Telnet, LDAP, NFS, IMAP/POP3, TFTP, RDP, VNC, MSSQL Named Pipes, WinRM | 🟡 Partial |
| 05 | **Database Services** | `obs-net-database` | DB port exposure, auth bypass detection | MySQL privilege check, MSSQL xp_cmdshell, NoSQL injection indicator, Redis unauth, MongoDB no-auth | 🟡 Partial |
| 06 | **Authentication** | `obs-web-login-page` `obs-web-registration` `obs-web-password-reset` `obs-web-mfa-otp` | Login form analysis, registration flow, password reset, MFA/OTP | Brute force indicators, credential stuffing, account lockout bypass, 2FA bypass, magic link analysis | 🟡 Partial |
| 07 | **Session Management** | `obs-web-session-cookie` `obs-web-cookie-attributes` | Session cookie analysis, cookie attribute audit | Session fixation, token predictability, concurrent session control, idle timeout | 🟡 Partial |
| 08 | **Authorization & Access Control** | `obs-web-id-parameter` | IDOR via ID parameter | BOLA/BFLA detection, function-level auth bypass, path traversal, object-level authorization | 🟡 Partial |
| 09 | **Web Application (Input Handling)** | `obs-web-search-field` `obs-web-form-input` `obs-web-error-message` `obs-web-file-upload` `obs-web-backup-config-file` `obs-web-url-query-param` | XSS/SQLi entry points, file upload, error disclosure, URL parameter abuse | Path traversal via input, CSV injection, log injection, open redirect via parameter | 🟡 Partial |
| 10 | **Administration & Access Control** | `obs-web-admin-panel` | Admin panel exposure | Default credentials check, admin function enumeration, role assignment bypass | 🟡 Partial |
| 11 | **API Security** | `obs-web-api-endpoint` | API endpoint discovery | Mass assignment, broken object property level auth, rate limiting bypass, API versioning exposure | 🟡 Partial |
| 12 | **Authentication & Session (Token-Based)** | `obs-web-jwt` | JWT analysis, algorithm confusion | JWT none alg, weak secret brute force, JWK injection, kid header injection | 🟡 Partial |
| 13 | **Federated Identity & OAuth** | `obs-web-oauth-sso` | OAuth flow analysis, SSO misconfiguration | CSRF on OAuth, redirect_uri bypass, state parameter bypass, implicit flow risks, PKCE downgrade | 🟡 Partial |
| 14 | **Client-Side Security** | `obs-web-cors-headers` | CORS misconfiguration | CSP bypass, clickjacking, Subresource Integrity, JSONP abuse, postMessage vulnerabilities | 🟡 Partial |
| 15 | **Information Disclosure** | `obs-web-technology-fingerprint` | Tech stack fingerprinting | Source code exposure, .git folder exposure, debug endpoint, stack trace disclosure, robots.txt secrets | 🟡 Partial |
| 16 | **Privilege Escalation** | `obs-priv-suid-binary` `obs-priv-sudo-rules` `obs-priv-writable-system` `obs-priv-credential-history` | SUID abuse, sudo misconfiguration, writable path, credential in history | Cron job abuse, PATH hijacking, weak file permissions, capabilities abuse, LD_PRELOAD, kernel exploit indicators | 🟡 Partial |
| 17 | **Cloud Security** | `obs-cloud-s3-bucket` | S3 bucket public exposure | IAM misconfiguration, instance metadata SSRF (IMDS), lambda permission abuse, GCP/Azure equivalents, secrets in env vars | 🟡 Partial |
| 18 | **Mobile Security** | `obs-mobile-apk-debuggable` | APK debuggable flag | Hardcoded secrets in APK, exported components, WebView misconfiguration, certificate pinning bypass, insecure data storage | 🟡 Partial |
| 19 | **Cryptography** | `obs-crypto-unknown-hash` | Hash identification | Weak cipher suites (TLS), ECB mode detection, padding oracle indicators, RSA small exponent, entropy analysis | 🟡 Partial |
| 20 | **Reconnaissance / OSINT** | *(belum ada)* | *(belum ada)* | DNS enumeration, WHOIS, Shodan/Censys indicators, email harvesting, employee OSINT, subdomain takeover | 🔴 Gap |
| 21 | **Lateral Movement** | *(belum ada)* | *(belum ada)* | Pass-the-Hash lateral, WMI/DCOM abuse, PsExec, RDP session hijacking, SSH key reuse, credential spraying | 🔴 Gap |
| 22 | **Pivoting & Tunneling** | *(belum ada)* | *(belum ada)* | SSH port forwarding, SOCKS proxy setup, DNS tunneling, HTTP tunneling, Chisel/Ligolo indicators | 🔴 Gap |
| 23 | **Post-Exploitation & Persistence** | *(belum ada)* | *(belum ada)* | Cron backdoor, systemd service backdoor, SSH authorized_keys, web shell upload, scheduled task (Windows), registry run keys | 🔴 Gap |
| 24 | **Container & Kubernetes** | *(belum ada)* | *(belum ada)* | Docker socket exposure, privileged container, K8s RBAC misconfiguration, etcd exposure, image secrets | 🔴 Gap |
| 25 | **Wireless Security** | *(belum ada)* | *(belum ada)* | WPA2 handshake capture, evil twin indicators, WPS vulnerability, PMKID attack | 🔴 Gap |
| 26 | **Binary Exploitation** | *(belum ada)* | *(belum ada)* | Buffer overflow indicators, format string, ROP gadget identification, ASLR/NX/PIE detection, heap exploitation | 🔴 Gap |
| 27 | **Reverse Engineering** | *(belum ada)* | *(belum ada)* | Obfuscated binary analysis, strings extraction, dynamic analysis indicators, anti-debug techniques | 🔴 Gap |
| 28 | **Server-Side Request Forgery (SSRF)** | *(belum ada)* | *(belum ada)* | URL parameter pointing to internal, webhook URL injection, PDF generator SSRF, redirect-based SSRF | 🔴 Gap |
| 29 | **Template Injection (SSTI)** | *(belum ada)* | *(belum ada)* | Jinja2/Twig/Freemarker indicators, math expression in output, template error messages | 🔴 Gap |
| 30 | **Deserialization** | *(belum ada)* | *(belum ada)* | Java serialized object magic bytes, PHP unserialize, Python pickle, .NET BinaryFormatter | 🔴 Gap |
| 31 | **XML/XXE Injection** | *(belum ada)* | *(belum ada)* | XML content-type accepted, DOCTYPE allowed, external entity indicator, blind XXE via OOB | 🔴 Gap |
| 32 | **WebSocket Security** | *(belum ada)* | *(belum ada)* | WebSocket upgrade headers, WS message tampering, WS auth bypass, CSWSH | 🔴 Gap |
| 33 | **GraphQL Security** | *(belum ada)* | *(belum ada)* | Introspection enabled, batch query abuse, deeply nested query, field suggestion disclosure | 🔴 Gap |
| 34 | **HTTP Request Smuggling** | *(belum ada)* | *(belum ada)* | TE.CL / CL.TE desync indicators, frontend-backend proxy mismatch, chunked encoding anomaly | 🔴 Gap |
| 35 | **DOM-based Client-Side Attacks** | *(belum ada)* | *(belum ada)* | DOM XSS sinks, `document.write` with user input, `innerHTML` assignment, `location.hash` abuse | 🔴 Gap |
| 36 | **Race Condition Indicators** | *(belum ada)* | *(belum ada)* | Concurrent request on critical operation, double spend on balance, TOCTOU on file op | 🔴 Gap |

### Legenda Status

| Ikon | Status | Arti |
|------|--------|------|
| 🟢 | **Complete** | Seed node ada, workflow coverage representatif untuk domain |
| 🟡 | **Partial** | Ada ≥1 seed node, tapi masih banyak gap yang perlu diisi |
| 🔴 | **Gap** | Belum ada satu pun node untuk domain ini |

---

## 📈 Ringkasan Statistik Phase 1

```
Total Domain dalam Taxonomy  : 36
Domain dengan Phase 1 Seed   : 19  (52.8%)
Domain tanpa seed (Gap)      : 17  (47.2%)

Total Observation Nodes      : 38
Node per Domain (rata-rata)  : 2.0 (dari domain yang sudah ada seed)
Domain paling banyak node    : Network Services (6 nodes)
Domain paling sedikit node   : 14 domain dengan 1 node
```

---

## 🗺️ Roadmap Phase 2 Expansion

Prioritas Phase 2 diurutkan berdasarkan **frekuensi penggunaan dalam CTF/pentest nyata** dan **keterkaitan dengan node Phase 1 yang sudah ada**.

### 🔴 Prioritas Tinggi — Ekstensi Langsung dari Phase 1

Node-node berikut adalah ekstensi natural dari seed Phase 1 yang sudah ada:

| Priority | Node yang Perlu Dibuat | Alasan |
|----------|------------------------|--------|
| P1 | `obs-ad-acl-abuse` | Ekstensi dari AD domain — ACL adalah vektor utama di pentest AD |
| P1 | `obs-ad-dcsync` | Natural follow-up dari Kerberoasting |
| P1 | `obs-ad-bloodhound-path` | Integrasi dengan tooling umum |
| P1 | `obs-net-rdp` | Salah satu service paling umum, belum ada seed |
| P1 | `obs-web-sqli-indicator` | Web input nodes butuh SQL injection counterpart |
| P1 | `obs-web-xss-reflected` | Pair alami dengan `obs-web-search-field` |
| P1 | `obs-web-path-traversal` | Ekstensi dari file upload dan URL param nodes |
| P1 | `obs-priv-cron-abuse` | Ekstensi natural dari PrivEsc domain |

### 🟠 Prioritas Sedang — Domain Baru dengan Nilai Tinggi

| Priority | Node yang Perlu Dibuat | Domain |
|----------|------------------------|--------|
| P2 | `obs-recon-subdomain-enum` | Reconnaissance / OSINT |
| P2 | `obs-recon-dns-zone-transfer` | Reconnaissance / OSINT |
| P2 | `obs-ssrf-url-parameter` | SSRF |
| P2 | `obs-ssti-math-expression` | Template Injection |
| P2 | `obs-deser-java-magic-bytes` | Deserialization |
| P2 | `obs-xxe-doctype-indicator` | XML/XXE |
| P2 | `obs-lateral-pass-the-hash` | Lateral Movement |
| P2 | `obs-persist-cron-backdoor` | Post-Exploitation |
| P2 | `obs-container-docker-socket` | Container Security |
| P2 | `obs-graphql-introspection` | GraphQL |

### 🟡 Prioritas Rendah — Specialized / Advanced

| Priority | Node yang Perlu Dibuat | Domain |
|----------|------------------------|--------|
| P3 | `obs-binex-buffer-overflow` | Binary Exploitation |
| P3 | `obs-reveng-strings-analysis` | Reverse Engineering |
| P3 | `obs-wireless-wpa2-handshake` | Wireless Security |
| P3 | `obs-ws-upgrade-tampering` | WebSocket Security |
| P3 | `obs-http-smuggling-te-cl` | HTTP Request Smuggling |
| P3 | `obs-dom-xss-sink` | DOM-based Attacks |
| P3 | `obs-race-condition-concurrent` | Race Condition |

---

## 🔄 Proses Update Dokumen Ini

Dokumen ini harus diperbarui setiap kali:

1. **Node baru ditambahkan** → Update kolom "Phase 1 Seed Nodes" pada row domain terkait
2. **Domain baru selesai** → Ubah status dari 🔴 ke 🟡 atau 🟢
3. **Phase baru dimulai** → Tambah kolom "Phase N Seed Nodes" jika relevan
4. **Gap baru teridentifikasi** → Tambahkan ke kolom "Gap Nodes" domain terkait

> [!TIP]
> Gunakan command `grep -r "obs-" ./` pada root repository untuk mendapatkan daftar semua node yang ada saat ini, lalu bandingkan dengan tabel di atas untuk menemukan ketidaksesuaian.

---

*Dokumen ini dibuat oleh Cyber Security Hanz Project — untuk keperluan internal tracking dan roadmap planning.*
