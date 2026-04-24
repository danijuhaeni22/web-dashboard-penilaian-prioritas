import React, { useEffect, useMemo, useRef, useState } from "react";
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
  FileDown,
} from "lucide-react";

import StatusChip from "./components/StatusChip";
import PriorityBadge from "./components/PriorityBadge";
import TaskModal from "./components/TaskModal";
import ChartBlock from "./components/ChartBlock";
import AlertCenter from "./components/AlertCenter";

import { useNotifier } from "./hooks/useNotifier";

// === PDF export libs ===
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

export default function App() {
  const [clock, setClock] = useState(dayjs().tz("Asia/Jakarta"));

  // ===== List & kontrol =====
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sortKey, setSortKey] = useState("score"); // 'score' = Prioritas
  const [sortDir, setSortDir] = useState("desc");
  const [data, setData] = useState({
    items: [],
    thresholds: { q33: 0, q66: 0 },
    weights: { impact: 1, urgency: 1, effort: 1 }, // tidak dipakai rumus baru
    summary: { total: 0, todo: 0, progress: 0, done: 0, overdue: 0, avg: 0 },
  });

  // ===== Semua tugas (tanpa filter) untuk Alert =====
  const [allForAlert, setAllForAlert] = useState([]);

  const [isDeleting, setIsDeleting] = useState(false);

  // ===== Modal & draft =====
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const emptyForm = {
    title: "",
    desc: "",
    regulasi: 3,
    bisnis: 3,
    resiko: 3,
    efisiensi: 3,
    dueISO: "",
    owner: "", // Product Owner (wajib)
    picDev: "", // opsional
    picSA: "", // opsional
    quartal: "", // Q1/Q2/Q3/Q4 (opsional)
    tags: [],
    status: "", // placeholder
    attachments: [],
  };
  const [formDraft, setFormDraft] = useState(emptyForm);

  // ===== Kategori =====
  const [extraCats, setExtraCats] = useState([]);
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

  const modalCategories = useMemo(
    () =>
      Array.from(
        new Set([...tagsFromTasks, ...extraCats, ...tagsFromDraft]),
      ).sort(),
    [tagsFromTasks, extraCats, tagsFromDraft],
  );

  const inUseSet = useMemo(() => new Set(tagsFromTasks), [tagsFromTasks]);
  const isCatDeletable = (name) =>
    !inUseSet.has(name) && !tagsFromDraft.includes(name);
  const addCategory = (name) => {
    const n = name.trim();
    if (!n) return;
    setExtraCats((prev) => (prev.includes(n) ? prev : [...prev, n]));
  };
  const deleteCategory = (name) =>
    setExtraCats((prev) => prev.filter((c) => c !== name));

  const [toast, notify] = useNotifier();

  // 🔥 load untuk tabel
  const loadMain = async () => {
    try {
      const r = await api.listTasks({ q, status, sortKey, sortDir });
      setData(r);
    } catch (e) {
      console.error("Gagal memuat tasks:", e);
      notify?.({ text: `Gagal memuat tugas: ${e.message}`, variant: "error" });
    }
  };

  // 🔥 load untuk alert (sekali saja)
  const loadAlert = async () => {
    try {
      const all = await api.listTasks({
        q: "",
        status: "ALL",
        sortKey: "score",
        sortDir: "desc",
      });
      setAllForAlert(all?.items || []);
    } catch (e) {
      console.error("Alert fetch error:", e);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setClock(dayjs().tz("Asia/Jakarta")), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      loadMain();
    }, 120); // 🔥 penting

    return () => clearTimeout(t);
  }, [q, status, sortKey, sortDir]);

  // 🔥 untuk alert (sekali saja)
  useEffect(() => {
    loadAlert();
  }, []);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v)));
  const setWeight = async (k, v) => {
    const val = clamp(v, 0.5, 3);
    const next = { ...data.weights, [k]: val };
    await api.setSettings(next);
    notify(
      "Bobot diperbarui (catatan: rumus prioritas saat ini tidak memakai bobot).",
    );
    await loadMain();
  };
  const resetWeights = async () => {
    await api.setSettings({ impact: 1, urgency: 1, effort: 1 });
    notify("Bobot dikembalikan.");
    loadMain();
  };

  const openAdd = () => {
    setEditing(null);
    setFormDraft({ ...emptyForm, attachments: [] });
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
      regulasi: Number.isFinite(t.regulasi)
        ? t.regulasi
        : Number.isFinite(t.impact)
          ? t.impact
          : 3,
      bisnis: Number.isFinite(t.bisnis)
        ? t.bisnis
        : Number.isFinite(t.urgency)
          ? t.urgency
          : 3,
      resiko: Number.isFinite(t.resiko) ? t.resiko : 3,
      efisiensi: Number.isFinite(t.efisiensi)
        ? t.efisiensi
        : Number.isFinite(t.effort)
          ? t.effort
          : 3,
      picDev: t.picDev || "",
      picSA: t.picSA || "",
      quartal: t.quartal || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const onSubmit = async () => {
    const f = formDraft;
    if (!f.title?.trim()) return;
    if (
      ![f.regulasi, f.bisnis, f.resiko, f.efisiensi].every((n) =>
        Number.isFinite(n),
      )
    )
      return;
    if (!f.dueISO) return;
    if (!f.owner?.trim()) return;
    if (!f.status) return;

    const payload = {
      title: f.title,
      desc: f.desc,
      regulasi: f.regulasi,
      bisnis: f.bisnis,
      resiko: f.resiko,
      efisiensi: f.efisiensi,
      dueISO: f.dueISO,
      owner: f.owner,
      picDev: f.picDev || "",
      picSA: f.picSA || "",
      quartal: f.quartal || "",
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

    try {
      if (editing?.id) {
        await api.updateTask(editing.id, payload);
        notify("Perubahan tersimpan.");
      } else {
        await api.createTask(payload);
        notify("Tugas ditambahkan.");
        setFormDraft({ ...emptyForm });
      }

      setModalOpen(false);

      // 🔥 FIX UTAMA (jangan dihapus)
      await new Promise((r) => setTimeout(r, 120));

      await loadMain();
    } catch (e) {
      console.error(e);
      notify("Gagal menyimpan data");
    }
  };

  const markDone = async (id, title) => {
    const ok = confirm(`Yakin menandai tugas ini sebagai selesai?\n"${title}"`);
    if (!ok) return;

    await api.markDone(id);
    notify("Tugas ditandai selesai.");

    await new Promise((r) => setTimeout(r, 100)); // 🔥 tambah ini

    await loadMain();
  };

  const remove = async (id) => {
    if (isDeleting) return;

    if (confirm("Hapus tugas ini?")) {
      try {
        setIsDeleting(true);

        await api.removeTask(id);
        notify("Tugas dihapus.");

        await new Promise((r) => setTimeout(r, 100)); // 🔥 tambah ini

        await loadMain();
      } catch (err) {
        console.error(err);
        notify("Gagal hapus tugas");
      } finally {
        setIsDeleting(false);
      }
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

  // ====== Export PDF (Chart + Table) ======
  const chartCardRef = useRef(null);
  const tableCardRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const addElementToPdf = async (pdf, el, startNewPage) => {
    if (!el) return;
    if (startNewPage) pdf.addPage();

    // 🔥 TARO DI SINI (penting)
    await new Promise((r) => setTimeout(r, 100));

    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    const margin = 10;
    const usableW = pdfW - margin * 2;

    const imgW = canvas.width;
    const imgH = canvas.height;

    const ratio = usableW / imgW;
    const renderH = imgH * ratio;

    let heightLeft = renderH;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, usableW, renderH);

    heightLeft -= pdfH;

    while (heightLeft > 0) {
      position = heightLeft - renderH + margin;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, usableW, renderH);
      heightLeft -= pdfH;
    }
  };

  const exportPdf = async () => {
    try {
      setExporting(true);

      const pdf = new jsPDF();

      // ===== TITLE =====
      pdf.setFontSize(16);
      pdf.text("Dashboard Prioritas Pekerjaan", 14, 15);

      pdf.setFontSize(10);
      pdf.text(`Tanggal: ${dayjs().format("DD MMM YYYY HH:mm")}`, 14, 22);

      // ===== TABLE DATA =====
      const rows = data.items.map((t, i) => [
        i + 1,
        t.title,
        t.owner,
        t.status,
        t.priorityLabel,
        t.score,
        t.quartal || "-",
        t.dueISO ? dayjs(t.dueISO).format("DD MMM YYYY") : "-",
      ]);

      autoTable(pdf, {
        startY: 30,
        head: [
          [
            "No",
            "Judul",
            "Owner",
            "Status",
            "Prioritas",
            "Score",
            "Quartal",
            "Due Date",
          ],
        ],
        body: rows,

        styles: {
          fontSize: 8,
          cellPadding: 2,
        },

        headStyles: {
          fillColor: [30, 41, 59], // slate-800
        },

        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });

      pdf.save(`prioritas-dashboard_${dayjs().format("YYYYMMDD_HHmm")}.pdf`);
    } catch (e) {
      console.error("Export PDF gagal", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="border-b">
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
          <AlertCenter tasks={allForAlert} onNotify={notify} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Ringkasan */}
          <section className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100">
                Ringkasan
              </h2>
              <div className="text-xs text-slate-400">
                Terakhir diperbarui: {clock.format("DD MMM YYYY HH:mm [WIB]")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* TOTAL */}
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 hover:bg-slate-800 transition">
                <div className="text-xs text-slate-400">Total Tugas</div>
                <div className="text-2xl font-bold text-slate-100 mt-1">
                  {data.summary.total}
                </div>
              </div>

              {/* AVG */}
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 hover:bg-slate-800 transition">
                <div className="text-xs text-slate-400">
                  Rata-rata Prioritas
                </div>
                <div className="text-2xl font-bold text-slate-100 mt-1">
                  {data.summary.avg?.toFixed?.(2) ?? "0.00"}
                </div>
              </div>

              {/* STATUS */}
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 hover:bg-slate-800 transition">
                <div className="text-xs text-slate-400">Status</div>
                <div className="text-lg font-semibold text-slate-100 mt-1">
                  {data.summary.todo} <span className="text-slate-500">/</span>{" "}
                  {data.summary.progress}{" "}
                  <span className="text-slate-500">/</span> {data.summary.done}
                </div>
              </div>

              {/* OVERDUE */}
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 hover:bg-slate-800 transition">
                <div className="text-xs text-slate-400">Overdue</div>
                <div className="text-2xl font-bold text-red-400 mt-1">
                  {data.summary.overdue}
                </div>
              </div>
            </div>

            {/* BADGE */}
            <div className="text-xs text-slate-400 mt-4">
              Badge: <span className="badge badge-red">Tinggi</span>{" "}
              <span className="badge badge-amber">Sedang</span>{" "}
              <span className="badge badge-green">Rendah</span>
            </div>
          </section>

          {/* Rumus */}
          <section className="card">
            <h2 className="text-lg font-semibold text-slate-100 mb-3">
              Rumus Prioritas
            </h2>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 font-mono">
              Prioritas = (Regulasi + Bisnis + Resiko + Efisiensi) / 4
            </div>

            <div className="text-xs text-slate-400 mt-2">
              Catatan: pengaturan bobot tidak digunakan pada rumus ini.
            </div>
          </section>

          {/* Pie Chart */}
          <section className="card" ref={chartCardRef}>
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
                Product Owner
              </button>
            </div>
            <ChartBlock dataItems={data.items} chartMode={chartMode} />
          </section>

          {/* Daftar Tugas */}
          <section
            className="card md:col-span-2 xl:col-span-3"
            ref={tableCardRef}
          >
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold">Daftar Tugas</h2>
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9 w-full sm:w-80"
                    placeholder="Cari judul / product owner / tag..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <select
                  className="select w-full sm:w-44"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ALL">Semua Status</option>
                  <option>Waiting</option>
                  <option>On Progress</option>
                  <option>Continue</option>
                  <option>Done</option>
                </select>

                {/* Export PDF */}
                <button
                  className="btn border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300 transition-colors"
                  onClick={exportPdf}
                  disabled={exporting}
                  title="Export Chart & Tabel ke PDF"
                >
                  <FileDown className="w-4 h-4" />
                  {exporting ? "Mengekspor..." : "Export PDF"}
                </button>

                <button className="btn btn-primary" onClick={openAdd}>
                  <Plus className="w-4 h-4" /> Tambah Tugas
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-slate-300">
                {/* HEADER */}
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    {["title", "score", "status", "quartal", "due"].map((k) => {
                      const titles = {
                        title: "Judul",
                        score: "Prioritas",
                        status: "Status",
                        quartal: "Quartal",
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
                          className="text-left px-4 py-3 font-semibold text-slate-400 cursor-pointer select-none hover:text-white transition"
                        >
                          <span className="inline-flex items-center gap-1">
                            {titles[k]}
                            <span className="w-3 inline-block text-xs">
                              {arrow}
                            </span>
                          </span>
                        </th>
                      );
                    })}

                    <th className="text-left px-4 py-3 font-semibold text-slate-400">
                      Aksi
                    </th>
                  </tr>
                </thead>

                {/* BODY */}
                <tbody className="divide-y divide-slate-700">
                  {data.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-slate-500 text-center p-6"
                      >
                        Tidak ada tugas yang cocok.
                      </td>
                    </tr>
                  )}

                  {data.items.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-800/60 transition-colors align-top"
                    >
                      {/* TITLE */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100">
                          {t.title}
                        </div>

                        {t.desc && (
                          <div className="text-xs text-slate-400 mt-1">
                            {t.desc}
                          </div>
                        )}

                        {(t.owner || t.picDev || t.picSA) && (
                          <div className="text-xs text-slate-500 mt-1">
                            {t.owner && (
                              <>
                                PO:{" "}
                                <span className="text-slate-300 font-medium">
                                  {t.owner}
                                </span>
                              </>
                            )}
                            {t.picDev && (
                              <>
                                {" "}
                                • Dev:{" "}
                                <span className="text-slate-300 font-medium">
                                  {t.picDev}
                                </span>
                              </>
                            )}
                            {t.picSA && (
                              <>
                                {" "}
                                • SA:{" "}
                                <span className="text-slate-300 font-medium">
                                  {t.picSA}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </td>

                      {/* PRIORITAS */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <PriorityBadge
                            label={t.priorityLabel}
                            score={t.score}
                          />
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3 text-center">
                        <StatusChip status={t.status} />
                      </td>

                      {/* QUARTAL */}
                      <td className="px-4 py-3 text-center text-slate-400">
                        {t.quartal || "—"}
                      </td>

                      {/* DUE */}
                      <td className="px-4 py-3">
                        <div className="text-slate-300">
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

                      {/* AKSI */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
                            onClick={() => openEdit(t)}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                          </button>

                          {/* LAMPIRAN */}
                          {Array.isArray(t.attachments) &&
                            t.attachments.length > 0 && (
                              <div
                                className="relative"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-sky-500 bg-sky-900/30 text-sky-400 hover:bg-sky-900/50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenAttachId((prev) =>
                                      prev === t.id ? null : t.id,
                                    );
                                  }}
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  Lampiran
                                  <span className="ml-1 text-[10px] bg-sky-700 px-1 rounded">
                                    {t.attachments.length}
                                  </span>
                                </button>

                                {openAttachId === t.id && (
                                  <div className="absolute right-0 mt-2 w-72 z-[180] border border-slate-700 bg-slate-800 rounded-xl shadow-lg p-2">
                                    <ul className="max-h-64 overflow-auto">
                                      {t.attachments.map((att) => (
                                        <li
                                          key={att.id}
                                          className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-slate-700"
                                        >
                                          <span className="truncate text-slate-300 text-xs">
                                            {att.name || att.id}
                                          </span>

                                          <a
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-600 hover:bg-slate-700"
                                            href={api.files.url(att.id)}
                                            download
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={() =>
                                              setOpenAttachId(null)
                                            }
                                          >
                                            <DownloadIcon className="w-3.5 h-3.5" />
                                            Unduh
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                          {/* SELESAI */}
                          <button
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-emerald-500 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                            onClick={() => markDone(t.id, t.title)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Selesai
                          </button>

                          <button
                            disabled={isDeleting}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-500 
  ${
    isDeleting
      ? "bg-red-900/10 text-red-300 cursor-not-allowed"
      : "bg-red-900/30 text-red-400 hover:bg-red-900/50"
  }`}
                            onClick={() => remove(t.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {isDeleting ? "Menghapus..." : "Hapus"}
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

      {/* Toast */}
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
