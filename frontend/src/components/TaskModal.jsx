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
      const meta = await api.files.upload(file); // {id,name,type,size,uploadedAt}
      set("attachments", [...(form?.attachments || []), meta]);
    } catch (e) {
      const msg = e?.message || "Gagal mengunggah file.";
      alert(msg);
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
      (form?.attachments || []).filter((a) => a.id !== id)
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Container modal dibuat relative agar tombol X absolute bisa ditempatkan di pojok kanan */}
      <div
        className="modal relative overflow-visible max-h-[90vh] overflow-y-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
      >
        {/* Tombol X pojok kanan atas */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          title="Tutup"
          className="absolute top-3 right-3 z-[106] inline-flex items-center justify-center rounded-full p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="modal-header sticky top-0 z-[105] bg-white/95 backdrop-blur border-b rounded-t-2xl">
          <div className="flex items-center justify-center px-5 py-3">
            <h3 id="modalTitle" className="modal-title flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />{" "}
              {form?.id ? "Ubah Tugas" : "Tambah Tugas"}
            </h3>
          </div>
        </div>

        <div className="modal-body overflow-visible px-5 py-4">
          <form onSubmit={submit} className="grid gap-3">
            <label className="text-sm">
              Judul <span className="text-red-600">*</span>
              <input
                className="input mt-1"
                value={form?.title ?? ""}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Contoh: Perbaiki bug pembayaran"
                required
              />
              <div className="text-xs text-slate-500 mt-1">
                Judul wajib diisi.
              </div>
            </label>

            <label className="text-sm">
              Deskripsi
              <textarea
                className="input mt-1"
                rows={3}
                value={form?.desc ?? ""}
                onChange={(e) => set("desc", e.target.value)}
                placeholder="Detail singkat (opsional)"
              />
            </label>

            <div className="grid md:grid-cols-3 gap-3">
              <label className="text-sm">
                Impact (1–5) <span className="text-red-600">*</span>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={form?.impact ?? 3}
                    onChange={(e) => set("impact", Number(e.target.value))}
                    className="w-full accent-sky-600"
                    onKeyDown={(e) => e.preventDefault()}
                  />
                  <span className="badge badge-amber">{form?.impact ?? 3}</span>
                </div>
              </label>
              <label className="text-sm">
                Urgensi (1–5) <span className="text-red-600">*</span>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={form?.urgency ?? 3}
                    onChange={(e) => set("urgency", Number(e.target.value))}
                    className="w-full accent-sky-600"
                    onKeyDown={(e) => e.preventDefault()}
                  />
                  <span className="badge badge-amber">
                    {form?.urgency ?? 3}
                  </span>
                </div>
              </label>
              <label className="text-sm">
                Effort (1–5) <span className="text-red-600">*</span>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={form?.effort ?? 2}
                    onChange={(e) => set("effort", Number(e.target.value))}
                    className="w-full accent-sky-600"
                    onKeyDown={(e) => e.preventDefault()}
                  />
                  <span className="badge badge-amber">{form?.effort ?? 2}</span>
                </div>
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">
                Tenggat / Due Date <span className="text-red-600">*</span>
                <input
                  type="hidden"
                  required
                  value={form?.dueISO || ""}
                  onChange={() => {}}
                />
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1">
                    <div className="input bg-slate-50 cursor-not-allowed">
                      {form?.dueISO
                        ? dayjs(form.dueISO)
                            .tz("Asia/Jakarta")
                            .format("DD MMM YYYY HH:mm [WIB]")
                        : "Belum dipilih"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Wajib diisi. Klik “Pilih” untuk memilih tanggal & jam.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowPicker(true)}
                  >
                    <CalendarClock className="w-4 h-4" /> Pilih
                  </button>
                </div>
              </label>
              <label className="text-sm">
                Penanggung Jawab <span className="text-red-600">*</span>
                <input
                  className="input mt-1"
                  value={form?.owner ?? ""}
                  onChange={(e) => set("owner", e.target.value)}
                  placeholder="Contoh: Andi"
                  required
                />
              </label>
            </div>

            {/* Kategori + Status */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="text-sm relative z-[108] overflow-visible">
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

              <div className="text-sm relative z-[110] overflow-visible">
                <label className="block mb-1">
                  Status <span className="text-red-600">*</span>
                </label>
                {/* Hidden input agar validasi native 'required' tetap jalan saat value kosong */}
                <input
                  type="hidden"
                  required
                  value={form?.status || ""}
                  onChange={() => {}}
                />
                <SelectField
                  options={["Todo", "Proses", "Selesai"]}
                  value={form?.status || ""}
                  onChange={(val) => set("status", val)}
                  placeholder="pilih status tugas"
                  searchable={false}
                />
              </div>
            </div>

            {/* Lampiran (opsional) */}
            <div className="text-sm">
              <div className="mb-1">Lampiran (opsional)</div>
              <div
                className={`rounded-xl border-2 border-dashed px-4 py-5 text-center transition
                 ${
                   dragHover
                     ? "border-sky-400 bg-sky-50"
                     : "border-slate-300 bg-slate-50"
                 }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragHover(true);
                }}
                onDragLeave={() => setDragHover(false)}
                onDrop={onDrop}
              >
                <Upload className="w-5 h-5 mx-auto text-slate-500" />
                <div className="mt-2 text-xs text-slate-600">
                  Seret & letakkan file ke sini, atau
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
                {uploading && (
                  <div className="text-xs text-slate-500 mt-2">Mengunggah…</div>
                )}
                <div className="text-xs text-slate-400 mt-2">
                  Maks 50MB per file.
                </div>
              </div>

              {(form?.attachments?.length || 0) > 0 && (
                <ul className="mt-3 space-y-2">
                  {form.attachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <div
                            className="truncate font-medium"
                            title={att.name || att.id}
                          >
                            {att.name || att.id}
                          </div>
                          <div className="text-xs text-slate-500">
                            {att.type || "unknown"} • {fmtSize(att.size)} •{" "}
                            {att.uploadedAt
                              ? dayjs(att.uploadedAt).format(
                                  "DD MMM YYYY HH:mm [WIB]"
                                )
                              : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          className="btn"
                          href={api.files.url(att.id)}
                          download
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download className="w-4 h-4" /> Unduh
                        </a>
                        <button
                          type="button"
                          className="btn border border-slate-300"
                          onClick={() => removeAttach(att.id)}
                        >
                          <Trash2 className="w-4 h-4" /> Lepas
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="text-xs text-slate-400 mt-2">
                Catatan: Lampiran tidak wajib. Anda tetap bisa menyimpan tugas
                tanpa mengunggah file.
              </div>
            </div>

            <div className="modal-actions pt-2">
              <button className="btn btn-primary" type="submit">
                <Save className="w-4 h-4" /> Simpan
              </button>
              <button className="btn btn-ghost" type="button" onClick={onClose}>
                <X className="w-4 h-4" /> Tutup
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
