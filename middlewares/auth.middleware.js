const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/db');

/* =====================================================
   VERIFICAR TOKEN
   NOTA: la columna 'estado' en la tabla usuarios es INTEGER (1=activo, 0=inactivo).
   La comparación se hace con truthy check para soportar tanto INTEGER
   como posibles variantes booleanas que PostgreSQL puede devolver
   según el driver/versión.
===================================================== */

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

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Token inválido o expirado.',
        error: jwtError.message
      });
    }

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

    // Soporta estado como INTEGER (1/0), string ('1'/'0') o boolean (true/false)
    const activo = usuario.estado === true || Number(usuario.estado) === 1;

    if (!activo) {
      return res.status(403).json({
        ok: false,
        mensaje: 'Usuario inactivo.'
      });
    }

    // Siempre se asigna como req.user para consistencia en todos los controllers
    req.user = usuario;
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Error verificando token.',
      error: error.message
    });
  }
}

/* =====================================================
   MIDDLEWARE: solo administradores
   Acepta rol === 'admin' O is_admin === 1
===================================================== */

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

/* =====================================================
   MIDDLEWARE: solo trabajadores
   Acepta rol trabajador/cliente_trabajador O es_trabajador === 1
===================================================== */

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