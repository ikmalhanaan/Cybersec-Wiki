---
id: "02"
title: "02. Parrot OS Setup, Tools Ecosystem, dan Workspace Optimization"
category: "1. Fondasi"
categoryId: "fondasi"
filename: "02_parrot_os_setup_dan_tools.md"
refs_out: ["01","03"]
refs_in: ["01","03"]
---

# 02. Parrot OS Setup, Tools Ecosystem, dan Workspace Optimization

---

## 🎯 Pendahuluan

Selamat datang di panduan teknis **Setup Environment & Ekosistem Tools di Parrot OS**. Pada modul sebelumnya ([01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental](/docs/mindset-dan-metodologi)), Anda telah memahami cara berpikir seorang pentester dan siklus hidup penetrasi sistem.

Sekarang, kita akan mengubah sistem operasi **Parrot OS XFCE** Anda menjadi stasiun kerja (*workstation*) penetrasi yang cepat, terorganisir, dan siap tempur. Dokumen ini dirancang sebagai panduan referensi utama mengenai tools apa saja yang tersedia, cara memasang tools modern yang belum ada, konfigurasi workspace efisien (*tmux & aliases*), serta trik variabel lingkungan untuk mempercepat operasional sehari-hari.

---

## 🦜 1. Struktur Tools di Parrot OS

```text
+=============================================================================+
|                      PARROT OS ARCHITECTURE & TOOLING                       |
+=============================================================================+
|                                                                             |
|   +---------------------------------------------------------------------+   |
|   |                         PARROT CORE REPOSITORIES                    |   |
|   |   (Debian Testing Base + Custom Parrot Hardened Linux Kernel)       |   |
|   +---------------------------------------------------------------------+   |
|            │                                                │               |
|            ▼                                                ▼               |
|   +---------------------------------+   +-------------------------------+   |
|   |       PRE-INSTALLED TOOLS       |   |      PRIVACY & HARDENING      |   |
|   |   Nmap, Burp Suite, Metasploit  |   |   AnonSurf, Firejail Sandbox  |   |
|   |   Wireshark, John, Hashcat, etc |   |   AppArmor, Cryptsetup        |   |
|   +---------------------------------+   +-------------------------------+   |
|            │                                                │               |
|            +───────────────────────┬────────────────────────+               |
|                                    ▼                                        |
|   +---------------------------------------------------------------------+   |
|   |                      CUSTOM EXTENSIONS / MANUAL TOOLS               |   |
|   |   - Go Binaries: Feroxbuster, Naabu, Subfinder, Kerbrute            |   |
|   |   - Python Pipx: NetExec, BloodHound-Python, Impacket               |   |
|   |   - Pivoting: Ligolo-ng, Chisel, Proxychains-ng                     |   |
|   +---------------------------------------------------------------------+   |
+=============================================================================+
```

### 1.1 Pre-installed Tools vs Manual Tools
Parrot OS Security Edition hadir dengan ratusan tool penetrasi siap pakai. Namun, dunia cybersecurity berkembang sangat pesat:
* **Pre-installed (Bawaan)**: Tool klasik dan stabil seperti `nmap`, `metasploit-framework`, `burpsuite`, `john`, `hashcat`, `wireshark`, `sqlmap`, dan `aircrack-ng`.
* **Perlu Install Manual / Update Modern**: Tool generasi baru yang ditulis dalam bahasa modern seperti **Rust** atau **Go** (misal: `rustscan`, `feroxbuster`, `ligolo-ng`, `netexec`, `caido`). Tool ini umumnya jauh lebih cepat (*high-concurrency*).

---

### 1.2 Perbedaan Parrot OS vs Kali Linux

Banyak pemula bertanya mengapa memilih Parrot OS dibandingkan Kali Linux. Berikut perbandingan objektifnya:

| Fitur / Parameter | Parrot OS (XFCE Edition) | Kali Linux |
| :--- | :--- | :--- |
| **Desktop Environment** | XFCE (Sangat ringan, stabil, hemat RAM ~400-600MB idle) | XFCE / GNOME (Konsumsi RAM sedikit lebih tinggi) |
| **Fitur Privasi Bawaan** | Built-in **AnonSurf** (TOR tunnel seluruh sistem dengan 1 klik) | Memerlukan setup manual TOR & proxychains |
| **Keamanan Sistem** | Menggunakan **Firejail Sandboxing** & AppArmor secara default | Standar security profile |
| **Manajemen Paket** | `apt` terhubung ke mirror Parrot + Debian Testing | `apt` terhubung ke rolling repo Kali |
| **Package Manager Python** | Menerapkan `PEP 668` (Wajib gunakan `pipx` atau Virtualenv) | Serupa (menerapkan `pipx` pada rilis terbaru) |
| **Kenyamanan Pengguna** | Cocok untuk daily driver + pentesting + software dev | Didesain murni spesifik untuk pentesting |

