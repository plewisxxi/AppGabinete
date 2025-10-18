from typing import List, Dict, Any, Optional
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Body, Query
from sqlmodel import Session, select
from sqlalchemy import func
from app.database import engine
from app import models

Factura = models.Factura
Contacto = models.Contacto
Periodo = models.Periodo
Producto = models.Producto
Servicio = models.Servicio

router = APIRouter()


def get_pk_key(model):
    return list(model.__table__.primary_key)[0].key


def get_fk_key(model, target_table_name):
    for col in model.__table__.columns:
        for fk in col.foreign_keys:
            if fk.column.table.name == target_table_name:
                return col.key
    return None


PK = get_pk_key(Factura)
CONTACTO_FK = get_fk_key(Factura, Contacto.__table__.name)
PERIODO_FK = get_fk_key(Factura, Periodo.__table__.name)


@router.get("/", response_model=List[Factura])
def list_facturas(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1)):
    with Session(engine) as s:
        stmt = select(Factura).offset((page - 1) * page_size).limit(page_size)
        return s.exec(stmt).all()


@router.get("/{numero}", response_model=Factura)
def get_factura(numero: str):
    with Session(engine) as s:
        obj = s.get(Factura, numero)
        if not obj:
            raise HTTPException(status_code=404, detail="Factura not found")
        return obj


@router.post("/", response_model=Factura, status_code=201)
def create_factura(payload: Dict[str, Any] = Body(...)):
    """
    Payload keys must match model attribute names. The FK to Contacto and Periodo are detected dynamically.
    """
    contacto_value = payload.get(CONTACTO_FK)
    if contacto_value is None:
        raise HTTPException(status_code=400, detail=f"{CONTACTO_FK} required")
    with Session(engine) as s:
        contacto = s.get(Contacto, contacto_value)
        if not contacto:
            raise HTTPException(status_code=400, detail="Contacto not found")

        # calculate total from optional items (items not persisted)
        items = payload.get("items", [])
        total = Decimal("0")
        for it in items:
            try:
                cantidad = int(it.get("cantidad", 1))
                precio_unit = Decimal(str(it.get("precio_unit", 0)))
            except Exception:
                raise HTTPException(status_code=400, detail="invalid item values")
            prod_id = it.get("producto_id")
            srv_id = it.get("servicio_id")
            if prod_id is not None:
                if s.get(Producto, prod_id) is None:
                    raise HTTPException(status_code=400, detail=f"Producto {prod_id} not found")
            if srv_id is not None:
                if s.get(Servicio, srv_id) is None:
                    raise HTTPException(status_code=400, detail=f"Servicio {srv_id} not found")
            total += precio_unit * cantidad

        # build factura payload using dynamic FK keys if present
        factura_data = {k: v for k, v in payload.items() if k != "items"}
        factura_data.setdefault("total", total)

        factura = Factura(**factura_data)
        s.add(factura)
        s.commit()
        s.refresh(factura)
        return factura


@router.put("/{numero}", response_model=Factura)
def update_factura(numero: str, payload: Dict[str, Any] = Body(...)):
    items = payload.get("items", None)
    with Session(engine) as s:
        factura = s.get(Factura, numero)
        if not factura:
            raise HTTPException(status_code=404, detail="Factura not found")

        for k, v in payload.items():
            if k == PK or k == "items":
                continue
            if hasattr(factura, k):
                setattr(factura, k, v)

        if items is not None:
            total = Decimal("0")
            for it in items:
                try:
                    cantidad = int(it.get("cantidad", 1))
                    precio_unit = Decimal(str(it.get("precio_unit", 0)))
                except Exception:
                    raise HTTPException(status_code=400, detail="invalid item values")
                prod_id = it.get("producto_id")
                srv_id = it.get("servicio_id")
                if prod_id is not None and s.get(Producto, prod_id) is None:
                    raise HTTPException(status_code=400, detail=f"Producto {prod_id} not found")
                if srv_id is not None and s.get(Servicio, srv_id) is None:
                    raise HTTPException(status_code=400, detail=f"Servicio {srv_id} not found")
                total += precio_unit * cantidad
            setattr(factura, "total", total)

        s.add(factura)
        s.commit()
        s.refresh(factura)
        return factura


@router.delete("/{numero}")
def delete_factura(numero: str):
    with Session(engine) as s:
        obj = s.get(Factura, numero)
        if not obj:
            raise HTTPException(status_code=404, detail="Factura not found")
        s.delete(obj)
        s.commit()
        return {"deleted": True}


@router.get("/reports/summary-by-period")
def report_summary_by_period():
    with Session(engine) as s:
        # detect column keys dynamically
        periodo_pk = list(Periodo.__table__.primary_key)[0].key
        periodo_col = getattr(Periodo, periodo_pk)
        factura_periodo_key = PERIODO_FK or "periodo_id"
        factura_periodo_col = getattr(Factura, factura_periodo_key)
        stmt = (
            select(
                periodo_col,
                Periodo.__table__.c.get("nombre"),
                func.count(getattr(Factura, get_pk_key(Factura))).label("numero_facturas"),
                func.coalesce(func.sum(Factura.__table__.c.get("total")), 0).label("total_facturado"),
            )
            .outerjoin(Factura, factura_periodo_col == periodo_col)
            .group_by(periodo_col, Periodo.__table__.c.get("nombre"))
        )
        rows = s.exec(stmt).all()
        result = []
        for r in rows:
            result.append({
                "periodo_id": r[0],
                "periodo_nombre": r[1],
                "numero_facturas": int(r[2] or 0),
                "total_facturado": float(r[3] or 0),
            })
        return result


@router.get("/reports/summary-by-contact")
def report_summary_by_contact():
    with Session(engine) as s:
        stmt = (
            select(
                Contacto.nif,
                Contacto.nombre,
                func.count(Factura.id).label("numero_facturas"),
                func.coalesce(func.sum(Factura.total), 0).label("total_facturado"),
            )
            .outerjoin(Factura, Factura.contacto_nif == Contacto.NIF)
            .group_by(Contacto.nif, Contacto.nombre)
            .order_by(Contacto.nombre)
        )
        rows = s.exec(stmt).all()
        result = [
            {
                "contacto_nif": r[0],
                "contacto_nombre": r[1],
                "numero_facturas": int(r[2] or 0),
                "total_facturado": float(r[3] or 0),
            }
            for r in rows
        ]
        return result