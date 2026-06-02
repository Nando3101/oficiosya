const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email', authController.verifyEmail || ((req, res) => res.json({ ok: true })));
router.post('/resend-verification', authController.resendVerification || ((req, res) => res.json({ ok: true })));
router.post('/forgot-password', authController.forgotPassword || ((req, res) => res.json({ ok: true })));
router.post('/reset-password', authController.resetPassword || ((req, res) => res.json({ ok: true })));
router.post('/change-password', verificarToken, authController.changePassword || ((req, res) => res.json({ ok: true })));

module.exports = router;