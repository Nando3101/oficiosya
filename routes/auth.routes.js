const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Registro
router.post('/registro', authController.registro);
router.post('/register', authController.registro);

// Login
router.post('/login', authController.login);

// FIX: ruta de Google login que el frontend llama pero no existía en el backend
router.post('/google', authController.googleLogin);

// Verificación de correo por ruta (token en URL)
router.get('/verificar/:token', authController.verificarCorreo);
router.get('/verify/:token', authController.verificarCorreo);

// FIX: rutas que llamaban a verificarCorreoQuery, función que no existía
router.get('/verify-email', authController.verificarCorreoQuery);
router.get('/verificar-email', authController.verificarCorreoQuery);

// Reenviar verificación
router.post('/reenviar-verificacion', authController.reenviarVerificacion);
router.post('/resend-verification', authController.reenviarVerificacion);

// FIX: ruta que llamaba a cambiarPassword, función que no existía
router.post('/change-password', verificarToken, authController.cambiarPassword);

// Recuperar contraseña
router.post('/forgot-password', authController.solicitarResetPassword);
router.post('/reset-password', authController.resetPassword);

// Usuario autenticado
router.get('/me', verificarToken, authController.me);

module.exports = router;