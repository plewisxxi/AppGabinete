export default {
  contactos: [
    { field: "NIF", label: "NIF", width: "100px" },
    { field: "Nombre", label: "Nombre", width: "250px", isTitle: true },
    { field: "Email", label: "Email", width: "250px" },
    { field: "Telefono", label: "Telefono", width: "120px" },
    { field: "Direccion", label: "Direccion", width: "250px" },
    { field: "Poblacion", label: "Poblacion", width: "150px" },
    { field: "codigoPostal", label: "CP", width: "50px" },
    { field: "Pais", label: "Pais", width: "100px" }
  ],
  productos: [
    { field: "IDProducto", label: "ID", width: "80px" },
    { field: "descProducto", label: "Descripción", width: "300px", isTitle: true }
  ],
  periodos: [
    { field: "IDPeriodo", label: "ID" },
    { field: "descPeriodo", label: "Descripción", isTitle: true },
    { field: "fechaInicioPeriodo", label: "Fecha Inicio", type: "date" }
  ],
  sesiones: [
    { field: "idSesion", label: "ID", readOnly: true, row: 1, width: "25%" },
    { field: "fechaOperacion", label: "Fecha", type: "date", row: 2, width: "20%" },
    { field: "IDPeriodo", label: "Periodo", type: "select", source: "periodos", displayKey: "descPeriodo", valueKey: "IDPeriodo", row: 2, width: "30%" },
    { field: "NIFCliente", label: "NIF", type: "datalist", source: "contactos", displayKey: "Nombre", valueKey: "NIF", row: 3, width: "20%" },
    { field: "nombreContacto", label: "Nombre Contacto", readOnly: true, row: 3, width: "80%" },
    { field: "IDProducto", label: "Producto", type: "select", source: "productos", displayKey: "descProducto", valueKey: "IDProducto", row: 4, width: "30%" },
    { field: "concepto", label: "Concepto", row: 4, width: "70%" },
    { field: "base", label: "Base", type: "money", step: "1", row: 5, width: "25%" },
    { field: "total", label: "Total", type: "money", step: "1", row: 5, width: "25%" },
    { type: "separator", row: 6 },
    { type: "title", label: "Datos Facturación", row: 7 },
    { type: "separator", row: 8 },
    { field: "facturado", label: "Facturado", readOnly: true, row: 9, width: "20%" },
    { field: "numeroFactura", label: "Nº Factura", readOnly: true, row: 9, width: "20%" },
    { field: "fechaPago", label: "Fecha de Pago", readOnly: true, row: 9, width: "30%" },
    { field: "totalPagado", label: "Total Pagado", readOnly: true, row: 10, width: "25%" },
    { field: "pendiente", label: "Pendiente", type: "money", readOnly: true, isComputed: true, row: 10, width: "25%" }
  ],
  facturas: [
    { field: "numeroFactura", label: "Número", readOnly: true, row: 1, width: "33.33%" },
    { field: "fechaEmision", label: "Fecha de Emisión", type: "date", row: 1, width: "33.33%" },
    { field: "NIFCliente", label: "NIF", type: "datalist", source: "contactos", displayKey: "Nombre", valueKey: "NIF", row: 3, width: "20%" },
    { field: "nombreContacto", label: "Nombre Contacto", readOnly: true, row: 3, width: "80%", widthList: "300px" },
    { field: "concepto", label: "Concepto", row: 5, width: "100%", widthList: "350px" },
    { field: "estado", label: "Estado", row: 2, width: "33.33%" },
    { field: "fechaPago", label: "Fecha de Pago", type: "date", row: 2, width: "33.33%" },
    { field: "base", label: "Base", type: "money", row: 6, width: "25%" },
    { field: "total", label: "Total", type: "money", row: 6, width: "25%" },
    { field: "esRectificativa", label: "rect.", row: 1, width: "33.33%" },
    { field: "IDProducto", label: "Producto", row: 4, width: "33.33%", widthList: "100px" },
    { field: "IDPeriodo", label: "Periodo", row: 4, width: "33.33%" },
    { field: "trimestre", label: "Trimestre", row: 4, width: "33.33%" },
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