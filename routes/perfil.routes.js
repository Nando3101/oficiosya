const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const perfilController = require('../controllers/perfil.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const verificarToken =
  authMiddleware.verificarToken ||
  authMiddleware.authMiddleware ||
  authMiddleware.protegerRuta ||
  authMiddleware.requireAuth;

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

function usarMiddleware(middleware, nombre) {
  if (typeof middleware === 'function') {
    return middleware;
  }

  console.error(`Falta middleware: ${nombre}`);

  return (req, res) => {
    return res.status(500).json({
      ok: false,
      mensaje: `El middleware ${nombre} no está implementado correctamente.`
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

router.get(
  '/me',
  usarMiddleware(verificarToken, 'verificarToken'),
  usarFuncion('obtenerMiPerfil')
);

router.put(
  '/me',
  usarMiddleware(verificarToken, 'verificarToken'),
  usarFuncion('actualizarMiPerfil')
);

router.put(
  '/datos',
  usarMiddleware(verificarToken, 'verificarToken'),
  usarFuncion('actualizarMiPerfil')
);

router.put(
  '/foto',
  usarMiddleware(verificarToken, 'verificarToken'),
  upload.single('foto'),
  usarFuncion('subirFoto')
);

router.get(
  '/profesional',
  usarMiddleware(verificarToken, 'verificarToken'),
  usarFuncion('obtenerPerfilTrabajador')
);

router.post(
  '/profesional',
  usarMiddleware(verificarToken, 'verificarToken'),
  usarFuncion('crearActualizarPerfilTrabajador')
);

router.put(
  '/profesional',
  usarMiddleware(verificarToken, 'verificarToken'),
  usarFuncion('crearActualizarPerfilTrabajador')
);

router.get(
  '/trabajador',
  usarMiddleware(verificarToken, 'verificarToken'),
  usarFuncion('obtenerPerfilTrabajador')
);

router.post(
  '/trabajador',
  usarMiddleware(verificarToken, 'verificarToken'),
  usarFuncion('crearActualizarPerfilTrabajador')
);

router.put(
  '/trabajador',
  usarMiddleware(verificarToken, 'verificarToken'),
  usarFuncion('crearActualizarPerfilTrabajador')
);

router.get(
  '/verificaciones',
  usarMiddleware(verificarToken, 'verificarToken'),
  usarFuncion('misVerificaciones')
);

router.post(
  '/verificacion',
  usarMiddleware(verificarToken, 'verificarToken'),
  upload.single('documento'),
  usarFuncion('subirVerificacion')
);

router.get('/:id', usarFuncion('obtenerPerfilPublico'));

module.exports = router;