> [!TIP]
> **Keunggulan Parrot XFCE**: Sangat responsif saat dijalankan di Virtual Machine (VirtualBox / VMware) dengan alokasi RAM terbatas (2GB - 4GB), sehingga sisa resource laptop Anda dapat dialokasikan untuk target lab.

---

## 📊 2. Master Tools List

Berikut adalah daftar referensi lengkap seluruh tools penting yang dikelompokkan berdasarkan kategori operasional, statusnya di Parrot OS, dan perintah pengecekan/instalasinya.

### 2.1 Reconnaissance & Scanning

| Tool | Fungsi Utama | Kategori | Status di Parrot | Install Command | Cek Versi / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **nmap** | Network mapping, port scanning, & NSE script scanning | Recon | Pre-installed | `sudo apt install nmap` | `nmap -V` |
| **rustscan** | Port scanner berbasis Rust dengan kecepatan sangat tinggi | Recon | Install Manual (.deb) | `wget https://github.com/RustScan/RustScan/releases/download/2.0.1/rustscan_2.0.1_amd64.deb && sudo dpkg -i rustscan_2.0.1_amd64.deb` | `rustscan --version` |
| **masscan** | Asynchronous port scanner skala internet | Recon | Pre-installed / Repo | `sudo apt install masscan` | `masscan --version` |
| **fping** | Multi-host ICMP pinger berkinerja tinggi | Recon | Pre-installed | `sudo apt install fping` | `fping -v` |
| **arp-scan** | Layer 2 ARP scanner untuk scanning subnet lokal | Recon | Pre-installed | `sudo apt install arp-scan` | `sudo arp-scan -V` |
| **naabu** | Fast port scanner modern berbasis Go | Recon | Install Manual | `go install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest` | `naabu -version` |

---

### 2.2 Web Directory & Subdomain Fuzzing

| Tool | Fungsi Utama | Kategori | Status di Parrot | Install Command | Cek Versi / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **gobuster** | Directory, DNS subdomain, dan vhost fuzzer berbasis Go | Web | Pre-installed / Repo | `sudo apt install gobuster` | `gobuster version` |
| **ffuf** | Web fuzzer berkecepatan tinggi dan sangat fleksibel | Web | Pre-installed / Repo | `sudo apt install ffuf` | `ffuf -V` |
| **feroxbuster** | Recursive directory discovery berbasis Rust | Web | Pre-installed / Repo | `sudo apt install feroxbuster` | `feroxbuster -V` |
| **nikto** | Web server vulnerability & misconfiguration scanner | Web | Pre-installed | `sudo apt install nikto` | `nikto -Version` |
| **whatweb** | Web technology & CMS fingerprinting scanner | Web | Pre-installed | `sudo apt install whatweb` | `whatweb --version` |
| **dirsearch** | Classic python-based directory bruteforcer | Web | Pre-installed / Repo | `sudo apt install dirsearch` | `dirsearch --version` |

---

### 2.3 Exploitation Frameworks & Search Tools

| Tool | Fungsi Utama | Kategori | Status di Parrot | Install Command | Cek Versi / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **metasploit** | Full-featured exploitation framework | Exploitation | Pre-installed | `sudo apt install metasploit-framework` | `msfconsole -v` |
| **searchsploit** | Command-line search engine untuk exploit-db offline | Exploitation | Pre-installed | `sudo apt install exploitdb` | `searchsploit -v` |
| **pocsuite3** | Remote vulnerability testing & PoC execution framework | Exploitation | Install Manual | `pipx install pocsuite3` | `pocsuite --version` |

---

### 2.4 Password Auditing & Cracking

| Tool | Fungsi Utama | Kategori | Status di Parrot | Install Command | Cek Versi / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **hashcat** | GPU-accelerated rule-based password hash cracker | Password | Pre-installed | `sudo apt install hashcat` | `hashcat --version` |
| **john** | John the Ripper multi-format CPU password cracker | Password | Pre-installed | `sudo apt install john` | `john --version` |
| **hydra** | Network logon cracker online (SSH, FTP, HTTP, RDP) | Password | Pre-installed | `sudo apt install hydra` | `hydra -v` |
| **medusa** | Fast parallel network authentication bruteforcer | Password | Pre-installed | `sudo apt install medusa` | `medusa -V` |
| **seclists** | Koleksi wordlist keamanan siber terlengkap | Wordlist | Pre-installed / Repo | `sudo apt install seclists` | `ls -la /usr/share/seclists` |

---

### 2.5 SMB & Windows Protocol Enumeration

