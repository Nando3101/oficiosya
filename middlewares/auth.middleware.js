const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/db');

async function verificarToken(req, res, next) {
  try {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Token no enviado.'
      });
    }

    const token = header.replace('Bearer ', '').trim();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pgPool.query(
      `
      SELECT id, email, rol, is_admin, es_cliente, es_trabajador, estado
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
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Token inválido.',
      error: error.message
    });
  }
}

function esAdmin(req, res, next) {
  if (
    req.user &&
    (req.user.rol === 'admin' || Number(req.user.is_admin) === 1)
  ) {
    return next();
  }

  return res.status(403).json({
    ok: false,
    mensaje: 'Acceso solo para administradores.'
  });
}

function esTrabajador(req, res, next) {
  if (
    req.user &&
    (
      req.user.rol === 'trabajador' ||
      req.user.rol === 'cliente_trabajador' ||
      Number(req.user.es_trabajador) === 1
    )
  ) {
    return next();
  }

  return res.status(403).json({
    ok: false,
    mensaje: 'Acceso solo para trabajadores.'
  });
}

module.exports = {
  verificarToken,
  esAdmin,
  esTrabajador
};