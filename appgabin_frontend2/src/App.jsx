import React, { useState } from "react";
import EntityList from "./components/EntityList";
//import FacturarSesiones from "./components/FacturarSesiones";
//import Stats from "./components/Stats";

export default function App() {
  const [entity, setEntity] = useState("productos");
  return (
    <div className="periodos">
      <div className="header">
        <h2>AppGabinete - Admin</h2>
        <div className="controls">
          <select value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="contactos">Contactos</option>
            <option value="productos">Productos</option>
            <option value="periodos">Periodos</option>
            <option value="facturas">Facturas</option>
            <option value="sesiones">Sesiones</option>
          </select>
        </div>
      </div>

      <div className="card">
        <EntityList endpoint={entity} />
      </div>

    </div>
  );
}