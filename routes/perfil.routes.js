const express = require('express');
const router = express.Router();

const perfilController = require('../controllers/perfil.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const {
  uploadImagen,
  optimizarImagen,
  manejarErrorUploadImagen
} = require('../middlewares/uploadImagen.middleware');

router.get('/me', verificarToken, perfilController.miPerfil);

router.put('/datos', verificarToken, perfilController.actualizarDatos);

router.put(
  '/foto',
  verificarToken,
  uploadImagen.single('foto'),
  optimizarImagen,
  manejarErrorUploadImagen,
  perfilController.subirFoto
);

router.get('/profesional', verificarToken, perfilController.miPerfilProfesional);

router.put('/profesional', verificarToken, perfilController.actualizarPerfilProfesional);

router.get('/verificaciones', verificarToken, perfilController.misVerificaciones);

router.post('/verificacion', verificarToken, perfilController.subirVerificacion);

/*
  IMPORTANTE:
  Esta ruta debe ir al final, porque /:id puede capturar otras rutas.
*/
router.get('/:id', perfilController.perfilPublico);

module.exports = router;