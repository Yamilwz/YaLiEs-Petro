const express = require('express');
const router = express.Router();
const { getEmpresa, createEmpresa, updateEmpresa } = require('../controllers/empresa.controller');

router.get('/', getEmpresa);
router.post('/', createEmpresa);
router.put('/:id', updateEmpresa);

module.exports = router;
