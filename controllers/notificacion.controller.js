const { sql, poolPromise } = require('../config/db');

exports.listar = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('usuario_id', sql.Int, usuarioId)
      .query(`
        SELECT TOP 50
          id,
          usuario_id,
          titulo,
          mensaje,
          tipo,
          leida,
          createdat
        FROM notificaciones
        WHERE usuario_id = @usuario_id
        ORDER BY createdat DESC
      `);

    res.json({
      ok: true,
      notificaciones: result.recordset
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar notificaciones.',
      error: error.message
    });
  }
};

exports.marcarLeida = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { id } = req.params;
    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, Number(id))
      .input('usuario_id', sql.Int, usuarioId)
      .query(`
        UPDATE notificaciones
        SET leida = 1
        WHERE id = @id
          AND usuario_id = @usuario_id
      `);

    res.json({
      ok: true,
      mensaje: 'Notificación marcada como leída.'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar notificación.',
      error: error.message
    });
  }
};

exports.marcarTodasLeidas = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const pool = await poolPromise;

    await pool.request()
      .input('usuario_id', sql.Int, usuarioId)
      .query(`
        UPDATE notificaciones
        SET leida = 1
        WHERE usuario_id = @usuario_id
      `);

    res.json({
      ok: true,
      mensaje: 'Todas las notificaciones fueron marcadas como leídas.'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar notificaciones.',
      error: error.message
    });
  }
};