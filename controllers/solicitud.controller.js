const { sql, poolPromise } = require('../config/db');

function obtenerUsuarioId(req) {
  return req.user?.id || req.body?.cliente_id || req.body?.usuario_id || req.query?.usuario_id || null;
}

function normalizarEstado(estado) {
  if (estado === 'finalizado') return 'finalizada';
  return estado || 'abierta';
}

exports.obtenerCategorias = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        id,
        nombre,
        descripcion
      FROM categorias
      WHERE estado = 1
      ORDER BY nombre
    `);

    res.json({
      ok: true,
      categorias: result.recordset
    });

  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar categorías.',
      error: error.message,
      categorias: []
    });
  }
};

exports.crearSolicitud = async (req, res) => {
  try {
    const {
      cliente_id,
      usuario_id,
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

    const clienteId = cliente_id || usuario_id || obtenerUsuarioId(req);

    if (!clienteId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se pudo identificar al cliente.'
      });
    }

    if (!titulo || !descripcion) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Ingrese el título y la descripción de la solicitud.'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('cliente_id', sql.Int, Number(clienteId))
      .input('categoria_id', sql.Int, categoria_id ? Number(categoria_id) : null)
      .input('titulo', sql.VarChar(150), titulo)
      .input('descripcion', sql.VarChar(sql.MAX), descripcion)
      .input('direccion', sql.VarChar(255), direccion || null)
      .input('ciudad', sql.VarChar(100), ciudad || zona || null)
      .input('zona', sql.VarChar(150), zona || ciudad || null)
      .input('presupuesto', sql.Decimal(10, 2), presupuesto ? Number(presupuesto) : null)
      .input('fecha_servicio', sql.DateTime, fecha_servicio || fecha_preferida || null)
      .input('fecha_preferida', sql.Date, fecha_preferida || null)
      .input('urgencia', sql.VarChar(30), urgencia || 'normal')
      .query(`
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
          createdat
        )
        OUTPUT INSERTED.*
        VALUES (
          @cliente_id,
          @categoria_id,
          @titulo,
          @descripcion,
          @direccion,
          @ciudad,
          @zona,
          @presupuesto,
          @fecha_servicio,
          @fecha_preferida,
          @urgencia,
          'abierta',
          GETDATE()
        )
      `);

    res.status(201).json({
      ok: true,
      mensaje: 'Solicitud creada correctamente.',
      solicitud: result.recordset[0]
    });

  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al crear la solicitud.',
      error: error.message
    });
  }
};

exports.listarAbiertas = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        s.id,
        s.cliente_id,
        s.trabajador_id,
        s.categoria_id,
        s.titulo,
        s.descripcion,
        s.direccion,
        s.ciudad,
        s.zona,
        s.presupuesto,
        s.fecha_servicio,
        s.fecha_preferida,
        s.urgencia,
        s.estado,
        s.createdat,
        s.updatedat,
        c.nombre AS categoria,
        c.nombre AS categoria_nombre,
        u.nombres AS cliente_nombre,
        u.apellidos AS cliente_apellido,
        u.nombres AS nombre,
        u.apellidos AS apellido
      FROM solicitudes s
      LEFT JOIN categorias c ON c.id = s.categoria_id
      LEFT JOIN usuarios u ON u.id = s.cliente_id
      WHERE s.estado = 'abierta'
      ORDER BY s.createdat DESC
    `);

    res.json({
      ok: true,
      solicitudes: result.recordset
    });

  } catch (error) {
    console.error('Error al listar solicitudes abiertas:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar solicitudes.',
      error: error.message,
      solicitudes: []
    });
  }
};

