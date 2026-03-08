const API = {
  //base: "http://localhost:4000/api",
  base: "https://appgabinete-32604191455.europe-southwest1.run.app/api",

  // ahora acepta params: { page, page_size, sort, order, q, filters: { campo: valor } }
  async fetchList(endpoint, page = 1, page_size = 50, params = {}) {
    const url = new URL(`${this.base}/${endpoint}`, window.location.origin);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(page_size));

    // standard parameters
    if (params.sort) url.searchParams.set("sort", params.sort);
    if (params.order) url.searchParams.set("order", params.order);
    if (params.q) url.searchParams.set("q", params.q);
    if (params.year) url.searchParams.set("year", String(params.year));
    if (params.quarter) url.searchParams.set("quarter", String(params.quarter));
    if (params.start_date) url.searchParams.set("start_date", params.start_date);
    if (params.end_date) url.searchParams.set("end_date", params.end_date);

    // custom top-level parameters (e.g. pagado) - include any that aren't already handled
    Object.entries(params).forEach(([k, v]) => {
      if (v == null) return;
      if (["sort","order","q","year","quarter","start_date","end_date","filters"].includes(k)) return;
      // avoid overriding if already set above
      url.searchParams.set(k, String(v));
    });

    // filters object (converted to filter_ prefix)
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

    if (Array.isArray(data)) {
      return { data: data, total: data.length };
    }
    // Check if it's the new format { data: [], total: N, aggregates: {} }
    if (data.data && Array.isArray(data.data)) {
      return {
        data: data.data,
        total: (typeof data.total === 'number' ? data.total : data.data.length),
        aggregates: data.aggregates || null
      };
    }

    // Fallback for other structures
    const arr = Object.values(data).find(v => Array.isArray(v));
    if (arr) return {
      data: arr,
      total: (typeof data.total === 'number' ? data.total : arr.length),
      aggregates: data.aggregates || null
    };
    return { data: [], total: 0 };
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
  },

  async fetchStats(subpath, params = {}) {
    const url = new URL(`${this.base}/stats/${subpath}`, window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined) url.searchParams.set(k, String(v));
    });

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

export default API;