import { Router } from "express";
import { db } from "./db.js";
import { nowISO, clamp15, parseTags, uid } from "./utils.js";
import { dayjs } from "./utils.js";
import {
  computePriority,
  thresholdsFromScores,
  labelForScore,
} from "./scoring.js";

const router = Router();

// ===== Status baru + normalisasi dari status lama =====
const STATUS_MAP = {
  // lama -> baru
  Todo: "Waiting",
  Proses: "On Progress",
  Selesai: "Done",
  // baru -> baru
  Waiting: "Waiting",
  "On Progress": "On Progress",
  Continue: "Continue",
  Done: "Done",
};
const normalizeStatus = (s) => STATUS_MAP[s] || "Waiting";
const ALLOWED_STATUS = new Set(["Waiting", "On Progress", "Continue", "Done"]);

const ALLOWED_QUARTAL = new Set(["Q1", "Q2", "Q3", "Q4"]);

function isOverdue(t) {
  if (!t.dueISO || normalizeStatus(t.status) === "Done") return false;
  return dayjs(t.dueISO).isBefore(dayjs());
}

// === Input: regulasi, bisnis, resiko, efisiensi + quartal + status baru
function sanitizeTaskInput(body) {
  const t = {};
  t.title = String(body.title || "").trim();
  t.desc = String(body.desc || "").trim();

  t.regulasi = clamp15(body.regulasi ?? body.impact ?? 3);
  t.bisnis = clamp15(body.bisnis ?? body.urgency ?? 3);
  t.resiko = clamp15(body.resiko ?? 3);
  t.efisiensi = clamp15(body.efisiensi ?? body.effort ?? 3);

  t.dueISO = body.dueISO || null;
  t.owner = String(body.owner || "").trim(); // Product Owner
  t.picDev = String(body.picDev || "").trim(); // PIC Dev
  t.picSA = String(body.picSA || "").trim(); // PIC SA
  t.quartal = ALLOWED_QUARTAL.has(body.quartal) ? body.quartal : "";

  t.tags = Array.isArray(body.tags)
    ? body.tags.filter(Boolean)
    : parseTags(body.tags || "");

  const ns = normalizeStatus(body.status);
  t.status = ALLOWED_STATUS.has(ns) ? ns : "Waiting";

  t.attachments = Array.isArray(body.attachments) ? body.attachments : [];
  return t;
}

router.get("/", (req, res) => {
  try {
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

    if (status !== "ALL") {
      const want = normalizeStatus(status);
      tasks = tasks.filter((t) => normalizeStatus(t.status) === want);
    }

    const qTokens = String(q).toLowerCase().split(/\s+/).filter(Boolean);

    if (qTokens.length) {
      tasks = tasks.filter((t) => {
        const hay = [
          t.title || "",
          t.owner || "",
          ...(Array.isArray(t.tags) ? t.tags : []),
        ]
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
        status: normalizeStatus(t.status),
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
          va = (a.title || "").toLowerCase();
          vb = (b.title || "").toLowerCase();
          break;

        case "regulasi":
          va = a.regulasi ?? 0;
          vb = b.regulasi ?? 0;
          break;

        case "bisnis":
          va = a.bisnis ?? 0;
          vb = b.bisnis ?? 0;
          break;

        case "resiko":
          va = a.resiko ?? 0;
          vb = b.resiko ?? 0;
          break;

        case "efisiensi":
          va = a.efisiensi ?? 0;
          vb = b.efisiensi ?? 0;
          break;

        case "quartal": {
          const orderQ = { "": 0, Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
          va = orderQ[a.quartal || ""] ?? 0;
          vb = orderQ[b.quartal || ""] ?? 0;
          break;
        }

        case "score":
          va = a.score ?? 0;
          vb = b.score ?? 0;
          break;

        case "status": {
          const order = {
            Waiting: 0,
            "On Progress": 1,
            Continue: 2,
            Done: 3,
          };
          va = order[a.status] ?? 9;
          vb = order[b.status] ?? 9;
          break;
        }

        case "due":
          va = a.dueISO ? dayjs(a.dueISO).valueOf() : Infinity;
          vb = b.dueISO ? dayjs(b.dueISO).valueOf() : Infinity;
          break;

        default:
          va = 0;
          vb = 0;
      }

      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return 0;
    });

    // Summary
    const waiting = db.data.tasks.filter(
      (t) => normalizeStatus(t.status) === "Waiting",
    ).length;

    const progress = db.data.tasks.filter(
      (t) => normalizeStatus(t.status) === "On Progress",
    ).length;

    const done = db.data.tasks.filter(
      (t) => normalizeStatus(t.status) === "Done",
    ).length;

    const total = db.data.tasks.length;

    const overdue = db.data.tasks.filter(isOverdue).length;

    const avg = total
      ? Math.round(
          (db.data.tasks.reduce((s, t) => s + computePriority(t, weights), 0) /
            total) *
            100,
        ) / 100
      : 0;

    res.json({
      items,
      thresholds,
      weights,
      summary: {
        total,
        todo: waiting,
        progress,
        done,
        overdue,
        avg,
      },
    });
  } catch (err) {
    console.error("ERROR GET /api/tasks:", err);

    res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
});

router.post("/", (req, res) => {
  const t = sanitizeTaskInput(req.body || {});
  if (!t.title) return res.status(400).json({ error: "Judul wajib" });
  if (!t.dueISO) return res.status(400).json({ error: "dueISO wajib" });
  if (!t.owner) return res.status(400).json({ error: "Product Owner wajib" });
  if (!t.status) return res.status(400).json({ error: "status wajib" });

  const id = uid();
  const now = nowISO();
  const task = { id, ...t, createdAtISO: now, updatedAtISO: now };
  db.data.tasks.push(task);
  db.save();
  res.status(201).json(task);
});

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const idx = db.data.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });

  const prev = db.data.tasks[idx];
  const incoming = req.body || {};
  const hasAttachments = Object.prototype.hasOwnProperty.call(
    incoming,
    "attachments",
  );

  const t = sanitizeTaskInput(incoming);
  const updated = { ...prev, ...t, updatedAtISO: nowISO() };

  // Pertahankan lampiran lama jika tidak dikirim
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
  t.status = "Done";
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