exports.misSolicitudes = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);

    if (!usuarioId) {
      return res.json({
        ok: true,
        solicitudes: []
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('usuario_id', sql.Int, Number(usuarioId))
      .query(`
        SELECT 
          s.id,
          s.cliente_id,
          s.trabajador_id,
          s.categoria_id,
          s.titulo,
          s.descripcion,
          s.direccion,
          s.ciudad,
          s.zona,
          s.presupuesto,
          s.fecha_servicio,
          s.fecha_preferida,
          s.urgencia,
          s.estado,
          s.createdat,
          s.updatedat,
          c.nombre AS categoria,
          c.nombre AS categoria_nombre
        FROM solicitudes s
        LEFT JOIN categorias c ON c.id = s.categoria_id
        WHERE s.cliente_id = @usuario_id
           OR s.trabajador_id = @usuario_id
        ORDER BY s.createdat DESC
      `);

    res.json({
      ok: true,
      solicitudes: result.recordset
    });

  } catch (error) {
    console.error('Error al cargar mis solicitudes:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar solicitudes.',
      error: error.message,
      solicitudes: []
    });
  }
};

exports.detalleSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .query(`
        SELECT 
          s.*,
          c.nombre AS categoria,
          c.nombre AS categoria_nombre,
          u.nombres AS cliente_nombre,
          u.apellidos AS cliente_apellido,
          u.nombres AS nombre,
          u.apellidos AS apellido,
          t.nombres AS trabajador_nombre,
          t.apellidos AS trabajador_apellido
        FROM solicitudes s
        LEFT JOIN categorias c ON c.id = s.categoria_id
        LEFT JOIN usuarios u ON u.id = s.cliente_id
        LEFT JOIN usuarios t ON t.id = s.trabajador_id
        WHERE s.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Solicitud no encontrada.'
      });
    }

    res.json({
      ok: true,
      solicitud: result.recordset[0]
    });

  } catch (error) {
    console.error('Error al obtener detalle:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener solicitud.',
      error: error.message
    });
  }
};

exports.editarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;

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

    if (!id) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID de solicitud requerido.'
      });
    }

    if (!titulo || !descripcion) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El título y la descripción son obligatorios.'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .input('categoria_id', sql.Int, categoria_id ? Number(categoria_id) : null)
      .input('titulo', sql.VarChar(150), titulo)
      .input('descripcion', sql.VarChar(sql.MAX), descripcion)
      .input('direccion', sql.VarChar(255), direccion || null)
      .input('ciudad', sql.VarChar(100), ciudad || zona || null)
      .input('zona', sql.VarChar(150), zona || ciudad || null)
      .input('presupuesto', sql.Decimal(10, 2), presupuesto ? Number(presupuesto) : null)
      .input('fecha_servicio', sql.DateTime, fecha_servicio || fecha_preferida || null)
      .input('fecha_preferida', sql.Date, fecha_preferida || null)
      .input('urgencia', sql.VarChar(30), urgencia || 'normal')
      .query(`
        UPDATE solicitudes
        SET categoria_id = @categoria_id,
            titulo = @titulo,
            descripcion = @descripcion,
            direccion = @direccion,
            ciudad = @ciudad,
            zona = @zona,
            presupuesto = @presupuesto,
            fecha_servicio = @fecha_servicio,
            fecha_preferida = @fecha_preferida,
            urgencia = @urgencia,
            updatedat = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Solicitud no encontrada.'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Solicitud actualizada correctamente.',
      solicitud: result.recordset[0]
    });

  } catch (error) {
    console.error('Error al editar solicitud:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al editar solicitud.',
      error: error.message
    });
  }
};

exports.eliminarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    await pool.request()
      .input('id', sql.Int, Number(id))
      .query(`
        DELETE FROM postulaciones WHERE solicitud_id = @id;
        DELETE FROM calificaciones WHERE solicitud_id = @id;
        DELETE FROM reportes WHERE solicitud_id = @id;
        DELETE FROM imagenes WHERE solicitud_id = @id;
        DELETE FROM servicios WHERE solicitud_id = @id;
        DELETE FROM solicitudes WHERE id = @id;
      `);

    res.json({
      ok: true,
      mensaje: 'Solicitud eliminada correctamente.'
    });

  } catch (error) {
    console.error('Error al eliminar solicitud:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al eliminar solicitud.',
      error: error.message
    });
  }
};

