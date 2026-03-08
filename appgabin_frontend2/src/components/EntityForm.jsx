import React, { useState, useEffect } from "react";

export default function EntityForm({
  columns = [],
  item = {},
  onSave,
  onCancel,
  isNew = false,
  keepStringFields = [],
  readOnly = false,
  fieldOptions = {},
  endpoint,
  onClone,
  onInvoice,
  onViewExternal,
  onPay
}) {
  console.log("[EntityForm] render with fieldOptions:", fieldOptions);
  console.log("[EntityForm] columns:", columns);

  function getColField(c) { return typeof c === 'object' ? c.field : c; }
  function getColLabel(c) { return typeof c === 'object' ? (c.label || c.field) : c; }

  const initial = {};
  columns.forEach(c => {
    const field = getColField(c);
    let val = item[field] ?? "";

    // Convert DD-MM-YYYY to YYYY-MM-DD for initial load in date inputs
    if (typeof c === 'object' && c.type === 'date' && typeof val === 'string' && val.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [dd, mm, yyyy] = val.split('-');
      val = `${yyyy}-${mm}-${dd}`;
    }

    if (field === "facturado" && typeof val === "boolean") {
      val = val ? "FACTURADO" : "NO FACTURADO";
    }

    // Default Total Pagado to 0 for new gastos
    if (isNew && field === "totalPagado" && (val === "" || val === null || val === undefined)) {
      val = 0;
    }

    initial[field] = val;
  });

  const [form, setForm] = useState(initial);

  // Sync form state when item changes (e.g. when opening edit for a different session)
  useEffect(() => {
    setForm(initial);
  }, [item, columns]);

  function change(k, v) {
    if (readOnly) return;
    setForm(s => ({ ...s, [k]: v }));
  }

  // Effect to handle computed fields (like 'pendiente')
  useEffect(() => {
    // Check if there is a 'pendiente' field and it's computed
    const pendienteCol = columns.find(c => typeof c === 'object' && (c.field === 'pendiente' || c.field === 'totalPendiente') && c.isComputed);
    if (pendienteCol) {
      const field = pendienteCol.field;
      const total = parseFloat(form.total) || 0;
      const pagado = parseFloat(form.totalPagado) || 0;
      const nuevoPendiente = (total - pagado).toFixed(2);

      if (form[field] !== nuevoPendiente) {
        setForm(s => ({ ...s, [field]: nuevoPendiente }));
      }
    }
  }, [form.total, form.totalPagado, columns]);


  // Function to handle auto-fills for Sesiones
  const handleSesionAutoFills = (dateVal) => {
    if (dateVal && fieldOptions.periodos) {
      const [y, m, d] = dateVal.split("-");
      const year = y;
      const month = m ? parseInt(m) : null;
      if (!month) return;

      const found = fieldOptions.periodos.find(p => {
        const id = p.IDPeriodo;
        if (!id) return false;
        if (!id.startsWith(year)) return false;
        const isMonthMatch = id.includes(`-${m.padStart(2, '0')}`) || id.includes(`M${month}`);
        if (isMonthMatch) return true;
        const quarter = Math.ceil(month / 3);
        const isQuarterMatch = id.includes(`Q${quarter}`);
        return isQuarterMatch;
      });

      if (found) {
        setForm(s => {
          const next = { ...s, IDPeriodo: found.IDPeriodo };
          // Concepto logic also needs updated values
          const prod = fieldOptions.productos?.find(p => p.IDProducto === s.IDProducto);
          if (prod) {
            const descProd = prod.descProducto || prod.IDProducto;
            const descPeri = found.descPeriodo || found.IDPeriodo;
            next.concepto = `${descProd} - ${descPeri}`;
          }
          return next;
        });
      }
    }
  };

  // Effect to handle Concepto auto-generation when product changes (only for new records)
  useEffect(() => {
    if (isNew && form.IDProducto && form.IDPeriodo && fieldOptions.productos && fieldOptions.periodos) {
      const prod = fieldOptions.productos.find(p => p.IDProducto === form.IDProducto);
      const peri = fieldOptions.periodos.find(p => p.IDPeriodo === form.IDPeriodo);

      if (prod && peri) {
        const descProd = prod.descProducto || prod.IDProducto;
        const descPeri = peri.descPeriodo || peri.IDPeriodo;
        const nuevoConcepto = `${descProd} - ${descPeri}`;
        if (form.concepto !== nuevoConcepto) {
          setForm(s => ({ ...s, concepto: nuevoConcepto }));
        }
      }
    }
  }, [form.IDProducto, fieldOptions.productos]); // Restored isNew check for product change auto-fill

  // Effect to handle Nombre Contacto lookup based on NIF
  useEffect(() => {
    if (form.NIFCliente && fieldOptions.contactos) {
      const contact = fieldOptions.contactos.find(c => c.NIF === form.NIFCliente);
      if (contact && contact.Nombre && form.nombreContacto !== contact.Nombre) {
        setForm(s => ({ ...s, nombreContacto: contact.Nombre }));
      }
    }
  }, [form.NIFCliente, fieldOptions.contactos, isNew, form.nombreContacto]);

  function submit(e) {
    e.preventDefault();
    if (readOnly) return;
    const payload = { ...form };

    // Coerción mejorada: no convertir a número si el campo está en keepStringFields
    Object.keys(payload).forEach(k => {
      const v = payload[k];
      const col = columns.find(c => getColField(c) === k);
      if (!col) return; // skip if not in columns (e.g. titles)

      const isMoney = col && typeof col === 'object' && col.type === 'money';
      const isDate = col && typeof col === 'object' && col.type === 'date';
      const isComputed = col && typeof col === 'object' && col.isComputed;

      if (isComputed) {
        delete payload[k];
        return;
      }

      if (v === "") payload[k] = null;
      else if (isDate && typeof v === "string") {
        // Convert date from YYYY-MM-DD to DD-MM-YYYY
        if (v.length === 10 && v.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [yyyy, mm, dd] = v.split('-');
          payload[k] = `${dd}-${mm}-${yyyy}`;
        }
      }
      else if (!keepStringFields.includes(k)) {
        // convertir a número solo si es entero/float exacto en la cadena
        if (typeof v === "string") {
          const trimmed = v.trim();
          if (trimmed !== "" && !Number.isNaN(Number(trimmed))) {
            const maybeNumber = Number(trimmed);
            // If money type, force number conversion
            if (isMoney) {
              payload[k] = maybeNumber;
            } else {
              // evitar convertir campos con ceros a la izquierda si parecen códigos (no listados en keepStringFields)
              if (String(maybeNumber) === trimmed) payload[k] = maybeNumber;
            }
          }
        }
      } else {
        // mantener como string, limpiar espacios
        if (typeof v === "string") payload[k] = v.trim();
      }

      // Final check for boolean fields mapped to labels
      if (k === "facturado" && typeof payload[k] === "string") {
        if (payload[k] === "FACTURADO") payload[k] = true;
        else if (payload[k] === "NO FACTURADO") payload[k] = false;
      }
    });

    onSave(payload);
  }

  // Group columns by row if specified
  const rowsMap = {};
  columns.filter(col => typeof col !== 'object' || !col.hideInForm).forEach(col => {
    const r = (typeof col === 'object' && col.row) ? col.row : 999;
    if (!rowsMap[r]) rowsMap[r] = [];
    rowsMap[r].push(col);
  });
  const sortedRowKeys = Object.keys(rowsMap).sort((a, b) => Number(a) - Number(b));

  return (
    <form onSubmit={submit}>
      <div className="form-grid-custom">
        {sortedRowKeys.map(rKey => {
          const rowFields = rowsMap[rKey];
          return (
            <div key={rKey} className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
              {rowFields.map((col, cIdx) => {
                const k = getColField(col);
                const label = getColLabel(col);
                const width = (typeof col === 'object' && col.width) ? col.width : "100%";
                const type = (typeof col === 'object' && col.type) ? col.type : "text";
                const isReadOnlyCol = (typeof col === 'object' && col.readOnly) === true;
                const isDisabled = readOnly || isReadOnlyCol;

                if (type === 'separator') {
                  return <div key={cIdx} style={{ width: '100%', height: '1px', background: 'var(--border)', margin: '8px 0' }} />;
                }

                if (type === 'title') {
                  const isBillingSection = endpoint === "sesiones" && label === "Datos Facturación" && form.facturado === "FACTURADO" && form.numeroFactura;
                  return (
                    <div key={cIdx} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 8px 0' }}>
                      <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--primary-1)' }}>{label}</h4>
                      {isBillingSection && (
                        <button
                          type="button"
                          onClick={() => onViewExternal("facturas", form.numeroFactura)}
                          className="ghost"
                          style={{
                            padding: '4px 12px',
                            fontSize: '13px',
                            height: 'auto',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          title="Ver Factura"
                        >
                          👁️ Ver Factura
                        </button>
                      )}
                    </div>
                  );
                }

                const isTextArea = k.toLowerCase().includes("desc") || k.toLowerCase().includes("nota");
                const n = rowFields.length;
                const gap = 16;
                const wPercent = parseFloat(width);
                const flexBasis = (n > 1 && width.endsWith('%') && !isNaN(wPercent))
                  ? `calc(${width} - ${(gap * (n - 1) * (wPercent / 100)).toFixed(2)}px)`
                  : width;

                const fieldStyle = { width: width, flex: `0 0 ${flexBasis}`, maxWidth: flexBasis };

                if (type === 'select' && col.source) {
                  const options = fieldOptions[col.source] || [];
                  return (
                    <div key={k} className="form-field" style={fieldStyle}>
                      <label>{label}</label>
                      <select
                        value={form[k] ?? ""}
                        onChange={e => change(k, e.target.value)}
                        disabled={isDisabled}
                      >
                        <option value="">-- Seleccionar --</option>
                        {options.map((opt, idx) => (
                          <option key={idx} value={opt[col.valueKey]}>{opt[col.displayKey] || opt[col.valueKey]}</option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (type === 'date') {
                  let val = form[k] ?? "";
                  if (val && val.length > 10) val = val.substring(0, 10);
                  return (
                    <div key={k} className="form-field" style={fieldStyle}>
                      <label>{label}</label>
                      <input
                        type="date"
                        value={val}
                        onChange={e => change(k, e.target.value)}
                        onBlur={e => handleSesionAutoFills(e.target.value)}
                        disabled={isDisabled}
                      />
                    </div>
                  );
                }

                if (type === 'money') {
                  const step = (typeof col === 'object' && col.step) ? col.step : "0.01";
                  return (
                    <div key={k} className="form-field" style={fieldStyle}>
                      <label>{label}</label>
                      <input
                        type="number"
                        step={step}
                        value={form[k] ?? ""}
                        onChange={e => change(k, e.target.value)}
                        disabled={isDisabled}
                      />
                    </div>
                  );
                }

                if (type === 'datalist' && col.source) {
                  const options = fieldOptions[col.source] || [];
                  const listId = `list-${k}`;
                  return (
                    <div key={k} className="form-field" style={fieldStyle}>
                      <label>{label}</label>
                      <input
                        list={listId}
                        value={form[k] ?? ""}
                        onChange={e => change(k, e.target.value)}
                        disabled={isDisabled}
                        placeholder="Escriba para buscar..."
                      />
                      <datalist id={listId}>
                        {options.map((opt, idx) => {
                          const val = opt[col.valueKey];
                          const disp = opt[col.displayKey];
                          return <option key={idx} value={val}>{disp} ({val})</option>;
                        })}
                      </datalist>
                    </div>
                  );
                }

                const isInvoiceNumber = endpoint === "sesiones" && k === "numeroFactura" && form.facturado === "FACTURADO" && form[k];

                return (
                  <div key={k} className={`form-field ${isTextArea ? 'full-width' : ''}`} style={fieldStyle}>
                    <label>{label}</label>
                    {isTextArea ? (
                      <textarea value={form[k] ?? ""} onChange={e => change(k, e.target.value)} rows={4} disabled={isDisabled} />
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          value={form[k] ?? ""}
                          onChange={e => change(k, e.target.value)}
                          disabled={isDisabled}
                          style={(readOnly && k === 'facturado') ? {
                            color: form[k] === 'FACTURADO' ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          } : {}}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="toolbar">
        <button type="button" className="ghost" onClick={onCancel}>{readOnly ? "Cerrar" : "Cancelar"}</button>
        {readOnly && endpoint === "sesiones" && (
          <>
            <button type="button" onClick={() => onClone(item)} style={{ background: "#0f172a", color: "white" }}>
              ⚡ Clonar
            </button>
            {(item.facturado !== true && item.numeroFactura == null) && (
              <button type="button" onClick={() => onInvoice(item)} style={{ background: "#059669", color: "white" }}>
                💰 Facturar
              </button>
            )}
          </>
        )}
        {endpoint === "gastos" && (parseFloat(form.total) || 0) !== (parseFloat(form.totalPagado) || 0) && (
          <button type="button" onClick={() => onPay(item)} style={{ background: "#059669", color: "white" }}>
            💳 Pagar
          </button>
        )}
        {!readOnly && (
          <button
            type="submit"
            className="primary"
            disabled={endpoint === "sesiones" && item.facturado === true}
            title={endpoint === "sesiones" && item.facturado === true ? "No se puede editar una sesión facturada" : ""}
          >
            {isNew ? "Crear" : "Guardar"}
          </button>
        )}
      </div>
    </form>
  );
}