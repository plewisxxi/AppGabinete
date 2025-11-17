from typing import List, Dict, Any, Optional
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Body, Query, Depends, Request
from sqlmodel import Session, select
from sqlalchemy import func, asc, desc, or_
from app.database import engine, get_session
from app import models

Factura = models.Factura
Contacto = models.Contacto
Periodo = models.Periodo
Producto = models.Producto
Sesion = models.Sesion

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


@router.get("/{numeroFactura}", response_model=Factura)
def get_factura(numeroFactura: str):
    with Session(engine) as s:
        obj = s.get(Factura, numeroFactura)
        if not obj:
            raise HTTPException(status_code=404, detail="Factura not found")
        return obj


@router.post("/", response_model=Factura, status_code=201)
def create_factura(payload: Dict[str, Any] = Body(...)):
    with Session(engine) as s:
        factura = Factura(**payload)
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
                srv_id = it.get("sesion_id")
                if prod_id is not None and s.get(Producto, prod_id) is None:
                    raise HTTPException(status_code=400, detail=f"Producto {prod_id} not found")
                if srv_id is not None and s.get(Sesion, srv_id) is None:
                    raise HTTPException(status_code=400, detail=f"Sesion {srv_id} not found")
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
        factura_periodo_key = PERIODO_FK or "IDPeriodo"
        factura_periodo_col = getattr(Factura, factura_periodo_key)
        stmt = (
            select(
                periodo_col,
                Periodo.__table__.c.get("descPeriodo"),
                func.count(getattr(Factura, get_pk_key(Factura))).label("numero_facturas"),
                func.coalesce(func.sum(Factura.total), 0).label("total_facturado"),
            )
            .outerjoin(Factura, factura_periodo_col == periodo_col)
            .group_by(periodo_col, Periodo.__table__.c.get("descPeriodo"))
        )
        rows = s.exec(stmt).all()
        result = []
        for r in rows:
            result.append({
                "IDPeriodo": r[0],
                "descPeriodo": r[1],
                "numero_facturas": int(r[2] or 0),
                "total_facturado": float(r[3] or 0),
            })
        return result


@router.get("/reports/summary-by-contact")
def report_summary_by_contact():
    with Session(engine) as s:
        stmt = (
            select(
                Contacto.NIF,
                Contacto.Nombre,
                func.count(Factura.numeroFactura).label("numero_facturas"),
                func.coalesce(func.sum(Factura.total), 0).label("total_facturado"),
            )
            .outerjoin(Factura, Factura.NIFCliente == Contacto.NIF)
            .group_by(Contacto.NIF, Contacto.Nombre)
            .order_by(Contacto.Nombre)
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


@router.get("")
def list_facturas(request: Request,
                  page: int = 1,
                  page_size: int = 50,
                  sort: Optional[str] = None,
                  order: Optional[str] = "asc",
                  q: Optional[str] = None,
                  session: Session = Depends(get_session)):
    params = dict(request.query_params)
    filters = {k[7:]: v for k, v in params.items() if k.startswith("filter_")}

    stmt = select(Factura)

    for field, value in filters.items():
        if hasattr(Factura, field):
            col = getattr(Factura, field)
            try:
                stmt = stmt.where(col.ilike(f"%{value}%"))
            except Exception:
                stmt = stmt.where(col == value)

    if q:
        ors = []
        for fname in Factura.__fields__.keys():
            if hasattr(Factura, fname):
                col = getattr(Factura, fname)
                try:
                    ors.append(col.ilike(f"%{q}%"))
                except Exception:
                    pass
        if ors:
            stmt = stmt.where(or_(*ors))

    total_res = session.exec(select(func.count()).select_from(Factura)).one()
    try:
        total = int(total_res[0])
    except Exception:
        total = int(total_res)

    if sort and hasattr(Factura, sort):
        col = getattr(Factura, sort)
        stmt = stmt.order_by(desc(col) if (order and order.lower() == "desc") else asc(col))

    offset = max(0, (page - 1)) * page_size
    items = session.exec(stmt.offset(offset).limit(page_size)).all()

    return {"data": items, "total": total}