import React, { useState } from "react";
import EntityList from "./components/EntityList";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [entity, setEntity] = useState("dashboard"); // Default to dashboard

  return (
    <div className="app-layout">
      <Sidebar current={entity} onChange={setEntity} />

      <main className="main-content">
        <div className="container">
          {entity === "dashboard" ? (
            <Dashboard />
          ) : (
            <div className="card">
              <EntityList endpoint={entity} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
