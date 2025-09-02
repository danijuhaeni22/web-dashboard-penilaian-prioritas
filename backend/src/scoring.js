import { clamp15 } from './utils.js';

export function computePriority(task, weights) {
  const wi = Number(weights.impact) || 1;
  const wu = Number(weights.urgency) || 1;
  const we = Number(weights.effort) || 1;
  const impact = clamp15(task.impact);
  const urgency = clamp15(task.urgency);
  const effortRaw = clamp15(task.effort);
  const denom = Math.max(effortRaw * we, 1);
  const score = (wi*impact + wu*urgency) / denom;
  return Math.round(score * 100) / 100;
}

export function thresholdsFromScores(scores) {
  if (!scores.length) return { q33: 0, q66: 0 };
  const sorted = scores.slice().sort((a,b)=>a-b);
  const q = (p) => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const h = idx - lo;
    return sorted[lo] * (1 - h) + sorted[hi] * h;
  };
  return { q33: q(1/3), q66: q(2/3) };
}

export function labelForScore(score, thresholds) {
  const { q33, q66 } = thresholds;
  if (score >= q66) return 'Tinggi';
  if (score >= q33) return 'Sedang';
  return 'Rendah';
}
