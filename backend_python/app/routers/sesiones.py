from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Body, Depends, Request
from sqlmodel import Session, select
from sqlalchemy import and_
from sqlalchemy import func, asc, desc, or_
from app.database import engine, get_session
from app import models
import logging

# Configure logging to output DEBUG level messages to the console
logging.basicConfig(level=logging.DEBUG)

Sesion = models.Sesion
Factura = models.Factura
Contacto = models.Contacto
Producto = models.Producto
Periodo = models.Periodo

router = APIRouter()


@router.get("")
def list_sesiones(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1),
    sort: Optional[str] = None,
    order: Optional[str] = "asc",
    q: Optional[str] = None,
    session: Session = Depends(get_session),
):
    params = dict(request.query_params)
    filters = {k[7:]: v for k, v in params.items() if k.startswith("filter_")}

    stmt = select(Sesion)

    # field filters
    for field, value in filters.items():
        if hasattr(Sesion, field):
            col = getattr(Sesion, field)
            try:
                stmt = stmt.where(col.ilike(f"%{value}%"))
            except Exception:
                stmt = stmt.where(col == value)

    # global q search across string-like columns
    if q:
        ors = []
        for col in Sesion.__table__.columns:
            try:
                ors.append(getattr(Sesion, col.name).ilike(f"%{q}%"))
            except Exception:
                continue
        if ors:
            stmt = stmt.where(or_(*ors))

    # total count
    total_res = session.exec(select(func.count()).select_from(Sesion)).one()
    try:
        total = int(total_res[0])
    except Exception:
        total = int(total_res)

    # ordering
    if sort and hasattr(Sesion, sort):
        col = getattr(Sesion, sort)
        stmt = stmt.order_by(desc(col) if (order and order.lower() == "desc") else asc(col))

    # pagination
    offset = max(0, (page - 1)) * page_size
    items = session.exec(stmt.offset(offset).limit(page_size)).all()

    return {"data": items, "total": total}

#@router.get("/{id}", response_model=Dict[str, Any])
@router.get("/{id}", response_model=Sesion)
def get_sesion(id: int):
    with Session(engine) as s:
        ses = s.get(Sesion, id)
        if not ses:
            raise HTTPException(status_code=404, detail="Sesion not found")

        return ses


@router.post("/", response_model=Sesion, status_code=201)
def create_sesion(payload: Dict[str, Any] = Body(...)):
    with Session(engine) as s:
        obj = Sesion(**payload)
        s.add(obj)
        s.commit()
        s.refresh(obj)
        return obj


@router.put("/{id}", response_model=Sesion)
def update_sesion(id: int, payload: Dict[str, Any] = Body(...)):
    with Session(engine) as s:
        srv = s.get(Sesion, id)
        if not srv:
            raise HTTPException(status_code=404, detail="Sesion not found")
        for k, v in payload.items():
            # skip common primary key field names if present in payload
            if k in ("id", "id"):
                continue
            if hasattr(srv, k):
                setattr(srv, k, v)
        s.add(srv)
        s.commit()
        s.refresh(srv)
        return srv


@router.delete("/{id}")
def delete_sesion(id: int):
    with Session(engine) as s:
        srv = s.get(Sesion, id)
        if not srv:
            raise HTTPException(status_code=404, detail="Sesion not found")
        s.delete(srv)
        s.commit()
        return {"deleted": True}

@router.get("/reports/summary-by-period")
def report_summary_by_period(year:str | None=Query(None, description="Año para filtrar las sesiones (yyyy),si se omite se incluyen todas")):
    with Session(engine) as s:
        stmt = (
            select(
                Periodo.IDPeriodo,
                Periodo.descPeriodo,
                func.count(Sesion.idSesion).label("numero_sesiones"),
                func.coalesce(func.sum(Sesion.total), 0).label("total_sesiones"),
            )
            .outerjoin(Sesion, Sesion.IDPeriodo == Periodo.IDPeriodo)
            .group_by(Periodo.IDPeriodo, Periodo.descPeriodo)
            .order_by(Periodo.IDPeriodo)
        )

        if year is not None:
            stmt = stmt.where(
                   # func.substring(columna, posición_inicial, longitud)
                    func.substring(Periodo.IDPeriodo, 1, 4) == year
         )

        rows = s.exec(stmt).all()
        result = [
            {
                "periodo_id": r[0],
                "periodo_desc": r[1],
                "numero_sesiones": int(r[2] or 0),
                "total_sesiones": float(r[3] or 0),
            }
            for r in rows
        ]
        return result