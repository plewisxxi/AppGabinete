from typing import List, Dict, Any, Optional
from datetime import datetime, date
from fastapi import APIRouter, HTTPException, Query, Body, Depends, Request
from sqlmodel import Session, select
from sqlalchemy import and_
from sqlalchemy import func, asc, desc, or_
from app.database import engine, get_session
from app import models
from app.auth import get_current_user
import logging

# Configure logging to output DEBUG level messages to the console
logging.basicConfig(level=logging.DEBUG)

Sesion = models.Sesion
Factura = models.Factura
Contacto = models.Contacto
Producto = models.Producto
Periodo = models.Periodo

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


def serialize_sesion(sesion):
    """Convert Sesion object to dict with formatted dates."""
    data = {
        "idSesion": sesion.idSesion,
        "fechaOperacion": format_date_for_display(sesion.fechaOperacion),
        "NIFCliente": sesion.NIFCliente,
        #"nombreContacto": sesion.nombreContacto,
        #"descPeriodo": sesion.descPeriodo,
        #"descProducto": sesion.descProducto,
        "concepto": sesion.concepto,
        "base": sesion.base,
        "total": sesion.total,
        "IDPeriodo": sesion.IDPeriodo,
        "IDProducto": sesion.IDProducto,
        "facturado": sesion.facturado,
        "fechaPago": format_date_for_display(sesion.fechaPago),
        "totalPagado": sesion.totalPagado,
        "pendiente": (sesion.total or 0) - (sesion.totalPagado or 0),
        "numeroFactura": sesion.numeroFactura,
    }
    return data


@router.get("")
def list_sesiones(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1),
    sort: Optional[str] = None,
    order: Optional[str] = "asc",
    q: Optional[str] = None,
    start_date: Optional[str] = Query(None, description="Fecha inicio en formato DD-MM-YYYY"),
    end_date: Optional[str] = Query(None, description="Fecha fin en formato DD-MM-YYYY"),
    session: Session = Depends(get_session),
    user_empresas: List[int] = Depends(get_current_user),
):
    params = dict(request.query_params)
    filters = {k[7:]: v for k, v in params.items() if k.startswith("filter_")}

    # 1. Base query to identify filtered session IDs
    # This avoids row multiplication in aggregate calculations
    ids_stmt = select(Sesion.idSesion).where(Sesion.empresa_id.in_(user_empresas))

    # Date range filters
    if start_date:
        start_date_obj = parse_date_from_display(start_date)
        ids_stmt = ids_stmt.where(Sesion.fechaOperacion >= start_date_obj)
    if end_date:
        end_date_obj = parse_date_from_display(end_date)
        ids_stmt = ids_stmt.where(Sesion.fechaOperacion <= end_date_obj)

    # field filters
    for field, value in filters.items():
        if field == "nombreContacto":
            # Filter Sesiones by Contact name using a join/subquery only for IDs
            # Use unaccent for accent-insensitive search
            contact_nifs = select(Contacto.NIF).where(func.unaccent(Contacto.Nombre).ilike(func.unaccent(f"%{value}%")))
            ids_stmt = ids_stmt.where(Sesion.NIFCliente.in_(contact_nifs))
        elif field == "facturado":
            # Handle boolean filter specifically
            if isinstance(value, str):
                bool_val = value.lower() == "true"
            else:
                bool_val = bool(value)
            
            if bool_val:
                ids_stmt = ids_stmt.where(Sesion.facturado == True)
            else:
                # When filtering for NO FACTURADO, include NULL values
                ids_stmt = ids_stmt.where(or_(Sesion.facturado == False, Sesion.facturado == None))
        elif hasattr(Sesion, field):
            col = getattr(Sesion, field)
            try:
                # Use unaccent for string columns
                from sqlalchemy import cast, String
                ids_stmt = ids_stmt.where(func.unaccent(cast(col, String)).ilike(func.unaccent(f"%{value}%")))
            except Exception:
                ids_stmt = ids_stmt.where(col == value)

    # global q search
    if q:
        ors = []
        # Support searching by contact name in global search
        contact_nifs_q = select(Contacto.NIF).where(func.unaccent(Contacto.Nombre).ilike(func.unaccent(f"%{q}%")))
        ors.append(Sesion.NIFCliente.in_(contact_nifs_q))
        
        for col in Sesion.__table__.columns:
            try:
                from sqlalchemy import cast, String
                ors.append(func.unaccent(cast(getattr(Sesion, col.name), String)).ilike(func.unaccent(f"%{q}%")))
            except: continue
        if ors:
            ids_stmt = ids_stmt.where(or_(*ors))

    # Convert to subquery for use in counts and aggregates
    filtered_ids = ids_stmt.subquery()

    # 2. TOTAL COUNT
    total = session.exec(select(func.count()).select_from(filtered_ids)).one()

    # 3. ACCURATE AGGREGATES
    agg_stmt = select(
        func.coalesce(func.sum(Sesion.base), 0),
        func.coalesce(func.sum(Sesion.total), 0),
        func.coalesce(func.sum(Sesion.totalPagado), 0)
    ).where(Sesion.idSesion.in_(select(filtered_ids.c.idSesion)))
    
    aggs = session.exec(agg_stmt).one()
    aggregates = {
        "base": float(aggs[0]),
        "total": float(aggs[1]),
        "totalPagado": float(aggs[2]),
        "pendiente": float(aggs[1] - aggs[2])
    }

    # 4. FINAL DATA RETRIEVAL (with display joins)
    stmt = select(
        Sesion, 
        Contacto.Nombre.label("nombreContacto"), 
        Periodo.descPeriodo.label("descPeriodo"), 
        Producto.descProducto.label("descProducto")
    ).where(Sesion.idSesion.in_(select(filtered_ids.c.idSesion))) \
     .join(Contacto, and_(Sesion.NIFCliente == Contacto.NIF, Sesion.empresa_id == Contacto.empresa_id), isouter=True) \
     .join(Periodo, and_(Sesion.IDPeriodo == Periodo.IDPeriodo, Sesion.empresa_id == Periodo.empresa_id), isouter=True) \
     .join(Producto, and_(Sesion.IDProducto == Producto.IDProducto, Sesion.empresa_id == Producto.empresa_id), isouter=True)

    # ordering
    if sort:
        # Map sort field to actual column
        sort_col = None
        if hasattr(Sesion, sort):
            sort_col = getattr(Sesion, sort)
        elif sort == "nombreContacto":
            sort_col = Contacto.Nombre
        elif sort == "descPeriodo":
            sort_col = Periodo.descPeriodo
        elif sort == "descProducto":
            sort_col = Producto.descProducto
        
        if sort_col is not None:
            stmt = stmt.order_by(desc(sort_col) if (order and order.lower() == "desc") else asc(sort_col))

    # pagination
    offset = max(0, (page - 1)) * page_size
    items = session.exec(stmt.offset(offset).limit(page_size)).all()

    # Serialize items with formatted dates
    #serialized_items = [serialize_sesion(item) for item in items]
    # --- SERIALIZACIÓN ---
    serialized_items = []
    for row in items:
        # row es una tupla: (ObjetoSesion, nombre, desc_periodo, desc_producto)
        item = serialize_sesion(row[0]) 
        item["nombreContacto"] = row[1]
        item["descPeriodo"] = row[2]
        item["descProducto"] = row[3]
        serialized_items.append(item)

    return {"data": serialized_items, "total": total, "aggregates": aggregates}

