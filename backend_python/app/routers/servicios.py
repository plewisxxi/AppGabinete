from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query,Body
from sqlmodel import Session, select
from sqlalchemy import and_
from app.database import engine
from app import models
#import logging

# Configure logging to output DEBUG level messages to the console
#logging.basicConfig(level=logging.DEBUG)

Servicio = models.Servicio
Factura = models.Factura
Contacto = models.Contacto
Producto = models.Producto
Periodo = models.Periodo

router = APIRouter(prefix="/api/servicios", tags=["servicios"])


@router.get("/", response_model=List[Dict[str, Any]])
def list_servicios(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1),
):
    with Session(engine) as s:
        stmt = select(Servicio).offset((page - 1) * page_size).limit(page_size)
        servicios = s.exec(stmt).all()

        results: List[Dict[str, Any]] = []
        for srv in servicios:
            data = srv.dict()  # usar .dict() en vez de __dict__

            nif_cliente = getattr(srv, "NIFCliente", None)
            id_producto = getattr(srv, "IDProducto", None)
            id_periodo = getattr(srv, "IDPeriodo", None)
            
            #logging.debug(f"nif_cliente={nif_cliente}, id_producto={id_producto}, id_periodo={id_periodo}")

            numFactura_value = None
            fechaFactura_value=None
            totalFactura_Value=None 

            if nif_cliente is not None and id_producto is not None and id_periodo is not None:
                # asegurar tipo del periodo
                try:
                    id_periodo_cast = int(id_periodo)
                except Exception:
                    id_periodo_cast = id_periodo

                factura_stmt = select(Factura).where(
                    and_(
                        getattr(Factura, "NIFCliente") == nif_cliente,
                        getattr(Factura, "IDProducto") == id_producto,
                        getattr(Factura, "IDPeriodo") == id_periodo_cast,
                    )
                )
                found = s.exec(factura_stmt).all()
                numerosFra = [getattr(f, "numero", None) for f in found if getattr(f, "numero", None) is not None]
                fechasFra = [getattr(f, "fechaPago", None) for f in found if getattr(f, "fechaPago", None) is not None]
                totalFra = [getattr(f, "total", None) for f in found if getattr(f, "total", None) is not None]
                
                # muestra log con datos nif_cliente, id_producto, id_periodo, numeros
                #logging.debug(f"nif_cliente={nif_cliente}, id_producto={id_producto}, id_periodo={id_periodo}, numeros={numeros}")

                if len(numerosFra) == 0:
                    numFactura_value = None
                    fechaFactura_value=None
                    totalFactura_Value=None
                elif len(numerosFra) == 1:
                    numFactura_value = numerosFra[0]
                    fechaFactura_value=fechasFra[0] 
                    totalFactura_Value=totalFra[0]
                else:
                    numFactura_value = numerosFra
                    fechaFactura_value=fechasFra
                    totalFactura_Value=totalFra

            data["numFactura"] = numFactura_value
            data["fechaFactura"] = fechaFactura_value
            data["totalFactura"] = totalFactura_Value
            results.append(data)

        return results


@router.get("/{id}", response_model=Dict[str, Any])
def get_servicio(
    id: int,
):
    with Session(engine) as s:
        srv = s.get(Servicio, id)
        if not srv:
            raise HTTPException(status_code=404, detail="Servicio not found")

        data = srv.dict()  # usar .dict()

        nif_cliente = getattr(srv, "NIFCliente", None)
        id_producto = getattr(srv, "IDProducto", None)
        id_periodo = getattr(srv, "IDPeriodo", None)

        numFactura_value = None
        fechaFactura_value=None
        totalFactura_Value=None

        if nif_cliente is not None and id_producto is not None and id_periodo is not None:
            try:
                id_periodo_cast = int(id_periodo)
            except Exception:
                id_periodo_cast = id_periodo

            factura_stmt = select(Factura).where(
                and_(
                    getattr(Factura, "NIFCliente") == nif_cliente,
                    getattr(Factura, "IDProducto") == id_producto,
                    getattr(Factura, "IDPeriodo") == id_periodo_cast,
                )
            )
            found = s.exec(factura_stmt).all()
            numerosFra = [getattr(f, "numero", None) for f in found if getattr(f, "numero", None) is not None]
            fechasFra = [getattr(f, "fechaPago", None) for f in found if getattr(f, "fechaPago", None) is not None]
            totalFra = [getattr(f, "total", None) for f in found if getattr(f, "total", None) is not None]
 
            if len(numerosFra) == 0:
                numFactura_value = None
                fechaFactura_value=None
                totalFactura_Value=None
            elif len(numerosFra) == 1:
                numFactura_value = numerosFra[0]
                fechaFactura_value=fechasFra[0] 
                totalFactura_Value=totalFra[0]
            else:
                numFactura_value = numerosFra
                fechaFactura_value=fechasFra
                totalFactura_Value=totalFra

        data["numFactura"] = numFactura_value
        data["fechaFactura"] = fechaFactura_value
        data["totalFactura"] = totalFactura_Value
        
        return data


@router.post("/", response_model=Servicio, status_code=201)
def create_servicio(payload: Dict[str, Any] = Body(...)):
    with Session(engine) as s:
        obj = Servicio(**payload)
        s.add(obj)
        s.commit()
        s.refresh(obj)
        return obj


@router.put("/{pk}", response_model=Servicio)
def update_servicio(pk: int, payload: Dict[str, Any] = Body(...)):
    with Session(engine) as s:
        srv = s.get(Servicio, pk)
        if not srv:
            raise HTTPException(status_code=404, detail="Servicio not found")
        for k, v in payload.items():
            # skip common primary key field names if present in payload
            if k in ("id", "pk"):
                continue
            if hasattr(srv, k):
                setattr(srv, k, v)
        s.add(srv)
        s.commit()
        s.refresh(srv)
        return srv


@router.delete("/{pk}")
def delete_servicio(pk: int):
    with Session(engine) as s:
        srv = s.get(Servicio, pk)
        if not srv:
            raise HTTPException(status_code=404, detail="Servicio not found")
        s.delete(srv)
        s.commit()
        return {"deleted": True}
