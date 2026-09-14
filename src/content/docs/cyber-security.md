---
id: "00"
title: "Cyber Security Overview & Index"
category: "1. Fondasi"
categoryId: "fondasi"
filename: "Cyber Security.md"
refs_out: []
refs_in: []
---

# 🌐 Web Exploitation

## Web Recon

- Robots.txt
- Sitemap.xml
- Directory Enumeration
- File Discovery
- Subdomain Enumeration
- Virtual Host Enumeration
- Technology Fingerprinting
- WAF Detection
- JavaScript Recon
- Endpoint Discovery
- Parameter Discovery
- Source Code Disclosure
- Git Exposure
- Backup Files
- Information Disclosure
	
---

## Authentication

- Brute Force
- Password Spraying
- Credential Stuffing
- Username Enumeration
- Weak Password Policy
- Default Credentials
- Password Reset Vulnerabilities
- MFA Bypass
- CAPTCHA Bypass
- Account Lockout Bypass
- Remember Me Abuse
- Magic Link Abuse
- OAuth Authentication Issues
- Sessionless Authentication

---

## Authorization & Access Control

- Insecure Direct Object References (IDOR)
- Forced Browsing
- Privilege Escalation
- Horizontal Access Control
- Vertical Access Control
- Missing Function Level Access Control
- Role Manipulation
- Parameter Tampering
- Mass Assignment
- Access Control Race Conditions

---

## Session Management

- Weak Session IDs
- Session Prediction
- Session Fixation
- Session Hijacking
- Cookie Security
- Secure Flag
- HttpOnly
- SameSite
- Cookie Prefixes
- Session Timeout
- Logout Issues
- Session Replay
- JWT Session Issues

---

## Client-Side Security

- DOM Clobbering
- Prototype Pollution
- postMessage
- Clickjacking
- Content Security Policy (CSP)
- JavaScript Analysis
- Source Map Disclosure
- Client-Side Template Injection (CSTI)
- Browser Storage
- Web Storage Abuse
- CORS
- Cross-Origin Leaks

---

## API Security

- REST API
- GraphQL
- SOAP
- JSON-RPC
- gRPC
- API Authentication
- API Authorization
- Broken Object Level Authorization (BOLA)
- Broken Function Level Authorization (BFLA)
- Mass Assignment
- Rate Limiting
- Excessive Data Exposure
- API Versioning Issues
- API Documentation Exposure
- JWT in APIs
- API Gateway Security

---

## SQL Injection

- Classic SQL Injection
- UNION-Based SQL Injection
- Error-Based SQL Injection
- Boolean Blind SQL Injection
- Time-Based Blind SQL Injection
- Second-Order SQL Injection
- Stacked Queries
- Out-of-Band SQL Injection (OAST)
- NoSQL Injection
- ORM Injection

---

## Cross-Site Scripting (XSS)

- Reflected XSS
- Stored XSS
- DOM XSS
- Blind XSS
- Mutation XSS
- Polyglot XSS
- AngularJS XSS
- CSP Bypass
- Filter Bypass
- WAF Bypass
- SVG XSS
- Markdown XSS

---

## Cross-Site Request Forgery (CSRF)

- Basic CSRF
- Token Validation Bypass
- SameSite Bypass
- Login CSRF
- Multi-Step CSRF
- JSON CSRF
- Stored CSRF

---

## File Upload

- Unrestricted File Upload
- Extension Bypass
- MIME Type Bypass
- Magic Byte Bypass
- Double Extension
- Null Byte Injection
- Image Polyglot
- SVG Upload
- ZIP Slip
- Race Condition Upload

---

## File Inclusion

- Local File Inclusion (LFI)
- Remote File Inclusion (RFI)
- PHP Wrappers
- Log Poisoning
- Path Traversal
- Filter Bypass
- File Inclusion to RCE

---

## Path Traversal

- Basic Path Traversal
- Absolute Path Traversal
- Relative Path Traversal
- Encoding Bypass
- Null Byte Bypass
- Traversal to Sensitive Files

---

## Command Injection

- OS Command Injection
- Blind Command Injection
- Command Chaining
- Command Substitution
- Filter Bypass
- Environment Variable Abuse
- Argument Injection

---

## XML External Entity (XXE)

- Basic XXE
- Blind XXE
- Parameter Entities
- XXE to File Disclosure
- XXE to SSRF
- Out-of-Band XXE
- XXE Filter Bypass

---

## Server-Side Request Forgery (SSRF)

- Basic SSRF
- Blind SSRF
- SSRF to Cloud Metadata
- SSRF to Internal Services
- URL Parser Bypass
- SSRF Filter Bypass
- SSRF via PDF Generator
- SSRF via Image Fetcher

---

## Server-Side Template Injection (SSTI)

- Jinja2
- Twig
- Smarty
- Freemarker
- Velocity
- Handlebars
- Template Sandbox Escape
- SSTI to RCE

---

## Insecure Deserialization

- PHP Deserialization
- Java Deserialization
- .NET Deserialization
- Python Pickle
- Ruby Marshal
- Node.js Serialization
- Gadget Chains
- Deserialization to RCE

---

## Business Logic Vulnerabilities

- Workflow Bypass
- Price Manipulation
- Coupon Abuse
- Quantity Manipulation
- Payment Logic Flaws
- Business Race Conditions
- Feature Abuse
- Negative Values
- Trusting Client Input

---

## Prototype Pollution

- Client-Side Prototype Pollution
- Server-Side Prototype Pollution
- Pollution Gadgets
- Prototype Pollution to XSS
- Prototype Pollution to RCE

---

## JSON Web Token (JWT)

- None Algorithm
- Algorithm Confusion
- Weak Secret
- kid Injection
- JWKS Injection
- JKU Injection
- Token Replay
- Token Forgery
- JWT Information Disclosure

---

## CORS Misconfiguration

- Wildcard Origin
- Null Origin
- Credentialed Requests
- Trusted Origin Abuse
- Origin Reflection

---

## Open Redirect

- Basic Open Redirect
- Filter Bypass
- Chained Redirects
- OAuth Redirect Abuse
- DOM Redirect

---

## HTTP Request Smuggling

- CL.TE
- TE.CL
- TE.TE
- HTTP/2 Request Smuggling
- Front-End / Back-End Desync

---

## HTTP Host Header Injection

- Host Header Poisoning
- Password Reset Poisoning
- Cache Poisoning
- Routing-Based SSRF

---

## Web Cache Poisoning

- Cache Key Poisoning
- Cache Deception
- Header-Based Poisoning
- Cookie-Based Poisoning

---

## WebSockets Security

- WebSocket Authentication
- Message Manipulation
- Cross-Site WebSocket Hijacking (CSWSH)
- WebSocket Injection

---

## OAuth & SSO

- OAuth Fundamentals
- Authorization Code Flow
- Implicit Flow
- PKCE
- OpenID Connect (OIDC)
- Redirect URI Manipulation
- Token Leakage
- Account Linking Issues

---

## Race Conditions

- Single Endpoint Race
- Multi-Step Race
- TOCTOU (Time-of-Check to Time-of-Use)
- Coupon Race
- Payment Race
- Inventory Race
- Limit Bypass

---

## Web Cryptography

- Password Hashing
- Insecure Encryption
- Weak Randomness
- Hardcoded Secrets
- Insecure Token Generation
- Cryptographic Misuse
- Insecure Key Management
- HMAC Issues
- Padding Oracle
- Length Extension Attack

# 🌐 Network

## Networking Fundamentals

- OSI Model
- TCP/IP Model
- IPv4
- IPv6
- TCP
- UDP
- ICMP
- ARP
- MAC Address
- Subnetting
- Routing
- Switching
- NAT
- VLAN
- VPN
- MTU
- Common Ports
- Common Protocols

---

## Host Discovery

- ICMP Echo Discovery
- ICMP Timestamp
- ICMP Address Mask
- ARP Scan
- TCP SYN Ping
- TCP ACK Ping
- UDP Ping
- Broadcast Discovery
- Ping Sweep
- Host Discovery without ICMP

---

## Port Scanning

- TCP Connect Scan
- TCP SYN Scan
- UDP Scan
- ACK Scan
- Window Scan
- Maimon Scan
- FIN Scan
- NULL Scan
- Xmas Scan
- Idle Scan
- IP Protocol Scan
- Fragmented Packets
- Timing Templates
- Parallel Scanning
- NSE Scan

---

## Banner Grabbing

- HTTP Banner
- SSH Banner
- FTP Banner
- SMTP Banner
- SMB Banner
- Telnet Banner
- Manual Banner Grabbing
- Automated Banner Grabbing

---

## Service Fingerprinting

- Version Detection
- OS Detection
- Service Identification
- CPE Detection
- Technology Fingerprinting

---

## HTTP & HTTPS Enumeration

- HTTP Methods
- Response Headers
- Security Headers
- Cookies
- Robots.txt
- Sitemap.xml
- Directory Enumeration
- File Enumeration
- Virtual Host Enumeration
- HTTP OPTIONS
- TRACE Method
- SSL/TLS Analysis
- Certificate Enumeration
- HTTP Authentication
- WebDAV

---

## DNS Enumeration

- A Record
- AAAA Record
- MX Record
- TXT Record
- NS Record
- CNAME Record
- PTR Record
- SOA Record
- AXFR Zone Transfer
- Reverse Lookup
- DNS Bruteforce
- Subdomain Enumeration
- Wildcard DNS
- DNSSEC
- DNS Cache Snooping

---

## FTP Enumeration

- Anonymous Login
- Writable FTP
- FTP Bounce
- Active Mode
- Passive Mode
- File Listing
- Credential Enumeration
- Version Detection

---

## SSH Enumeration

- SSH Version Detection
- Supported Algorithms
- Weak Ciphers
- Host Keys
- Username Enumeration
- SSH Authentication Methods
- Public Key Enumeration

---

## SMB Enumeration

- SMB Version Detection
- SMB Shares
- Null Sessions
- Anonymous Login
- Users Enumeration
- Groups Enumeration
- Permissions
- SMB Signing
- NetBIOS Enumeration
- RID Cycling

---

## SNMP Enumeration

- Community Strings
- SNMP Walk
- SNMP Bulk Walk
- System Information
- Installed Software
- Processes
- Running Services
- Network Interfaces
- Routing Table
- Writable Community Strings

