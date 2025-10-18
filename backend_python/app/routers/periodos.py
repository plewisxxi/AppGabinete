from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from sqlmodel import Session, select
from app.database import engine
from app import models

Periodo = models.Periodo

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