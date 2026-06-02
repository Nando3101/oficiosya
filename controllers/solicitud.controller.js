const { pgPool } = require('../config/db');

exports.obtenerCategorias = async (req, res) => {
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
    console.error('Error al obtener categorías:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener categorías.',
      error: error.message
    });
  }
};

exports.crearSolicitud = async (req, res) => {
  try {
    const clienteId = req.user.id;

    const {
      categoria_id,
      titulo,
      descripcion,
      direccion,
      ciudad,
      zona,
      presupuesto,
      fecha_servicio,
      fecha_preferida,
      urgencia,
      latitud_cliente,
      longitud_cliente
    } = req.body;

    if (!titulo || !descripcion) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Título y descripción son obligatorios.'
      });
    }

    const result = await pgPool.query(
      `
      INSERT INTO solicitudes (
        cliente_id,
        categoria_id,
        titulo,
        descripcion,
        direccion,
        ciudad,
        zona,
        presupuesto,
        fecha_servicio,
        fecha_preferida,
        urgencia,
        estado,
        latitud_cliente,
        longitud_cliente,
        createdat,
        updatedat
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, 'abierta', $12, $13, NOW(), NOW()
      )
      RETURNING *
      `,
      [
        clienteId,
        categoria_id || null,
        titulo,
        descripcion,
        direccion || null,
        ciudad || null,
        zona || null,
        presupuesto || null,
        fecha_servicio || null,
        fecha_preferida || null,
        urgencia || null,
        latitud_cliente || null,
        longitud_cliente || null
      ]
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Solicitud creada correctamente.',
      solicitud: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear solicitud:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al crear solicitud.',
      error: error.message
    });
  }
};

exports.listarAbiertas = async (req, res) => {
  try {
    const result = await pgPool.query(`
      SELECT
        s.*,
        c.nombre AS categoria,
        u.nombres AS cliente_nombres,
        u.apellidos AS cliente_apellidos,
        CONCAT(u.nombres, ' ', u.apellidos) AS cliente_nombre_completo
      FROM solicitudes s
      LEFT JOIN categorias c ON c.id = s.categoria_id
      LEFT JOIN usuarios u ON u.id = s.cliente_id
      WHERE s.estado = 'abierta'
      ORDER BY s.createdat DESC
    `);

    return res.json({
      ok: true,
      solicitudes: result.rows,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al listar solicitudes:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al listar solicitudes.',
      error: error.message
    });
  }
};

exports.misSolicitudes = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const result = await pgPool.query(
      `
      SELECT
        s.*,
        c.nombre AS categoria,
        t.nombres AS trabajador_nombres,
        t.apellidos AS trabajador_apellidos
      FROM solicitudes s
      LEFT JOIN categorias c ON c.id = s.categoria_id
      LEFT JOIN usuarios t ON t.id = s.trabajador_id
      WHERE s.cliente_id = $1
         OR s.trabajador_id = $1
      ORDER BY s.createdat DESC
      `,
      [usuarioId]
    );

    return res.json({
      ok: true,
      solicitudes: result.rows,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener mis solicitudes:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener mis solicitudes.',
      error: error.message
    });
  }
};

