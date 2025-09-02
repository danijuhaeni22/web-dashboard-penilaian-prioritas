import path from 'node:path';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import tasksRouter from './tasks.routes.js';
import settingsRouter from './settings.routes.js';
import filesRouter from "./files.routes.js";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(compression());
app.use(cors());
app.use(express.json());

// Health
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/tasks', tasksRouter);
app.use('/api/settings', settingsRouter);
app.use("/api/files", filesRouter);

// 404 for unknown api
app.use('/api/*', (req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});
