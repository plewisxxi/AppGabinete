from typing import List
from fastapi import APIRouter, HTTPException, Query, Body
from sqlmodel import Session, select
from app.database import engine
from app.models import Contacto

router = APIRouter()

@router.get("/", response_model=List[Contacto])
def list_contactos(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1)):
    with Session(engine) as s:
        stmt = select(Contacto).offset((page - 1) * page_size).limit(page_size).order_by(Contacto.Nombre)
        return s.exec(stmt).all()

@router.get("/{nif}", response_model=Contacto)
def get_contacto(nif: str):
    with Session(engine) as s:
        contacto = s.get(Contacto, nif)
        if not contacto:
            raise HTTPException(status_code=404, detail="Contacto not found")
        return contacto

@router.post("/", response_model=Contacto, status_code=201)
def create_contacto(payload: Contacto):
    with Session(engine) as s:
        # payload.nif debe estar presente (pk)
        if payload.nif is None:
            raise HTTPException(status_code=400, detail="nif is required")
        existing = s.get(Contacto, payload.nif)
        if existing:
            raise HTTPException(status_code=400, detail="Contacto with this nif already exists")
        s.add(payload)
        s.commit()
        s.refresh(payload)
        return payload

@router.put("/{nif}", response_model=Contacto)
def update_contacto(nif: str, payload: Contacto):
    with Session(engine) as s:
        contacto = s.get(Contacto, nif)
        if not contacto:
            raise HTTPException(status_code=404, detail="Contacto not found")
        # Actualizar campos permitidos (ignorar primary key)
        for field, value in payload.dict(exclude_unset=True).items():
            if field == "NIF":
                continue
            setattr(contacto, field, value)
        s.add(contacto)
        s.commit()
        s.refresh(contacto)
        return contacto

@router.delete("/{nif}")
def delete_contacto(nif: str):
    with Session(engine) as s:
        contacto = s.get(Contacto, nif)
        if not contacto:
            raise HTTPException(status_code=404, detail="Contacto not found")
        s.delete(contacto)
        s.commit()
        return {"deleted": True}

@router.post("/bulk")
def bulk_contactos(payload: dict = Body(...)):
    """
    payload example:
    { "nifs": ["X123", "Y456"], "action": "delete" }
    """
    nifs = payload.get("nifs") or []
    action = payload.get("action")
    if not isinstance(nifs, list) or not nifs:
        raise HTTPException(status_code=400, detail="nifs required")
    with Session(engine) as s:
        if action == "delete":
            stmt = select(Contacto).where(Contacto.nif.in_(nifs))
            objs = s.exec(stmt).all()
            count = 0
            for o in objs:
                s.delete(o)
                count += 1
            s.commit()
            return {"deleted": count}
        raise HTTPException(status_code=400, detail="unknown action")