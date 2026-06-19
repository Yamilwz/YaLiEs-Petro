const express = require('express');
const router = express.Router();
const { getTanques, createTanque, updateTanque, deleteTanque } = require('../controllers/tanques.controller');

router.get('/', getTanques);
router.post('/', createTanque);
router.put('/:id', updateTanque);
router.delete('/:id', deleteTanque);

module.exports = router;
