const express = require('express');
const router = express.Router();

const calificacionController = require('../controllers/calificacion.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/usuario/:usuarioId', calificacionController.obtenerCalificacionesUsuario);
router.get('/recibidas/:usuarioId', calificacionController.obtenerCalificacionesUsuario);
router.get('/solicitud/:solicitudId', calificacionController.obtenerCalificacionSolicitud);

router.post('/', verificarToken, calificacionController.crearCalificacion);

module.exports = router;