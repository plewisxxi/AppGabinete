/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import API from "../api";

export default function Resumen() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 11 }, (_, i) => 2020 + i);
  const periods = [
    { val: "", label: "Todo el año" },
    ...Array.from({ length: 12 }, (_, i) => ({ val: `M${i + 1}`, label: `Mes ${i + 1}` })),
    { val: "Q1", label: "Trimestre 1 (Q1)" },
    { val: "Q2", label: "Trimestre 2 (Q2)" },
    { val: "Q3", label: "Trimestre 3 (Q3)" },
    { val: "Q4", label: "Trimestre 4 (Q4)" },
  ];

  function getISODateRange(y, p) {
    const pad = (n) => String(n).padStart(2, '0');
    if (!p) {
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    let startMonth, endMonth, startDay, endDay;
    if (p.startsWith('Q')) {
      const q = parseInt(p.substring(1));
      startMonth = (q - 1) * 3 + 1;
      endMonth = startMonth + 2;
      startDay = 1;
      endDay = new Date(y, endMonth, 0).getDate();
    } else if (p.startsWith('M')) {
      const m = parseInt(p.substring(1));
      startMonth = m;
      endMonth = m;
      startDay = 1;
      endDay = new Date(y, endMonth, 0).getDate();
    }
    return {
      start: `${y}-${pad(startMonth)}-${pad(startDay)}`,
      end: `${y}-${pad(endMonth)}-${pad(endDay)}`
    };
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const { start, end } = getISODateRange(year, period);
        const res = await API._fetchWithAuth(`${API.base}/stats/resumen?start_date=${start}&end_date=${end}`);
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err) {
        console.error("Error loading resumen:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [year, period]);

  const fmt = (val) => val != null 
    ? new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(Number(val)) 
    : "0,00";
  const fmtCount = (val) => val != null 
    ? new Intl.NumberFormat('es-ES', { style: 'decimal', useGrouping: true }).format(Number(val)) 
    : "0";

  return (
    <div className="resumen-container">
      <div className="header" style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Resumen</h2>
        <div className="controls" style={{ display: "flex", gap: "10px" }}>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
             {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value)}>
             {periods.map(p => <option key={p.val} value={p.val}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {loading && !data && <div style={{ opacity: 0.5, textAlign: "center", padding: "40px" }}>Cargando datos...</div>}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "450px", opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}>
          
          {/* Tarjeta Sesiones */}
          <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: 0, color: "var(--text-muted)", fontSize: "16px" }}>Sesiones</h3>
            <div style={{ textAlign: "center", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
              <div style={{ fontSize: "28px", fontWeight: "bold" }}>{fmt(data.sesiones.total_sum)} €</div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{fmtCount(data.sesiones.total_count)} sesiones en total</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "22px", fontWeight: "600", color: "#059669" }}>{fmt(data.sesiones.sum_facturadas)} €</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{fmtCount(data.sesiones.count_facturadas)} facturadas</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "22px", fontWeight: "600", color: "#dc2626" }}>{fmt(data.sesiones.sum_no_facturadas)} €</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{fmtCount(data.sesiones.count_no_facturadas)} no facturadas</div>
              </div>
            </div>
          </div>

          {/* Tarjeta Ingresos */}
          <div className="card" style={{ padding: "20px", textAlign: "center", borderLeft: "4px solid #2563eb", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h3 style={{ margin: 0, paddingBottom: "8px", color: "var(--text-muted)", fontSize: "16px" }}>Ingresos</h3>
            <div style={{ fontSize: "26px", fontWeight: "bold", color: "#2563eb" }}>{fmt(data.ingresos.sum)} €</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{fmtCount(data.ingresos.count)} facturas emitidas</div>
          </div>

          {/* Tarjeta Gastos */}
          <div className="card" style={{ padding: "20px", textAlign: "center", borderLeft: "4px solid #dc2626", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h3 style={{ margin: 0, paddingBottom: "8px", color: "var(--text-muted)", fontSize: "16px" }}>Gastos</h3>
            <div style={{ fontSize: "26px", fontWeight: "bold", color: "#dc2626" }}>{fmt(data.gastos.sum)} €</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{fmtCount(data.gastos.count)} gastos registrados</div>
          </div>

          {/* Tarjeta Resultado */}
          <div className="card" style={{ padding: "20px", textAlign: "center", background: "#f8fafc", borderLeft: "4px solid #0f172a", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h3 style={{ margin: 0, paddingBottom: "8px", color: "var(--text-muted)", fontSize: "16px" }}>Resultado</h3>
            <div style={{ fontSize: "30px", fontWeight: "bold", color: "#0f172a" }}>
              {fmt(data.ingresos.sum - data.gastos.sum)} €
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>ingresos menos gastos</div>
          </div>

        </div>
      )}
    </div>
  );
}
