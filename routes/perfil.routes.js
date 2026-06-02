const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const perfilController = require('../controllers/perfil.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

function usarFuncion(nombre) {
  if (typeof perfilController[nombre] === 'function') {
    return perfilController[nombre];
  }

  console.error(`Falta función en perfil.controller.js: ${nombre}`);

  return (req, res) => {
    return res.status(501).json({
      ok: false,
      mensaje: `La función ${nombre} no está implementada en perfil.controller.js`
    });
  };
}

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

router.get('/debug', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Rutas de perfil cargadas correctamente.'
  });
});

router.get('/me', verificarToken, usarFuncion('obtenerMiPerfil'));
router.put('/me', verificarToken, usarFuncion('actualizarMiPerfil'));
router.put('/datos', verificarToken, usarFuncion('actualizarMiPerfil'));

router.put('/foto', verificarToken, upload.single('foto'), usarFuncion('subirFoto'));

router.get('/profesional', verificarToken, usarFuncion('obtenerPerfilTrabajador'));
router.post('/profesional', verificarToken, usarFuncion('crearActualizarPerfilTrabajador'));
router.put('/profesional', verificarToken, usarFuncion('crearActualizarPerfilTrabajador'));

router.get('/trabajador', verificarToken, usarFuncion('obtenerPerfilTrabajador'));
router.post('/trabajador', verificarToken, usarFuncion('crearActualizarPerfilTrabajador'));
router.put('/trabajador', verificarToken, usarFuncion('crearActualizarPerfilTrabajador'));

router.get('/verificaciones', verificarToken, usarFuncion('misVerificaciones'));
router.post('/verificacion', verificarToken, upload.single('documento'), usarFuncion('subirVerificacion'));

router.get('/:id', usarFuncion('obtenerPerfilPublico'));

module.exports = router;