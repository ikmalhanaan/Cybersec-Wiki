// src/utils/cross-ref.ts
// Fitur 1: Cross-Reference Auto-Linker
// Input: raw markdown string + data/pages.json
// Output: markdown string dengan semua referensi jadi HTML link / markdown link

export interface PageData {
  id: string;
  slug: string;
  title: string;
  category: string;
  categoryId?: string;
  categoryColor?: string;
  content: string;
  refs_out: string[];
  refs_in: string[];
  filepath?: string;
  filename?: string;
  tags?: string[];
}

/**
 * Finds matching page by ID or normalized filename
 */
export function findPage(refIdOrFilename: string, pages: PageData[]): PageData | undefined {
  const clean = refIdOrFilename.trim();
  const idMatch = clean.match(/^(\d{2}[a-z]?)/i);
  if (!idMatch) {
    if (clean.toLowerCase().includes('cyber security')) {
      return pages.find(p => p.id === '00' || p.slug === 'cyber-security');
    }
    return undefined;
  }
  const id = idMatch[1].toLowerCase();
  return pages.find(p => p.id.toLowerCase() === id);
}

/**
 * Resolves all cross-references in markdown content:
 * 1. Existing markdown links: [label](./XX_file.md) -> [label](/docs/slug)
 * 2. ASCII chart arrow patterns: ├──→ Port 22 (SSH) → 06_ssh_workflow.md
 * 3. Plain text references: XX_nama_file.md -> [Page Title](/docs/slug)
 */
export function resolveRefs(content: string, pages: PageData[]): string {
  if (!content) return '';

  let result = content;

  // 1. Resolve existing Markdown links pointing to .md files
  // e.g. [03_nmap_master_workflow.md](./03_nmap_master_workflow.md)
  result = result.replace(
    /\[([^\]]+)\]\(\s*(?:\.\/|\.\.\/)?([a-zA-Z0-9_& %-]+\.md)(#[^\)]*)?\s*\)/gi,
    (fullMatch, linkText, targetFile, hash = '') => {
      const page = findPage(targetFile, pages);
      if (!page) return fullMatch;
      
      // If link text is literally the filename, replace with Page Title for cleaner reading
      const isFilenameLabel = linkText.endsWith('.md') || linkText.startsWith('./');
      const label = isFilenameLabel ? page.title : linkText;
      return `[${label}](/docs/${page.slug}${hash})`;
    }
  );

  // 2. Resolve ASCII cross-reference chart patterns
  // Example: ├──→ Port 22  (SSH)     → 06_ssh_workflow.md
  //          │   ├─ SSH  → proxychains4/langsung → 06_ssh_workflow.md
  result = result.replace(
    /(├──?→?|└──?→?|│\s*├─|│\s*└─|[─→\-\s]+→)\s*([^\n\r]*?)\b(\d{2}[a-z]?_[a-zA-Z0-9_& -]+\.md)\b/gi,
    (fullMatch, prefix, contextText, matchedFilename) => {
      const page = findPage(matchedFilename, pages);
      if (!page) return fullMatch;
      return `${prefix} ${contextText}<a href="/docs/${page.slug}" class="text-[#00b4d8] hover:underline font-mono font-semibold">${matchedFilename}</a>`;
    }
  );

  // 3. Resolve remaining plain text references: XX_nama_file.md
  // Regex pattern matching: XX_nama_file.md ATAU XX_nama_file_workflow.md
  const FILE_REF_PATTERN = /\b(\d{2}[a-z]?)_([a-zA-Z0-9_& -]+)\.md\b/gi;

  result = result.replace(FILE_REF_PATTERN, (match, num, name, offset, fullString) => {
    // Check if match is already inside an existing link or tag
    // e.g. (/docs/slug), href="...", or [Title](...match...)
    const before = fullString.substring(Math.max(0, offset - 30), offset);
    const after = fullString.substring(offset + match.length, offset + match.length + 30);

    if (
      before.includes('/docs/') || 
      before.includes('href="') || 
      before.includes('href=\'') ||
      before.endsWith('](') || 
      (before.includes('[') && !before.includes(']')) ||
      after.startsWith('</a>')
    ) {
      return match;
    }

    const page = pages.find(p => p.id.toLowerCase() === num.toLowerCase() || p.id === num.padStart(2, '0'));
    if (!page) return match;

    return `[${page.title}](/docs/${page.slug})`;
  });

  return result;
}

/**
 * Specialized resolver for ASCII cross-reference tables and flow lines
 */
export function resolveAsciiLinks(asciiContent: string, pages: PageData[]): string {
  const FILE_REF_PATTERN = /\b(\d{2}[a-z]?)_([a-zA-Z0-9_& -]+)\.md\b/gi;

  return asciiContent.replace(FILE_REF_PATTERN, (match) => {
    const page = findPage(match, pages);
    if (!page) return match;
    return `<a href="/docs/${page.slug}" class="text-[#00b4d8] hover:underline font-mono font-bold">${match}</a>`;
  });
}