---

## SMTP Enumeration

- VRFY
- EXPN
- RCPT TO
- User Enumeration
- Open Relay
- Banner Analysis
- Mail Queue Enumeration

---

## LDAP Enumeration

- Anonymous Bind
- User Enumeration
- Group Enumeration
- Organizational Units
- Domain Information
- Password Policy
- Computer Objects
- Service Accounts

---

## Kerberos Enumeration

- User Enumeration
- SPN Enumeration
- AS-REP Enumeration
- Ticket Enumeration
- Realm Discovery

---

## NFS Enumeration

- Export Enumeration
- Mount Enumeration
- Writable Shares
- Root Squashing
- NFS Permissions

---

## RPC Enumeration

- rpcinfo
- RPC Services
- NFS RPC
- Mountd
- Portmapper

---

## Database Enumeration

### MySQL

- Version Detection
- Anonymous Access
- Databases
- Users
- Privileges
- File Read
- File Write

### PostgreSQL

- Version Detection
- Databases
- Users
- Extensions

### Microsoft SQL Server

- Version Detection
- xp_cmdshell
- Linked Servers
- Databases

### Oracle

- SID Enumeration
- Version Detection
- Users

### MongoDB

- Anonymous Access
- Databases
- Collections

### Redis

- INFO Enumeration
- Writable Config
- Module Loading

---

## Remote Access Enumeration

### RDP

- Version Detection
- NLA Detection
- Screenshot Enumeration

### WinRM

- Authentication
- Version Detection

### Telnet

- Banner
- Authentication

### VNC

- Authentication
- Version Detection

---

## Mail Services Enumeration

- POP3
- IMAP
- Exchange
- OWA
- SMTP Authentication

---

## Wireless Enumeration

- Wi-Fi Discovery
- Hidden SSID
- WPA/WPA2
- WPA3
- WPS
- Rogue AP

---

## Network Traffic Analysis

- Packet Capture
- TCP Stream Analysis
- HTTP Analysis
- DNS Analysis
- TLS Analysis
- Credential Capture
- PCAP Analysis

---

## Packet Crafting

- Scapy
- hping3
- Raw Packets
- Packet Injection
- Packet Replay

---

## Pivoting

- SSH Pivoting
- Meterpreter Pivoting
- Ligolo-ng
- Chisel
- SOCKS Proxy
- ProxyChains

---

## Port Forwarding

- Local Port Forwarding
- Remote Port Forwarding
- Dynamic Port Forwarding
- Reverse Port Forwarding

---

## Tunneling

- SSH Tunnel
- HTTP Tunnel
- DNS Tunnel
- ICMP Tunnel
- SOCKS Tunnel

---

## Firewall Evasion

- Packet Fragmentation
- Decoy Scan
- Spoofed Source IP
- Spoofed MAC Address
- Source Port Manipulation
- MTU Manipulation
- Timing Evasion

---

## IDS / IPS Evasion

- Signature Evasion
- Payload Obfuscation
- Encoding
- Packet Manipulation
- Timing Evasion

---

## Network Attacks

- ARP Spoofing
- DNS Spoofing
- DHCP Starvation
- DHCP Spoofing
- LLMNR Poisoning
- NBNS Poisoning
- MITM
- SMB Relay
- NTLM Relay
- VLAN Hopping

---

## Network Automation

- Nmap NSE
- Bash Automation
- Python Automation
- Masscan
- Rustscan
- Naabu
- Custom Enumeration Scripts

# 🐧 Linux Privilege Escalation

## Linux Fundamentals

- Linux File System
- Users & Groups
- Permissions
- Ownership
- Processes
- Services
- Environment Variables
- Package Managers
- Systemd
- Bash Basics

---

## Manual Enumeration

- System Information
- Kernel Version
- Hostname
- Distribution Information
- Network Interfaces
- Routing Table
- Running Processes
- Running Services
- Installed Packages
- Scheduled Tasks
- Mounted File Systems
- Environment Variables
- User Information
- Group Information
- Sudo Privileges
- Sensitive Files
- Hidden Files
- Writable Files
- Writable Directories
- SSH Configuration
- NFS Shares
- Docker Environment
- LXC/LXD Environment

---

## Automated Enumeration

- LinPEAS
- LinEnum
- Linux Exploit Suggester
- Linux Smart Enumeration (LSE)
- Unix-Privesc-Check
- BeRoot
- pspy
- custom-enumeration.sh

---

## Credential Discovery

- Bash History
- Zsh History
- SSH Private Keys
- SSH Authorized Keys
- SSH Config
- Environment Variables
- Config Files
- Database Credentials
- Backup Files
- Log Files
- Browser Credentials
- Git Repositories
- Docker Secrets
- Cloud Credentials
- Hardcoded Credentials

---

## Sudo Misconfiguration

- NOPASSWD
- GTFOBins
- Wildcard Abuse
- Environment Variables
- Sudo Edit Abuse
- Sudo Version Exploits
- Sudo Plugins
- Command Injection
- LD_PRELOAD
- LD_LIBRARY_PATH

---

## SUID & SGID

- SUID Enumeration
- SGID Enumeration
- GTFOBins
- Custom Binaries
- Misconfigured SUID
- PATH Hijacking
- Shared Library Abuse
- Shell Escape
- Capabilities Interaction

---

## Linux Capabilities

- Capability Enumeration
- Dangerous Capabilities
- cap_setuid
- cap_setgid
- cap_sys_admin
- cap_dac_override
- Capability Abuse
- Capability to Root

---

## PATH Hijacking

- PATH Enumeration
- Writable PATH
- Relative Path Abuse
- Fake Binary Injection
- Service PATH Abuse

---

## Environment Variable Abuse

- PATH Variable
- LD_PRELOAD
- LD_LIBRARY_PATH
- PYTHONPATH
- PERL5LIB
- RUBYLIB
- Custom Variables

---

## Cron Jobs & Timers

### Cron Jobs

- User Cron
- System Cron
- Writable Cron Scripts
- Wildcard Injection
- PATH Abuse

### Systemd Timers

- Timer Enumeration
- Writable Services
- Service Hijacking

---

## Writable Files & Directories

- World Writable Files
- World Writable Directories
- Writable Configuration Files
- Writable Scripts
- Writable Binaries
- Sensitive File Modification

---

## File Permission Abuse

- Weak File Permissions
- Weak Directory Permissions
- ACL Abuse
- Sticky Bit
- Umask Issues

---

## Shared Library Hijacking

- LD_PRELOAD
- LD_LIBRARY_PATH
- Missing Libraries
- Library Search Order
- Custom Library Injection

---

## Shell Escape

- GTFOBins
- Restricted Bash
- rbash Escape
- Vim Escape
- Nano Escape
- Less Escape
- More Escape
- Awk Escape
- Find Escape
- Python Escape
- Perl Escape
- Ruby Escape
- Lua Escape
- BusyBox Escape

---

## NFS & Network Share Abuse

- Export Enumeration
- Writable NFS
- no_root_squash
- Mount Abuse
- Shared Credentials

---

## Docker Security

- Docker Enumeration
- Docker Group Abuse
- Docker Socket Abuse
- Docker Image Abuse
- Privileged Containers
- Mounted Volumes
- Namespace Escape

---

## LXC/LXD Abuse

- LXD Group Abuse
- Privileged Containers
- Host Mount
- Image Import Abuse

---

## Kubernetes Escape

- Service Accounts
- Mounted Tokens
- RBAC Misconfiguration
- Privileged Pods
- HostPath Abuse
- Kubelet Abuse

---

## Kernel Exploitation

- Kernel Enumeration
- Public Kernel Exploits
- Dirty COW
- Dirty Pipe
- OverlayFS
- OverlayFS CVEs
- eBPF Exploits
- Driver Exploits

---

## Process & Service Abuse

- Running Services
- Writable Services
- Misconfigured Services
- Service Hijacking
- Process Injection
- Debug Privileges

---

## Sensitive Files

- /etc/passwd
- /etc/shadow
- /etc/sudoers
- SSH Keys
- History Files
- Backup Files
- Configuration Files

---

## Password Attacks

- Shadow File Cracking
- Hash Extraction
- Password Reuse
- Offline Cracking
- SSH Key Cracking

---

## Persistence

- SSH Authorized Keys
- Cron Persistence
- Systemd Services
- Bashrc
- Profile Scripts
- Init Scripts
- rc.local
- LD_PRELOAD Persistence

---

## Defense Evasion

- Log Cleaning
- History Cleaning
- Process Masquerading
- Timestomping
- Hidden Files
- Hidden Processes

---

## Post Exploitation

- User Enumeration
- Credential Collection
- Network Discovery
- Lateral Movement Preparation
- Data Collection
- Looting

---

## Common Tools

- LinPEAS
- LSE
- LinEnum
- pspy
- GTFOBins
- GTFObins Search
- Linux Exploit Suggester
- BeRoot
- chkrootkit
- rkhunter
- strace
- ltrace

---

## Common Techniques

- Wildcard Injection
- Tar Wildcard Abuse
- PATH Hijacking
- Environment Variable Injection
- Library Hijacking
- Symlink Attacks
- Race Conditions
- TOCTOU
- File Descriptor Abuse

# 🪟 Windows Privilege Escalation

## Windows Fundamentals

- Windows Architecture
- File System (NTFS)
- Registry
- Users & Groups
- Services
- Processes
- Scheduled Tasks
- Event Logs
- UAC
- Windows Defender
- PowerShell Fundamentals
- Windows Permissions
- Access Tokens

---

## Manual Enumeration

- System Information
- Hostname
- OS Version
- Installed Patches
- Installed Software
- Running Processes
- Running Services
- Scheduled Tasks
- Startup Applications
- Users
- Groups
- Local Administrators
- Environment Variables
- Network Configuration
- Shared Folders
- Firewall Configuration
- Defender Status
- Registry Enumeration
- Event Logs
- File Permissions
- Directory Permissions

---

## Automated Enumeration

- WinPEAS
- Seatbelt
- PowerUp
- SharpUp
- BeRoot
- Watson
- Windows Exploit Suggester
- PrivescCheck
- Sherlock

---

## Credential Discovery

