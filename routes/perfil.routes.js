const express = require('express');
const router = express.Router();

const perfilController = require('../controllers/perfil.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/me', verificarToken, perfilController.obtenerMiPerfil);
router.put('/me', verificarToken, perfilController.actualizarMiPerfil);

router.post('/trabajador', verificarToken, perfilController.crearActualizarPerfilTrabajador);
router.put('/trabajador', verificarToken, perfilController.crearActualizarPerfilTrabajador);

module.exports = router;