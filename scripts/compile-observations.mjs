import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../src/data');
const OBS_DIR = path.join(DATA_DIR, 'observations');
const TARGET_FILE = path.join(DATA_DIR, 'observations.json');

fs.mkdirSync(OBS_DIR, { recursive: true });

// Function to validate a node against the 12-point Quality Audit
export function validateObservationNode(node, filename) {
  const errors = [];
  const requiredFields = [
    'id', 'title', 'domain', 'category', 'phase', 'what_do_you_see',
    'context', 'why_it_matters', 'questions_to_ask', 'inspection_points',
    'interesting_signals', 'unexpected_signals', 'hypotheses', 'stop_conditions',
    'common_mistakes', 'ctf_notes', 'pentest_notes', 'unknown_guide',
    'negative_result_guide', 'coverage', 'relevant_workflows', 'related_observations', 'provenance'
  ];

  for (const field of requiredFields) {
    if (node[field] === undefined || node[field] === null) {
      errors.push(`Node "${node.id || 'UNKNOWN'}" missing required field: ${field}`);
    }
  }

  // Check inspection_points have evidence_to_capture
  if (Array.isArray(node.inspection_points)) {
    for (const pt of node.inspection_points) {
      if (!pt.evidence_to_capture || pt.evidence_to_capture.length === 0) {
        errors.push(`Node "${node.id}" inspection point "${pt.id}" missing evidence_to_capture`);
      }
    }
  }

  // Check interesting_signals have observation_confidence and evidence_to_capture
  if (Array.isArray(node.interesting_signals)) {
    for (const sig of node.interesting_signals) {
      if (!sig.observation_confidence) {
        errors.push(`Node "${node.id}" signal "${sig.id}" missing observation_confidence`);
      }
      if (!sig.evidence_to_capture || sig.evidence_to_capture.length === 0) {
        errors.push(`Node "${node.id}" signal "${sig.id}" missing evidence_to_capture`);
      }
    }
  }

  // Check coverage separation
  if (node.coverage) {
    if (!node.coverage.observation_coverage || !node.coverage.workflow_coverage) {
      errors.push(`Node "${node.id}" coverage must have both observation_coverage and workflow_coverage`);
    }
  }

  return errors;
}

export function compileAllObservations() {
  const files = fs.readdirSync(OBS_DIR).filter(f => f.endsWith('.json'));
  let allNodes = [];
  let allErrors = [];

  for (const file of files) {
    const filePath = path.join(OBS_DIR, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(content)) {
        for (const node of content) {
          const errs = validateObservationNode(node, file);
          allErrors.push(...errs);
          allNodes.push(node);
        }
      }
    } catch (err) {
      allErrors.push(`Failed to parse ${file}: ${err.message}`);
    }
  }

  // Check for duplicate IDs
  const idSet = new Set();
  for (const n of allNodes) {
    if (idSet.has(n.id)) {
      allErrors.push(`Duplicate observation ID found: ${n.id}`);
    }
    idSet.add(n.id);
  }

  if (allErrors.length > 0) {
    console.error('❌ Observation Validation Errors:');
    allErrors.forEach(e => console.error('  - ' + e));
    throw new Error(`Validation failed with ${allErrors.length} errors.`);
  }

  fs.writeFileSync(TARGET_FILE, JSON.stringify(allNodes, null, 2), 'utf8');
  console.log(`✅ Successfully compiled ${allNodes.length} observation nodes from ${files.length} categories to ${TARGET_FILE}`);
  return allNodes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  compileAllObservations();
}
