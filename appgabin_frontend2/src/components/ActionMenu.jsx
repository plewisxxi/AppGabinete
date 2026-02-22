import React, { useState, useRef, useEffect } from "react";

export default function ActionMenu({ onEdit, onDelete, onView, canEdit = true, canDelete = true }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="action-menu" ref={menuRef}>
            <button
                className="action-menu-trigger"
                onClick={() => setOpen(!open)}
                title="Opciones"
            >
                ⋮
            </button>

            {open && (
                <div className="action-menu-dropdown">
                    <button onClick={() => { setOpen(false); onView && onView(); }}>
                        <span style={{ marginRight: 8 }}>👁️</span> Ver
                    </button>
                    {canEdit && (
                        <button onClick={() => { setOpen(false); onEdit && onEdit(); }}>
                            <span style={{ marginRight: 8 }}>✏️</span> Editar
                        </button>
                    )}
                    {canDelete && (
                        <button className="danger" onClick={() => { setOpen(false); onDelete && onDelete(); }}>
                            <span style={{ marginRight: 8 }}>🗑️</span> Borrar
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
