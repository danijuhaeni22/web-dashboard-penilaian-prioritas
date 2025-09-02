import React, { useState } from "react";
import { X, CalendarClock } from "lucide-react";
import dayjs from "../lib/dayjs";

export default function DateTimePicker({ initialISO, onApply, onClose }) {
  const init = initialISO
    ? dayjs(initialISO).tz("Asia/Jakarta")
    : dayjs().tz("Asia/Jakarta").add(1, "hour");
  const [dateStr, setDateStr] = useState(init.format("YYYY-MM-DD"));
  const [timeStr, setTimeStr] = useState(init.format("HH:mm"));

  const apply = () => {
    const combined = dayjs.tz(`${dateStr}T${timeStr}`, "Asia/Jakarta");
    onApply(combined.toDate().toISOString());
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h4 className="font-extrabold text-lg flex items-center gap-2">
            <CalendarClock className="w-5 h-5" /> Pilih Tanggal & Jam
          </h4>
          <button className="btn btn-ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              Tanggal
              <input
                type="date"
                className="input mt-1 bg-white text-slate-900 ring-2 ring-sky-600 focus:ring-sky-700 focus:border-sky-700 accent-sky-600"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Jam
              <input
                type="time"
                className="input mt-1 bg-white text-slate-900 ring-2 ring-sky-600 focus:ring-sky-700 focus:border-sky-700 accent-sky-600"
                step="60"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button className="btn" onClick={onClose}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={apply}>
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
