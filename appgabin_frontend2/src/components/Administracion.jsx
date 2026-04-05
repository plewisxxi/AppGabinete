import React, { useState, useEffect } from "react";
import EntityList from "./EntityList";
import API from "../api";

// ── Tab IDs ──────────────────────────────────────────────
const TABS = [
  { id: "productos", label: "Productos", icon: "📦" },
  { id: "periodos",  label: "Periodos",  icon: "⏳" },
  { id: "config",    label: "Configuración", icon: "⚙️" },
];

// ── Configuración (metadata edit form) ───────────────────
function ConfigForm() {
  const [data, setData]       = useState({ serie: "", serieRectificativa: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null); // { type: "ok"|"err", text }

  useEffect(() => {
    setLoading(true);
    API.fetchMetadatos()
      .then(d => setData({ serie: d.serie ?? "", serieRectificativa: d.serieRectificativa ?? "" }))
      .catch(e => setMsg({ type: "err", text: e.message }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await API.updateMetadatos({ serie: data.serie, serieRectificativa: data.serieRectificativa });
      setMsg({ type: "ok", text: "Guardado correctamente." });
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="admin-loading">Cargando configuración…</div>;

  return (
    <div className="admin-config-form">
      <h3 className="admin-config-title">Configuración de Facturación</h3>
      <p className="admin-config-subtitle">
        Estos parámetros determinan la serie de numeración de las facturas generadas.
      </p>

      <form onSubmit={handleSave} className="admin-config-fields">
        <div className="admin-field-row">
          <label className="admin-field-label">
            Serie de Facturas
            <span className="admin-field-hint">Prefijo para las facturas ordinarias (ej: F, FAC…)</span>
          </label>
          <input
            className="admin-field-input"
            value={data.serie}
            onChange={e => setData(d => ({ ...d, serie: e.target.value }))}
            placeholder="F"
            maxLength={10}
            required
          />
        </div>

        <div className="admin-field-row">
          <label className="admin-field-label">
            Serie Rectificativa
            <span className="admin-field-hint">Prefijo para las facturas rectificativas (ej: R, REC…)</span>
          </label>
          <input
            className="admin-field-input"
            value={data.serieRectificativa}
            onChange={e => setData(d => ({ ...d, serieRectificativa: e.target.value }))}
            placeholder="R"
            maxLength={10}
          />
        </div>

        {msg && (
          <div className={`admin-msg ${msg.type === "ok" ? "admin-msg-ok" : "admin-msg-err"}`}>
            {msg.text}
          </div>
        )}

        <div className="admin-config-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function Administracion() {
  const [activeTab, setActiveTab] = useState("productos");

  return (
    <div className="admin-page">
      {/* Tab bar */}
      <div className="admin-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            id={`admin-tab-${t.id}`}
            className={`admin-tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="admin-tab-icon">{t.icon}</span>
            <span className="admin-tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="admin-tab-content">
        {activeTab === "productos" && (
          <div className="card">
            <EntityList endpoint="productos" />
          </div>
        )}
        {activeTab === "periodos" && (
          <div className="card">
            <EntityList endpoint="periodos" />
          </div>
        )}
        {activeTab === "config" && <ConfigForm />}
      </div>
    </div>
  );
}