| Tool | Fungsi Utama | Kategori | Status di Parrot | Install Command | Cek Versi / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **smbclient** | SMB/CIFS CLI client interaktif (seperti FTP) | SMB | Pre-installed | `sudo apt install smbclient` | `smbclient --version` |
| **smbmap** | Port 139/445 share permission & drive enumeration | SMB | Pre-installed | `sudo apt install smbmap` | `smbmap --version` |
| **enum4linux-ng** | Next-gen Python tool untuk enum Windows/Samba info | SMB | Pre-installed / Repo | `sudo apt install enum4linux-ng` | `enum4linux-ng -h` |
| **netexec (nxc)** | Pengganti CrackMapExec modern untuk network pentest | SMB / AD | Install Manual | `pipx install netexec` | `nxc --version` |
| **rpcclient** | MS-RPC interface interactive query tool | SMB / RPC | Pre-installed | `sudo apt install samba-common-bin` | `rpcclient -c "quit"` |

---

### 2.6 Active Directory & Domain Attacks

| Tool | Fungsi Utama | Kategori | Status di Parrot | Install Command | Cek Versi / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **bloodhound (CE)** | Visual graph analysis AD (Versi CE modern via Docker, versi apt adalah legacy) | AD | Install Manual (Docker) | `docker compose up -d` (BloodHound CE) | Web UI: `localhost:8080` |
| **bloodhound-python** | Ingestor data Active Directory non-domain joined | AD | Install Manual | `pipx install bloodhound-python` | `bloodhound-python -h` |
| **impacket** | Koleksi class Python untuk manipulasi protokol Windows | AD / Net | Pre-installed | `sudo apt install python3-impacket` | `secretsdump.py -h` |
| **kerbrute** | Kerberos user enumeration & pre-auth password spraying | AD | Install Manual | Download binary dari GitHub Releases | `kerbrute -h` |
| **evil-winrm** | Ultimate WinRM CLI shell untuk pentesting Windows | AD / Shell | Pre-installed / Repo | `sudo apt install evil-winrm` | `evil-winrm -v` |
| **certipy** | Active Directory Certificate Services (AD CS) audit | AD | Install Manual | `pipx install certipy-ad` | `certipy -h` |

---

### 2.7 Web Vulnerability Analysis & Proxies

| Tool | Fungsi Utama | Kategori | Status di Parrot | Install Command | Cek Versi / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **burpsuite** | Industry standard GUI web proxy, interceptor, & repeater | Web Proxy | Pre-installed | `sudo apt install burpsuite` | GUI Menu / `burpsuite` |
| **caido** | Modern, lightweight, fast web proxy alternatif Burp | Web Proxy | Install Manual | Download AppImage dari caido.io | GUI AppImage |
| **sqlmap** | Automated SQL injection and database takeover tool | Web Vuln | Pre-installed | `sudo apt install sqlmap` | `sqlmap --version` |
| **commix** | Automated Command Injection exploitation tool | Web Vuln | Pre-installed | `sudo apt install commix` | `commix --version` |
| **wpscan** | Black box WordPress vulnerability scanner | Web Vuln | Pre-installed | `sudo apt install wpscan` | `wpscan --version` |

---

### 2.8 Reverse Engineering & Binary Exploitation (Pwn)

| Tool | Fungsi Utama | Kategori | Status di Parrot | Install Command | Cek Versi / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ghidra** | NSA software reverse engineering & decompiler suite | Reverse Eng | Pre-installed / Repo | `sudo apt install ghidra` | `ghidra` (GUI) |
| **gdb** | GNU Project Debugger untuk analisis memori runtime | Binary Exp | Pre-installed | `sudo apt install gdb` | `gdb --version` |
| **pwndbg** | GDB plugin terbaik untuk exploit dev & CTF (butuh internet untuk setup) | Binary Exp | Install Manual | `git clone https://github.com/pwndbg/pwndbg && cd pwndbg && ./setup.sh` | `gdb -q -ex "pwndbg" -ex "quit"` |
| **pwntools** | Python framework untuk rapid exploit development | Binary Exp | Install Manual | `pipx install pwntools` atau `sudo apt install python3-pwntools` | `python3 -c "import pwn; print(pwn.__version__)"` |
| **ltrace / strace** | Dynamic tracing of library calls & system calls | Reverse Eng | Pre-installed | `sudo apt install ltrace strace` | `ltrace -V` |

---

### 2.9 Digital Forensics & Steganography

| Tool | Fungsi Utama | Kategori | Status di Parrot | Install Command | Cek Versi / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **volatility3** | Advanced memory artifact extraction & RAM analysis | Forensics | Pre-installed / Repo | `sudo apt install volatility3` | `vol -h` |
| **autopsy** | GUI digital forensics platform & hard drive analyzer | Forensics | Pre-installed / Repo | `sudo apt install autopsy` | `autopsy` (Browser UI) |
| **binwalk** | Firmware analysis and embedded file extractor | Forensics | Pre-installed | `sudo apt install binwalk` | `binwalk --help` |
| **exiftool** | Read, write, and edit media file metadata | Forensics | Pre-installed | `sudo apt install exiftool` | `exiftool -ver` |
| **wireshark** | Network protocol packet capture & GUI deep analyzer | Forensics | Pre-installed | `sudo apt install wireshark` | `wireshark -v` |
| **tshark** | Command-line version dari Wireshark untuk terminal | Forensics | Pre-installed | `sudo apt install tshark` | `tshark -v` |
| **steghide** | Steganography hide/extract data in JPEG, BMP, WAV | Stego | Pre-installed | `sudo apt install steghide` | `steghide --version` |

