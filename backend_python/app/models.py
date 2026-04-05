from sqlmodel import Field, SQLModel,Relationship
from datetime import datetime,date
from decimal import Decimal
from typing import List, Optional

class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    firebase_uid: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    nombre: Optional[str] = Field(default=None)
    telegram_uid: Optional[str] = Field(default=None)
    estado: Optional[str] = Field(default=None)

class UsuarioEmpresa(SQLModel, table=True):
    __tablename__ = "usuarios_empresa"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    usuario_id: Optional[int] = Field(default=None)
    empresa_id: Optional[int] = Field(default=None)
    rol: Optional[str] = Field(default=None)


class Empresa(SQLModel, table=True):
    __tablename__ = "empresas"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(default=None)
    nombre: Optional[str] = Field(default=None)

# Auto-generated models from DB schema

class ContactoBase(SQLModel):
    NIF: str = Field(default=None, primary_key=True)
    empresa_id: Optional[int] = Field(default=None)

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
    empresa_id: Optional[int] = Field(default=None)
    descProducto: Optional[str] = Field(default=None)
    base: Optional[Decimal] = Field(default=None)

class Producto(ProductoBase, table=True):
    pass

class PeriodoBase(SQLModel):
    IDPeriodo: Optional[str] = Field(default=None, primary_key=True)
    empresa_id: Optional[int] = Field(default=None)
    descPeriodo: Optional[str] = Field(default=None)
    fechaInicioPeriodo: Optional[date] = Field(default=None)

class Periodo(PeriodoBase, table=True):
    pass

class SesionBase(SQLModel):
    idSesion: int  = Field(default=None, primary_key=True)
    empresa_id: Optional[int] = Field(default=None)
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
    facturado: Optional[bool] = Field(default=None)
    fechaPago: Optional[date] = Field(default=None)
    totalPagado: Optional[Decimal] = Field(default=None)
    numeroFactura: Optional[str] = Field(default=None)

class Sesion(SesionBase, table=True):
    pass

class FacturaBase(SQLModel):
    numeroFactura: str  = Field(default=None, primary_key=True)
    empresa_id: Optional[int] = Field(default=None, primary_key=True)
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
    empresa_id: Optional[int] = Field(default=None)
    serie: Optional[str] = Field(default="F")
    serieRectificativa: Optional[str] = Field(default="R")
    ultimoNumeroFactura: int = Field(default=0)
    created_at: Optional[datetime] = Field(default=None)


class GastoBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    empresa_id: Optional[int] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    numeroFactura: Optional[str] = Field(default=None)
    fechaEmision: Optional[date] = Field(default=None)
    contacto: Optional[str] = Field(default=None)
    concepto: Optional[str] = Field(default=None)
    fechaPago: Optional[date] = Field(default=None)
    totalPagado: Optional[Decimal] = Field(default=None)
    total: Optional[Decimal] = Field(default=None)

class Gasto(GastoBase, table=True):
    __tablename__ = "gastos"