- SAM Database
- SECURITY Hive
- SYSTEM Hive
- LSA Secrets
- DPAPI
- Credential Manager
- Browser Passwords
- Wi-Fi Passwords
- PowerShell History
- Command Prompt History
- Unattend.xml
- Sysprep Files
- Group Policy Preferences (GPP)
- Registry Credentials
- IIS Configuration
- Configuration Files
- Backup Files
- Hardcoded Credentials
- Saved RDP Credentials
- Saved WinRM Credentials

---

## Service Misconfiguration

- Unquoted Service Path
- Weak Service Permissions
- Writable Service Binary
- Writable Service Directory
- Service Registry Abuse
- Service DLL Hijacking
- Service Failure Recovery
- Replace Executable

---

## Registry Abuse

- AlwaysInstallElevated
- AutoRun Keys
- RunOnce Keys
- Service Registry
- Image File Execution Options (IFEO)
- SilentProcessExit
- AppInit_DLLs
- COM Registry Entries

---

## Token Abuse

- Access Tokens
- Token Impersonation
- SeImpersonatePrivilege
- SeAssignPrimaryTokenPrivilege
- Juicy Potato
- Rotten Potato
- Rogue Potato
- PrintSpoofer
- GodPotato

---

## DLL Hijacking

- DLL Search Order
- Phantom DLL
- Side Loading
- Missing DLL
- Writable DLL
- Proxy DLL

---

## Scheduled Tasks

- Writable Tasks
- Weak Permissions
- Replace Executable
- Scheduled Task Hijacking
- Hidden Tasks

---

## MSI Abuse

- AlwaysInstallElevated
- Malicious MSI
- MSI Custom Actions
- MSI Repair Abuse

---

## COM Hijacking

- CLSID Hijacking
- COM Object Replacement
- Registry Hijacking
- COM Persistence

---

## File Permission Abuse

- Weak File ACLs
- Weak Directory ACLs
- Writable Executables
- Writable System Files
- Replace Binary

---

## UAC Bypass

- Fodhelper
- ComputerDefaults
- sdclt
- Event Viewer
- SilentCleanup
- CMSTP
- Registry Hijacking
- AutoElevate Binaries

---

## Driver Exploitation

- Vulnerable Drivers
- Bring Your Own Vulnerable Driver (BYOVD)
- Driver Loading
- Driver Privilege Escalation

---

## Kernel Exploitation

- Kernel Enumeration
- Public CVEs
- Token Stealing
- Kernel Drivers
- Privilege Escalation Exploits

---

## Named Pipe Abuse

- Named Pipe Impersonation
- Potato Family
- Pipe Permissions

---

## WMI Abuse

- WMI Enumeration
- WMI Persistence
- WMI Execution
- WMI Event Subscription

---

## PowerShell Abuse

- PowerShell Remoting
- Encoded Commands
- AMSI Bypass
- PowerShell Logging Bypass
- Constrained Language Mode
- Execution Policy Bypass

---

## Application Whitelisting Bypass

- AppLocker Bypass
- WDAC Bypass
- LOLBins
- Living Off The Land

---

## LOLBins (Living Off The Land Binaries)

- certutil.exe
- bitsadmin.exe
- mshta.exe
- rundll32.exe
- regsvr32.exe
- installutil.exe
- cmstp.exe
- msbuild.exe
- cscript.exe
- wscript.exe
- forfiles.exe
- iexplore.exe
- control.exe

---

## Sensitive Files

- SAM
- SYSTEM
- SECURITY
- NTDS.dit
- Unattend.xml
- web.config
- applicationHost.config
- IIS Config Files
- Registry Hives

---

## Password Attacks

- NTLM Hashes
- LM Hashes
- Pass-the-Hash
- Pass-the-Ticket
- Offline Cracking
- Password Spraying
- Kerberos Password Attacks

---

## Persistence

- Startup Folder
- Run Keys
- RunOnce
- Services
- Scheduled Tasks
- WMI Persistence
- DLL Hijacking
- COM Hijacking
- Registry Persistence
- Startup Scripts

---

## Defense Evasion

- Event Log Clearing
- AMSI Bypass
- Defender Bypass
- ETW Bypass
- Process Injection
- Process Hollowing
- Parent PID Spoofing
- Timestomping

---

## Post Exploitation

- User Enumeration
- Credential Collection
- Token Collection
- Network Discovery
- Share Enumeration
- Lateral Movement Preparation
- Data Collection
- Looting

---

## Common Tools

- WinPEAS
- Seatbelt
- PowerUp
- SharpUp
- PrivescCheck
- Watson
- Mimikatz
- Rubeus
- SharpHound
- PsExec
- Procmon
- AccessChk
- Autoruns
- Process Hacker
- Sysinternals Suite

---

## Common Techniques

- DLL Hijacking
- Unquoted Service Path
- Weak ACL Abuse
- Registry Abuse
- Token Impersonation
- LOLBins
- COM Hijacking
- WMI Abuse
- PowerShell Abuse
- BYOVD
- UAC Bypass
- Race Conditions

# 👑 Active Directory

## Active Directory Fundamentals

- Domain
- Forest
- Tree
- Organizational Unit (OU)
- Domain Controller (DC)
- Trust Relationships
- Objects
- Users
- Groups
- Computers
- Group Policy (GPO)
- DNS in Active Directory
- SYSVOL
- Active Directory Sites
- FSMO Roles
- Security Identifiers (SID)

---

## Initial Enumeration

- Domain Information
- Forest Information
- Domain Controllers
- Users Enumeration
- Groups Enumeration
- Computers Enumeration
- Organizational Units
- Group Policies
- Domain Trusts
- Password Policy
- Shares Enumeration
- Network Discovery
- Domain Functional Level

---

## SMB Enumeration

- SMB Shares
- Null Sessions
- Anonymous Access
- Users
- Groups
- ACL Enumeration
- Writable Shares
- SMB Signing
- NetBIOS
- RID Cycling

---

## LDAP Enumeration

- Anonymous Bind
- User Enumeration
- Group Enumeration
- Computer Enumeration
- Organizational Units
- ACL Enumeration
- Service Accounts
- Password Policy
- Domain Information
- Trust Enumeration

---

## Kerberos

- Kerberos Fundamentals
- Ticket Granting Ticket (TGT)
- Service Tickets (TGS)
- SPN Enumeration
- User Enumeration
- Kerberoasting
- AS-REP Roasting
- Pass-the-Ticket
- Overpass-the-Hash
- Golden Ticket
- Silver Ticket
- Diamond Ticket
- Ticket Renewal
- Ticket Injection

---

## BloodHound

- Data Collection
- SharpHound
- BloodHound CE
- Attack Path Analysis
- Shortest Path
- High Value Targets
- Privilege Escalation Paths
- Lateral Movement Paths
- Custom Queries

---

## ACL Abuse

- GenericAll
- GenericWrite
- WriteOwner
- WriteDACL
- ForceChangePassword
- AddMember
- Self
- Extended Rights
- DCSync Rights
- ACL Inheritance

---

## Delegation Abuse

- Unconstrained Delegation
- Constrained Delegation
- Resource-Based Constrained Delegation (RBCD)
- S4U2Self
- S4U2Proxy
- Printer Bug
- Delegation Enumeration

---

## Active Directory Certificate Services (AD CS)

- AD CS Fundamentals
- ESC1
- ESC2
- ESC3
- ESC4
- ESC5
- ESC6
- ESC7
- ESC8
- ESC9
- ESC10
- ESC11
- ESC12
- ESC13
- ESC14
- ESC15
- Certificate Templates
- Enrollment Rights
- Certificate Mapping

---

## Credential Attacks

- Password Spraying
- Credential Stuffing
- Password Reuse
- Kerberoasting
- AS-REP Roasting
- DCSync
- NTDS.dit Extraction
- LSA Secrets
- Cached Credentials
- DPAPI
- SAM Dumping

---

## NTLM Attacks

- Pass-the-Hash
- NTLM Relay
- SMB Relay
- HTTP Relay
- LDAP Relay
- PetitPotam
- PrinterBug
- MIC Removal
- SMB Signing Bypass

---

## LLMNR & NBT-NS Poisoning

- LLMNR Poisoning
- NBT-NS Poisoning
- Responder
- Inveigh
- Hash Capture
- Relay Preparation

---

## Coercion Attacks

- PetitPotam
- PrinterBug
- DFSCoerce
- ShadowCoerce
- MS-EFSRPC Abuse

---

## Lateral Movement

- PsExec
- WinRM
- WMI
- SMBExec
- DCOM
- RDP
- Remote Service Creation
- Scheduled Tasks
- PowerShell Remoting
- Pass-the-Hash
- Pass-the-Ticket

---

## Domain Persistence

- Golden Ticket
- Silver Ticket
- Skeleton Key
- SID History
- AdminSDHolder
- DCShadow
- Malicious GPO
- Startup Scripts
- Scheduled Tasks
- WMI Persistence

---

## Domain Dominance

- Enterprise Admin
- Domain Admin
- KRBTGT Abuse
- DCSync
- DCShadow
- Forest Trust Abuse
- SID History Abuse
- Cross-Forest Attacks

---

## Trust Attacks

- Parent-Child Trust
- Forest Trust
- External Trust
- SID Filtering
- Selective Authentication
- Trust Enumeration

---

## Group Policy (GPO)

- GPO Enumeration
- GPO Abuse
- Startup Scripts
- Logon Scripts
- Scheduled Tasks via GPO
- Software Deployment
- GPO Permissions

---

## Service Accounts

- Service Principal Names (SPN)
- Managed Service Accounts
- Group Managed Service Accounts (gMSA)
- Kerberoasting Targets
- Weak Passwords
- Delegation

---

## Domain Controllers

- SYSVOL
- NETLOGON
- NTDS.dit
- Registry Hives
- DSRM
- Replication
- Backup Files

---

## DNS in Active Directory

- Dynamic Updates
- Zone Transfers
- DNS Records
- DNS Aging
- Secure Updates

---

## Active Directory Defense Evasion

- AMSI Bypass
- Defender Bypass
- ETW Bypass
- Event Log Cleaning
- PowerShell Logging Bypass
- LDAP Stealth
- Kerberos OPSEC

---

## Active Directory Post Exploitation

