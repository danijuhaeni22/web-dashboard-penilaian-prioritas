import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from "chart.js";

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

const norm = (s) => {
  if (s === "Todo") return "Waiting";
  if (s === "Proses") return "On Progress";
  if (s === "Selesai") return "Done";
  return s || "Waiting";
};

const STATUSES = ["Waiting", "On Progress", "Continue", "Done"];

const COLORS = {
  Waiting: "#94a3b8",
  "On Progress": "#38bdf8",
  Continue: "#f59e0b",
  Done: "#10b981",
};

export default function ChartBlock({ dataItems = [], chartMode = "tag" }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

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
    [groups],
  );

  const [active, setActive] = useState("(Semua)");

  const chartData = useMemo(() => {
    const arr = active === "(Semua)" ? dataItems : groups.get(active) || [];

    const counts = {
      Waiting: 0,
      "On Progress": 0,
      Continue: 0,
      Done: 0,
    };

    for (const t of arr) {
      const key = norm(t.status);
      counts[key] = (counts[key] || 0) + 1;
    }

    const filtered = STATUSES.map((k) => ({
      label: k,
      value: counts[k],
    })).filter((d) => d.value > 0);

    return {
      labels: filtered.map((d) => d.label),
      data: filtered.map((d) => d.value),
    };
  }, [dataItems, groups, active]);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");

    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            data: chartData.data,
            backgroundColor: chartData.labels.map((l) => COLORS[l]),
            borderWidth: 2,
            borderColor: "#0f172a",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "55%",

        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#cbd5f5",
            },
          },

          tooltip: {
            callbacks: {
              label: function (ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const value = ctx.raw;
                const percent = total ? ((value / total) * 100).toFixed(1) : 0;
                return `${ctx.label}: ${value} (${percent}%)`;
              },
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [chartData]);

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

        <div className="text-xs text-slate-400">
          Mode:{" "}
          <span className="font-medium">
            {chartMode === "tag" ? "Tag" : "Product Owner"}
          </span>
        </div>
      </div>

      <div className="chart-container">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
