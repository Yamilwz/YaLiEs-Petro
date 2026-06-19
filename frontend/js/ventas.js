// Ventas Module

// Global state for sale context
let currentSaleClient = null;
let currentSaleTanks = [];
let companySettings = null;

async function renderNuevaVenta() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="d-flex justify-content-center my-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>
  `;

  try {
    // 1. Fetch company config (for base quotas)
    const empResponse = await fetch(`${window.API_URL}/empresa`);
    companySettings = await empResponse.json();

    if (!companySettings) {
      container.innerHTML = `
        <div class="alert alert-warning alert-premium" role="alert">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <div>
            <strong>¡Atención!</strong> Antes de registrar ventas, debe registrar la configuración de la empresa.
            <br>
            <button class="btn btn-warning btn-sm mt-3" onclick="switchView('empresa')">Ir a Configuración de Empresa</button>
          </div>
        </div>
      `;
      return;
    }

    // 2. Fetch tanks
    const tanksResponse = await fetch(`${window.API_URL}/tanques`);
    const allTanks = await tanksResponse.json();
    currentSaleTanks = allTanks.filter(t => t.estado === 'Activo');

    if (currentSaleTanks.length === 0) {
      container.innerHTML = `
        <div class="alert alert-danger alert-premium" role="alert">
          <i class="bi bi-exclamation-circle-fill"></i>
          <div>
            <strong>¡Error del Sistema!</strong> No hay tanques activos registrados. Registre e ingrese combustible a un tanque antes de vender.
            <br>
            <button class="btn btn-primary btn-sm mt-3" onclick="switchView('tanques')">Ir a Gestión de Tanques</button>
          </div>
        </div>
      `;
      return;
    }

    // Render client search step
    container.innerHTML = `
      <div class="row">
        <!-- Panel de Venta Controlada -->
        <div class="col-lg-7 mb-4">
          <div class="premium-card">
            <div class="premium-card-header">
              <h3 class="premium-card-title">
                <i class="bi bi-fuel-pump-fill text-primary me-2"></i>
                Consola de Venta Controlada
              </h3>
              <span class="badge-premium info">Cupos Dinámicos</span>
            </div>

            <!-- Paso 1: Buscar Cliente -->
            <div class="mb-4 pb-4 border-bottom" id="sale-step-search">
              <h5 class="text-primary mb-3">1. Identificación del Cliente/Vehículo</h5>
              <div class="row g-2">
                <div class="col-md-8">
                  <div class="search-box-container">
                    <i class="bi bi-search search-box-icon"></i>
                    <input type="text" class="form-control search-box-input" id="sale-client-query" placeholder="Buscar por Placa o Documento (CI/NIT)...">
                  </div>
                </div>
                <div class="col-md-4">
                  <button class="btn-premium btn-premium-primary w-100 py-2" onclick="buscarClienteParaVenta()">
                    <i class="bi bi-search"></i> Buscar
                  </button>
                </div>
              </div>
            </div>

            <!-- Paso 2: Detalles del Cliente e Información de Registro -->
            <div id="sale-client-status-container" class="mb-4 pb-4 border-bottom d-none">
              <!-- Dynamically populated customer info & auto register fields -->
            </div>

            <!-- Paso 3: Parámetros de Despacho -->
            <div id="sale-parameters-container" class="d-none">
              <h5 class="text-primary mb-3">2. Parámetros de Despacho y Combustible</h5>
              <form id="sale-process-form">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label for="sale-carburante" class="form-label">Tipo de Carburante *</label>
                    <select class="form-select" id="sale-carburante" required>
                      <option value="" disabled selected>Seleccione...</option>
                      <option value="Gasolina">Gasolina</option>
                      <option value="Diesel">Diésel</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label for="sale-tanque" class="form-label">Tanque Dispensador *</label>
                    <select class="form-select" id="sale-tanque" required disabled>
                      <option value="" disabled selected>Seleccione carburante primero...</option>
                    </select>
                    <div id="sale-tank-stock-info" class="form-text text-muted mt-1"></div>
                  </div>

                  <div class="col-md-12 mt-4">
                    <label for="sale-litros" class="form-label">Cantidad de Litros Solicitada *</label>
                    <div class="input-group input-group-lg">
                      <input type="number" step="0.01" class="form-control" id="sale-litros" required min="0.01" placeholder="Ej. 60.00">
                      <span class="input-group-text">Litros</span>
                    </div>
                    <div id="sale-litros-warning" class="mt-2"></div>
                  </div>

                  <div class="col-12 mt-4">
                    <button type="submit" class="btn-premium btn-premium-accent w-100 py-3 fs-5" id="sale-submit-btn">
                      <i class="bi bi-shield-check"></i>
                      Procesar Venta Controlada
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Panel Lateral de Información de Cupo -->
        <div class="col-lg-5">
          <div class="premium-card">
            <div class="premium-card-header">
              <h3 class="premium-card-title">
                <i class="bi bi-calculator-fill text-warning me-2"></i>
                Cálculo del Límite de Venta
              </h3>
            </div>
            
            <div id="sale-quota-info-container">
              <div class="text-center py-5 text-muted">
                <i class="bi bi-credit-card-2-front-fill d-block fs-1 mb-3 text-muted"></i>
                Busque o registre un cliente para ver el promedio semanal y cupo dinámico permitido.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para mostrar el resultado de la venta -->
      <div class="modal fade" id="saleResultModal" tabindex="-1" data-bs-backdrop="static" aria-labelledby="saleResultModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-body text-center p-5" id="sale-result-body">
              <!-- Placed dynamically -->
            </div>
            <div class="modal-footer justify-content-center">
              <button type="button" class="btn btn-primary btn-premium px-4" data-bs-dismiss="modal" onclick="renderNuevaVenta()">
                Nueva Venta
              </button>
              <button type="button" class="btn btn-outline-secondary btn-premium px-4" data-bs-dismiss="modal" onclick="switchView('ventas-historial')">
                Ver Historial
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook search event on enter
    document.getElementById('sale-client-query').addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        buscarClienteParaVenta();
      }
    });

  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger alert-premium my-4" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div>
          <strong>Error de conexión:</strong> No se pudo cargar el módulo de venta. (${error.message})
        </div>
      </div>
    `;
  }
}

async function buscarClienteParaVenta() {
  const query = document.getElementById('sale-client-query').value.trim();
  const clientStatusContainer = document.getElementById('sale-client-status-container');
  const quotaInfoContainer = document.getElementById('sale-quota-info-container');
  const parametersContainer = document.getElementById('sale-parameters-container');
  
  if (!query) {
    alert('Ingrese un número de documento o placa de vehículo.');
    return;
  }

  // Reset states
  clientStatusContainer.classList.add('d-none');
  quotaInfoContainer.innerHTML = '';
  parametersContainer.classList.add('d-none');
  currentSaleClient = null;

  try {
    const response = await fetch(`${window.API_URL}/clientes/buscar/${query}`);
    const result = await response.json();

    if (response.ok && result.found) {
      // 1. Existing client found
      const cliente = result.cliente;
      currentSaleClient = cliente;
      
      let statusAlert = '';
      let isSuspended = cliente.estado === 'Suspendido';

      if (isSuspended) {
        statusAlert = `
          <div class="alert alert-danger alert-premium mb-0" role="alert">
            <i class="bi bi-slash-circle-fill"></i>
            <div>
              <strong>¡CLIENTE SUSPENDIDO!</strong> Las ventas están bloqueadas para este cliente por políticas administrativas.
            </div>
          </div>
        `;
      } else {
        statusAlert = `
          <div class="alert alert-success alert-premium mb-0" role="alert">
            <i class="bi bi-check-circle-fill"></i>
            <div>
              <strong>Cliente Registrado:</strong> ${cliente.nombre} (Documento: ${cliente.documento}) es un cliente <strong>Activo</strong>.
            </div>
          </div>
        `;
      }

      clientStatusContainer.innerHTML = `
        <h5 class="text-primary mb-3">1. Datos del Cliente</h5>
        <div class="mb-3">${statusAlert}</div>
        <div class="row g-2">
          <div class="col-6">
            <span class="d-block text-muted small">Nombre</span>
            <strong>${cliente.nombre}</strong>
          </div>
          <div class="col-6">
            <span class="d-block text-muted small">Placa de Vehículo</span>
            <span class="badge bg-secondary fs-6 mt-1 font-monospace px-2">${cliente.placa_vehiculo}</span>
          </div>
        </div>
      `;
      clientStatusContainer.classList.remove('d-none');

      // Fetch dynamic quota details
      await fetchAndDisplayQuota(cliente.id_cliente, isSuspended);

      // Only display dispenser form if client is active
      if (!isSuspended) {
        setupDispenserForm(cliente);
      }

    } else {
      // 2. Client not found: Prompt Auto-registration
      const cleanQuery = query.toUpperCase();
      const looksLikePlate = /^[A-Z0-9-]{5,10}$/.test(cleanQuery);
      
      const docVal = looksLikePlate ? '' : query;
      const plateVal = looksLikePlate ? cleanQuery : '';

      clientStatusContainer.innerHTML = `
        <h5 class="text-primary mb-3">1. Auto-Registro de Nuevo Cliente</h5>
        <div class="alert alert-warning alert-premium p-2 mb-3" style="font-size:13px;" role="alert">
          <i class="bi bi-info-circle-fill"></i>
          <div>
            <strong>Cliente no registrado.</strong> El sistema realizará el <strong>registro automático</strong> al procesar la venta. Por favor, complete la información obligatoria:
          </div>
        </div>
        
        <div class="row g-2">
          <div class="col-md-6">
            <label for="new-client-doc" class="form-label">Nro. Documento *</label>
            <input type="text" class="form-control form-control-sm" id="new-client-doc" value="${docVal}" required placeholder="Nro de CI o NIT">
          </div>
          <div class="col-md-6">
            <label for="new-client-placa" class="form-label">Placa del Vehículo *</label>
            <input type="text" class="form-control form-control-sm text-uppercase" id="new-client-placa" value="${plateVal}" required placeholder="Ej. ABC-123">
          </div>
          <div class="col-md-8">
            <label for="new-client-nombre" class="form-label">Nombre Completo *</label>
            <input type="text" class="form-control form-control-sm" id="new-client-nombre" placeholder="Nombre completo o Razón Social">
          </div>
          <div class="col-md-4">
            <label for="new-client-tipo" class="form-label">Tipo de Cliente *</label>
            <select class="form-select form-select-sm" id="new-client-tipo">
              <option value="Particular" selected>Particular</option>
              <option value="Transporte Publico">Transporte Público</option>
              <option value="Empresa">Empresa</option>
            </select>
          </div>
        </div>
      `;
      clientStatusContainer.classList.remove('d-none');

      // Populate quota box with default values for a new customer
      displayNewCustomerQuota();

      // Show dispenser form
      setupDispenserForm(null);
    }
  } catch (error) {
    console.error(error);
    alert('Error al buscar cliente: ' + error.message);
  }
}

async function fetchAndDisplayQuota(clientId, isSuspended) {
  const quotaInfoContainer = document.getElementById('sale-quota-info-container');
  
  if (isSuspended) {
    quotaInfoContainer.innerHTML = `
      <div class="alert alert-danger text-center alert-premium" role="alert">
        <i class="bi bi-slash-circle-fill d-block fs-3 mb-2"></i>
        <strong>VENTA BLOQUEADA</strong>
        <br>
        El cliente se encuentra suspendido. Límite de venta: 0.00 L
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`${window.API_URL}/clientes/${clientId}/cupo`);
    const quota = await response.json();

    const factor = quota.factor_holgura;
    const avg = quota.promedio_semanal;
    const holgura = quota.holgura_aplicada;
    const limit = quota.total_litros_permitido;

    quotaInfoContainer.innerHTML = `
      <div class="quota-summary-box">
        <div class="text-center mb-4">
          <span class="d-block text-muted small">CUPOS DINÁMICOS (HISTORIAL 28 DÍAS)</span>
          <h2 class="text-accent display-5 fw-bold font-monospace">${limit.toFixed(2)} L</h2>
          <span class="badge bg-success-subtle text-success border border-success-subtle">Límite Permitido</span>
        </div>
        
        <div class="quota-value-row">
          <span>Promedio Semanal Histórico:</span>
          <strong>${avg.toFixed(2)} L</strong>
        </div>
        
        <div class="quota-value-row">
          <span>Factor de Holgura Aplicado:</span>
          <strong>+${factor.toFixed(2)}%</strong>
        </div>
        
        <div class="quota-value-row">
          <span>Holgura Adicional Calculada:</span>
          <strong class="text-accent">+${holgura.toFixed(2)} L</strong>
        </div>
        
        <div class="quota-value-row">
          <span>Total Cupo Permitido:</span>
          <span class="fs-5 text-primary">${limit.toFixed(2)} L</span>
        </div>
      </div>

      <div class="mt-3 text-muted small">
        <i class="bi bi-info-circle"></i> Las compras de los últimos 28 días se promedian semanalmente. El cupo del cliente es dinámico y ajustado por el factor de holgura. Si solicita más del límite, la venta se limitará automáticamente.
      </div>
    `;

    // Save active limit in window for live validation comparison
    window.currentSaleLimit = limit;

  } catch (error) {
    quotaInfoContainer.innerHTML = `<div class="text-danger">Error al calcular el cupo: ${error.message}</div>`;
  }
}

