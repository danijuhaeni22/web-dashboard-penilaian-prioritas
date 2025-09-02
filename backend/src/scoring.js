// Perhitungan skor prioritas baru:
// PRIORITAS = ((Regulasi + Bisnis + Resiko + Efisiensi) / 4)
// Dibulatkan ke 2 desimal

import { clamp15 } from "./utils.js";

/**
 * Komputasi prioritas berdasarkan 4 faktor (1-5).
 * Tetap menerima `weights` agar kompatibel dengan pemanggil lama,
 * namun diabaikan (rumus ini tanpa bobot).
 */
export function computePriority(task /*, weights */) {
  // Fallback untuk data lama:
  // - regulasi -> fallback ke impact
  // - bisnis   -> fallback ke urgency
  // - resiko   -> default 3 (jika tak ada)
  // - efisiensi-> fallback ke effort
  const r = clamp15(task.regulasi ?? task.impact ?? 3);
  const b = clamp15(task.bisnis ?? task.urgency ?? 3);
  const rs = clamp15(task.resiko ?? 3);
  const ef = clamp15(task.efisiensi ?? task.effort ?? 3);

  const avg = (r + b + rs + ef) / 4;
  return Math.round(avg * 100) / 100;
}

/**
 * Hitung threshold kuantil sederhana dari array skor (untuk badge).
 */
export function thresholdsFromScores(scores = []) {
  const s = [...scores].sort((a, b) => a - b);
  if (s.length === 0) return { q33: 0, q66: 0 };
  const pick = (p) =>
    s[Math.min(s.length - 1, Math.max(0, Math.floor((s.length - 1) * p)))];
  return { q33: pick(0.33), q66: pick(0.66) };
}

/**
 * Label berdasarkan threshold (Tinggi / Sedang / Rendah).
 */
export function labelForScore(score, { q33, q66 }) {
  if (score >= q66) return "Tinggi";
  if (score >= q33) return "Sedang";
  return "Rendah";
}
