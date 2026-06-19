// Tanques Module

async function renderTanques() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="d-flex justify-content-center my-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>
  `;

  try {
    // 1. Get company to get ID
    const empResponse = await fetch(`${window.API_URL}/empresa`);
    const empresa = await empResponse.json();
    
    if (!empresa) {
      container.innerHTML = `
        <div class="alert alert-warning alert-premium" role="alert">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <div>
            <strong>¡Atención!</strong> Antes de gestionar los tanques, debe registrar la configuración de la empresa.
            <br>
            <button class="btn btn-warning btn-sm mt-3" onclick="switchView('empresa')">Ir a Configuración de Empresa</button>
          </div>
        </div>
      `;
      return;
    }

    const idEmpresa = empresa.id_empresa;
    const stockMinimoAlerta = parseFloat(empresa.stock_minimo_alerta);

    // 2. Get tanks list
    const response = await fetch(`${window.API_URL}/tanques`);
    const tanques = await response.json();

    let alertListHtml = '';
    let tanksGridHtml = '';

    if (tanques.length === 0) {
      tanksGridHtml = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-database-exclamation text-muted" style="font-size: 48px;"></i>
          <p class="mt-2 text-muted">No hay tanques registrados en el sistema.</p>
        </div>
      `;
    } else {
      tanques.forEach(tanque => {
        const stock = parseFloat(tanque.stock_actual);
        const minSeguridad = parseFloat(tanque.stock_minimo_seguridad);
        const capMax = parseFloat(tanque.capacidad_maxima);
        
        // Calculate percentage for visual gauge
        const percentage = Math.min(100, Math.max(0, (stock / capMax) * 100));
        
        // Determine alert state
        const isLowStock = stock <= minSeguridad;
        const isBelowAlert = stock <= stockMinimoAlerta;
        
        let statusBadge = '';
        if (tanque.estado === 'Activo') {
          statusBadge = '<span class="badge-premium success">Activo</span>';
        } else if (tanque.estado === 'Mantenimiento') {
          statusBadge = '<span class="badge-premium warning">Mantenimiento</span>';
        } else {
          statusBadge = '<span class="badge-premium danger">Inactivo</span>';
        }

        let alertBadge = '';
        if (isLowStock) {
          alertBadge = '<span class="badge bg-danger text-white ms-2"><i class="bi bi-exclamation-octagon"></i> Stock Crítico</span>';
          alertListHtml += `
            <div class="alert alert-danger alert-premium mb-2" role="alert">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <div>
                <strong>¡Alerta Crítica!</strong> El tanque <strong>${tanque.codigo_tanque} (${tanque.tipo_carburante})</strong> tiene stock crítico: 
                <strong>${stock} L</strong> (Mínimo seguridad: ${minSeguridad} L). ¡Requiere ingreso de carburante!
              </div>
            </div>
          `;
        } else if (isBelowAlert) {
          alertBadge = '<span class="badge bg-warning text-dark ms-2"><i class="bi bi-exclamation-triangle"></i> Alerta Stock</span>';
          alertListHtml += `
            <div class="alert alert-warning alert-premium mb-2" role="alert">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <div>
                <strong>¡Advertencia!</strong> El tanque <strong>${tanque.codigo_tanque} (${tanque.tipo_carburante})</strong> está por debajo del límite de alerta general: 
                <strong>${stock} L</strong> (Límite alerta: ${stockMinimoAlerta} L).
              </div>
            </div>
          `;
        }

        const gaugeColorClass = tanque.tipo_carburante.toLowerCase() === 'gasolina' ? 'gasolina' : 'diesel';

        tanksGridHtml += `
          <div class="col-md-6 col-xl-4 mb-4">
            <div class="premium-card text-center">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="fw-bold text-dark fs-5">${tanque.codigo_tanque}</span>
                <div class="d-flex align-items-center">
                  ${statusBadge}
                  ${alertBadge}
                </div>
              </div>
              
              <div class="tank-cap"></div>
              <div class="tank-gauge-body">
                <div class="tank-gauge-fill ${gaugeColorClass}" style="height: ${percentage}%">
                  <span class="tank-gauge-text">${percentage.toFixed(0)}%</span>
                </div>
                ${isLowStock ? '<div class="tank-gauge-warning"><i class="bi bi-exclamation-triangle-fill"></i></div>' : ''}
              </div>
              
              <h5 class="text-primary mb-1">${tanque.tipo_carburante}</h5>
              <div class="row text-center mt-3 border-top pt-2">
                <div class="col-6 border-end">
                  <span class="d-block text-muted small">Stock Actual</span>
                  <strong class="fs-6">${stock.toFixed(2)} L</strong>
                </div>
                <div class="col-6">
                  <span class="d-block text-muted small">Capacidad Máx</span>
                  <strong class="fs-6">${capMax.toFixed(2)} L</strong>
                </div>
              </div>

              <div class="mt-3 text-muted small">
                Mín. Seguridad: ${minSeguridad.toFixed(2)} L
              </div>

              <div class="d-flex justify-content-center gap-2 mt-4">
                <button class="btn btn-sm btn-outline-primary" onclick="openEditTanqueModal(${JSON.stringify(tanque).replace(/"/g, '&quot;')})">
                  <i class="bi bi-pencil-fill"></i> Editar
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarTanque(${tanque.id_tanque}, '${tanque.codigo_tanque}')">
                  <i class="bi bi-trash-fill"></i> Eliminar
                </button>
              </div>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = `
      <div class="row mb-4">
        <div class="col-12 d-flex justify-content-between align-items-center">
          <h4 class="mb-0">Gestión de Tanques de Almacenamiento</h4>
          <button class="btn-premium btn-premium-primary" onclick="openAddTanqueModal(${idEmpresa})">
            <i class="bi bi-plus-circle"></i> Registrar Nuevo Tanque
          </button>
        </div>
      </div>

      <!-- Alertas de Stock -->
      <div class="row mb-4">
        <div class="col-12">
          ${alertListHtml}
        </div>
      </div>

      <!-- Grid de Tanques -->
      <div class="row">
        ${tanksGridHtml}
      </div>

      <!-- Modal para Agregar/Editar Tanque -->
      <div class="modal fade" id="tanqueModal" tabindex="-1" aria-labelledby="tanqueModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="tanqueModalLabel">Registrar Tanque</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div id="tanque-modal-alert"></div>
              <form id="tanque-form">
                <input type="hidden" id="tanque-id">
                <input type="hidden" id="tanque-id-empresa" value="${idEmpresa}">
                
                <div class="mb-3">
                  <label for="tanque-codigo" class="form-label">Código del Tanque *</label>
                  <input type="text" class="form-control" id="tanque-codigo" required placeholder="Ej. T-GAS-01">
                </div>
                
                <div class="mb-3">
                  <label for="tanque-carburante" class="form-label">Tipo de Carburante *</label>
                  <select class="form-select" id="tanque-carburante" required>
                    <option value="" disabled selected>Seleccione...</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Diesel">Diésel</option>
                  </select>
                </div>
                
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label for="tanque-capacidad" class="form-label">Capacidad Máxima (L) *</label>
                    <input type="number" step="0.01" class="form-control" id="tanque-capacidad" required min="0" placeholder="Ej. 10000">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label for="tanque-min-seguridad" class="form-label">Mín. Seguridad (L) *</label>
                    <input type="number" step="0.01" class="form-control" id="tanque-min-seguridad" required min="0" placeholder="Ej. 1000">
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label for="tanque-stock-actual" class="form-label">Stock Inicial/Actual (L) *</label>
                    <input type="number" step="0.01" class="form-control" id="tanque-stock-actual" required min="0" placeholder="Ej. 5000">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label for="tanque-estado" class="form-label">Estado *</label>
                    <select class="form-select" id="tanque-estado" required>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                    </select>
                  </div>
                </div>

                <div class="modal-footer px-0 pb-0 pt-3">
                  <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                  <button type="submit" class="btn btn-primary" id="tanque-save-btn">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook Form Submit
    document.getElementById('tanque-form').addEventListener('submit', handleSaveTanque);

  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger alert-premium my-4" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div>
          <strong>Error de conexión:</strong> No se pudieron cargar los tanques. (${error.message})
        </div>
      </div>
    `;
  }
}

// Global modal instance placeholder
let tModalInstance = null;

function openAddTanqueModal(idEmpresa) {
  document.getElementById('tanqueModalLabel').textContent = 'Registrar Nuevo Tanque';
  document.getElementById('tanque-id').value = '';
  document.getElementById('tanque-id-empresa').value = idEmpresa;
  document.getElementById('tanque-codigo').value = '';
  document.getElementById('tanque-codigo').disabled = false;
  document.getElementById('tanque-carburante').value = '';
  document.getElementById('tanque-capacidad').value = '';
  document.getElementById('tanque-min-seguridad').value = '';
  document.getElementById('tanque-stock-actual').value = '0.00';
  document.getElementById('tanque-stock-actual').disabled = false;
  document.getElementById('tanque-estado').value = 'Activo';
  document.getElementById('tanque-modal-alert').innerHTML = '';

  tModalInstance = new bootstrap.Modal(document.getElementById('tanqueModal'));
  tModalInstance.show();
}

function openEditTanqueModal(tanque) {
  document.getElementById('tanqueModalLabel').textContent = `Editar Tanque: ${tanque.codigo_tanque}`;
  document.getElementById('tanque-id').value = tanque.id_tanque;
  document.getElementById('tanque-id-empresa').value = tanque.id_empresa;
  document.getElementById('tanque-codigo').value = tanque.codigo_tanque;
  document.getElementById('tanque-codigo').disabled = true; // Lock code on edit
  document.getElementById('tanque-carburante').value = tanque.tipo_carburante;
  document.getElementById('tanque-capacidad').value = tanque.capacidad_maxima;
  document.getElementById('tanque-min-seguridad').value = tanque.stock_minimo_seguridad;
  document.getElementById('tanque-stock-actual').value = tanque.stock_actual;
  document.getElementById('tanque-stock-actual').disabled = false; // Allow manual edit of stock
  document.getElementById('tanque-estado').value = tanque.estado;
  document.getElementById('tanque-modal-alert').innerHTML = '';

  tModalInstance = new bootstrap.Modal(document.getElementById('tanqueModal'));
  tModalInstance.show();
}

async function handleSaveTanque(e) {
  e.preventDefault();
  
  const id = document.getElementById('tanque-id').value;
  const isNew = !id;

  const payload = {
    id_empresa: parseInt(document.getElementById('tanque-id-empresa').value),
    codigo_tanque: document.getElementById('tanque-codigo').value.trim(),
    tipo_carburante: document.getElementById('tanque-carburante').value,
    capacidad_maxima: parseFloat(document.getElementById('tanque-capacidad').value),
    stock_minimo_seguridad: parseFloat(document.getElementById('tanque-min-seguridad').value),
    stock_actual: parseFloat(document.getElementById('tanque-stock-actual').value),
    estado: document.getElementById('tanque-estado').value
  };

  if (payload.stock_actual > payload.capacidad_maxima) {
    showModalAlert('El stock actual no puede ser mayor que la capacidad máxima del tanque.', 'danger');
    return;
  }

  try {
    const url = isNew ? `${window.API_URL}/tanques` : `${window.API_URL}/tanques/${id}`;
    const method = isNew ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al guardar el tanque.');
    }

    tModalInstance.hide();
    
    // Refresh Tanks list
    renderTanques();

  } catch (error) {
    showModalAlert(error.message, 'danger');
  }
}

function showModalAlert(message, type) {
  const container = document.getElementById('tanque-modal-alert');
  container.innerHTML = `
    <div class="alert alert-${type} alert-premium p-2 mb-3" style="font-size:13px;" role="alert">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <div>${message}</div>
    </div>
  `;
}

async function eliminarTanque(id, codigo) {
  if (!confirm(`¿Está seguro que desea eliminar el tanque ${codigo}? Esta acción no se puede deshacer.`)) {
    return;
  }

  try {
    const response = await fetch(`${window.API_URL}/tanques/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al eliminar el tanque.');
    }

    renderTanques();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
