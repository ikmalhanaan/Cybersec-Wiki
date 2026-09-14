// src/utils/decision-tree.ts
// Fitur 2: Decision Tree Converter
// Deteksi blok ASCII decision tree dalam markdown dan konversi ke Mermaid flowchart syntax

function sanitizeLabel(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/[\[\]\(\)\{\}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Konversi teks pohon ASCII ke sintaks Mermaid flowchart TD
 */
export function convertAsciiTreeToMermaid(asciiTree: string): string {
  if (!asciiTree) return '';

  const lines = asciiTree.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return '';

  const firstLine = lines[0];
  const rootText = sanitizeLabel(firstLine.replace(/^START:\s*/i, '').trim());

  let mermaidCode = 'flowchart TD\n';
  mermaidCode += `  START["${rootText || 'START'}"]\n`;

  // Stack untuk melacak parent node berdasarkan depth indentasi
  const stack: { depth: number; id: string }[] = [{ depth: -1, id: 'START' }];
  let nodeCounter = 1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Lewati baris yang hanya berisi garis tegak atau spasi
    if (/^[│|\s]+$/.test(line)) continue;

    // Cari letak simbol percabangan pohon
    const branchMatch = line.match(/(├─|└─|\|--|\+--)/);
    if (!branchMatch || branchMatch.index === undefined) continue;

    const depth = branchMatch.index;
    const rawContent = line.substring(depth + branchMatch[0].length).trim();
    if (!rawContent) continue;

    const nodeId = `N${nodeCounter++}`;
    const label = sanitizeLabel(rawContent);

    // Pop stack sampai menemukan parent dengan depth lebih kecil
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    mermaidCode += `  ${parent.id} --> ${nodeId}["${label}"]\n`;

    stack.push({ depth, id: nodeId });
  }

  // Jika node terlalu sedikit, kembalikan string kosong
  if (nodeCounter <= 2) return '';

  return mermaidCode;
}

/**
 * Deteksi blok kode ```text yang mengandung ├─, └─, atau "START:"
 * Return array of { original block, converted mermaid }
 */
export function detectDecisionTrees(markdown: string): {
  original: string;
  mermaid: string;
}[] {
  if (!markdown) return [];

  const results: { original: string; mermaid: string }[] = [];
  const codeBlockRegex = /```(?:text|ascii|bash)?\r?\n([\s\S]*?)```/gi;

  let match;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const fullMatch = match[0];
    const codeContent = match[1];

    const isDecisionTree = 
      codeContent.includes('START:') || 
      ((codeContent.includes('├─') || codeContent.includes('└─')) && codeContent.split('\n').length > 3);

    if (isDecisionTree) {
      const mermaid = convertAsciiTreeToMermaid(codeContent);
      if (mermaid) {
        results.push({
          original: fullMatch,
          mermaid
        });
      }
    }
  }

  return results;
}

/**
 * Mengganti blok decision tree ASCII di markdown menjadi blok ```mermaid
 */
export function replaceDecisionTreesWithMermaid(markdown: string): string {
  const trees = detectDecisionTrees(markdown);
  let updated = markdown;

  for (const tree of trees) {
    const mermaidBlock = `\`\`\`mermaid\n${tree.mermaid}\`\`\``;
    updated = updated.replace(tree.original, mermaidBlock);
  }

  return updated;
}
