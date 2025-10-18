from sqlmodel import Field, SQLModel,Relationship
from datetime import datetime
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
    cuentaCliente: Optional[int] = Field(default=None)

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

class Periodo(PeriodoBase, table=True):
    pass

class ServicioBase(SQLModel):
    fechaOperacion: Optional[str] = Field(default=None)
    NIFCliente: Optional[str] = Field(default=None, primary_key=True)
    concepto: Optional[str] = Field(default=None)
    base: Optional[str] = Field(default=None)
    total: Optional[str] = Field(default=None)
    IDPeriodo: Optional[str] = Field(default=None, primary_key=True)
    IDProducto: Optional[str] = Field(default=None, primary_key=True)
    valorBusqueda: Optional[str] = Field(default=None)
    facturado: Optional[str] = Field(default=None)
    fechaPago: Optional[str] = Field(default=None)
    totalPagado: Optional[str] = Field(default=None)
    pendiente: Optional[str] = Field(default=None)

class Servicio(ServicioBase, table=True):
    pass

class FacturaBase(SQLModel):
    valorBusqueda: Optional[str] = Field(default=None)
    fechaEmision: Optional[str] = Field(default=None)
    fechaPago: Optional[str] = Field(default=None)
    numero: str  = Field(default=None, primary_key=True)
    NIFCliente: Optional[str] 
    IDProducto: Optional[str]
    concepto: Optional[str] = Field(default=None)
    estado: Optional[str] = Field(default=None)
    esRectificativa: Optional[str] = Field(default=None)
    base: Optional[str] = Field(default=None)
    total: Optional[str] = Field(default=None)
    metodoPago: Optional[str] = Field(default=None)
    etiquetas: Optional[str] = Field(default=None)
    trimestre: Optional[str] = Field(default=None)
    IDPeriodo: Optional[str] 

class Factura(FacturaBase, table=True):
    pass


