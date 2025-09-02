import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * SelectField — dropdown kustom agar tidak overlap/terpotong oleh modal.
 * Props:
 *  - options: string[] | {label, value}[]
 *  - value: string
 *  - onChange: (value)=>void
 *  - placeholder?: string
 *  - searchable?: boolean (default: true)  <- bisa dimatikan untuk menghapus kotak cari
 */
export default function SelectField({
  options = [],
  value,
  onChange,
  placeholder = "Pilih…",
  searchable = true,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  const normalized = useMemo(() => {
    return options.map((opt) =>
      typeof opt === "string" ? { label: opt, value: opt } : opt
    );
  }, [options]);

  const selectedLabel = useMemo(() => {
    return normalized.find((o) => o.value === value)?.label ?? "";
  }, [normalized, value]);

  const filtered = useMemo(() => {
    if (!searchable) return normalized;
    const qq = q.trim().toLowerCase();
    return qq
      ? normalized.filter((o) => o.label.toLowerCase().includes(qq))
      : normalized;
  }, [normalized, q, searchable]);

  // Tutup jika klik di luar
  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Aksesibilitas: Escape
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const choose = (val) => {
    onChange?.(val);
    setOpen(false);
    btnRef.current?.focus();
  };

  return (
    <div className="relative" ref={rootRef}>
      {/* Tombol tampilan seperti <select> modern */}
      <button
        ref={btnRef}
        type="button"
        className="w-full bg-white border border-slate-200 rounded-xl px-3 pr-10 py-2 min-h-[44px] text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedLabel || <span className="text-slate-400">{placeholder}</span>}
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      </button>

      {/* Panel dropdown TETAP di dalam modal (absolute + z-tinggi + max-h) */}
      {open && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-[150] rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        >
          {/* Search di-nonaktifkan jika searchable=false */}
          {searchable && (
            <div className="p-2 border-b bg-white/95 backdrop-blur">
              <input
                className="input w-full"
                placeholder="Cari…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
            </div>
          )}

          <ul className="max-h-60 overflow-auto py-1" role="listbox">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-500">
                Tidak ada opsi
              </li>
            )}
            {filtered.map((opt) => {
              const active = opt.value === value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={active}
                  className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${
                    active ? "bg-sky-50 text-slate-900" : "text-slate-700"
                  }`}
                  onClick={() => choose(opt.value)}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="w-4 h-4 text-sky-600" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