---

### 2.10 Cryptography & Hashing Utilities

| Tool | Fungsi Utama | Kategori | Status di Parrot | Install Command | Cek Versi / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **cyberchef** | The Cyber Swiss Army Knife (Web-based data converter) | Crypto | Web / Offline | Buka `gchq.github.io/CyberChef` atau `sudo apt install cyberchef` | Web Browser |
| **openssl** | Cryptographic toolkit & SSL/TLS certificate inspector | Crypto | Pre-installed | `sudo apt install openssl` | `openssl version` |
| **ciphey** | Automated decryption tool menggunakan AI/NLP | Crypto | Install Manual | `pipx install ciphey` | `ciphey --version` |

---

### 2.11 OSINT (Open Source Intelligence)

| Tool             | Fungsi Utama                                      | Kategori | Status di Parrot     | Install Command                                                            | Cek Versi / Status   |
| :--------------- | :------------------------------------------------ | :------- | :------------------- | :------------------------------------------------------------------------- | :------------------- |
| **theHarvester** | E-mail, subdomain, IP, and employee name gatherer | OSINT    | Pre-installed        | `sudo apt install theharvester`                                            | `theHarvester -h`    |
| **amass**        | In-depth attack surface mapping & asset discovery | OSINT    | Pre-installed / Repo | `sudo apt install amass`                                                   | `amass -version`     |
| **subfinder**    | Fast passive subdomain enumeration tool           | OSINT    | Install Manual       | `go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest` | `subfinder -version` |
| **sherlock**     | Hunt down social media accounts by username       | OSINT    | Pre-installed / Repo | `sudo apt install sherlock`                                                | `sherlock --version` |

---

### 2.12 Pivoting, Tunnelling, & Port Forwarding

| Tool | Fungsi Utama | Kategori | Status di Parrot | Install Command | Cek Versi / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ligolo-ng** | Modern, fast tunneling/pivoting via TUN interface | Pivoting | Install Manual | Download binary dari GitHub Releases | `ligolo-proxy -h` |
| **chisel** | Fast TCP/UDP tunnel over HTTP secured via SSH | Pivoting | Pre-installed / Repo | `sudo apt install chisel` | `chisel --version` |
| **proxychains4** | Redirect connections through SOCKS4/SOCKS5 proxies | Pivoting | Pre-installed | `sudo apt install proxychains4` | `proxychains4 -h` |
| **socat** | Multipurpose relay for bidirectional data transfers | Pivoting | Pre-installed | `sudo apt install socat` | `socat -V` |
| **ssh (Dynamic)** | OpenSSH client dengan built-in SOCKS proxy (`-D`) | Pivoting | Pre-installed | Built-in | `ssh -V` |

---

### 2.13 Miscellaneous Shell & Utility Tools

| Tool            | Fungsi Utama                                             | Kategori     | Status di Parrot     | Install Command                       | Cek Versi / Status |
| :-------------- | :------------------------------------------------------- | :----------- | :------------------- | :------------------------------------ | :----------------- |
| **netcat (nc)** | The Swiss Army knife for arbitrary TCP/UDP connections   | Shell/Net    | Pre-installed        | `sudo apt install netcat-traditional` | `nc -h`            |
| **rlwrap**      | Readline wrapper untuk auto-completion & history pada nc | Shell Helper | Pre-installed / Repo | `sudo apt install rlwrap`             | `rlwrap -v`        |
| **tmux**        | Terminal multiplexer (multi-pane, session detach)        | Productivity | Pre-installed        | `sudo apt install tmux`               | `tmux -V`          |
| **curl / wget** | HTTP client untuk transfer data dan file download        | Utility      | Pre-installed        | Built-in                              | `curl --version`   |
| **pipx**        | Safely install Python CLI apps in isolated environments  | Package Mgr  | Pre-installed / Repo | `sudo apt install pipx`               | `pipx --version`   |

---

## 🛠️ 3. Setup Workspace Parrot OS

Berikut adalah script otomasi lengkap untuk meng-update sistem, mengekstrak wordlist, menginstal tools penting yang belum ada, serta menata workspace CTF di Parrot OS XFCE Anda.

### 3.1 Script Otomasi Instalasi & Setup Lengkap

Salin dan jalankan script ini di terminal Parrot OS Anda:

```bash
#!/bin/bash
# =============================================================================
# SCRIPT SETUP WORKSPACE & TOOLS PENTESTING DI PARROT OS XFCE
# =============================================================================

set -e # Berhenti jika ada error kritis

echo -e "\033[1;34m[+] 1. Memperbarui repositori dan paket sistem...\033[0m"
sudo apt update && sudo apt full-upgrade -y

echo -e "\033[1;34m[+] 2. Memasang paket esensial APT...\033[0m"
sudo apt install -y \
    curl wget git tmux rlwrap seclists \
    pipx golang-go build-essential \
    proxychains4 chisel socat feroxbuster \
    enum4linux-ng evil-winrm bloodhound

echo -e "\033[1;34m[+] 3. Menyiapkan Environment PATH (Pipx & Go) secara permanen...\033[0m"
# Tambahkan ke ~/.bashrc jika belum ada agar persistent di sesi terminal baru
if ! grep -q 'export GOPATH=' "$HOME/.bashrc"; then
    echo 'export GOPATH="$HOME/go"' >> "$HOME/.bashrc"
    echo 'export PATH="$PATH:$HOME/go/bin:$HOME/.local/bin"' >> "$HOME/.bashrc"
fi
export GOPATH="$HOME/go"
export PATH="$PATH:$HOME/go/bin:$HOME/.local/bin"
pipx ensurepath

echo -e "\033[1;34m[+] 4. Memasang modern Python CLI tools via Pipx...\033[0m"
# NetExec (Pengganti CrackMapExec modern)
pipx install netexec --force
# BloodHound Python Ingestor
pipx install bloodhound-python --force
# Certipy untuk AD CS audit
pipx install certipy-ad --force

echo -e "\033[1;34m[+] 5. Memasang RustScan via .deb Release (Cepat & Tanpa Compile)...\033[0m"
if ! command -v rustscan &> /dev/null; then
    wget -q https://github.com/RustScan/RustScan/releases/download/2.0.1/rustscan_2.0.1_amd64.deb -O /tmp/rustscan.deb
    sudo dpkg -i /tmp/rustscan.deb
    rm -f /tmp/rustscan.deb
fi

echo -e "\033[1;34m[+] 6. Menyiapkan Go Tools (Subfinder & Naabu)...\033[0m"
mkdir -p "$HOME/go/bin"
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest

echo -e "\033[1;34m[+] 7. Mengekstrak Wordlist Rockyou...\033[0m"
if [ -f /usr/share/wordlists/rockyou.txt.gz ] && [ ! -f /usr/share/wordlists/rockyou.txt ]; then
    echo -e "Mengekstrak /usr/share/wordlists/rockyou.txt.gz..."
    sudo gunzip /usr/share/wordlists/rockyou.txt.gz
fi

echo -e "\033[1;34m[+] 8. Membuat direktori kerja standar CTF/Pentest...\033[0m"
mkdir -p "$HOME/ctf/htb"
mkdir -p "$HOME/ctf/thm"
mkdir -p "$HOME/ctf/tools"
mkdir -p "$HOME/ctf/wordlists"

# Buat symbolic link ke rockyou agar mudah diakses
if [ -f /usr/share/wordlists/rockyou.txt ]; then
    ln -sf /usr/share/wordlists/rockyou.txt "$HOME/ctf/wordlists/rockyou.txt"
fi

echo -e "\033[1;32m[✓] Instalasi paket dan struktur folder berhasil disiapkan!\033[0m"
```

---

### 3.2 Setup Konfigurasi Tmux Optimal (`~/.tmux.conf`)

**Tmux (*Terminal Multiplexer*)** adalah tool wajib bagi pentester. Dengan tmux, Anda bisa membagi 1 jendela terminal menjadi 4 bagian (untuk nmap scan, web fuzzing, reverse shell listener, dan note-taking) tanpa perlu membuka banyak tab terpisah.

```text
+-----------------------------------------------------------------------------+
|                                TMUX 4-PANE LAYOUT                           |
+------------------------------------+----------------------------------------+
| PANE 1: Active Scanning & Fuzzing  | PANE 2: Interactive Reverse Shell      |
| (nmap, ffuf, gobuster)             | (rlwrap nc -lvnp 4444)                 |
|                                    |                                        |
+------------------------------------+----------------------------------------+
| PANE 3: File Server & Payloads     | PANE 4: Notes & Scratchpad             |
| (python3 -m http.server 80)        | (mousepad notes.md / nano notes.md)    |
|                                    |                                        |
+------------------------------------+----------------------------------------+
```

Buat file `~/.tmux.conf` dengan konfigurasi ergonomis berikut:

```bash
cat << 'EOF' > ~/.tmux.conf
# 1. Aktifkan Mouse (Bisa klik pane, resize window dengan mouse, dan scroll terminal)
set -g mouse on

# 2. Tambah limit buffer scrollback (History terminal hingga 50.000 baris)
set -g history-limit 50000

# 3. Ubah prefix default dari Ctrl+b menjadi Ctrl+a (Lebih nyaman di jari kelingking)
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# 4. Shortcut Split Pane yang lebih intuitif:
# Ctrl+a | untuk split Horizontal (kiri-kanan)
# Ctrl+a - untuk split Vertikal (atas-bawah)
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
unbind '"'
unbind %

# 5. Navigasi antar pane menggunakan tombol Vim (h, j, k, l)
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# 6. Styling status bar yang bersih dan modern
set -g status-bg black
set -g status-fg white
set -g status-left '#[fg=green][#S] '
set -g status-right '#[fg=yellow]%Y-%m-%d %H:%M #[fg=cyan]#(ip addr show dev tun0 2>/dev/null | grep "inet " | awk "{print \$2}" | cut -d/ -f1)'
EOF
```

> [!NOTE]
> Setelah menyimpan file di atas, jalankan `tmux source-file ~/.tmux.conf` atau restart terminal Anda. Sekarang status bar Tmux Anda akan otomatis menampilkan IP VPN `tun0` Anda di pojok kanan bawah!

---

## ⚡ 4. Aliases Penting untuk Pentest & CTF

Aliases adalah shortcut perintah yang akan menghemat ribuan ketukan keyboard Anda setiap hari.

Tambahkan blok alias ini ke file `~/.bashrc` Anda:

```bash
cat << 'EOF' >> ~/.bashrc

# =============================================================================
# PENTEST & CTF PRODUCTIVITY ALIASES
# =============================================================================

# 1. Navigasi & Direktori
alias ll='ls -lah --color=auto'
alias ..='cd ..'
alias ...='cd ../..'
alias ctf='cd ~/ctf'

# 2. Network & IP Quick Check
# Menampilkan IP VPN HackTheBox/TryHackMe (tun0) seketika
alias myip="ip -brief addr show dev tun0 2>/dev/null | awk '{print \$3}' || ip -brief addr"
# Menampilkan semua port yang sedang listening di mesin lokal kita
alias ports='sudo netstat -tulpn | grep LISTEN'

# 3. Quick Local Web Server (Untuk hosting payload / reverse shell scripts)
alias serve='python3 -m http.server 80'
alias serve8080='python3 -m http.server 8080'
alias phpserve='php -S 0.0.0.0:8000'

# 4. Shell Listener Shortcuts
alias pwncat='rlwrap -cAr nc -lvnp'
alias listen='rlwrap nc -lvnp 4444'
alias listen80='rlwrap nc -lvnp 80'
alias listen443='rlwrap nc -lvnp 443'

# 5. Fast Tool Wrappers
alias rockyou='/usr/share/wordlists/rockyou.txt'
alias seclist='/usr/share/seclists'
alias nse='ls /usr/share/nmap/scripts/ | grep'

# 6. Shortcut Nmap Cepat
alias nmapfast='nmap -sS -T4 --min-rate 1000 -Pn'
alias nmapfull='nmap -sC -sV -p- -T4 --min-rate 1000 -Pn'

# =============================================================================
EOF

# Terapkan perubahan pada shell aktif
source ~/.bashrc
```

**Penjelasan Mengapa Aliases Ini Sangat Membantu:**
* `pwncat`: Menjalankan Netcat dengan `rlwrap` sehingga saat Anda mendapat reverse shell, tombol **Panah Atas** (history) dan **Backspace** berfungsi normal tanpa memunculkan karakter aneh seperti `^[[A`.
* `myip`: Memberikan IP interface VPN Anda secara instan tanpa perlu repot menjalankan `ip a` dan membaca 50 baris output.
* `serve`: Membuka HTTP file server dalam 1 detik di folder aktif untuk mentransfer script exploit ke target.

---

## 🌐 5. Environment Variables Berguna

Saat melakukan penetrasi mesin target, Anda akan mengetik IP target dan IP Anda sendiri ratusan kali. Menggunakan **Environment Variables** adalah *best practice* profesional.

```text
+-----------------------------------------------------------------------------+
|                  WORKFLOW TANPA VS DENGAN ENVIRONMENT VARIABLES             |
+-----------------------------------------------------------------------------+
| TANPA VARIABLES (Rentan Typo & Melelahkan):                                 |
| $ nmap -sC -sV 10.10.11.205                                                 |
| $ gobuster dir -u http://10.10.11.205 -w /usr/share/wordlists/...           |
| $ python3 exploit.py --target 10.10.11.205 --lhost 10.10.14.34 --lport 4444|
|                                                                             |
| DENGAN VARIABLES (Cepat, Standar, Konsisten):                               |
| $ export TARGET=10.10.11.205                                                |
| $ export LHOST=$(myip)                                                      |
| $ export LPORT=4444                                                         |
|                                                                             |
| $ nmap -sC -sV $TARGET                                                      |
| $ gobuster dir -u http://$TARGET -w /usr/share/wordlists/...                |
| $ python3 exploit.py --target $TARGET --lhost $LHOST --lport $LPORT         |
+-----------------------------------------------------------------------------+
```

