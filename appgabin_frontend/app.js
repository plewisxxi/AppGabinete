document.addEventListener('DOMContentLoaded', () => {
    ui.initTabs();
    ui.initModal();
    loadSesiones();
    setupEventListeners();
});

function setupEventListeners() {
    // Cargar datos al cambiar de pestaña
    document.querySelector('[data-tab="contactos"]').addEventListener('click', loadContactos, { once: true });
    document.querySelector('[data-tab="productos"]').addEventListener('click', loadProductos, { once: true });
    document.querySelector('[data-tab="periodos"]').addEventListener('click', loadPeriodos, { once: true });
    document.querySelector('[data-tab="facturas"]').addEventListener('click', loadFacturas); // Recargar siempre
    document.querySelector('[data-tab="sesiones"]').addEventListener('click', loadSesiones); // Recargar siempre

    // Botones "Nuevo"
    document.getElementById('btn-new-sesion').addEventListener('click', () => handleNew('sesiones'));
    document.getElementById('btn-new-factura').addEventListener('click', () => handleNew('facturas'));
    document.getElementById('btn-new-contacto').addEventListener('click', () => handleNew('contactos'));
    document.getElementById('btn-new-producto').addEventListener('click', () => handleNew('productos'));
    document.getElementById('btn-new-periodo').addEventListener('click', () => handleNew('periodos'));

    // Botón "Facturar Seleccionadas"
    document.getElementById('btn-facturar-sesiones').addEventListener('click', facturarSesionesSeleccionadas);
}

const fieldsConfig = {
    sesiones: [
        { name: 'idSesion', label: 'idSesion' },
        { name: 'NIFCliente', label: 'NIF Cliente' },
        { name: 'IDPeriodo', label: 'IDPeriodo' },
        { name: 'IDProducto', label: 'IDProducto' },
        { name: 'fechaOperacion', label: 'Fecha de Operacion', type: 'date'  },
        { name: 'concepto', label: 'Concepto' },
        { name: 'total', label: 'Total', type: 'number' },
        { name: 'base', label: 'Base', type: 'number' },
        { name: 'fechaPago', label: 'Fecha de Pago', type: 'date' },
    ],
    facturas: [
        { name: 'fechaEmision', label: 'Fecha Factura', type: 'date' },
        { name: 'fechaPago', label: 'Fecha Factura', type: 'date' },
        { name: 'numeroFactura', label: 'Número Factura' },
        { name: 'NIFCliente', label: 'NIF Cliente' },
        { name: 'IDPeriodo', label: 'ID Periodo' },
        { name: 'IDProducto', label: 'IDProducto' },
        { name: 'concepto', label: 'Concepto' },
        { name: 'total', label: 'Total', type: 'number' },
        { name: 'base', label: 'Base', type: 'number' },
        { name: 'metodoPago', label: 'Metodo de Pago' },
    ],
    contactos: [
        { name: 'NIF', label: 'NIF' },
        { name: 'Nombre', label: 'Nombre' },
        { name: 'Email', label: 'Email', type: 'email' },
        { name: 'Direccion', label: 'Direccion' },
        { name: 'codigPostal', label: 'CodigPostal' },
        { name: 'Poblacion', label: 'Poblacion' },
        { name: 'Pais', label: 'Pais' },
        { name: 'Telefono', label: 'Telefono' },
    ],
    productos: [
        { name: 'IDProducto', label: 'ID Producto' },
        { name: 'descProducto', label: 'Descripción' },
    ],
    periodos: [
        { name: 'IDPeriodo', label: 'ID Periodo (YYYYMM)' },
        { name: 'descPeriodo', label: 'Descripción' },
    ],
};

async function handleNew(type) {
    ui.showModal(`Nuevo ${type}`, fieldsConfig[type], {}, async (data) => {
        try {
            await api[type].create(data);
            ui.hideModal();
            // Llama a la función de carga correspondiente (ej: loadSesiones())
            const loadFunction = `load${type.charAt(0).toUpperCase() + type.slice(1)}`;
            if (window[loadFunction]) {
                window[loadFunction]();
            }
        } catch (error) {
            console.error(`Error creando ${type}:`, error);
            alert(`No se pudo crear el ${type}.`);
        }
    });
}

async function handleEdit(type, id) {
    try {
        const record = await api[type].getById(id);
        ui.showModal(`Editar ${type}`, fieldsConfig[type], record, async (data) => {
            try {
                await api[type].update(id, data);
                ui.hideModal();
                // Llama a la función de carga correspondiente (ej: loadSesiones())
                const loadFunction = `load${type.charAt(0).toUpperCase() + type.slice(1)}`;
                if (window[loadFunction]) {
                    loadFunction;
                }
            } catch (error) {
                console.error(`Error actualizando ${type}:`, error);
                alert(`No se pudo actualizar el ${type}.`);
            }
        });
    } catch (error) {
        console.error(`Error obteniendo ${type}:`, error);
        alert(`No se pudo cargar el ${type} para editar.`);
    }
}

async function handleDelete(type, id) {
    if (confirm(`¿Estás seguro de que quieres eliminar este ${type}?`)) {
        try {
            await api[type].delete(id);
            // Llama a la función de carga correspondiente (ej: loadSesiones())
            const loadFunction = `load${type.charAt(0).toUpperCase() + type.slice(1)}`;
            if (window[loadFunction]) {
                loadFunction;
            }
        } catch (error) {
            console.error(`Error eliminando ${type}:`, error);
            alert(`No se pudo eliminar el ${type}.`);
        }
    }
}

// --- Funciones de Carga y Renderizado ---