- User Enumeration
- Group Enumeration
- Domain Mapping
- Credential Collection
- Trust Mapping
- Lateral Movement Planning
- Persistence
- Data Collection
- Looting

---

## Common Tools

- BloodHound
- SharpHound
- PowerView
- Rubeus
- Mimikatz
- Certipy
- Certify
- Impacket
- CrackMapExec / NetExec
- Responder
- Inveigh
- ADExplorer
- ldapsearch
- rpcclient
- enum4linux-ng
- PingCastle

---

## Common Techniques

- Kerberoasting
- AS-REP Roasting
- DCSync
- DCShadow
- Golden Ticket
- Silver Ticket
- Pass-the-Hash
- Pass-the-Ticket
- NTLM Relay
- RBCD
- ACL Abuse
- AD CS Abuse
- GPO Abuse
- Trust Abuse
- SID History Abuse

# 💥 Binary Exploitation (Pwn)

## Binary Fundamentals

- Binary Formats
- ELF Structure
- PE Structure
- Executable Sections
- Program Loading
- Entry Point
- Process Memory Layout
- Stack
- Heap
- Data Segment
- BSS
- Text Segment
- Dynamic Linking
- Static Linking

---

## Computer Architecture

- x86 Architecture
- x64 Architecture
- ARM Architecture
- ARM64 Architecture
- Registers
- Flags Register
- Stack Pointer
- Instruction Pointer
- Calling Convention Basics

---

## Assembly Fundamentals

- Assembly Syntax
- Instructions
- Registers
- Arithmetic Instructions
- Logical Instructions
- Stack Instructions
- Jump Instructions
- Call & Return
- Loops
- Comparisons
- Memory Addressing

---

## Calling Conventions

- cdecl
- stdcall
- fastcall
- thiscall
- SysV ABI
- Microsoft x64 ABI
- Function Prologue
- Function Epilogue
- Stack Frames
- Argument Passing

---

## Memory Management

- Stack Memory
- Heap Memory
- Global Variables
- Local Variables
- Memory Alignment
- Heap Allocation
- Free()
- Malloc()
- Calloc()
- Realloc()

---

## ELF Internals

- ELF Header
- Program Header
- Section Header
- GOT
- PLT
- Dynamic Symbols
- Relocations
- libc

---

## Static Analysis

- strings
- nm
- objdump
- readelf
- file
- ldd
- checksec
- Ghidra Analysis
- IDA Analysis

---

## Dynamic Analysis

- gdb
- pwndbg
- GEF
- peda
- strace
- ltrace
- rr Debugger
- Runtime Analysis

---

## Buffer Overflow

- Stack Overflow
- Heap Overflow
- Off-by-One
- Off-by-Null
- Integer Overflow
- Integer Underflow
- Signedness Bugs

---

## Stack Exploitation

- EIP/RIP Control
- Stack Pivot
- Stack Leak
- Canary Leak
- Stack Canary Bypass
- Return Address Overwrite

---

## Heap Exploitation

- Heap Metadata
- Use After Free
- Double Free
- Fastbin Attack
- Tcache Poisoning
- Unsorted Bin Attack
- House of Force
- House of Spirit
- House of Orange
- Heap Grooming

---

## Format String Vulnerabilities

- Information Leak
- Arbitrary Read
- Arbitrary Write
- GOT Overwrite
- Format String Exploitation

---

## Return-Oriented Programming (ROP)

- ROP Basics
- Gadget Hunting
- ret2libc
- ret2syscall
- ret2csu
- Sigreturn Oriented Programming (SROP)
- Stack Pivot
- One Gadget

---

## Dynamic Linking

- GOT
- PLT
- Lazy Binding
- Relocations
- GOT Overwrite
- PLT Hijacking

---

## Shellcode

- Linux Shellcode
- Windows Shellcode
- Reverse Shell
- Bind Shell
- Egg Hunter
- Polymorphic Shellcode
- Encoders
- Position Independent Shellcode

---

## Exploit Mitigations

- NX (DEP)
- PIE
- ASLR
- RELRO
- Stack Canary
- SafeSEH
- Control Flow Guard (CFG)
- Fortify Source

---

## Mitigation Bypass

- ASLR Bypass
- PIE Bypass
- Canary Bypass
- NX Bypass
- RELRO Bypass
- CFG Bypass

---

## Race Conditions

- TOCTOU
- File Race
- Signal Race
- Symlink Race

---

## Pwntools Automation

- Process
- Remote
- ELF Module
- ROP Module
- Shellcraft
- Tubes
- Packing & Unpacking
- Automation Scripts

---

## Debugging

- Breakpoints
- Watchpoints
- Memory Inspection
- Register Inspection
- Core Dumps
- Reverse Debugging
- Remote Debugging

---

## Fuzzing

- Manual Fuzzing
- AFL++
- libFuzzer
- Honggfuzz
- Coverage Guided Fuzzing

---

## Symbolic Execution

- angr
- Triton
- Z3 Solver
- Constraint Solving

---

## Binary Patching

- Hex Editing
- NOP Patching
- Instruction Replacement
- Binary Modification

---

## Exploit Development

- Crash Analysis
- Offset Calculation
- Memory Leak
- Primitive Identification
- Exploit Chain
- Reliability Improvements

---

## Linux Exploitation

- ELF Exploitation
- libc Exploitation
- Dynamic Loader
- Environment Variables
- LD_PRELOAD Abuse

---

## Windows Exploitation

- PE Internals
- Structured Exception Handling (SEH)
- SafeSEH
- VEH
- Windows ROP
- Windows Shellcode

---

## Kernel Exploitation

- Kernel Memory
- Ring Levels
- Driver Exploitation
- Kernel ROP
- Token Stealing
- SMEP Bypass
- SMAP Bypass

---

## Browser Exploitation

- V8 Basics
- JavaScript Engine
- JIT Bugs
- Sandbox Escape

---

## Common Vulnerabilities

- Buffer Overflow
- Heap Overflow
- Format String
- Integer Overflow
- Integer Underflow
- Use After Free
- Double Free
- Type Confusion
- Out-of-Bounds Read
- Out-of-Bounds Write
- Null Pointer Dereference

---

## Common Tools

- GDB
- pwndbg
- GEF
- peda
- Pwntools
- checksec
- readelf
- objdump
- strings
- ltrace
- strace
- Ghidra
- IDA Free
- Binary Ninja
- radare2
- pwninit
- one_gadget
- Ropper
- ROPgadget
- angr

---

## Common Techniques

- ret2libc
- ret2syscall
- ROP Chain
- SROP
- Heap Feng Shui
- Heap Grooming
- GOT Overwrite
- PLT Hijacking
- Stack Pivot
- Info Leak
- Memory Corruption
- Arbitrary Read
- Arbitrary Write

---
## CTF Patterns

- ret2win
- ret2libc
- Canary Leak
- PIE Leak
- Format String + ROP
- Heap Challenge
- One Gadget
- FSOP (File Stream Oriented Programming)
- Sigreturn Challenge
- Race Condition Challenge

# 🔍 Reverse Engineering

## Reverse Engineering Fundamentals

- What is Reverse Engineering
- RE Methodology
- Static vs Dynamic Analysis
- Reverse Engineering Workflow
- Legal & Ethical Considerations
- Common File Formats

---

## Computer Architecture

- CPU Architecture
- x86
- x64
- ARM
- ARM64
- Registers
- Flags
- Stack
- Heap
- Calling Convention Overview
- Endianness

---

## Binary Fundamentals

- ELF Format
- PE Format
- Mach-O Format
- Binary Sections
- Symbols
- Imports
- Exports
- Relocations
- Entry Point
- Dynamic Linking
- Static Linking

---

## Assembly Language

- Registers
- Instructions
- Arithmetic
- Logic
- Memory Operations
- Stack Operations
- Control Flow
- Loops
- Function Calls
- Interrupts
- Syscalls

---

## Calling Conventions

- cdecl
- stdcall
- fastcall
- thiscall
- SysV ABI
- Microsoft x64 ABI
- Stack Frames
- Function Prologue
- Function Epilogue
- Argument Passing

---

## Static Analysis

- Strings Analysis
- Imports Analysis
- Exports Analysis
- Symbols Analysis
- Section Analysis
- Resources Analysis
- File Headers
- Signature Detection
- Entropy Analysis

---

## Dynamic Analysis

- Runtime Behavior
- Process Monitoring
- API Monitoring
- System Calls
- Memory Inspection
- Breakpoints
- Watchpoints
- Execution Tracing

---

## Debugging

- GDB
- WinDbg
- x64dbg
- LLDB
- Breakpoints
- Hardware Breakpoints
- Conditional Breakpoints
- Memory Breakpoints
- Register Inspection
- Stack Inspection
- Call Stack Analysis

---

## Disassembly

- Linear Disassembly
- Recursive Disassembly
- Function Discovery
- Cross References
- Instruction Flow
- Jump Tables
- Switch Statements

---

## Decompilation

- Decompiled Code Analysis
- Decompiled Variables
- Decompiled Structures
- Decompiled Functions
- Decompiled Classes
- Decompiled Logic
- Decompiled Loops

---

## Function Analysis

- Function Identification
- Function Renaming
- Parameters
- Return Values
- Local Variables
- Recursive Functions
- Inline Functions

---

## Control Flow Analysis

- Basic Blocks
- Control Flow Graph (CFG)
- Branch Analysis
- Conditional Branches
- Loops
- Switch Statements
- Recursive Flow

---

## Data Flow Analysis

- Variable Tracking
- Register Tracking
- Memory Tracking
- Pointer Analysis
- Taint Analysis
- Constant Propagation

---

## String Analysis

- Plain Strings
- Unicode Strings
- Encoded Strings
- Obfuscated Strings
- Runtime Strings
- XOR Strings
- Base64 Strings

---

## Memory Analysis

- Stack Analysis
- Heap Analysis
- Global Variables
- Static Variables
- Dynamic Allocation
- Memory Layout

---

## API Analysis

- Windows API
- Linux System Calls
- libc Functions
- Network APIs
- File APIs
- Registry APIs
- Crypto APIs

---

## Binary Structures

- Structures
- Classes
- Objects
- Virtual Tables (vtable)
- RTTI
- Constructors
- Destructors

---

