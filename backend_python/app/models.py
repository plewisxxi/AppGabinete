from sqlmodel import Field, SQLModel,Relationship
from datetime import datetime,date
from decimal import Decimal
from typing import List
from typing import Optional

# Auto-generated models from DB schema

class ContactoBase(SQLModel):
    NIF: str = Field(default=None, primary_key=True)

    Nombre: Optional[str] = Field(default=None)
    Email: Optional[str] = Field(default=None)
    Direccion: Optional[str] = Field(default=None)
    Poblacion: Optional[str] = Field(default=None)
    codigoPostal: Optional[int] = Field(default=None)
    Pais: Optional[str] = Field(default=None)
    Telefono: Optional[str] = Field(default=None)
    IBAN: Optional[str] = Field(default=None)
    SWIFT_BIC: Optional[str] = Field(default=None)

class Contacto(ContactoBase, table=True):
    pass


class ProductoBase(SQLModel):
    IDProducto: Optional[str] = Field(default=None, primary_key=True)
    descProducto: Optional[str] = Field(default=None)

class Producto(ProductoBase, table=True):
    pass

class PeriodoBase(SQLModel):
    IDPeriodo: Optional[str] = Field(default=None, primary_key=True)
    descPeriodo: Optional[str] = Field(default=None)
    fechaInicioPeriodo: Optional[date] = Field(default=None)

class Periodo(PeriodoBase, table=True):
    pass

class SesionBase(SQLModel):
    idSesion: int  = Field(default=None, primary_key=True)
    fechaOperacion: Optional[date] = Field(default=None)
    NIFCliente: Optional[str] = Field(default=None)
    #nombreContacto: Optional[str] = Field(default=None)
    concepto: Optional[str] = Field(default=None)
    base: Optional[Decimal] = Field(default=None)
    total: Optional[Decimal] = Field(default=None)
    IDPeriodo: Optional[str] = Field(default=None)
    #descPeriodo: Optional[str] = Field(default=None)
    IDProducto: Optional[str] = Field(default=None)
    #descProducto: Optional[str] = Field(default=None)
    facturado: Optional[str] = Field(default=None)
    fechaPago: Optional[date] = Field(default=None)
    totalPagado: Optional[Decimal] = Field(default=None)
    numeroFactura: Optional[str] = Field(default=None)

class Sesion(SesionBase, table=True):
    pass

class FacturaBase(SQLModel):
    numeroFactura: str  = Field(default=None, primary_key=True)
    fechaEmision: Optional[date] = Field(default=None)
    fechaPago: Optional[date] = Field(default=None)
    NIFCliente: Optional[str] 
    IDProducto: Optional[str]
    concepto: Optional[str] = Field(default=None)
    estado: Optional[str] = Field(default=None)
    esRectificativa: Optional[str] = Field(default=None)
    base: Optional[Decimal] = Field(default=None)
    total: Optional[Decimal] = Field(default=None)
    metodoPago: Optional[str] = Field(default=None)
    etiquetas: Optional[str] = Field(default=None)
    trimestre: Optional[str] = Field(default=None)
    IDPeriodo: Optional[str] 

class Factura(FacturaBase, table=True):
    pass


class Metadatos(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    serie: Optional[str] = Field(default="F")
    ultimoNumeroFactura: int = Field(default=0)
    # created_at might exist in DB but we can omit if not used or add if needed.
    # User didn't mention it, but check_schema showed it.
    # Best to include it as Optional or ignore it if SQLModel allows. 
    # Let's verify if we need it. check_schema showed 'created_at'.
    # I'll enable it as optional to avoid insert errors if not default.
    created_at: Optional[datetime] = Field(default=None)
