// src/utils/search-engine.ts
// Deep full-text & code search engine for Cyber Security Wiki

export interface SearchSnippet {
  h: string; // heading
  s: string; // heading slug
  l: string; // language
  c: string; // code content
}

export interface SearchDoc {
  id: string;
  slug: string;
  title: string;
  category: string;
  categoryId: string;
  categoryColor: string;
  filename: string;
  tags: string[];
  excerpt: string;
  snippets: SearchSnippet[];
}

export interface MatchedSnippet {
  heading: string;
  headingSlug: string;
  lang: string;
  codePreview: string;
  fullCode: string;
  matchScore: number;
}

export interface SearchResult {
  id: string;
  slug: string;
  title: string;
  category: string;
  categoryId: string;
  categoryColor: string;
  filename: string;
  tags: string[];
  excerpt: string;
  matchedSnippets: MatchedSnippet[];
  totalCodeMatches: number;
  score: number;
}

let searchIndexCache: SearchDoc[] | null = null;
let loadingPromise: Promise<SearchDoc[]> | null = null;

/**
 * Fetch and cache search-index.json in memory
 */
export async function loadSearchIndex(): Promise<SearchDoc[]> {
  if (searchIndexCache && searchIndexCache.length > 0) {
    return searchIndexCache;
  }
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      const res = await fetch('/search-index.json', { cache: 'default' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      searchIndexCache = data;
      return data;
    } catch (err) {
      console.warn('Could not load /search-index.json:', err);
      return [];
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

/**
 * Initialize search index immediately or from fallback pages data
 */
export function initSearchIndex(data: SearchDoc[]) {
  if (data && data.length > 0) {
    searchIndexCache = data;
  }
}

/**
 * Escape HTML to prevent XSS during highlighting
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Safe highlight of matching terms
 */
export function highlightText(text: string, query: string): string {
  if (!query || !query.trim() || !text) return escapeHtml(text);

  const safe = escapeHtml(text);
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return safe;

  const escapedTerms = terms.map(t => escapeHtml(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  return safe.replace(pattern, '<mark class="bg-[#00b4d8]/30 text-[#38bdf8] font-semibold px-0.5 rounded">$1</mark>');
}

/**
 * Extract matched lines of code with context around query
 */
function extractSnippetPreview(code: string, terms: string[]): string {
  const lines = code.split(/\r?\n/);
  let matchIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const lLower = lines[i].toLowerCase();
    if (terms.some(t => lLower.includes(t))) {
      matchIdx = i;
      break;
    }
  }

  if (matchIdx === -1) {
    matchIdx = lines.findIndex(l => !/^[+|=-]{3,}/.test(l.trim()));
    if (matchIdx === -1) matchIdx = 0;
  }

  const start = Math.max(0, matchIdx - 1);
  const end = Math.min(lines.length, matchIdx + 4);
  return lines.slice(start, end).join('\n').trim();
}

/**
 * Perform instant deep full-text and code search across all documents
 */
export function performSearch(
  docs: SearchDoc[],
  query: string,
  categoryFilter: string = 'all'
): SearchResult[] {
  if (!docs || docs.length === 0) return [];

  const trimmed = (query || '').trim();
  const qLower = trimmed.toLowerCase();
  const terms = qLower.split(/\s+/).filter(Boolean);

  let filteredDocs = docs;
  if (categoryFilter && categoryFilter !== 'all') {
    filteredDocs = docs.filter(d => d.categoryId === categoryFilter);
  }

  if (terms.length === 0) {
    return filteredDocs.map(d => ({
      id: d.id,
      slug: d.slug,
      title: d.title,
      category: d.category,
      categoryId: d.categoryId,
      categoryColor: d.categoryColor,
      filename: d.filename,
      tags: d.tags || [],
      excerpt: d.excerpt || '',
      matchedSnippets: (d.snippets || []).slice(0, 1).map(s => ({
        heading: s.h,
        headingSlug: s.s,
        lang: s.l,
        codePreview: extractSnippetPreview(s.c, []),
        fullCode: s.c,
        matchScore: 0
      })),
      totalCodeMatches: d.snippets?.length || 0,
      score: 0
    }));
  }

  const results: SearchResult[] = [];

  for (const doc of filteredDocs) {
    let docScore = 0;
    const titleLower = doc.title.toLowerCase();
    const idLower = doc.id.toLowerCase();
    const tagsLower = (doc.tags || []).join(' ').toLowerCase();
    const excerptLower = (doc.excerpt || '').toLowerCase();

    // Document-level matching
    if (titleLower.includes(qLower)) docScore += 120;
    else if (terms.every(t => titleLower.includes(t))) docScore += 80;
    else if (terms.some(t => titleLower.includes(t))) docScore += 30;

    if (idLower === qLower || idLower === `mod-${qLower}`) docScore += 100;
    if (tagsLower.includes(qLower)) docScore += 70;
    else if (terms.some(t => tagsLower.includes(t))) docScore += 35;

    if (excerptLower.includes(qLower)) docScore += 25;

    // Search inside code snippets
    const matchedSnippets: MatchedSnippet[] = [];
    const snippets = doc.snippets || [];

    for (const snip of snippets) {
      const cLower = snip.c.toLowerCase();
      const hLower = snip.h.toLowerCase();

      let snippetScore = 0;

      // Exact phrase match in code
      if (cLower.includes(qLower)) {
        snippetScore += 90;
      } else if (terms.every(t => cLower.includes(t))) {
        snippetScore += 60;
      } else if (terms.some(t => cLower.includes(t))) {
        snippetScore += 20;
      }

      // Heading match
      if (hLower.includes(qLower)) {
        snippetScore += 50;
      } else if (terms.every(t => hLower.includes(t))) {
        snippetScore += 30;
      }

      // Bonus for executable command languages (bash, python, cmd, powershell, c, sql)
      const isExecutableLang = ['bash', 'sh', 'python', 'powershell', 'cmd', 'c', 'sql'].includes((snip.l || '').toLowerCase());
      if (isExecutableLang) snippetScore += 40;

      // Bonus if code actually contains shell commands/tools
      if (/(?:sudo|nmap|curl|chmod|chown|cat|export|python|gcc|impacket|enum4linux|smbclient|smbmap|nxc|secretsdump|psexec|wmiexec|bloodhound)/i.test(snip.c)) {
        snippetScore += 25;
      }

      // Penalize pure ASCII diagrams/borders
      const isAsciiBox = /^\s*[+|=-]{3,}/.test(snip.c);
      if (isAsciiBox) snippetScore -= 45;

      if (snippetScore > 0) {
        const preview = extractSnippetPreview(snip.c, terms);
        matchedSnippets.push({
          heading: snip.h,
          headingSlug: snip.s,
          lang: snip.l,
          codePreview: preview,
          fullCode: snip.c,
          matchScore: snippetScore
        });
      }
    }

    matchedSnippets.sort((a, b) => b.matchScore - a.matchScore);

    if (docScore > 0 || matchedSnippets.length > 0) {
      const bestSnippetScore = matchedSnippets.length > 0 ? matchedSnippets[0].matchScore : 0;
      const totalScore = docScore + bestSnippetScore + Math.min(matchedSnippets.length * 5, 30);

      results.push({
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        category: doc.category,
        categoryId: doc.categoryId,
        categoryColor: doc.categoryColor,
        filename: doc.filename,
        tags: doc.tags || [],
        excerpt: doc.excerpt || '',
        matchedSnippets: matchedSnippets.slice(0, 3),
        totalCodeMatches: matchedSnippets.length,
        score: totalScore
      });
    }
  }

  // Sort by highest score first
  results.sort((a, b) => b.score - a.score);

  return results;
}