exports.cancelarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .query(`
        UPDATE solicitudes
        SET estado = 'cancelada',
            updatedat = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Solicitud no encontrada.'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Solicitud cancelada correctamente.',
      solicitud: result.recordset[0]
    });

  } catch (error) {
    console.error('Error al cancelar solicitud:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cancelar solicitud.',
      error: error.message
    });
  }
};

exports.aplicarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;

    const trabajadorId =
      req.user?.id ||
      req.body.trabajador_id ||
      req.body.usuario_id;

    const {
      mensaje,
      precio_ofertado,
      precio_oferta,
      disponibilidad
    } = req.body;

    if (!trabajadorId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se pudo identificar al trabajador.'
      });
    }

    const pool = await poolPromise;

    const solicitud = await pool.request()
      .input('id', sql.Int, Number(id))
      .query(`
        SELECT TOP 1 *
        FROM solicitudes
        WHERE id = @id
      `);

    if (solicitud.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Solicitud no encontrada.'
      });
    }

    if (solicitud.recordset[0].estado !== 'abierta') {
      return res.status(400).json({
        ok: false,
        mensaje: 'Solo puedes postular a solicitudes abiertas.'
      });
    }

    if (Number(solicitud.recordset[0].cliente_id) === Number(trabajadorId)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No puedes postular a tu propia solicitud.'
      });
    }

    const existe = await pool.request()
      .input('solicitud_id', sql.Int, Number(id))
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .query(`
        SELECT TOP 1 *
        FROM postulaciones
        WHERE solicitud_id = @solicitud_id
          AND trabajador_id = @trabajador_id
      `);

    const precioFinal =
      precio_ofertado || precio_oferta
        ? Number(precio_ofertado || precio_oferta)
        : null;

    if (existe.recordset.length > 0) {
      const post = existe.recordset[0];

      if (post.estado === 'aceptado') {
        return res.status(400).json({
          ok: false,
          mensaje: 'Tu postulación ya fue aceptada. No se puede editar desde aquí.'
        });
      }

      if (post.estado === 'rechazado') {
        return res.status(400).json({
          ok: false,
          mensaje: 'Tu postulación fue rechazada. No se puede editar.'
        });
      }

      const actualizada = await pool.request()
        .input('id', sql.Int, post.id)
        .input('mensaje', sql.VarChar(sql.MAX), mensaje || null)
        .input('precio_ofertado', sql.Decimal(10, 2), precioFinal)
        .input('disponibilidad', sql.VarChar(150), disponibilidad || null)
        .query(`
          UPDATE postulaciones
          SET mensaje = @mensaje,
              precio_ofertado = @precio_ofertado,
              disponibilidad = @disponibilidad,
              estado = 'pendiente',
              updatedat = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);

      return res.json({
        ok: true,
        mensaje: 'Postulación actualizada correctamente.',
        postulacion: actualizada.recordset[0]
      });
    }

    const result = await pool.request()
      .input('solicitud_id', sql.Int, Number(id))
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .input('mensaje', sql.VarChar(sql.MAX), mensaje || null)
      .input('precio_ofertado', sql.Decimal(10, 2), precioFinal)
      .input('disponibilidad', sql.VarChar(150), disponibilidad || null)
      .query(`
        INSERT INTO postulaciones (
          solicitud_id,
          trabajador_id,
          mensaje,
          precio_ofertado,
          disponibilidad,
          estado,
          createdat
        )
        OUTPUT INSERTED.*
        VALUES (
          @solicitud_id,
          @trabajador_id,
          @mensaje,
          @precio_ofertado,
          @disponibilidad,
          'pendiente',
          GETDATE()
        )
      `);

    res.status(201).json({
      ok: true,
      mensaje: 'Postulación enviada correctamente.',
      postulacion: result.recordset[0]
    });

  } catch (error) {
    console.error('Error al aplicar:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al aplicar a la solicitud.',
      error: error.message
    });
  }
};

