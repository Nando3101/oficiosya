const { sql, poolPromise } = require('../config/db');

function obtenerUsuarioId(req) {
  return req.user?.id || req.body?.calificador_id || req.body?.usuario_id || null;
}

exports.crearCalificacion = async (req, res) => {
  try {
    const calificadorId = obtenerUsuarioId(req);

    const {
      solicitud_id,
      servicio_id,
      calificado_id,
      puntaje,
      puntuacion,
      comentario
    } = req.body;

    const valorPuntuacion = Number(puntuacion || puntaje);

    if (!calificadorId) {
      return res.status(401).json({
        ok: false,
        mensaje: 'No se pudo identificar al usuario que califica.'
      });
    }

    if (!solicitud_id) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La solicitud es obligatoria.'
      });
    }

    if (!calificado_id) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El trabajador calificado es obligatorio.'
      });
    }

    if (!valorPuntuacion || valorPuntuacion < 1 || valorPuntuacion > 5) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La puntuación debe estar entre 1 y 5.'
      });
    }

    const pool = await poolPromise;

    const solicitud = await pool.request()
      .input('solicitud_id', sql.Int, Number(solicitud_id))
      .query(`
        SELECT TOP 1 
          id,
          cliente_id,
          trabajador_id,
          estado
        FROM solicitudes
        WHERE id = @solicitud_id
      `);

    if (solicitud.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'La solicitud no existe.'
      });
    }

    const s = solicitud.recordset[0];

    if (Number(s.cliente_id) !== Number(calificadorId)) {
      return res.status(403).json({
        ok: false,
        mensaje: 'Solo el cliente que creó la solicitud puede calificar.'
      });
    }

    if (Number(s.trabajador_id) !== Number(calificado_id)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El trabajador no corresponde a esta solicitud.'
      });
    }

    if (!['finalizada', 'finalizado'].includes(s.estado)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Solo se puede calificar una solicitud finalizada.'
      });
    }

    const existe = await pool.request()
      .input('solicitud_id', sql.Int, Number(solicitud_id))
      .input('calificador_id', sql.Int, Number(calificadorId))
      .input('calificado_id', sql.Int, Number(calificado_id))
      .query(`
        SELECT TOP 1 *
        FROM calificaciones
        WHERE solicitud_id = @solicitud_id
          AND calificador_id = @calificador_id
          AND calificado_id = @calificado_id
      `);

    let result;

    if (existe.recordset.length > 0) {
      result = await pool.request()
        .input('id', sql.Int, existe.recordset[0].id)
        .input('puntuacion', sql.Int, valorPuntuacion)
        .input('comentario', sql.VarChar(sql.MAX), comentario || null)
        .query(`
          UPDATE calificaciones
          SET puntuacion = @puntuacion,
              comentario = @comentario,
              updatedat = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      return res.json({
        ok: true,
        mensaje: 'Calificación actualizada correctamente.',
        calificacion: result.recordset[0]
      });
    }

    result = await pool.request()
      .input('servicio_id', sql.Int, servicio_id ? Number(servicio_id) : null)
      .input('solicitud_id', sql.Int, Number(solicitud_id))
      .input('calificador_id', sql.Int, Number(calificadorId))
      .input('calificado_id', sql.Int, Number(calificado_id))
      .input('puntuacion', sql.Int, valorPuntuacion)
      .input('comentario', sql.VarChar(sql.MAX), comentario || null)
      .query(`
        INSERT INTO calificaciones (
          servicio_id,
          solicitud_id,
          calificador_id,
          calificado_id,
          puntuacion,
          comentario,
          createdat
        )
        OUTPUT INSERTED.*
        VALUES (
          @servicio_id,
          @solicitud_id,
          @calificador_id,
          @calificado_id,
          @puntuacion,
          @comentario,
          GETDATE()
        )
      `);

    res.status(201).json({
      ok: true,
      mensaje: 'Calificación guardada correctamente.',
      calificacion: result.recordset[0]
    });

  } catch (error) {
    console.error('Error al guardar calificación:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al guardar la calificación.',
      error: error.message
    });
  }
};

exports.listarRecibidas = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('usuario_id', sql.Int, Number(usuarioId))
      .query(`
        SELECT 
          c.id,
          c.solicitud_id,
          c.calificador_id,
          c.calificado_id,
          c.puntuacion,
          c.comentario,
          c.createdat,
          u.nombres AS cliente_nombre,
          u.apellidos AS cliente_apellido,
          s.titulo AS solicitud_titulo
        FROM calificaciones c
        LEFT JOIN usuarios u ON u.id = c.calificador_id
        LEFT JOIN solicitudes s ON s.id = c.solicitud_id
        WHERE c.calificado_id = @usuario_id
        ORDER BY c.createdat DESC
      `);

    res.json({
      ok: true,
      calificaciones: result.recordset
    });

  } catch (error) {
    console.error('Error al listar calificaciones:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar calificaciones.',
      error: error.message,
      calificaciones: []
    });
  }
};

exports.obtenerPorSolicitud = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    const usuarioId = obtenerUsuarioId(req);

    const pool = await poolPromise;

    const result = await pool.request()
      .input('solicitud_id', sql.Int, Number(solicitudId))
      .input('usuario_id', sql.Int, Number(usuarioId))
      .query(`
        SELECT TOP 1 *
        FROM calificaciones
        WHERE solicitud_id = @solicitud_id
          AND calificador_id = @usuario_id
      `);

    res.json({
      ok: true,
      calificacion: result.recordset[0] || null
    });

  } catch (error) {
    console.error('Error al obtener calificación:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener calificación.',
      error: error.message
    });
  }
};