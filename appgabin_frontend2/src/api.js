const API = {
  base: "http://localhost:4000/api",

  // ahora acepta params: { page, page_size, sort, order, q, filters: { campo: valor } }
  async fetchList(endpoint, page = 1, page_size = 50, params = {}) {
    const url = new URL(`${this.base}/${endpoint}`, window.location.origin);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(page_size));

    if (params.sort) url.searchParams.set("sort", params.sort);
    if (params.order) url.searchParams.set("order", params.order);
    if (params.q) url.searchParams.set("q", params.q);

    if (params.filters && typeof params.filters === "object") {
      Object.entries(params.filters).forEach(([k, v]) => {
        if (v !== null && v !== undefined && String(v).trim() !== "") {
          url.searchParams.set(`filter_${k}`, String(v));
        }
      });
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `${res.status} ${res.statusText}`);
    }
    const data = await res.json().catch(async () => {
      const t = await res.text();
      throw new Error("Respuesta no JSON: " + t.slice(0, 200));
    });

    if (Array.isArray(data)) return data;
    const arr = Object.values(data).find(v => Array.isArray(v));
    if (arr) return arr;
    return [];
  },

  async fetchOne(endpoint, id) {
    const res = await fetch(`${this.base}/${endpoint}/${id}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async create(endpoint, payload) {
    const res = await fetch(`${this.base}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async update(endpoint, id, payload) {
    const res = await fetch(`${this.base}/${endpoint}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async remove(endpoint, id) {
    const res = await fetch(`${this.base}/${endpoint}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async postAction(endpoint, action, payload) {
    const res = await fetch(`${this.base}/${endpoint}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

export default API;