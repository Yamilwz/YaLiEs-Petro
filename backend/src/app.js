const express = require('express');
const cors = require('cors');
const path = require('path');

// Route imports
const empresaRoutes = require('./routes/empresa.routes');
const tanquesRoutes = require('./routes/tanques.routes');
const clientesRoutes = require('./routes/clientes.routes');
const ingresosRoutes = require('./routes/ingresos.routes');
const ventasRoutes = require('./routes/ventas.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/empresa', empresaRoutes);
app.use('/api/tanques', tanquesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/ingresos', ingresosRoutes);
app.use('/api/ventas', ventasRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'YaLiEs Petrol API is running.' });
});

// Wildcard fallback to serve index.html for SPA routing if visited directly
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal en el servidor: ' + err.message });
});

module.exports = app;
