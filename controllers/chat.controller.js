const { pgPool } = require('../config/db');

exports.obtenerMensajes = async (req, res) => {
  try {
    const solicitudId = Number(req.params.solicitudId);

    const result = await pgPool.query(
      `
      SELECT
        m.*,
        e.nombres AS emisor_nombres,
        e.apellidos AS emisor_apellidos,
        r.nombres AS receptor_nombres,
        r.apellidos AS receptor_apellidos
      FROM mensajes m
      INNER JOIN usuarios e ON e.id = m.emisor_id
      INNER JOIN usuarios r ON r.id = m.receptor_id
      WHERE m.solicitud_id = $1
      ORDER BY m.createdat ASC
      `,
      [solicitudId]
    );

    return res.json({
      ok: true,
      mensajes: result.rows,
      data: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error obteniendo mensajes.',
      error: error.message
    });
  }
};

exports.enviarMensaje = async (req, res) => {
  try {
    const solicitudId = Number(req.params.solicitudId);
    const emisorId = req.user.id;
    const { receptor_id, mensaje } = req.body;

    if (!receptor_id || !mensaje) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Receptor y mensaje son obligatorios.'
      });
    }

    const result = await pgPool.query(
      `
      INSERT INTO mensajes (
        solicitud_id,
        emisor_id,
        receptor_id,
        mensaje,
        leido,
        createdat
      )
      VALUES ($1, $2, $3, $4, 0, NOW())
      RETURNING *
      `,
      [solicitudId, emisorId, receptor_id, mensaje]
    );

    await pgPool.query(
      `
      INSERT INTO notificaciones (
        usuario_id,
        titulo,
        mensaje,
        tipo,
        leida,
        createdat
      )
      VALUES ($1, 'Nuevo mensaje', 'Tienes un nuevo mensaje.', 'mensaje', 0, NOW())
      `,
      [receptor_id]
    );

    const io = req.app.get('io');

    if (io) {
      io.to(`solicitud_${solicitudId}`).emit('mensaje_recibido', result.rows[0]);
      io.to(`usuario_${receptor_id}`).emit('notificacion', {
        tipo: 'mensaje',
        titulo: 'Nuevo mensaje',
        mensaje: 'Tienes un nuevo mensaje.',
        createdat: new Date()
      });
    }

    return res.status(201).json({
      ok: true,
      mensaje: 'Mensaje enviado correctamente.',
      chat: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error enviando mensaje:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error enviando mensaje.',
      error: error.message
    });
  }
};