exports.miPostulacion = async (req, res) => {
  try {
    const { id } = req.params;
    const trabajadorId = req.user?.id || req.query.usuario_id;

    if (!trabajadorId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se pudo identificar al trabajador.'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('solicitud_id', sql.Int, Number(id))
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .query(`
        SELECT TOP 1
          id,
          solicitud_id,
          trabajador_id,
          mensaje,
          precio_ofertado,
          disponibilidad,
          estado,
          createdat,
          updatedat
        FROM postulaciones
        WHERE solicitud_id = @solicitud_id
          AND trabajador_id = @trabajador_id
        ORDER BY createdat DESC
      `);

    res.json({
      ok: true,
      postulacion: result.recordset[0] || null
    });

  } catch (error) {
    console.error('Error al obtener mi postulación:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener mi postulación.',
      error: error.message
    });
  }
};

exports.editarMiPostulacion = async (req, res) => {
  try {
    const { id } = req.params;
    const trabajadorId = req.user?.id || req.body.trabajador_id || req.body.usuario_id;

    const {
      mensaje,
      precio_ofertado,
      precio_oferta,
      disponibilidad
    } = req.body;

    if (!trabajadorId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se pudo identificar al trabajador.'
      });
    }

    const precioFinal =
      precio_ofertado || precio_oferta
        ? Number(precio_ofertado || precio_oferta)
        : null;

    const pool = await poolPromise;

    const existe = await pool.request()
      .input('solicitud_id', sql.Int, Number(id))
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .query(`
        SELECT TOP 1 *
        FROM postulaciones
        WHERE solicitud_id = @solicitud_id
          AND trabajador_id = @trabajador_id
      `);

    if (existe.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'No tienes una postulación para esta solicitud.'
      });
    }

    const post = existe.recordset[0];

    if (post.estado === 'aceptado') {
      return res.status(400).json({
        ok: false,
        mensaje: 'La postulación ya fue aceptada. No se puede editar.'
      });
    }

    if (post.estado === 'rechazado') {
      return res.status(400).json({
        ok: false,
        mensaje: 'La postulación fue rechazada. No se puede editar.'
      });
    }

    const result = await pool.request()
      .input('solicitud_id', sql.Int, Number(id))
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .input('mensaje', sql.VarChar(sql.MAX), mensaje || null)
      .input('precio_ofertado', sql.Decimal(10, 2), precioFinal)
      .input('disponibilidad', sql.VarChar(150), disponibilidad || null)
      .query(`
        UPDATE postulaciones
        SET mensaje = @mensaje,
            precio_ofertado = @precio_ofertado,
            disponibilidad = @disponibilidad,
            estado = 'pendiente',
            updatedat = GETDATE()
        OUTPUT INSERTED.*
        WHERE solicitud_id = @solicitud_id
          AND trabajador_id = @trabajador_id
      `);

    res.json({
      ok: true,
      mensaje: 'Postulación editada correctamente.',
      postulacion: result.recordset[0]
    });

  } catch (error) {
    console.error('Error al editar mi postulación:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al editar mi postulación.',
      error: error.message
    });
  }
};

exports.cancelarPostulacion = async (req, res) => {
  try {
    const { id } = req.params;
    const trabajadorId = req.user?.id || req.body.trabajador_id || req.body.usuario_id;

    if (!trabajadorId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se pudo identificar al trabajador.'
      });
    }

    const pool = await poolPromise;

    await pool.request()
      .input('solicitud_id', sql.Int, Number(id))
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .query(`
        UPDATE postulaciones
        SET estado = 'cancelado',
            updatedat = GETDATE()
        WHERE solicitud_id = @solicitud_id
          AND trabajador_id = @trabajador_id
      `);

    res.json({
      ok: true,
      mensaje: 'Postulación cancelada correctamente.'
    });

  } catch (error) {
    console.error('Error al cancelar postulación:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cancelar postulación.',
      error: error.message
    });
  }
};

