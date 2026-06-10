export default {
  contactos: [
    { field: "NIF", label: "NIF", row: 1, width: "25%", widthList: "100px" },
    { field: "Nombre", label: "Nombre", row: 1, width: "75%", isTitle: true, widthList: "240px" },
    { field: "Email", label: "Email", row: 2, width: "70%", widthList: "240px" },
    { field: "Telefono", label: "Telefono", row: 2, width: "30%", widthList: "120px" },
    { field: "Direccion", label: "Direccion", row: 3, width: "45%", hideInList: true },
    { field: "Poblacion", label: "Poblacion", row: 3, width: "25%", hideInList: true },
    { field: "codigoPostal", label: "CP", row: 3, width: "12%", hideInList: true },
    { field: "Pais", label: "Pais", row: 3, width: "18%", hideInList: true }
  ],
  productos: [
    { field: "IDProducto", label: "ID", row: 1, width: "30%", widthList: "100px" },
    { field: "descProducto", label: "Descripción", row: 2, width: "100%", isTitle: true, widthList: "auto" },
    { field: "base", label: "Precio Base", type: "money", row: 1, width: "70%", widthList: "120px" }
  ],
  periodos: [
    { field: "IDPeriodo", label: "ID" },
    { field: "descPeriodo", label: "Descripción", isTitle: true },
    { field: "fechaInicioPeriodo", label: "Fecha Inicio", type: "date" }
  ],
  sesiones: [
    { field: "idSesion", label: "ID", readOnly: true, row: 1, width: "12%", widthList: "58px" },
    { field: "NIFCliente", label: "NIF", type: "datalist", source: "contactos", displayKey: "Nombre", valueKey: "NIF", row: 2, width: "20%", hideInList: true },
    { field: "nombreContacto", label: "Contacto", readOnly: true, row: 2, width: "80%", widthList: "160px" },
    { field: "fechaOperacion", label: "Fecha", type: "date", row: 3, width: "15%", widthList: "95px" },
    { field: "IDPeriodo", label: "Periodo", type: "select", source: "periodos", displayKey: "descPeriodo", valueKey: "IDPeriodo", row: 3, width: "25%", hideInList: true },
    { field: "IDProducto", label: "Producto", type: "select", source: "productos", displayKey: "descProducto", valueKey: "IDProducto", row: 3, width: "60%", hideInList: true },
    { field: "concepto", label: "Concepto", row: 4, width: "100%" },
    { field: "base", label: "Base", type: "money", step: "1", row: 5, width: "25%" },
    { field: "total", label: "Total", type: "money", step: "1", row: 5, width: "25%" },
    { type: "separator", row: 6 },
    { type: "title", label: "Datos Facturación", row: 7 },
    { type: "separator", row: 8 },
    { field: "facturado", label: "Facturado", readOnly: true, row: 9, width: "20%", hideInForm: true },
    { field: "numeroFactura", label: "Nº Factura", readOnly: true, row: 9, width: "15%", widthList: "110px" },
    { field: "fechaPago", label: "Pago", readOnly: true, row: 9, width: "20%", widthList: "110px" },
    { field: "totalPagado", label: "Total Pagado", readOnly: true, row: 9, width: "30%" },
    { field: "pendiente", label: "Pendiente", type: "money", readOnly: true, isComputed: true, row: 9, width: "35%", widthList: "70px" }
  ],
  facturas: [
    { field: "numeroFactura", label: "Número", readOnly: true, row: 1, width: "26%", widthList: "90px" },
    { field: "fechaEmision", label: "Emisión", type: "date", row: 1, width: "16%", widthList: "105px" },
    { field: "NIFCliente", label: "NIF", type: "datalist", source: "contactos", displayKey: "Nombre", valueKey: "NIF", row: 3, width: "20%", hideInList: true },
    { field: "nombreContacto", label: "Contacto", readOnly: true, row: 3, width: "80%", widthList: "220px" },
    { field: "concepto", label: "Concepto", row: 5, width: "100%", widthList: "470px" },
    { field: "estado", label: "Estado", row: 2, width: "26%" },
    { field: "fechaPago", label: "Pago", type: "date", row: 2, width: "15%", widthList: "105px" },
    { field: "base", label: "Base", type: "money", row: 6, width: "12%", widthList: "75px" },
    { field: "total", label: "Total", type: "money", row: 6, width: "12%", widthList: "75px" },
    { field: "esRectificativa", label: "Rect", row: 1, width: "33.33%", hideInList: true },
    { field: "IDProducto", label: "Producto", row: 4, width: "33.33%", widthList: "100px", hideInList: true },
    { field: "IDPeriodo", label: "Periodo", row: 4, width: "33.33%", hideInList: true },
    { field: "trimestre", label: "Trimestre", row: 4, width: "33.33%", hideInList: true },
    { field: "metodoPago", label: "Método de Pago", row: 2, width: "33.33%", hideInList: true }
  ],
  gastos: [
    { field: "id", label: "ID", readOnly: true, row: 1, width: "50%", widthList: "60px" },
    { field: "created_at", label: "Creado", readOnly: true, row: 1, width: "50%", hideInList: true, hideInForm: true },
    { field: "numeroFactura", label: "Nº Factura", row: 2, width: "50%", widthList: "120px" },
    { field: "fechaEmision", label: "F. Emisión", type: "date", row: 2, width: "50%", widthList: "110px" },
    { field: "concepto", label: "Concepto", row: 3, width: "100%", isTitle: true, widthList: "auto" },
    { field: "contacto", label: "Contacto", row: 4, width: "100%", widthList: "200px" },
    { field: "total", label: "Total", type: "money", row: 5, width: "50%", widthList: "100px" },
    { field: "pendiente", label: "Pendiente", type: "money", row: 5, width: "50%", widthList: "100px", readOnly: true, isComputed: true },
    { field: "paymentTitle", label: "Datos de Pago", type: "title", row: 6 },
    { field: "totalPagado", label: "Total Pagado", type: "money", row: 7, width: "50%", widthList: "100px" },
    { field: "fechaPago", label: "F. Pago", type: "date", row: 7, width: "50%", widthList: "110px" },
  ]
};