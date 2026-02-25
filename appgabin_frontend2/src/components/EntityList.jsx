import React, { useEffect, useState, useRef } from "react";
import API from "../api";
import EntityForm from "./EntityForm";
import modelsMap from "../modelsMap";
import ActionMenu from "./ActionMenu";

export default function EntityList({ endpoint }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [externalViewing, setExternalViewing] = useState(null); // { item, endpoint }
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set()); // Set of selected IDs
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneTargetPeriod, setCloneTargetPeriod] = useState("");
  const [periodOptions, setPeriodOptions] = useState([]);

  function getColField(c) { return typeof c === 'object' ? c.field : c; }
  function getColLabel(c) { return typeof c === 'object' ? (c.label || c.field) : c; }
  function getColWidth(c) {
    if (typeof c !== 'object') return "auto";
    return c.widthList || c.width || "auto";
  }

  function getTitleValue(item, cols) {
    if (!item || !cols) return "";

    // Sesión: Sesion + Nombre Contacto + Producto + Periodo
    if (endpoint === "sesiones") {
      const nombre = item.nombreContacto || "";
      let producto = item.IDProducto || "";
      let periodo = item.IDPeriodo || "";

      // Try to get descriptions from fieldOptions
      if (fieldOptions.productos) {
        const prod = fieldOptions.productos.find(p => p.IDProducto === item.IDProducto);
        if (prod) producto = prod.descProducto || prod.IDProducto;
      }
      if (fieldOptions.periodos) {
        const peri = fieldOptions.periodos.find(p => p.IDPeriodo === item.IDPeriodo);
        if (peri) periodo = peri.descPeriodo || peri.IDPeriodo;
      }

      return `Sesión: ${nombre} - ${producto} - ${periodo}`;
    }

    // Factura: Factura + Nº Factura + Contacto
    if (endpoint === "facturas") {
      const num = item.numeroFactura || "";
      const nom = item.nombreContacto || "";
      return `Factura: ${num} ${nom}`.trim();
    }

    const titleCol = cols.find(c => typeof c === 'object' && c.isTitle);
    if (titleCol) {
      const val = item[titleCol.field];
      if (val) return val;
    }
    // Fallback
    const fallback = cols.find(c => {
      const f = getColField(c);
      return typeof item[f] === 'string' && (f.toLowerCase().includes("nombre") || f.toLowerCase().includes("desc") || f.toLowerCase().includes("alias"));
    });
    if (fallback) return item[getColField(fallback)];
    return "";
  }

  // pagination & sorting & filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [totalItems, setTotalItems] = useState(0);

  // applied filters / search used by load()
  const [filters, setFilters] = useState({}); // { column: value }
  const [globalQ, setGlobalQ] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterPeriod, setFilterPeriod] = useState(""); // Q1-Q4 or M1-M12
  const [filterFacturado, setFilterFacturado] = useState('all'); // 'all', 'true', 'false'

  // local input buffers (do not trigger requests on each keystroke)
  const [filterInputs, setFilterInputs] = useState({});
  const [globalInput, setGlobalInput] = useState("");

  useEffect(() => {
    setItems([]);
    setColumns([]);
    setError(null);
    setEditing(null);
    setViewing(null);
    setShowNewWithOptions(false);
    setPage(1);
    setPage(1);
    setTotalItems(0);
    setSelectedIds(new Set());
    setShowCloneModal(false);
    setCloneTargetPeriod("");
    setFilters({});
    setFilterInputs({});
    setFilters({});
    setFilterInputs({});
    setGlobalQ("");
    setGlobalInput("");
    setFilterYear(new Date().getFullYear().toString());
    setFilterPeriod("");
    setSortField(null);
    setSortDir("asc");
    setShowNewWithOptions(false);
    setEditing(null);
    setViewing(null);
    setExternalViewing(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, pageSize, sortField, sortDir, filters, globalQ, filterYear, filterPeriod, filterFacturado]);

  const [aggregates, setAggregates] = useState(null);

  async function load() {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      // Calculate date range from year and period
      let start_date, end_date;
      if (filterYear) {
        const dateRange = calculateDateRange(filterYear, filterPeriod);
        start_date = dateRange.start;
        end_date = dateRange.end;
      }

      const params = {
        sort: sortField || undefined,
        order: sortDir || undefined,
        q: globalQ || undefined,
        filters: {
          ...(filters && Object.keys(filters).length ? filters : {}),
          ...(endpoint === 'sesiones' && filterFacturado !== 'all' ? { facturado: filterFacturado } : {})
        },
        start_date: start_date || undefined,
        end_date: end_date || undefined
      };
      const result = await API.fetchList(endpoint, page, pageSize, params);
      if (reqId !== requestIdRef.current) return;

      const arr = result.data || [];
      const totalCount = result.total || 0;
      setTotalItems(totalCount);
      setAggregates(result.aggregates || null);

      setItems(arr);
      setHasMore(Array.isArray(arr) && arr.length >= pageSize);

      if (modelsMap[endpoint]) setColumns(modelsMap[endpoint]);
      else deriveColumns(arr || []);
    } catch (e) {
      console.error("[EntityList] error fetching", e);
      setItems([]);
      setColumns([]);
      setAggregates(null);
      setError(e.message || String(e));
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }

  function calculateDateRange(year, period) {
    /**
     * Calculate start and end dates for a given year and period.
     * Period can be:
     * - Q1, Q2, Q3, Q4 (quarters)
     * - M1, M2, ..., M12 (months)
     * - Empty/Null: Full year
     * Returns dates in DD-MM-YYYY format.
     */
    const y = parseInt(year);
    if (!period) {
      // Full year
      return {
        start: `01-01-${y}`,
        end: `31-12-${y}`
      };
    }

    let startMonth, endMonth, startDay, endDay;

    if (period.startsWith('Q')) {
      // Quarter
      const quarter = parseInt(period.substring(1));
      startMonth = (quarter - 1) * 3 + 1;
      endMonth = startMonth + 2;
      startDay = 1;
      // Last day of the third month
      endDay = new Date(y, endMonth, 0).getDate();
    } else if (period.startsWith('M')) {
      // Month
      const month = parseInt(period.substring(1));
      startMonth = month;
      endMonth = month;
      startDay = 1;
      // Last day of the month
      endDay = new Date(y, month, 0).getDate();
    } else {
      return { start: null, end: null };
    }

    // Format as DD-MM-YYYY
    const pad = (n) => String(n).padStart(2, '0');
    const start = `${pad(startDay)}-${pad(startMonth)}-${y}`;
    const end = `${pad(endDay)}-${pad(endMonth)}-${y}`;

    return { start, end };
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
      // load will be triggered by useEffect on filters change
    }
    if (e.key === "Escape") {
      // clear input and filter for this column
      setFilterInputs(f => ({ ...f, [col]: "" }));
      setFilters(f => { const next = { ...f }; delete next[col]; return next; });
      setPage(1);
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
    }
    if (e.key === "Escape") {
      setGlobalInput("");
      setGlobalQ("");
      setPage(1);
    }
  }

  const [fieldOptions, setFieldOptions] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showNewWithOptions, setShowNewWithOptions] = useState(false);

  async function loadFieldOptions(cols) {
    if (!cols || !cols.length) {
      console.log("[EntityList] loadFieldOptions called with empty cols");
      return;
    }
    // Get unique sources that haven't been loaded yet
    const sourcesToLoad = new Set();
    cols.forEach(c => {
      if (c.source && !fieldOptions[c.source]) {
        sourcesToLoad.add(c.source);
      }
    });

    console.log("[EntityList] loadFieldOptions. Sources to load:", Array.from(sourcesToLoad));
    console.log("[EntityList] Current fieldOptions state:", fieldOptions);

    if (sourcesToLoad.size === 0) {
      console.log("[EntityList] All sources already loaded");
      return;
    }

    setLoadingOptions(true);
    const newOptions = {};
    for (const source of sourcesToLoad) {
      try {
        console.log(`[EntityList] fetching options for ${source}...`);
        const result = await API.fetchList(source, 1, 1000);
        console.log(`[EntityList] raw result for ${source}:`, result);

        // API.fetchList returns { data: [], total: N }
        let list = result.data;
        if (!Array.isArray(list)) {
          console.warn(`[EntityList] ${source} returned non-array data:`, result);
          list = Array.isArray(result) ? result : [];
        }

        console.log(`[EntityList] loaded ${list.length} options for ${source}:`, list);
        newOptions[source] = list;
      } catch (err) {
        console.error(`Error loading options for ${source}:`, err);
        // Even if error, set empty array so we don't retry
        newOptions[source] = [];
      }
    }
    console.log("[EntityList] Setting fieldOptions:", newOptions);
    setFieldOptions(prev => {
      const updated = { ...prev, ...newOptions };
      console.log("[EntityList] fieldOptions updated to:", updated);
      return updated;
    });
    setLoadingOptions(false);
  }

  async function startEdit(item) {
    try {
      console.log("[EntityList] startEdit called for item:", item);
      const cols = modelsMap[endpoint] || [];
      if (cols.length) {
        await loadFieldOptions(cols);
      }
      setEditing(item);
    } catch (err) {
      console.error("[EntityList] Error in startEdit:", err);
      setEditing(null);
      alert("Error abriendo formulario: " + (err.message || err));
    }
  }

  async function startView(item) {
    try {
      console.log("[EntityList] startView called for item:", item);
      const cols = modelsMap[endpoint] || [];
      if (cols.length) {
        await loadFieldOptions(cols);
      }
      setViewing(item);
    } catch (err) {
      console.error("[EntityList] Error in startView:", err);
      setViewing(null);
      alert("Error abriendo vista: " + (err.message || err));
    }
  }

  async function startNew() {
    try {
      console.log("[EntityList] startNew called for endpoint:", endpoint);

      // IMPORTANT: Always use modelsMap for new form, not columns (which may be empty)
      const cols = modelsMap[endpoint] || [];
      console.log("[EntityList] columns from modelsMap:", cols.length, "columns");

      if (cols.length) {
        console.log("[EntityList] loading field options for sources:", cols.filter(c => c.source).map(c => c.source));
        setLoadingOptions(true);
        await loadFieldOptions(cols);
        console.log("[EntityList] field options loaded");
        setLoadingOptions(false);
        // Only show the modal after options are loaded
        setShowNewWithOptions(true);
      } else {
        console.warn("[EntityList] No columns found for endpoint:", endpoint);
        setShowNewWithOptions(true);
      }
    } catch (err) {
      console.error("[EntityList] Error in startNew:", err);
      setLoadingOptions(false);
      alert("Error abriendo formulario: " + (err.message || err));
    }
  }

  async function handleViewExternal(targetEndpoint, idValue) {
    try {
      console.log(`[EntityList] handleViewExternal for ${targetEndpoint}: ${idValue}`);
      const item = await API.fetchOne(targetEndpoint, idValue);
      const cols = modelsMap[targetEndpoint] || [];
      if (cols.length) {
        await loadFieldOptions(cols);
      }
      setExternalViewing({ item, endpoint: targetEndpoint });
    } catch (err) {
      console.error("[EntityList] Error in handleViewExternal:", err);
      alert("Error cargando elemento externo: " + (err.message || err));
    }
  }

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
      setShowNewWithOptions(false);
      load();
    } catch (e) {
      alert("Error creating: " + (e.message || e));
    }
  }

  function getIdKey(item) {
    if (!item) {
      const map = modelsMap[endpoint];
      if (map && map.length) {
        // map is an array of objects, need to check field names
        const fields = map.map(c => getColField(c));
        if (fields.includes("idSesion")) return "idSesion";
        if (fields.includes("numeroFactura")) return "numeroFactura";
        if (fields.includes("NIF")) return "NIF";
        if (fields.includes("IDProducto")) return "IDProducto";
        if (fields.includes("IDPeriodo")) return "IDPeriodo";
      }
      return "id";
    }
    if (item.idSesion !== undefined) return "idSesion";
    if (item.id !== undefined) return "id";
    if (item.numeroFactura !== undefined) return "numeroFactura";
    if (item.NIF !== undefined) return "NIF";
    // unique keys usually top priority. Foreign keys like below should be last fallback
    if (item.IDProducto !== undefined && endpoint === "productos") return "IDProducto";
    if (item.IDPeriodo !== undefined && endpoint === "periodos") return "IDPeriodo";

    // fallback
    if (item.IDProducto !== undefined) return "IDProducto";
    if (item.IDPeriodo !== undefined) return "IDPeriodo";

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

  // Selection Logic
  function toggleSelectAll() {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      const allIds = items.map(it => it[getIdKey(it)]);
      setSelectedIds(new Set(allIds));
    }
  }

  function toggleSelect(item) {
    const id = item[getIdKey(item)];
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  const [cloningItem, setCloningItem] = useState(null);

  async function openCloneModal(item = null) {
    if (!item && selectedIds.size === 0) return;
    try {
      setCloningItem(item);
      // Load periods if not loaded
      const periods = await API.fetchList("periodos", 1, 1000);
      setPeriodOptions(periods.data || periods); // handle {data:[], total:N} or []
      setShowCloneModal(true);
    } catch (e) {
      alert("Error loading periods: " + e.message);
    }
  }

  async function confirmClone() {
    if (!cloneTargetPeriod) {
      alert("Selecciona un periodo destino");
      return;
    }
    const ids = cloningItem
      ? [cloningItem[getIdKey(cloningItem)]]
      : Array.from(selectedIds);

    try {
      const res = await API.postAction(endpoint, "clone", {
        ids: ids,
        target_period_id: cloneTargetPeriod
      });
      alert(`Clonado completado.\nCreados: ${res.created}\nOmitidos (duplicados): ${res.skipped}`);
      setShowCloneModal(false);
      setCloningItem(null);
      setSelectedIds(new Set());
      load();
    } catch (e) {
      alert("Error clonando: " + e.message);
    }
  }

  async function confirmBilling(item = null) {
    const itemsToBill = item ? [item] : Array.from(selectedIds).map(id => items.find(it => it[getIdKey(it)] == id)).filter(Boolean);

    if (itemsToBill.length === 0) return;

    const msg = itemsToBill.length === 1
      ? "¿Facturar esta sesión?"
      : `¿Facturar ${itemsToBill.length} sesiones seleccionadas?`;

    if (!confirm(msg)) return;

    try {
      const payload = itemsToBill.map(it => ({
        idSesion: it.idSesion,
        totalAFacturar: it.total
      }));

      const res = await API.postAction(endpoint, "facturar", payload);
      alert(`Facturación completada.\nCreadas: ${res.created}\nOmitidas (duplicadas): ${res.skipped}`);
      setSelectedIds(new Set());
      load();
    } catch (e) {
      alert("Error facturando: " + e.message);
    }
  }


  return (
    <div>
      <div className="entity-list-header">
        <div className="entity-list-title-group">
          <strong className="entity-list-title">{endpoint.toUpperCase()}</strong>
          {selectedIds.size > 0 && (
            <span style={{ marginLeft: 12, fontSize: 14, color: "var(--primary-1)", background: "#e0e7ff", padding: "2px 8px", borderRadius: 4 }}>
              {selectedIds.size} seleccionados
            </span>
          )}
        </div>

        <div className="pagination-group">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} title="Previous page">«</button>
          <span>{page}</span>
          <button onClick={() => { if (hasMore) setPage(p => p + 1); else setPage(p => p + 1); }} disabled={loading || (items.length === 0 && page > 1 && !hasMore)} title="Next page">»</button>

          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} title="Items per page">
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span style={{ marginLeft: 8, fontSize: "0.9em", color: "#666" }}>
            Mostrando {Math.min((page - 1) * pageSize + 1, totalItems)} - {Math.min(page * pageSize, totalItems)} de {totalItems}
          </span>
        </div>

        <div className="entity-list-actions">
          <button onClick={load}>Refrescar</button>
          <button className="primary" onClick={startNew}>Nuevo</button>
        </div>
      </div>

      <div className="static-filters-bar" style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap'
      }}>
        <div className="search-container" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
          <input
            className="search-input"
            style={{ width: '100%' }}
            placeholder={`🔍 Buscar en ${endpoint}...`}
            value={globalInput}
            onChange={e => onGlobalInputChange(e.target.value)}
            onKeyDown={onGlobalInputKeyDown}
          />
        </div>

        {endpoint === "sesiones" && (
          <select
            value={filterFacturado}
            onChange={(e) => { setFilterFacturado(e.target.value); setPage(1); }}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', minWidth: '180px' }}
          >
            <option value="all">Filtro Facturación: Todos</option>
            <option value="true">Solo Facturados</option>
            <option value="false">Solo No Facturados</option>
          </select>
        )}

        {(endpoint === "sesiones" || endpoint === "facturas") && (
          <div className="filter-group" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }} title="Filtrar por Año" style={{ padding: "8px", borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <option value="">Año</option>
              {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={filterPeriod} onChange={e => { setFilterPeriod(e.target.value); setPage(1); }} title="Filtrar por Periodo" style={{ padding: "8px", borderRadius: '6px', border: '1px solid #e2e8f0', minWidth: 120 }}>
              <option value="">Periodo</option>
              <optgroup label="Trimestres">
                <option value="Q1">Trimestre 1</option>
                <option value="Q2">Trimestre 2</option>
                <option value="Q3">Trimestre 3</option>
                <option value="Q4">Trimestre 4</option>
              </optgroup>
              <optgroup label="Meses">
                <option value="M1">Enero</option>
                <option value="M2">Febrero</option>
                <option value="M3">Marzo</option>
                <option value="M4">Abril</option>
                <option value="M5">Mayo</option>
                <option value="M6">Junio</option>
                <option value="M7">Julio</option>
                <option value="M8">Agosto</option>
                <option value="M9">Septiembre</option>
                <option value="M10">Octubre</option>
                <option value="M11">Noviembre</option>
                <option value="M12">Diciembre</option>
              </optgroup>
            </select>
          </div>
        )}

        {endpoint === "sesiones" && selectedIds.size > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            {(() => {
              const hasBilled = Array.from(selectedIds).some(id => {
                const item = items.find(it => it[getIdKey(it)] == id);
                return item && item.facturado === true;
              });
              return (
                <button
                  onClick={() => confirmBilling()}
                  disabled={hasBilled}
                  title={hasBilled ? "No se pueden facturar sesiones que ya están facturadas" : ""}
                  style={{
                    background: hasBilled ? "#94a3b8" : "#059669",
                    color: "white",
                    borderColor: hasBilled ? "#94a3b8" : "#059669",
                    cursor: hasBilled ? "not-allowed" : "pointer"
                  }}
                >
                  💰 Facturar
                </button>
              );
            })()}
            <button onClick={() => openCloneModal()} style={{ background: "#0f172a", color: "white", borderColor: "#0f172a" }}>
              ⚡ Clonar
            </button>
          </div>
        )}
      </div>

      {
        error && (
          <div className="card" style={{ background: "#fff6f6", border: "1px solid #fecaca", color: "#9f1239", marginBottom: 12 }}>
            <strong>Error al cargar {endpoint}:</strong>
            <div style={{ marginTop: 6, fontFamily: "monospace" }}>{error}</div>
          </div>
        )
      }

      {
        aggregates && (
          <div style={{
            background: "#f1f5f9",
            padding: "10px 16px",
            borderRadius: 8,
            marginBottom: 12,
            display: "flex",
            gap: 20,
            fontSize: 14,
            fontWeight: 600,
            border: "1px solid var(--border)",
            color: "var(--text)"
          }}>
            <span style={{ color: "var(--muted)" }}>RESUMEN:</span>
            {Object.entries(aggregates).map(([k, v]) => {
              const label = k === 'base' ? 'BASE' : k === 'total' ? 'TOTAL' : k === 'totalPagado' ? 'PAGADO' : k === 'pendiente' ? 'PENDIENTE' : k.toUpperCase();
              return (
                <div key={k} style={{ display: "flex", gap: 6 }}>
                  <span style={{ color: "var(--muted)" }}>{label}:</span>
                  <span style={{ color: "var(--primary-1)" }}>
                    {v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </span>
                </div>
              );
            })}
          </div>
        )
      }

      {
        loading ? <div className="card">Cargando...</div> : (
          <>
            {(!items || items.length === 0) ? (
              <div className="card"><em className="muted">No hay elementos para "{endpoint}".</em>
                <div style={{ marginTop: 8 }} className="pretty-json">Última respuesta: {items && items.length === 0 ? "[]" : JSON.stringify(items, null, 2)}</div>
              </div>
            ) : (
              <>
                {columns.length === 0 ? (
                  <div className="card">
                    <em>Vista (JSON)</em>
                    {items.map((it, idx) => (
                      <div key={idx} style={{ marginBottom: 10 }}>
                        <div className="pretty-json">{JSON.stringify(it, null, 2)}</div>
                        <div style={{ marginTop: 6 }}>
                          <button onClick={() => startEdit(it)}>Editar</button>
                          <button style={{ marginLeft: 8 }} onClick={() => remove(it)}>Borrar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          {endpoint === "sesiones" && (
                            <th style={{ width: 40, textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={items.length > 0 && selectedIds.size === items.length}
                                onChange={toggleSelectAll}
                              />
                            </th>
                          )}
                          {columns.filter(col => (typeof col !== 'object' || (col.type !== 'separator' && col.type !== 'title' && col.hideInList !== true))).map(col => {
                            const c = getColField(col);
                            const label = getColLabel(col);
                            const width = getColWidth(col);
                            return (
                              <th key={c} style={{ cursor: "pointer", width: width, minWidth: width !== "auto" ? width : undefined }} onClick={() => toggleSort(c)}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  {label} {sortField === c ? (sortDir === "asc" ? "▲" : "▼") : <span style={{ opacity: 0.3 }}>⇅</span>}
                                </div>
                              </th>
                            );
                          })}
                          <th style={{ width: 160 }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={idx} className={selectedIds.has(it[getIdKey(it)]) ? "row-selected" : ""}>
                            {endpoint === "sesiones" && (
                              <td style={{ textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(it[getIdKey(it)])}
                                  onChange={() => toggleSelect(it)}
                                />
                              </td>
                            )}
                            {columns.filter(col => (typeof col !== 'object' || (col.type !== 'separator' && col.type !== 'title' && col.hideInList !== true))).map(col => {
                              const c = getColField(col);
                              const val = it[c];
                              // Custom renderer for Facturado status
                              if (c === 'facturado') {
                                if (val === true) return <td key={c} style={{ textAlign: 'center', fontSize: '18px' }} title="FACTURADO">✅</td>;
                                return <td key={c} style={{ textAlign: 'center', color: '#94a3b8' }}>—</td>;
                              }
                              return <td key={c}>{renderCell(val)}</td>
                            })}
                            <td style={{ whiteSpace: "nowrap" }}>
                              <ActionMenu
                                onEdit={() => startEdit(it)}
                                onDelete={() => remove(it)}
                                onView={() => startView(it)}
                                canEdit={
                                  endpoint === "sesiones"
                                    ? (it.facturado !== true && it.numeroFactura == null)
                                    : endpoint !== "facturas"
                                }
                                canDelete={
                                  endpoint === "sesiones"
                                    ? (it.facturado !== true && it.numeroFactura == null)
                                    : endpoint !== "facturas"
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )
      }

      {
        editing && (
          <div className="modal-backdrop" onClick={() => setEditing(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{getTitleValue(editing, columns)}</h3>
              <EntityForm
                columns={columns.length ? columns : Object.keys(editing)}
                item={editing}
                onSave={saveEdit}
                onCancel={() => setEditing(null)}
                isNew={false}
                keepStringFields={endpoint === "contactos" ? contactosKeep : []}
                fieldOptions={fieldOptions}
                onViewExternal={handleViewExternal}
              />
            </div>
          </div>
        )
      }

      {
        showNewWithOptions && (
          <div className="modal-backdrop" onClick={() => setShowNewWithOptions(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Nuevo {endpoint.slice(0, -1)}</h3>
              {loadingOptions ? (
                <div style={{ padding: "20px", textAlign: "center" }}>Cargando opciones...</div>
              ) : (
                <EntityForm
                  columns={modelsMap[endpoint] || []}
                  item={{}}
                  onSave={createNew}
                  onCancel={() => setShowNewWithOptions(false)}
                  isNew={true}
                  keepStringFields={endpoint === "contactos" ? contactosKeep : []}
                  fieldOptions={fieldOptions}
                />
              )}
            </div>
          </div>
        )
      }

      {
        viewing && (
          <div className="modal-backdrop" onClick={() => setViewing(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{getTitleValue(viewing, columns)}</h3>
              <EntityForm
                columns={modelsMap[endpoint] || columns || Object.keys(viewing)}
                item={viewing}
                onCancel={() => setViewing(null)}
                readOnly={true}
                endpoint={endpoint}
                fieldOptions={fieldOptions}
                onClone={(item) => {
                  setViewing(null);
                  openCloneModal(item);
                }}
                onInvoice={(item) => {
                  setViewing(null);
                  confirmBilling(item);
                }}
                onViewExternal={handleViewExternal}
              />
            </div>
          </div>
        )
      }
      {
        externalViewing && (
          <div className="modal-backdrop" onClick={() => setExternalViewing(null)} style={{ zIndex: 1100 }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{getTitleValue(externalViewing.item, modelsMap[externalViewing.endpoint])}</h3>
              <EntityForm
                columns={modelsMap[externalViewing.endpoint] || []}
                item={externalViewing.item}
                onCancel={() => setExternalViewing(null)}
                readOnly={true}
                endpoint={externalViewing.endpoint}
                fieldOptions={fieldOptions}
              />
            </div>
          </div>
        )
      }
      {
        showCloneModal && (
          <div className="modal-backdrop" onClick={() => setShowCloneModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
              <h3>Clonar Sesiones</h3>
              <p>Se clonarán {selectedIds.size} sesiones seleccionadas.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                <label>Periodo Destino:</label>
                <select
                  value={cloneTargetPeriod}
                  onChange={e => setCloneTargetPeriod(e.target.value)}
                  style={{ width: "100%", padding: 8 }}
                >
                  <option value="">-- Seleccionar --</option>
                  {Array.isArray(periodOptions) && periodOptions.map(p => (
                    <option key={p.IDPeriodo} value={p.IDPeriodo}>
                      {p.descPeriodo} ({p.IDPeriodo})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setShowCloneModal(false); setCloningItem(null); }}>Cancelar</button>
                <button className="primary" onClick={confirmClone} disabled={!cloneTargetPeriod}>Confirmar</button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
function renderCell(value) {
  if (value === null || value === undefined) return <span className="muted">—</span>;
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number" || typeof value === "string") {
    const s = String(value);
    if (s.length > 160) return <div className="pretty-json">{s.slice(0, 160)}{s.length > 160 ? "…" : ""}</div>;
    return s;
  }
  try { return <div className="pretty-json">{JSON.stringify(value, null, 2)}</div>; } catch { return String(value); }
}