const { sql, poolPromise } = require('../config/db');

async function validarAccesoChat(pool, solicitudId, usuarioId) {
  const result = await pool.request()
    .input('solicitud_id', sql.Int, Number(solicitudId))
    .input('usuario_id', sql.Int, Number(usuarioId))
    .query(`
      SELECT 
        id,
        cliente_id,
        trabajador_id,
        titulo
      FROM solicitudes
      WHERE id = @solicitud_id
        AND (cliente_id = @usuario_id OR trabajador_id = @usuario_id)
    `);

  return result.recordset[0] || null;
}

exports.listarMensajes = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    const usuarioId = req.user.id;

    if (!solicitudId || isNaN(Number(solicitudId))) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID de solicitud no válido.'
      });
    }

    const pool = await poolPromise;

    const solicitud = await validarAccesoChat(pool, solicitudId, usuarioId);

    if (!solicitud) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tienes acceso a este chat.'
      });
    }

    const result = await pool.request()
      .input('solicitud_id', sql.Int, Number(solicitudId))
      .query(`
        SELECT 
          m.id,
          m.solicitud_id,
          m.emisor_id,
          m.receptor_id,
          m.mensaje,
          m.leido,
          m.createdat,
          CONCAT(e.nombres, ' ', e.apellidos) AS emisor
        FROM mensajes m
        INNER JOIN usuarios e ON e.id = m.emisor_id
        WHERE m.solicitud_id = @solicitud_id
        ORDER BY m.createdat ASC
      `);

    res.json({
      ok: true,
      solicitud,
      mensajes: result.recordset
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar mensajes.',
      error: error.message
    });
  }
};

exports.enviarMensaje = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    const { mensaje } = req.body;
    const emisorId = req.user.id;

    if (!solicitudId || isNaN(Number(solicitudId))) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID de solicitud no válido.'
      });
    }

    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El mensaje no puede estar vacío.'
      });
    }

    const pool = await poolPromise;

    const solicitud = await validarAccesoChat(pool, solicitudId, emisorId);

    if (!solicitud) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tienes acceso a este chat.'
      });
    }

    const receptorId = Number(emisorId) === Number(solicitud.cliente_id)
      ? solicitud.trabajador_id
      : solicitud.cliente_id;

    if (!receptorId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La solicitud aún no tiene cliente y trabajador asignados.'
      });
    }

    const insertado = await pool.request()
      .input('solicitud_id', sql.Int, Number(solicitudId))
      .input('emisor_id', sql.Int, Number(emisorId))
      .input('receptor_id', sql.Int, Number(receptorId))
      .input('mensaje', sql.VarChar(sql.MAX), mensaje.trim())
      .query(`
        INSERT INTO mensajes (
          solicitud_id,
          emisor_id,
          receptor_id,
          mensaje,
          leido,
          createdat
        )
        OUTPUT INSERTED.*
        VALUES (
          @solicitud_id,
          @emisor_id,
          @receptor_id,
          @mensaje,
          0,
          GETDATE()
        )
      `);

    const nuevoMensaje = insertado.recordset[0];

    await pool.request()
      .input('usuario_id', sql.Int, Number(receptorId))
      .input('titulo', sql.VarChar(150), 'Nuevo mensaje')
      .input('mensaje', sql.VarChar(sql.MAX), 'Tienes un nuevo mensaje en una solicitud.')
      .input('tipo', sql.VarChar(50), 'mensaje')
      .query(`
        INSERT INTO notificaciones (
          usuario_id,
          titulo,
          mensaje,
          tipo,
          leida,
          createdat
        )
        VALUES (
          @usuario_id,
          @titulo,
          @mensaje,
          @tipo,
          0,
          GETDATE()
        )
      `);

    const io = req.app.get('io');

    if (io) {
      io.to(`solicitud_${solicitudId}`).emit('mensaje_recibido', nuevoMensaje);

      io.to(`usuario_${receptorId}`).emit('notificacion', {
        tipo: 'mensaje',
        titulo: 'Nuevo mensaje',
        mensaje: 'Tienes un nuevo mensaje en una solicitud.',
        solicitud_id: Number(solicitudId),
        createdat: new Date()
      });
    }

    res.json({
      ok: true,
      mensaje: 'Mensaje enviado.',
      data: nuevoMensaje
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al enviar mensaje.',
      error: error.message
    });
  }
};

exports.marcarLeido = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    const usuarioId = req.user.id;

    const pool = await poolPromise;

    const solicitud = await validarAccesoChat(pool, solicitudId, usuarioId);

    if (!solicitud) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tienes acceso a este chat.'
      });
    }

    await pool.request()
      .input('solicitud_id', sql.Int, Number(solicitudId))
      .input('usuario_id', sql.Int, Number(usuarioId))
      .query(`
        UPDATE mensajes
        SET leido = 1
        WHERE solicitud_id = @solicitud_id
          AND receptor_id = @usuario_id
      `);

    res.json({
      ok: true,
      mensaje: 'Mensajes marcados como leídos.'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al marcar mensajes como leídos.',
      error: error.message
    });
  }
};