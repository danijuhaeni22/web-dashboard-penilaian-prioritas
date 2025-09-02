import path from "node:path";
import fs from "node:fs/promises";
import express from "express";
import multer from "multer";

const router = express.Router();

// Simpan file di: <project>/data/uploads
const DATA_DIR = path.resolve(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const INDEX_FILE = path.join(DATA_DIR, "uploads_index.json");

async function ensureDirs() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  try {
    await fs.access(INDEX_FILE);
  } catch {
    await fs.writeFile(INDEX_FILE, "[]", "utf8");
  }
}
function safeBase(name = "") {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "_");
}
async function readIndex() {
  await ensureDirs();
  try {
    return JSON.parse((await fs.readFile(INDEX_FILE, "utf8")) || "[]");
  } catch {
    return [];
  }
}
async function writeIndex(arr) {
  await ensureDirs();
  await fs.writeFile(INDEX_FILE, JSON.stringify(arr, null, 2), "utf8");
}

// Storage Multer (PDF & tipe lain diperbolehkan), limit 50MB
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensureDirs();
    } catch {}
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = safeBase(path.basename(file.originalname, ext));
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// GET /api/files -> list
router.get("/", async (_req, res) => {
  const idx = await readIndex();
  const out = [];
  for (const it of idx) {
    const p = path.join(UPLOAD_DIR, it.id);
    try {
      const st = await fs.stat(p);
      out.push({ ...it, size: st.size });
    } catch {
      /* skip file yang hilang */
    }
  }
  out.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
  res.json(out);
});

// POST /api/files (field: file)
router.post("/", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({ error: "File terlalu besar (maks 50MB)." });
      }
      return res.status(400).json({ error: err.message || "Upload gagal." });
    }
    if (!req.file) return res.status(400).json({ error: "file is required" });
    try {
      const meta = {
        id: req.file.filename,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
      };
      const idx = await readIndex();
      idx.unshift(meta);
      await writeIndex(idx);
      res.json(meta);
    } catch (e) {
      res.status(500).json({ error: e.message || "Gagal menyimpan metadata." });
    }
  });
});

// GET /api/files/:id -> download
router.get("/:id", async (req, res) => {
  const id = safeBase(req.params.id);
  const filePath = path.join(UPLOAD_DIR, id);
  try {
    const idx = await readIndex();
    const meta = idx.find((x) => x.id === id);
    await fs.access(filePath);
    res.download(filePath, meta?.name || id);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

// DELETE /api/files/:id (opsional)
router.delete("/:id", async (req, res) => {
  const id = safeBase(req.params.id);
  const filePath = path.join(UPLOAD_DIR, id);
  try {
    const idx = await readIndex();
    const next = idx.filter((x) => x.id !== id);
    await writeIndex(next);
    await fs.unlink(filePath).catch(() => {});
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
