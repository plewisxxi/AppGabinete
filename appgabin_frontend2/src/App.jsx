import React, { useState } from "react";
import EntityList from "./components/EntityList";
import Sidebar from "./components/Sidebar";

export default function App() {
  const [entity, setEntity] = useState("contactos"); // Default to 'contactos' as it has improved filters

  return (
    <div className="app-layout">
      <Sidebar current={entity} onChange={setEntity} />

      <main className="main-content">
        <div className="container">
          {/* Header removed from here as navigation is now in Sidebar */}
          {/* We can keep a page title if needed, or let EntityList handle it */}

          <div className="card">
            <EntityList endpoint={entity} />
          </div>
        </div>
      </main>
    </div>
  );
}
