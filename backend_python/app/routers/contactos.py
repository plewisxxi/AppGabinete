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
                from sqlalchemy import cast, String
                stmt = stmt.where(func.unaccent(cast(col, String)).ilike(func.unaccent(f"%{value}%")))
            except Exception:
                stmt = stmt.where(col == value)

    # global q search across string-like columns
    if q:
        ors = []
        for col in Contacto.__table__.columns:
            is_string = False
            try:
                if hasattr(col.type, "python_type") and col.type.python_type == str:
                    is_string = True
            except NotImplementedError:
                if "String" in type(col.type).__name__:
                    is_string = True
            
            if is_string:
                try:
                    # Explicit cast to ensure unaccent receives text
                    # Also print error if it fails
                    from sqlalchemy import cast, String
                    ors.append(func.unaccent(cast(getattr(Contacto, col.name), String)).ilike(func.unaccent(f"%{q}%")))
                except Exception as e:
                    print(f"ERROR filtering {col.name}: {e}")
                    continue
        if ors:
            print(f"DEBUG: q='{q}', ors count={len(ors)}")
            # Debug the filter expression
            # print(f"DEBUG expr: {or_(*ors)}") 
            stmt = stmt.where(or_(*ors))

    # total count (filtered)
    # Use subquery to count rows matching the filters
    total_res = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    try:
        total = int(total_res)
    except Exception:
        total = 0

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


@router.post("", response_model=Contacto, status_code=201)
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