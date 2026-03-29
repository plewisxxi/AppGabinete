from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func, or_
from app.database import get_session
from app import models
from sqlalchemy import extract
from app.auth import get_current_user
from typing import List

router = APIRouter()

Sesion = models.Sesion
Periodo = models.Periodo

NOMBRES_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

@router.get("/sesiones-estado")
def get_sesiones_estado(
    year: int = Query(..., description="Año para las métricas"),
    group_by: str = Query("monthly", description="monthly, quarterly, yearly"),
    db: Session = Depends(get_session),
    user_empresas: List[int] = Depends(get_current_user)
):
    """
    Agrupa sesiones por mes, trimestre o año.
    """
    if group_by == "yearly":
        stmt = select(
            func.count(Sesion.idSesion).filter(Sesion.facturado == True).label("count_facturadas"),
            func.count(Sesion.idSesion).filter(or_(Sesion.facturado == False, Sesion.facturado == None)).label("count_no_facturadas"),
            func.coalesce(func.sum(Sesion.total).filter(Sesion.facturado == True), 0).label("sum_facturadas"),
            func.coalesce(func.sum(Sesion.total).filter(or_(Sesion.facturado == False, Sesion.facturado == None)), 0).label("sum_no_facturadas")
        ).where(extract('year', Sesion.fechaOperacion) == year, Sesion.empresa_id.in_(user_empresas))
        
        row = db.exec(stmt).first()
        return [{
            "name": str(year),
            "count_facturadas": int(row[0]) if row else 0,
            "count_no_facturadas": int(row[1]) if row else 0,
            "sum_facturadas": float(row[2]) if row else 0,
            "sum_no_facturadas": float(row[3]) if row else 0
        }]
    
    elif group_by == "quarterly":
        stmt = select(
            func.floor((extract('month', Sesion.fechaOperacion) - 1) / 3 + 1).label("periodo"),
            func.count(Sesion.idSesion).filter(Sesion.facturado == True).label("count_facturadas"),
            func.count(Sesion.idSesion).filter(or_(Sesion.facturado == False, Sesion.facturado == None)).label("count_no_facturadas"),
            func.coalesce(func.sum(Sesion.total).filter(Sesion.facturado == True), 0).label("sum_facturadas"),
            func.coalesce(func.sum(Sesion.total).filter(or_(Sesion.facturado == False, Sesion.facturado == None)), 0).label("sum_no_facturadas")
        ).where(extract('year', Sesion.fechaOperacion) == year, Sesion.empresa_id.in_(user_empresas)).group_by("periodo").order_by("periodo")
        
        rows = db.exec(stmt).all()
        data_map = {int(r[0]): r for r in rows}
        return [
            {
                "name": f"T{q}",
                "count_facturadas": int(data_map[q][1]) if q in data_map else 0,
                "count_no_facturadas": int(data_map[q][2]) if q in data_map else 0,
                "sum_facturadas": float(data_map[q][3]) if q in data_map else 0,
                "sum_no_facturadas": float(data_map[q][4]) if q in data_map else 0
            } for q in range(1, 5)
        ]
    else:
        stmt = select(
            extract('month', Sesion.fechaOperacion).label("mes"),
            func.count(Sesion.idSesion).filter(Sesion.facturado == True).label("count_facturadas"),
            func.count(Sesion.idSesion).filter(or_(Sesion.facturado == False, Sesion.facturado == None)).label("count_no_facturadas"),
            func.coalesce(func.sum(Sesion.total).filter(Sesion.facturado == True), 0).label("sum_facturadas"),
            func.coalesce(func.sum(Sesion.total).filter(or_(Sesion.facturado == False, Sesion.facturado == None)), 0).label("sum_no_facturadas")
        ).where(extract('year', Sesion.fechaOperacion) == year, Sesion.empresa_id.in_(user_empresas)).group_by("mes").order_by("mes")
        
        rows = db.exec(stmt).all()
        data_map = {int(r[0]): r for r in rows}
        return [
            {
                "name": NOMBRES_MESES[m-1],
                "count_facturadas": int(data_map[m][1]) if m in data_map else 0,
                "count_no_facturadas": int(data_map[m][2]) if m in data_map else 0,
                "sum_facturadas": float(data_map[m][3]) if m in data_map else 0,
                "sum_no_facturadas": float(data_map[m][4]) if m in data_map else 0
            } for m in range(1, 13)
        ]

