from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Body, Depends, Request
from sqlmodel import Session, select
from sqlalchemy import func, asc, desc, or_
from app.database import engine, get_session
from app.models import Periodo
import logging

logging.basicConfig(level=logging.DEBUG)


#Periodo = models.Periodo

router = APIRouter()

def get_pk_key(model):
    return list(model.__table__.primary_key)[0].key

PK = get_pk_key(Periodo)

@router.get("/", response_model=List[Periodo])
def list_periodos(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1)):
    with Session(engine) as s:
        stmt = select(Periodo).offset((page - 1) * page_size).limit(page_size)
        return s.exec(stmt).all()

@router.get("/{idperiodo}", response_model=Periodo)
def get_periodo(idperiodo: str):
    logging.debug(idperiodo)
    with Session(engine) as s:
        obj = s.get(Periodo, idperiodo)
        if not obj:
            raise HTTPException(status_code=404, detail="Periodo not found")
        return obj

@router.post("/", response_model=Periodo, status_code=201)
def create_periodo(payload: Periodo):
   with Session(engine) as s:
        if payload.IDPeriodo is None:
            raise HTTPException(status_code=400, detail="idperiodo is required")
        existing = s.get(Periodo, payload.IDPeriodo)
        if existing:
            raise HTTPException(status_code=400, detail="Periodo with this idperiodo already exists")
        s.add(payload)
        s.commit()
        s.refresh(payload)
        return payload

@router.put("/{idperiodo}", response_model=Periodo)
def update_producto(idperiodo: str, payload: Periodo):
    with Session(engine) as s:
        p = s.get(Periodo, idperiodo)
        if not p:
            raise HTTPException(status_code=404, detail="Periodo not found")
        for k, v in payload.dict(exclude_unset=True).items():
            if k == "idperiodo":
                continue
            setattr(p, k, v)
        s.add(p)
        s.commit()
        s.refresh(p)
        return p

@router.delete("/{idperiodo}")
def delete_periodo(idperiodo: str):
    with Session(engine) as s:
        item = s.get(Periodo, idperiodo)
        if not item:
            raise HTTPException(status_code=404, detail="Periodo not found")
        s.delete(item)
        s.commit()
        return {"deleted": True}

@router.get("")
def list_periodos(request: Request,
                  page: int = 1,
                  page_size: int = 50,
                  sort: Optional[str] = None,
                  order: Optional[str] = "asc",
                  q: Optional[str] = None,
                  session: Session = Depends(get_session)):
    params = dict(request.query_params)
    filters = {k[7:]: v for k, v in params.items() if k.startswith("filter_")}

    stmt = select(Periodo)

    for field, value in filters.items():
        if hasattr(Periodo, field):
            col = getattr(Periodo, field)
            try:
                stmt = stmt.where(col.ilike(f"%{value}%"))
            except Exception:
                stmt = stmt.where(col == value)

    if q:
        ors = []
        for fname in Periodo.__fields__.keys():
            if hasattr(Periodo, fname):
                col = getattr(Periodo, fname)
                try:
                    ors.append(col.ilike(f"%{q}%"))
                except Exception:
                    pass
        if ors:
            stmt = stmt.where(or_(*ors))

    total_res = session.exec(select(func.count()).select_from(Periodo)).one()
    try:
        total = int(total_res[0])
    except Exception:
        total = int(total_res)

    if sort and hasattr(Periodo, sort):
        col = getattr(Periodo, sort)
        stmt = stmt.order_by(desc(col) if (order and order.lower() == "desc") else asc(col))

    offset = max(0, (page - 1)) * page_size
    items = session.exec(stmt.offset(offset).limit(page_size)).all()

    return {"data": items, "total": total}