import React, { useState } from "react";
import { useAuth } from "../AuthContext";

export default function Sidebar({ current, onChange }) {
    const [collapsed, setCollapsed] = useState(false);
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

    return (
        <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            <div className="sidebar-header">
                {!collapsed && <h2>Gestion Gabinete</h2>}
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
            </nav>

            <div className="sidebar-footer">
                {!collapsed && user && (
                    <div className="user-info">
                        <small>Hola, {user.displayName}</small>
                        <button 
                            onClick={logout} 
                            className="logout-btn"
                            title={idToken ? `[DEBUG] ID Token: ${idToken.substring(0, 50)}...` : "Cerrar Sesión"}
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                )}
                {!collapsed && <small>© 2026</small>}
            </div>
        </div>
    );
}
