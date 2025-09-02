import { Router } from "express";
import { db } from "./db.js";
import { nowISO, clamp15, parseTags, uid } from "./utils.js"; // ⬅️ sudah include uid
import { dayjs } from "./utils.js";
import {
  computePriority,
  thresholdsFromScores,
  labelForScore,
} from "./scoring.js";

const router = Router();
const ALLOWED_STATUS = new Set(["Todo", "Proses", "Selesai"]);

function isOverdue(t) {
  if (!t.dueISO || t.status === "Selesai") return false;
  return dayjs(t.dueISO).isBefore(dayjs());
}

// ⬇️ Ditambah dukungan attachments (array meta file dari /api/files)
function sanitizeTaskInput(body) {
  const t = {};
  t.title = String(body.title || "").trim();
  t.desc = String(body.desc || "").trim();
  t.impact = clamp15(body.impact ?? 3);
  t.urgency = clamp15(body.urgency ?? 3);
  t.effort = clamp15(body.effort ?? 2);
  t.dueISO = body.dueISO || null;
  t.owner = String(body.owner || "").trim();
  t.tags = Array.isArray(body.tags)
    ? body.tags.filter(Boolean)
    : parseTags(body.tags || "");
  t.status = ALLOWED_STATUS.has(body.status) ? body.status : "Todo";
  // 🆕 attachments: selalu array
  t.attachments = Array.isArray(body.attachments) ? body.attachments : [];
  return t;
}

router.get("/", (req, res) => {
  const {
    q = "",
    status = "ALL",
    sortKey = "score",
    sortDir = "desc",
  } = req.query;
  const weights = db.data.settings.weights || {
    impact: 1,
    urgency: 1,
    effort: 1,
  };

  // Filter
  let tasks = db.data.tasks.slice();
  if (status !== "ALL") tasks = tasks.filter((t) => t.status === status);
  const qTokens = String(q).toLowerCase().split(/\s+/).filter(Boolean);
  if (qTokens.length) {
    tasks = tasks.filter((t) => {
      const hay = [t.title, t.owner || "", ...(t.tags || [])]
        .join(" ")
        .toLowerCase();
      return qTokens.every((tok) => hay.includes(tok));
    });
  }

  // Compute scores/labels
  const allScores = db.data.tasks.map((t) => computePriority(t, weights));
  const thresholds = thresholdsFromScores(allScores);

  const items = tasks.map((t) => {
    const score = computePriority(t, weights);
    return {
      ...t,
      // 🆕 pastikan selalu ada array attachments agar frontend bisa menampilkan tombol Download
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
      score,
      priorityLabel: labelForScore(score, thresholds),
      isOverdue: isOverdue(t),
    };
  });

  // Sort
  const factor = sortDir === "asc" ? 1 : -1;
  items.sort((a, b) => {
    let va, vb;
    switch (sortKey) {
      case "title":
        va = a.title.toLowerCase();
        vb = b.title.toLowerCase();
        break;
      case "impact":
        va = a.impact;
        vb = b.impact;
        break;
      case "urgency":
        va = a.urgency;
        vb = b.urgency;
        break;
      case "effort":
        va = a.effort;
        vb = b.effort;
        break;
      case "score":
        va = a.score;
        vb = b.score;
        break;
      case "status": {
        const order = { Todo: 0, Proses: 1, Selesai: 2 };
        va = order[a.status] ?? 9;
        vb = order[b.status] ?? 9;
        break;
      }
      case "due": {
        va = a.dueISO ? dayjs(a.dueISO).valueOf() : Infinity;
        vb = b.dueISO ? dayjs(b.dueISO).valueOf() : Infinity;
        break;
      }
      default:
        va = 0;
        vb = 0;
    }
    if (va < vb) return -1 * factor;
    if (va > vb) return 1 * factor;
    return 0;
  });

  // Summary
  const total = db.data.tasks.length;
  const todo = db.data.tasks.filter((t) => t.status === "Todo").length;
  const progress = db.data.tasks.filter((t) => t.status === "Proses").length;
  const done = db.data.tasks.filter((t) => t.status === "Selesai").length;
  const overdue = db.data.tasks.filter(isOverdue).length;
  const avg = total
    ? Math.round(
        (db.data.tasks.reduce((s, t) => s + computePriority(t, weights), 0) /
          total) *
          100
      ) / 100
    : 0;

  res.json({
    items,
    thresholds,
    weights,
    summary: { total, todo, progress, done, overdue, avg },
  });
});

router.post("/", (req, res) => {
  const t = sanitizeTaskInput(req.body || {});
  if (!t.title) return res.status(400).json({ error: "Judul wajib" });

  const id = uid();
  const now = nowISO();
  const task = {
    id,
    ...t,
    // 🆕 simpan attachments ke DB
    attachments: Array.isArray(t.attachments) ? t.attachments : [],
    createdAtISO: now,
    updatedAtISO: now,
  };
  db.data.tasks.push(task);
  db.save();
  res.status(201).json(task);
});

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const idx = db.data.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });

  const prev = db.data.tasks[idx];

  // ⬇️ kita butuh tahu apakah client mengirim field attachments atau tidak
  const incoming = req.body || {};
  const hasAttachments = Object.prototype.hasOwnProperty.call(
    incoming,
    "attachments"
  );

  const t = sanitizeTaskInput(incoming);

  // Base merge
  const updated = {
    ...prev,
    ...t,
    updatedAtISO: nowISO(),
  };

  // 🆕 Jika client TIDAK mengirim attachments, pertahankan yang lama
  updated.attachments = hasAttachments
    ? Array.isArray(t.attachments)
      ? t.attachments
      : []
    : Array.isArray(prev.attachments)
    ? prev.attachments
    : [];

  db.data.tasks[idx] = updated;
  db.save();
  res.json(updated);
});

router.patch("/:id/done", (req, res) => {
  const id = req.params.id;
  const t = db.data.tasks.find((x) => x.id === id);
  if (!t) return res.status(404).json({ error: "Not found" });
  t.status = "Selesai";
  t.updatedAtISO = nowISO();
  db.save();
  res.json(t);
});

router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const before = db.data.tasks.length;
  db.data.tasks = db.data.tasks.filter((t) => t.id !== id);
  if (db.data.tasks.length === before)
    return res.status(404).json({ error: "Not found" });
  db.save();
  res.status(204).send();
});

export default router;