exports.verPostulaciones = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('solicitud_id', sql.Int, Number(id))
      .query(`
        SELECT 
          p.*,
          p.precio_ofertado AS precio_oferta,
          u.nombres,
          u.apellidos,
          u.nombres AS nombre,
          u.apellidos AS apellido,
          u.email,
          u.telefono
        FROM postulaciones p
        INNER JOIN usuarios u ON u.id = p.trabajador_id
        WHERE p.solicitud_id = @solicitud_id
        ORDER BY p.createdat DESC
      `);

    res.json({
      ok: true,
      postulaciones: result.recordset
    });

  } catch (error) {
    console.error('Error al ver postulaciones:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar postulaciones.',
      error: error.message
    });
  }
};

exports.gestionarPostulacion = async (req, res) => {
  try {
    const { postulacionId } = req.params;
    const { estado } = req.body;

    if (!['aceptado', 'rechazado'].includes(estado)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Estado no válido.'
      });
    }

    const pool = await poolPromise;

    const postulacion = await pool.request()
      .input('id', sql.Int, Number(postulacionId))
      .query(`
        SELECT *
        FROM postulaciones
        WHERE id = @id
      `);

    if (postulacion.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Postulación no encontrada.'
      });
    }

    const p = postulacion.recordset[0];

    await pool.request()
      .input('id', sql.Int, Number(postulacionId))
      .input('estado', sql.VarChar(30), estado)
      .query(`
        UPDATE postulaciones
        SET estado = @estado,
            updatedat = GETDATE()
        WHERE id = @id
      `);

    if (estado === 'aceptado') {
      await pool.request()
        .input('solicitud_id', sql.Int, p.solicitud_id)
        .input('trabajador_id', sql.Int, p.trabajador_id)
        .query(`
          UPDATE solicitudes
          SET trabajador_id = @trabajador_id,
              estado = 'confirmada',
              updatedat = GETDATE()
          WHERE id = @solicitud_id
        `);

      await pool.request()
        .input('solicitud_id', sql.Int, p.solicitud_id)
        .input('trabajador_id', sql.Int, p.trabajador_id)
        .query(`
          UPDATE postulaciones
          SET estado = 'rechazado',
              updatedat = GETDATE()
          WHERE solicitud_id = @solicitud_id
            AND trabajador_id <> @trabajador_id
            AND estado = 'pendiente'
        `);
    }

    res.json({
      ok: true,
      mensaje: `Postulación ${estado} correctamente.`
    });

  } catch (error) {
    console.error('Error al gestionar postulación:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al gestionar postulación.',
      error: error.message
    });
  }
};

exports.estadisticas = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const pool = await poolPromise;

    let result;

    if (usuarioId) {
      result = await pool.request()
        .input('usuario_id', sql.Int, Number(usuarioId))
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

    res.json({
      ok: true,
      stats: result.recordset[0]
    });

  } catch (error) {
    console.error('Error en estadísticas:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar estadísticas.',
      error: error.message
    });
  }
};

exports.iniciarTrabajo = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .query(`
        UPDATE solicitudes
        SET estado = 'en_curso',
            updatedat = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Solicitud no encontrada.'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Trabajo iniciado correctamente.',
      solicitud: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al iniciar trabajo.',
      error: error.message
    });
  }
};

exports.finalizarTrabajo = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .query(`
        UPDATE solicitudes
        SET estado = 'finalizada',
            updatedat = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Solicitud no encontrada.'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Trabajo finalizado correctamente.',
      solicitud: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al finalizar trabajo.',
      error: error.message
    });
  }
};

