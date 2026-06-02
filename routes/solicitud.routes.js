const express = require('express');
const router = express.Router();

const solicitudController = require('../controllers/solicitud.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

function usar(nombre) {
  if (typeof solicitudController[nombre] !== 'function') {
    return (req, res) => res.status(501).json({
      ok: false,
      mensaje: `Falta implementar solicitudController.${nombre}`
    });
  }

  return solicitudController[nombre];
}

router.get('/categorias', usar('obtenerCategorias'));
router.get('/abiertas', usar('listarAbiertas'));
router.get('/estadisticas', verificarToken, usar('estadisticas'));
router.get('/mias/todas', verificarToken, usar('misSolicitudes'));

router.post('/', verificarToken, usar('crearSolicitud'));

router.post('/:id/aplicar', verificarToken, usar('aplicarSolicitud'));
router.get('/:id/mi-postulacion', verificarToken, usar('miPostulacion'));
router.put('/:id/mi-postulacion', verificarToken, usar('editarMiPostulacion'));
router.put('/:id/cancelar-post', verificarToken, usar('cancelarPostulacion'));

router.get('/:id/postulaciones', verificarToken, usar('verPostulaciones'));
router.put('/postulacion/:postulacionId', verificarToken, usar('gestionarPostulacion'));

router.put('/:id/ubicacion-cliente', verificarToken, usar('actualizarUbicacionCliente'));
router.put('/:id/ubicacion', verificarToken, usar('actualizarUbicacionTrabajador'));
router.put('/:id/recorrido', verificarToken, usar('actualizarEstadoRecorrido'));

router.get('/:id', usar('detalleSolicitud'));
router.put('/:id', verificarToken, usar('editarSolicitud'));
router.delete('/:id', verificarToken, usar('eliminarSolicitud'));
router.put('/:id/cancelar', verificarToken, usar('cancelarSolicitud'));
router.put('/:id/iniciar', verificarToken, usar('iniciarTrabajo'));
router.put('/:id/finalizar', verificarToken, usar('finalizarTrabajo'));

module.exports = router;