exports.detalleSolicitud = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await pgPool.query(
      `
      SELECT
        s.*,
        c.nombre AS categoria,
        u.nombres AS cliente_nombres,
        u.apellidos AS cliente_apellidos,
        CONCAT(u.nombres, ' ', u.apellidos) AS cliente_nombre_completo,
        t.nombres AS trabajador_nombres,
        t.apellidos AS trabajador_apellidos,
        CONCAT(t.nombres, ' ', t.apellidos) AS trabajador_nombre_completo
      FROM solicitudes s
      LEFT JOIN categorias c ON c.id = s.categoria_id
      LEFT JOIN usuarios u ON u.id = s.cliente_id
      LEFT JOIN usuarios t ON t.id = s.trabajador_id
      WHERE s.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Solicitud no encontrada.'
      });
    }

    return res.json({
      ok: true,
      solicitud: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener solicitud:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener solicitud.',
      error: error.message
    });
  }
};

exports.aplicarSolicitud = async (req, res) => {
  try {
    const solicitudId = Number(req.params.id);
    const trabajadorId = req.user.id;

    const {
      mensaje,
      precio_ofertado,
      precio_oferta,
      disponibilidad
    } = req.body;

    const solicitud = await pgPool.query(
      `
      SELECT *
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

    if (solicitud.rows[0].cliente_id === trabajadorId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No puedes aplicar a tu propia solicitud.'
      });
    }

    const result = await pgPool.query(
      `
      INSERT INTO postulaciones (
        solicitud_id,
        trabajador_id,
        mensaje,
        precio_ofertado,
        precio_oferta,
        disponibilidad,
        estado,
        createdat,
        updatedat
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', NOW(), NOW())
      ON CONFLICT (solicitud_id, trabajador_id)
      DO UPDATE SET
        mensaje = EXCLUDED.mensaje,
        precio_ofertado = EXCLUDED.precio_ofertado,
        precio_oferta = EXCLUDED.precio_oferta,
        disponibilidad = EXCLUDED.disponibilidad,
        estado = 'pendiente',
        updatedat = NOW()
      RETURNING *
      `,
      [
        solicitudId,
        trabajadorId,
        mensaje || null,
        precio_ofertado || precio_oferta || null,
        precio_oferta || precio_ofertado || null,
        disponibilidad || null
      ]
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
      VALUES ($1, $2, $3, 'postulacion', 0, NOW())
      `,
      [
        solicitud.rows[0].cliente_id,
        'Nueva postulación',
        'Un trabajador aplicó a tu solicitud.'
      ]
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Postulación enviada correctamente.',
      postulacion: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al aplicar solicitud:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al aplicar a la solicitud.',
      error: error.message
    });
  }
};

exports.verPostulaciones = async (req, res) => {
  try {
    const solicitudId = Number(req.params.id);

    const result = await pgPool.query(
      `
      SELECT
        p.*,
        u.nombres,
        u.apellidos,
        CONCAT(u.nombres, ' ', u.apellidos) AS trabajador_nombre_completo,
        u.email,
        u.telefono,
        pt.titulo,
        pt.descripcion,
        pt.experiencia,
        c.nombre AS categoria
      FROM postulaciones p
      INNER JOIN usuarios u ON u.id = p.trabajador_id
      LEFT JOIN perfiles_trabajador pt ON pt.usuario_id = u.id
      LEFT JOIN categorias c ON c.id = pt.categoria_id
      WHERE p.solicitud_id = $1
      ORDER BY p.createdat DESC
      `,
      [solicitudId]
    );

    return res.json({
      ok: true,
      postulaciones: result.rows,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al ver postulaciones:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al ver postulaciones.',
      error: error.message
    });
  }
};

exports.gestionarPostulacion = async (req, res) => {
  try {
    const postulacionId = Number(req.params.postulacionId);
    const { estado } = req.body;

    if (!['aceptada', 'rechazada', 'pendiente'].includes(estado)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Estado no válido.'
      });
    }

    const postulacion = await pgPool.query(
      `
      SELECT p.*, s.cliente_id
      FROM postulaciones p
      INNER JOIN solicitudes s ON s.id = p.solicitud_id
      WHERE p.id = $1
      LIMIT 1
      `,
      [postulacionId]
    );

    if (postulacion.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Postulación no encontrada.'
      });
    }

    const data = postulacion.rows[0];

    const result = await pgPool.query(
      `
      UPDATE postulaciones
      SET estado = $1,
          updatedat = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [estado, postulacionId]
    );

    if (estado === 'aceptada') {
      await pgPool.query(
        `
        UPDATE solicitudes
        SET trabajador_id = $1,
            estado = 'asignada',
            updatedat = NOW()
        WHERE id = $2
        `,
        [data.trabajador_id, data.solicitud_id]
      );

      await pgPool.query(
        `
        UPDATE postulaciones
        SET estado = 'rechazada',
            updatedat = NOW()
        WHERE solicitud_id = $1
          AND id <> $2
        `,
        [data.solicitud_id, postulacionId]
      );
    }

    return res.json({
      ok: true,
      mensaje: 'Postulación actualizada correctamente.',
      postulacion: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error gestionando postulación:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error gestionando postulación.',
      error: error.message
    });
  }
};

exports.editarSolicitud = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user.id;

    const {
      categoria_id,
      titulo,
      descripcion,
      direccion,
      ciudad,
      zona,
      presupuesto,
      fecha_servicio,
      fecha_preferida,
      urgencia
    } = req.body;

    const result = await pgPool.query(
      `
      UPDATE solicitudes
      SET categoria_id = COALESCE($1, categoria_id),
          titulo = COALESCE($2, titulo),
          descripcion = COALESCE($3, descripcion),
          direccion = COALESCE($4, direccion),
          ciudad = COALESCE($5, ciudad),
          zona = COALESCE($6, zona),
          presupuesto = COALESCE($7, presupuesto),
          fecha_servicio = COALESCE($8, fecha_servicio),
          fecha_preferida = COALESCE($9, fecha_preferida),
          urgencia = COALESCE($10, urgencia),
          updatedat = NOW()
      WHERE id = $11
        AND cliente_id = $12
      RETURNING *
      `,
      [
        categoria_id || null,
        titulo || null,
        descripcion || null,
        direccion || null,
        ciudad || null,
        zona || null,
        presupuesto || null,
        fecha_servicio || null,
        fecha_preferida || null,
        urgencia || null,
        id,
        usuarioId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Solicitud no encontrada o sin permiso.'
      });
    }

    return res.json({
      ok: true,
      mensaje: 'Solicitud actualizada correctamente.',
      solicitud: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al editar solicitud:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al editar solicitud.',
      error: error.message
    });
  }
};

exports.cancelarSolicitud = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user.id;

    const result = await pgPool.query(
      `
      UPDATE solicitudes
      SET estado = 'cancelada',
          updatedat = NOW()
      WHERE id = $1
        AND cliente_id = $2
      RETURNING *
      `,
      [id, usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Solicitud no encontrada o sin permiso.'
      });
    }

    return res.json({
      ok: true,
      mensaje: 'Solicitud cancelada correctamente.',
      solicitud: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cancelar solicitud.',
      error: error.message
    });
  }
};

exports.eliminarSolicitud = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usuarioId = req.user.id;

    const result = await pgPool.query(
      `
      DELETE FROM solicitudes
      WHERE id = $1
        AND cliente_id = $2
      RETURNING *
      `,
      [id, usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Solicitud no encontrada o sin permiso.'
      });
    }

    return res.json({
      ok: true,
      mensaje: 'Solicitud eliminada correctamente.'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al eliminar solicitud.',
      error: error.message
    });
  }
};