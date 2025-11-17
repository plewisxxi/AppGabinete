const API_BASE_URL = '__API_URL__'; // Este es un marcador de posición que será reemplazado al iniciar el contenedor

class ApiClient {
    constructor(resource) {
        this.resource = resource;
        this.url = `${API_BASE_URL}/${resource}`;
    }

    async getAll() {
        const response = await fetch(this.url);
        if (!response.ok) throw new Error(`Error fetching ${this.resource}`);
        return response.json();
    }

    async getById(id) {
        const response = await fetch(`${this.url}/${id}`);
        if (!response.ok) throw new Error(`Error fetching ${this.resource} with id ${id}`);
        return response.json();
    }

    async create(data) {
        const response = await fetch(this.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(`Error creating ${this.resource}`);
        return response.json();
    }

    async update(id, data) {
        const response = await fetch(`${this.url}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(`Error updating ${this.resource}`);
        return response.json();
    }

    async delete(id) {
        const response = await fetch(`${this.url}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error(`Error deleting ${this.resource}`);
        return response.json();
    }
}

// Instancias para cada recurso de la API
const api = {
    contactos: new ApiClient('contactos'),
    productos: new ApiClient('productos'),
    periodos: new ApiClient('periodos'),
    sesiones: new ApiClient('sesiones'),
    facturas: new ApiClient('facturas'),
};
