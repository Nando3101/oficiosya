const { pgPool } = require('../config/db');

async function obtenerCategorias(req, res) {
  try {
    const result = await pgPool.query(`
      SELECT id, nombre, descripcion, estado
      FROM categorias
      WHERE estado = 1
      ORDER BY nombre ASC
    `);

    return res.json({
      ok: true,
      categorias: result.rows,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al cargar categorías:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar categorías.',
      error: error.message
    });
  }
}

async function listarProfesionales(req, res) {
  try {
    const result = await pgPool.query(`
      SELECT
        u.id AS id,
        u.id AS usuario_id,
        u.id AS id_usuario,
        p.id AS trabajador_id,
        p.id AS perfil_id,

        u.nombres,
        u.apellidos,
        CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
        u.email,
        u.telefono,
        u.zona,
        u.ciudad,
        u.rol,
        u.estado,
        u.verificado,
        u.es_cliente,
        u.es_trabajador,
        u.foto_url,
        u.foto_thumb,
        u.estado_conexion,

        p.titulo,
        p.descripcion,
        p.experiencia,
        p.ubicacion,
        p.disponibilidad,
        p.disponible,

        COALESCE(
          p.tarifa_referencia,
          p.tarifa_referencial,
          p.precio_desde,
          0
        ) AS tarifa_referencia,

        c.id AS categoria_id,
        COALESCE(c.nombre, 'Sin categoría') AS categoria,

        COALESCE((
          SELECT AVG(CAST(cal.puntuacion AS DOUBLE PRECISION))
          FROM calificaciones cal
          WHERE cal.calificado_id = u.id
        ), 0) AS promedio_calificacion,

        COALESCE((
          SELECT COUNT(*)
          FROM calificaciones cal
          WHERE cal.calificado_id = u.id
        ), 0) AS total_calificaciones

      FROM usuarios u
      LEFT JOIN perfiles_trabajador p ON p.usuario_id = u.id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE u.estado = 1
        AND (
          u.es_trabajador = 1
          OR u.rol IN ('trabajador', 'cliente_trabajador')
          OR p.id IS NOT NULL
        )
      ORDER BY u.verificado DESC, u.nombres ASC
    `);

    return res.json({
      ok: true,
      total: result.rows.length,
      profesionales: result.rows,
      trabajadores: result.rows,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al cargar profesionales:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar profesionales.',
      error: error.message,
      profesionales: [],
      trabajadores: []
    });
  }
}

async function listarDestacados(req, res) {
  return listarProfesionales(req, res);
}

async function detalleTrabajador(req, res) {
  try {
    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID de trabajador no válido.'
      });
    }

    const result = await pgPool.query(
      `
      SELECT
        u.id AS id,
        u.id AS usuario_id,
        p.id AS perfil_id,
        p.id AS trabajador_id,

        u.nombres,
        u.apellidos,
        CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
        u.email,
        u.telefono,
        u.zona,
        u.ciudad,
        u.rol,
        u.estado,
        u.verificado,
        u.es_cliente,
        u.es_trabajador,
        u.foto_url,
        u.foto_thumb,

        p.titulo,
        p.descripcion,
        p.experiencia,
        p.ubicacion,
        p.disponibilidad,

        COALESCE(
          p.tarifa_referencia,
          p.tarifa_referencial,
          p.precio_desde,
          0
        ) AS tarifa_referencia,

        c.nombre AS categoria

      FROM usuarios u
      LEFT JOIN perfiles_trabajador p ON p.usuario_id = u.id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE u.id = $1 OR p.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Trabajador no encontrado.'
      });
    }

    return res.json({
      ok: true,
      trabajador: result.rows[0],
      perfil: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al cargar trabajador:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar trabajador.',
      error: error.message
    });
  }
}

async function actualizarEstadoConexion(req, res) {
  try {
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({
        ok: false,
        mensaje: 'No autorizado.'
      });
    }

    const { estado_conexion, latitud, longitud } = req.body;

    await pgPool.query(
      `
      UPDATE usuarios
      SET
        estado_conexion = COALESCE($1, estado_conexion),
        ultima_latitud = COALESCE($2, ultima_latitud),
        ultima_longitud = COALESCE($3, ultima_longitud),
        ultima_conexion = NOW(),
        updatedat = NOW()
      WHERE id = $4
      `,
      [
        estado_conexion || 'activo',
        latitud || null,
        longitud || null,
        usuarioId
      ]
    );

    return res.json({
      ok: true,
      mensaje: 'Estado actualizado correctamente.'
    });
  } catch (error) {
    console.error('Error al actualizar estado:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar estado.',
      error: error.message
    });
  }
}

module.exports = {
  obtenerCategorias,
  listarProfesionales,
  listarDestacados,
  detalleTrabajador,
  actualizarEstadoConexion,

  profesionales: listarProfesionales,
  obtenerProfesionales: listarProfesionales,
  listarTrabajadores: listarProfesionales
};