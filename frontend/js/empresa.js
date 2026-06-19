// Empresa Module

async function renderEmpresa() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="d-flex justify-content-center my-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>
  `;

  try {
    const response = await fetch(`${window.API_URL}/empresa`);
    const empresa = await response.json();
    
    // Update global header details if config exists
    if (empresa) {
      document.getElementById('station-header-name').textContent = empresa.nombre;
      document.getElementById('station-header-nit').textContent = `NIT: ${empresa.nit}`;
    }

    const isNew = !empresa;
    const empresaId = empresa ? empresa.id_empresa : '';

    container.innerHTML = `
      <div class="row">
        <div class="col-lg-8 mx-auto">
          <div class="premium-card">
            <div class="premium-card-header">
              <h3 class="premium-card-title">
                <i class="bi bi-gear-fill text-primary me-2"></i>
                Configuración de la Estación
              </h3>
              <span class="badge-premium info">Configuración de Negocio</span>
            </div>
            
            <div id="empresa-alert-container"></div>
            
            <form id="empresa-form">
              <div class="row g-3">
                <div class="col-md-6">
                  <label for="empresa-nombre" class="form-label">Nombre de la Estación *</label>
                  <input type="text" class="form-control" id="empresa-nombre" value="${empresa ? empresa.nombre : ''}" required placeholder="Ej. E/S YaLiEs Petrol">
                </div>
                <div class="col-md-6">
                  <label for="empresa-nit" class="form-label">NIT *</label>
                  <input type="text" class="form-control" id="empresa-nit" value="${empresa ? empresa.nit : ''}" required placeholder="Ej. 900123456">
                </div>
                
                <div class="col-md-8">
                  <label for="empresa-direccion" class="form-label">Dirección</label>
                  <input type="text" class="form-control" id="empresa-direccion" value="${empresa && empresa.direccion ? empresa.direccion : ''}" placeholder="Ej. Avenida Principal #123">
                </div>
                <div class="col-md-4">
                  <label for="empresa-ciudad" class="form-label">Ciudad</label>
                  <input type="text" class="form-control" id="empresa-ciudad" value="${empresa && empresa.ciudad ? empresa.ciudad : ''}" placeholder="Ej. La Paz">
                </div>
                
                <div class="col-md-6">
                  <label for="empresa-telefono" class="form-label">Teléfono</label>
                  <input type="text" class="form-control" id="empresa-telefono" value="${empresa && empresa.telefono ? empresa.telefono : ''}" placeholder="Ej. +591 2 2444444">
                </div>
                <div class="col-md-6">
                  <label for="empresa-correo" class="form-label">Correo Electrónico</label>
                  <input type="email" class="form-control" id="empresa-correo" value="${empresa && empresa.correo ? empresa.correo : ''}" placeholder="Ej. info@yaliespetrol.com">
                </div>

                <div class="col-12 my-4">
                  <hr class="text-muted">
                  <h5 class="mb-3 text-primary"><i class="bi bi-shield-lock-fill me-2"></i>Parámetros y Reglas de Negocio</h5>
                </div>

                <div class="col-md-4">
                  <label for="empresa-stock-minimo" class="form-label">Stock Mínimo Alerta (L) *</label>
                  <div class="input-group">
                    <input type="number" step="0.01" class="form-control" id="empresa-stock-minimo" value="${empresa ? empresa.stock_minimo_alerta : '1000.00'}" required min="0">
                    <span class="input-group-text">Litros</span>
                  </div>
                  <small class="text-muted">Gatilla alertas de reabastecimiento en el dashboard.</small>
                </div>
                
                <div class="col-md-4">
                  <label for="empresa-factor-holgura" class="form-label">Factor de Holgura (%) *</label>
                  <div class="input-group">
                    <input type="number" step="0.01" class="form-control" id="empresa-factor-holgura" value="${empresa ? empresa.factor_holgura : '10.00'}" required min="0" max="100">
                    <span class="input-group-text">%</span>
                  </div>
                  <small class="text-muted">Porcentaje adicional permitido sobre el promedio semanal.</small>
                </div>
                
                <div class="col-md-4">
                  <label for="empresa-cupo-base" class="form-label">Cupo Base Cliente Nuevo (L) *</label>
                  <div class="input-group">
                    <input type="number" step="0.01" class="form-control" id="empresa-cupo-base" value="${empresa ? empresa.cupo_base_cliente_nuevo : '50.00'}" required min="0">
                    <span class="input-group-text">Litros</span>
                  </div>
                  <small class="text-muted">Cupo inicial para clientes nuevos sin historial en los últimos 28 días.</small>
                </div>
                
                <div class="col-12 mt-4 text-end">
                  <button type="submit" class="btn-premium btn-premium-primary">
                    <i class="bi bi-save2-fill"></i>
                    ${isNew ? 'Registrar Configuración' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Handle form submit
    document.getElementById('empresa-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        nombre: document.getElementById('empresa-nombre').value.trim(),
        nit: document.getElementById('empresa-nit').value.trim(),
        direccion: document.getElementById('empresa-direccion').value.trim(),
        ciudad: document.getElementById('empresa-ciudad').value.trim(),
        telefono: document.getElementById('empresa-telefono').value.trim(),
        correo: document.getElementById('empresa-correo').value.trim(),
        stock_minimo_alerta: parseFloat(document.getElementById('empresa-stock-minimo').value),
        factor_holgura: parseFloat(document.getElementById('empresa-factor-holgura').value),
        cupo_base_cliente_nuevo: parseFloat(document.getElementById('empresa-cupo-base').value)
      };

      const alertContainer = document.getElementById('empresa-alert-container');
      alertContainer.innerHTML = '';

      try {
        const url = isNew ? `${window.API_URL}/empresa` : `${window.API_URL}/empresa/${empresaId}`;
        const method = isNew ? 'POST' : 'PUT';

        const saveResponse = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await saveResponse.json();

        if (!saveResponse.ok) {
          throw new Error(result.error || 'Error al guardar configuración.');
        }

        // Show Success Alert
        alertContainer.innerHTML = `
          <div class="alert alert-success alert-premium" role="alert">
            <i class="bi bi-check-circle-fill"></i>
            <div>
              <strong>¡Éxito!</strong> La configuración de la empresa ha sido guardada correctamente.
            </div>
          </div>
        `;

        // Update top-bar values
        document.getElementById('station-header-name').textContent = result.nombre;
        document.getElementById('station-header-nit').textContent = `NIT: ${result.nit}`;

        // Reload page data after 1.5s
        setTimeout(() => renderEmpresa(), 1500);

      } catch (err) {
        alertContainer.innerHTML = `
          <div class="alert alert-danger alert-premium" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <div>
              <strong>Error:</strong> ${err.message}
            </div>
          </div>
        `;
      }
    });

  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger alert-premium my-4" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div>
          <strong>Error de conexión:</strong> No se pudo cargar la configuración de la empresa. Asegúrese de que el backend esté ejecutándose. (${error.message})
        </div>
      </div>
    `;
  }
}
