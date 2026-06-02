const express = require('express');
const router = express.Router();

const solicitudController = require('../controllers/solicitud.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/categorias', solicitudController.obtenerCategorias);
router.get('/abiertas', solicitudController.listarAbiertas);
router.get('/mias/todas', verificarToken, solicitudController.misSolicitudes);

router.post('/', verificarToken, solicitudController.crearSolicitud);
router.post('/:id/aplicar', verificarToken, solicitudController.aplicarSolicitud);

router.get('/:id', solicitudController.detalleSolicitud);
router.get('/:id/postulaciones', verificarToken, solicitudController.verPostulaciones);

router.put('/:id', verificarToken, solicitudController.editarSolicitud);
router.put('/:id/cancelar', verificarToken, solicitudController.cancelarSolicitud);
router.put('/postulacion/:postulacionId', verificarToken, solicitudController.gestionarPostulacion);

router.delete('/:id', verificarToken, solicitudController.eliminarSolicitud);

module.exports = router;