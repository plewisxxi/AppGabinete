from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routers import contactos, servicios, productos, periodos, facturas

app = FastAPI(title="AppGabinete API", version="1.0.0")
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
app.include_router(servicios.router, prefix="/api/servicios", tags=["servicios"])
app.include_router(productos.router, prefix="/api/productos", tags=["productos"])
app.include_router(periodos.router, prefix="/api/periodos", tags=["periodos"])
app.include_router(facturas.router, prefix="/api/facturas", tags=["facturas"])