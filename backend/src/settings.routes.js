import { Router } from 'express';
import { db } from './db.js';

const router = Router();

router.get('/', (_req, res) => {
  const weights = db.data.settings.weights || { impact:1, urgency:1, effort:1 };
  res.json({ weights });
});

router.put('/', (req, res) => {
  const w = req.body?.weights || {};
  const next = {
    impact: Number(w.impact) || 1,
    urgency: Number(w.urgency) || 1,
    effort: Number(w.effort) || 1,
  };
  db.data.settings.weights = next;
  db.save();
  res.json({ weights: next });
});

export default router;
