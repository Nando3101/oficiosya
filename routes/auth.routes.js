const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/registro', authController.registro);
router.post('/register', authController.registro);

router.post('/login', authController.login);

router.get('/verificar/:token', authController.verificarCorreo);
router.get('/verify/:token', authController.verificarCorreo);

router.post('/reenviar-verificacion', authController.reenviarVerificacion);

router.post('/forgot-password', authController.solicitarResetPassword);
router.post('/reset-password', authController.resetPassword);

router.get('/me', verificarToken, authController.me);

module.exports = router;