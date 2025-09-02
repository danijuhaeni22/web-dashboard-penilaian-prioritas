import React from "react";

export default function StatusChip({ status }) {
  const s = status || "";
  let cls = "bg-slate-100 text-slate-700 border border-slate-200";
  let label = s;

  if (s === "Waiting") {
    cls = "bg-slate-100 text-slate-700 border border-slate-200";
    label = "Waiting";
  } else if (s === "On Progress") {
    cls = "bg-sky-100 text-sky-700 border border-sky-200";
    label = "On Progress";
  } else if (s === "Continue") {
    cls = "bg-amber-100 text-amber-700 border border-amber-200";
    label = "Continue";
  } else if (s === "Done") {
    cls = "bg-emerald-100 text-emerald-700 border border-emerald-200";
    label = "Done";
  }

  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
