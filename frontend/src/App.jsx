import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import dayjs from "./lib/dayjs";
import {
  Plus,
  Edit3,
  CheckCircle2,
  Trash2,
  Search,
  Paperclip,
  Download as DownloadIcon,
} from "lucide-react";

import StatusChip from "./components/StatusChip";
import PriorityBadge from "./components/PriorityBadge";
import TaskModal from "./components/TaskModal";
import ChartBlock from "./components/ChartBlock";
import AlertCenter from "./components/AlertCenter";

import { useNotifier } from "./hooks/useNotifier";

export default function App() {
  const [clock, setClock] = useState(dayjs().tz("Asia/Jakarta"));

  // ===== List & kontrol =====
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [data, setData] = useState({
    items: [],
    thresholds: { q33: 0, q66: 0 },
    weights: { impact: 1, urgency: 1, effort: 1 },
    summary: { total: 0, todo: 0, progress: 0, done: 0, overdue: 0, avg: 0 },
  });

  // ===== Daftar semua tugas (TANPA FILTER) untuk deteksi overdue di AlertCenter =====
  const [allForAlert, setAllForAlert] = useState([]);

  // ===== Modal & draft =====
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const emptyForm = {
    title: "",
    desc: "",
    impact: 3,
    urgency: 3,
    effort: 2,
    dueISO: "",
    owner: "",
    tags: [],
    status: "", // status sengaja kosong (placeholder)
    attachments: [],
  };
  const [formDraft, setFormDraft] = useState(emptyForm);

  // ===== Pool kategori tambahan (sementara) =====
  const [extraCats, setExtraCats] = useState([]);

  // ===== Kategori dari tasks (in-use) =====
  const tagsFromTasks = useMemo(() => {
    const set = new Set();
    for (const t of data.items) {
      let arr = [];
      if (Array.isArray(t.tags)) arr = t.tags;
      else if (t.tags)
        arr = String(t.tags)
          .split(",")
          .map((s) => s.trim());
      arr.filter(Boolean).forEach((s) => set.add(s));
    }
    return Array.from(set).sort();
  }, [data.items]);

  const tagsFromDraft = useMemo(() => {
    return Array.isArray(formDraft.tags)
      ? formDraft.tags
      : formDraft.tags
      ? String(formDraft.tags)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  }, [formDraft.tags]);

  const modalCategories = useMemo(() => {
    return Array.from(
      new Set([...tagsFromTasks, ...extraCats, ...tagsFromDraft])
    ).sort();
  }, [tagsFromTasks, extraCats, tagsFromDraft]);

  const inUseSet = useMemo(() => new Set(tagsFromTasks), [tagsFromTasks]);
  const isCatDeletable = (name) =>
    !inUseSet.has(name) && !tagsFromDraft.includes(name);

  const addCategory = (name) => {
    const n = name.trim();
    if (!n) return;
    setExtraCats((prev) => (prev.includes(n) ? prev : [...prev, n]));
  };
  const deleteCategory = (name) => {
    setExtraCats((prev) => prev.filter((c) => c !== name));
  };

  const [toast, notify] = useNotifier();

  const load = async () => {
    try {
      const r = await api.listTasks({ q, status, sortKey, sortDir });
      setData(r);

      // muat semua tugas tanpa filter, agar deteksi overdue selalu akurat
      const all = await api.listTasks({
        q: "",
        status: "ALL",
        sortKey: "score",
        sortDir: "desc",
      });
      setAllForAlert(all?.items || []);
    } catch (e) {
      console.error("Gagal memuat tasks:", e);
      notify?.({ text: `Gagal memuat tugas: ${e.message}`, variant: "error" });
      // jangan kosongkan data lama
    }
  };

  useEffect(() => {
    const t = setInterval(() => setClock(dayjs().tz("Asia/Jakarta")), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    load();
  }, [q, status, sortKey, sortDir]);

  // ==== Bobot: slider only (range) ====
  const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v)));
  const setWeight = async (k, v) => {
    const val = clamp(v, 0.5, 3);
    const next = { ...data.weights, [k]: val };
    await api.setSettings(next);
    notify("Bobot diperbarui.");
    load();
  };
  const resetWeights = async () => {
    await api.setSettings({ impact: 1, urgency: 1, effort: 1 });
    notify("Bobot dikembalikan.");
    load();
  };

  const openAdd = () => {
    setEditing(null);
    setFormDraft({ ...emptyForm, attachments: [] }); // upload hanya di modal
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setFormDraft({
      ...t,
      tags: Array.isArray(t.tags)
        ? t.tags
        : t.tags
        ? String(t.tags)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const onSubmit = async () => {
    const f = formDraft;
    if (!f.title?.trim()) return;
    if (![f.impact, f.urgency, f.effort].every((n) => Number.isFinite(n)))
      return;
    if (!f.dueISO) return;
    if (!f.owner?.trim()) return;
    if (!f.status) return;

    const payload = {
      title: f.title,
      desc: f.desc,
      impact: f.impact,
      urgency: f.urgency,
      effort: f.effort,
      dueISO: f.dueISO,
      owner: f.owner,
      tags: Array.isArray(f.tags)
        ? f.tags
        : f.tags
        ? String(f.tags)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      status: f.status,
      attachments: Array.isArray(f.attachments) ? f.attachments : [],
    };

    if (editing?.id) {
      await api.updateTask(editing.id, payload);
      notify("Perubahan tersimpan.");
    } else {
      await api.createTask(payload);
      notify("Tugas ditambahkan.");
      setFormDraft({ ...emptyForm });
    }
    setModalOpen(false);
    load();
  };

  const markDone = async (id, title) => {
    const ok = confirm(`Yakin menandai tugas ini sebagai selesai?\n"${title}"`);
    if (!ok) return;
    await api.markDone(id);
    notify("Tugas ditandai selesai.");
    load();
  };

  const remove = async (id) => {
    if (confirm("Hapus tugas ini?")) {
      await api.removeTask(id);
      notify("Tugas dihapus.");
      load();
    }
  };

  const [chartMode, setChartMode] = useState("tag"); // 'tag' | 'owner'

  // ====== Popover Lampiran per baris ======
  const [openAttachId, setOpenAttachId] = useState(null);
  useEffect(() => {
    const close = () => setOpenAttachId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);
  const toggleAttach = (e, id) => {
    e.stopPropagation();
    setOpenAttachId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">
              Dashboard Prioritas Pekerjaan
            </h1>
            <div className="text-sm text-slate-500">
              Waktu lokal:{" "}
              <strong>
                {clock.format("dddd, DD MMM YYYY HH:mm:ss [WIB]")}
              </strong>
            </div>
          </div>

          {/* Tombol lonceng + pusat alert (pakai semua tugas, bukan yang terfilter) */}
          <AlertCenter tasks={allForAlert} onNotify={notify} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Ringkasan */}
          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Ringkasan</h2>
              <div className="text-xs text-slate-500">
                Terakhir diperbarui: {clock.format("DD MMM YYYY HH:mm [WIB]")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500">Total Tugas</div>
                <div className="text-2xl font-bold mt-1">
                  {data.summary.total}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500">Rata-rata Skor</div>
                <div className="text-2xl font-bold mt-1">
                  {data.summary.avg?.toFixed?.(2) ?? "0.00"}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500">
                  Status: Todo / Proses / Selesai
                </div>
                <div className="text-xl font-semibold mt-1">
                  {data.summary.todo} / {data.summary.progress} /{" "}
                  {data.summary.done}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500">Overdue</div>
                <div className="text-2xl font-bold mt-1 text-red-600">
                  {data.summary.overdue}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-4">
              Badge: <span className="badge badge-red">Tinggi</span>{" "}
              <span className="badge badge-amber">Sedang</span>{" "}
              <span className="badge badge-green">Rendah</span>
            </div>
          </section>

          {/* Pengaturan Bobot */}
          <section className="card">
            <h2 className="text-lg font-semibold mb-3">Pengaturan Bobot</h2>
            <div className="text-xs text-slate-500">
              Rumus: <code>(wI×Impact + wU×Urgensi) / max(Effort×wE, 1)</code>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <div className="text-xs text-slate-600 mb-1">
                  wI (Impact): {data.weights.impact}
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={data.weights.impact}
                  onChange={(e) => setWeight("impact", e.target.value)}
                  className="w-full accent-sky-600"
                  onKeyDown={(e) => e.preventDefault()}
                />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">
                  wU (Urgensi): {data.weights.urgency}
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={data.weights.urgency}
                  onChange={(e) => setWeight("urgency", e.target.value)}
                  className="w-full accent-sky-600"
                  onKeyDown={(e) => e.preventDefault()}
                />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">
                  wE (Effort): {data.weights.effort}
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={data.weights.effort}
                  onChange={(e) => setWeight("effort", e.target.value)}
                  className="w-full accent-sky-600"
                  onKeyDown={(e) => e.preventDefault()}
                />
              </div>
            </div>
            <div className="mt-3">
              <button
                className="btn"
                onClick={async () => {
                  await resetWeights();
                }}
              >
                Reset Bobot
              </button>
            </div>
          </section>

          {/* Pie Chart Distribusi per Kategori */}
          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                Distribusi Status per Kategori
              </h2>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                className={`btn ${chartMode === "tag" ? "btn-primary" : ""}`}
                onClick={() => setChartMode("tag")}
              >
                Tag
              </button>
              <button
                className={`btn ${chartMode === "owner" ? "btn-primary" : ""}`}
                onClick={() => setChartMode("owner")}
              >
                Penanggung Jawab
              </button>
            </div>

            <ChartBlock dataItems={data.items} chartMode={chartMode} />
          </section>

          {/* Daftar Tugas */}
          <section className="card md:col-span-2 xl:col-span-3">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold">Daftar Tugas</h2>
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9 w-full sm:w-80"
                    placeholder="Cari judul / penanggung jawab / tag..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <select
                  className="select w-full sm:w-40"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ALL">Semua Status</option>
                  <option>Todo</option>
                  <option>Proses</option>
                  <option>Selesai</option>
                </select>
                <button className="btn btn-primary" onClick={openAdd}>
                  <Plus className="w-4 h-4" /> Tambah Tugas
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "title",
                      "impact",
                      "urgency",
                      "effort",
                      "score",
                      "status",
                      "due",
                    ].map((k) => {
                      const titles = {
                        title: "Judul",
                        impact: "Impact",
                        urgency: "Urgensi",
                        effort: "Effort",
                        score: "Skor",
                        status: "Status",
                        due: "Jatuh Tempo",
                      };
                      const onClick = () => {
                        if (sortKey === k)
                          setSortDir(sortDir === "asc" ? "desc" : "asc");
                        else {
                          setSortKey(k);
                          setSortDir(k === "score" ? "desc" : "asc");
                        }
                      };
                      const arrow =
                        sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "";
                      return (
                        <th
                          key={k}
                          onClick={onClick}
                          className="text-left px-3 py-2 font-medium text-slate-600 cursor-pointer select-none"
                        >
                          <span className="inline-flex items-center gap-1">
                            {titles[k]}{" "}
                            <span className="w-3 inline-block">{arrow}</span>
                          </span>
                        </th>
                      );
                    })}
                    <th className="text-left px-3 py-2 font-medium text-slate-600">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-slate-500 text-center p-6"
                      >
                        Tidak ada tugas yang cocok.
                      </td>
                    </tr>
                  )}
                  {data.items.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium">{t.title}</div>
                        {t.desc && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {t.desc}
                          </div>
                        )}
                        {t.owner && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            PJ: <span className="font-medium">{t.owner}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">{t.impact}</td>
                      <td className="px-3 py-2 text-center">{t.urgency}</td>
                      <td className="px-3 py-2 text-center">{t.effort}</td>
                      <td className="px-3 py-2 text-center">
                        <PriorityBadge
                          label={t.priorityLabel}
                          score={t.score}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <StatusChip status={t.status} />
                      </td>
                      <td className="px-3 py-2">
                        <div>
                          {t.dueISO
                            ? dayjs(t.dueISO)
                                .tz("Asia/Jakarta")
                                .format("DD MMM YYYY HH:mm [WIB]")
                            : "—"}
                          {t.isOverdue && (
                            <span className="badge badge-red ml-2">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button className="btn" onClick={() => openEdit(t)}>
                            <Edit3 className="w-4 h-4" /> Edit
                          </button>

                          {/* Tombol Lampiran/Download (muncul jika ada attachments) */}
                          {Array.isArray(t.attachments) &&
                            t.attachments.length > 0 && (
                              <div
                                className="relative"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  className="btn border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-300 transition-colors"
                                  onClick={(e) => toggleAttach(e, t.id)}
                                  aria-label="Lihat & unduh lampiran"
                                >
                                  <Paperclip className="w-4 h-4" />
                                  <span className="text-sm">Lampiran</span>
                                  <span className="ml-1 inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-100 text-sky-700 text-[10px] px-1.5 py-0.5 leading-none">
                                    {t.attachments.length}
                                  </span>
                                </button>

                                {openAttachId === t.id && (
                                  <div className="absolute right-0 mt-2 w-72 z-[180] bg-white border border-slate-200 rounded-xl shadow-lg p-2">
                                    <ul className="max-h-64 overflow-auto">
                                      {t.attachments.map((att) => (
                                        <li
                                          key={att.id}
                                          className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-slate-50"
                                          title={att.name || att.id}
                                        >
                                          <span className="truncate">
                                            {att.name || att.id}
                                          </span>
                                          <a
                                            className="btn px-2 py-1 text-xs border border-slate-300 bg-white hover:bg-slate-50"
                                            href={api.files.url(att.id)}
                                            download
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={() =>
                                              setOpenAttachId(null)
                                            }
                                          >
                                            <DownloadIcon className="w-4 h-4" />{" "}
                                            Unduh
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                          {/* Selesai: hijau lembut */}
                          <button
                            className="btn border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-colors"
                            onClick={() => markDone(t.id, t.title)}
                          >
                            <CheckCircle2 className="w-4 h-4" /> Selesai
                          </button>

                          {/* Hapus: merah lembut */}
                          <button
                            className="btn border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors"
                            onClick={() => remove(t.id)}
                          >
                            <Trash2 className="w-4 h-4" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Toast (termasuk Overdue: merah) */}
      {toast?.text && (
        <div
          className={`fixed left-1/2 bottom-6 -translate-x-1/2 text-sm px-4 py-2 rounded-full shadow z-[200]
             ${
               toast.variant === "error"
                 ? "bg-red-600 text-white"
                 : toast.variant === "success"
                 ? "bg-emerald-600 text-white"
                 : toast.variant === "info"
                 ? "bg-sky-600 text-white"
                 : "bg-slate-900 text-white"
             }`}
        >
          {toast.text}
        </div>
      )}

      <TaskModal
        open={modalOpen}
        form={formDraft}
        onChange={setFormDraft}
        onClose={closeModal}
        onSubmit={onSubmit}
        modalCategories={modalCategories}
        addCategory={addCategory}
        deleteCategory={deleteCategory}
        isCatDeletable={isCatDeletable}
      />
    </div>
  );
}
