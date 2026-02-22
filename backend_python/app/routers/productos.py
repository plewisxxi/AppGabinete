from typing import List, Optional
from fastapi import APIRouter, HTTPException, Body, Query, Depends, Request
from sqlmodel import Session, select
from sqlalchemy import func, asc, desc, or_
from app.database import engine, get_session
from app.models import Producto

router = APIRouter()

@router.get("")
def list_productos(request: Request,
                   page: int = 1,
                   page_size: int = 50,
                   sort: Optional[str] = None,
                   order: Optional[str] = "asc",
                   q: Optional[str] = None,
                   session: Session = Depends(get_session)):
    params = dict(request.query_params)
    filters = {k[7:]: v for k, v in params.items() if k.startswith("filter_")}

    stmt = select(Producto)

    for field, value in filters.items():
        if hasattr(Producto, field):
            col = getattr(Producto, field)
            try:
                from sqlalchemy import cast, String
                stmt = stmt.where(func.unaccent(cast(col, String)).ilike(func.unaccent(f"%{value}%")))
            except Exception:
                stmt = stmt.where(col == value)

    if q:
        ors = []
        for fname in Producto.__fields__.keys():
            if hasattr(Producto, fname):
                col = getattr(Producto, fname)
                column_type = col.type if hasattr(col, "type") else None
                is_string = False
                try:
                    if column_type and hasattr(column_type, "python_type") and column_type.python_type == str:
                        is_string = True
                except NotImplementedError:
                    if column_type and "String" in type(column_type).__name__:
                        is_string = True
                
                    try:
                        from sqlalchemy import cast, String
                        ors.append(func.unaccent(cast(col, String)).ilike(func.unaccent(f"%{q}%")))
                    except Exception as e:
                        print(f"ERROR filtering {col.name}: {e}")
                        pass
        if ors:
            stmt = stmt.where(or_(*ors))

    # total count (filtered)
    # Use subquery to count rows matching the filters
    total_res = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    try:
        total = int(total_res)
    except Exception:
        total = 0

    if sort and hasattr(Producto, sort):
        col = getattr(Producto, sort)
        stmt = stmt.order_by(desc(col) if (order and order.lower() == "desc") else asc(col))

    offset = max(0, (page - 1)) * page_size
    items = session.exec(stmt.offset(offset).limit(page_size)).all()

    return {"data": items, "total": total}

@router.get("/", response_model=List[Producto])
def list_productos_old(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1)):
    with Session(engine) as s:
        stmt = select(Producto).offset((page - 1) * page_size).limit(page_size).order_by(Producto.IDProducto.desc())
        return s.exec(stmt).all()

@router.get("/{idproducto}", response_model=Producto)
def get_producto(idproducto: str):
    with Session(engine) as s:
        p = s.get(Producto, idproducto)
        if not p:
            raise HTTPException(status_code=404, detail="Producto not found")
        return p

@router.post("", response_model=Producto, status_code=201)
def create_producto(payload: Producto):
    with Session(engine) as s:
        if payload.IDProducto is None:
            raise HTTPException(status_code=400, detail="idproducto is required")
        existing = s.get(Producto, payload.IDProducto)
        if existing:
            raise HTTPException(status_code=400, detail="Producto with this idproducto already exists")
        s.add(payload)
        s.commit()
        s.refresh(payload)
        return payload

@router.put("/{idproducto}", response_model=Producto)
def update_producto(idproducto: str, payload: Producto):
    with Session(engine) as s:
        p = s.get(Producto, idproducto)
        if not p:
            raise HTTPException(status_code=404, detail="Producto not found")
        for k, v in payload.dict(exclude_unset=True).items():
            if k == "idproducto":
                continue
            setattr(p, k, v)
        s.add(p)
        s.commit()
        s.refresh(p)
        return p

@router.delete("/{idproducto}")
def delete_producto(idproducto: str):
    with Session(engine) as s:
        p = s.get(Producto, idproducto)
        if not p:
            raise HTTPException(status_code=404, detail="Producto not found")
        s.delete(p)
        s.commit()
        return {"deleted": True}

@router.post("/bulk")
def bulk_productos(payload: dict = Body(...)):
    """
    payload example: { "ids":["A1","B2"], "action":"delete" }
    """
    ids = payload.get("ids") or []
    action = payload.get("action")
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=400, detail="ids required")
    with Session(engine) as s:
        if action == "delete":
            stmt = select(Producto).where(Producto.IDProducto.in_(ids))
            objs = s.exec(stmt).all()
            count = 0
            for o in objs:
                s.delete(o)
                count += 1
            s.commit()
            return {"deleted": count}
        raise HTTPException(status_code=400, detail="unknown action")