## Obfuscation

- String Obfuscation
- Control Flow Obfuscation
- Code Virtualization
- Junk Code
- Instruction Substitution
- Opaque Predicates

---

## Packers

- UPX
- ASPack
- Themida
- VMProtect
- Custom Packers
- Manual Unpacking

---

## Anti-Debugging

- IsDebuggerPresent
- Timing Checks
- PEB Checks
- Breakpoint Detection
- Hardware Breakpoint Detection
- Exception Tricks

---

## Anti-VM

- VMware Detection
- VirtualBox Detection
- Hyper-V Detection
- Sandbox Detection
- Hardware Detection

---

## Anti-Analysis

- API Hashing
- Dynamic API Resolution
- Self-Modifying Code
- Encryption
- Runtime Decryption

---

## Malware Analysis Basics

- Malware Workflow
- Static Malware Analysis
- Dynamic Malware Analysis
- IOC Extraction
- Configuration Extraction
- Network Indicators
- Persistence Analysis

---

## Rootkit Analysis

- User Mode Rootkits
- Kernel Rootkits
- Hook Detection
- SSDT Hooks
- Inline Hooks

---

## Firmware Reverse Engineering

- Firmware Extraction
- Binwalk
- Filesystem Extraction
- Bootloader Analysis
- Embedded Linux

---

## Mobile Reverse Engineering

### Android

- APK Structure
- DEX Analysis
- Smali
- Manifest Analysis
- Resources Analysis
- Native Libraries

### iOS

- Mach-O Analysis
- Objective-C
- Swift
- IPA Analysis
- Class Dump

---

## .NET Reverse Engineering

- IL Code
- dnSpy
- ILSpy
- Assembly Explorer
- Metadata Analysis

---

## Java Reverse Engineering

- JAR Analysis
- Bytecode
- JD-GUI
- CFR
- JADX

---

## JavaScript Reverse Engineering

- Source Maps
- Minified Code
- Obfuscated JavaScript
- Browser Debugger

---

## Binary Patching

- NOP Instructions
- Conditional Jump Patching
- License Check Removal
- Feature Unlock
- Binary Editing
- Hex Editing

---

## Automation

- IDAPython
- Ghidra Scripts
- Binary Ninja Scripts
- radare2 Scripts
- Python Automation

---

## Common Tools

- Ghidra
- IDA Free
- Binary Ninja
- radare2
- Cutter
- Hopper
- x64dbg
- WinDbg
- GDB
- LLDB
- dnSpy
- ILSpy
- JADX
- JD-GUI
- Binwalk
- Detect It Easy (DIE)
- PE-bear
- CFF Explorer
- ExifTool
- Procmon
- Process Hacker

---

## Common Techniques

- Static Analysis
- Dynamic Analysis
- Pattern Recognition
- Signature Matching
- Function Renaming
- Cross References
- Graph Analysis
- API Tracing
- Memory Dumping
- Binary Diffing

---

## CTF Reverse Engineering Patterns

- Password Checker
- Key Verification
- CrackMe
- XOR Challenge
- License Validation
- Flag Checker
- Packed Binary
- Anti-Debug Challenge
- Anti-VM Challenge
- String Decryption
- Custom Encoding
- Bytecode Analysis
- Virtual Machine Challenge

# 🔐 Cryptography

## Cryptography Fundamentals

- History of Cryptography
- Security Goals
- Confidentiality
- Integrity
- Authentication
- Non-Repudiation
- Threat Models
- Cryptographic Terminology
- Key Management Basics

---

## Encoding & Representation

- ASCII
- Unicode
- UTF-8
- UTF-16
- Binary
- Octal
- Decimal
- Hexadecimal
- Base16
- Base32
- Base58
- Base64
- Base85
- URL Encoding
- HTML Encoding
- Unicode Escaping

---

## Classical Ciphers

- Caesar Cipher
- ROT13
- Atbash Cipher
- Affine Cipher
- Rail Fence Cipher
- Vigenère Cipher
- Playfair Cipher
- Hill Cipher
- Baconian Cipher
- Polybius Square
- Transposition Cipher
- Columnar Transposition

---

## Hash Functions

- MD5
- SHA-1
- SHA-224
- SHA-256
- SHA-384
- SHA-512
- SHA-3
- Whirlpool
- RIPEMD
- NTLM
- LM Hash

---

## Password Hashing

- bcrypt
- scrypt
- Argon2
- PBKDF2
- Salt
- Pepper
- Hash Stretching
- Password Storage Best Practices

---

## Symmetric Cryptography

- AES
- DES
- Triple DES (3DES)
- Blowfish
- Twofish
- RC4
- ChaCha20
- Salsa20
- IDEA
- Camellia

---

## Cipher Modes

- ECB
- CBC
- CFB
- OFB
- CTR
- GCM
- CCM
- XTS

---

## Asymmetric Cryptography

- RSA
- Diffie-Hellman
- Elliptic Curve Cryptography (ECC)
- ECDH
- ECDSA
- DSA
- ElGamal
- Ed25519
- Curve25519

---

## Key Exchange

- Diffie-Hellman
- Elliptic Curve Diffie-Hellman
- Forward Secrecy
- Perfect Forward Secrecy

---

## Digital Signatures

- RSA Signatures
- DSA
- ECDSA
- EdDSA
- Signature Verification
- Signature Forgery

---

## Public Key Infrastructure (PKI)

- Public Keys
- Private Keys
- Certificate Authority (CA)
- Root CA
- Intermediate CA
- Certificate Chains
- CSR
- X.509 Certificates
- Certificate Revocation
- OCSP
- CRL

---

## TLS / SSL

- SSL History
- TLS Versions
- TLS Handshake
- Cipher Suites
- Session Keys
- Certificate Validation
- Mutual TLS (mTLS)
- HSTS

---

## Message Authentication

- HMAC
- CMAC
- GMAC
- Message Authentication Codes
- Integrity Verification

---

## Random Number Generators (RNG)

- Pseudo Random Number Generator (PRNG)
- Cryptographically Secure PRNG (CSPRNG)
- Entropy
- Seed Generation
- Weak Randomness
- Predictable Randomness

---

## Cryptanalysis

- Frequency Analysis
- Known Plaintext Attack
- Chosen Plaintext Attack
- Chosen Ciphertext Attack
- Brute Force
- Dictionary Attack
- Meet-in-the-Middle
- Birthday Attack

---

## Oracle Attacks

- Padding Oracle
- Bleichenbacher Attack
- CBC Padding Oracle
- RSA Oracle
- Adaptive Oracle Attacks

---

## Stream Cipher Attacks

- Keystream Reuse
- Nonce Reuse
- XOR Weaknesses
- RC4 Biases

---

## RSA Attacks

- Small Exponent Attack
- Common Modulus Attack
- Hastad Broadcast Attack
- Fermat Factorization
- Wiener's Attack
- RSA Padding Attacks

---

## ECC Attacks

- Invalid Curve Attack
- Small Subgroup Attack
- Weak Curve Selection

---

## Hash Attacks

- Collision Attack
- Birthday Attack
- Length Extension Attack
- Hash Flooding
- Rainbow Tables

---

## Password Cracking

- Dictionary Attack
- Brute Force
- Hybrid Attack
- Rule-Based Attack
- Mask Attack
- Wordlist Generation
- GPU Cracking

---

## Secret Sharing

- Shamir Secret Sharing
- Threshold Cryptography

---

## Token Security

- JWT Signing
- HMAC Tokens
- Session Tokens
- API Tokens
- Token Expiration
- Token Replay

---

## Secure Storage

- Password Storage
- Secret Storage
- Key Storage
- Hardware Security Modules (HSM)
- TPM
- Secure Enclave

---

## Cryptographic Failures

- Weak Algorithms
- Hardcoded Keys
- Hardcoded Secrets
- Insecure Randomness
- Broken Key Management
- Weak Password Hashing
- Improper Certificate Validation
- Insecure Defaults

---

## Cryptography in Web Security

- HTTPS
- Cookies
- JWT
- OAuth Tokens
- CSRF Tokens
- Password Reset Tokens
- Session IDs

---

## Cryptography in Mobile Security

- Android Keystore
- iOS Keychain
- Secure Storage
- Certificate Pinning

---

## Cryptography in Cloud

- KMS
- Envelope Encryption
- Secret Managers
- Cloud Certificates

---

## Blockchain Cryptography

- Merkle Trees
- Hash Chains
- Digital Wallets
- Public & Private Keys
- ECDSA in Blockchain

---

## Common Tools

- OpenSSL
- GPG
- Hashcat
- John the Ripper
- CyberChef
- RsaCtfTool
- SageMath
- xxd
- Base64 Utilities

---

## Common Techniques

- Encoding Detection
- Hash Identification
- Frequency Analysis
- XOR Analysis
- RSA Analysis
- Certificate Inspection
- Entropy Analysis
- Token Analysis

---

## CTF Crypto Patterns

- XOR Cipher
- Repeating-Key XOR
- Caesar Cipher
- Vigenère Cipher
- RSA Challenges
- ECB Oracle
- CBC Padding Oracle
- Base Encoding Challenges
- Hash Identification
- Multi-layer Encoding
- Weak RNG Challenges
- JWT Challenges

# 🕵️ Digital Forensics

## Digital Forensics Fundamentals

- Introduction to Digital Forensics
- Forensic Process
- Chain of Custody
- Evidence Handling
- Evidence Preservation
- Evidence Integrity
- Hash Verification
- Documentation
- Timeline of Investigation
- Legal & Ethical Considerations

---

## File Systems

- FAT16
- FAT32
- exFAT
- NTFS
- ext2
- ext3
- ext4
- XFS
- Btrfs
- APFS
- HFS+
- ISO9660

---

## File Analysis

- File Identification
- File Signatures (Magic Bytes)
- File Headers
- File Footers
- File Metadata
- File Extensions
- Hidden Files
- Alternate Data Streams (ADS)
- Corrupted Files
- Suspicious Files

---

## Metadata Analysis

- EXIF Metadata
- PDF Metadata
- Office Metadata
- Image Metadata
- Audio Metadata
- Video Metadata
- Document Metadata
- Timestamp Analysis

---

## File Carving

- Deleted Files
- Unallocated Space
- Slack Space
- Signature-Based Recovery
- Fragmented File Recovery
- Raw File Recovery

