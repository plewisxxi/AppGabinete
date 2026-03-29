import React from "react";
import { useAuth } from "../AuthContext";

export default function Unauthorized() {
    const { logout } = useAuth();

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            backgroundColor: "#f1f5f9",
            padding: "20px"
        }}>
            <div style={{
                backgroundColor: "#fff",
                padding: "40px",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                textAlign: "center",
                maxWidth: "400px",
                width: "100%"
            }}>
                <h1 style={{ color: "#ef4444", marginBottom: "16px", fontSize: "24px" }}>
                    Acceso Denegado
                </h1>
                <p style={{ color: "#475569", marginBottom: "24px", lineHeight: "1.5" }}>
                    Tu cuenta está pendiente de activación o no tienes ninguna empresa asignada. Por favor, contacta con el administrador.
                </p>
                <button
                    onClick={logout}
                    style={{
                        backgroundColor: "#4f46e5",
                        color: "#fff",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "500",
                        width: "100%",
                        fontSize: "16px"
                    }}
                >
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
}
