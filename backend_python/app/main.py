from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
import firebase_admin
from firebase_admin import credentials
from .database import init_db
from .routers import contactos, productos, periodos, facturas, sesiones, stats, gastos, empresas

app = FastAPI(title="AppGabinete API", version="1.0.0")

# Inicializa Firebase
cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json")
if os.path.exists(cred_path):
    print("Initializing Firebase from serviceAccountKey.json")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
else:
    print("Initializing Firebase from default credentials (env variables)")
    firebase_admin.initialize_app()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(contactos.router, prefix="/api/contactos", tags=["contactos"])
app.include_router(sesiones.router, prefix="/api/sesiones", tags=["sesiones"])
app.include_router(productos.router, prefix="/api/productos", tags=["productos"])
app.include_router(periodos.router, prefix="/api/periodos", tags=["periodos"])
app.include_router(facturas.router, prefix="/api/facturas", tags=["facturas"])
app.include_router(gastos.router, prefix="/api/gastos", tags=["gastos"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(empresas.router, prefix="/api/empresas", tags=["empresas"])

@app.get("/ping")
def ping():
    return {"ping": "pong", "time": datetime.utcnow().isoformat()}
