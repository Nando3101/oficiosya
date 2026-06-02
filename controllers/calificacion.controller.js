const { pgPool } = require('../config/db');

exports.obtenerCalificacionesUsuario = async (req, res) => {
  try {
    const usuarioId = Number(req.params.usuarioId);

    const result = await pgPool.query(
      `
      SELECT
        c.*,
        u.nombres AS calificador_nombres,
        u.apellidos AS calificador_apellidos,
        CONCAT(u.nombres, ' ', u.apellidos) AS calificador_nombre_completo
      FROM calificaciones c
      INNER JOIN usuarios u ON u.id = c.calificador_id
      WHERE c.calificado_id = $1
      ORDER BY c.createdat DESC
      `,
      [usuarioId]
    );

    const promedio = await pgPool.query(
      `
      SELECT
        COALESCE(AVG(CAST(puntuacion AS DOUBLE PRECISION)), 0) AS promedio,
        COUNT(*) AS total
      FROM calificaciones
      WHERE calificado_id = $1
      `,
      [usuarioId]
    );

    return res.json({
      ok: true,
      calificaciones: result.rows,
      promedio: promedio.rows[0].promedio,
      total: promedio.rows[0].total,
      data: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo calificaciones:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error obteniendo calificaciones.',
      error: error.message
    });
  }
};

exports.crearCalificacion = async (req, res) => {
  try {
    const calificadorId = req.user.id;

    const {
      solicitud_id,
      calificado_id,
      puntuacion,
      comentario
    } = req.body;

    if (!calificado_id || !puntuacion) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Calificado y puntuación son obligatorios.'
      });
    }

    if (Number(puntuacion) < 1 || Number(puntuacion) > 5) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La puntuación debe estar entre 1 y 5.'
      });
    }

    const result = await pgPool.query(
      `
      INSERT INTO calificaciones (
        solicitud_id,
        calificador_id,
        calificado_id,
        puntuacion,
        comentario,
        createdat,
        updatedat
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
      `,
      [
        solicitud_id || null,
        calificadorId,
        calificado_id,
        puntuacion,
        comentario || null
      ]
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Calificación registrada correctamente.',
      calificacion: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando calificación:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error creando calificación.',
      error: error.message
    });
  }
};