#@router.get("/{id}", response_model=Dict[str, Any])
@router.get("/{id}")
def get_sesion(id: int, user_empresas: List[int] = Depends(get_current_user)):
    with Session(engine) as s:
        ses = s.exec(select(Sesion).where(Sesion.idSesion == id, Sesion.empresa_id.in_(user_empresas))).first()
        if not ses:
            raise HTTPException(status_code=404, detail="Sesion not found")

        return serialize_sesion(ses)


@router.post("", status_code=201)
def create_sesion(payload: Dict[str, Any] = Body(...), user_empresas: List[int] = Depends(get_current_user)):
    with Session(engine) as s:
        # Convert date fields from DD-MM-YYYY to date objects
        if "fechaOperacion" in payload and payload["fechaOperacion"]:
            payload["fechaOperacion"] = parse_date_from_display(payload["fechaOperacion"])
        if "fechaPago" in payload and payload["fechaPago"]:
            payload["fechaPago"] = parse_date_from_display(payload["fechaPago"])

        payload["empresa_id"] = user_empresas[0]

        # Auto-fill base/total from product pricing when a product is selected
        if "IDProducto" in payload and payload["IDProducto"]:
            prod = s.get(Producto, payload["IDProducto"])
            if prod and prod.base is not None:
                payload["base"] = prod.base
                payload["total"] = prod.base

        obj = Sesion(**payload)
        s.add(obj)
        s.commit()
        s.refresh(obj)
        return serialize_sesion(obj)


