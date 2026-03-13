import React, { useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import EntityList from "./components/EntityList";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";

function AppContent() {
  const { user, loading } = useAuth();
  const [entity, setEntity] = useState("dashboard");

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (!user) {
    return <Login />;
  }

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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
