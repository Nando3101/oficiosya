const { sql, poolPromise } = require('../config/db');

exports.resumen = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios) AS total_usuarios,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'cliente' OR es_cliente = 1) AS total_clientes,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'trabajador' OR es_trabajador = 1) AS total_trabajadores,
        (SELECT COUNT(*) FROM solicitudes) AS total_solicitudes,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'abierta') AS solicitudes_abiertas,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'confirmada') AS solicitudes_confirmadas,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'en_curso') AS solicitudes_en_curso,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'finalizada') AS solicitudes_finalizadas,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'cancelada') AS solicitudes_canceladas,
        (SELECT COUNT(*) FROM postulaciones) AS total_postulaciones,
        (SELECT COUNT(*) FROM calificaciones) AS total_calificaciones,
        (SELECT COUNT(*) FROM verificaciones WHERE estado = 'pendiente') AS verificaciones_pendientes
    `);

    res.json({
      ok: true,
      resumen: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar resumen administrativo.',
      error: error.message
    });
  }
};

exports.listarUsuarios = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        id,
        nombres,
        apellidos,
        email,
        telefono,
        zona,
        rol,
        estado,
        is_admin,
        es_cliente,
        es_trabajador,
        email_verificado,
        verificado,
        createdat,
        updatedat
      FROM usuarios
      ORDER BY createdat DESC
    `);

    res.json({
      ok: true,
      usuarios: result.recordset
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar usuarios.',
      error: error.message
    });
  }
};

exports.listarSolicitudes = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        s.id,
        s.titulo,
        s.descripcion,
        s.estado,
        s.presupuesto,
        s.urgencia,
        s.zona,
        s.ciudad,
        s.createdat,
        s.updatedat,
        c.nombre AS categoria,
        CONCAT(cli.nombres, ' ', cli.apellidos) AS cliente,
        cli.email AS correo_cliente,
        CONCAT(t.nombres, ' ', t.apellidos) AS trabajador,
        t.email AS correo_trabajador
      FROM solicitudes s
      LEFT JOIN categorias c ON c.id = s.categoria_id
      LEFT JOIN usuarios cli ON cli.id = s.cliente_id
      LEFT JOIN usuarios t ON t.id = s.trabajador_id
      ORDER BY s.createdat DESC
    `);

    res.json({
      ok: true,
      solicitudes: result.recordset
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar solicitudes.',
      error: error.message
    });
  }
};

exports.listarPostulaciones = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        p.id,
        p.solicitud_id,
        s.titulo AS solicitud,
        p.trabajador_id,
        CONCAT(u.nombres, ' ', u.apellidos) AS trabajador,
        u.email AS correo_trabajador,
        p.mensaje,
        p.precio_ofertado,
        p.disponibilidad,
        p.estado,
        p.createdat,
        p.updatedat
      FROM postulaciones p
      INNER JOIN solicitudes s ON s.id = p.solicitud_id
      INNER JOIN usuarios u ON u.id = p.trabajador_id
      ORDER BY p.createdat DESC
    `);

    res.json({
      ok: true,
      postulaciones: result.recordset
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar postulaciones.',
      error: error.message
    });
  }
};

exports.listarCalificaciones = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        c.id,
        c.solicitud_id,
        s.titulo AS solicitud,
        c.puntuacion,
        c.comentario,
        CONCAT(calificador.nombres, ' ', calificador.apellidos) AS calificador,
        CONCAT(calificado.nombres, ' ', calificado.apellidos) AS calificado,
        c.createdat
      FROM calificaciones c
      LEFT JOIN solicitudes s ON s.id = c.solicitud_id
      LEFT JOIN usuarios calificador ON calificador.id = c.calificador_id
      LEFT JOIN usuarios calificado ON calificado.id = c.calificado_id
      ORDER BY c.createdat DESC
    `);

    res.json({
      ok: true,
      calificaciones: result.recordset
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar calificaciones.',
      error: error.message
    });
  }
};

exports.listarVerificaciones = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        v.id,
        v.usuario_id,
        CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
        u.email,
        v.documento_url,
        v.estado,
        v.observacion,
        v.createdat,
        v.updatedat
      FROM verificaciones v
      INNER JOIN usuarios u ON u.id = v.usuario_id
      ORDER BY v.createdat DESC
    `);

    res.json({
      ok: true,
      verificaciones: result.recordset
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar verificaciones.',
      error: error.message
    });
  }
};

exports.cambiarEstadoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .input('estado', sql.Bit, estado ? 1 : 0)
      .query(`
        UPDATE usuarios
        SET estado = @estado,
            updatedat = GETDATE()
        OUTPUT INSERTED.id, INSERTED.nombres, INSERTED.apellidos, INSERTED.email, INSERTED.estado
        WHERE id = @id
      `);

    res.json({
      ok: true,
      mensaje: 'Estado de usuario actualizado.',
      usuario: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar usuario.',
      error: error.message
    });
  }
};

exports.gestionarVerificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observacion } = req.body;

    if (!['pendiente', 'aprobada', 'rechazada'].includes(estado)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Estado de verificación no válido.'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .input('estado', sql.VarChar(30), estado)
      .input('observacion', sql.VarChar(sql.MAX), observacion || null)
      .query(`
        UPDATE verificaciones
        SET estado = @estado,
            observacion = @observacion,
            updatedat = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (estado === 'aprobada' && result.recordset[0]) {
      await pool.request()
        .input('usuario_id', sql.Int, result.recordset[0].usuario_id)
        .query(`
          UPDATE usuarios
          SET verificado = 1,
              updatedat = GETDATE()
          WHERE id = @usuario_id
        `);
    }

    res.json({
      ok: true,
      mensaje: 'Verificación actualizada correctamente.',
      verificacion: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al gestionar verificación.',
      error: error.message
    });
  }
};