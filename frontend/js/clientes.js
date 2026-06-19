// Clientes Module

async function renderClientes() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="d-flex justify-content-center my-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>
  `;

  try {
    const response = await fetch(`${window.API_URL}/clientes`);
    const clientes = await response.json();

    let tableRows = '';
    if (clientes.length === 0) {
      tableRows = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-people-fill d-block fs-2 mb-2"></i>
            No hay clientes registrados en el sistema.
          </td>
        </tr>
      `;
    } else {
      clientes.forEach(cliente => {
        const isSuspended = cliente.estado === 'Suspendido';
        const badgeClass = isSuspended ? 'danger' : 'success';
        const toggleText = isSuspended ? 'Activar' : 'Suspender';
        const toggleBtnClass = isSuspended ? 'btn-outline-success' : 'btn-outline-danger';
        const toggleIcon = isSuspended ? 'bi-check-circle-fill' : 'bi-slash-circle-fill';
        
        tableRows += `
          <tr>
            <td><strong>${cliente.documento}</strong></td>
            <td>${cliente.nombre}</td>
            <td><span class="badge bg-secondary text-white font-monospace fs-6 px-3">${cliente.placa_vehiculo}</span></td>
            <td>${cliente.tipo_cliente}</td>
            <td>
              <span class="badge-premium ${badgeClass}">${cliente.estado}</span>
            </td>
            <td>${new Date(cliente.fecha_registro).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            <td class="text-end">
              <div class="d-inline-flex gap-2">
                <button class="btn btn-sm ${toggleBtnClass}" onclick="toggleEstadoCliente(${cliente.id_cliente}, '${cliente.estado}')" title="${toggleText} Cliente">
                  <i class="${toggleIcon}"></i> ${toggleText}
                </button>
                <button class="btn btn-sm btn-outline-primary" onclick="openEditClienteModal(${JSON.stringify(cliente).replace(/"/g, '&quot;')})">
                  <i class="bi bi-pencil-fill"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarCliente(${cliente.id_cliente}, '${cliente.nombre}')">
                  <i class="bi bi-trash-fill"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });
    }

    container.innerHTML = `
      <div class="row mb-4">
        <div class="col-12 d-flex justify-content-between align-items-center">
          <h4 class="mb-0">Gestión de Clientes y Vehículos</h4>
          <button class="btn-premium btn-premium-primary" onclick="openAddClienteModal()">
            <i class="bi bi-person-plus-fill"></i> Registrar Cliente
          </button>
        </div>
      </div>

      <div class="premium-card">
        <div class="premium-card-header">
          <h5 class="premium-card-title">Listado de Clientes Registrados</h5>
          <span class="badge-premium info">${clientes.length} Clientes</span>
        </div>
        
        <div class="premium-table-container">
          <table class="table premium-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombre</th>
                <th>Placa</th>
                <th>Tipo de Cliente</th>
                <th>Estado</th>
                <th>Fecha Registro</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal para Agregar/Editar Cliente -->
      <div class="modal fade" id="clienteModal" tabindex="-1" aria-labelledby="clienteModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="clienteModalLabel">Registrar Cliente</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div id="cliente-modal-alert"></div>
              <form id="cliente-form">
                <input type="hidden" id="cliente-id">
                
                <div class="mb-3">
                  <label for="cliente-documento" class="form-label">Número de Documento (CI/NIT) *</label>
                  <input type="text" class="form-control" id="cliente-documento" required placeholder="Ej. 1234567">
                </div>

                <div class="mb-3">
                  <label for="cliente-nombre" class="form-label">Nombre Completo o Razón Social *</label>
                  <input type="text" class="form-control" id="cliente-nombre" required placeholder="Ej. Juan Pérez">
                </div>

                <div class="mb-3">
                  <label for="cliente-placa" class="form-label">Placa de Vehículo *</label>
                  <input type="text" class="form-control text-uppercase" id="cliente-placa" required placeholder="Ej. ABC-123">
                  <small class="text-muted">Debe ser única y obligatoria.</small>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label for="cliente-tipo" class="form-label">Tipo de Cliente *</label>
                    <select class="form-select" id="cliente-tipo" required>
                      <option value="Particular" selected>Particular</option>
                      <option value="Transporte Publico">Transporte Público</option>
                      <option value="Empresa">Empresa</option>
                    </select>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label for="cliente-estado" class="form-label">Estado *</label>
                    <select class="form-select" id="cliente-estado" required>
                      <option value="Activo" selected>Activo</option>
                      <option value="Suspendido">Suspendido</option>
                    </select>
                  </div>
                </div>

                <div class="modal-footer px-0 pb-0 pt-3">
                  <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                  <button type="submit" class="btn btn-primary" id="cliente-save-btn">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('cliente-form').addEventListener('submit', handleSaveCliente);

  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger alert-premium my-4" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div>
          <strong>Error de conexión:</strong> No se pudieron cargar los clientes. (${error.message})
        </div>
      </div>
    `;
  }
}

let cModalInstance = null;

function openAddClienteModal() {
  document.getElementById('clienteModalLabel').textContent = 'Registrar Nuevo Cliente';
  document.getElementById('cliente-id').value = '';
  document.getElementById('cliente-documento').value = '';
  document.getElementById('cliente-documento').disabled = false;
  document.getElementById('cliente-nombre').value = '';
  document.getElementById('cliente-placa').value = '';
  document.getElementById('cliente-placa').disabled = false;
  document.getElementById('cliente-tipo').value = 'Particular';
  document.getElementById('cliente-estado').value = 'Activo';
  document.getElementById('cliente-modal-alert').innerHTML = '';

  cModalInstance = new bootstrap.Modal(document.getElementById('clienteModal'));
  cModalInstance.show();
}

function openEditClienteModal(cliente) {
  document.getElementById('clienteModalLabel').textContent = `Editar Cliente: ${cliente.nombre}`;
  document.getElementById('cliente-id').value = cliente.id_cliente;
  document.getElementById('cliente-documento').value = cliente.documento;
  document.getElementById('cliente-documento').disabled = true; // Lock identity on edit
  document.getElementById('cliente-nombre').value = cliente.nombre;
  document.getElementById('cliente-placa').value = cliente.placa_vehiculo;
  document.getElementById('cliente-placa').disabled = true; // Lock plate on edit to protect unique index relation
  document.getElementById('cliente-tipo').value = cliente.tipo_cliente;
  document.getElementById('cliente-estado').value = cliente.estado;
  document.getElementById('cliente-modal-alert').innerHTML = '';

  cModalInstance = new bootstrap.Modal(document.getElementById('clienteModal'));
  cModalInstance.show();
}

async function handleSaveCliente(e) {
  e.preventDefault();
  
  const id = document.getElementById('cliente-id').value;
  const isNew = !id;

  const payload = {
    documento: document.getElementById('cliente-documento').value.trim(),
    nombre: document.getElementById('cliente-nombre').value.trim(),
    placa_vehiculo: document.getElementById('cliente-placa').value.trim().toUpperCase(),
    tipo_cliente: document.getElementById('cliente-tipo').value,
    estado: document.getElementById('cliente-estado').value
  };

  try {
    const url = isNew ? `${window.API_URL}/clientes` : `${window.API_URL}/clientes/${id}`;
    const method = isNew ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al guardar el cliente.');
    }

    cModalInstance.hide();
    renderClientes();

  } catch (error) {
    showClienteModalAlert(error.message, 'danger');
  }
}

function showClienteModalAlert(message, type) {
  const container = document.getElementById('cliente-modal-alert');
  container.innerHTML = `
    <div class="alert alert-${type} alert-premium p-2 mb-3" style="font-size:13px;" role="alert">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <div>${message}</div>
    </div>
  `;
}

async function toggleEstadoCliente(id, estadoActual) {
  const nuevoEstado = estadoActual === 'Activo' ? 'Suspendido' : 'Activo';
  
  if (!confirm(`¿Está seguro que desea cambiar el estado del cliente a ${nuevoEstado}?`)) {
    return;
  }

  try {
    // We first get the full client info so we can send complete payload as PUT requires
    const responseGet = await fetch(`${window.API_URL}/clientes`);
    const clientes = await responseGet.json();
    const cliente = clientes.find(c => c.id_cliente === id);

    if (!cliente) {
      throw new Error('Cliente no encontrado.');
    }

    const payload = {
      ...cliente,
      estado: nuevoEstado
    };

    const responsePut = await fetch(`${window.API_URL}/clientes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await responsePut.json();

    if (!responsePut.ok) {
      throw new Error(result.error || 'Error al suspender/activar el cliente.');
    }

    renderClientes();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function eliminarCliente(id, nombre) {
  if (!confirm(`¿Está seguro que desea eliminar al cliente ${nombre}? Se eliminarán todas sus ventas asociadas.`)) {
    return;
  }

  try {
    const response = await fetch(`${window.API_URL}/clientes/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al eliminar el cliente.');
    }

    renderClientes();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