function displayNewCustomerQuota() {
  const quotaInfoContainer = document.getElementById('sale-quota-info-container');
  const baseLimit = parseFloat(companySettings.cupo_base_cliente_nuevo);

  quotaInfoContainer.innerHTML = `
    <div class="quota-summary-box">
      <div class="text-center mb-4">
        <span class="d-block text-muted small">CUPOS BASE PARA CLIENTES NUEVOS</span>
        <h2 class="text-primary display-5 fw-bold font-monospace">${baseLimit.toFixed(2)} L</h2>
        <span class="badge bg-primary-subtle text-primary border border-primary-subtle">Cupo Base Inicial</span>
      </div>
      
      <div class="quota-value-row">
        <span>Promedio Semanal Histórico:</span>
        <strong class="text-muted">0.00 L (Nuevo)</strong>
      </div>
      
      <div class="quota-value-row">
        <span>Factor de Holgura:</span>
        <strong class="text-muted">No aplica</strong>
      </div>
      
      <div class="quota-value-row">
        <span>Total Cupo Permitido:</span>
        <span class="fs-5 text-primary">${baseLimit.toFixed(2)} L</span>
      </div>
    </div>

    <div class="mt-3 text-muted small">
      <i class="bi bi-info-circle"></i> Los clientes nuevos o sin compras registradas en los últimos 28 días inician con el <strong>Cupo Base Cliente Nuevo</strong> configurado en los parámetros de la empresa.
    </div>
  `;

  window.currentSaleLimit = baseLimit;
}

