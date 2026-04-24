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
      className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl text-slate-200">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <h4 className="font-semibold text-lg flex items-center gap-2 text-slate-100">
            <CalendarClock className="w-5 h-5 text-sky-400" />
            Pilih Tanggal & Jam
          </h4>

          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            {/* DATE */}
            <label className="text-sm text-slate-300">
              Tanggal
              <input
                type="date"
                className="input mt-1 bg-slate-800 border-slate-600 text-slate-200 focus:border-sky-500 focus:ring-sky-500"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </label>

            {/* TIME */}
            <label className="text-sm text-slate-300">
              Jam
              <input
                type="time"
                className="input mt-1 bg-slate-800 border-slate-600 text-slate-200 focus:border-sky-500 focus:ring-sky-500"
                step="60"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
              />
            </label>
          </div>

          {/* ACTION */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
              onClick={onClose}
            >
              Batal
            </button>

            <button
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-sky-600 text-white hover:bg-sky-700 transition"
              onClick={apply}
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
