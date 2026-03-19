import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import API from "../api";

export default function Sidebar({ current, onChange }) {
    const [collapsed, setCollapsed] = useState(false);
    const [empresaNombre, setEmpresaNombre] = useState(null);
    const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);
    const { user, logout, idToken } = useAuth();

    const menuItems = [
        { id: "dashboard", label: "Métricas", icon: "📊" },
        { id: "separator", type: "separator" },
        { id: "contactos", label: "Contactos", icon: "👥" },
        { id: "sesiones", label: "Sesiones", icon: "📅" },
        { id: "facturas", label: "Facturas", icon: "📄" },
        { id: "gastos", label: "Gastos", icon: "💸" },
        { id: "productos", label: "Productos", icon: "📦" },
        { id: "periodos", label: "Periodos", icon: "⏳" },
    ];

    useEffect(() => {
        // Load empresa name for the logged-in user (first assignment)
        async function loadEmpresa() {
            try {
                const empresas = await API.fetchMyEmpresas();
                if (Array.isArray(empresas) && empresas.length) {
                    setEmpresaNombre(empresas[0].nombre);
                }
            } catch (e) {
                console.warn("Could not load empresa info:", e);
            }
        }
        loadEmpresa();

        // Track mobile layout so we can show logout in the nav on small screens
        function updateIsMobile() {
            setIsMobile(window.innerWidth <= 768);
        }

        updateIsMobile();
        window.addEventListener("resize", updateIsMobile);
        return () => window.removeEventListener("resize", updateIsMobile);
    }, []);

    return (
        <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            <div className="sidebar-header">
                {!collapsed && (
                    <div className="header-content">
                        <h2>Gestion Gabinete</h2>
                        {empresaNombre && <span className="company-name">{empresaNombre}</span>}
                    </div>
                )}
                <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? "☰" : "«"}
                </button>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item, idx) => {
                    if (item.type === "separator") {
                        return <div key={`sep-${idx}`} style={{ height: "1px", background: "var(--border)", margin: "8px 12px" }} />;
                    }
                    return (
                        <button
                            key={item.id}
                            className={`nav-item ${current === item.id ? "active" : ""}`}
                            onClick={() => onChange(item.id)}
                            title={collapsed ? item.label : ""}
                        >
                            <span className="icon">{item.icon}</span>
                            {!collapsed && <span className="label">{item.label}</span>}
                        </button>
                    );
                })}

                {isMobile && user && (
                    <button
                        className="nav-item logout"
                        onClick={logout}
                        title="Cerrar Sesión"
                    >
                        <span className="icon" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13 3H11V13H13V3Z" fill="currentColor"/>
                                <path d="M5.636 6.343C3.805 8.174 3 10.518 3 13C3 17.9706 6.52944 22.0391 11 22.8255V20.7804C7.22619 20.0915 4.5 16.945 4.5 13C4.5 10.5523 5.43922 8.31466 6.90983 6.84382L5.636 6.343Z" fill="currentColor"/>
                                <path d="M18.364 6.343L17.09 6.84382C18.5608 8.31466 19.5 10.5523 19.5 13C19.5 16.945 16.7738 20.0915 13 20.7804V22.8255C17.4706 22.0391 21 17.9706 21 13C21 10.518 20.195 8.174 18.364 6.343Z" fill="currentColor"/>
                            </svg>
                        </span>
                        {!collapsed && <span className="label">Cerrar Sesión</span>}
                    </button>
                )}
            </nav>

            <div className="sidebar-footer">
                {!isMobile && user && (
                    <div className="user-info">
                        {!collapsed && <small>Hola, {user.displayName}</small>}
                        <button 
                            onClick={logout} 
                            className="logout-btn"
                            title={idToken ? `[DEBUG] ID Token: ${idToken.substring(0, 50)}...` : "Cerrar Sesión"}
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                )}
                {!collapsed && !isMobile && <small>© 2026</small>}
            </div>
        </div>
    );
}
