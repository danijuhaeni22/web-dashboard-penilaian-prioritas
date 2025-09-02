import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { STATUS_ORDER, STATUS_COLORS } from "../constants";

export default function ChartBlock({ dataItems, chartMode }) {
  const [catFilter, setCatFilter] = useState("");
  const [selectedKey, setSelectedKey] = useState("");

  const chartCategories = useMemo(() => {
    if (chartMode === "owner") {
      return Array.from(
        new Set(dataItems.map((t) => (t.owner || "").trim()).filter(Boolean))
      ).sort();
    }
    const collect = [];
    for (const t of dataItems) {
      let arr = [];
      if (Array.isArray(t.tags)) arr = t.tags;
      else if (t.tags)
        arr = String(t.tags)
          .split(",")
          .map((s) => s.trim());
      arr.filter(Boolean).forEach((s) => collect.push(s));
    }
    return Array.from(new Set(collect)).sort();
  }, [dataItems, chartMode]);

  const filteredCategories = useMemo(() => {
    const q = catFilter.trim().toLowerCase();
    return q
      ? chartCategories.filter((k) => k.toLowerCase().includes(q))
      : chartCategories;
  }, [chartCategories, catFilter]);

  useEffect(() => {
    if (!chartCategories.includes(selectedKey)) {
      setSelectedKey(chartCategories[0] || "");
    }
  }, [chartCategories]); // eslint-disable-line

  useEffect(() => {
    if (selectedKey && filteredCategories.includes(selectedKey)) return;
    if (filteredCategories.length) setSelectedKey(filteredCategories[0]);
    else setSelectedKey("");
  }, [filteredCategories, selectedKey]);

  const pieData = useMemo(() => {
    if (!selectedKey) return [];
    let rows = [];
    if (chartMode === "owner") {
      rows = dataItems.filter((t) => (t.owner || "").trim() === selectedKey);
    } else {
      rows = dataItems.filter((t) => {
        let tags = [];
        if (Array.isArray(t.tags)) tags = t.tags;
        else if (t.tags)
          tags = String(t.tags)
            .split(",")
            .map((s) => s.trim());
        return tags.includes(selectedKey);
      });
    }
    const total = rows.length || 1;
    const counts = { Todo: 0, Proses: 0, Selesai: 0 };
    for (const r of rows) {
      if (counts[r.status] != null) counts[r.status]++;
    }
    return STATUS_ORDER.map((name) => ({
      name,
      value: counts[name],
      percent: (counts[name] / total) * 100,
    }));
  }, [dataItems, chartMode, selectedKey]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end gap-2 mb-3">
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder={`Cari ${
              chartMode === "tag" ? "tag" : "penanggung jawab"
            }...`}
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          />
        </div>
        <select
          className="select w-full sm:w-64"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
        >
          {!filteredCategories.length && (
            <option value="">(Tidak ada kategori)</option>
          )}
          {filteredCategories.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button
          className="btn"
          onClick={() => {
            setCatFilter("");
            if (chartCategories.length) setSelectedKey(chartCategories[0]);
          }}
        >
          Reset
        </button>
      </div>

      <div className="mt-2 h-64">
        {selectedKey ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {pieData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={STATUS_COLORS[entry.name] || "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const total = pieData.reduce((a, b) => a + b.value, 0) || 1;
                  const pct = ((value / total) * 100).toFixed(1) + "%";
                  return [`${value} (${pct})`, name];
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-slate-500 text-sm">
            Pilih kategori untuk melihat distribusi status.
          </div>
        )}
      </div>
    </>
  );
}
