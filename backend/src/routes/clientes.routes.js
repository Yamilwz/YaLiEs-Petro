const express = require('express');
const router = express.Router();
const { 
  getClientes, 
  createCliente, 
  updateCliente, 
  deleteCliente, 
  buscarCliente, 
  getCupo 
} = require('../controllers/clientes.controller');

router.get('/', getClientes);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);
router.get('/buscar/:dato', buscarCliente);
router.get('/:id/cupo', getCupo);

module.exports = router;
