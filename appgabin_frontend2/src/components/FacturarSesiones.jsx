import React, { useEffect, useState } from "react";
import API from "../api";

export default function FacturarSesiones() {
  const [sesiones, setSesiones] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => load(), []);

  async function load() {
    setLoading(true);
    try {
      const data = await API.fetchList("sesiones");
      setSesiones(data);
    } catch (e) {
      alert("Error: " + e.message);
    } finally { setLoading(false); }
  }

  function toggle(id) {
    setSelected(s => ({ ...s, [id]: !s[id] }));
  }

  async function crearFacturaUnica() {
    const chosen = sesiones.filter(s => selected[s.id]);
    if (chosen.length === 0) { alert("Selecciona sesiones"); return; }
    // validar que todas las sesiones pertenezcan al mismo cliente y periodo
    const cliente = chosen[0].contacto_nif ?? chosen[0].contacto_id ?? chosen[0].NIF;
    const periodo = chosen[0].periodo_id ?? chosen[0].periodo;
    for (const s of chosen) {
      const c = s.contacto_nif ?? s.contacto_id ?? s.NIF;
      const p = s.periodo_id ?? s.periodo;
      if (c !== cliente || p !== periodo) {
        alert("Las sesiones seleccionadas deben pertenecer al mismo cliente y periodo para facturar en una sola factura.");
        return;
      }
    }
    // construir items a partir de sesiones (crea un item por sesión)
    const items = chosen.map(s => ({
      producto_id: s.producto_id ?? s.idproducto ?? null,
      servicio_id: s.servicio_id ?? null,
      cantidad: s.cantidad ?? 1,
      precio_unit: s.precio ?? s.valor ?? 0
    }));
    const payload = {
      numero: `AUTO-${Date.now()}`,
      contacto_nif: cliente,
      periodo_id: periodo,
      items
    };
    try {
      const resp = await API.create("facturas", payload);
      alert("Factura creada: " + (resp.numero ?? resp.id));
      load();
    } catch (e) {
      alert("Error creando factura: " + e.message);
    }
  }

  return (
    <div>
      <div style={{display:"flex", gap:8, marginBottom:8}}>
        <button onClick={load}>Refrescar sesiones</button>
        <button className="primary" onClick={crearFacturaUnica}>Crear factura a partir de sesiones seleccionadas</button>
      </div>

      {loading ? <div>Cargando sesiones...</div> : (
        <table className="table">
          <thead><tr><th></th><th>Sesion</th><th>Cliente</th><th>Producto</th><th>Periodo</th><th>Precio</th></tr></thead>
          <tbody>
            {sesiones.map(s => (
              <tr key={s.id}>
                <td><input type="checkbox" checked={!!selected[s.id]} onChange={() => toggle(s.id)} /></td>
                <td>{s.id}</td>
                <td>{s.contacto_nif ?? s.contacto_id ?? s.NIF}</td>
                <td>{s.producto_id ?? s.idproducto ?? s.servicio_id}</td>
                <td>{s.periodo_id ?? s.periodo}</td>
                <td>{s.precio ?? s.valor ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}