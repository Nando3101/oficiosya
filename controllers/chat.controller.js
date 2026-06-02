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
    let { receptor_id, mensaje } = req.body;

    if (!mensaje) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El mensaje es obligatorio.'
      });
    }

    if (!receptor_id) {
      const solicitud = await pgPool.query(
        `
        SELECT cliente_id, trabajador_id
        FROM solicitudes
        WHERE id = $1
        LIMIT 1
        `,
        [solicitudId]
      );

      if (solicitud.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          mensaje: 'Solicitud no encontrada.'
        });
      }

      const row = solicitud.rows[0];

      if (Number(row.cliente_id) === Number(emisorId)) {
        receptor_id = row.trabajador_id;
      } else {
        receptor_id = row.cliente_id;
      }
    }

    if (!receptor_id) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Todavía no hay otro participante asignado para este chat.'
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

exports.marcarLeido = async (req, res) => {
  try {
    const solicitudId = Number(req.params.solicitudId);
    const usuarioId = req.user.id;

    await pgPool.query(
      `
      UPDATE mensajes
      SET leido = 1
      WHERE solicitud_id = $1
      AND receptor_id = $2
      `,
      [solicitudId, usuarioId]
    );

    return res.json({
      ok: true,
      mensaje: 'Mensajes marcados como leídos.'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error marcando mensajes.',
      error: error.message
    });
  }
};