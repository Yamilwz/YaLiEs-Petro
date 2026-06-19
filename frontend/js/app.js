// YaLiEs Petrol SPA Coordinator & Dashboard Module

// Dynamically determine the backend API URL
window.API_URL = window.location.origin.startsWith('http') 
  ? `${window.location.origin}/api` 
  : 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  setupNavigation();
  await checkBackendConnection();
  await fetchStationMeta();
  
  // Default view is Dashboard
  switchView('dashboard');
}

// 1. Navigation coordinator
function setupNavigation() {
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all links
      navLinks.forEach(nl => nl.classList.remove('active'));
      
      // Add active class to clicked link
      link.classList.add('active');
      
      const view = link.getAttribute('data-view');
      switchView(view);
    });
  });
}

function switchView(viewName) {
  const titleElement = document.getElementById('current-view-title');
  
  // Update page header title
  switch(viewName) {
    case 'dashboard':
      titleElement.textContent = 'Dashboard de Control';
      renderDashboard();
      break;
    case 'ventas-nueva':
      titleElement.textContent = 'Nueva Venta Controlada';
      renderNuevaVenta();
      break;
    case 'ventas-historial':
      titleElement.textContent = 'Historial de Ventas';
      renderHistorialVentas();
      break;
    case 'ingresos':
      titleElement.textContent = 'Registro de Ingresos';
      renderIngresos();
      break;
    case 'tanques':
      titleElement.textContent = 'Gestión de Tanques';
      renderTanques();
      break;
    case 'clientes':
      titleElement.textContent = 'Gestión de Clientes';
      renderClientes();
      break;
    case 'empresa':
      titleElement.textContent = 'Configuración General';
      renderEmpresa();
      break;
  }

  // Active state fallback if switched programmatically
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  navLinks.forEach(nl => {
    if (nl.getAttribute('data-view') === viewName) {
      nl.classList.add('active');
    } else {
      nl.classList.remove('active');
    }
  });
}

// 2. Health check
async function checkBackendConnection() {
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.getElementById('api-status-text');

  try {
    const res = await fetch(`${window.API_URL}/health`);
    if (res.ok) {
      statusDot.className = 'status-dot online';
      statusText.textContent = 'Backend Conectado';
    } else {
      throw new Error();
    }
  } catch (error) {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Backend Desconectado';
    
    // Inject prominent offline alert in main content if offline
    document.getElementById('main-content').innerHTML = `
      <div class="alert alert-danger alert-premium my-4" role="alert">
        <i class="bi bi-wifi-off fs-4"></i>
        <div>
          <strong>¡Sin Conexión con el Servidor Backend!</strong> 
          <br>
          No es posible comunicarse con la API de YaLiEs Petrol. Por favor asegúrese de que el servidor Node.js esté corriendo (ej. con npm start en el puerto 3000) y que las variables de conexión a Supabase estén correctas en el archivo .env.
          <br>
          <button class="btn btn-outline-danger btn-sm mt-3" onclick="initApp()"><i class="bi bi-arrow-clockwise"></i> Reintentar Conexión</button>
        </div>
      </div>
    `;
  }
}

// 3. Station details header sync
async function fetchStationMeta() {
  try {
    const res = await fetch(`${window.API_URL}/empresa`);
    const empresa = await res.json();
    if (empresa) {
      document.getElementById('station-header-name').textContent = empresa.nombre;
      document.getElementById('station-header-nit').textContent = `NIT: ${empresa.nit}`;
    }
  } catch (error) {
    console.error('Error fetching station meta:', error);
  }
}