function setupDispenserForm(cliente) {
  const parametersContainer = document.getElementById('sale-parameters-container');
  const selectCarburante = document.getElementById('sale-carburante');
  const selectTanque = document.getElementById('sale-tanque');
  const tankStockInfo = document.getElementById('sale-tank-stock-info');
  const inputLitros = document.getElementById('sale-litros');
  const warningContainer = document.getElementById('sale-litros-warning');

  // Reset inputs
  selectCarburante.value = '';
  selectTanque.innerHTML = '<option value="" disabled selected>Seleccione carburante primero...</option>';
  selectTanque.disabled = true;
  tankStockInfo.innerHTML = '';
  inputLitros.value = '';
  warningContainer.innerHTML = '';

  // Show parameters panel
  parametersContainer.classList.remove('d-none');

  // Fuel change handler
  selectCarburante.onchange = () => {
    const selectedFuel = selectCarburante.value;
    selectTanque.innerHTML = '<option value="" disabled selected>Seleccione un tanque...</option>';
    
    // Filter active tanks matching fuel type
    const matchingTanks = currentSaleTanks.filter(t => t.tipo_carburante === selectedFuel);

    if (matchingTanks.length === 0) {
      selectTanque.innerHTML = `<option value="" disabled>No hay tanques de ${selectedFuel} activos</option>`;
      selectTanque.disabled = true;
      tankStockInfo.innerHTML = '<span class="text-danger">No hay stock disponible en el sistema.</span>';
    } else {
      matchingTanks.forEach(tanque => {
        selectTanque.innerHTML += `
          <option value="${tanque.id_tanque}" data-stock="${tanque.stock_actual}">
            ${tanque.codigo_tanque} (Stock: ${parseFloat(tanque.stock_actual).toFixed(2)} L)
          </option>
        `;
      });
      selectTanque.disabled = false;
    }
  };

  // Tank select change handler
  selectTanque.onchange = () => {
    const selectedOption = selectTanque.options[selectTanque.selectedIndex];
    const stock = parseFloat(selectedOption.getAttribute('data-stock'));
    tankStockInfo.innerHTML = `Stock disponible en el tanque seleccionado: <strong>${stock.toFixed(2)} Litros</strong>.`;
  };

  // Live input quota checks
  inputLitros.oninput = () => {
    const val = parseFloat(inputLitros.value);
    const limit = window.currentSaleLimit || 0;
    
    if (isNaN(val) || val <= 0) {
      warningContainer.innerHTML = '';
      return;
    }

    if (val > limit) {
      warningContainer.innerHTML = `
        <div class="alert alert-warning py-1 px-2 mb-0" style="font-size:12px;">
          <i class="bi bi-exclamation-triangle"></i> La cantidad solicitada (${val} L) supera el cupo permitido (${limit.toFixed(2)} L). La venta será <strong>LIMITADA</strong> a ${limit.toFixed(2)} L.
        </div>
      `;
    } else {
      warningContainer.innerHTML = `
        <div class="alert alert-success py-1 px-2 mb-0" style="font-size:12px;">
          <i class="bi bi-check-circle"></i> Venta dentro del cupo permitido. Será <strong>AUTORIZADA</strong> por el monto total.
        </div>
      `;
    }
  };

  // Hook submit
  document.getElementById('sale-process-form').onsubmit = (e) => {
    e.preventDefault();
    procesarVentaSubmit();
  };
}

