import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = process.env.SOURCE_DIR || path.resolve(PROJECT_ROOT, '..');
const CONTENT_DOCS_DIR = path.resolve(PROJECT_ROOT, 'src/content/docs');
const DATA_DIR = path.resolve(PROJECT_ROOT, 'src/data');

// Category mapping based on user directory structure
export const CATEGORY_DEFINITIONS = [
  {
    id: "fondasi",
    dir: "1. Fondasi",
    label: "1. Fondasi",
    color: "#10B981", // Emerald
    files: ["01", "02", "03", "04"]
  },
  {
    id: "network",
    dir: "2. Network And Service",
    label: "2. Network Services",
    color: "#3B8BD4", // Blue
    files: ["05", "06", "07", "08", "09", "10", "11", "12", "13", "14a", "14b", "14c", "14d"]
  },
  {
    id: "web",
    dir: "3. Web Exploitation",
    label: "3. Web Exploitation",
    color: "#F59E0B", // Amber
    files: [
      "15", "16", "17", "17a", "17b", "17c", "17d", "18", "19", "20",
      "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
      "31", "32", "33", "34"
    ]
  },
  {
    id: "ad",
    dir: "4. Active Directory",
    label: "4. Active Directory",
    color: "#EF4444", // Red
    files: ["35", "36", "37", "38", "39", "40", "41", "42", "43"]
  },
  {
    id: "privesc",
    dir: "5. Privillege Escalation",
    label: "5. Privilege Escalation",
    color: "#8B5CF6", // Violet
    files: ["44", "45", "46", "47"]
  },
  {
    id: "binary",
    dir: "6. Binary & Reversing",
    label: "6. Binary & Reversing",
    color: "#EC4899", // Pink
    files: ["48", "49", "50", "51", "52"]
  },
  {
    id: "crypto_forensics",
    dir: "7. CRYPTOGRAPHY & FORENSICS",
    label: "7. Cryptography & Forensics",
    color: "#06B6D4", // Cyan
    files: ["53", "54", "55", "56", "57", "58"]
  },
  {
    id: "cloud_mobile",
    dir: "8. CLOUD & MOBILE",
    label: "8. Cloud & Mobile",
    color: "#6366F1", // Indigo
    files: ["59", "60", "61"]
  },
  {
    id: "osint_misc",
    dir: "9. OSINT & MISC",
    label: "9. OSINT & Misc",
    color: "#14B8A6", // Teal
    files: ["62", "63", "64", "65"]
  }
];

const SECURITY_TOOLS = [
  'nmap', 'masscan', 'rustscan', 'netcat', 'nc', 'socat', 'snmpwalk', 'onesixtyone', 'enum4linux', 'rpcclient', 'smbclient', 'smbmap', 'crackmapexec', 'netexec', 'nxc',
  'gobuster', 'ffuf', 'feroxbuster', 'dirsearch', 'wfuzz', 'nikto', 'whatweb', 'wpscan', 'droopescan', 'joomscan',
  'burpsuite', 'burp', 'zap', 'sqlmap', 'commix', 'tplmap', 'jwt_tool', 'xsser',
  'bloodhound', 'sharphound', 'impacket', 'secretsdump', 'psexec', 'wmiexec', 'smbexec', 'responder', 'ntlmrelayx', 'mimikatz', 'rubeus', 'certipy', 'evil-winrm', 'powerview',
  'linpeas', 'winpeas', 'pspy', 'seatbelt', 'powerup', 'les', 'wesng',
  'hashcat', 'john', 'hydra', 'medusa', 'cprecover', 'fcrackzip', 'cewl', 'crunch',
  'ghidra', 'ida', 'gdb', 'radare2', 'r2', 'checksec', 'ropper', 'ropgadget', 'pwntools', 'strace', 'ltrace',
  'wireshark', 'tshark', 'tcpdump', 'volatility', 'binwalk', 'foremost', 'exiftool', 'steghide', 'stegseek', 'zsteg', 'cyberchef',
  'chisel', 'ligolo', 'ligolo-ng', 'plink', 'proxychains', 'ssh'
];