@router.put("/{id}")
def update_sesion(id: int, payload: Dict[str, Any] = Body(...), user_empresas: List[int] = Depends(get_current_user)):
    with Session(engine) as s:
        srv = s.exec(select(Sesion).where(Sesion.idSesion == id, Sesion.empresa_id.in_(user_empresas))).first()
        if not srv:
            raise HTTPException(status_code=404, detail="Sesion not found")
        for k, v in payload.items():
            # skip common primary key field names if present in payload
            if k in ("id", "id"):
                continue
            # Skip virtual/computed fields that are not part of the model
            if k in ("nombreContacto", "descPeriodo", "descProducto"):
                continue
            if hasattr(srv, k):
                # Convert date fields from DD-MM-YYYY to date objects
                if k in ["fechaOperacion", "fechaPago"] and v:
                    v = parse_date_from_display(v)
                # Map facturado labels back to boolean
                if k == "facturado" and isinstance(v, str):
                    if v == "FACTURADO": v = True
                    elif v == "NO FACTURADO": v = False
                setattr(srv, k, v)
        s.add(srv)
        s.commit()
        s.refresh(srv)
        return serialize_sesion(srv)


@router.delete("/{id}")
def delete_sesion(id: int, user_empresas: List[int] = Depends(get_current_user)):
    with Session(engine) as s:
        srv = s.exec(select(Sesion).where(Sesion.idSesion == id, Sesion.empresa_id.in_(user_empresas))).first()
        if not srv:
            raise HTTPException(status_code=404, detail="Sesion not found")
        s.delete(srv)
        s.commit()
        return {"deleted": True}

