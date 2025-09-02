import React, { useMemo, useState } from "react";

// Normalisasi status lama -> baru (+ Continue tetap)
const norm = (s) => {
  if (s === "Todo") return "Waiting";
  if (s === "Proses") return "On Progress";
  if (s === "Selesai") return "Done";
  return s || "Waiting";
};

const STATUSES = ["Waiting", "On Progress", "Continue", "Done"];
const COLORS = {
  Waiting: "#94a3b8", // slate-400
  "On Progress": "#38bdf8", // sky-400
  Continue: "#f59e0b", // amber-500
  Done: "#10b981", // emerald-500
};

function polarToCartesian(cx, cy, r, angle) {
  const rad = ((angle - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`;
}

export default function ChartBlock({ dataItems = [], chartMode = "tag" }) {
  // Grouping by tag/owner
  const groups = useMemo(() => {
    const map = new Map();
    if (chartMode === "tag") {
      for (const t of dataItems) {
        const tags = Array.isArray(t.tags)
          ? t.tags.filter(Boolean)
          : t.tags
          ? String(t.tags)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        if (tags.length === 0) {
          const arr = map.get("(Tanpa Tag)") || [];
          arr.push(t);
          map.set("(Tanpa Tag)", arr);
        } else {
          for (const g of tags) {
            const arr = map.get(g) || [];
            arr.push(t);
            map.set(g, arr);
          }
        }
      }
    } else {
      for (const t of dataItems) {
        const key = t.owner?.trim() || "(Tanpa Owner)";
        const arr = map.get(key) || [];
        arr.push(t);
        map.set(key, arr);
      }
    }
    return map;
  }, [dataItems, chartMode]);

  const options = useMemo(
    () => ["(Semua)", ...Array.from(groups.keys()).sort()],
    [groups]
  );
  const [active, setActive] = useState("(Semua)");

  const sliceData = useMemo(() => {
    const arr = active === "(Semua)" ? dataItems : groups.get(active) || [];
    const counts = { Waiting: 0, "On Progress": 0, Continue: 0, Done: 0 };
    for (const t of arr)
      counts[norm(t.status)] = (counts[norm(t.status)] || 0) + 1;

    const total = STATUSES.reduce((s, k) => s + counts[k], 0);
    const pieces = STATUSES.map((k) => ({
      key: k,
      value: counts[k],
      percent: total ? Math.round((counts[k] / total) * 1000) / 10 : 0,
      color: COLORS[k],
    }));
    return { pieces, total };
  }, [dataItems, groups, active]);

  // --- Pie geometry + smart labels (hindari overlap) ---
  const size = 260;
  const r = 95;
  const cx = size / 2;
  const cy = size / 2;

  let angle = 0;
  const arcs = sliceData.pieces.map((p) => {
    const deg =
      p.value === 0 || sliceData.total === 0
        ? 0
        : (p.value / sliceData.total) * 360;
    const start = angle;
    const end = angle + deg;
    angle = end;

    const mid = start + deg / 2;
    const inside = deg >= 18; // >= ~5% => label di dalam
    const posInside = polarToCartesian(cx, cy, r * 0.62, mid);

    // untuk irisan kecil: label di luar + leader line
    const elbow1 = polarToCartesian(cx, cy, r * 0.88, mid);
    const elbow2 = polarToCartesian(cx, cy, r + 12, mid);
    const alignLeft = Math.cos(((mid - 90) * Math.PI) / 180) >= 0;
    const labelX = elbow2.x + (alignLeft ? 12 : -12);
    const labelY = elbow2.y;

    return {
      ...p,
      start,
      end,
      deg,
      inside,
      path: describeArc(cx, cy, r, start, end),
      posInside,
      elbow1,
      elbow2,
      labelX,
      labelY,
      alignLeft,
      show: deg > 0,
    };
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <select
          className="select"
          value={active}
          onChange={(e) => setActive(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="text-xs text-slate-500">
          Mode:{" "}
          <span className="font-medium">
            {chartMode === "tag" ? "Tag" : "Product Owner"}
          </span>
        </div>
      </div>

      {sliceData.total === 0 ? (
        <div className="text-sm text-slate-500">
          Tidak ada data untuk ditampilkan.
        </div>
      ) : (
        // Grid 2 kolom di layar lebar agar TIDAK overlap.
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {/* Chart box diberi lebar tetap + center, supaya label di luar tetap muat */}
          <div className="w-full max-w-[340px] mx-auto lg:mx-0">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="block overflow-visible"
            >
              <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" />
              {arcs.map((a) =>
                a.show ? (
                  <path
                    key={a.key}
                    d={a.path}
                    fill={a.color}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                ) : null
              )}

              {/* Labels pada slice (persentase), tidak ada total */}
              {arcs.map((a) =>
                a.show ? (
                  <g key={`${a.key}-label`}>
                    {!a.inside && (
                      <polyline
                        points={`${a.elbow1.x},${a.elbow1.y} ${a.elbow2.x},${
                          a.elbow2.y
                        } ${a.labelX + (a.alignLeft ? -6 : 6)},${a.labelY}`}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="1"
                      />
                    )}
                    <text
                      x={a.inside ? a.posInside.x : a.labelX}
                      y={a.inside ? a.posInside.y : a.labelY}
                      textAnchor={
                        a.inside ? "middle" : a.alignLeft ? "start" : "end"
                      }
                      dominantBaseline="middle"
                      fontSize="12"
                      fontWeight="700"
                      fill="#0f172a"
                    >
                      {a.percent}%
                    </text>
                  </g>
                ) : null
              )}
            </svg>
          </div>

          {/* Legend TANPA angka & persentase */}
          <div className="space-y-3 lg:justify-self-start">
            {sliceData.pieces.map((p) => (
              <div key={p.key} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block w-3 h-3 rounded"
                  style={{ background: p.color }}
                />
                <span>{p.key}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