---

## Steganography

- Image Steganography
- Audio Steganography
- Video Steganography
- Text Steganography
- LSB Steganography
- Steganalysis
- Hidden Archives
- Hidden Data Detection

---

## Disk Forensics

- Disk Imaging
- Disk Acquisition
- Partition Analysis
- MBR
- GPT
- Volume Analysis
- Deleted Partitions
- Mounted Devices
- Boot Records

---

## Memory Forensics

- RAM Acquisition
- Memory Dumps
- Running Processes
- Loaded DLLs
- Network Connections
- Injected Code
- Command History
- Malware in Memory
- Registry in Memory
- Credential Extraction

---

## Process Analysis

- Parent & Child Processes
- Process Tree
- Suspicious Processes
- Hidden Processes
- Process Injection
- Hollowing Detection
- Process Masquerading

---

## Network Forensics

- PCAP Analysis
- TCP Streams
- UDP Analysis
- DNS Traffic
- HTTP Traffic
- HTTPS Analysis
- TLS Handshake
- FTP Traffic
- SMB Traffic
- SMTP Traffic
- SSH Traffic
- ICMP Traffic
- ARP Analysis

---

## Log Analysis

- Windows Event Logs
- Syslog
- Apache Logs
- Nginx Logs
- IIS Logs
- Authentication Logs
- PowerShell Logs
- Firewall Logs
- VPN Logs
- DNS Logs
- Proxy Logs

---

## Timeline Analysis

- File Creation Time
- File Modification Time
- File Access Time
- MFT Timeline
- Event Timeline
- Browser Timeline
- Registry Timeline
- User Activity Timeline

---

## Browser Forensics

- Chrome Artifacts
- Edge Artifacts
- Firefox Artifacts
- Safari Artifacts
- Browsing History
- Download History
- Cookies
- Cache
- Saved Passwords
- Bookmarks
- Extensions

---

## Windows Artifacts

- Registry
- Prefetch
- Amcache
- Shimcache
- SRUM
- Event Logs
- Recycle Bin
- Jump Lists
- Recent Files
- LNK Files
- Thumbcache
- USN Journal
- MFT
- Pagefile.sys
- Hiberfil.sys

---

## Linux Artifacts

- Bash History
- Zsh History
- Cron Jobs
- System Logs
- SSH Keys
- SSH History
- Package Manager Logs
- Authentication Logs
- Systemd Logs
- Temporary Files

---

## macOS Artifacts

- Unified Logs
- Launch Agents
- Launch Daemons
- Login Items
- Safari History
- Spotlight Database
- Keychain
- Recent Files

---

## Email Forensics

- Email Headers
- SMTP Analysis
- SPF
- DKIM
- DMARC
- Attachments
- Phishing Analysis
- Email Routing

---

## Registry Forensics

- Run Keys
- Services
- USB History
- Network History
- Installed Programs
- UserAssist
- ShellBags
- MRU Lists
- RecentDocs

---

## USB Forensics

- USB Device History
- Mounted Devices
- Serial Numbers
- First Connection
- Last Connection
- Device Drivers

---

## Mobile Forensics

### Android

- APK Artifacts
- Installed Apps
- SMS
- Call Logs
- Contacts
- Notifications
- Browser Data
- SQLite Databases

### iOS

- Backup Analysis
- Keychain
- Call Logs
- SMS
- Safari Data
- Installed Apps

---

## Malware Forensics

- Malware Identification
- Malware Triage
- Persistence Mechanisms
- Droppers
- Packers
- Command & Control (C2)
- Indicators of Compromise (IOC)

---

## Cloud Forensics

- AWS Logs
- Azure Logs
- GCP Logs
- IAM Activity
- CloudTrail
- Object Storage
- Cloud Metadata

---

## Virtual Machine Forensics

- VMware
- VirtualBox
- Hyper-V
- Snapshot Analysis
- Virtual Disk Analysis

---

## IoT Forensics

- Firmware Extraction
- Embedded Devices
- Flash Memory
- Serial Interfaces
- UART Analysis

---

## Artifact Correlation

- Cross-Artifact Correlation
- User Activity Reconstruction
- Timeline Correlation
- IOC Correlation
- Multi-Source Analysis

---

## Incident Reconstruction

- Initial Access
- Execution
- Persistence
- Privilege Escalation
- Defense Evasion
- Credential Access
- Discovery
- Lateral Movement
- Exfiltration
- Impact

---

## Common Tools

- Autopsy
- FTK Imager
- Volatility
- Volatility 3
- Sleuth Kit (TSK)
- Magnet AXIOM
- X-Ways Forensics
- KAPE
- Arsenal Image Mounter
- ExifTool
- Wireshark
- CyberChef
- Binwalk
- Foremost
- Scalpel
- Bulk Extractor
- RegRipper
- Eric Zimmerman's Tools
- Velociraptor

---

## Common Techniques

- Disk Imaging
- Hash Verification
- Timeline Creation
- Memory Dump Analysis
- Registry Parsing
- Log Correlation
- Artifact Extraction
- IOC Extraction
- Malware Triage
- Evidence Validation

---

## CTF Forensics Patterns

- Corrupted Images
- Hidden ZIP Files
- EXIF Challenges
- Steganography Challenges
- PCAP Challenges
- Memory Dump Challenges
- Registry Challenges
- Browser History Challenges
- Deleted File Recovery
- Log Analysis Challenges
- Malware Triage Challenges
- USB Artifact Challenges

# 🌍 OSINT (Open Source Intelligence)

## OSINT Fundamentals

- Introduction to OSINT
- Intelligence Cycle
- Intelligence Requirements
- Source Reliability
- Information Validation
- Intelligence Analysis
- OPSEC for OSINT
- Legal & Ethical Considerations
- Documentation
- Reporting

---

## Search Engine Techniques

- Google Dorking
- Bing Dorking
- DuckDuckGo Search
- Yandex Search
- Search Operators
- Cached Pages
- Archived Pages
- Reverse Search
- File Type Search
- Site Enumeration

---

## Website Investigation

- Website Fingerprinting
- Source Code Analysis
- robots.txt
- sitemap.xml
- Security Headers
- JavaScript Analysis
- Technology Detection
- Analytics IDs
- Tracking IDs
- Contact Information
- Hidden Pages
- Archived Websites

---

## Domain Intelligence

- WHOIS
- RDAP
- ASN Information
- Registrar Information
- Domain History
- Expired Domains
- Name Servers
- Reverse WHOIS
- Domain Relationships
- Passive DNS

---

## DNS Intelligence

- A Records
- AAAA Records
- MX Records
- TXT Records
- NS Records
- CNAME Records
- PTR Records
- SOA Records
- DNS History
- Zone Transfer Checks
- DNSSEC
- Reverse DNS

---

## IP Intelligence

- IP Geolocation
- ASN Lookup
- Reverse IP Lookup
- Reverse DNS
- BGP Information
- Hosting Provider
- Cloud Provider Detection
- Blacklist Checks
- Reputation Analysis
- Historical IP Data

---

## Email Investigation

- Email Headers
- SPF
- DKIM
- DMARC
- MX Records
- Email Breach Search
- Email Validation
- Email Enumeration
- Gravatar Lookup
- PGP Keys
- Email Metadata

---

## Username Investigation

- Username Enumeration
- Cross-Platform Search
- Username Correlation
- Username Variations
- Historical Usernames
- Gaming Profiles
- Forum Profiles
- Code Hosting Accounts
- Archived Profiles

---

## Social Media Investigation

- Facebook Investigation
- Instagram Investigation
- X (Twitter) Investigation
- LinkedIn Investigation
- TikTok Investigation
- Reddit Investigation
- YouTube Investigation
- Telegram Investigation
- Discord Investigation
- GitHub Investigation
- Profile Correlation
- Deleted Content Recovery

---

## Image Investigation

- Reverse Image Search
- EXIF Metadata
- GPS Metadata
- Camera Information
- Image Manipulation Detection
- Thumbnail Analysis
- Image Compression Analysis
- AI-Generated Image Detection

---

## Geolocation Investigation

- Landmark Identification
- Road Signs
- Buildings
- Vegetation
- Weather Analysis
- Terrain Analysis
- Shadow Analysis
- Sun Position
- Map Correlation
- Satellite Imagery
- Street View Analysis

---

## Video Investigation

- Video Metadata
- Keyframe Extraction
- Audio Analysis
- Frame-by-Frame Analysis
- Location Verification
- Timestamp Verification
- Object Identification

---

## Document Analysis

- PDF Metadata
- Microsoft Office Metadata
- Hidden Text
- Comments
- Revision History
- Author Information
- Digital Signatures
- Embedded Objects

---

## Metadata Analysis

- EXIF
- IPTC
- XMP
- File Timestamps
- Document Metadata
- Audio Metadata
- Video Metadata

---

## Company Intelligence

- Company Registration
- Directors
- Employees
- Organization Structure
- Subsidiaries
- Financial Information
- Job Postings
- Press Releases
- Public Documents

---

## Person Investigation

- Public Profiles
- Employment History
- Education History
- Public Records
- Publications
- Interviews
- Professional Memberships
- Speaking Engagements
- Online Footprint

---

## Phone Number Intelligence

- Number Validation
- Carrier Lookup
- Country Code Analysis
- Messaging Platforms
- Spam Reports
- Reverse Lookup

---

## Cryptocurrency Intelligence

- Wallet Analysis
- Blockchain Explorer
- Transaction Tracking
- Address Correlation
- Exchange Identification
- Token Analysis

---

## Threat Intelligence

- Indicators of Compromise (IOC)
- Threat Actors
- Malware Hashes
- Domains
- IP Reputation
- YARA Rules
- MITRE ATT&CK
- Threat Feeds
- TTP Analysis

---

## Dark Web Intelligence

- Onion Services
- Data Leak Monitoring
- Credential Dumps
- Marketplace Monitoring
- Threat Monitoring

---

## Infrastructure Intelligence

- Open Ports
- SSL Certificates
- Web Technologies
- Cloud Infrastructure
- CDN Detection
- Internet Exposure
- Internet-Wide Scanning

---

## Code Intelligence

