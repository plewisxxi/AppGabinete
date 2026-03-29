import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import EntityList from "./components/EntityList";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Resumen from "./components/Resumen";
import Login from "./components/Login";
import Unauthorized from "./components/Unauthorized";

function AppContent() {
  const { user, loading } = useAuth();
  const [entity, setEntity] = useState(typeof window !== "undefined" && window.innerWidth <= 768 ? "resumen" : "dashboard");
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsUnauthorized(true);
    };
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    // Reset unauthorized state when user changes
    setIsUnauthorized(false);
  }, [user]);

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (isUnauthorized) {
    return <Unauthorized />;
  }

  return (
    <div className="app-layout">
      <Sidebar current={entity} onChange={setEntity} />

      <main className="main-content">
        <div className="container">
          {entity === "dashboard" ? (
            <Dashboard />
          ) : entity === "resumen" ? (
            <Resumen />
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