@router.get("/facturacion-total")
def get_facturacion_total(
    year: int = Query(..., description="Año"),
    group_by: str = Query("monthly", description="monthly o quarterly"),
    db: Session = Depends(get_session),
    user_empresas: List[int] = Depends(get_current_user)
):
    """
    Total facturado agrupado por mes o trimestre de emisión de la factura.
    """
    Factura = models.Factura
    if group_by == "yearly":
        stmt = select(
            func.coalesce(func.sum(Factura.total), 0).label("total")
        ).where(extract('year', Factura.fechaEmision) == year, Factura.empresa_id.in_(user_empresas))
        row = db.exec(stmt).first()
        return [{"name": str(year), "total": float(row) if row else 0}]
    
    elif group_by == "quarterly":
        stmt = select(
            func.floor((extract('month', Factura.fechaEmision) - 1) / 3 + 1).label("periodo"),
            func.coalesce(func.sum(Factura.total), 0).label("total")
        ).where(
            extract('year', Factura.fechaEmision) == year, Factura.empresa_id.in_(user_empresas)
        ).group_by("periodo").order_by("periodo")
        
        rows = db.exec(stmt).all()
        data_map = {int(r[0]): r[1] for r in rows}
        return [
            {"name": f"T{q}", "total": float(data_map.get(q, 0))}
            for q in range(1, 5)
        ]
    else:
        stmt = select(
            extract('month', Factura.fechaEmision).label("mes"),
            func.coalesce(func.sum(Factura.total), 0).label("total")
        ).where(
            extract('year', Factura.fechaEmision) == year, Factura.empresa_id.in_(user_empresas)
        ).group_by("mes").order_by("mes")
        
        rows = db.exec(stmt).all()
        data_map = {int(r[0]): r[1] for r in rows}
        return [
            {"name": NOMBRES_MESES[m-1], "total": float(data_map.get(m, 0))}
            for m in range(1, 13)
        ]

from sqlalchemy import text

@router.get("/gastos-total")
def get_gastos_total(
    year: int = Query(..., description="Año"),
    group_by: str = Query("monthly", description="monthly, quarterly, or yearly"),
    db: Session = Depends(get_session),
    user_empresas: List[int] = Depends(get_current_user)
):
    """
    Total gastos agrupado por mes, trimestre o año de emisión (usando Raw SQL).
    """
    if group_by == "yearly":
        sql = text("""
            SELECT COALESCE(SUM(\"totalPagado\"), 0), 
                   COALESCE(SUM(\"total\"), 0) - COALESCE(SUM(\"totalPagado\"), 0)
            FROM public.gastos 
            WHERE EXTRACT(YEAR FROM \"fechaEmision\") = :year
            AND empresa_id IN :empresas
        """)
        row = db.execute(sql, {"year": year, "empresas": tuple(user_empresas)}).fetchone()
        return [{"name": str(year), "total_pagado": float(row[0]), "total_pendiente": float(row[1])}]
    
    elif group_by == "quarterly":
        sql = text("""
            SELECT FLOOR((EXTRACT(MONTH FROM \"fechaEmision\") - 1) / 3 + 1) as periodo, 
                   COALESCE(SUM(\"totalPagado\"), 0) as total_pagado,
                   COALESCE(SUM(\"total\"), 0) - COALESCE(SUM(\"totalPagado\"), 0) as total_pendiente
            FROM public.gastos 
            WHERE EXTRACT(YEAR FROM \"fechaEmision\") = :year 
            AND empresa_id IN :empresas
            GROUP BY periodo ORDER BY periodo
        """)
        rows = db.execute(sql, {"year": year, "empresas": tuple(user_empresas)}).fetchall()
        data_map = {int(r[0]): r for r in rows}
        return [
            {
                "name": f"T{q}", 
                "total_pagado": float(data_map[q][1]) if q in data_map else 0,
                "total_pendiente": float(data_map[q][2]) if q in data_map else 0
            }
            for q in range(1, 5)
        ]
    else:
        sql = text("""
            SELECT EXTRACT(MONTH FROM \"fechaEmision\") as mes, 
                   COALESCE(SUM(\"totalPagado\"), 0) as total_pagado,
                   COALESCE(SUM(\"total\"), 0) - COALESCE(SUM(\"totalPagado\"), 0) as total_pendiente
            FROM public.gastos 
            WHERE EXTRACT(YEAR FROM \"fechaEmision\") = :year 
            AND empresa_id IN :empresas
            GROUP BY mes ORDER BY mes
        """)
        rows = db.execute(sql, {"year": year, "empresas": tuple(user_empresas)}).fetchall()
        data_map = {int(r[0]): r for r in rows}
        return [
            {
                "name": NOMBRES_MESES[m-1], 
                "total_pagado": float(data_map[m][1]) if m in data_map else 0,
                "total_pendiente": float(data_map[m][2]) if m in data_map else 0
            }
            for m in range(1, 13)
        ]

