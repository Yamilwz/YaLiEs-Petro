const express = require('express');
const router = express.Router();
const { getIngresos, createIngreso } = require('../controllers/ingresos.controller');

router.get('/', getIngresos);
router.post('/', createIngreso);

module.exports = router;