function extractId(filename) {
  if (filename.toLowerCase() === 'cyber security.md') return '00';
  const m = filename.match(/^(\d{2}[a-z]?)/i);
  return m ? m[1].toLowerCase() : filename.replace(/\.md$/i, '').toLowerCase();
}

function generateSlug(filename) {
  if (filename.toLowerCase() === 'cyber security.md') return 'cyber-security';
  let base = filename.replace(/\.md$/i, '');
  base = base.replace(/^\d{2}[a-z]?[-_]/i, '');
  base = base.replace(/[-_]workflow$/i, '');
  let slug = base.toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || filename.replace(/\.md$/i, '').toLowerCase();
}

function extractTitle(content, filename) {
  const lines = content.split(/\r?\n/);
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
      let t = trimmed.replace(/^#+\s*/, '').trim();
      if (t && !t.toLowerCase().includes('daftar isi') && !t.toLowerCase().includes('table of contents')) {
        return t;
      }
    }
  }
  return filename
    .replace(/\.md$/i, '')
    .replace(/_/g, ' ')
    .replace(/^(\d{2}[a-z]?)\s*/i, '$1. ');
}

function extractExcerpt(content, maxLength = 350) {
  const clean = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*`_~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
}

function extractTags(content) {
  const lower = content.toLowerCase();
  const tags = new Set();
  for (const tool of SECURITY_TOOLS) {
    const regex = new RegExp(`\\b${tool}\\b`, 'i');
    if (regex.test(lower)) {
      tags.add(tool);
    }
  }
  return Array.from(tags).sort();
}

fs.mkdirSync(CONTENT_DOCS_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

console.log('🚀 Scanning markdown files from:', SOURCE_DIR);

const rawFiles = [];

for (const cat of CATEGORY_DEFINITIONS) {
  const categoryPath = path.join(SOURCE_DIR, cat.dir);
  if (!fs.existsSync(categoryPath)) {
    console.warn(`⚠️ Warning: Category directory not found: ${cat.dir}`);
    continue;
  }
  const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const filePath = path.join(categoryPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const id = extractId(file);
    const slug = generateSlug(file);
    const title = extractTitle(content, file);
    const tags = extractTags(content);

    rawFiles.push({
      id,
      slug,
      title,
      category: cat.label,
      categoryId: cat.id,
      categoryColor: cat.color,
      filename: file,
      filepath: path.join(cat.dir, file).replace(/\\/g, '/'),
      fullPath: filePath,
      content,
      rawContent: content,
      tags
    });
  }
}

const rootOverviewPath = path.join(SOURCE_DIR, 'Cyber Security.md');
if (fs.existsSync(rootOverviewPath)) {
  const content = fs.readFileSync(rootOverviewPath, 'utf8');
  rawFiles.push({
    id: '00',
    slug: 'cyber-security',
    title: 'Cyber Security Overview & Index',
    category: '1. Fondasi',
    categoryId: 'fondasi',
    categoryColor: '#10B981',
    filename: 'Cyber Security.md',
    filepath: 'Cyber Security.md',
    fullPath: rootOverviewPath,
    content,
    rawContent: content,
    tags: extractTags(content)
  });
}

console.log(`📁 Found ${rawFiles.length} markdown documentation files.`);

const idToFile = new Map();
const idToSlug = new Map();
const idToTitle = new Map();
for (const file of rawFiles) {
  idToFile.set(file.id, file);
  idToSlug.set(file.id, file.slug);
  idToTitle.set(file.id, file.title);
}

// Regex to capture cross references
const refRegex = /(\d{2}[a-z]?)[-_][a-zA-Z0-9_& -]+\.md/gi;

const pages = [];
const edgeSet = new Set();

for (const file of rawFiles) {
  const refs_out = new Set();
  let match;
  refRegex.lastIndex = 0;
  while ((match = refRegex.exec(file.content)) !== null) {
    const targetId = match[1].toLowerCase();
    if (idToFile.has(targetId) && targetId !== file.id) {
      refs_out.add(targetId);
    }
  }

  pages.push({
    id: file.id,
    slug: file.slug,
    title: file.title,
    category: file.category,
    categoryId: file.categoryId,
    categoryColor: file.categoryColor,
    content: extractExcerpt(file.content, 350),
    refs_out: Array.from(refs_out).sort(),
    refs_in: [],
    filepath: file.filepath,
    filename: file.filename,
    tags: file.tags
  });
}

// Compute refs_in (backlinks)
const pageMap = new Map(pages.map(p => [p.id, p]));

for (const page of pages) {
  for (const outId of page.refs_out) {
    const target = pageMap.get(outId);
    if (target && !target.refs_in.includes(page.id)) {
      target.refs_in.push(page.id);
    }
  }
}

for (const page of pages) {
  page.refs_in.sort();
}

// Build Cytoscape graph data
const graphNodes = pages.map(p => ({
  data: {
    id: p.id,
    label: p.id === '00' ? 'Overview' : `${p.id}. ${p.slug}`,
    title: p.title,
    category: p.categoryId,
    categoryLabel: p.category,
    color: p.categoryColor,
    slug: p.slug,
    refsInCount: p.refs_in.length,
    refsOutCount: p.refs_out.length,
    degree: p.refs_in.length + p.refs_out.length
  }
}));

const graphEdges = [];
for (const page of pages) {
  for (const outId of page.refs_out) {
    const edgeId = `${page.id}->${outId}`;
    if (!edgeSet.has(edgeId)) {
      edgeSet.add(edgeId);
      graphEdges.push({
        data: {
          id: edgeId,
          source: page.id,
          target: outId
        }
      });
    }
  }
}

const graphData = {
  nodes: graphNodes,
  edges: graphEdges
};

// Save JSON data files
fs.writeFileSync(path.join(DATA_DIR, 'pages.json'), JSON.stringify(pages, null, 2), 'utf8');
fs.writeFileSync(path.join(DATA_DIR, 'graph.json'), JSON.stringify(graphData, null, 2), 'utf8');

const categoriesData = CATEGORY_DEFINITIONS.map(cat => ({
  id: cat.id,
  label: cat.label,
  color: cat.color,
  files: cat.files.filter(f => idToFile.has(f.toLowerCase()))
}));
fs.writeFileSync(path.join(DATA_DIR, 'categories.json'), JSON.stringify(categoriesData, null, 2), 'utf8');

console.log(`✅ Saved ${pages.length} pages to pages.json`);
console.log(`✅ Saved graph (${graphNodes.length} nodes, ${graphEdges.length} edges) to graph.json`);
console.log(`✅ Saved ${categoriesData.length} categories to categories.json`);

// Cross-Reference Auto-Linker implementation
function resolveRefsInMarkdown(rawMarkdown) {
  let body = rawMarkdown;

  // 1. Existing Markdown links with .md target: [label](./XX_file.md) -> [label](/docs/slug)
  body = body.replace(
    /\[([^\]]+)\]\(\s*(?:\.\/|\.\.\/)?([a-zA-Z0-9_& %-]+\.md)(#[^\)]*)?\s*\)/gi,
    (fullMatch, linkText, targetFile, hash = '') => {
      const filenameOnly = path.basename(targetFile);
      const m = filenameOnly.match(/^(\d{2}[a-z]?)/i);
      if (m) {
        const targetId = m[1].toLowerCase();
        const targetSlug = idToSlug.get(targetId);
        const targetTitle = idToTitle.get(targetId);
        if (targetSlug) {
          const isFileLabel = linkText.endsWith('.md') || linkText.startsWith('./');
          const label = isFileLabel && targetTitle ? targetTitle : linkText;
          return `[${label}](/docs/${targetSlug}${hash})`;
        }
      }
      return fullMatch;
    }
  );

  // 2. ASCII cross-reference chart patterns:
  // e.g. ├──→ Port 22  (SSH)     → 06_ssh_workflow.md
  body = body.replace(
    /(├──?→?|└──?→?|│\s*├─|│\s*└─|[─→\-\s]+→)\s*([^\n\r]*?)\b(\d{2}[a-z]?_[a-zA-Z0-9_& -]+\.md)\b/gi,
    (fullMatch, prefix, contextText, matchedFilename) => {
      const m = matchedFilename.match(/^(\d{2}[a-z]?)/i);
      if (m) {
        const targetId = m[1].toLowerCase();
        const targetSlug = idToSlug.get(targetId);
        if (targetSlug) {
          return `${prefix} ${contextText}<a href="/docs/${targetSlug}" class="text-[#00b4d8] hover:underline font-mono font-semibold">${matchedFilename}</a>`;
        }
      }
      return fullMatch;
    }
  );

  // 3. Plain text mentions: XX_nama_file.md -> [Page Title](/docs/slug)
  const FILE_REF_PATTERN = /\b(\d{2}[a-z]?)_([a-zA-Z0-9_& -]+)\.md\b/gi;
  body = body.replace(FILE_REF_PATTERN, (match, num, name, offset, fullString) => {
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

    const targetId = num.toLowerCase();
    const targetSlug = idToSlug.get(targetId);
    const targetTitle = idToTitle.get(targetId);

    if (targetSlug && targetTitle) {
      return `[${targetTitle}](/docs/${targetSlug})`;
    }
    return match;
  });

  // 4. Clean up any markdown link that became wrapped in backticks (e.g. `[Title](/docs/slug)`)
  body = body.replace(/`(\[[^\]]+\]\(\/docs\/[^)]+\))`|\`(\[.+?\]\(.+?\))\`/g, (m, g1, g2) => g1 || g2);

  // 5. Sanitize dummy AWS keys to prevent GitHub Secret Scanning false-positive alerts
  body = body.replace(/ASIAQAAAAAAAZEXAMPLE/g, 'ASIA_EXAMPLE_TEMP_KEY');
  body = body.replace(/ASIAEXAMPLEACCESSKEY/g, 'ASIA_EXAMPLE_TEMP_KEY');
  body = body.replace(/ASIAIOSFODNN7EXAMPLE/g, 'ASIA_EXAMPLE_TEMP_KEY');
  body = body.replace(/AKIACREATEDKEYID1234/g, 'AKIA_EXAMPLE_CREATED_KEY');
  body = body.replace(/AKIAEXAMPLEHOTPOCKET/g, 'AKIAIOSFODNN7EXAMPLE');

  return body;
}

console.log('📋 Copying markdown files to src/content/docs/ with frontmatter & resolved cross-refs...');

for (const raw of rawFiles) {
  const meta = pageMap.get(raw.id);
  const targetDocPath = path.join(CONTENT_DOCS_DIR, `${raw.slug}.md`);

  let body = raw.rawContent;
  if (body.startsWith('---')) {
    const end = body.indexOf('---', 3);
    if (end !== -1) {
      body = body.substring(end + 3).trim();
    }
  }

  // Resolve all cross-references in the body
  body = resolveRefsInMarkdown(body);

  const frontmatter = [
    '---',
    `id: ${JSON.stringify(raw.id)}`,
    `title: ${JSON.stringify(raw.title)}`,
    `category: ${JSON.stringify(raw.category)}`,
    `categoryId: ${JSON.stringify(raw.categoryId)}`,
    `filename: ${JSON.stringify(raw.filename)}`,
    `refs_out: ${JSON.stringify(meta ? meta.refs_out : [])}`,
    `refs_in: ${JSON.stringify(meta ? meta.refs_in : [])}`,
    '---',
    ''
  ].join('\n');

  fs.writeFileSync(targetDocPath, frontmatter + '\n' + body, 'utf8');
}

console.log(`🎉 Successfully indexed, linked, and copied ${rawFiles.length} files to src/content/docs/!`);