@router.get("/resumen")
def get_resumen(
    start_date: str = Query(..., description="Fecha inicio YYYY-MM-DD"),
    end_date: str = Query(..., description="Fecha fin YYYY-MM-DD"),
    db: Session = Depends(get_session),
    user_empresas: List[int] = Depends(get_current_user)
):
    """
    Devuelve los totales para la tarjeta de resumen interactiva.
    """
    from datetime import datetime
    s_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    e_date = datetime.strptime(end_date, "%Y-%m-%d").date()

    # 1. Sesiones
    stmt_sesiones = select(
        func.count(Sesion.idSesion).label("total_count"),
        func.coalesce(func.sum(Sesion.total), 0).label("total_sum"),
        
        func.count(Sesion.idSesion).filter(Sesion.facturado == True).label("count_facturadas"),
        func.coalesce(func.sum(Sesion.total).filter(Sesion.facturado == True), 0).label("sum_facturadas"),
        
        func.count(Sesion.idSesion).filter(or_(Sesion.facturado == False, Sesion.facturado == None)).label("count_no_facturadas"),
        func.coalesce(func.sum(Sesion.total).filter(or_(Sesion.facturado == False, Sesion.facturado == None)), 0).label("sum_no_facturadas")
    ).where(
        Sesion.fechaOperacion >= s_date,
        Sesion.fechaOperacion <= e_date,
        Sesion.empresa_id.in_(user_empresas)
    )
    s_row = db.exec(stmt_sesiones).first()

    # 2. Facturas (Ingresos) by fechaEmision
    Factura = models.Factura
    stmt_facturas = select(
        func.count(Factura.numeroFactura).label("count"),
        func.coalesce(func.sum(Factura.total), 0).label("sum")
    ).where(
        Factura.fechaEmision >= s_date,
        Factura.fechaEmision <= e_date,
        Factura.empresa_id.in_(user_empresas)
    )
    f_row = db.exec(stmt_facturas).first()

    # 3. Gastos by fechaPago
    Gasto = models.Gasto
    stmt_gastos = select(
        func.count(Gasto.id).label("count"),
        func.coalesce(func.sum(Gasto.total), 0).label("sum")
    ).where(
        Gasto.fechaPago >= s_date,
        Gasto.fechaPago <= e_date,
        Gasto.empresa_id.in_(user_empresas)
    )
    g_row = db.exec(stmt_gastos).first()

    return {
        "sesiones": {
            "total_count": int(s_row[0] if s_row else 0),
            "total_sum": float(s_row[1] if s_row else 0),
            "count_facturadas": int(s_row[2] if s_row else 0),
            "sum_facturadas": float(s_row[3] if s_row else 0),
            "count_no_facturadas": int(s_row[4] if s_row else 0),
            "sum_no_facturadas": float(s_row[5] if s_row else 0),
        },
        "ingresos": {
            "count": int(f_row[0] if f_row else 0),
            "sum": float(f_row[1] if f_row else 0)
        },
        "gastos": {
            "count": int(g_row[0] if g_row else 0),
            "sum": float(g_row[1] if g_row else 0)
        }
    }