- GitHub Recon
- GitLab Recon
- Bitbucket Recon
- Commit History
- Secrets Discovery
- API Keys
- Tokens
- Configuration Files

---

## Cloud Intelligence

- Public Buckets
- Public Blobs
- Cloud Assets
- Cloud Metadata
- Exposed Storage
- Cloud Certificates

---

## Breach Intelligence

- Data Breaches
- Credential Leaks
- Password Reuse
- Public Dumps
- Paste Sites
- Compromised Accounts

---

## Malware Intelligence

- Malware Families
- IOC Extraction
- Hash Analysis
- Sample Correlation
- Sandbox Reports
- Campaign Tracking

---

## Automation

- Python OSINT
- Bash Automation
- APIs
- Web Scraping
- Data Parsing
- Workflow Automation

---

## OPSEC

- Anonymous Browsing
- VPN Usage
- Tor
- Browser Isolation
- Virtual Machines
- Sock Puppets
- Identity Separation
- Metadata Hygiene

---

## Reporting & Documentation

- Evidence Collection
- Screenshots
- Source Citation
- Timeline
- Intelligence Summary
- Risk Assessment
- Report Writing

---

## Common Tools

- Maltego
- SpiderFoot
- theHarvester
- Amass
- Subfinder
- Shodan
- Censys
- FOFA
- ZoomEye
- VirusTotal
- URLScan
- Wayback Machine
- Hunter.io
- Have I Been Pwned
- GHunt
- Sherlock
- Holehe
- PhoneInfoga
- ExifTool
- Google Earth
- Google Maps
- OpenStreetMap
- GeoSpy
- Social Analyzer

---

## Common Techniques

- Pivoting
- Correlation
- Attribution
- Timeline Building
- Link Analysis
- Entity Resolution
- Source Validation
- Cross Verification
- Pattern Recognition
- Intelligence Fusion

---

## CTF OSINT Patterns

- Person Identification
- Company Investigation
- Image Geolocation
- Reverse Image Search
- Metadata Extraction
- Username Correlation
- Email Investigation
- GitHub Investigation
- Hidden Website Discovery
- Archived Website Analysis
- Blockchain Investigation
- Social Media Pivoting

# ☁️ Cloud Security

## Cloud Security Fundamentals

- Cloud Computing Models
- Shared Responsibility Model
- Public Cloud
- Private Cloud
- Hybrid Cloud
- Multi-Cloud
- Cloud Service Models (IaaS, PaaS, SaaS, FaaS)
- Cloud Architecture
- Cloud Threat Landscape
- Cloud Security Principles

---

## Identity & Access Management (IAM)

- IAM Fundamentals
- Users
- Groups
- Roles
- Policies
- Permissions
- Permission Boundaries
- Resource-Based Policies
- Service Accounts
- Cross-Account Access
- Temporary Credentials
- MFA
- Least Privilege
- Privilege Escalation

---

## Authentication & Authorization

- OAuth
- OpenID Connect (OIDC)
- SAML
- Federation
- Identity Providers
- Single Sign-On (SSO)
- Token Management
- Session Security

---

## Storage Security

- Object Storage
- Block Storage
- File Storage
- Bucket Security
- Blob Storage
- Access Control
- Bucket Policies
- Public Bucket Exposure
- Encryption at Rest
- Encryption in Transit
- Versioning
- Lifecycle Policies

---

## Compute Security

- Virtual Machines
- Metadata Services
- Instance Profiles
- Startup Scripts
- User Data
- VM Snapshots
- Image Security
- Remote Access
- Bastion Hosts

---

## Networking

- Virtual Private Cloud (VPC)
- Virtual Networks
- Subnets
- Routing Tables
- Internet Gateways
- NAT Gateways
- Security Groups
- Network ACLs
- Firewalls
- VPN
- Private Endpoints
- Load Balancers
- DNS
- Transit Gateway
- Peering

---

## Container Security

- Docker Fundamentals
- Images
- Layers
- Registries
- Dockerfile Security
- Runtime Security
- Privileged Containers
- Secrets
- Image Scanning
- Image Signing
- Rootless Containers

---

## Kubernetes Security

- Kubernetes Architecture
- Pods
- Nodes
- Namespaces
- RBAC
- Service Accounts
- Network Policies
- Secrets
- ConfigMaps
- Admission Controllers
- API Server Security
- etcd Security
- Pod Security Standards
- Kubelet Security
- Cluster Hardening

---

## Serverless Security

- Functions as a Service (FaaS)
- Event Triggers
- Function Permissions
- Execution Roles
- Environment Variables
- Cold Starts
- Serverless Secrets
- Logging
- Monitoring

---

## Secrets Management

- API Keys
- Tokens
- Passwords
- Secret Rotation
- Secret Managers
- Vault
- Environment Variables
- Key Management Services (KMS)

---

## Cryptography in Cloud

- Encryption at Rest
- Encryption in Transit
- Customer Managed Keys
- Provider Managed Keys
- Envelope Encryption
- Hardware Security Modules (HSM)

---

## Logging & Monitoring

- Audit Logs
- Activity Logs
- CloudTrail
- CloudWatch
- Azure Monitor
- GCP Cloud Logging
- SIEM Integration
- Alerting
- Log Retention

---

## CI/CD Security

- Secure Pipelines
- Build Security
- Dependency Scanning
- Artifact Security
- Secrets in Pipelines
- Pipeline Permissions
- Code Signing
- Supply Chain Security

---

## Infrastructure as Code (IaC)

- Terraform
- CloudFormation
- ARM Templates
- Bicep
- Pulumi
- IaC Security
- Misconfiguration Detection
- State File Security

---

## Cloud Pentesting

- Cloud Reconnaissance
- IAM Enumeration
- Storage Enumeration
- Compute Enumeration
- Network Enumeration
- Privilege Escalation
- Credential Discovery
- Metadata Abuse
- Service Enumeration
- Lateral Movement

---

## Cloud Misconfigurations

- Public Storage
- Overly Permissive IAM
- Open Security Groups
- Public Databases
- Metadata Exposure
- Weak Network Segmentation
- Unencrypted Storage
- Weak Logging

---

## Cloud Attack Techniques

- SSRF to Metadata Service
- IAM Privilege Escalation
- Credential Theft
- Bucket Enumeration
- Secret Extraction
- Container Escape
- Kubernetes Abuse
- Serverless Abuse
- Cross-Account Abuse

---

## Cloud Incident Response

- Log Collection
- Evidence Preservation
- IAM Investigation
- Storage Investigation
- Compute Investigation
- Network Investigation
- Timeline Analysis
- Containment
- Recovery

---

## Cloud Threat Detection

- Suspicious API Calls
- Credential Abuse
- Impossible Travel
- Privilege Escalation Detection
- Data Exfiltration
- Resource Hijacking
- Cryptocurrency Mining Detection

---

## Multi-Cloud Security

- AWS Security
- Azure Security
- Google Cloud Security
- Cross-Cloud Identity
- Cross-Cloud Logging
- Hybrid Cloud Security

---

## Cloud Compliance

- ISO 27001
- SOC 2
- PCI DSS
- HIPAA
- GDPR
- CIS Benchmarks
- NIST Framework

---

## Common Vulnerabilities

- Public Buckets
- IAM Misconfiguration
- Hardcoded Secrets
- Metadata Exposure
- Open Management Ports
- Weak Network Policies
- Container Misconfiguration
- Kubernetes Misconfiguration
- Serverless Misconfiguration
- CI/CD Misconfiguration

---

## Common Tools

- ScoutSuite
- Prowler
- Pacu
- CloudSploit
- Trivy
- kube-bench
- kube-hunter
- kubectl
- Docker
- Terraform
- Steampipe
- Checkov
- tfsec
- Terrascan
- AWS CLI
- Azure CLI
- gcloud CLI

---

## Common Techniques

- Cloud Enumeration
- IAM Enumeration
- Metadata Enumeration
- Secret Discovery
- Bucket Enumeration
- Privilege Escalation
- Lateral Movement
- Persistence
- Defense Evasion
- Resource Abuse

---

## Cloud CTF & Lab Patterns

- Public S3 Bucket
- Exposed Blob Storage
- Metadata Service Abuse
- IAM Privilege Escalation
- Kubernetes Escape
- Docker Escape
- CI/CD Secrets
- Terraform Secrets
- Serverless Misconfiguration
- Cloud Logging Analysis

# 📱 Mobile Security

## Mobile Security Fundamentals

- Mobile Security Overview
- Android vs iOS Security
- Mobile Threat Landscape
- OWASP Mobile Top 10
- Mobile Attack Surface
- Mobile Security Testing Methodology
- Mobile App Lifecycle
- Secure Mobile Development

---

## Android Fundamentals

- Android Architecture
- Android Runtime (ART)
- Dalvik VM
- APK Structure
- Android Manifest
- Application Components
- Permissions Model
- Android Sandbox
- SELinux
- Binder IPC
- Intents
- Activities
- Services
- Broadcast Receivers
- Content Providers

---

## APK Analysis

- APK Structure
- AndroidManifest.xml
- resources.arsc
- classes.dex
- Native Libraries (.so)
- Assets
- Certificates
- APK Signature
- APK Repackaging
- APK Installation Process

---

## Static Analysis

- Manifest Analysis
- Source Code Review
- Smali Analysis
- Java Analysis
- Kotlin Analysis
- Native Library Analysis
- Hardcoded Secrets
- API Keys
- Certificates
- Third-Party Libraries
- Configuration Files
- Obfuscation Detection

---

## Dynamic Analysis

- Runtime Analysis
- Logcat Analysis
- Process Monitoring
- Memory Analysis
- API Hooking
- Method Hooking
- Traffic Interception
- Runtime Modification
- Dynamic Instrumentation

---

## Mobile Reverse Engineering

- DEX Analysis
- Smali
- JADX
- apktool
- Java Decompilation
- Kotlin Decompilation
- Native Libraries
- ARM Assembly
- ARM64 Assembly
- JNI Analysis
- Binary Analysis

---

## Android Components

### Activities

- Exported Activities
- Activity Hijacking
- Intent Injection

### Services

- Bound Services
- Started Services
- Exported Services

### Broadcast Receivers

- Exported Receivers
- Broadcast Injection
- Broadcast Sniffing

### Content Providers

