import React, { useRef, useState } from "react";
import {
  Save,
  SlidersHorizontal,
  X,
  CalendarClock,
  Upload,
  Paperclip,
  Download,
  Trash2,
} from "lucide-react";
import DateTimePicker from "./DateTimePicker";
import CategoryMultiSelect from "./CategoryMultiSelect";
import SelectField from "./SelectField";
import dayjs from "../lib/dayjs";
import { api } from "../api";

function fmtSize(n) {
  if (!Number.isFinite(n)) return "-";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0,
    x = n;
  while (x >= 1024 && i < u.length - 1) {
    x /= 1024;
    i++;
  }
  return `${x.toFixed(1)} ${u[i]}`;
}

export default function TaskModal({
  open,
  form,
  onChange,
  onClose,
  onSubmit,
  modalCategories,
  addCategory,
  deleteCategory,
  isCatDeletable,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragHover, setDragHover] = useState(false);
  const fileInputRef = useRef(null);

  const set = (k, v) => onChange((prev) => ({ ...prev, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    onSubmit();
  };
  if (!open) return null;

  const doUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const meta = await api.files.upload(file);
      set("attachments", [...(form?.attachments || []), meta]);
    } catch (e) {
      alert(e?.message || "Gagal mengunggah file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onInputFile = (e) => doUpload(e.target.files?.[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDragHover(false);
    const f = e.dataTransfer.files?.[0];
    doUpload(f);
  };
  const removeAttach = (id) => {
    set(
      "attachments",
      (form?.attachments || []).filter((a) => a.id !== id),
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[90vh] overflow-y-auto no-scrollbar w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-[106] p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="sticky top-0 z-[105] bg-slate-900/95 backdrop-blur border-b border-slate-700 rounded-t-2xl">
          <div className="flex items-center justify-center px-5 py-3">
            <h3 className="flex items-center gap-2 text-slate-100 font-semibold">
              <SlidersHorizontal className="w-5 h-5 text-sky-400" />
              {form?.id ? "Ubah Tugas" : "Tambah Tugas"}
            </h3>
          </div>
        </div>

        {/* BODY */}
        <div className="px-5 py-4">
          <form onSubmit={submit} className="grid gap-4 text-slate-300">
            {/* INPUT */}
            <label className="text-sm">
              Judul <span className="text-red-500">*</span>
              <input
                className="input mt-1"
                value={form?.title ?? ""}
                onChange={(e) => set("title", e.target.value)}
              />
            </label>

            <label className="text-sm">
              Deskripsi
              <textarea
                className="input mt-1"
                rows={3}
                value={form?.desc ?? ""}
                onChange={(e) => set("desc", e.target.value)}
              />
            </label>

            {/* SLIDER */}
            <div className="grid md:grid-cols-2 gap-4">
              {["regulasi", "bisnis", "resiko", "efisiensi"].map((k) => (
                <label key={k} className="text-sm">
                  {k} (1–5)
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={form?.[k] ?? 3}
                      onChange={(e) => set(k, Number(e.target.value))}
                      className="w-full accent-sky-500"
                    />
                    <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-300 text-xs">
                      {form?.[k] ?? 3}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* GRID */}
            <div className="grid md:grid-cols-2 gap-4">
              <label className="text-sm">
                Tenggat / Due Date *
                <div className="flex gap-2 mt-1">
                  <div className="flex items-center px-3 h-[42px] rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm min-w-0 flex-1">
                    {form?.dueISO ? (
                      dayjs(form.dueISO)
                        .tz("Asia/Jakarta")
                        .format("DD MMM YYYY HH:mm [WIB]")
                    ) : (
                      <span className="text-slate-400">Belum dipilih</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary shrink-0"
                    onClick={() => setShowPicker(true)}
                  >
                    Pilih
                  </button>
                </div>
              </label>

              <label className="text-sm">
                Product Owner *
                <input
                  className="input mt-1"
                  value={form?.owner ?? ""}
                  onChange={(e) => set("owner", e.target.value)}
                />
              </label>
            </div>

            {/* PIC */}
            <div className="grid md:grid-cols-2 gap-4">
              <label className="text-sm">
                PIC Development
                <input
                  className="input mt-1"
                  value={form?.picDev ?? ""}
                  onChange={(e) => set("picDev", e.target.value)}
                />
              </label>

              <label className="text-sm">
                PIC System Analyst
                <input
                  className="input mt-1"
                  value={form?.picSA ?? ""}
                  onChange={(e) => set("picSA", e.target.value)}
                />
              </label>
            </div>

            {/* KATEGORI + STATUS */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-sm">
                <div className="mb-1">Kategori / Tag</div>
                <CategoryMultiSelect
                  categories={modalCategories}
                  selected={
                    Array.isArray(form?.tags)
                      ? form.tags
                      : form?.tags
                        ? String(form.tags)
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        : []
                  }
                  onChange={(arr) => set("tags", arr)}
                  onAddCategory={addCategory}
                  onDeleteCategory={deleteCategory}
                  isDeletable={isCatDeletable}
                />
              </div>

              <div className="text-sm">
                <label className="block mb-1">Status *</label>
                <SelectField
                  options={["Waiting", "On Progress", "Continue", "Done"]}
                  value={form?.status || ""}
                  onChange={(val) => set("status", val)}
                />
              </div>

              <div className="text-sm">
                <label className="block mb-1">Quartal</label>
                <SelectField
                  options={["Q1", "Q2", "Q3", "Q4"]}
                  value={form?.quartal || ""}
                  onChange={(val) => set("quartal", val)}
                />
              </div>
            </div>

            {/* UPLOAD */}
            <div className="text-sm">
              <div className="mb-1">Lampiran</div>

              <div
                className={`rounded-xl border-2 border-dashed p-5 text-center transition ${
                  dragHover
                    ? "border-sky-500 bg-sky-900/20"
                    : "border-slate-700 bg-slate-800"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragHover(true);
                }}
                onDragLeave={() => setDragHover(false)}
                onDrop={onDrop}
              >
                <Upload className="w-5 h-5 mx-auto text-slate-400" />
                <div className="text-xs mt-2 text-slate-400">
                  Drag & drop atau pilih file
                </div>

                <button
                  type="button"
                  className="btn mt-3"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Pilih File
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={onInputFile}
                />
              </div>

              {(form?.attachments?.length || 0) > 0 && (
                <ul className="mt-3 space-y-2">
                  {form.attachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex justify-between items-center p-3 rounded-xl border border-slate-700 bg-slate-800"
                    >
                      <span className="truncate text-sm text-slate-300">
                        {att.name || att.id}
                      </span>

                      <div className="flex gap-1">
                        <a
                          className="btn px-2 py-1 text-xs"
                          href={api.files.url(att.id)}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          className="btn px-2 py-1 text-xs border border-red-500 text-red-400"
                          onClick={() => removeAttach(att.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ACTION */}
            <div className="flex gap-2 pt-2">
              <button className="btn btn-primary">
                <Save className="w-4 h-4" /> Simpan
              </button>
              <button className="btn btn-ghost" onClick={onClose}>
                Tutup
              </button>
            </div>
          </form>
        </div>
      </div>

      {showPicker && (
        <DateTimePicker
          initialISO={form?.dueISO}
          onApply={(iso) => {
            onChange((prev) => ({ ...prev, dueISO: iso }));
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
