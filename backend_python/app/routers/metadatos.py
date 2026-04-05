from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.auth import get_current_user
from app.models import Metadatos
from pydantic import BaseModel

router = APIRouter()


class MetadatosUpdate(BaseModel):
    serie: Optional[str] = None
    serieRectificativa: Optional[str] = None


@router.get("/", response_model=dict)
def get_metadatos(
    session: Session = Depends(get_session),
    user_empresas: List[int] = Depends(get_current_user),
):
    """Return the metadata for the current user's company."""
    empresa_id = user_empresas[0] if user_empresas else None
    if not empresa_id:
        raise HTTPException(status_code=403, detail="No company found")

    meta = session.exec(
        select(Metadatos).where(Metadatos.empresa_id == empresa_id)
    ).first()

    if not meta:
        # Auto-create a default record
        meta = Metadatos(empresa_id=empresa_id, serie="F", ultimoNumeroFactura=0)
        session.add(meta)
        session.commit()
        session.refresh(meta)

    return {
        "id": meta.id,
        "empresa_id": meta.empresa_id,
        "serie": meta.serie or "F",
        "serieRectificativa": getattr(meta, "serieRectificativa", "R") or "R",
        "ultimoNumeroFactura": meta.ultimoNumeroFactura,
    }


@router.put("/", response_model=dict)
def update_metadatos(
    payload: MetadatosUpdate,
    session: Session = Depends(get_session),
    user_empresas: List[int] = Depends(get_current_user),
):
    """Update the metadata for the current user's company."""
    empresa_id = user_empresas[0] if user_empresas else None
    if not empresa_id:
        raise HTTPException(status_code=403, detail="No company found")

    meta = session.exec(
        select(Metadatos).where(Metadatos.empresa_id == empresa_id)
    ).first()

    if not meta:
        meta = Metadatos(empresa_id=empresa_id, serie="F", ultimoNumeroFactura=0)
        session.add(meta)

    if payload.serie is not None:
        meta.serie = payload.serie
    if payload.serieRectificativa is not None:
        # Store on the model — column may not exist yet; handled gracefully
        try:
            meta.serieRectificativa = payload.serieRectificativa
        except AttributeError:
            pass

    session.commit()
    session.refresh(meta)

    return {
        "id": meta.id,
        "empresa_id": meta.empresa_id,
        "serie": meta.serie or "F",
        "serieRectificativa": getattr(meta, "serieRectificativa", "R") or "R",
        "ultimoNumeroFactura": meta.ultimoNumeroFactura,
    }
