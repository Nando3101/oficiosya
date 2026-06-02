const express = require('express');
const router = express.Router();

const notificacionController = require('../controllers/notificacion.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, notificacionController.listar);
router.put('/:id/leida', verificarToken, notificacionController.marcarLeida);
router.put('/todas/leidas', verificarToken, notificacionController.marcarTodasLeidas);

module.exports = router;