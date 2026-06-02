const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/db');

async function verificarToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Token no proporcionado.'
      });
    }

    const partes = authHeader.split(' ');

    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return res.status(401).json({
        ok: false,
        mensaje: 'Formato de token inválido.'
      });
    }

    const token = partes[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'oficiosya_secret_temporal'
    );

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Token inválido.'
      });
    }

    const result = await pgPool.query(
      `
      SELECT 
        id,
        nombres,
        apellidos,
        email,
        rol,
        estado,
        is_admin,
        es_cliente,
        es_trabajador,
        email_verificado,
        verificado
      FROM usuarios
      WHERE id = $1
      LIMIT 1
      `,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    const usuario = result.rows[0];

    if (Number(usuario.estado) !== 1) {
      return res.status(403).json({
        ok: false,
        mensaje: 'Usuario inactivo.'
      });
    }

    req.user = usuario;
    req.usuario = usuario;

    next();
  } catch (error) {
    console.error('Error verificando token:', error.message);

    return res.status(401).json({
      ok: false,
      mensaje: 'Token inválido o expirado.',
      error: error.message
    });
  }
}

function verificarAdmin(req, res, next) {
  const usuario = req.user || req.usuario;

  if (!usuario) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Usuario no autenticado.'
    });
  }

  const esAdmin =
    usuario.rol === 'admin' ||
    usuario.is_admin === true ||
    usuario.is_admin === 1 ||
    usuario.is_admin === '1';

  if (!esAdmin) {
    return res.status(403).json({
      ok: false,
      mensaje: 'Acceso denegado. Se requiere administrador.'
    });
  }

  next();
}

function verificarTrabajador(req, res, next) {
  const usuario = req.user || req.usuario;

  if (!usuario) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Usuario no autenticado.'
    });
  }

  const esTrabajador =
    usuario.es_trabajador === true ||
    usuario.es_trabajador === 1 ||
    usuario.es_trabajador === '1' ||
    usuario.rol === 'trabajador' ||
    usuario.rol === 'cliente_trabajador';

  if (!esTrabajador) {
    return res.status(403).json({
      ok: false,
      mensaje: 'Acceso denegado. Se requiere perfil de trabajador.'
    });
  }

  next();
}

module.exports = {
  verificarToken,
  verificarAdmin,
  verificarTrabajador,

  // Alias por compatibilidad con otros archivos del proyecto
  authMiddleware: verificarToken,
  protegerRuta: verificarToken,
  requireAuth: verificarToken,
  isAuth: verificarToken,
  esAdmin: verificarAdmin,
  isAdmin: verificarAdmin,
  requireAdmin: verificarAdmin,
  esTrabajador: verificarTrabajador,
  requireTrabajador: verificarTrabajador
};