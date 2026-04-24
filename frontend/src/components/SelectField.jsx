import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

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
      typeof opt === "string" ? { label: opt, value: opt } : opt,
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

  // Escape
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
      {/* BUTTON */}
      <button
        ref={btnRef}
        type="button"
        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 pr-10 py-2 min-h-[44px] text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-200"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedLabel || <span className="text-slate-400">{placeholder}</span>}

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      </button>

      {/* DROPDOWN */}
      {open && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-[150] rounded-xl border border-slate-700 bg-slate-800 shadow-2xl overflow-hidden"
        >
          {/* SEARCH */}
          {searchable && (
            <div className="p-2 border-b border-slate-700 bg-slate-800">
              <input
                className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-200 px-3 py-2 focus:border-sky-500 focus:ring-sky-500"
                placeholder="Cari…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
            </div>
          )}

          {/* LIST */}
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
                  className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition ${
                    active
                      ? "bg-sky-900/40 text-sky-400"
                      : "text-slate-200 hover:bg-slate-700"
                  }`}
                  onClick={() => choose(opt.value)}
                >
                  <span>{opt.label}</span>

                  {active && <Check className="w-4 h-4 text-sky-400" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