@router.get("/reports/summary-by-period")
def report_summary_by_period(
    year: str | None = Query(None, description="Año para filtrar las sesiones (yyyy),si se omite se incluyen todas"),
    user_empresas: List[int] = Depends(get_current_user)
):
    with Session(engine) as s:
        stmt = (
            select(
                Periodo.IDPeriodo,
                Periodo.descPeriodo,
                func.count(Sesion.idSesion).label("numero_sesiones"),
                func.coalesce(func.sum(Sesion.total), 0).label("total_sesiones"),
            )
            .outerjoin(Sesion, and_(Sesion.IDPeriodo == Periodo.IDPeriodo, Sesion.empresa_id.in_(user_empresas)))
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


@router.post("/clone")
def clone_sesiones(payload: Dict[str, Any] = Body(...), user_empresas: List[int] = Depends(get_current_user)):
    """
    Clone selected sessions to a new period.
    Payload: { "ids": [1, 2, ...], "target_period_id": "2025Q1" }
    """
    ids = payload.get("ids", [])
    target_period_id = payload.get("target_period_id")

    if not ids or not target_period_id:
        raise HTTPException(status_code=400, detail="Missing ids or target_period_id")

    
    with Session(engine) as s:
        # Validate target period
        target_period = s.get(Periodo, target_period_id)
        if not target_period:
            raise HTTPException(status_code=404, detail=f"Target period {target_period_id} not found")

        # Determine start date from Periodo entity if available
        target_date = target_period.fechaInicioPeriodo
        if not target_date:
            # Fallback calculation if not set in DB
            try:
                year = int(target_period_id[:4])
                rest = target_period_id[4:]
                month = 1
                if rest.startswith("Q"):
                    q = int(rest[1:])
                    month = (q - 1) * 3 + 1
                elif rest.startswith("M"):
                    month = int(rest[1:])
                target_date = date(year, month, 1)
            except Exception:
                target_date = date.today()

        created_count = 0
        skipped_count = 0

        for sid in ids:
            source = s.exec(select(Sesion).where(Sesion.idSesion == sid, Sesion.empresa_id.in_(user_empresas))).first()
            if not source:
                continue

            # Check duplicate: Same NIF, Product, and Target Period
            stmt = select(Sesion).where(
                Sesion.NIFCliente == source.NIFCliente,
                Sesion.IDProducto == source.IDProducto,
                Sesion.IDPeriodo == target_period_id,
                Sesion.empresa_id.in_(user_empresas)
            )
            existing = s.exec(stmt).first()

            if existing:
                skipped_count += 1
                continue

            # Get Product Description
            prod_desc = ""
            if source.IDProducto:
                prod = s.get(Producto, source.IDProducto)
                if prod:
                    prod_desc = prod.descProducto
            
            new_concept = f"{prod_desc} - {target_period.descPeriodo}" if prod_desc else f"{source.concepto or ''} - {target_period.descPeriodo}"

            # Create new session
            new_sesion = Sesion(
                fechaOperacion=target_date,
                NIFCliente=source.NIFCliente,
                concepto=new_concept,
                base=source.base,
                total=source.total,
                IDPeriodo=target_period_id,
                IDProducto=source.IDProducto,
                facturado=False,
                fechaPago=None,
                totalPagado=0,
                empresa_id=user_empresas[0]
            )
            s.add(new_sesion)
            created_count += 1
        
        s.commit()
    
    return {"created": created_count, "skipped": skipped_count}


@router.post("/facturar")
def facturar_sesiones(payload: List[Dict[str, Any]] = Body(...), user_empresas: List[int] = Depends(get_current_user)):
    """
    Generate invoices for selected sessions.
    Payload: [ { "idSesion": 1, "totalAFacturar": 100.00 }, ... ]
    """
    if not payload:
        raise HTTPException(status_code=400, detail="Payload must be a list of items")

    created_count = 0
    skipped_count = 0
    
    # Import Metadatos locally to avoid circular imports if any
    from app.models import Metadatos

    with Session(engine) as s:
        # Cache metadata and number counters per empresa
        per_empresa: Dict[int, Dict[str, Any]] = {}

        def ensure_meta_for_empresa(empresa_id: int):
            if empresa_id in per_empresa:
                return per_empresa[empresa_id]

            # Lock metadata row for this empresa to avoid race conditions on the counter
            stmt = select(Metadatos).where(Metadatos.empresa_id == empresa_id).with_for_update()
            meta = s.exec(stmt).first()
            if not meta:
                meta = Metadatos(serie="F", ultimoNumeroFactura=0, empresa_id=empresa_id)
                s.add(meta)
                s.flush()
                s.refresh(meta)

            serie_val = (meta.serie or "F").strip()

            # Ensure counter is at least as high as any existing factura for this empresa+serie
            from sqlalchemy import cast, BigInteger, func

            num_part = func.split_part(Factura.numeroFactura, "-", 2)
            numeric = func.nullif(func.regexp_replace(num_part, "[^0-9]", "", "g"), "")
            num_int = cast(numeric, BigInteger)
            max_stmt = select(func.max(num_int)).where(
                Factura.numeroFactura.like(f"{serie_val}-%"),
                Factura.empresa_id == empresa_id,
            )
            max_existing = s.exec(max_stmt).one() or 0

            current_num = max(meta.ultimoNumeroFactura, int(max_existing))

            per_empresa[empresa_id] = {
                "meta": meta,
                "serie": serie_val,
                "current_num": current_num,
            }
            return per_empresa[empresa_id]

        for item in payload:
            id_sesion = item.get("idSesion")
            total_facturar = item.get("totalAFacturar")

            if not id_sesion:
                continue

            sesion = s.exec(
                select(Sesion).where(
                    Sesion.idSesion == id_sesion,
                    Sesion.empresa_id.in_(user_empresas),
                )
            ).first()
            if not sesion:
                continue

            empresa_id = sesion.empresa_id
            meta_entry = ensure_meta_for_empresa(empresa_id)

            # 2.1 Check if already invoiced (duplicate check in Factura) for this empresa
            stmt = select(Factura).where(
                Factura.NIFCliente == sesion.NIFCliente,
                Factura.IDPeriodo == sesion.IDPeriodo,
                Factura.IDProducto == sesion.IDProducto,
                Factura.empresa_id == empresa_id,
            )
            existing = s.exec(stmt).first()
            if existing:
                skipped_count += 1
                continue

            # 2.2 Calculate Next Invoice Number (per empresa)
            meta_entry["current_num"] += 1
            num_factura = f"{meta_entry['serie']}-{meta_entry['current_num']}"

            # 2.3 Calculate Trimestre from Today
            today = date.today()
            # Q1=1-3, Q2=4-6, Q3=7-9, Q4=10-12
            quarter = (today.month - 1) // 3 + 1
            trimestre_str = f"{today.year}/T{quarter}"

            new_factura = Factura(
                numeroFactura=num_factura,
                fechaEmision=today,
                fechaPago=today,
                NIFCliente=sesion.NIFCliente,
                IDProducto=sesion.IDProducto,
                concepto=sesion.concepto,
                estado="Pagado",
                esRectificativa="No",
                base=total_facturar,
                total=total_facturar,
                metodoPago="No definido",
                IDPeriodo=sesion.IDPeriodo,
                trimestre=trimestre_str,
                empresa_id=empresa_id,
            )
            s.add(new_factura)

            # 2.5 Update Sesion
            sesion.facturado = True
            sesion.totalPagado = total_facturar
            sesion.fechaPago = today
            # Link sesion to invoice
            sesion.numeroFactura = num_factura

            s.add(sesion)
            created_count += 1

        # Update Metadata records with final counters
        for info in per_empresa.values():
            info["meta"].ultimoNumeroFactura = info["current_num"]
            s.add(info["meta"])
        
        s.commit()
        
    return {"created": created_count, "skipped": skipped_count}