async function loadSesiones() {
    const sesiones = await api.sesiones.getAll();
    const headers = ['IDSesion', 'Cliente', 'Producto', 'Periodo', 'Fecha','Concepto','Base', 'Total', 'Acciones'];
    ui.renderTable('sesiones-table-container', sesiones, headers, (s) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${s.idSesion}</td>    
            <td>${s.NIFCliente}</td>
            <td>${s.IDProducto}</td>
            <td>${s.IDPeriodo}</td>
            <td>${s.fechaOperacion ? new Date(s.fechaOperacion).toLocaleDateString() : ''}</td>
            <td>${s.concepto}</td>
            <td>${s.base} €</td>
            <td>${s.total} €</td>
        `;
        row.appendChild(ui.createActionButtons(s.idSesion, () => handleEdit('sesiones', s.idSesion), () => handleDelete('sesiones', s.idSesion)));
        return row;
    });
}

async function loadFacturas() {
    const facturas = await api.facturas.getAll();
    const headers = ['Nº Factura','Fecha de Emisión', 'Fecha de Pago', 'Cliente', 'Periodo', 'Producto','Concepto', 'Base','Total','Método de Pago','Acciones'];
    ui.renderTable('facturas-table-container', facturas, headers, (f) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${f.numeroFactura}</td>
            <td>${f.fechaEmision ? new Date(f.fechaEmision).toLocaleDateString() : ''}</td>
            <td>${f.fechaPago ? new Date(f.fechaEmision).toLocaleDateString() : ''}</td>
            <td>${f.NIFCliente}</td>
            <td>${f.IDPeriodo}</td>
            <td>${f.IDProducto}</td>
            <td>${f.concepto}</td>
            <td>${f.base} €</td>
            <td>${f.total} €</td>
            <td>${f.metodoPago}</td>`;
        row.appendChild(ui.createActionButtons(f.numeroFactura, () => handleEdit('facturas', f.numeroFactura), () => handleDelete('facturas', f.numeroFactura)));
        return row;
    });
}

async function loadContactos() {
    const contactos = await api.contactos.getAll();
    const headers = ['NIF', 'Nombre', 'Email', 'Direccion','CP','Poblacion','Pais','Telefono', 'Acciones'];
    ui.renderTable('contactos-table-container', contactos, headers, (c) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${c.NIF}</td>
                        <td>${c.Nombre}</td>
                        <td>${c.Email}</td>
                        <td>${c.Direccion}</td>
                        <td>${c.codigoPostal}</td>
                        <td>${c.Poblacion}</td>
                        <td>${c.Pais}</td>
                        <td>${c.Telefono}</td>                        `;
        row.appendChild(ui.createActionButtons(c.NIF, () => handleEdit('contactos', c.NIF), () => handleDelete('contactos', c.NIF)));
        return row;
    });
}

async function loadProductos() {
    const productos = await api.productos.getAll();
    const headers = ['ID', 'Descripción', 'Acciones'];
    ui.renderTable('productos-table-container', productos, headers, (p) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${p.IDProducto}</td><td>${p.descProducto}</td>`;
        row.appendChild(ui.createActionButtons(p.IDProducto, () => handleEdit('productos', p.IDProducto), () => handleDelete('productos', p.IDProducto)));
        return row;
    });
}

async function loadPeriodos() {
    const periodos = await api.periodos.getAll();
    const headers = ['ID', 'Descripción', 'Acciones'];
    ui.renderTable('periodos-table-container', periodos, headers, (p) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${p.IDPeriodo}</td><td>${p.descPeriodo}</td>`;
        row.appendChild(ui.createActionButtons(p.IDPeriodo, () => handleEdit('periodos', p.IDPeriodo), () => handleDelete('periodos', p.IDPeriodo)));
        return row;
    });
}

// --- Lógica de Negocio Específica ---

async function facturarSesionesSeleccionadas() {
    const checkboxes = document.querySelectorAll('.sesion-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Por favor, selecciona al menos una sesión para facturar.');
        return;
    }

    const sesionIds = Array.from(checkboxes).map(cb => cb.dataset.id);

    try {
        // 1. Obtener los datos completos de las sesiones seleccionadas
        const sesionesPromises = sesionIds.map(id => api.sesiones.getById(id));
        const sesiones = await Promise.all(sesionesPromises);

        // 2. Validar que todas las sesiones son del mismo cliente y periodo
        const firstSesion = sesiones[0];
        const nifCliente = firstSesion.NIFCliente;
        const idPeriodo = firstSesion.IDPeriodo;

        if (!sesiones.every(s => s.NIFCliente === nifCliente && s.IDPeriodo === idPeriodo)) {
            alert('Error: Todas las sesiones seleccionadas deben pertenecer al mismo cliente y periodo.');
            return;
        }

        // 3. Calcular el total y preparar el payload de la nueva factura
        const totalFactura = sesiones.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
        const numeroFactura = `FRA-${idPeriodo}-${nifCliente.slice(0, 4)}-${Date.now()}`;

        const nuevaFactura = {
            numeroFactura: numeroFactura,
            NIFCliente: nifCliente,
            IDPeriodo: idPeriodo,
            fechaEmision: new Date().toISOString().split('T')[0], // Hoy
            total: totalFactura,
        };

        // 4. Crear la factura
        await api.facturas.create(nuevaFactura);

        alert(`Factura ${numeroFactura} creada con éxito por un total de ${totalFactura.toFixed(2)} €.`);
        loadFacturas(); // Recargar la lista de facturas
        document.querySelector('[data-tab="facturas"]').click(); // Cambiar a la pestaña de facturas

    } catch (error) {
        console.error('Error al facturar sesiones:', error);
        alert('Ocurrió un error al generar la factura.');
    }
}