- SQL Injection
- Path Traversal
- Permission Bypass
- Information Disclosure

---

## Authentication & Authorization

- Login Mechanisms
- Session Tokens
- JWT
- OAuth
- Biometric Authentication
- PIN Authentication
- MFA
- Authorization Checks
- Access Control

---

## Storage Security

- SharedPreferences
- SQLite Databases
- Room Database
- Internal Storage
- External Storage
- Cache
- Keystore
- EncryptedSharedPreferences
- File Encryption
- Sensitive Data Storage

---

## Network Security

- HTTPS
- TLS
- Certificate Validation
- Certificate Pinning
- SSL Pinning Bypass
- Proxy Configuration
- Traffic Interception
- WebSockets
- API Requests
- Network Security Config

---

## WebView Security

- WebView Basics
- JavaScript Interface
- File Access
- Universal Access
- Cross-Origin Issues
- WebView XSS
- WebView RCE
- Insecure WebView Configuration

---

## Cryptography

- Android Keystore
- Key Generation
- Key Storage
- AES
- RSA
- JWT
- Token Encryption
- Random Number Generation
- Hardcoded Keys

---

## Inter-Process Communication (IPC)

- Binder
- AIDL
- Intents
- PendingIntent
- Broadcast IPC
- URI Permissions

---

## Root Detection & Bypass

- Root Detection
- Magisk Detection
- Emulator Detection
- Integrity Checks
- SafetyNet
- Play Integrity API
- Root Bypass

---

## Anti-Reversing

- Code Obfuscation
- String Encryption
- Anti-Debugging
- Anti-Tampering
- Emulator Detection
- Hook Detection
- Frida Detection

---

## Dynamic Instrumentation

- Frida
- Objection
- Xposed
- LSPosed
- Runtime Hooking
- Method Replacement
- SSL Pinning Bypass

---

## Malware Analysis

- Android Malware
- Droppers
- Banking Trojans
- Spyware
- Ransomware
- Persistence
- C2 Communication
- Permissions Abuse

---

## iOS Security Fundamentals

- iOS Architecture
- IPA Structure
- App Sandbox
- Entitlements
- Keychain
- Secure Enclave
- Code Signing
- Provisioning Profiles
- App Extensions

---

## iOS Reverse Engineering

- Mach-O Analysis
- Objective-C
- Swift
- Class Dump
- Hopper
- Ghidra
- Frida
- Cycript

---

## iOS Dynamic Analysis

- Jailbreak
- Runtime Hooking
- SSL Pinning Bypass
- Keychain Analysis
- File System Analysis
- API Hooking

---

## Mobile API Security

- REST APIs
- GraphQL APIs
- Authentication
- Authorization
- Rate Limiting
- JWT
- OAuth
- BOLA
- BFLA
- Mass Assignment

---

## Secure Coding

- Input Validation
- Secure Storage
- Secure Communication
- Authentication
- Authorization
- Logging
- Error Handling
- Secrets Management

---

## Common Vulnerabilities

- Insecure Storage
- Hardcoded Secrets
- Weak Cryptography
- Exported Components
- SQL Injection
- Path Traversal
- WebView Issues
- Certificate Pinning Bypass
- Insecure Authentication
- Insecure Authorization
- Insecure IPC
- Sensitive Data Leakage

---

## Common Tools

- JADX
- apktool
- dex2jar
- JD-GUI
- MobSF
- Frida
- Objection
- Burp Suite
- Android Studio
- adb
- Drozer
- Ghidra
- Hopper
- IDA Free
- mitmproxy
- Charles Proxy

---

## Common Techniques

- Static Analysis
- Dynamic Analysis
- APK Repacking
- Manifest Review
- SSL Pinning Bypass
- Root Detection Bypass
- Traffic Interception
- Runtime Hooking
- Smali Patching
- Intent Fuzzing

---

## Mobile CTF & Lab Patterns

- Insecure SharedPreferences
- Hardcoded API Keys
- Exported Activities
- Exported Services
- Content Provider SQL Injection
- WebView XSS
- SSL Pinning Bypass
- Root Detection Bypass
- JWT Manipulation
- APK Reverse Engineering
- Smali Patching
- Native Library Analysis

# 🧰 Miscellaneous

## Linux Fundamentals

- Linux File System
- Users & Groups
- File Permissions
- Processes
- Services
- Systemd
- Cron Jobs
- Networking
- Package Managers
- Bash Basics
- Shell Scripting
- Environment Variables
- SSH
- Logging
- File Searching
- Compression
- Text Processing

---

## Windows Fundamentals

- Windows Architecture
- NTFS
- Registry
- Services
- Processes
- Scheduled Tasks
- Users & Groups
- UAC
- PowerShell
- Event Viewer
- Windows Networking
- Windows Permissions
- Windows Firewall

---

## Networking Fundamentals

- OSI Model
- TCP/IP
- IPv4
- IPv6
- TCP
- UDP
- ICMP
- ARP
- DNS
- DHCP
- HTTP
- HTTPS
- FTP
- SMTP
- POP3
- IMAP
- SMB
- LDAP
- Kerberos
- SSH
- VPN
- VLAN
- NAT
- Routing
- Switching

---

## Programming for Security

### Python

- Variables
- Functions
- Modules
- Requests
- Socket Programming
- Threading
- AsyncIO
- File Handling
- Regex
- Automation
- API Usage

### Bash

- Variables
- Loops
- Functions
- Automation
- Linux Administration

### PowerShell

- Cmdlets
- Objects
- Remoting
- Automation
- Active Directory Scripting

### JavaScript

- DOM
- Fetch API
- AJAX
- Browser APIs

### C

- Memory
- Pointers
- Structures
- System Calls

### Go

- Networking
- HTTP
- Concurrency
- CLI Development

---

## Scripting & Automation

- Python Automation
- Bash Automation
- PowerShell Automation
- Cron Automation
- API Automation
- REST API Automation
- Report Automation

---

## Secure Coding

- Input Validation
- Output Encoding
- Authentication
- Authorization
- Session Security
- Error Handling
- Logging
- Secrets Management
- Secure File Upload
- Secure APIs
- Secure Database Access

---

## Git & GitHub

- Git Basics
- Branching
- Merging
- Pull Requests
- GitHub Actions
- Security Advisories
- Secret Scanning
- Version Control Best Practices

---

## Docker

- Docker Basics
- Dockerfile
- Docker Compose
- Images
- Containers
- Networks
- Volumes
- Security Best Practices

---

## Virtualization

- VMware
- VirtualBox
- Hyper-V
- KVM
- Snapshots
- Virtual Networking

---

## Home Lab Setup

- VMware Lab
- VirtualBox Lab
- Proxmox
- pfSense
- Kali Linux
- Windows Lab
- Active Directory Lab
- Vulnerable Machines
- Network Segmentation

---

## Reporting & Documentation

- Executive Summary
- Technical Summary
- Risk Rating
- CVSS
- Proof of Concept
- Screenshots
- Evidence Collection
- Reproduction Steps
- Remediation
- References

---

## CTF Methodology

- Enumeration
- Initial Foothold
- Privilege Escalation
- Flag Hunting
- Note Taking
- Time Management
- Post-Challenge Review

---

## Bug Bounty Methodology

- Scope Analysis
- Reconnaissance
- Subdomain Enumeration
- Content Discovery
- Technology Fingerprinting
- Vulnerability Validation
- Proof of Concept
- Report Writing
- Duplicate Handling
- Disclosure Process

---

## Red Team Methodology

- MITRE ATT&CK
- Cyber Kill Chain
- Diamond Model
- Reconnaissance
- Initial Access
- Persistence
- Privilege Escalation
- Defense Evasion
- Credential Access
- Discovery
- Lateral Movement
- Collection
- Command & Control
- Exfiltration
- Impact

---

## Blue Team Fundamentals

- SOC Basics
- SIEM
- Log Analysis
- Detection Engineering
- Threat Hunting
- Incident Response
- Digital Forensics
- Malware Analysis
- MITRE ATT&CK Mapping

---

## Threat Modeling

- STRIDE
- DREAD
- PASTA
- Attack Trees
- Trust Boundaries
- Data Flow Diagrams (DFD)

---

## OPSEC (Operational Security)

- Identity Separation
- VPN Usage
- Tor
- Secure Communications
- Metadata Hygiene
- Anonymous Accounts
- Browser Isolation
- Virtual Machines
- Secure Password Management

---

## Common Tools Reference

### Enumeration

- Nmap
- RustScan
- Masscan
- Naabu

### Web

- Burp Suite
- ffuf
- Gobuster
- Feroxbuster
- Nikto

### Network

- Wireshark
- tcpdump
- Netcat
- socat

### Active Directory

- BloodHound
- SharpHound
- Certipy
- Impacket
- NetExec

### Windows

- WinPEAS
- Seatbelt
- PowerUp
- Mimikatz

### Linux

- LinPEAS
- pspy
- GTFOBins
- LES

### Cloud

- Prowler
- ScoutSuite
- Pacu

### Mobile

- MobSF
- Frida
- Objection

### Reverse Engineering

- Ghidra
- IDA Free
- Binary Ninja
- Cutter

### Binary Exploitation

- GDB
- pwndbg
- GEF
- Pwntools

### Cryptography

- OpenSSL
- Hashcat
- John the Ripper
- CyberChef

### Forensics

- Volatility
- Autopsy
- FTK Imager
- Sleuth Kit

### OSINT

- Amass
- Maltego
- SpiderFoot
- Shodan
- Censys

---

## Interview Preparation

- Linux Questions
- Windows Questions
- Networking Questions
- Web Security Questions
- Active Directory Questions
- Cloud Security Questions
- Mobile Security Questions
- Cryptography Questions
- Reverse Engineering Questions
- Binary Exploitation Questions
- Scenario-Based Questions
- Whiteboard Exercises
- Practical Labs
- HR Interview Preparation

---

## Career Development

- Learning Roadmaps
- Certification Planning
- Portfolio Building
- Resume
- LinkedIn
- GitHub Portfolio
- Technical Blogging
- Conference Notes
- Research Papers
- CVE Analysis

---

## Soft Skills

- Communication
- Technical Writing
- Presentation Skills
- Time Management
- Team Collaboration
- Critical Thinking
- Problem Solving