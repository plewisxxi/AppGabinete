from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.auth import get_current_user
from app.models import Empresa

router = APIRouter()

@router.get("/me", response_model=List[Dict[str, Any]])
def get_my_empresas(session: Session = Depends(get_session), user_empresas: List[int] = Depends(get_current_user)):
    """Return the companies (empresas) the current user belongs to."""
    empresas = session.exec(select(Empresa).where(Empresa.id.in_(user_empresas))).all()
    # Return minimal fields
    return [{"id": e.id, "nombre": e.nombre} for e in empresas]
