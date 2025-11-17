// ...new file...
export default {
  contactos: [
    "NIF",
    "Nombre",
    "Email",
    "Telefono",
    "Direccion",
    "Poblacion",
    "codigoPostal",
    "Pais",
    "IBAN",
    "SWIFT_BIC"
  ],
  productos: [
    "IDProducto",
    "descProducto"
  ],
  periodos: [
    "IDPeriodo",
    "descPeriodo"
  ],
  sesiones: [
    "idSesion",
    "fechaOperacion",
    "NIFCliente",
    "concepto",
    "base",
    "total",
    "IDPeriodo",
    "IDProducto",
    "facturado",
    "fechaPago",
    "totalPagado"
  ],
  facturas: [
    "numeroFactura",
    "fechaEmision",
    "fechaPago",
    "NIFCliente",
    "IDProducto",
    "concepto",
    "estado",
    "esRectificativa",
    "base",
    "total",
    "metodoPago",
    "etiquetas",
    "trimestre",
    "IDPeriodo"
  ]
};