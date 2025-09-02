import React from "react";

export default function PriorityBadge({ label, score }) {
  const cls =
    label === "Tinggi"
      ? "badge badge-red"
      : label === "Sedang"
      ? "badge badge-amber"
      : "badge badge-green";
  return (
    <span className={cls}>
      {score?.toFixed?.(2)} • {label}
    </span>
  );
}
