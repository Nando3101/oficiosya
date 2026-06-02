const { sql, poolPromise } = require('../config/db');

exports.misStats = async (req, res) => {
  try {
    const usuarioId = req.user?.id || req.query.usuario_id || req.body.usuario_id || null;
    const pool = await poolPromise;

    let result;

    if (usuarioId) {
      result = await pool.request()
        .input('usuario_id', sql.Int, usuarioId)
        .query(`
          SELECT
            (SELECT COUNT(*) FROM solicitudes WHERE cliente_id = @usuario_id AND estado IN ('abierta', 'confirmada', 'en_curso')) AS solicitudes_activas,
            (SELECT COUNT(*) FROM servicios WHERE cliente_id = @usuario_id AND estado = 'finalizado') AS servicios_completados,
            (SELECT ISNULL(AVG(CAST(puntuacion AS FLOAT)), 0) FROM calificaciones WHERE calificado_id = @usuario_id) AS calificacion_promedio,
            0 AS mensajes
        `);
    } else {
      result = await pool.request().query(`
        SELECT
          (SELECT COUNT(*) FROM solicitudes WHERE estado IN ('abierta', 'confirmada', 'en_curso')) AS solicitudes_activas,
          (SELECT COUNT(*) FROM servicios WHERE estado = 'finalizado') AS servicios_completados,
          (SELECT ISNULL(AVG(CAST(puntuacion AS FLOAT)), 0) FROM calificaciones) AS calificacion_promedio,
          0 AS mensajes
      `);
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      mensaje: 'Error al cargar estadísticas.',
      error: error.message
    });
  }
};