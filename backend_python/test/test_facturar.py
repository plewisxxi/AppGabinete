import asyncio
import json
from app.database import get_session, engine
from sqlmodel import Session, select
from app.models import Sesion, Metadatos, Factura

with Session(engine) as s:
    meta = s.exec(select(Metadatos)).all()
    print("Metadatos:", meta)
    facturas = s.exec(select(Factura.numeroFactura).where(Factura.numeroFactura.like("%2026%"))).all()
    print("Facturas:", facturas)