// 4. Render Dashboard View
async function renderDashboard() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="d-flex justify-content-center my-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>
  `;

  try {
    // 1. Fetch statistics
    const empResponse = await fetch(`${window.API_URL}/empresa`);
    const empresa = await empResponse.json();
    
    const tanksResponse = await fetch(`${window.API_URL}/tanques`);
    const tanques = await tanksResponse.json();

    const salesResponse = await fetch(`${window.API_URL}/ventas`);
    const ventas = await salesResponse.json();

    // 2. Compute metrics
    const totalSalesCount = ventas.length;
    const totalLitersSold = ventas.reduce((acc, v) => acc + parseFloat(v.cantidad_autorizada || 0), 0);
    
    let lowStockCount = 0;
    let criticalStockHtml = '';
    let tanksHtml = '';

    const alertThreshold = empresa ? parseFloat(empresa.stock_minimo_alerta) : 1000.00;

    tanques.forEach(tanque => {
      const stock = parseFloat(tanque.stock_actual);
      const minSeg = parseFloat(tanque.stock_minimo_seguridad);
      const capMax = parseFloat(tanque.capacidad_maxima);
      
      const pct = Math.min(100, Math.max(0, (stock / capMax) * 100));
      
      const isCritical = stock <= minSeg;
      const isWarning = stock <= alertThreshold;
      
      if (isCritical) {
        lowStockCount++;
        criticalStockHtml += `
          <div class="alert alert-danger alert-premium mb-2" role="alert">
            <i class="bi bi-exclamation-octagon-fill"></i>
            <div>
              <strong>Stock Crítico de Seguridad:</strong> El tanque <strong>${tanque.codigo_tanque} (${tanque.tipo_carburante})</strong> cuenta con solo <strong>${stock.toFixed(2)} L</strong> (Límite crítico: ${minSeg.toFixed(2)} L).
            </div>
          </div>
        `;
      } else if (isWarning) {
        criticalStockHtml += `
          <div class="alert alert-warning alert-premium mb-2" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <div>
              <strong>Alerta de Reabastecimiento:</strong> El tanque <strong>${tanque.codigo_tanque} (${tanque.tipo_carburante})</strong> está por debajo del nivel de alerta general con <strong>${stock.toFixed(2)} L</strong> (Límite: ${alertThreshold.toFixed(2)} L).
            </div>
          </div>
        `;
      }

      const gaugeColor = tanque.tipo_carburante.toLowerCase() === 'gasolina' ? 'gasolina' : 'diesel';
      tanksHtml += `
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="premium-card text-center">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <strong class="text-dark">${tanque.codigo_tanque}</strong>
              <span class="badge-premium ${isCritical ? 'danger' : isWarning ? 'warning' : 'success'}">${tanque.estado}</span>
            </div>
            
            <div class="tank-cap"></div>
            <div class="tank-gauge-body" style="height: 120px; width: 60px;">
              <div class="tank-gauge-fill ${gaugeColor}" style="height: ${pct}%">
                <span class="tank-gauge-text" style="font-size: 11px;">${pct.toFixed(0)}%</span>
              </div>
            </div>
            
            <h6 class="text-primary mb-1">${tanque.tipo_carburante}</h6>
            <span class="d-block fw-bold fs-5">${stock.toFixed(2)} L</span>
            <span class="text-muted small">Capacidad: ${capMax.toFixed(2)} L</span>
          </div>
        </div>
      `;
    });

    if (tanques.length === 0) {
      tanksHtml = `
        <div class="col-12 text-center py-4 text-muted">
          <i class="bi bi-database-exclamation fs-1 d-block mb-2"></i>
          No hay tanques registrados en la estación.
        </div>
      `;
    }

    // 3. Compute recent sales list (limit to 5)
    let recentSalesHtml = '';
    const recentSales = ventas.slice(0, 5);
    
    if (recentSales.length === 0) {
      recentSalesHtml = '<tr><td colspan="5" class="text-center py-3 text-muted">No hay transacciones recientes.</td></tr>';
    } else {
      recentSales.forEach(v => {
        let badgeStyle = 'success';
        if (v.estado_venta === 'Limitada') badgeStyle = 'warning';
        if (v.estado_venta === 'Bloqueada') badgeStyle = 'danger';
        
        const clName = v.clientes ? v.clientes.nombre : 'Cliente';
        const clPlaca = v.clientes ? v.clientes.placa_vehiculo : '---';

        recentSalesHtml += `
          <tr>
            <td>${new Date(v.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
            <td><strong>${clName}</strong> <br><small class="text-muted">${clPlaca}</small></td>
            <td>${v.tipo_carburante}</td>
            <td><strong>${parseFloat(v.cantidad_autorizada).toFixed(2)} L</strong></td>
            <td><span class="badge-premium ${badgeStyle}">${v.estado_venta}</span></td>
          </tr>
        `;
      });
    }

    // Render Dashboard template
    container.innerHTML = `
      <!-- Fila de Tarjetas Métricas -->
      <div class="row mb-4">
        <div class="col-md-4 mb-3">
          <div class="premium-card metric-card">
            <div class="metric-icon blue">
              <i class="bi bi-cart-check-fill"></i>
            </div>
            <div class="metric-data">
              <h4>${totalSalesCount}</h4>
              <span>Despachos Totales</span>
            </div>
          </div>
        </div>
        
        <div class="col-md-4 mb-3">
          <div class="premium-card metric-card">
            <div class="metric-icon emerald">
              <i class="bi bi-droplet-half"></i>
            </div>
            <div class="metric-data">
              <h4>${totalLitersSold.toFixed(2)} L</h4>
              <span>Combustible Despachado</span>
            </div>
          </div>
        </div>
        
        <div class="col-md-4 mb-3">
          <div class="premium-card metric-card">
            <div class="metric-icon orange">
              <i class="bi bi-exclamation-octagon-fill"></i>
            </div>
            <div class="metric-data">
              <h4>${lowStockCount}</h4>
              <span>Tanques Stock Crítico</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Alertas de Stock Crítico -->
      ${criticalStockHtml ? `<div class="row mb-4"><div class="col-12">${criticalStockHtml}</div></div>` : ''}

      <div class="row">
        <!-- Visualización de Niveles de Combustible -->
        <div class="col-xl-7 mb-4">
          <div class="premium-card">
            <div class="premium-card-header">
              <h5 class="premium-card-title">Niveles en Tanques de Almacenamiento</h5>
              <button class="btn btn-sm btn-outline-primary" onclick="switchView('tanques')">Gestionar Tanques</button>
            </div>
            <div class="row">
              ${tanksHtml}
            </div>
          </div>
        </div>

        <!-- Ventas Recientes y Accesos Rápidos -->
        <div class="col-xl-5 mb-4">
          <!-- Ventas Recientes -->
          <div class="premium-card mb-4">
            <div class="premium-card-header">
              <h5 class="premium-card-title">Últimos Despachos</h5>
              <button class="btn btn-sm btn-outline-primary" onclick="switchView('ventas-historial')">Ver Historial</button>
            </div>
            <div class="premium-table-container">
              <table class="table premium-table align-middle">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentSalesHtml}
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Accesos Rápidos -->
          <div class="premium-card">
            <div class="premium-card-header">
              <h5 class="premium-card-title">Operaciones Rápidas</h5>
            </div>
            <div class="d-grid gap-2">
              <button class="btn btn-primary btn-premium text-start py-2" onclick="switchView('ventas-nueva')">
                <i class="bi bi-cart-plus-fill me-2"></i> Nueva Venta Controlada (Dinámica)
              </button>
              <button class="btn btn-success btn-premium text-start py-2" onclick="switchView('ingresos')">
                <i class="bi bi-arrow-down-left-square me-2"></i> Registrar Ingreso / Cisterna
              </button>
              <button class="btn btn-outline-secondary btn-premium text-start py-2" onclick="switchView('clientes')">
                <i class="bi bi-person-plus-fill me-2"></i> Registrar / Gestionar Clientes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger alert-premium my-4" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div>
          <strong>Error al cargar el dashboard:</strong> ${error.message}
          <br>
          <button class="btn btn-outline-danger btn-sm mt-3" onclick="renderDashboard()">Reintentar</button>
        </div>
      </div>
    `;
  }
}
