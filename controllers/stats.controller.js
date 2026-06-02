const { pgPool } = require('../config/db');

exports.misStats = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const solicitudes = await pgPool.query(
      `
      SELECT COUNT(*) AS total
      FROM solicitudes
      WHERE cliente_id = $1 OR trabajador_id = $1
      `,
      [usuarioId]
    );

    const postulaciones = await pgPool.query(
      `
      SELECT COUNT(*) AS total
      FROM postulaciones
      WHERE trabajador_id = $1
      `,
      [usuarioId]
    );

    const calificaciones = await pgPool.query(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(AVG(CAST(puntuacion AS DOUBLE PRECISION)), 0) AS promedio
      FROM calificaciones
      WHERE calificado_id = $1
      `,
      [usuarioId]
    );

    const trabajos = await pgPool.query(
      `
      SELECT COUNT(*) AS total
      FROM trabajos_realizados
      WHERE trabajador_id = $1
      `,
      [usuarioId]
    );

    return res.json({
      ok: true,
      stats: {
        solicitudes: Number(solicitudes.rows[0].total),
        postulaciones: Number(postulaciones.rows[0].total),
        calificaciones: Number(calificaciones.rows[0].total),
        promedio: Number(calificaciones.rows[0].promedio),
        trabajos: Number(trabajos.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error obteniendo estadísticas.',
      error: error.message
    });
  }
};