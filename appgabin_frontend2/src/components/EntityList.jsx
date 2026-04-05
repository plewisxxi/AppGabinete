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
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getAvatarColor = (name) => {
    const colors = ["#4f46e5", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set()); // Set of selected IDs
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneTargetPeriod, setCloneTargetPeriod] = useState("");
  const [periodOptions, setPeriodOptions] = useState([]);

  // --- Memoria Feature State ---
  const [showMemoriaModal, setShowMemoriaModal] = useState(false);
  const [memoriaStartDate, setMemoriaStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(0);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [memoriaEndDate, setMemoriaEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(11);
    d.setDate(31);
    return d.toISOString().split('T')[0];
  });

  async function generateMemoria() {
    if (selectedIds.size !== 1) return;
    const contactId = Array.from(selectedIds)[0];
    const contact = items.find(it => it[getIdKey(it)] === contactId);
    if (!contact) return;

    try {
      setLoading(true);
      
      const formatApiDate = (dateStr) => {
        const [y, m, d] = dateStr.split('-');
        return `${d}-${m}-${y}`;
      };

      const params = {
        filters: { NIFCliente: contact.NIF, facturado: true },
        start_date: formatApiDate(memoriaStartDate),
        end_date: formatApiDate(memoriaEndDate),
        page_size: 1000
      };
      
      const resSesiones = await API.fetchList('sesiones', 1, 1000, params);
      const facturas = resSesiones.data || [];

      // Sort facturas chronologically
      facturas.sort((a, b) => new Date(a.fechaOperacion || 0) - new Date(b.fechaOperacion || 0));

      const templateRes = await fetch('/plantilla_memoria/Plantilla_anvmemoriagabinete.html');
      if (!templateRes.ok) throw new Error("Plantilla HTML no encontrada en el servidor");
      let html = await templateRes.text();

      // Fix relative images mapping to the public folder
      html = html.replace(/src="images\//g, 'src="/plantilla_memoria/images/');

      html = html.replace(/{{NOMBRE}}/g, contact.Nombre || '');
      html = html.replace(/{{DNI}}/g, contact.NIF || '');

      // Force line break in punto 1 before the image box
      html = html.replace(
        /domicilio\):\s*<\/span>\s*<span style="overflow:\s*hidden;\s*display:\s*inline-block;/g,
        'domicilio):</span><br><br><span style="overflow: hidden; display: block; text-align: center;'
      );

      const today = new Date();
      const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const dateStr = `${today.getDate()} de ${meses[today.getMonth()]} de ${today.getFullYear()}`;
      
      html = html.replace(/\{\{fecha_dia\}\}\s*de\s*Julio\s*de\s*2025/ig, dateStr);
      html = html.replace(/\{\{fecha_dia\}\}/g, today.getDate());

      const parser = new DOMParser();
      
      // Grouping based on Producto
      const facturasRP = facturas.filter(f => (f.IDProducto && f.IDProducto.includes('RP')) || (f.concepto && f.concepto.toLowerCase().includes('pedagogica')));
      const facturasRLH = facturas.filter(f => (f.IDProducto && f.IDProducto.includes('RLH')) || (f.concepto && f.concepto.toLowerCase().includes('lenguaje')));
      const facturasPEAC = facturas.filter(f => (f.IDProducto && f.IDProducto.includes('PEAC')) || (f.concepto && f.concepto.toLowerCase().includes('altas capacidades')));

      const extractMonthYear = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
           return `${meses[parseInt(parts[1], 10) - 1]} ${parts[2]}`;
        }
        return dateStr;
      };

      let finalHtml = html;
      const processCategory = (prefix, list) => {
        let total = 0;
        for (let i = 1; i <= 12; i++) {
          const f = list[i - 1];
          if (f) {
            finalHtml = finalHtml.replace(new RegExp(`{{${prefix}_PER_${i}}}`, 'g'), extractMonthYear(f.fechaOperacion));
            finalHtml = finalHtml.replace(new RegExp(`{{${prefix}_FR_${i}}}`, 'g'), f.numeroFactura || '');
            finalHtml = finalHtml.replace(new RegExp(`{{${prefix}_FEC_${i}}}`, 'g'), f.fechaPago || '');
            finalHtml = finalHtml.replace(new RegExp(`{{${prefix}_IMP_${i}}}`, 'g'), (parseFloat(f.totalPagado) || 0).toFixed(2) + '€');
            total += (parseFloat(f.totalPagado) || 0);
          } else {
            finalHtml = finalHtml.replace(new RegExp(`{{${prefix}_PER_${i}}}`, 'g'), '&nbsp;');
            finalHtml = finalHtml.replace(new RegExp(`{{${prefix}_FR_${i}}}`, 'g'), '&nbsp;');
            finalHtml = finalHtml.replace(new RegExp(`{{${prefix}_FEC_${i}}}`, 'g'), '&nbsp;');
            finalHtml = finalHtml.replace(new RegExp(`{{${prefix}_IMP_${i}}}`, 'g'), '&nbsp;');
          }
        }
        finalHtml = finalHtml.replace(new RegExp(`{{${prefix}_TOTAL}}`, 'g'), total.toFixed(2) + '€');
        return list.length > 0;
      };

      const hasRP = processCategory('RP', facturasRP);
      const hasRLH = processCategory('RLH', facturasRLH);
      const hasPEAC = processCategory('PEAC', facturasPEAC);

      const finalDoc = parser.parseFromString(finalHtml, 'text/html');
      
      // Fix page breaks
      const hrs = Array.from(finalDoc.querySelectorAll('hr'));
      hrs.forEach(hr => {
        if (hr.style.pageBreakBefore === 'always') {
          hr.outerHTML = '<div class="html2pdf__page-break"></div>';
        }
      });
      
      const removeTableByMarker = (markerText) => {
        const ps = Array.from(finalDoc.querySelectorAll('p, span, td'));
        const markerP = ps.find(p => p.textContent && p.textContent.includes(markerText));
        if (markerP) {
          const table = markerP.closest('table');
          if (table) {
            let prev = table.previousElementSibling;
            while(prev && prev.tagName !== 'TABLE' && !(prev.tagName === 'DIV' && prev.className.includes('html2pdf__page-break'))) {
               const pprev = prev.previousElementSibling;
               prev.remove();
               prev = pprev;
            }
            if (prev && prev.tagName === 'DIV' && prev.className.includes('html2pdf__page-break')) {
               prev.remove();
            }

            let next = table.nextElementSibling;
            while(next && next.tagName !== 'TABLE' && !(next.tagName === 'DIV' && next.className.includes('html2pdf__page-break'))) {
               const nnext = next.nextElementSibling;
               next.remove();
               next = nnext;
            }

            table.remove();
          }
        }
      };

      if (!hasRP) removeTableByMarker('3.1');
      if (!hasRLH) removeTableByMarker('3.2');
      if (!hasPEAC) removeTableByMarker('3.3');

      // Enforce nowrap on all table cells to preserve paragraph alignment
      const tds = Array.from(finalDoc.querySelectorAll('td'));
      tds.forEach(td => {
        td.style.whiteSpace = 'nowrap';
      });

      const fileName = `Memoria_2026_${contact.Nombre}`;
      
      // Add print-specific CSS so the page breaks added for html2pdf work natively
      // AND force background colors/shading to appear in the PDF
      const cssPrint = `
        <style>
          @media print { 
            .html2pdf__page-break { page-break-before: always; }
            .no-print { display: none !important; }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
          .close-overlay-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            background: #ef4444;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 16px;
            font-family: sans-serif;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        </style>
      `;
      
      // Detectar si es dispositivo móvil para aplicar el fix de impresión
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const closeButtonHtml = isMobile ? `<button onclick="window.frameElement.remove()" class="close-overlay-btn no-print">Cerrar Vista Previa</button>` : '';

      const fullHtmlString = '<!DOCTYPE html>\n<html><head><title>' + fileName + '</title>' + 
                             finalDoc.head.innerHTML + cssPrint +
                             '</head><body>' + closeButtonHtml + finalDoc.body.innerHTML + '</body></html>';
      
      // Create iframe. On mobile, visible/fullscreen logic. On desktop, hidden logic.
      const printIframe = document.createElement('iframe');
      if (isMobile) {
        printIframe.style.position = 'fixed';
        printIframe.style.top = '0';
        printIframe.style.left = '0';
        printIframe.style.width = '100%';
        printIframe.style.height = '100%';
        printIframe.style.zIndex = '2147483647';
        printIframe.style.backgroundColor = '#ffffff';
      } else {
        printIframe.style.position = 'absolute';
        printIframe.style.top = '-10000px';
        printIframe.style.left = '-10000px';
      }
      printIframe.style.border = 'none';
      document.body.appendChild(printIframe);
      
      printIframe.contentWindow.document.open();
      printIframe.contentWindow.document.write(fullHtmlString);
      printIframe.contentWindow.document.close();
      
      // Wait for resources (fonts, images) to load before printing
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Los navegadores usan el título de la página principal (no el iframe) 
      // para el nombre de archivo por defecto al "Guardar como PDF".
      const originalTitle = document.title;
      document.title = fileName;

      const cleanupPrint = () => {
        document.title = originalTitle;
        setTimeout(() => {
          if (document.body.contains(printIframe)) {
            document.body.removeChild(printIframe);
          }
        }, 1000);
      };

      printIframe.contentWindow.addEventListener('afterprint', cleanupPrint);
      
      printIframe.contentWindow.focus();
      try {
        printIframe.contentWindow.print();
      } catch (err) {
        console.warn("Error al abrir diálogo de impresión", err);
        cleanupPrint();
      }
      
      setShowMemoriaModal(false);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      alert('Error generando memoria: ' + err.message);
    } finally {
      setLoading(false);
    }
  }
  // --- End Memoria Feature State ---

  function getColField(c) { return typeof c === 'object' ? c.field : c; }
  function getColLabel(c) { return typeof c === 'object' ? (c.label || c.field) : c; }
  function getColWidth(c) {
    if (typeof c !== 'object') return "auto";
    return c.widthList || c.width || "auto";
  }

  function getTitleValue(item, cols, typeOverride) {
    if (!item || !cols) return "";
    const type = typeOverride || endpoint;

    // Sesión: Sesion + Nombre Contacto + Producto + Periodo
    if (type === "sesiones") {
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
    if (type === "facturas") {
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
  const [filterPagado, setFilterPagado] = useState('all'); // 'all', 'true', 'false'

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
    setFilterFacturado('all');
    setFilterPagado('all');
    setSortField(null);
    setSortDir("asc");
    setShowNewWithOptions(false);
    setEditing(null);
    setViewing(null);
    setExternalViewing(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, pageSize, sortField, sortDir, filters, globalQ, filterYear, filterPeriod, filterFacturado, filterPagado]);

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
        // pagado is a special top-level filter for gastos endpoint
        ...(endpoint === 'gastos' && filterPagado !== 'all' ? { pagado: filterPagado } : {}),
        filters: {
          ...(filters && Object.keys(filters).length ? filters : {}),
          ...(endpoint === 'sesiones' && filterFacturado !== 'all' ? { facturado: filterFacturado } : {})
        },
        start_date: start_date || undefined,
        end_date: end_date || undefined
      };
      console.log("[EntityList] loading with params", params);
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
      if (isMobile) setShowMobileFilters(false);
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

  async function createNew(payload, keepOpen = false) {
    try {
      await API.create(endpoint, payload);
      alert("Elemento creado exitosamente.");
      if (!keepOpen) {
        setShowNewWithOptions(false);
      }
      load();
    } catch (e) {
      alert("Error creating: " + (e.message || e));
      throw e;
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


  async function confirmPayment(item = null) {
    const itemsToPay = item ? [item] : Array.from(selectedIds).map(id => items.find(it => it[getIdKey(it)] == id)).filter(Boolean);

    if (itemsToPay.length === 0) return;

    const msg = itemsToPay.length === 1
      ? "¿Marcar este gasto como pagado?"
      : `¿Marcar ${itemsToPay.length} gastos seleccionados como pagados?`;

    if (!confirm(msg)) return;

    try {
      const ids = itemsToPay.map(it => it[getIdKey(it)]);
      await API.postAction(endpoint, "pay", { ids });
      alert(`Pago registrado correctamente para ${itemsToPay.length} gastos.`);
      setSelectedIds(new Set());
      if (editing || viewing) {
        setEditing(null);
        setViewing(null);
      }
      load();
    } catch (e) {
      alert("Error registrando pago: " + e.message);
    }
  }

  return (
    <div>
      <div className="entity-list-header">
        <div className="entity-list-title-group">
          <strong className="entity-list-title">{endpoint.toUpperCase()}</strong>
          {selectedIds.size > 0 && (
            <span className="selection-badge">
              {selectedIds.size} seleccionados
            </span>
          )}
        </div>

        <div className="pagination-group">
          <div className="pagination-buttons">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} title="Previous page">«</button>
            <span className="page-number">{page}</span>
            <button onClick={() => { if (hasMore) setPage(p => p + 1); else setPage(p => p + 1); }} disabled={loading || (items.length === 0 && page > 1 && !hasMore)} title="Next page">»</button>
          </div>

          {!isMobile && (
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} title="Items per page">
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}

          <span className="pagination-text">
            {isMobile ? `${Math.min((page - 1) * pageSize + 1, totalItems)}-${Math.min(page * pageSize, totalItems)} de ${totalItems}` : `Mostrando ${Math.min((page - 1) * pageSize + 1, totalItems)} - ${Math.min(page * pageSize, totalItems)} de ${totalItems}`}
          </span>
        </div>

        <div className="entity-list-actions">
          {isMobile && (
            <button
              className="filter-toggle-btn"
              onClick={() => setShowMobileFilters(true)}
              title="Mostrar Filtros"
            >
              🔍
            </button>
          )}
          <button onClick={load} title="Refrescar" className={`refresh-btn ${isMobile ? 'icon-only' : ''}`}>
            {isMobile ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24" />
                <polyline points="21 3 21 8 16 8" />
              </svg>
            ) : "Refrescar"}
          </button>
          <button className={`primary ${isMobile ? 'mobile-new-btn' : ''}`} onClick={startNew}>Nuevo</button>
        </div>
      </div>

      <div className={`static-filters-bar ${isMobile ? 'mobile-popup' : ''} ${isMobile && showMobileFilters ? 'show' : ''}`} style={!isMobile ? {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap'
      } : {}}>
        {isMobile && (
          <div className="mobile-filter-header">
            <strong>Filtros y Búsqueda</strong>
            <button onClick={() => setShowMobileFilters(false)}>✕</button>
          </div>
        )}
        <div className="search-container" style={{ flex: isMobile ? 'none' : 1, minWidth: isMobile ? '100%' : '200px', margin: 0 }}>
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
          <div style={{ display: 'flex', gap: isMobile ? '8px' : '16px', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', background: 'white', padding: isMobile ? '12px 10px' : '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', minHeight: isMobile ? '48px' : 'auto' }}>
            <div style={{ display: 'flex', gap: isMobile ? '16px' : '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: isMobile ? '15px' : '14px' }}>
                <input
                  type="checkbox"
                  style={{ width: isMobile ? '18px' : 'auto', height: isMobile ? '18px' : 'auto' }}
                  checked={filterFacturado === 'true'}
                  onChange={() => {
                    setFilterFacturado(filterFacturado === 'true' ? 'all' : 'true');
                    setPage(1);
                  }}
                />
                Facturados
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: isMobile ? '15px' : '14px' }}>
                <input
                  type="checkbox"
                  style={{ width: isMobile ? '18px' : 'auto', height: isMobile ? '18px' : 'auto' }}
                  checked={filterFacturado === 'false'}
                  onChange={() => {
                    setFilterFacturado(filterFacturado === 'false' ? 'all' : 'false');
                    setPage(1);
                  }}
                />
                No Facturados
              </label>
            </div>
          </div>
        )}

        {endpoint === "gastos" && (
          <div style={{ display: 'flex', gap: isMobile ? '8px' : '16px', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', background: 'white', padding: isMobile ? '12px 10px' : '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', minHeight: isMobile ? '48px' : 'auto' }}>
            <div style={{ display: 'flex', gap: isMobile ? '16px' : '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: isMobile ? '15px' : '14px' }}>
                <input
                  type="checkbox"
                  style={{ width: isMobile ? '18px' : 'auto', height: isMobile ? '18px' : 'auto' }}
                  checked={filterPagado === 'true'}
                  onChange={() => {
                    setFilterPagado(filterPagado === 'true' ? 'all' : 'true');
                    setPage(1);
                  }}
                />
                Pagados
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: isMobile ? '15px' : '14px' }}>
                <input
                  type="checkbox"
                  style={{ width: isMobile ? '18px' : 'auto', height: isMobile ? '18px' : 'auto' }}
                  checked={filterPagado === 'false'}
                  onChange={() => {
                    setFilterPagado(filterPagado === 'false' ? 'all' : 'false');
                    setPage(1);
                  }}
                />
                No Pagados
              </label>
            </div>
          </div>
        )}

        {(endpoint === "sesiones" || endpoint === "facturas" || endpoint === "gastos") && (
          <div className="filter-group" style={{ display: "flex", gap: isMobile ? 8 : 6, alignItems: "center" }}>
            <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }} title="Filtrar por Año" style={{ padding: isMobile ? "10px" : "8px", borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: isMobile ? "15px" : "14px", height: isMobile ? "44px" : "auto", flex: isMobile ? 1 : 'none' }}>
              <option value="">Año</option>
              {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={filterPeriod} onChange={e => { setFilterPeriod(e.target.value); setPage(1); }} title="Filtrar por Periodo" style={{ padding: isMobile ? "10px" : "8px", borderRadius: '6px', border: '1px solid #e2e8f0', minWidth: isMobile ? 140 : 120, fontSize: isMobile ? "15px" : "14px", height: isMobile ? "44px" : "auto", flex: isMobile ? 2 : 'none' }}>
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

        {(endpoint === "sesiones" || endpoint === "gastos" || endpoint === "contactos") && selectedIds.size > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            {endpoint === "contactos" && selectedIds.size === 1 && (
              <button onClick={() => setShowMemoriaModal(true)} style={{ background: "#0284c7", color: "white", borderColor: "#0284c7" }}>
                📄 Crear Memoria
              </button>
            )}

            {endpoint === "sesiones" && (() => {
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

            {endpoint === "gastos" && (() => {
              const hasPaid = Array.from(selectedIds).some(id => {
                const item = items.find(it => it[getIdKey(it)] == id);
                return item && (parseFloat(item.total) || 0) === (parseFloat(item.totalPagado) || 0);
              });
              return (
                <button
                  onClick={() => confirmPayment()}
                  disabled={hasPaid}
                  title={hasPaid ? "No se pueden pagar gastos que ya están pagados" : ""}
                  style={{
                    background: hasPaid ? "#94a3b8" : "#059669",
                    color: "white",
                    borderColor: hasPaid ? "#94a3b8" : "#059669",
                    cursor: hasPaid ? "not-allowed" : "pointer"
                  }}
                >
                  💳 Pagar
                </button>
              );
            })()}

            {(endpoint === "sesiones" || endpoint === "gastos") && (
              <button onClick={() => openCloneModal()} style={{ background: "#0f172a", color: "white", borderColor: "#0f172a" }}>
                ⚡ Clonar
              </button>
            )}
          </div>
        )}

        {isMobile && (
          <button 
            className="primary" 
            style={{ width: '100%', marginTop: isMobile ? '8px' : 'auto', padding: '14px' }}
            onClick={() => setShowMobileFilters(false)}
          >
            Ver Resultados
          </button>
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
          <div className="aggregates-bar">
            {Object.entries(aggregates).filter(([k]) => k !== 'base').map(([k, v]) => {
              const label = k === 'total' ? 'TOTAL' : k === 'totalPagado' ? 'PAGADO' : k === 'pendiente' ? 'PENDIENTE' : k.toUpperCase();
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
        loading && (!items || items.length === 0) ? <div className="card">Cargando...</div> : (
          <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s', pointerEvents: loading ? 'none' : 'auto' }}>
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
                    <table className={`table card-table ${endpoint === 'contactos' ? 'contactos-table' : ''} ${endpoint === 'facturas' ? 'facturas-table' : ''} ${endpoint === 'sesiones' ? 'sesiones-table' : ''}`}>
                      <thead>
                        <tr>
                          {(!isMobile || endpoint !== "contactos") && (endpoint === "sesiones" || endpoint === "gastos" || endpoint === "contactos") && (
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
                          <th style={{ width: (isMobile && endpoint === 'contactos') ? 60 : 160, textAlign: 'center' }}>
                            {(isMobile && endpoint === 'contactos') ? '' : 'Acciones'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => {
                          const id = it[getIdKey(it)];
                          const isSelected = selectedIds.has(id);
                          
                          // Long press logic for mobile
                          let timer;
                          const handleTouchStart = () => {
                            if (!isMobile || endpoint !== 'contactos') return;
                            timer = setTimeout(() => {
                              toggleSelect(it);
                              if (navigator.vibrate) navigator.vibrate(50);
                            }, 600);
                          };
                          const handleTouchEnd = () => {
                            clearTimeout(timer);
                          };

                          if (isMobile && endpoint === 'sesiones') {
                            return (
                              <tr key={idx} className={`session-card-mobile-final ${isSelected ? "selected-row" : ""}`}>
                                <td className="session-compact-td-final">
                                  {/* Line 1: Date (Left), Total (Center, red/green), ID (Right) */}
                                  <div className="session-line session-line-1">
                                    <span className="session-date"><strong>{it.fechaOperacion || "—"}</strong></span>
                                    <span className="session-total-main" style={{ color: it.facturado ? '#059669' : '#dc2626' }}><strong>{renderCell(it.total)}€</strong></span>
                                    <span className="session-id">ID: <strong>{it.idSesion}</strong></span>
                                  </div>
                                  
                                  {/* Line 2: Nombre contacto (Left, Bold) */}
                                  <div className="session-line session-line-2">
                                    <span className="session-contact-name"><strong>{it.nombreContacto || "N/A"}</strong></span>
                                  </div>
                                  
                                  {/* Line 3: Concepto (Left, Uppercase) */}
                                  <div className="session-line session-line-3">
                                    <span className="session-concept-text">{it.concepto ? it.concepto.toUpperCase() : "SIN CONCEPTO"}</span>
                                  </div>
                                  
                                  {/* Billing Info — only when invoiced */}
                                  {it.facturado && (
                                    <div className="session-billing-section-modern">
                                      <div className="session-line billing-header-blue">
                                        DATOS DE FACTURACIÓN
                                      </div>
                                      <div className="billing-details-summary-box">
                                        <div className="billing-summary-item">
                                          <span className="summary-label">Nº:</span>
                                          <span className="summary-value"><strong>{it.numeroFactura || "N/A"}</strong></span>
                                        </div>
                                        <div className="billing-summary-item">
                                          <span className="summary-label">Pago:</span>
                                          <span className="summary-value"><strong>{it.fechaPago || "N/A"}</strong></span>
                                        </div>
                                        <div className="billing-summary-item">
                                          <span className="summary-label">Total:</span>
                                          <span className="summary-value"><strong>{renderCell(it.totalPagado)}€</strong></span>
                                        </div>
                                      </div>
                                    </div>
                                  )}


                                  <div className="session-actions-final">
                                    <ActionMenu
                                      onEdit={() => startEdit(it)}
                                      onDelete={() => remove(it)}
                                      onView={() => startView(it)}
                                      canEdit={(it.facturado !== true && it.numeroFactura == null)}
                                      canDelete={(it.facturado !== true && it.numeroFactura == null)}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          if (isMobile && endpoint === 'contactos') {
                            return (
                              <tr 
                                key={idx} 
                                className={`selected-row-mobile ${isSelected ? "selected-row" : ""}`}
                                onPointerDown={handleTouchStart}
                                onPointerUp={handleTouchEnd}
                                onPointerLeave={handleTouchEnd}
                              >
                                <td className="contact-compact-td">
                                  <div className="contact-top-row">
                                    <div className="contact-avatar" style={{ background: getAvatarColor(it.Nombre) }}>
                                      {(it.Nombre || "?")[0].toUpperCase()}
                                    </div>
                                    <div className="contact-name">{it.Nombre}</div>
                                  </div>
                                  <div className="contact-bottom-row">
                                    <div className="contact-nif">{it.NIF}</div>
                                    <div className="contact-actions-minimal">
                                      <ActionMenu
                                        onEdit={() => startEdit(it)}
                                        onDelete={() => remove(it)}
                                        onView={() => startView(it)}
                                        canEdit={true}
                                        canDelete={true}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          if (isMobile && endpoint === 'facturas') {
                            return (
                              <tr key={idx} className={`factura-card-mobile ${isSelected ? "selected-row" : ""}`}>
                                <td className="factura-compact-td">
                                  {/* Line 1: Numero (Left), Total (Center), Fecha Emision (Right) */}
                                  <div className="factura-line factura-line-1">
                                    <span className="factura-number"><strong>{it.numeroFactura || "—"}</strong></span>
                                    <span className="factura-total-main"><strong>{renderCell(it.total)}€</strong></span>
                                    <span className="factura-date"><strong>{renderCell(it.fechaEmision)}</strong></span>
                                  </div>
                                  
                                  {/* Line 2: Contacto (Full Width) */}
                                  <div className="factura-line factura-line-2">
                                    <span className="factura-contact-name"><strong>{it.nombreContacto || "—"}</strong></span>
                                  </div>
                                  
                                  {/* Line 3: Concepto (Full Width) */}
                                  <div className="factura-line factura-line-3">
                                    <span className="factura-concept-text">{it.concepto ? it.concepto.toUpperCase() : "SIN CONCEPTO"}</span>
                                  </div>
                                  
                                  <div className="factura-actions">

                                    <ActionMenu
                                      onEdit={() => startEdit(it)}
                                      onDelete={() => remove(it)}
                                      onView={() => startView(it)}
                                      canEdit={false}
                                      canDelete={false}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={idx} className={isSelected ? "selected-row" : ""}>
                              {(endpoint === "sesiones" || endpoint === "gastos" || endpoint === "contactos") && (
                                <td data-label="Seleccionar" style={{ textAlign: "center" }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelect(it)}
                                  />
                                </td>
                              )}
                              {columns.filter(col => (typeof col !== 'object' || (col.type !== 'separator' && col.type !== 'title' && col.hideInList !== true))).map(col => {
                                const c = getColField(col);
                                const label = getColLabel(col);
                                const val = it[c];
                                // Custom renderer for Facturado status
                                if (c === 'facturado') {
                                  if (val === true) return <td key={c} data-label={label} style={{ textAlign: 'center', fontSize: '18px' }} title="FACTURADO">✅</td>;
                                  return <td key={c} data-label={label} style={{ textAlign: 'center', color: '#94a3b8' }}>—</td>;
                                }
                                return <td key={c} data-label={label}>{renderCell(val)}</td>
                              })}
                              <td data-label="Acciones" style={{ whiteSpace: "nowrap" }}>
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )
      }

      {
        editing && (
          <div className="modal-backdrop" onClick={() => setEditing(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{getTitleValue(editing, columns, endpoint)}</h3>
              <EntityForm
                columns={columns.length ? columns : Object.keys(editing)}
                item={editing}
                onSave={saveEdit}
                onCancel={() => setEditing(null)}
                isNew={false}
                keepStringFields={endpoint === "contactos" ? contactosKeep : []}
                fieldOptions={fieldOptions}
                onViewExternal={handleViewExternal}
                onPay={confirmPayment}
                endpoint={endpoint}
              />
            </div>
          </div>
        )
      }

      {
        showNewWithOptions && (
          <div className="modal-backdrop" onClick={() => setShowNewWithOptions(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{{ sesiones: "Nueva Sesion", facturas: "Nueva Factura" }[endpoint] || `Nuevo ${endpoint.slice(0, -1)}`}</h3>
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
                  endpoint={endpoint}
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
              <h3>{getTitleValue(viewing, columns, endpoint)}</h3>
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
                onPay={confirmPayment}
              />
            </div>
          </div>
        )
      }
      {
        externalViewing && (
          <div className="modal-backdrop" onClick={() => setExternalViewing(null)} style={{ zIndex: 1100 }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{getTitleValue(externalViewing.item, modelsMap[externalViewing.endpoint], externalViewing.endpoint)}</h3>
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
        showMemoriaModal && (
          <div className="modal-backdrop" onClick={() => setShowMemoriaModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
              <h3>Crear Memoria</h3>
              <p>Selecciona el periodo que debe abarcar el informe.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                <label>Fecha Desde:</label>
                <input 
                  type="date" 
                  value={memoriaStartDate} 
                  onChange={e => setMemoriaStartDate(e.target.value)} 
                  style={{ width: "100%", padding: 8, borderRadius: 4, border: '1px solid #ccc' }} 
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                <label>Fecha Hasta:</label>
                <input 
                  type="date" 
                  value={memoriaEndDate} 
                  onChange={e => setMemoriaEndDate(e.target.value)} 
                  style={{ width: "100%", padding: 8, borderRadius: 4, border: '1px solid #ccc' }} 
                />
              </div>

              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => setShowMemoriaModal(false)}>Cancelar</button>
                <button className="primary" onClick={generateMemoria} disabled={!memoriaStartDate || !memoriaEndDate || loading}>
                  {loading ? 'Generando...' : 'Confirmar'}
                </button>
              </div>
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