const express = require('express');
const router = express.Router();

const estadoController = require('../controllers/estado.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/me', verificarToken, estadoController.miEstado);
router.put('/conexion', verificarToken, estadoController.actualizarEstadoConexion);

module.exports = router;