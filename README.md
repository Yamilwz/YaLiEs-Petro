# YaLiEs Petrol - Sistema de Gestión de Inventario y Venta Controlada

**YaLiEs Petrol** es una solución full-stack premium para estaciones de servicio (estaciones de combustible) que administra tanques de almacenamiento de Gasolina y Diésel, registra ingresos por cisterna, gestiona clientes asociados a placas vehiculares y controla las ventas mediante un algoritmo dinámico de cupos semanales basado en el historial de consumo de los últimos 28 días.

---

## 🛠️ Arquitectura del Sistema
El sistema implementa una arquitectura desacoplada por capas:

1. **Frontend (SPA)**:
   - Interfaz Single Page Application interactiva desarrollada con HTML5, CSS3, JavaScript (ES6 Modules) y Bootstrap 5.
   - Sin recargas de página: consume servicios y realiza operaciones mediante llamadas asíncronas con `Fetch API`.
   - Se comunica únicamente con el servidor backend Express.
2. **Backend (API REST)**:
   - Servidor desarrollado en Node.js y Express.js.
   - Organizado en capas: Rutas (`Routes`), Controladores (`Controllers`) y Servicios de Reglas de Negocio (`Services`).
   - Conexión segura con base de datos PostgreSQL en la nube (Supabase) mediante `@supabase/supabase-js`.
3. **Servicios de Regla de Negocio (Services)**:
   - `cupo.service.js`: Aplica las fórmulas de promedio semanal e incrementos de holgura en base a compras del cliente en los últimos 28 días.
   - `stock.service.js`: Valida niveles de tanques e incrementa/reduce el inventario disponible.

---

## 📋 Requisitos de Negocio Implementados
- **Historial y Promedio**: Promedia el consumo semanal en los últimos 28 días:
  $$\text{Promedio Semanal} = \frac{\text{Total Litros Vendidos en últimos 28 días}}{4}$$
- **Factor de Holgura**: Permite un excedente porcentual configurable:
  $$\text{Límite de Venta} = \text{Promedio Semanal} + \left(\text{Promedio Semanal} \times \frac{\text{Factor de Holgura}}{100}\right)$$
- **Clientes Nuevos**: A los clientes sin historial de compras en los últimos 28 días se les asigna el cupo base por defecto.
- **Venta Limitada**: Si la cantidad de combustible solicitada supera el cupo límite del cliente, se autoriza únicamente el límite y la transacción queda catalogada como **Limitada**.
- **Venta Bloqueada**: Si el cliente está en estado **Suspendido**, se genera un registro de venta bloqueada (0 litros autorizados) y se bloquea el despacho.
- **Validación de Tanques**: No se autoriza ninguna venta si el volumen supera el inventario disponible en el tanque seleccionado. El stock del tanque se actualiza automáticamente al autorizarse una venta o ingreso.

---

## 🚀 Guía de Instalación y Configuración

### 1. Configuración de Base de Datos en Supabase
1. Cree un proyecto nuevo en [Supabase](https://supabase.com).
2. Diríjase a la sección **SQL Editor** en el panel lateral de Supabase.
3. Abra un nuevo query en blanco, copie el contenido completo del archivo `database/schema.sql` y haga clic en **Run**.
4. Esto creará las tablas (`empresa`, `tanques`, `clientes`, `ingresos`, `ventas`), las restricciones de clave primaria/foránea y cargará datos semilla esenciales (empresa configurada por defecto, 2 tanques, clientes y ventas de prueba).

### 2. Configuración del Archivo de Entorno (.env)
1. En la carpeta `/backend`, cree un archivo llamado `.env` basándose en `.env.example`.
2. Configure las siguientes variables con las credenciales de su proyecto en Supabase:
   ```env
   PORT=3000
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_KEY=tu-anon-key-de-supabase
   ```
   *(Nota: Puedes obtener la URL y la Anon Key en Supabase ingresando a: Project Settings -> API).*

### 3. Instalación de Dependencias del Backend
Abra una terminal en la ruta del proyecto y ejecute los siguientes comandos:
```bash
# Navegar a la carpeta backend
cd backend

# Instalar dependencias
npm install
```

---

## 💻 Ejecución del Sistema

### Iniciar el Backend
Desde la carpeta `/backend`, inicie el servidor de desarrollo:
```bash
# Iniciar en modo de producción
npm start

# O iniciar con nodemon para desarrollo continuo
npm run dev
```
El backend estará escuchando en: **`http://localhost:3000`**

### Abrir el Frontend
El backend está configurado para servir los archivos del frontend de forma estática en la raíz. Por lo tanto, para utilizar la aplicación completa de forma integrada:
1. Asegúrese de que el backend esté ejecutándose (`npm start`).
2. Abra su navegador web y visite: **`http://localhost:3000`**
3. El dashboard principal se cargará de inmediato con los datos en tiempo real de Supabase.

*Alternativamente, puedes abrir directamente el archivo `frontend/index.html` en el navegador (usando la dirección `file://` o extensiones como Live Server). El frontend intentará autodetectar la API en `http://localhost:3000` de forma transparente.*

---

## 📂 Estructura Completa del Proyecto
El proyecto respeta la siguiente estructura obligatoria:
```
/frontend
  /css
    styles.css
  /js
    app.js
    empresa.js
    tanques.js
    clientes.js
    ingresos.js
    ventas.js
  index.html

/backend
  /src
    /config
      supabase.js
    /routes
      empresa.routes.js
      tanques.routes.js
      clientes.routes.js
      ingresos.routes.js
      ventas.routes.js
    /controllers
      empresa.controller.js
      tanques.controller.js
      clientes.controller.js
      ingresos.controller.js
      ventas.controller.js
    /services
      cupo.service.js
      stock.service.js
    app.js
    server.js
  package.json
  .env.example

/database
  schema.sql

README.md
```
