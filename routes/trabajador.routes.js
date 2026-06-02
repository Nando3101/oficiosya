const express = require('express');
const router = express.Router();

const trabajadorController = require('../controllers/trabajador.controller');

router.get('/', trabajadorController.listarProfesionales);
router.get('/profesionales', trabajadorController.listarProfesionales);
router.get('/:id', trabajadorController.detalleProfesional);

module.exports = router;