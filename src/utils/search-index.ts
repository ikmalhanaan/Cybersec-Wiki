// src/utils/search-index.ts
// Build Fuse.js index dari pages.json, support search by title, content snippet, dan tags (nama tools pentest)
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { PageData } from './cross-ref';

// Daftar tools pentest populer untuk ekstraksi tag otomatis
export const SECURITY_TOOLS_LIST: string[] = [
  // Network Scanning & Enumeration
  'nmap', 'masscan', 'rustscan', 'netcat', 'nc', 'socat', 'snmpwalk', 'onesixtyone', 'enum4linux', 'rpcclient', 'smbclient', 'smbmap', 'crackmapexec', 'netexec', 'nxc',
  // Web Recon & Fuzzing
  'gobuster', 'ffuf', 'feroxbuster', 'dirsearch', 'wfuzz', 'nikto', 'whatweb', 'wpscan', 'droopescan', 'joomscan',
  // Web Exploitation & Proxy
  'burpsuite', 'burp', 'zap', 'sqlmap', 'commix', 'tplmap', 'jwt_tool', 'xsser',
  // Active Directory & Windows
  'bloodhound', 'sharphound', 'impacket', 'secretsdump', 'psexec', 'wmiexec', 'smbexec', 'responder', 'ntlmrelayx', 'mimikatz', 'rubeus', 'certipy', 'evil-winrm', 'powerview',
  // Privilege Escalation
  'linpeas', 'winpeas', 'pspy', 'seatbelt', 'powerup', 'les', 'wesng',
  // Password Cracking & Hashes
  'hashcat', 'john', 'hydra', 'medusa', 'cprecover', 'fcrackzip', 'cewl', 'crunch',
  // Binary & Reversing
  'ghidra', 'ida', 'gdb', 'radare2', 'r2', 'checksec', 'ropper', 'ropgadget', 'pwntools', 'strace', 'ltrace',
  // Forensics & Crypto
  'wireshark', 'tshark', 'tcpdump', 'volatility', 'binwalk', 'foremost', 'exiftool', 'steghide', 'stegseek', 'zsteg', 'cyberchef',
  // Pivoting & Tunneling
  'chisel', 'ligolo', 'ligolo-ng', 'plink', 'proxychains', 'ssh'
];

/**
 * Mengekstrak tags tools yang relevan dari teks konten
 */
export function extractToolTags(content: string): string[] {
  if (!content) return [];
  const lower = content.toLowerCase();
  const foundTags = new Set<string>();

  for (const tool of SECURITY_TOOLS_LIST) {
    // Exact word boundary matching for short names like nc, r2, etc.
    const regex = new RegExp(`\\b${tool}\\b`, 'i');
    if (regex.test(lower)) {
      foundTags.add(tool);
    }
  }

  return Array.from(foundTags).sort();
}

export const defaultSearchOptions: IFuseOptions<PageData> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'tags', weight: 0.25 },
    { name: 'id', weight: 0.15 },
    { name: 'category', weight: 0.1 },
    { name: 'content', weight: 0.1 }
  ],
  threshold: 0.35,
  includeMatches: true,
  minMatchCharLength: 2
};

/**
 * Membuat instance Fuse.js dengan penambahan tags otomatis pada pages
 */
export function createSearchIndex(pages: PageData[], customOptions?: IFuseOptions<PageData>): Fuse<PageData> {
  const enrichedPages: PageData[] = pages.map(p => ({
    ...p,
    tags: p.tags && p.tags.length > 0 ? p.tags : extractToolTags(p.content)
  }));

  return new Fuse(enrichedPages, {
    ...defaultSearchOptions,
    ...customOptions
  });
}

/**
 * Helper search function
 */
export function searchDocs(fuse: Fuse<PageData>, query: string, categoryFilter?: string) {
  if (!query || !query.trim()) return [];

  let results = fuse.search(query.trim()).map(r => r.item);

  if (categoryFilter && categoryFilter !== 'all') {
    results = results.filter(p => p.categoryId === categoryFilter);
  }

  return results;
}
