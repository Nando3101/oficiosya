const express = require('express');
const router = express.Router();

const chatController = require('../controllers/chat.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/solicitud/:solicitudId', verificarToken, chatController.obtenerMensajes);
router.post('/solicitud/:solicitudId', verificarToken, chatController.enviarMensaje);
router.put('/solicitud/:solicitudId/leido', verificarToken, chatController.marcarLeido);

router.get('/:solicitudId', verificarToken, chatController.obtenerMensajes);
router.post('/:solicitudId', verificarToken, chatController.enviarMensaje);
router.put('/:solicitudId/leido', verificarToken, chatController.marcarLeido);

module.exports = router;