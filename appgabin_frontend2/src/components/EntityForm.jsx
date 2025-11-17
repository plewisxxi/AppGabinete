import React, { useState } from "react";

export default function EntityForm({ columns = [], item = {}, onSave, onCancel, isNew = false, keepStringFields = [] }) {
  const initial = {};
  columns.forEach(c => initial[c] = item[c] ?? "");

  const [form, setForm] = useState(initial);

  function change(k, v) {
    setForm(s => ({ ...s, [k]: v }));
  }

  function submit(e) {
    e.preventDefault();
    const payload = { ...form };

    // Coerción mejorada: no convertir a número si el campo está en keepStringFields
    Object.keys(payload).forEach(k => {
      const v = payload[k];
      if (v === "") payload[k] = null;
      else if (!keepStringFields.includes(k)) {
        // convertir a número solo si es entero/float exacto en la cadena
        if (typeof v === "string") {
          const trimmed = v.trim();
          if (trimmed !== "" && !Number.isNaN(Number(trimmed))) {
            // evitar convertir campos con ceros a la izquierda si parecen códigos (no listados en keepStringFields)
            const maybeNumber = Number(trimmed);
            if (String(maybeNumber) === trimmed) payload[k] = maybeNumber;
          }
        }
      } else {
        // mantener como string, limpiar espacios
        if (typeof v === "string") payload[k] = v.trim();
      }
    });

    onSave(payload);
  }

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        {columns.map(k => (
          <div key={k}>
            <label style={{display:"block", marginBottom:6, fontSize:13, color:"#374151"}}>{k}</label>
            {k.toLowerCase().includes("desc") || k.toLowerCase().includes("nota") ? (
              <textarea value={form[k] ?? ""} onChange={e => change(k, e.target.value)} rows={3} />
            ) : (
              <input value={form[k] ?? ""} onChange={e => change(k, e.target.value)} />
            )}
          </div>
        ))}
      </div>

      <div className="toolbar">
        <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="primary">{isNew ? "Crear" : "Guardar"}</button>
      </div>
    </form>
  );
}