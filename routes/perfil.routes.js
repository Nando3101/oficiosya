const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const perfilController = require('../controllers/perfil.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `perfil_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

router.get('/me', verificarToken, perfilController.obtenerMiPerfil);
router.put('/me', verificarToken, perfilController.actualizarMiPerfil);
router.put('/datos', verificarToken, perfilController.actualizarMiPerfil);

router.put('/foto', verificarToken, upload.single('foto'), perfilController.subirFoto);

router.get('/profesional', verificarToken, perfilController.obtenerPerfilTrabajador);
router.post('/profesional', verificarToken, perfilController.crearActualizarPerfilTrabajador);
router.put('/profesional', verificarToken, perfilController.crearActualizarPerfilTrabajador);

router.get('/trabajador', verificarToken, perfilController.obtenerPerfilTrabajador);
router.post('/trabajador', verificarToken, perfilController.crearActualizarPerfilTrabajador);
router.put('/trabajador', verificarToken, perfilController.crearActualizarPerfilTrabajador);

router.get('/verificaciones', verificarToken, perfilController.misVerificaciones);
router.post('/verificacion', verificarToken, upload.single('documento'), perfilController.subirVerificacion);

router.get('/:id', perfilController.obtenerPerfilPublico);

module.exports = router;