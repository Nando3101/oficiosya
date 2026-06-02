// FIX: reemplazado completamente de mssql (poolPromise, sql.Int, GETDATE(),
// OUTPUT INSERTED.*, result.recordset) a pgPool nativo de PostgreSQL.
const { pgPool } = require('../config/db');

/* =====================================================
   RESUMEN GENERAL
===================================================== */

exports.resumen = async (req, res) => {
  try {
    const result = await pgPool.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios)                                              AS total_usuarios,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'cliente' OR es_cliente = 1)     AS total_clientes,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'trabajador' OR es_trabajador = 1) AS total_trabajadores,
        (SELECT COUNT(*) FROM solicitudes)                                           AS total_solicitudes,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'abierta')                 AS solicitudes_abiertas,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'confirmada')              AS solicitudes_confirmadas,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'en_curso')                AS solicitudes_en_curso,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'finalizada')              AS solicitudes_finalizadas,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'cancelada')               AS solicitudes_canceladas,
        (SELECT COUNT(*) FROM postulaciones)                                         AS total_postulaciones,
        (SELECT COUNT(*) FROM calificaciones)                                        AS total_calificaciones,
        (SELECT COUNT(*) FROM verificaciones WHERE estado = 'pendiente')            AS verificaciones_pendientes
    `);

    return res.json({
      ok: true,
      resumen: result.rows[0]
    });
  } catch (error) {
    console.error('Error en resumen admin:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar resumen administrativo.',
      error: error.message
    });
  }
};

/* =====================================================
   LISTAR USUARIOS
===================================================== */

exports.listarUsuarios = async (req, res) => {
  try {
    const result = await pgPool.query(`
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

    return res.json({
      ok: true,
      usuarios: result.rows
    });
  } catch (error) {
    console.error('Error listando usuarios:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar usuarios.',
      error: error.message
    });
  }
};

/* =====================================================
   LISTAR SOLICITUDES
===================================================== */

exports.listarSolicitudes = async (req, res) => {
  try {
    const result = await pgPool.query(`
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
        c.nombre                                        AS categoria,
        CONCAT(cli.nombres, ' ', cli.apellidos)        AS cliente,
        cli.email                                       AS correo_cliente,
        CONCAT(t.nombres, ' ', t.apellidos)            AS trabajador,
        t.email                                         AS correo_trabajador
      FROM solicitudes s
      LEFT JOIN categorias c   ON c.id  = s.categoria_id
      LEFT JOIN usuarios cli   ON cli.id = s.cliente_id
      LEFT JOIN usuarios t     ON t.id   = s.trabajador_id
      ORDER BY s.createdat DESC
    `);

    return res.json({
      ok: true,
      solicitudes: result.rows
    });
  } catch (error) {
    console.error('Error listando solicitudes:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar solicitudes.',
      error: error.message
    });
  }
};

/* =====================================================
   LISTAR POSTULACIONES
===================================================== */

exports.listarPostulaciones = async (req, res) => {
  try {
    const result = await pgPool.query(`
      SELECT
        p.id,
        p.solicitud_id,
        s.titulo                                       AS solicitud,
        p.trabajador_id,
        CONCAT(u.nombres, ' ', u.apellidos)           AS trabajador,
        u.email                                        AS correo_trabajador,
        p.mensaje,
        p.precio_ofertado,
        p.disponibilidad,
        p.estado,
        p.createdat,
        p.updatedat
      FROM postulaciones p
      INNER JOIN solicitudes s ON s.id = p.solicitud_id
      INNER JOIN usuarios u    ON u.id = p.trabajador_id
      ORDER BY p.createdat DESC
    `);

    return res.json({
      ok: true,
      postulaciones: result.rows
    });
  } catch (error) {
    console.error('Error listando postulaciones:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar postulaciones.',
      error: error.message
    });
  }
};

/* =====================================================
   LISTAR CALIFICACIONES
===================================================== */

exports.listarCalificaciones = async (req, res) => {
  try {
    const result = await pgPool.query(`
      SELECT
        c.id,
        c.solicitud_id,
        s.titulo                                              AS solicitud,
        c.puntuacion,
        c.comentario,
        CONCAT(calificador.nombres, ' ', calificador.apellidos) AS calificador,
        CONCAT(calificado.nombres,  ' ', calificado.apellidos)  AS calificado,
        c.createdat
      FROM calificaciones c
      LEFT JOIN solicitudes s          ON s.id         = c.solicitud_id
      LEFT JOIN usuarios calificador   ON calificador.id = c.calificador_id
      LEFT JOIN usuarios calificado    ON calificado.id  = c.calificado_id
      ORDER BY c.createdat DESC
    `);

    return res.json({
      ok: true,
      calificaciones: result.rows
    });
  } catch (error) {
    console.error('Error listando calificaciones:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar calificaciones.',
      error: error.message
    });
  }
};

/* =====================================================
   LISTAR VERIFICACIONES
===================================================== */

exports.listarVerificaciones = async (req, res) => {
  try {
    const result = await pgPool.query(`
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

    return res.json({
      ok: true,
      verificaciones: result.rows
    });
  } catch (error) {
    console.error('Error listando verificaciones:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar verificaciones.',
      error: error.message
    });
  }
};

/* =====================================================
   CAMBIAR ESTADO DE USUARIO
   FIX: antes usaba sql.Int, sql.Bit, GETDATE(), OUTPUT INSERTED.*
   Ahora usa pgPool con parámetros posicionales $1/$2 y RETURNING.
===================================================== */

exports.cambiarEstadoUsuario = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { estado } = req.body;

    // Aceptar true/false, 1/0, "1"/"0"
    const estadoNormalizado = (estado === true || estado === 1 || estado === '1') ? 1 : 0;

    const result = await pgPool.query(
      `
      UPDATE usuarios
      SET estado    = $1,
          updatedat = NOW()
      WHERE id = $2
      RETURNING id, nombres, apellidos, email, estado
      `,
      [estadoNormalizado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    return res.json({
      ok: true,
      mensaje: 'Estado de usuario actualizado.',
      usuario: result.rows[0]
    });
  } catch (error) {
    console.error('Error cambiando estado de usuario:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar usuario.',
      error: error.message
    });
  }
};

/* =====================================================
   GESTIONAR VERIFICACIÓN
   FIX: antes usaba sql.Int, sql.VarChar, GETDATE(), OUTPUT INSERTED.*
   Ahora usa pgPool con parámetros posicionales $1/$2/$3 y RETURNING.
===================================================== */

exports.gestionarVerificacion = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { estado, observacion } = req.body;

    if (!['pendiente', 'aprobada', 'rechazada'].includes(estado)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Estado de verificación no válido. Use: pendiente, aprobada o rechazada.'
      });
    }

    const result = await pgPool.query(
      `
      UPDATE verificaciones
      SET estado      = $1,
          observacion = $2,
          updatedat   = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [estado, observacion || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Verificación no encontrada.'
      });
    }

    // Si se aprueba, marcar al usuario como verificado
    if (estado === 'aprobada') {
      await pgPool.query(
        `
        UPDATE usuarios
        SET verificado = 1,
            updatedat  = NOW()
        WHERE id = $1
        `,
        [result.rows[0].usuario_id]
      );
    }

    return res.json({
      ok: true,
      mensaje: 'Verificación actualizada correctamente.',
      verificacion: result.rows[0]
    });
  } catch (error) {
    console.error('Error gestionando verificación:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al gestionar verificación.',
      error: error.message
    });
  }
};