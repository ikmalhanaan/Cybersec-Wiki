import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OBS_DIR = path.resolve(__dirname, '../src/data/observations');

// We will write src/data/observations/web.json directly.
console.log("Starting web nodes assembly...");
