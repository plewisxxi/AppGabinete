from typing import Optional, Dict
from fastapi import APIRouter, Depends, Request, HTTPException, Body
from sqlmodel import Session, select
from sqlalchemy import func, asc, desc, or_
from ..database import get_session
from ..models import Contacto

router = APIRouter()


@router.get("")
def list_contactos(request: Request,
                   page: int = 1,
                   page_size: int = 50,
                   sort: Optional[str] = None,
                   order: Optional[str] = "asc",
                   q: Optional[str] = None,
                   session: Session = Depends(get_session)):
    params: Dict[str, str] = dict(request.query_params)
    filters = {k[7:]: v for k, v in params.items() if k.startswith("filter_")}

    stmt = select(Contacto)

    # apply field filters (filter_<field>=value)
    for field, value in filters.items():
        if hasattr(Contacto, field):
            col = getattr(Contacto, field)
            try:
                stmt = stmt.where(col.ilike(f"%{value}%"))
            except Exception:
                stmt = stmt.where(col == value)

    # global q search across string-like columns
    if q:
        ors = []
        for col in Contacto.__table__.columns:
            try:
                ors.append(getattr(Contacto, col.name).ilike(f"%{q}%"))
            except Exception:
                # if not a text-compatible column, skip
                continue
        if ors:
            stmt = stmt.where(or_(*ors))

    # total count
    total_res = session.exec(select(func.count()).select_from(Contacto)).one()
    try:
        total = int(total_res[0])
    except Exception:
        total = int(total_res)

    # ordering
    if sort and hasattr(Contacto, sort):
        col = getattr(Contacto, sort)
        stmt = stmt.order_by(desc(col) if (order and order.lower() == "desc") else asc(col))

    # pagination
    offset = max(0, (page - 1)) * page_size
    items = session.exec(stmt.offset(offset).limit(page_size)).all()

    return {"data": items, "total": total}


@router.get("/{nif}", response_model=Contacto)
def get_contacto(nif: str, session: Session = Depends(get_session)):
    contacto = session.get(Contacto, nif)
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto not found")
    return contacto


@router.post("/", response_model=Contacto, status_code=201)
def create_contacto(payload: Contacto, session: Session = Depends(get_session)):
    # payload.NIF debe estar presente (pk)
    if getattr(payload, "NIF", None) is None:
        raise HTTPException(status_code=400, detail="nif is required")
    existing = session.get(Contacto, payload.NIF)
    if existing:
        raise HTTPException(status_code=400, detail="Contacto with this nif already exists")
    session.add(payload)
    session.commit()
    session.refresh(payload)
    return payload


@router.put("/{nif}", response_model=Contacto)
def update_contacto(nif: str, payload: Contacto, session: Session = Depends(get_session)):
    contacto = session.get(Contacto, nif)
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto not found")
    # Actualizar campos permitidos (ignorar primary key)
    for field, value in payload.dict(exclude_unset=True).items():
        if field == "NIF":
            continue
        setattr(contacto, field, value)
    session.add(contacto)
    session.commit()
    session.refresh(contacto)
    return contacto


@router.delete("/{nif}")
def delete_contacto(nif: str, session: Session = Depends(get_session)):
    contacto = session.get(Contacto, nif)
    if not contacto:
        raise HTTPException(status_code=404, detail="Contacto not found")
    session.delete(contacto)
    session.commit()
    return {"deleted": True}


@router.post("/bulk")
def bulk_contactos(payload: dict = Body(...), session: Session = Depends(get_session)):
    """
    payload example:
    { "nifs": ["X123", "Y456"], "action": "delete" }
    """
    nifs = payload.get("nifs") or []
    action = payload.get("action")
    if not isinstance(nifs, list) or not nifs:
        raise HTTPException(status_code=400, detail="nifs required")

    if action == "delete":
        stmt = select(Contacto).where(getattr(Contacto, "NIF").in_(nifs))
        objs = session.exec(stmt).all()
        count = 0
        for o in objs:
            session.delete(o)
            count += 1
        session.commit()
        return {"deleted": count}

    raise HTTPException(status_code=400, detail="unknown action")