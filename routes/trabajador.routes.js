const express = require('express');
const router = express.Router();

const trabajadorController = require('../controllers/trabajador.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

function usar(nombre) {
  if (typeof trabajadorController[nombre] !== 'function') {
    return (req, res) => {
      return res.status(501).json({
        ok: false,
        mensaje: `Falta implementar trabajadorController.${nombre}`
      });
    };
  }

  return trabajadorController[nombre];
}

router.get('/profesionales', usar('listarProfesionales'));
router.get('/destacados', usar('listarDestacados'));
router.get('/categorias', usar('obtenerCategorias'));

router.put('/estado-conexion', verificarToken, usar('actualizarEstadoConexion'));

router.get('/:id', usar('detalleTrabajador'));

module.exports = router;