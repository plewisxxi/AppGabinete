import React, { useState } from "react";

export default function Sidebar({ current, onChange }) {
    const [collapsed, setCollapsed] = useState(false);

    const menuItems = [
        { id: "contactos", label: "Contactos", icon: "👥" },
        { id: "sesiones", label: "Sesiones", icon: "📅" },
        { id: "facturas", label: "Facturas", icon: "📄" },
        { id: "productos", label: "Productos", icon: "📦" },
        { id: "periodos", label: "Periodos", icon: "⏳" },
    ];

    return (
        <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            <div className="sidebar-header">
                {!collapsed && <h2>AppGabinete</h2>}
                <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? "☰" : "«"}
                </button>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${current === item.id ? "active" : ""}`}
                        onClick={() => onChange(item.id)}
                        title={collapsed ? item.label : ""}
                    >
                        <span className="icon">{item.icon}</span>
                        {!collapsed && <span className="label">{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                {!collapsed && <small>© 2026</small>}
            </div>
        </div>
    );
}
