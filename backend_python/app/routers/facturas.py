from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, date
from fastapi import APIRouter, HTTPException, Body, Query, Depends, Request
from sqlmodel import Session, select
from sqlalchemy import func, asc, desc, or_
from app.database import engine, get_session
from app import models

Factura = models.Factura
Contacto = models.Contacto
Periodo = models.Periodo
Producto = models.Producto
Sesion = models.Sesion

router = APIRouter()


def get_pk_key(model):
    return list(model.__table__.primary_key)[0].key


def get_fk_key(model, target_table_name):
    for col in model.__table__.columns:
        for fk in col.foreign_keys:
            if fk.column.table.name == target_table_name:
                return col.key
    return None


PK = get_pk_key(Factura)
CONTACTO_FK = get_fk_key(Factura, Contacto.__table__.name)
PERIODO_FK = get_fk_key(Factura, Periodo.__table__.name)


def format_date_for_display(date_obj):
    """Convert date object to DD-MM-YYYY string format."""
    if date_obj is None:
        return None
    if isinstance(date_obj, str):
        # If already a string, try to parse it first
        try:
            date_obj = datetime.strptime(date_obj, "%Y-%m-%d").date()
        except ValueError:
            return date_obj  # Return as-is if can't parse
    return date_obj.strftime("%d-%m-%Y")