exports.actualizarUbicacionTrabajador = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitud, longitud, estado_recorrido } = req.body;
    const trabajadorId = req.user.id;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID de solicitud no válido.'
      });
    }

    if (latitud === undefined || longitud === undefined) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Latitud y longitud son obligatorias.'
      });
    }

    const lat = Number(latitud);
    const lng = Number(longitud);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Latitud o longitud no válidas.'
      });
    }

    const pool = await poolPromise;

    const verificar = await pool.request()
      .input('id', sql.Int, Number(id))
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .query(`
        SELECT 
          id,
          cliente_id,
          trabajador_id,
          estado
        FROM solicitudes
        WHERE id = @id
          AND trabajador_id = @trabajador_id
      `);

    if (verificar.recordset.length === 0) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No puedes actualizar la ubicación de esta solicitud.'
      });
    }

    const estadoRecorridoFinal = estado_recorrido || 'trabajador_en_camino';

    await pool.request()
      .input('id', sql.Int, Number(id))
      .input('latitud', sql.Decimal(10, 7), lat)
      .input('longitud', sql.Decimal(10, 7), lng)
      .input('estado_recorrido', sql.VarChar(40), estadoRecorridoFinal)
      .query(`
        UPDATE solicitudes
        SET latitud_trabajador = @latitud,
            longitud_trabajador = @longitud,
            estado_recorrido = @estado_recorrido,
            updatedat = GETDATE()
        WHERE id = @id
      `);

    await pool.request()
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .input('latitud', sql.Decimal(10, 7), lat)
      .input('longitud', sql.Decimal(10, 7), lng)
      .query(`
        UPDATE usuarios
        SET ultima_latitud = @latitud,
            ultima_longitud = @longitud,
            estado_conexion = 'en_camino',
            ultima_conexion = GETDATE(),
            updatedat = GETDATE()
        WHERE id = @trabajador_id
      `);

    const io = req.app.get('io');

    if (io) {
      io.to(`solicitud_${id}`).emit('ubicacion_trabajador_actualizada', {
        solicitud_id: Number(id),
        trabajador_id: Number(trabajadorId),
        latitud: lat,
        longitud: lng,
        estado_recorrido: estadoRecorridoFinal,
        fecha: new Date()
      });
    }

    res.json({
      ok: true,
      mensaje: 'Ubicación actualizada correctamente.',
      ubicacion: {
        solicitud_id: Number(id),
        trabajador_id: Number(trabajadorId),
        latitud: lat,
        longitud: lng,
        estado_recorrido: estadoRecorridoFinal
      }
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar ubicación.',
      error: error.message
    });
  }
};

exports.actualizarEstadoRecorrido = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_recorrido } = req.body;
    const trabajadorId = req.user.id;

    const estadosValidos = [
      'pendiente',
      'trabajador_en_camino',
      'trabajador_llego',
      'en_curso',
      'finalizada',
      'cancelada'
    ];

    if (!estadosValidos.includes(estado_recorrido)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Estado de recorrido no válido.'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .input('estado_recorrido', sql.VarChar(40), estado_recorrido)
      .query(`
        UPDATE solicitudes
        SET estado_recorrido = @estado_recorrido,
            updatedat = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
          AND trabajador_id = @trabajador_id
      `);

    if (result.recordset.length === 0) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No puedes actualizar el recorrido de esta solicitud.'
      });
    }

    let estadoConexion = 'activo';

    if (estado_recorrido === 'trabajador_en_camino') {
      estadoConexion = 'en_camino';
    }

    if (estado_recorrido === 'en_curso') {
      estadoConexion = 'trabajando';
    }

    if (estado_recorrido === 'finalizada' || estado_recorrido === 'cancelada') {
      estadoConexion = 'activo';
    }

    await pool.request()
      .input('trabajador_id', sql.Int, Number(trabajadorId))
      .input('estado_conexion', sql.VarChar(30), estadoConexion)
      .query(`
        UPDATE usuarios
        SET estado_conexion = @estado_conexion,
            ultima_conexion = GETDATE(),
            updatedat = GETDATE()
        WHERE id = @trabajador_id
      `);

    const io = req.app.get('io');

    if (io) {
      io.to(`solicitud_${id}`).emit('estado_recorrido_actualizado', {
        solicitud_id: Number(id),
        estado_recorrido
      });

      io.emit('trabajador_estado_actualizado', {
        trabajador_id: Number(trabajadorId),
        estado_conexion: estadoConexion
      });
    }

    res.json({
      ok: true,
      mensaje: 'Estado de recorrido actualizado.',
      solicitud: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar estado del recorrido.',
      error: error.message
    });
  }
};