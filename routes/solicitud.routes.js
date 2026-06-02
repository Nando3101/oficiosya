const express = require('express');
const router = express.Router();

const solicitudController = require('../controllers/solicitud.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

function validarFuncion(nombre) {
  if (typeof solicitudController[nombre] !== 'function') {
    throw new Error(`Falta exportar la función solicitudController.${nombre}`);
  }

  return solicitudController[nombre];
}

router.get('/categorias', validarFuncion('obtenerCategorias'));
router.get('/abiertas', validarFuncion('listarAbiertas'));
router.get('/estadisticas', validarFuncion('estadisticas'));

router.get('/mias/todas', verificarToken, validarFuncion('misSolicitudes'));

router.post('/', verificarToken, validarFuncion('crearSolicitud'));

router.post('/:id/aplicar', verificarToken, validarFuncion('aplicarSolicitud'));
router.get('/:id/mi-postulacion', verificarToken, validarFuncion('miPostulacion'));
router.put('/:id/mi-postulacion', verificarToken, validarFuncion('editarMiPostulacion'));
router.put('/:id/cancelar-post', verificarToken, validarFuncion('cancelarPostulacion'));
router.get('/:id/postulaciones', verificarToken, validarFuncion('verPostulaciones'));
router.put('/postulacion/:postulacionId', verificarToken, validarFuncion('gestionarPostulacion'));

router.put('/:id/ubicacion', verificarToken, validarFuncion('actualizarUbicacionTrabajador'));
router.put('/:id/recorrido', verificarToken, validarFuncion('actualizarEstadoRecorrido'));

router.get('/:id', validarFuncion('detalleSolicitud'));

router.put('/:id', verificarToken, validarFuncion('editarSolicitud'));
router.delete('/:id', verificarToken, validarFuncion('eliminarSolicitud'));

router.put('/:id/cancelar', verificarToken, validarFuncion('cancelarSolicitud'));
router.put('/:id/iniciar', verificarToken, validarFuncion('iniciarTrabajo'));
router.put('/:id/finalizar', verificarToken, validarFuncion('finalizarTrabajo'));

module.exports = router;