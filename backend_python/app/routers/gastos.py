from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, date
from fastapi import APIRouter, HTTPException, Body, Query, Depends, Request
from sqlmodel import Session, select
from sqlalchemy import func, asc, desc, or_, cast, String
from app.database import engine, get_session
from app import models

Gasto = models.Gasto

router = APIRouter()

def format_date_for_display(date_obj):
    """Convert date object to DD-MM-YYYY string format."""
    if date_obj is None:
        return None
    if isinstance(date_obj, str):
        try:
            date_obj = datetime.strptime(date_obj, "%Y-%m-%d").date()
        except ValueError:
            return date_obj
    return date_obj.strftime("%d-%m-%Y")

def parse_date_from_display(date_str):
    """Convert DD-MM-YYYY string to date object."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%d-%m-%Y").date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}. Expected DD-MM-YYYY")

def serialize_gasto(gasto):
    """Convert Gasto object to dict with formatted dates."""
    data = {
        "id": gasto.id,
        "created_at": gasto.created_at.isoformat() if gasto.created_at else None,
        "numeroFactura": gasto.numeroFactura,
        "fechaEmision": format_date_for_display(gasto.fechaEmision),
        "contacto": gasto.contacto,
        "concepto": gasto.concepto,
        "fechaPago": format_date_for_display(gasto.fechaPago),
        "totalPagado": float(gasto.totalPagado) if gasto.totalPagado is not None else None,
        "total": float(gasto.total) if gasto.total is not None else None,
        "pendiente": float((gasto.total or 0) - (gasto.totalPagado or 0)),
    }
    return data


@router.get("", response_model=Dict[str, Any])
def list_gastos(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1),
    sort: Optional[str] = None,
    order: Optional[str] = "asc",
    q: Optional[str] = None,
    year: Optional[int] = Query(None, description="Filtrar por año de emisión"),
    month: Optional[int] = Query(None, description="Filtrar por mes de emisión (1-12)"),
    quarter: Optional[int] = Query(None, description="Filtrar por trimestre de emisión (1-4)"),
    start_date: Optional[str] = Query(None, description="Fecha inicio en formato DD-MM-YYYY"),
    end_date: Optional[str] = Query(None, description="Fecha fin en formato DD-MM-YYYY"),
    pagado: Optional[str] = Query(None, description="Filter: 'true' (Pagados), 'false' (No pagados)"),
    session: Session = Depends(get_session),
):
    params = dict(request.query_params)
    filters = {k[7:]: v for k, v in params.items() if k.startswith("filter_")}

    # 1. Base query to identify filtered Gasto IDs (avoids duplicates in aggregates)
    ids_stmt = select(Gasto.id)

    # Date range filters on fechaEmision
    if start_date:
        start_date_obj = parse_date_from_display(start_date)
        ids_stmt = ids_stmt.where(Gasto.fechaEmision >= start_date_obj)
    if end_date:
        end_date_obj = parse_date_from_display(end_date)
        ids_stmt = ids_stmt.where(Gasto.fechaEmision <= end_date_obj)

    # Year/Month/Quarter filters
    from sqlalchemy import extract
    if year:
        ids_stmt = ids_stmt.where(extract('year', Gasto.fechaEmision) == year)
    if month:
        ids_stmt = ids_stmt.where(extract('month', Gasto.fechaEmision) == month)
    if quarter:
        # T1: 1-3, T2: 4-6, T3: 7-9, T4: 10-12
        ids_stmt = ids_stmt.where(func.floor((extract('month', Gasto.fechaEmision) - 1) / 3 + 1) == quarter)

    # Pagado filter (based on amounts)
    if pagado is not None:
        if pagado.lower() == "true":
            ids_stmt = ids_stmt.where(Gasto.totalPagado >= Gasto.total)
        elif pagado.lower() == "false":
            ids_stmt = ids_stmt.where(or_(Gasto.totalPagado < Gasto.total, Gasto.totalPagado == None))

    # Field filters
    for field, value in filters.items():
        if hasattr(Gasto, field):
            col = getattr(Gasto, field)
            try:
                ids_stmt = ids_stmt.where(func.unaccent(cast(col, String)).ilike(func.unaccent(f"%{value}%")))
            except Exception:
                ids_stmt = ids_stmt.where(col == value)
                
    # Global q search
    if q:
        ors = []
        for col in Gasto.__table__.columns:
            try:
                ors.append(func.unaccent(cast(getattr(Gasto, col.name), String)).ilike(func.unaccent(f"%{q}%")))
            except: continue
        if ors:
            ids_stmt = ids_stmt.where(or_(*ors))

    # Convert to subquery for use in counts and aggregates
    filtered_ids = ids_stmt.subquery()

    # 2. TOTAL COUNT (filtered)
    total_count = session.exec(select(func.count()).select_from(filtered_ids)).one()

    # 3. ACCURATE AGGREGATES (filtered) using the subquery of IDs
    agg_stmt = select(
        func.coalesce(func.sum(Gasto.totalPagado), 0),
        func.coalesce(func.sum(Gasto.total), 0)
    ).where(Gasto.id.in_(select(filtered_ids.c.id)))
    
    aggs = session.exec(agg_stmt).one()
    aggregates = {
        "totalPagado": float(aggs[0]),
        "pendiente": float(aggs[1] - aggs[0]),
        "total": float(aggs[1])
    }

    # 4. FINAL DATA RETRIEVAL
    stmt = select(Gasto).where(Gasto.id.in_(select(filtered_ids.c.id)))

    # Sorting
    if sort and hasattr(Gasto, sort):
        col = getattr(Gasto, sort)
        stmt = stmt.order_by(desc(col) if (order and order.lower() == "desc") else asc(col))
    else:
        stmt = stmt.order_by(desc(Gasto.fechaEmision))

    # Pagination
    offset = max(0, (page - 1)) * page_size
    results = session.exec(stmt.offset(offset).limit(page_size)).all()

    # Serialize
    serialized_items = [serialize_gasto(item) for item in results]

    return {"data": serialized_items, "total": total_count, "aggregates": aggregates}

@router.get("/{id}")
def get_gasto(id: int, session: Session = Depends(get_session)):
    gasto = session.get(Gasto, id)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto not found")
    return serialize_gasto(gasto)


@router.post("/clone")
def clone_gastos(payload: Dict[str, Any] = Body(...)):
    """
    Clone selected gastos to a new period/month.
    Payload: { "ids": [1, 2, ...], "target_period_id": "2025-01ENERO" }
    """
    import traceback
    try:
        ids = payload.get("ids", [])
        target_period_id = payload.get("target_period_id")

        if not ids or not target_period_id:
            raise HTTPException(status_code=400, detail="Missing ids or target_period_id")

        # Helper to get month name in Spanish
        MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

        import re
        from datetime import date
        from app.models import Periodo

        with Session(engine) as s:
            target_period = s.get(Periodo, target_period_id)
            if not target_period:
                raise HTTPException(status_code=404, detail=f"Target period {target_period_id} not found")
            
            target_date = target_period.fechaInicioPeriodo
            if not target_date:
                # Try to parse from ID like "2025-01ENERO"
                try:
                    match = re.search(r'(\d{4})-(\d{2})', target_period_id)
                    if match:
                        year = int(match.group(1))
                        month = int(match.group(2))
                        target_date = date(year, month, 1)
                    else:
                        # Fallback to old logic or today
                        year = int(target_period_id[:4])
                        target_date = date(year, 1, 1)
                except Exception:
                    target_date = date.today().replace(day=1)
            
            target_date = target_date.replace(day=1)
            new_year = target_date.year
            new_month_name = MESES[target_date.month - 1]

            created_count = 0
            skipped_count = 0

            for gid in ids:
                source = s.get(Gasto, gid)
                if not source:
                    continue
                
                old_concept = source.concepto or ""
                new_concept = old_concept
                
                for m in MESES:
                    pattern = re.compile(rf'\b{m}\b', re.IGNORECASE)
                    if pattern.search(new_concept):
                        new_concept = pattern.sub(new_month_name, new_concept)
                
                new_concept = re.sub(r'\b20\d{2}\b', str(new_year), new_concept)

                new_gasto = Gasto(
                    fechaEmision=target_date,
                    contacto=source.contacto,
                    concepto=new_concept,
                    total=source.total,
                    numeroFactura=None,
                    fechaPago=None,
                    totalPagado=0,
                    created_at=datetime.utcnow()
                )
                s.add(new_gasto)
                created_count += 1
                
            s.commit()
        
        return {"created": created_count, "skipped": skipped_count}
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error in clone_gastos: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        with open("error_clone_debug.txt", "w") as f:
            f.write(error_msg)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", status_code=201)
def create_gasto(payload: Dict[str, Any] = Body(...), session: Session = Depends(get_session)):
    # Convert dates
    if "fechaEmision" in payload and payload["fechaEmision"]:
        payload["fechaEmision"] = parse_date_from_display(payload["fechaEmision"])
    if "fechaPago" in payload and payload["fechaPago"]:
        payload["fechaPago"] = parse_date_from_display(payload["fechaPago"])
    
    # Remove id if present to allow DB to generate it
    payload.pop("id", None)
    
    # If created_at is not provided or is None, set it to now
    if not payload.get("created_at"):
        payload["created_at"] = datetime.utcnow()


    gasto = Gasto(**payload)
    session.add(gasto)
    session.commit()
    session.refresh(gasto)
    return serialize_gasto(gasto)

@router.put("/{id}")
def update_gasto(id: int, payload: Dict[str, Any] = Body(...), session: Session = Depends(get_session)):
    gasto = session.get(Gasto, id)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto not found")
    
    # Convert dates
    if "fechaEmision" in payload and payload["fechaEmision"]:
        payload["fechaEmision"] = parse_date_from_display(payload["fechaEmision"])
    if "fechaPago" in payload and payload["fechaPago"]:
        payload["fechaPago"] = parse_date_from_display(payload["fechaPago"])

    
    for key, value in payload.items():
        if hasattr(gasto, key):
            setattr(gasto, key, value)
    
    session.add(gasto)
    session.commit()
    session.refresh(gasto)
    return serialize_gasto(gasto)

@router.delete("/{id}")
def delete_gasto(id: int, session: Session = Depends(get_session)):
    gasto = session.get(Gasto, id)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto not found")
    session.delete(gasto)
    session.commit()
    return {"ok": True}

@router.post("/pay")
def pay_gastos(payload: Dict[str, Any] = Body(...), session: Session = Depends(get_session)):
    """
    Mark selected gastos as paid.
    Payload: { "ids": [1, 2, ...] }
    """
    ids = payload.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="Missing ids")
    
    today = date.today()
    updated_count = 0
    
    for gid in ids:
        gasto = session.get(Gasto, gid)
        if gasto:
            # A gasto is considered paid if Total = TotalPagado
            # Here we set totalPagado = total and fechaPago = today
            gasto.totalPagado = gasto.total
            gasto.fechaPago = today
            session.add(gasto)
            updated_count += 1
            
    session.commit()
    return {"updated": updated_count}