### 5.1 Helper Function: Target & LHOST Setter

Tambahkan fungsi otomatis ini ke `~/.bashrc` Anda agar Anda bisa menyetel target dalam 1 detik:

```bash
cat << 'EOF' >> ~/.bashrc

# Fungsi untuk set target IP dengan cepat
set-target() {
    export TARGET="$1"
    export URL="http://$1"
    # Otomatis ambil IP interface tun0 (VPN), jika tidak ada ambil eth0
    export LHOST=$(ip -4 addr show dev tun0 2>/dev/null | grep inet | awk '{print $2}' | cut -d/ -f1)
    if [ -z "$LHOST" ]; then
        export LHOST=$(ip -4 addr show dev eth0 2>/dev/null | grep inet | awk '{print $2}' | cut -d/ -f1)
    fi
    export LPORT="4444"
    
    echo -e "\033[1;32m[✓] Environment Target Disetel:\033[0m"
    echo -e "    TARGET : \033[1;33m$TARGET\033[0m"
    echo -e "    URL    : \033[1;33m$URL\033[0m"
    echo -e "    LHOST  : \033[1;33m$LHOST\033[0m"
    echo -e "    LPORT  : \033[1;33m$LPORT\033[0m"
}

alias settarget='set-target'
EOF

source ~/.bashrc
```

**Cara Penggunaan:**
Cukup ketik: `settarget 10.10.11.205`
Variabel `$TARGET`, `$URL`, `$LHOST`, dan `$LPORT` langsung siap dipakai di seluruh perintah terminal Anda.

---

## 📖 6. Tools Cheatsheet Singkat (Quick Reference)

Bagian ini adalah *cheat sheet* kilat untuk tool-tool yang paling sering dipakai saat penetrasi.

### 6.1 Nmap (Scanning & Enumeration)
```bash
# 1. Fast Scan Top 1000 Port
nmap -sS -T4 $TARGET

# 2. Deep Version & Default Script Scan pada port spesifik
nmap -sC -sV -p 22,80,445 $TARGET -oN nmap/scan.nmap

# 3. Full 65535 Port Scan Cepat
nmap -p- --min-rate 2000 -Pn $TARGET -oN nmap/allports.nmap

# 4. Vulnerability Script Scan
nmap --script vuln -p 80,445 $TARGET -oN nmap/vulns.nmap
```

### 6.2 Ffuf & Gobuster (Web Fuzzing)
```bash
# 1. Ffuf Directory Fuzzing (Cepat)
ffuf -u http://$TARGET/FUZZ -w /usr/share/wordlists/dirb/common.txt -mc 200,301,302

# 2. Ffuf File Extension Fuzzing
ffuf -u http://$TARGET/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt -e .php,.html,.txt,.bak

# 3. Ffuf Subdomain / Virtual Host (VHost) Fuzzing
ffuf -u http://$TARGET -H "Host: FUZZ.target.htb" -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs <filter_size>

# 4. Gobuster Directory Scan Standar
gobuster dir -u http://$TARGET -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -t 40
```

### 6.3 SMB Enumeration (smbclient & NetExec)
```bash
# 1. Cek SMB Shares tanpa password (Null Session)
smbclient -L //$TARGET/ -N

# 2. Masuk ke share spesifik
smbclient //$TARGET/anonymous -N

# 3. NetExec (NXC) cek validitas kredensial SMB
nxc smb $TARGET -u 'username' -p 'password'

# 4. NetExec dump password hash (jika sudah admin)
nxc smb $TARGET -u 'administrator' -p 'password' --sam
```

### 6.4 Password Cracking (John & Hashcat)
```bash
# 1. John crack Linux /etc/shadow password
john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt

# 2. John crack SSH Private Key (id_rsa)
ssh2john id_rsa > id_rsa.hash && john --wordlist=/usr/share/wordlists/rockyou.txt id_rsa.hash

# 3. Hashcat crack NTLM (Mode 1000)
hashcat -m 1000 -a 0 ntlm_hashes.txt /usr/share/wordlists/rockyou.txt

# 4. Hashcat crack NetNTLMv2 (Mode 5600)
hashcat -m 5600 -a 0 netntlmv2.txt /usr/share/wordlists/rockyou.txt
```

### 6.5 Web Vulnerability & SQLMap
```bash
# 1. SQLMap scan parameter GET
sqlmap -u "http://$TARGET/index.php?id=1" --batch --dbs

# 2. SQLMap scan dari file HTTP Request Burp Suite (paling akurat)
sqlmap -r request.req --batch --dump

# 3. Nikto quick scan web vulnerabilities
nikto -h http://$TARGET
```

