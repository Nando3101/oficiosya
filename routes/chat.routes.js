const express = require('express');
const router = express.Router();

const chatController = require('../controllers/chat.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/:solicitudId', verificarToken, chatController.listarMensajes);
router.post('/:solicitudId', verificarToken, chatController.enviarMensaje);
router.put('/:solicitudId/leido', verificarToken, chatController.marcarLeido);

module.exports = router;