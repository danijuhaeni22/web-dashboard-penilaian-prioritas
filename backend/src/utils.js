import dayjsBase from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import tz from 'dayjs/plugin/timezone.js';
dayjsBase.extend(utc);
dayjsBase.extend(tz);
dayjsBase.tz.setDefault('Asia/Jakarta');

export const dayjs = dayjsBase;

export const nowISO = () => dayjs().toDate().toISOString();

export const clamp15 = (n) => {
  n = Number(n);
  if (Number.isNaN(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
};

export const parseTags = (str='') => String(str).split(',').map(s => s.trim()).filter(Boolean);

export const uid = () => 'T' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
