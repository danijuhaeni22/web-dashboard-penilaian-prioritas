import React, { useEffect, useRef, useState } from "react";
import { Upload, Download, Trash2, FileText } from "lucide-react";
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

export default function FileCenter({ onNotify }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragHover, setDragHover] = useState(false);
  const inputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      setList(await api.files.list());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const doUpload = async (file) => {
    if (!file) return;
    try {
      await api.files.upload(file);
      onNotify?.({ text: "Upload berhasil", variant: "success" });
      load();
    } catch {
      onNotify?.({ text: "Upload gagal", variant: "error" });
    }
  };

  const onInput = (e) => doUpload(e.target.files?.[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDragHover(false);
    const f = e.dataTransfer.files?.[0];
    doUpload(f);
  };

  const remove = async (id) => {
    if (!confirm("Hapus file ini?")) return;
    await api.files.remove(id);
    onNotify?.("File dihapus.");
    load();
  };

  return (
    <div>
      <div
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition
        ${
          dragHover ? "border-sky-400 bg-sky-50" : "border-slate-300 bg-white"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragHover(true);
        }}
        onDragLeave={() => setDragHover(false)}
        onDrop={onDrop}
      >
        <Upload className="w-6 h-6 mx-auto text-slate-500" />
        <div className="mt-2 text-sm text-slate-600">
          Seret & letakkan file ke sini, atau
        </div>
        <button className="btn mt-3" onClick={() => inputRef.current?.click()}>
          Pilih File
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={onInput}
        />
        <div className="text-xs text-slate-400 mt-2">Maks 50MB per file.</div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Daftar File</h3>
          {loading && <div className="text-xs text-slate-500">Memuat…</div>}
        </div>

        {list.length === 0 ? (
          <div className="text-sm text-slate-500">
            Belum ada file yang diunggah.
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <div
                      className="truncate font-medium"
                      title={f.name || f.id}
                    >
                      {f.name || f.id}
                    </div>
                    <div className="text-xs text-slate-500">
                      {f.type || "unknown"} • {fmtSize(f.size)} •{" "}
                      {new Date(f.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    className="btn"
                    href={api.files.url(f.id)}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                  <button
                    className="btn border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    onClick={() => remove(f.id)}
                  >
                    <Trash2 className="w-4 h-4" /> Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