### 6.6 Pivoting & Tunneling (Chisel & Ligolo-ng)
```bash
# 1. Chisel Server (Di mesin penyerang/Parrot):
chisel server -p 8000 --reverse

# 2. Chisel Client (Di mesin target yang sudah ditembus):
./chisel client $LHOST:8000 R:socks

# 3. Menjalankan perintah melalui tunnel SOCKS via Proxychains:
proxychains4 nmap -sT -Pn -p 80,445 192.168.100.5
```

---

## 🧪 7. Cara Cek Tools Berjalan Normal

Untuk memastikan tidak ada dependensi yang rusak atau tools yang belum terinstall, buat script verifikasi sederhana (*smoke test*) ini:

```bash
cat << 'EOF' > ~/ctf/tools/check_tools.sh
#!/bin/bash
# Script Verifikasi Kesiapan Tools di Parrot OS

echo -e "=============================================="
echo -e "     PARROT OS PENTEST TOOLS HEALTH CHECK     "
echo -e "=============================================="

CHECK_TOOL() {
    CMD=$1
    NAME=$2
    if command -v $CMD &> /dev/null; then
        echo -e "[\033[1;32m✓ OK\033[0m] $NAME ($CMD)"
    else
        echo -e "[\033[1;31m✗ MISSING\033[0m] $NAME ($CMD)"
    fi
}

echo -e "\n--- 1. Recon & Scanning ---"
CHECK_TOOL "nmap" "Nmap Network Scanner"
CHECK_TOOL "rustscan" "RustScan Fast Port Scanner"
CHECK_TOOL "masscan" "Masscan Scanner"
CHECK_TOOL "arp-scan" "ARP Scan"

echo -e "\n--- 2. Web Fuzzing & Proxies ---"
CHECK_TOOL "ffuf" "FFUF Fast Web Fuzzer"
CHECK_TOOL "gobuster" "Gobuster"
CHECK_TOOL "feroxbuster" "Feroxbuster"
CHECK_TOOL "nikto" "Nikto Web Scanner"
CHECK_TOOL "sqlmap" "SQLMap Database Injector"
CHECK_TOOL "burpsuite" "Burp Suite Proxy"

echo -e "\n--- 3. Exploitation & SMB ---"
CHECK_TOOL "msfconsole" "Metasploit Framework"
CHECK_TOOL "searchsploit" "Exploit-DB CLI"
CHECK_TOOL "smbclient" "SMB Client"
CHECK_TOOL "smbmap" "SMBMap"
CHECK_TOOL "enum4linux-ng" "Enum4Linux-NG"
CHECK_TOOL "nxc" "NetExec (CME)"
CHECK_TOOL "evil-winrm" "Evil-WinRM"

echo -e "\n--- 4. Password & Crypto ---"
CHECK_TOOL "john" "John The Ripper"
CHECK_TOOL "hashcat" "Hashcat GPU Cracker"
CHECK_TOOL "hydra" "Hydra Online Cracker"

echo -e "\n--- 5. Pivoting & Productivity ---"
CHECK_TOOL "chisel" "Chisel Tunnel"
CHECK_TOOL "proxychains4" "Proxychains"
CHECK_TOOL "socat" "Socat Utility"
CHECK_TOOL "tmux" "Tmux Multiplexer"
CHECK_TOOL "rlwrap" "Readline Wrapper"

echo -e "\n--- 6. Wordlists ---"
if [ -f /usr/share/wordlists/rockyou.txt ]; then
    echo -e "[\033[1;32m✓ OK\033[0m] Rockyou Wordlist (/usr/share/wordlists/rockyou.txt)"
else
    echo -e "[\033[1;31m✗ MISSING\033[0m] Rockyou Wordlist belum diekstrak!"
fi

echo -e "=============================================="
EOF

chmod +x ~/ctf/tools/check_tools.sh
~/ctf/tools/check_tools.sh
```

---

## 🚀 8. Lanjut ke File Berikutnya

Sistem Parrot OS XFCE Anda kini telah terkonfigurasi sempurna: seluruh tools terverifikasi, konfigurasi Tmux siap mendampingi sesi lab Anda, dan shortcut terminal telah aktif.

Langkah berikutnya adalah mendalami senjata nomor 1 setiap pentester:
👉 **[03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master)** (*Nmap Master Workflow & Network Scanning Deep-Dive*)

### Mengapa File Berikutnya Penting?
1. **Membedah Flag Nmap**: Memahami perbedaan mendalam antara `-sS` (SYN Stealth), `-sT` (Connect), `-sU` (UDP), dan dampaknya terhadap firewall.
2. **Nmap Scripting Engine (NSE)**: Menggunakan script otomatisasi untuk eksploitasi celah SMB, HTTP, dan database.
3. **Evasion Techniques**: Cara menghindari deteksi IDS/IPS saat melakukan scanning.

Buka file [03. Nmap Master Workflow & Network Scanning — Panduan Komprehensif](/docs/nmap-master) dan kuasai pemetaan jaringan target!
