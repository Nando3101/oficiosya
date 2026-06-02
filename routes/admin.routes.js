const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// FIX: soloAdmin ahora verifica tanto rol === 'admin' como is_admin === 1,
// igual que el middleware esAdmin en auth.middleware.js.
// Antes solo verificaba rol, dejando fuera usuarios con is_admin = 1.
function soloAdmin(req, res, next) {
  if (
    req.user &&
    (req.user.rol === 'admin' || Number(req.user.is_admin) === 1)
  ) {
    return next();
  }

  return res.status(403).json({
    ok: false,
    mensaje: 'Acceso denegado. Solo administrador.'
  });
}

router.get('/resumen', verificarToken, soloAdmin, adminController.resumen);
router.get('/usuarios', verificarToken, soloAdmin, adminController.listarUsuarios);
router.get('/solicitudes', verificarToken, soloAdmin, adminController.listarSolicitudes);
router.get('/postulaciones', verificarToken, soloAdmin, adminController.listarPostulaciones);
router.get('/calificaciones', verificarToken, soloAdmin, adminController.listarCalificaciones);
router.get('/verificaciones', verificarToken, soloAdmin, adminController.listarVerificaciones);

router.put('/usuarios/:id/estado', verificarToken, soloAdmin, adminController.cambiarEstadoUsuario);
router.put('/verificaciones/:id', verificarToken, soloAdmin, adminController.gestionarVerificacion);

module.exports = router;