async function procesarVentaSubmit() {
  const isAutoRegister = !currentSaleClient;
  
  let documento, nombre, placa_vehiculo, tipo_cliente;
  
  if (isAutoRegister) {
    documento = document.getElementById('new-client-doc').value.trim();
    nombre = document.getElementById('new-client-nombre').value.trim() || 'Cliente Registrado Auto';
    placa_vehiculo = document.getElementById('new-client-placa').value.trim().toUpperCase();
    tipo_cliente = document.getElementById('new-client-tipo').value;

    if (!documento || !placa_vehiculo) {
      alert('Por favor complete el Nro de Documento y la Placa del nuevo cliente.');
      return;
    }
  } else {
    documento = currentSaleClient.documento;
    nombre = currentSaleClient.nombre;
    placa_vehiculo = currentSaleClient.placa_vehiculo;
    tipo_cliente = currentSaleClient.tipo_cliente;
  }

  const idTanque = document.getElementById('sale-tanque').value;
  const cantidadSolicitada = parseFloat(document.getElementById('sale-litros').value);

  if (!idTanque) {
    alert('Seleccione un tanque.');
    return;
  }

  // Tank stock validation
  const selectTanque = document.getElementById('sale-tanque');
  const selectedOption = selectTanque.options[selectTanque.selectedIndex];
  const stockDisponible = parseFloat(selectedOption.getAttribute('data-stock'));
  const limit = window.currentSaleLimit || 0;
  
  // The backend restricts to the lesser of requested or limit.
  // The actual dispensed amount will be Math.min(cantidadSolicitada, limit)
  const actualDispensed = Math.min(cantidadSolicitada, limit);

  if (stockDisponible < actualDispensed) {
    alert(`No se puede procesar la venta. El tanque seleccionado solo tiene ${stockDisponible.toFixed(2)} L, y la cantidad autorizada a despachar es de ${actualDispensed.toFixed(2)} L.`);
    return;
  }

  const payload = {
    documento,
    nombre,
    placa_vehiculo,
    tipo_cliente,
    id_tanque: parseInt(idTanque),
    cantidad_solicitada: cantidadSolicitada
  };

  const submitBtn = document.getElementById('sale-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando Venta...';

  try {
    const response = await fetch(`${window.API_URL}/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al registrar la venta.');
    }

    displaySaleResult(result);

  } catch (error) {
    alert('Error al registrar venta: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-shield-check"></i> Procesar Venta Controlada';
  }
}

function displaySaleResult(result) {
  const resultBody = document.getElementById('sale-result-body');
  
  const state = result.estado_venta; // Autorizada, Limitada, Bloqueada
  let iconHtml = '';
  let titleHtml = '';
  let colorClass = '';
  
  if (state === 'Autorizada') {
    iconHtml = '<i class="bi bi-check-circle-fill text-success" style="font-size: 80px;"></i>';
    titleHtml = '<h3 class="mt-4 text-success font-heading fw-bold">VENTA AUTORIZADA</h3>';
    colorClass = 'success';
  } else if (state === 'Limitada') {
    iconHtml = '<i class="bi bi-exclamation-circle-fill text-warning" style="font-size: 80px;"></i>';
    titleHtml = '<h3 class="mt-4 text-warning font-heading fw-bold">VENTA LIMITADA POR CUPO</h3>';
    colorClass = 'warning';
  } else {
    iconHtml = '<i class="bi bi-slash-circle-fill text-danger" style="font-size: 80px;"></i>';
    titleHtml = '<h3 class="mt-4 text-danger font-heading fw-bold">VENTA BLOQUEADA</h3>';
    colorClass = 'danger';
  }

  const venta = result.venta || {};
  const clName = venta.clientes ? venta.clientes.nombre : 'Cliente';
  const clPlaca = venta.clientes ? venta.clientes.placa_vehiculo : '---';
  const tkCode = venta.tanques ? venta.tanques.codigo_tanque : '---';

  resultBody.innerHTML = `
    ${iconHtml}
    ${titleHtml}
    <p class="text-muted mt-2">${result.mensaje || ''}</p>
    
    <div class="card bg-light border-0 rounded-3 mt-4 text-start p-3">
      <div class="d-flex justify-content-between mb-2">
        <span class="text-muted">Cliente:</span>
        <span class="fw-bold">${clName}</span>
      </div>
      <div class="d-flex justify-content-between mb-2">
        <span class="text-muted">Placa del Vehículo:</span>
        <span class="badge bg-secondary font-monospace px-2">${clPlaca}</span>
      </div>
      <div class="d-flex justify-content-between mb-2">
        <span class="text-muted">Tanque Dispensador:</span>
        <span class="fw-bold">${tkCode} (${venta.tipo_carburante || '---'})</span>
      </div>
      <hr class="my-2">
      <div class="d-flex justify-content-between mb-2">
        <span class="text-muted">Cantidad Solicitada:</span>
        <strong class="fs-6">${parseFloat(venta.cantidad_solicitada || 0).toFixed(2)} Litros</strong>
      </div>
      <div class="d-flex justify-content-between mb-2">
        <span class="text-muted">Cantidad Autorizada:</span>
        <strong class="fs-5 text-${colorClass}">${parseFloat(venta.cantidad_autorizada || 0).toFixed(2)} Litros</strong>
      </div>
      <div class="d-flex justify-content-between">
        <span class="text-muted">Cupo Límite Cliente:</span>
        <span class="fw-bold">${parseFloat(venta.total_litros_permitido || 0).toFixed(2)} Litros</span>
      </div>
    </div>
  `;

  const modal = new bootstrap.Modal(document.getElementById('saleResultModal'));
  modal.show();
}

async function renderHistorialVentas() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="d-flex justify-content-center my-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>
  `;

  try {
    const response = await fetch(`${window.API_URL}/ventas`);
    const ventas = await response.json();

    let tableRows = '';
    if (ventas.length === 0) {
      tableRows = `
        <tr>
          <td colspan="9" class="text-center py-4 text-muted">
            <i class="bi bi-clock-history d-block fs-2 mb-2"></i>
            No se han registrado ventas en el sistema.
          </td>
        </tr>
      `;
    } else {
      ventas.forEach(venta => {
        let badgeClass = 'success';
        if (venta.estado_venta === 'Limitada') {
          badgeClass = 'warning';
        } else if (venta.estado_venta === 'Bloqueada') {
          badgeClass = 'danger';
        }

        const clName = venta.clientes ? venta.clientes.nombre : 'Desconocido';
        const clPlaca = venta.clientes ? venta.clientes.placa_vehiculo : '---';
        const tkCode = venta.tanques ? venta.tanques.codigo_tanque : 'Desconocido';

        tableRows += `
          <tr>
            <td><strong>${new Date(venta.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></td>
            <td>
              <span class="fw-bold d-block">${clName}</span>
              <small class="text-muted font-monospace">${venta.clientes ? venta.clientes.documento : ''}</small>
            </td>
            <td><span class="badge bg-secondary font-monospace px-2">${clPlaca}</span></td>
            <td>${venta.tipo_carburante} <small class="text-muted">(${tkCode})</small></td>
            <td>${parseFloat(venta.cantidad_solicitada).toFixed(2)} L</td>
            <td><strong>${parseFloat(venta.cantidad_autorizada).toFixed(2)} L</strong></td>
            <td>
              <span class="badge-premium ${badgeClass}">${venta.estado_venta}</span>
            </td>
            <td>
              <small class="text-muted d-block" style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${venta.observacion || ''}">
                ${venta.observacion || 'Sin observaciones'}
              </small>
            </td>
          </tr>
        `;
      });
    }

    container.innerHTML = `
      <div class="row mb-4">
        <div class="col-12 d-flex justify-content-between align-items-center">
          <h4 class="mb-0">Historial de Ventas Controladas</h4>
          <button class="btn-premium btn-premium-primary" onclick="switchView('ventas-nueva')">
            <i class="bi bi-cart-plus-fill"></i> Nueva Venta Controlada
          </button>
        </div>
      </div>

      <div class="premium-card">
        <div class="premium-card-header">
          <h5 class="premium-card-title">Registro General de Despachos</h5>
          <span class="badge-premium info">${ventas.length} Transacciones</span>
        </div>
        
        <div class="premium-table-container">
          <table class="table premium-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Cliente</th>
                <th>Placa</th>
                <th>Combustible (Tanque)</th>
                <th>Cant. Solicitada</th>
                <th>Cant. Autorizada</th>
                <th>Estado Venta</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;

  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger alert-premium my-4" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div>
          <strong>Error de conexión:</strong> No se pudo cargar el historial de ventas. (${error.message})
        </div>
      </div>
    `;
  }
}