def parse_date_from_display(date_str):
    """Convert DD-MM-YYYY string to date object."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%d-%m-%Y").date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}. Expected DD-MM-YYYY")


def serialize_factura(factura):
    """Convert Factura object to dict with formatted dates."""
    data = {
        "numeroFactura": factura.numeroFactura,
        "fechaEmision": format_date_for_display(factura.fechaEmision),
        "fechaPago": format_date_for_display(factura.fechaPago),
        "NIFCliente": factura.NIFCliente,
        "IDProducto": factura.IDProducto,
        "concepto": factura.concepto,
        "estado": factura.estado,
        "esRectificativa": factura.esRectificativa,
        "base": factura.base,
        "total": factura.total,
        "metodoPago": factura.metodoPago,
        "etiquetas": factura.etiquetas,
        "trimestre": factura.trimestre,
        "IDPeriodo": factura.IDPeriodo,
    }
    return data


@router.get("", response_model=Dict[str, Any])
def list_facturas(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1),
    sort: Optional[str] = None,
    order: Optional[str] = "asc",
    q: Optional[str] = None,
    start_date: Optional[str] = Query(None, description="Fecha inicio en formato DD-MM-YYYY"),
    end_date: Optional[str] = Query(None, description="Fecha fin en formato DD-MM-YYYY"),
    session: Session = Depends(get_session),
):
    params = dict(request.query_params)
    filters = {k[7:]: v for k, v in params.items() if k.startswith("filter_")}

    stmt = select(Factura)

    
    # Date range filters
    if start_date:
        start_date_obj = parse_date_from_display(start_date)
        stmt = stmt.where(Factura.fechaEmision >= start_date_obj)
    if end_date:
        end_date_obj = parse_date_from_display(end_date)
        stmt = stmt.where(Factura.fechaEmision <= end_date_obj)

    # field filters
    for field, value in filters.items():
        if field == "nombreContacto":
            # Search by contact name
            from app.models import Contacto
            contact_nifs = select(Contacto.NIF).where(func.unaccent(Contacto.Nombre).ilike(func.unaccent(f"%{value}%")))
            stmt = stmt.where(Factura.NIFCliente.in_(contact_nifs))
        elif hasattr(Factura, field):
            col = getattr(Factura, field)
            try:
                from sqlalchemy import cast, String
                stmt = stmt.where(func.unaccent(cast(col, String)).ilike(func.unaccent(f"%{value}%")))
            except Exception:
                stmt = stmt.where(col == value)
                
    # global q search
    if q:
        ors = []
        # Include contact name in global search
        from app.models import Contacto
        contact_nifs_q = select(Contacto.NIF).where(func.unaccent(Contacto.Nombre).ilike(func.unaccent(f"%{q}%")))
        ors.append(Factura.NIFCliente.in_(contact_nifs_q))

        for col in Factura.__table__.columns:
            is_string = False
            try:
                if hasattr(col.type, "python_type") and col.type.python_type == str:
                    is_string = True
            except NotImplementedError:
                if "String" in type(col.type).__name__:
                    is_string = True
            
            if is_string:
                try:
                    from sqlalchemy import cast, String
                    ors.append(func.unaccent(cast(getattr(Factura, col.name), String)).ilike(func.unaccent(f"%{q}%")))
                except Exception as e:
                    print(f"ERROR filtering {col.name}: {e}")
                    pass
        if ors:
            stmt = stmt.where(or_(*ors))
            
    # total count (filtered)
    total_res = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    try:
        total = int(total_res)
    except Exception:
        total = 0

    if sort and hasattr(Factura, sort):
        col = getattr(Factura, sort)
        stmt = stmt.order_by(desc(col) if (order and order.lower() == "desc") else asc(col))

    offset = max(0, (page - 1)) * page_size
    items = session.exec(stmt.offset(offset).limit(page_size)).all()

    # Serialize items with formatted dates
    serialized_items = [serialize_factura(item) for item in items]

    # aggregates (filtered)
    agg_stmt = select(
        func.coalesce(func.sum(Factura.base), 0),
        func.coalesce(func.sum(Factura.total), 0)
    ).select_from(stmt.subquery())
    
    aggs = session.exec(agg_stmt).one()
    aggregates = {
        "base": float(aggs[0]),
        "total": float(aggs[1])
    }

    return {"data": serialized_items, "total": total, "aggregates": aggregates}


@router.get("/{numeroFactura}")
def get_factura(numeroFactura: str):
    with Session(engine) as s:
        obj = s.get(Factura, numeroFactura)
        if not obj:
            raise HTTPException(status_code=404, detail="Factura not found")
        return serialize_factura(obj)


@router.post("", status_code=201)
def create_factura(payload: Dict[str, Any] = Body(...)):
    with Session(engine) as s:
        # Convert date fields from DD-MM-YYYY to date objects
        if "fechaEmision" in payload and payload["fechaEmision"]:
            payload["fechaEmision"] = parse_date_from_display(payload["fechaEmision"])
        if "fechaPago" in payload and payload["fechaPago"]:
            payload["fechaPago"] = parse_date_from_display(payload["fechaPago"])
        
        factura = Factura(**payload)
        s.add(factura)
        s.commit()
        s.refresh(factura)
        return serialize_factura(factura)


@router.put("/{numero}")
def update_factura(numero: str, payload: Dict[str, Any] = Body(...)):
    items = payload.get("items", None)
    with Session(engine) as s:
        factura = s.get(Factura, numero)
        if not factura:
            raise HTTPException(status_code=404, detail="Factura not found")

        for k, v in payload.items():
            if k == PK or k == "items":
                continue
            if hasattr(factura, k):
                # Convert date fields from DD-MM-YYYY to date objects
                if k in ["fechaEmision", "fechaPago"] and v:
                    v = parse_date_from_display(v)
                setattr(factura, k, v)

        if items is not None:
            total = Decimal("0")
            for it in items:
                try:
                    cantidad = int(it.get("cantidad", 1))
                    precio_unit = Decimal(str(it.get("precio_unit", 0)))
                except Exception:
                    raise HTTPException(status_code=400, detail="invalid item values")
                prod_id = it.get("producto_id")
                srv_id = it.get("sesion_id")
                if prod_id is not None and s.get(Producto, prod_id) is None:
                    raise HTTPException(status_code=400, detail=f"Producto {prod_id} not found")
                if srv_id is not None and s.get(Sesion, srv_id) is None:
                    raise HTTPException(status_code=400, detail=f"Sesion {srv_id} not found")
                total += precio_unit * cantidad
            setattr(factura, "total", total)

        s.add(factura)
        s.commit()
        s.refresh(factura)
        return serialize_factura(factura)


@router.delete("/{numero}")
def delete_factura(numero: str):
    with Session(engine) as s:
        obj = s.get(Factura, numero)
        if not obj:
            raise HTTPException(status_code=404, detail="Factura not found")
        s.delete(obj)
        s.commit()
        return {"deleted": True}


@router.get("/reports/summary-by-period")
def report_summary_by_period():
    with Session(engine) as s:
        # detect column keys dynamically
        periodo_pk = list(Periodo.__table__.primary_key)[0].key
        periodo_col = getattr(Periodo, periodo_pk)
        factura_periodo_key = PERIODO_FK or "IDPeriodo"
        factura_periodo_col = getattr(Factura, factura_periodo_key)
        stmt = (
            select(
                periodo_col,
                Periodo.__table__.c.get("descPeriodo"),
                func.count(getattr(Factura, get_pk_key(Factura))).label("numero_facturas"),
                func.coalesce(func.sum(Factura.total), 0).label("total_facturado"),
            )
            .outerjoin(Factura, factura_periodo_col == periodo_col)
            .group_by(periodo_col, Periodo.__table__.c.get("descPeriodo"))
        )
        rows = s.exec(stmt).all()
        result = []
        for r in rows:
            result.append({
                "IDPeriodo": r[0],
                "descPeriodo": r[1],
                "numero_facturas": int(r[2] or 0),
                "total_facturado": float(r[3] or 0),
            })
        return result


@router.get("/reports/summary-by-contact")
def report_summary_by_contact():
    with Session(engine) as s:
        stmt = (
            select(
                Contacto.NIF,
                Contacto.Nombre,
                func.count(Factura.numeroFactura).label("numero_facturas"),
                func.coalesce(func.sum(Factura.total), 0).label("total_facturado"),
            )
            .outerjoin(Factura, Factura.NIFCliente == Contacto.NIF)
            .group_by(Contacto.NIF, Contacto.Nombre)
            .order_by(Contacto.Nombre)
        )
        rows = s.exec(stmt).all()
        result = [
            {
                "contacto_nif": r[0],
                "contacto_nombre": r[1],
                "numero_facturas": int(r[2] or 0),
                "total_facturado": float(r[3] or 0),
            }
            for r in rows
        ]
        return result





