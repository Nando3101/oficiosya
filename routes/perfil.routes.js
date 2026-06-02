const express = require('express');
const router = express.Router();

const perfilController = require('../controllers/perfil.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/me', verificarToken, perfilController.miPerfil);
router.put('/datos', verificarToken, perfilController.actualizarDatos);
router.put('/foto', verificarToken, perfilController.subirFoto);
router.get('/profesional', verificarToken, perfilController.miPerfilProfesional);
router.put('/profesional', verificarToken, perfilController.actualizarPerfilProfesional);
router.get('/verificaciones', verificarToken, perfilController.misVerificaciones);
router.post('/verificacion', verificarToken, perfilController.subirVerificacion);
router.get('/:id', perfilController.perfilPublico);

module.exports = router;