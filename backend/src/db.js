import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      return JSON.parse(raw);
    }
  } catch(e) {}
  return fallback;
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

export const db = {
  data: {
    tasks: readJson(TASKS_FILE, []),
    settings: readJson(SETTINGS_FILE, { weights: { impact:1, urgency:1, effort:1 } })
  },
  save() {
    writeJson(TASKS_FILE, this.data.tasks);
    writeJson(SETTINGS_FILE, this.data.settings);
  }
};
