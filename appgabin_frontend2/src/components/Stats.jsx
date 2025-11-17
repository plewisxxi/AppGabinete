import React, { useEffect, useState } from "react";
import API from "../api";

export default function Stats() {
  const [byPeriod, setByPeriod] = useState([]);
  const [byContact, setByContact] = useState([]);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const p = await fetch("/api/facturas/reports/summary-by-period").then(r => r.json());
      const c = await fetch("/api/facturas/reports/summary-by-contact").then(r => r.json());
      setByPeriod(p);
      setByContact(c);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div>
      <div style={{display:"flex", gap:16}}>
        <div style={{flex:1}}>
          <h4>Por periodo</h4>
          <table className="table">
            <thead><tr><th>Periodo</th><th>#facturas</th><th>Total</th></tr></thead>
            <tbody>
              {byPeriod.map((r,i) => (
                <tr key={i}><td>{r.periodo_nombre}</td><td>{r.numero_facturas}</td><td>{r.total_facturado}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{flex:1}}>
          <h4>Por cliente</h4>
          <table className="table">
            <thead><tr><th>Cliente</th><th>#facturas</th><th>Total</th></tr></thead>
            <tbody>
              {byContact.map((r,i) => (
                <tr key={i}><td>{r.contacto_nombre}</td><td>{r.numero_facturas}</td><td>{r.total_facturado}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}