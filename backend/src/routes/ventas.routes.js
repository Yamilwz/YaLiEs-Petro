const express = require('express');
const router = express.Router();
const { getVentas, createVenta } = require('../controllers/ventas.controller');

router.get('/', getVentas);
router.post('/', createVenta);

module.exports = router;
