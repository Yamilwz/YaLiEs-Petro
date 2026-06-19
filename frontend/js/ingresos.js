// Ingresos Module

async function renderIngresos() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="d-flex justify-content-center my-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>
  `;

  try {
    // 1. Fetch active tanks to select in the form
    const tanksResponse = await fetch(`${window.API_URL}/tanques`);
    const tanques = await tanksResponse.json();
    const activeTanks = tanques.filter(t => t.estado === 'Activo');

    // 2. Fetch history of incomes
    const incomesResponse = await fetch(`${window.API_URL}/ingresos`);
    const ingresos = await incomesResponse.json();

    let tankOptionsHtml = '';
    if (activeTanks.length === 0) {
      tankOptionsHtml = '<option value="" disabled>No hay tanques activos registrados</option>';
    } else {
      activeTanks.forEach(tanque => {
        const stockActual = parseFloat(tanque.stock_actual);
        const capMax = parseFloat(tanque.capacidad_maxima);
        const disponible = capMax - stockActual;
        
        tankOptionsHtml += `
          <option value="${tanque.id_tanque}" data-disponible="${disponible}" data-capacidad="${capMax}" data-stock="${stockActual}">
            ${tanque.codigo_tanque} - ${tanque.tipo_carburante} (Stock actual: ${stockActual.toFixed(2)} L / Max: ${capMax.toFixed(2)} L - Admite: ${disponible.toFixed(2)} L)
          </option>
        `;
      });
    }

    let historyRowsHtml = '';
    if (ingresos.length === 0) {
      historyRowsHtml = `
        <tr>
          <td colspan="5" class="text-center py-3 text-muted">No se han registrado ingresos de carburante.</td>
        </tr>
      `;
    } else {
      ingresos.forEach(ingreso => {
        // Safe access to relation object returned by Supabase join
        const tankCode = ingreso.tanques ? ingreso.tanques.codigo_tanque : 'Desconocido';
        const fuelType = ingreso.tanques ? ingreso.tanques.tipo_carburante : 'Desconocido';

        historyRowsHtml += `
          <tr>
            <td><strong>${new Date(ingreso.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></td>
            <td><span class="badge bg-light text-dark border">${tankCode}</span> <small class="text-muted">(${fuelType})</small></td>
            <td><strong class="text-success">+${parseFloat(ingreso.cantidad_litros).toFixed(2)} L</strong></td>
            <td>${ingreso.numero_factura}</td>
            <td>${ingreso.proveedor}</td>
          </tr>
        `;
      });
    }

    container.innerHTML = `
      <div class="row">
        <!-- Formulario de Registro -->
        <div class="col-lg-5 mb-4">
          <div class="premium-card">
            <div class="premium-card-header">
              <h3 class="premium-card-title">
                <i class="bi bi-arrow-down-left-square-fill text-success me-2"></i>
                Registrar Ingreso de Carburante
              </h3>
            </div>
            
            <div id="ingreso-alert-container"></div>
            
            <form id="ingreso-form">
              <div class="mb-3">
                <label for="ingreso-tanque" class="form-label">Seleccionar Tanque Destino *</label>
                <select class="form-select" id="ingreso-tanque" required>
                  <option value="" disabled selected>Seleccione un tanque...</option>
                  ${tankOptionsHtml}
                </select>
                <div id="tanque-limit-info" class="form-text text-muted mt-1"></div>
              </div>

              <div class="mb-3">
                <label for="ingreso-litros" class="form-label">Cantidad a Ingresar (Litros) *</label>
                <div class="input-group">
                  <input type="number" step="0.01" class="form-control" id="ingreso-litros" required min="0.01" placeholder="Ej. 2500">
                  <span class="input-group-text">Litros</span>
                </div>
              </div>

              <div class="mb-3">
                <label for="ingreso-factura" class="form-label">Número de Factura o Remisión *</label>
                <input type="text" class="form-control" id="ingreso-factura" required placeholder="Ej. FAC-100293">
              </div>

              <div class="mb-3">
                <label for="ingreso-proveedor" class="form-label">Proveedor *</label>
                <input type="text" class="form-control" id="ingreso-proveedor" required placeholder="Ej. Refinería Central YPFB">
              </div>

              <button type="submit" class="btn-premium btn-premium-accent w-100 mt-2" ${activeTanks.length === 0 ? 'disabled' : ''}>
                <i class="bi bi-check-circle-fill"></i>
                Registrar Reabastecimiento
              </button>
            </form>
          </div>
        </div>

        <!-- Historial de Ingresos -->
        <div class="col-lg-7">
          <div class="premium-card">
            <div class="premium-card-header">
              <h3 class="premium-card-title">
                <i class="bi bi-clock-history text-primary me-2"></i>
                Últimos Ingresos Registrados
              </h3>
              <span class="badge-premium info">Historial</span>
            </div>
            
            <div class="premium-table-container">
              <table class="table premium-table">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Tanque</th>
                    <th>Cantidad</th>
                    <th>Factura</th>
                    <th>Proveedor</th>
                  </tr>
                </thead>
                <tbody>
                  ${historyRowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook Form dynamic capacity warning
    const selectTanque = document.getElementById('ingreso-tanque');
    const limitInfo = document.getElementById('tanque-limit-info');
    
    selectTanque.addEventListener('change', () => {
      const selectedOption = selectTanque.options[selectTanque.selectedIndex];
      const disponible = parseFloat(selectedOption.getAttribute('data-disponible'));
      
      limitInfo.innerHTML = `Espacio libre disponible en el tanque: <strong>${disponible.toFixed(2)} Litros</strong>.`;
      
      const inputLitros = document.getElementById('ingreso-litros');
      inputLitros.max = disponible;
    });

    // Hook Form Submit
    document.getElementById('ingreso-form').addEventListener('submit', handleAddIngreso);

  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger alert-premium my-4" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div>
          <strong>Error de conexión:</strong> No se pudo cargar el módulo de ingresos. (${error.message})
        </div>
      </div>
    `;
  }
}

async function handleAddIngreso(e) {
  e.preventDefault();

  const alertContainer = document.getElementById('ingreso-alert-container');
  alertContainer.innerHTML = '';

  const idTanque = document.getElementById('ingreso-tanque').value;
  const cantidad = parseFloat(document.getElementById('ingreso-litros').value);
  const factura = document.getElementById('ingreso-factura').value.trim();
  const proveedor = document.getElementById('ingreso-proveedor').value.trim();

  // Validate frontend constraints
  const selectTanque = document.getElementById('ingreso-tanque');
  const selectedOption = selectTanque.options[selectTanque.selectedIndex];
  const disponible = parseFloat(selectedOption.getAttribute('data-disponible'));

  if (cantidad > disponible) {
    alertContainer.innerHTML = `
      <div class="alert alert-danger alert-premium p-2 mb-3" style="font-size: 13px;" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div>
          <strong>Error:</strong> La cantidad a ingresar (${cantidad} L) excede el espacio disponible en el tanque (${disponible.toFixed(2)} L).
        </div>
      </div>
    `;
    return;
  }

  const payload = {
    id_tanque: parseInt(idTanque),
    cantidad_litros: cantidad,
    numero_factura: factura,
    proveedor: proveedor
  };

  try {
    const response = await fetch(`${window.API_URL}/ingresos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al guardar el ingreso.');
    }

    // Success alert
    alertContainer.innerHTML = `
      <div class="alert alert-success alert-premium" role="alert">
        <i class="bi bi-check-circle-fill"></i>
        <div>
          <strong>¡Reabastecimiento Exitoso!</strong> El stock del tanque ha sido incrementado.
        </div>
      </div>
    `;

    // Refresh after 1.5s
    setTimeout(() => renderIngresos(), 1500);

  } catch (error) {
    alertContainer.innerHTML = `
      <div class="alert alert-danger alert-premium" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div>
          <strong>Error:</strong> ${error.message}
        </div>
      </div>
    `;
  }
}
