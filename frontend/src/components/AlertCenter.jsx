import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  X,
  History,
  Check,
  Circle,
  CircleCheck,
} from "lucide-react";
import dayjs from "../lib/dayjs";

/** Penyimpanan lokal */
const STORAGE_KEY = "prioritas-alerts-v1";
function loadAlerts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveAlerts(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

export default function AlertCenter({ tasks = [], onNotify }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState(loadAlerts());

  const unread = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);
  const icon =
    unread > 0 ? (
      <BellRing className="w-5 h-5" />
    ) : (
      <Bell className="w-5 h-5" />
    );

  // ===== Util =====
  const upsertOverdueAlert = (t) => {
    setAlerts((prev) => {
      const exists = prev.some(
        (a) => a.type === "overdue" && a.taskId === t.id
      );
      if (exists) return prev;
      const item = {
        id: `al_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: "overdue",
        taskId: t.id,
        title: t.title,
        dueISO: t.dueISO,
        owner: t.owner || "",
        createdAtISO: new Date().toISOString(),
        read: false,
      };
      const next = [item, ...prev].slice(0, 500);
      saveAlerts(next);
      return next;
    });
  };

  const markAllRead = () => {
    setAlerts((prev) => {
      const next = prev.map((a) => ({ ...a, read: true }));
      saveAlerts(next);
      return next;
    });
  };
  const clearAll = () => {
    if (!confirm("Hapus semua histori alert?")) return;
    saveAlerts([]);
    setAlerts([]);
  };
  const markRead = (id) => {
    setAlerts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, read: true } : a));
      saveAlerts(next);
      return next;
    });
  };
  const toggleRead = (id) => {
    setAlerts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, read: !a.read } : a));
      saveAlerts(next);
      return next;
    });
  };

  // Hapus alert yang terkait tugas yang SUDAH DUE & SUDAH SELESAI
  const cleanCompletedAlerts = (tasksList) => {
    const now = dayjs();
    const completedDueIds = new Set(
      tasksList
        .filter(
          (t) =>
            t &&
            t.dueISO &&
            t.status === "Selesai" &&
            dayjs(t.dueISO).isBefore(now)
        )
        .map((t) => t.id)
    );
    if (!completedDueIds.size) return;
    setAlerts((prev) => {
      const next = prev.filter(
        (a) => !(a.type === "overdue" && completedDueIds.has(a.taskId))
      );
      if (next.length !== prev.length) saveAlerts(next);
      return next;
    });
  };

  // ====== Toast logic: tampilkan toast merah jika ada overdue (rate-limited per kombinasi ID) ======
  const lastKeyRef = useRef(""); // simpan kombinasi ID overdue terakhir yang sudah di-toast
  const toastIfNeeded = (overdueList) => {
    const key = overdueList
      .map((t) => t.id)
      .sort()
      .join("|");
    if (!key) {
      lastKeyRef.current = ""; // reset ketika tidak ada overdue sama sekali
      return;
    }
    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      const msg =
        overdueList.length === 1
          ? `Overdue: ${overdueList[0].title}`
          : `${overdueList.length} tugas Overdue`;
      onNotify?.({ text: msg, variant: "error" }); // 🔴 TOAST MERAH
    }
  };

  // Saat daftar tugas (TAK TERFILTER) berubah
  useEffect(() => {
    const now = dayjs();
    const overdueNow = tasks.filter(
      (t) =>
        t && t.dueISO && t.status !== "Selesai" && dayjs(t.dueISO).isBefore(now)
    );

    // pastikan alert tersimpan di riwayat
    overdueNow.forEach(upsertOverdueAlert);

    // tampilkan toast (rate-limited berdasar kombinasi id)
    toastIfNeeded(overdueNow);

    // bersihkan alert untuk tugas selesai & sudah due
    cleanCompletedAlerts(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // Cek berkala — update riwayat + toast bila ada perubahan state overdue
  useEffect(() => {
    const id = setInterval(() => {
      const now = dayjs();
      const overdueNow = tasks.filter(
        (t) =>
          t &&
          t.dueISO &&
          t.status !== "Selesai" &&
          dayjs(t.dueISO).isBefore(now)
      );
      overdueNow.forEach(upsertOverdueAlert);
      toastIfNeeded(overdueNow);
      cleanCompletedAlerts(tasks);
    }, 30000);
    return () => clearInterval(id);
  }, [tasks]); // eslint-disable-line

  // Sinkronkan ke localStorage
  useEffect(() => {
    saveAlerts(alerts);
  }, [alerts]);

  return (
    <>
      <button
        className="relative inline-flex items-center gap-2 btn"
        aria-label="Buka pusat alert"
        onClick={() => setOpen(true)}
        title="Pusat Alert"
      >
        {unread > 0 ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none rounded-full px-1.5 py-1 shadow">
            {unread}
          </span>
        )}
        <span className="hidden sm:inline">Alert</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[140] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div className="flex items-center gap-2 font-semibold">
                <History className="w-5 h-5" /> Riwayat Alert
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {alerts.length === 0 ? (
                <div className="text-slate-500 text-sm">Belum ada alert.</div>
              ) : (
                <ul className="space-y-2 max-h-[60vh] overflow-auto">
                  {alerts.map((a) => (
                    <li
                      key={a.id}
                      className={`rounded-xl border p-3 bg-white transition-colors ${
                        a.read
                          ? "border-slate-200"
                          : "border-red-200 bg-red-50/40"
                      }`}
                      onClick={() => markRead(a.id)}
                      title={
                        a.read ? "Sudah dibaca" : "Klik untuk tandai dibaca"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {a.type === "overdue" ? "Tugas Overdue" : "Alert"}
                            {!a.read ? (
                              <span className="inline-flex items-center text-red-600 text-xs">
                                <Circle className="w-3 h-3 mr-1" /> Belum dibaca
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-slate-400 text-xs">
                                <CircleCheck className="w-3 h-3 mr-1" /> Dibaca
                              </span>
                            )}
                          </div>
                          <div className="text-sm mt-0.5">
                            <span className="font-semibold">{a.title}</span>
                            {a.owner ? (
                              <span className="text-slate-500">
                                {" "}
                                • PJ: {a.owner}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Due:{" "}
                            {a.dueISO
                              ? dayjs(a.dueISO).format(
                                  "DD MMM YYYY HH:mm [WIB]"
                                )
                              : "—"}{" "}
                            • Dibuat:{" "}
                            {a.createdAtISO
                              ? dayjs(a.createdAtISO).format(
                                  "DD MMM YYYY HH:mm [WIB]"
                                )
                              : "—"}
                          </div>
                        </div>

                        <span className="badge badge-red whitespace-nowrap">
                          Overdue
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-5 py-3 border-t bg-white flex items-center justify-end gap-2">
              <button className="btn" onClick={markAllRead}>
                Tandai semua dibaca
              </button>
              <button className="btn" onClick={() => setOpen(false)}>
                Tutup
              </button>
              <button
                className="btn border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                onClick={clearAll}
              >
                Hapus histori
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
