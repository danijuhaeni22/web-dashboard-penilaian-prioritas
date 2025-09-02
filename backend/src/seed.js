import { db } from './db.js';
import { uid, nowISO, parseTags } from './utils.js';
import { dayjs } from './utils.js';

export function seedIfEmpty() {
  if (db.data.tasks.length) return;
  const now = dayjs();
  const tasks = [
    {
      id: uid(), title: 'Perbaiki bug gagal bayar QRIS', desc: 'Bug menyebabkan retry 3x, dampak ke 20% transaksi.',
      impact: 5, urgency: 5, effort: 2, dueISO: now.add(1,'day').hour(17).minute(0).second(0).toDate().toISOString(),
      owner: 'Andi', tags: ['bug','payment','qris'], status: 'Proses', createdAtISO: nowISO(), updatedAtISO: nowISO(),
    },
    {
      id: uid(), title: 'Optimasi query laporan harian', desc: 'Kurangi waktu generate dari 40s menjadi <10s',
      impact: 4, urgency: 3, effort: 3, dueISO: now.add(3,'day').toDate().toISOString(),
      owner: 'Budi', tags: ['optimasi','db'], status: 'Todo', createdAtISO: nowISO(), updatedAtISO: nowISO(),
    },
    {
      id: uid(), title: 'Desain ulang halaman onboarding', desc: 'Tingkatkan konversi pendaftaran',
      impact: 3, urgency: 3, effort: 4, dueISO: now.add(7,'day').toDate().toISOString(),
      owner: 'Cici', tags: ['ui','ux'], status: 'Todo', createdAtISO: nowISO(), updatedAtISO: nowISO(),
    },
    {
      id: uid(), title: 'Audit keamanan dependensi', desc: 'Perbarui paket rentan CVE-2025-XXXX',
      impact: 4, urgency: 4, effort: 2, dueISO: now.subtract(1,'day').toDate().toISOString(),
      owner: 'Deni', tags: ['security','deps'], status: 'Proses', createdAtISO: nowISO(), updatedAtISO: nowISO(),
    },
    {
      id: uid(), title: 'Dokumentasi API internal', desc: 'Tambahkan contoh request/response',
      impact: 2, urgency: 2, effort: 2, dueISO: null,
      owner: 'Eva', tags: ['docs','api'], status: 'Todo', createdAtISO: nowISO(), updatedAtISO: nowISO(),
    },
  ];
  db.data.tasks = tasks;
  db.save();
}
