// Gunakan env saat ada, jika tidak fallback ke '/api' (proxied oleh Vite)
const API_BASE = import.meta.env?.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE.replace(/\/+$/, "")
  : "/api";

// Helper JSON + error message yang jelas
const j = async (res) => {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const t = await res.text();
      msg = t || msg;
      if (/^\s*</.test(msg)) msg = `${res.status} ${res.statusText}`;
    } catch {}
    throw new Error(msg);
  }
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const api = {
  async health() {
    return j(await fetch(`${API_BASE}/health`));
  },
  async getSettings() {
    return j(await fetch(`${API_BASE}/settings`));
  },
  async setSettings(weights) {
    return j(
      await fetch(`${API_BASE}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights }),
      })
    );
  },
  async listTasks({
    q = "",
    status = "ALL",
    sortKey = "score",
    sortDir = "desc",
  } = {}) {
    const u = new URL(`${API_BASE}/tasks`, window.location.origin);
    if (q) u.searchParams.set("q", q);
    if (status) u.searchParams.set("status", status);
    if (sortKey) u.searchParams.set("sortKey", sortKey);
    if (sortDir) u.searchParams.set("sortDir", sortDir);
    return j(await fetch(u));
  },
  async createTask(input) {
    return j(
      await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  },
  async updateTask(id, input) {
    return j(
      await fetch(`${API_BASE}/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  },
  async markDone(id) {
    return j(await fetch(`${API_BASE}/tasks/${id}/done`, { method: "PATCH" }));
  },
  async removeTask(id) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204)
      throw new Error((await res.text()) || res.statusText);
    return true;
  },

  // Upload/Download (opsional)
  files: {
    async list() {
      return j(await fetch(`${API_BASE}/files`));
    },
    async upload(file) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/files`, {
        method: "POST",
        body: fd,
      });
      return j(res);
    },
    async remove(id) {
      return j(
        await fetch(`${API_BASE}/files/${encodeURIComponent(id)}`, {
          method: "DELETE",
        })
      );
    },
    url(id) {
      return `${API_BASE}/files/${encodeURIComponent(id)}`;
    },
  },
};
