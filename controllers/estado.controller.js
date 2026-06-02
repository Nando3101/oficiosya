const { sql, poolPromise } = require('../config/db');

exports.miEstado = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(usuarioId))
      .query(`
        SELECT 
          id,
          nombres,
          apellidos,
          rol,
          estado_conexion,
          ultima_latitud,
          ultima_longitud,
          ultima_conexion
        FROM usuarios
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    res.json({
      ok: true,
      estado: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar estado.',
      error: error.message
    });
  }
};

exports.actualizarEstadoConexion = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { estado_conexion } = req.body;

    const estadosValidos = [
      'activo',
      'inactivo',
      'ocupado',
      'en_camino',
      'trabajando'
    ];

    if (!estadosValidos.includes(estado_conexion)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Estado de conexión no válido.'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(usuarioId))
      .input('estado_conexion', sql.VarChar(30), estado_conexion)
      .query(`
        UPDATE usuarios
        SET estado_conexion = @estado_conexion,
            ultima_conexion = GETDATE(),
            updatedat = GETDATE()
        OUTPUT 
          INSERTED.id,
          INSERTED.nombres,
          INSERTED.apellidos,
          INSERTED.rol,
          INSERTED.estado_conexion,
          INSERTED.ultima_conexion
        WHERE id = @id
      `);

    const usuario = result.recordset[0];

    const io = req.app.get('io');

    if (io) {
      io.to(`usuario_${usuarioId}`).emit('estado_conexion_actualizado', usuario);
      io.emit('trabajador_estado_actualizado', usuario);
    }

    res.json({
      ok: true,
      mensaje: 'Estado actualizado.',
      usuario
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar estado.',
      error: error.message
    });
  }
};