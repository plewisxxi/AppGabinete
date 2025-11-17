const ui = {
    renderTable(containerId, data, headers, rowRenderer) {
        const container = document.getElementById(containerId);
        if (!data || data.length === 0) {
            container.innerHTML = '<p>No hay datos para mostrar.</p>';
            return;
        }

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Encabezados
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Filas
        data.forEach(item => {
            tbody.appendChild(rowRenderer(item));
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        container.innerHTML = '';
        container.appendChild(table);
    },

    createActionButtons(id, onEdit, onDelete) {
        const cell = document.createElement('td');
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'action-buttons';

        const editButton = document.createElement('button');
        editButton.textContent = 'Editar';
        editButton.onclick = () => onEdit(id);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Eliminar';
        deleteButton.className = 'btn-danger';
        deleteButton.onclick = () => onDelete(id);

        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(deleteButton);
        cell.appendChild(buttonContainer);
        return cell;
    },

    // --- Modales y Formularios ---
    modal: document.getElementById('form-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalForm: document.getElementById('modal-form'),
    closeModalButton: document.querySelector('.close-button'),

    showModal(title, fields, data = {}, onSubmit) {
        this.modalTitle.textContent = title;
        this.modalForm.innerHTML = '';

        fields.forEach(field => {
            const label = document.createElement('label');
            label.textContent = field.label;
            label.style.display = 'block';
            label.style.marginTop = '10px';

            const input = document.createElement('input');
            input.type = field.type || 'text';
            input.name = field.name;
            input.value = data[field.name] || '';
            input.style.width = 'calc(100% - 12px)';
            input.style.padding = '6px';
            
            this.modalForm.appendChild(label);
            this.modalForm.appendChild(input);
        });

        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.textContent = 'Guardar';
        submitButton.className = 'btn-primary';
        submitButton.style.marginTop = '20px';
        this.modalForm.appendChild(submitButton);

        this.modalForm.onsubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const new_data = Object.fromEntries(formData.entries());
            onSubmit(new_data);
        };

        this.modal.style.display = 'block';
    },

    hideModal() {
        this.modal.style.display = 'none';
    },

    initModal() {
        this.closeModalButton.onclick = () => this.hideModal();
        window.onclick = (event) => {
            if (event.target == this.modal) {
                this.hideModal();
            }
        };
    },

    // --- Pestañas ---
    initTabs() {
        document.querySelectorAll('.tab-link').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.tab-link, .tab-content').forEach(el => el.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(button.dataset.tab).classList.add('active');
            });
        });
    }
};

