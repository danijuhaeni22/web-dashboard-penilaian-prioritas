# Prioritas Dashboard — Fullstack (React + Node/Express)

Struktur dipisah menjadi frontend (React + Vite) dan backend (Node.js + Express).

## Cara jalanin (dev)
Terminal 1 — Backend:
```bash
cd backend
npm install
npm run dev
```
Backend di: http://localhost:3000

Terminal 2 — Frontend:
```bash
cd frontend
npm install
npm run dev
```
Frontend di: http://localhost:5173 (proxy `/api` ke backend 3000)

## Fitur
- Frontend React fokus UI (tambah/ubah/hapus tugas via modal, sortir klik header, filter cepat, filter status, ringkasan, badge kuantil, overdue, pengaturan bobot live).
- Backend Express menangani logika & data:
  - Hitung skor ICE berbobot & label prioritas (Tinggi/Sedang/Rendah) berbasis kuantil.
  - Filter, sortir, ringkasan.
  - Simpan data di file JSON sederhana (folder `backend/data`).

## Endpoints singkat
- `GET /api/health`
- `GET /api/tasks?q=&status=&sortKey=&sortDir=` → `{ items, thresholds, weights, summary }`
- `POST /api/tasks` → buat tugas
- `PUT /api/tasks/:id` → ubah tugas
- `PATCH /api/tasks/:id/done` → tandai selesai
- `DELETE /api/tasks/:id` → hapus
- `GET /api/settings` / `PUT /api/settings` → bobot (impact, urgency, effort)

## Catatan
- Zona waktu **Asia/Jakarta** (WIB) untuk penampilan dan validasi overdue.
- Seed otomatis: pertama jalankan backend → frontend menampilkan 0 tugas; kamu bisa menambahkan via UI. Jika ingin seeding awal 5 tugas, mudah menambahkan util seed di backend (bisa kumasukkan bila diperlukan).
