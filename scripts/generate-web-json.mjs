import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OBS_DIR = path.resolve(__dirname, '../src/data/observations');

// We combine the first set of web nodes with the remaining ones
const existingWeb = []; // Will be populated with all 19
