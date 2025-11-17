import React, { useEffect, useState, useRef } from "react";
import API from "../api";
import EntityForm from "./EntityForm";
import modelsMap from "../modelsMap";

export default function EntityList({ endpoint }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  // pagination & sorting & filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  // applied filters / search used by load()
  const [filters, setFilters] = useState({}); // { column: value }
  const [globalQ, setGlobalQ] = useState("");

  // local input buffers (do not trigger requests on each keystroke)
  const [filterInputs, setFilterInputs] = useState({});
  const [globalInput, setGlobalInput] = useState("");

  useEffect(() => {
    setItems([]);
    setColumns([]);
    setError(null);
    setEditing(null);
    setShowNew(false);
    setPage(1);
    setFilters({});
    setFilterInputs({});
    setGlobalQ("");
    setGlobalInput("");
    setSortField(null);
    setSortDir("asc");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, pageSize, sortField, sortDir, filters, globalQ]);

  async function load() {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const params = {
        sort: sortField || undefined,
        order: sortDir || undefined,
        q: globalQ || undefined,
        filters: filters && Object.keys(filters).length ? filters : undefined
      };
      console.debug(`[EntityList] fetching /api/${endpoint} page=${page} page_size=${pageSize} params=`, params);
      const data = await API.fetchList(endpoint, page, pageSize, params);
      if (reqId !== requestIdRef.current) return;

      const arr = Array.isArray(data) ? data : (Array.isArray(Object.values(data || {}).find(v => Array.isArray(v))) ? Object.values(data).find(v => Array.isArray(v)) : []);
      // client-side fallback filtering/sorting if backend didn't apply everything
      let final = arr || [];

      // apply column filters locally (fallback)
      Object.entries(filters || {}).forEach(([k, v]) => {
        if (v === null || v === undefined || String(v).trim() === "") return;
        final = final.filter(it => {
          const val = it[k];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(String(v).toLowerCase());
        });
      });

      // apply global search
      if (globalQ && String(globalQ).trim() !== "") {
        const q = String(globalQ).toLowerCase();
        final = final.filter(it => Object.values(it).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q)));
      }

      // client-side sort fallback
      if (sortField) {
        final = final.slice().sort((a,b) => {
          const va = a?.[sortField];
          const vb = b?.[sortField];
          if (va == null && vb == null) return 0;
          if (va == null) return sortDir === "asc" ? -1 : 1;
          if (vb == null) return sortDir === "asc" ? 1 : -1;
          if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
          return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
      }

      setItems(final);
      setHasMore(Array.isArray(final) && final.length >= pageSize);

      if (modelsMap[endpoint]) setColumns(modelsMap[endpoint]);
      else deriveColumns(arr || []);
    } catch (e) {
      console.error("[EntityList] error fetching", e);
      setItems([]);
      setColumns([]);
      setError(e.message || String(e));
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }

  function deriveColumns(data) {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        setColumns([]);
        return;
      }
      const keys = Array.from(new Set(data.flatMap(it => Object.keys(it))));
      const filtered = keys.filter(k => {
        if (k.startsWith("_")) return false;
        const sample = data.find(d => d[k] !== undefined)?.[k];
        if (sample && typeof sample === "object" && !Array.isArray(sample)) return false;
        return true;
      });
      const prefer = ["id", "nif", "NIF", "IDProducto", "IDPeriodo", "numeroFactura", "numero", "nombre", "descProducto", "fechaEmision", "fechaOperacion", "base", "total", "contacto_nif", "periodo_id", "producto_id", "idSesion"];
      const ordered = [...new Set([...prefer.filter(p => filtered.includes(p)), ...filtered])];
      setColumns(ordered.slice(0, 12));
    } catch (err) {
      setColumns([]);
    }
  }

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function onFilterInputChange(col, value) {
    setFilterInputs(f => ({ ...f, [col]: value }));
  }

  function onFilterInputKeyDown(col, e) {
    if (e.key === "Enter") {
      // apply this column filter
      const val = (filterInputs[col] ?? "").trim();
      setFilters(f => {
        const next = { ...f, [col]: val };
        // remove empty filters
        if (val === "") { delete next[col]; }
        return next;
      });
      setPage(1);
      // load will be triggered by useEffect on filters change, but call explicitly to be immediate
      setTimeout(() => load(), 0);
    }
    if (e.key === "Escape") {
      // clear input and filter for this column
      setFilterInputs(f => ({ ...f, [col]: "" }));
      setFilters(f => { const next = { ...f }; delete next[col]; return next; });
      setPage(1);
      setTimeout(() => load(), 0);
    }
  }

  function onGlobalInputChange(v) {
    setGlobalInput(v);
  }

  function onGlobalInputKeyDown(e) {
    if (e.key === "Enter") {
      const q = (globalInput ?? "").trim();
      setGlobalQ(q);
      setPage(1);
      setTimeout(() => load(), 0);
    }
    if (e.key === "Escape") {
      setGlobalInput("");
      setGlobalQ("");
      setPage(1);
      setTimeout(() => load(), 0);
    }
  }

  function startEdit(item) { setEditing(item); }
  function startNew() { setShowNew(true); }

  // pass keepStringFields for contactos to avoid numeric coercion
  const contactosKeep = ["NIF", "codigoPostal", "CodigoPostal", "codigo_postal", "CP", "postal_code"];

  async function saveEdit(payload) {
    try {
      const idKey = getIdKey(editing || payload);
      const idVal = (editing && (editing[idKey] ?? editing.id)) ?? (payload[idKey] ?? payload.id);
      await API.update(endpoint, idVal, payload);
      setEditing(null);
      load();
    } catch (e) {
      alert("Error saving: " + (e.message || e));
    }
  }

  async function createNew(payload) {
    try {
      await API.create(endpoint, payload);
      setShowNew(false);
      load();
    } catch (e) {
      alert("Error creating: " + (e.message || e));
    }
  }

  function getIdKey(item) {
    if (!item) {
      const map = modelsMap[endpoint];
      if (map && map.length) {
        if (map.includes("NIF")) return "NIF";
        if (map.includes("IDProducto")) return "IDProducto";
        if (map.includes("IDPeriodo")) return "IDPeriodo";
        if (map.includes("numeroFactura")) return "numeroFactura";
        if (map.includes("idSesion")) return "idSesion";
      }
      return "id";
    }
    if (item.id !== undefined) return "id";
    if (item.NIF !== undefined) return "NIF";
    if (item.IDProducto !== undefined) return "IDProducto";
    if (item.IDPeriodo !== undefined) return "IDPeriodo";
    if (item.numeroFactura !== undefined) return "numeroFactura";
    if (item.idSesion !== undefined) return "idSesion";
    const keys = Object.keys(item);
    const candidate = keys.find(k => k.toLowerCase() === "nif" || k.toLowerCase().endsWith("id") || k.toLowerCase().endsWith("_id"));
    return candidate ?? keys[0];
  }

  async function remove(item) {
    if (!confirm("Borrar?")) return;
    const idKey = getIdKey(item);
    const idVal = item[idKey];
    try {
      await API.remove(endpoint, idVal);
      load();
    } catch (e) {
      alert("Error deleting: " + (e.message || e));
    }
  }

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
        <div style={{display:"flex", gap:12, alignItems:"center"}}>
          <strong style={{fontSize:16}}>{endpoint.toUpperCase()}</strong>

          <div>
            <label className="muted" style={{marginRight:6}}>Page:</label>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>«</button>
            <span style={{margin:"0 8px"}}>{page}</span>
            <button onClick={() => { if (hasMore) setPage(p => p+1); else setPage(p => p+1); }} disabled={loading || (items.length===0 && page>1 && !hasMore)}>»</button>
          </div>

          <div style={{marginLeft:12}}>
            <label className="muted" style={{marginRight:6}}>Page size:</label>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* buscador global solo para Contactos (requerimiento) */}
          {endpoint === "contactos" && (
            <div style={{marginLeft:12}}>
              <input
                placeholder="Buscar contactos... (Enter)"
                value={globalInput}
                onChange={e => onGlobalInputChange(e.target.value)}
                onKeyDown={onGlobalInputKeyDown}
              />
            </div>
          )}
        </div>

        <div>
          <button onClick={load}>Refrescar</button>
          <button style={{marginLeft:8}} className="primary" onClick={() => setShowNew(true)}>Nuevo</button>
        </div>
      </div>

      {error && (
        <div className="card" style={{background:"#fff6f6", border:"1px solid #fecaca", color:"#9f1239", marginBottom:12}}>
          <strong>Error al cargar {endpoint}:</strong>
          <div style={{marginTop:6, fontFamily:"monospace"}}>{error}</div>
        </div>
      )}

      {loading ? <div className="card">Cargando...</div> : (
        <>
          {(!items || items.length === 0) ? (
            <div className="card"><em className="muted">No hay elementos para "{endpoint}".</em>
              <div style={{marginTop:8}} className="pretty-json">Última respuesta: {items && items.length===0 ? "[]" : JSON.stringify(items, null, 2)}</div>
            </div>
          ) : (
            <>
              {columns.length === 0 ? (
                <div className="card">
                  <em>Vista (JSON)</em>
                  {items.map((it, idx) => (
                    <div key={idx} style={{marginBottom:10}}>
                      <div className="pretty-json">{JSON.stringify(it, null, 2)}</div>
                      <div style={{marginTop:6}}>
                        <button onClick={() => startEdit(it)}>Editar</button>
                        <button style={{marginLeft:8}} onClick={() => remove(it)}>Borrar</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      {columns.map(c => (
                        <th key={c} style={{cursor:"pointer"}} onClick={() => toggleSort(c)}>
                          {c} {sortField === c ? (sortDir === "asc" ? "▲" : "▼") : ""}
                          <div>
                            {/* filtro por columna: aplicar al pulsar Enter */}
                            <input
                              style={{width:140, marginTop:6}}
                              placeholder={`Filtrar ${c} (Enter)`}
                              value={filterInputs[c] ?? filters[c] ?? ""}
                              onChange={e => onFilterInputChange(c, e.target.value)}
                              onKeyDown={e => onFilterInputKeyDown(c, e)}
                            />
                          </div>
                        </th>
                      ))}
                      <th style={{width:160}}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        {columns.map(c => (<td key={c}>{ renderCell(it[c]) }</td>))}
                        <td style={{whiteSpace:"nowrap"}}>
                          <button onClick={() => startEdit(it)}>Editar</button>
                          <button style={{marginLeft:8}} onClick={() => remove(it)}>Borrar</button>
                          <button style={{marginLeft:8}} onClick={() => alert(JSON.stringify(it, null, 2))}>Ver</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Editar</h3>
            <EntityForm
              columns={columns.length ? columns : Object.keys(editing)}
              item={editing}
              onSave={saveEdit}
              onCancel={() => setEditing(null)}
              isNew={false}
              keepStringFields={endpoint === "contactos" ? contactosKeep : []}
            />
          </div>
        </div>
      )}

      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nuevo</h3>
            <EntityForm
              columns={columns.length ? columns : ["nombre"]}
              item={{}}
              onSave={createNew}
              onCancel={() => setShowNew(false)}
              isNew={true}
              keepStringFields={endpoint === "contactos" ? contactosKeep : []}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function renderCell(value) {
  if (value === null || value === undefined) return <span className="muted">—</span>;
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number" || typeof value === "string") {
    const s = String(value);
    if (s.length > 160) return <div className="pretty-json">{s.slice(0,160)}{s.length>160?"…":""}</div>;
    return s;
  }
  try { return <div className="pretty-json">{JSON.stringify(value, null, 2)}</div>; } catch { return String(value); }
}