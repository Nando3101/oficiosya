const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

function usarFuncion(nombre) {
  if (typeof authController[nombre] === 'function') {
    return authController[nombre];
  }

  console.error(`Falta función en auth.controller.js: ${nombre}`);

  return (req, res) => {
    return res.status(501).json({
      ok: false,
      mensaje: `La función ${nombre} no está implementada en auth.controller.js`
    });
  };
}

router.get('/debug', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Rutas de autenticación cargadas correctamente.',
    rutas: [
      'POST /api/auth/registro',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/google',
      'GET /api/auth/verificar/:token',
      'GET /api/auth/verify/:token',
      'GET /api/auth/verify-email',
      'GET /api/auth/verificar-email',
      'POST /api/auth/reenviar-verificacion',
      'POST /api/auth/resend-verification',
      'POST /api/auth/forgot-password',
      'POST /api/auth/reset-password',
      'POST /api/auth/change-password',
      'GET /api/auth/me'
    ]
  });
});

router.post('/registro', usarFuncion('registro'));
router.post('/register', usarFuncion('registro'));

router.post('/login', usarFuncion('login'));

router.post('/google', usarFuncion('googleLogin'));

router.get('/verificar/:token', usarFuncion('verificarCorreo'));
router.get('/verify/:token', usarFuncion('verificarCorreo'));

router.get('/verify-email', usarFuncion('verificarCorreoQuery'));
router.get('/verificar-email', usarFuncion('verificarCorreoQuery'));

router.post('/reenviar-verificacion', usarFuncion('reenviarVerificacion'));
router.post('/resend-verification', usarFuncion('reenviarVerificacion'));

router.post('/forgot-password', usarFuncion('solicitarResetPassword'));
router.post('/reset-password', usarFuncion('resetPassword'));

router.post('/change-password', verificarToken, usarFuncion('cambiarPassword'));
router.get('/me', verificarToken, usarFuncion('me'));

module.exports = router;