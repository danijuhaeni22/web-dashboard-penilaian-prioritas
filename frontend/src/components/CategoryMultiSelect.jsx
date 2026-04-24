import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Search, ChevronDown } from "lucide-react";

export default function CategoryMultiSelect({
  categories = [],
  selected = [],
  onChange,
  onAddCategory,
  onDeleteCategory,
  isDeletable,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState(selected);
  const draftRef = useRef(draft);
  const rootRef = useRef(null);

  const setDraftSync = (updater) => {
    setDraft((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      draftRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    if (open) {
      const init = [...selected];
      draftRef.current = init;
      setDraft(init);
    }
  }, [open]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (open && e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s
      ? categories.filter((c) => c.toLowerCase().includes(s))
      : categories;
  }, [categories, q]);

  const exists = (name) =>
    categories.map((c) => c.toLowerCase()).includes(name.trim().toLowerCase());

  const toggle = (name) => {
    setDraftSync((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const add = () => {
    const name = q.trim();
    if (!name) return;
    if (!exists(name)) onAddCategory?.(name);
    setDraftSync((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setQ("");
  };

  const applyAndClose = () => {
    onChange?.([...draftRef.current]);
    setOpen(false);
  };

  const onTriggerKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
    }
  };

  return (
    <div className="w-full relative" ref={rootRef}>
      {/* TRIGGER */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 pr-10 py-2 min-h-[44px] text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-200 flex flex-wrap items-center gap-2"
      >
        {selected.length === 0 && (
          <span className="text-slate-400 text-sm">Pilih kategori…</span>
        )}

        {selected.map((tag) => (
          <span key={tag} className="chip">
            {tag}
            <button
              type="button"
              className="ml-1 text-slate-400 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(selected.filter((s) => s !== tag));
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      </div>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-[150] rounded-xl border border-slate-700 bg-slate-800 shadow-2xl overflow-hidden">
          {/* HEADER */}
          <div className="p-3 border-b border-slate-700 bg-slate-800 sticky top-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-200 pl-9 px-3 py-2 focus:border-sky-500 focus:ring-sky-500"
                  placeholder="Cari / tambah kategori…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add();
                    }
                  }}
                />
              </div>

              <button
                type="button"
                className="btn btn-primary whitespace-nowrap"
                onClick={add}
                disabled={!q.trim()}
              >
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>

            {q.trim() && !exists(q) && (
              <div className="text-xs text-slate-400 mt-2">
                Kategori baru akan dibuat: <b>{q.trim()}</b>
              </div>
            )}
          </div>

          {/* LIST */}
          <div className="max-h-60 overflow-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {filtered.length === 0 && (
              <div className="col-span-2 text-sm text-slate-500 p-3">
                Tidak ada kategori.
              </div>
            )}

            {filtered.map((name) => {
              const checked = draft.includes(name);
              const deletable = isDeletable ? isDeletable(name) : true;

              return (
                <div
                  key={name}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 border transition ${
                    checked
                      ? "border-sky-500 bg-sky-900/30"
                      : "border-transparent hover:bg-slate-700"
                  }`}
                >
                  <label className="flex items-center gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-800"
                      checked={checked}
                      onChange={() => toggle(name)}
                    />
                    <span
                      className={`${
                        checked
                          ? "font-medium text-slate-100"
                          : "text-slate-300"
                      }`}
                    >
                      {name}
                    </span>
                  </label>

                  <button
                    type="button"
                    className={`p-1 rounded ${
                      deletable
                        ? "text-slate-400 hover:text-red-400 hover:bg-slate-700"
                        : "text-slate-600 cursor-not-allowed"
                    }`}
                    disabled={!deletable}
                    onClick={() => deletable && onDeleteCategory?.(name)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="p-3 border-t border-slate-700 bg-slate-800 sticky bottom-0 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setOpen(false)}
            >
              Batal
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={applyAndClose}
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
