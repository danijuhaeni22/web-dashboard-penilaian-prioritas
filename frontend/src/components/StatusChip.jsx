import React from "react";

export default function StatusChip({ status }) {
  const map = {
    Todo: "bg-slate-100 text-slate-700",
    Proses: "bg-sky-100 text-sky-700",
    Selesai: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        map[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}
