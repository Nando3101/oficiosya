const express = require('express');
const router = express.Router();

const calificacionController = require('../controllers/calificacion.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/', verificarToken, calificacionController.crearCalificacion);

router.get('/recibidas/:usuarioId', calificacionController.listarRecibidas);
router.get('/solicitud/:solicitudId', verificarToken, calificacionController.obtenerPorSolicitud);

module.exports = router;