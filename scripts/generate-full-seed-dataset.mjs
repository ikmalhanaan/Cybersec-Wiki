import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../src/data');
const OBS_DIR = path.join(DATA_DIR, 'observations');
const TARGET_FILE = path.join(DATA_DIR, 'observations.json');

fs.mkdirSync(OBS_DIR, { recursive: true });

// We write out each modular file.
// Let's create modular generator functions for clarity.
