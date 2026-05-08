import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import API from "../api";

export default function Sidebar({ current, onChange }) {
    // Desktop mostly toggle state
    const [collapsed, setCollapsed] = useState(false);
    // Mobile Drawer state
    const [mobileOpen, setMobileOpen] = useState(false);
    
    const [empresaNombre, setEmpresaNombre] = useState(null);
    const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);
    const { user, logout, idToken } = useAuth();

    const menuItems = [
        { id: "resumen", label: "Resumen", icon: "📋" },
        { id: "dashboard", label: "Métricas", icon: "📊" },
        { id: "separator", type: "separator" },
        { id: "contactos", label: "Contactos", icon: "👥" },
        { id: "sesiones", label: "Sesiones", icon: "📅" },
        { id: "facturas", label: "Facturas", icon: "📄" },
        { id: "gastos", label: "Gastos", icon: "💸" },
        { id: "separator2", type: "separator" },
        { id: "administracion", label: "Administración", icon: "⚙️" },
    ];

    useEffect(() => {
        // Load empresa name for the logged-in user
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

        function updateIsMobile() {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile) {
                setCollapsed(false); // we don't use collapsed prop on mobile it's purely Drawer based
            } else {
                setMobileOpen(false); // close drawer if resize to desktop
            }
        }

        updateIsMobile();
        window.addEventListener("resize", updateIsMobile);
        return () => window.removeEventListener("resize", updateIsMobile);
    }, []);

    const handleNavClick = (id) => {
        onChange(id);
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    return (
        <>
            {isMobile && (
                <div className="mobile-topbar">
                    <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)} title="Menú">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H21V8H3V6ZM3 11H21V13H3V11ZM3 16H21V18H3V16Z" fill="currentColor"/>
                        </svg>
                    </button>
                    <div className="mobile-topbar-title">
                        <h2>Gabinete</h2>
                        {empresaNombre && <span>{empresaNombre}</span>}
                    </div>
                </div>
            )}

            {isMobile && mobileOpen && (
                <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)}></div>
            )}

            <div className={`sidebar ${!isMobile && collapsed ? "collapsed" : ""} ${isMobile && mobileOpen ? "mobile-open" : ""}`}>
                <div className="sidebar-header">
                    {/* Visual header logic: when in desktop-collapsed we completely hide header text optionally.
                        Here we show it if not collapsed or taking up space. */}
                    {(!collapsed || isMobile) && (
                        <div className="header-content">
                            <h2>Gabinete</h2>
                            {empresaNombre && <span className="company-name">{empresaNombre}</span>}
                        </div>
                    )}
                    {!isMobile && (
                        <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
                            {collapsed ? "☰" : "✕"}
                        </button>
                    )}
                    {isMobile && (
                        <button className="toggle-btn close-mobile" onClick={() => setMobileOpen(false)}>
                            ✕
                        </button>
                    )}
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item, idx) => {
                        if (item.type === "separator") {
                            return <div key={`sep-${idx}`} className="nav-separator" />;
                        }
                        return (
                            <button
                                key={item.id}
                                className={`nav-item ${current === item.id ? "active" : ""}`}
                                onClick={() => handleNavClick(item.id)}
                                title={collapsed && !isMobile ? item.label : ""}
                            >
                                <span className="icon">{item.icon}</span>
                                {(!collapsed || isMobile) && <span className="label">{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    {user ? (
                        <div className="user-info">
                            {(!collapsed || isMobile) && <small>Hola, {user.displayName}</small>}
                            
                            <button 
                                onClick={logout} 
                                className="logout-btn"
                                title={idToken ? `[DEBUG] ID Token: ${idToken.substring(0, 50)}...` : "Cerrar Sesión"}
                            >
                                {(!collapsed || isMobile) ? "Cerrar Sesión" : "🚪"}
                            </button>
                        </div>
                    ) : null}
                    {!collapsed && !isMobile && <small className="copyright">© 2026</small>}
                </div>
            </div>
        </>
    );
}
