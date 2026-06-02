const { sql, poolPromise } = require('../config/db');

exports.miPerfil = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, usuarioId)
      .query(`
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
          foto_url,
          foto_thumb,
          createdat,
          updatedat
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
      usuario: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar perfil.',
      error: error.message
    });
  }
};

exports.actualizarDatos = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { nombres, apellidos, telefono, zona } = req.body;

    if (!nombres || !apellidos) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Nombres y apellidos son obligatorios.'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, usuarioId)
      .input('nombres', sql.VarChar(100), nombres.trim())
      .input('apellidos', sql.VarChar(100), apellidos.trim())
      .input('telefono', sql.VarChar(20), telefono || null)
      .input('zona', sql.VarChar(100), zona || null)
      .query(`
        UPDATE usuarios
        SET nombres = @nombres,
            apellidos = @apellidos,
            telefono = @telefono,
            zona = @zona,
            updatedat = GETDATE()
        OUTPUT 
            INSERTED.id,
            INSERTED.nombres,
            INSERTED.apellidos,
            INSERTED.email,
            INSERTED.telefono,
            INSERTED.zona,
            INSERTED.rol,
            INSERTED.foto_url,
            INSERTED.foto_thumb
        WHERE id = @id
      `);

    res.json({
      ok: true,
      mensaje: 'Datos actualizados correctamente.',
      usuario: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar datos.',
      error: error.message
    });
  }
};

exports.subirFoto = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    if (!req.imagenOptimizada) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se recibió ninguna imagen válida.'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, usuarioId)
      .input('foto_url', sql.VarChar(500), req.imagenOptimizada)
      .input('foto_thumb', sql.VarChar(500), req.imagenThumbnail)
      .query(`
        UPDATE usuarios
        SET foto_url = @foto_url,
            foto_thumb = @foto_thumb,
            updatedat = GETDATE()
        OUTPUT 
            INSERTED.id,
            INSERTED.nombres,
            INSERTED.apellidos,
            INSERTED.email,
            INSERTED.telefono,
            INSERTED.zona,
            INSERTED.rol,
            INSERTED.foto_url,
            INSERTED.foto_thumb
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
      mensaje: 'Foto actualizada correctamente.',
      usuario: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al subir foto.',
      error: error.message
    });
  }
};

exports.miPerfilProfesional = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('usuario_id', sql.Int, usuarioId)
      .query(`
        SELECT 
          p.id,
          p.usuario_id,
          p.categoria_id,
          c.nombre AS categoria,
          p.descripcion,
          p.experiencia,
          p.tarifa_referencia,
          p.disponibilidad,
          p.createdat,
          p.updatedat
        FROM perfiles_trabajador p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE p.usuario_id = @usuario_id
      `);

    if (result.recordset.length === 0) {
      return res.json({
        ok: true,
        perfil: {
          usuario_id: usuarioId,
          descripcion: '',
          experiencia: '',
          tarifa_referencia: '',
          disponibilidad: ''
        }
      });
    }

    res.json({
      ok: true,
      perfil: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar perfil profesional.',
      error: error.message
    });
  }
};

exports.actualizarPerfilProfesional = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const {
      categoria_id,
      descripcion,
      experiencia,
      tarifa_referencia,
      disponibilidad
    } = req.body;

    const pool = await poolPromise;

    const existe = await pool.request()
      .input('usuario_id', sql.Int, usuarioId)
      .query(`
        SELECT id
        FROM perfiles_trabajador
        WHERE usuario_id = @usuario_id
      `);

    let result;

    if (existe.recordset.length > 0) {
      result = await pool.request()
        .input('usuario_id', sql.Int, usuarioId)
        .input('categoria_id', sql.Int, categoria_id ? Number(categoria_id) : null)
        .input('descripcion', sql.VarChar(sql.MAX), descripcion || null)
        .input('experiencia', sql.VarChar(sql.MAX), experiencia || null)
        .input('tarifa_referencia', sql.Decimal(10, 2), tarifa_referencia ? Number(tarifa_referencia) : null)
        .input('disponibilidad', sql.VarChar(255), disponibilidad || null)
        .query(`
          UPDATE perfiles_trabajador
          SET categoria_id = COALESCE(@categoria_id, categoria_id),
              descripcion = @descripcion,
              experiencia = @experiencia,
              tarifa_referencia = @tarifa_referencia,
              disponibilidad = @disponibilidad,
              updatedat = GETDATE()
          OUTPUT INSERTED.*
          WHERE usuario_id = @usuario_id
        `);
    } else {
      result = await pool.request()
        .input('usuario_id', sql.Int, usuarioId)
        .input('categoria_id', sql.Int, categoria_id ? Number(categoria_id) : null)
        .input('descripcion', sql.VarChar(sql.MAX), descripcion || null)
        .input('experiencia', sql.VarChar(sql.MAX), experiencia || null)
        .input('tarifa_referencia', sql.Decimal(10, 2), tarifa_referencia ? Number(tarifa_referencia) : null)
        .input('disponibilidad', sql.VarChar(255), disponibilidad || null)
        .query(`
          INSERT INTO perfiles_trabajador (
            usuario_id,
            categoria_id,
            descripcion,
            experiencia,
            tarifa_referencia,
            disponibilidad,
            createdat
          )
          OUTPUT INSERTED.*
          VALUES (
            @usuario_id,
            @categoria_id,
            @descripcion,
            @experiencia,
            @tarifa_referencia,
            @disponibilidad,
            GETDATE()
          )
        `);
    }

    await pool.request()
      .input('id', sql.Int, usuarioId)
      .query(`
        UPDATE usuarios
        SET es_trabajador = 1,
            rol = CASE 
                    WHEN rol = 'cliente' THEN 'trabajador'
                    ELSE rol
                  END,
            updatedat = GETDATE()
        WHERE id = @id
      `);

    res.json({
      ok: true,
      mensaje: 'Perfil profesional actualizado correctamente.',
      perfil: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar perfil profesional.',
      error: error.message
    });
  }
};

exports.misVerificaciones = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('usuario_id', sql.Int, usuarioId)
      .query(`
        SELECT *
        FROM verificaciones
        WHERE usuario_id = @usuario_id
        ORDER BY createdat DESC
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

exports.subirVerificacion = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { documento_url, observacion } = req.body;

    const pool = await poolPromise;

    const result = await pool.request()
      .input('usuario_id', sql.Int, usuarioId)
      .input('documento_url', sql.VarChar(500), documento_url || null)
      .input('observacion', sql.VarChar(sql.MAX), observacion || null)
      .query(`
        INSERT INTO verificaciones (
          usuario_id,
          documento_url,
          estado,
          observacion,
          createdat
        )
        OUTPUT INSERTED.*
        VALUES (
          @usuario_id,
          @documento_url,
          'pendiente',
          @observacion,
          GETDATE()
        )
      `);

    res.json({
      ok: true,
      mensaje: 'Solicitud de verificación enviada.',
      verificacion: result.recordset[0]
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error al subir verificación.',
      error: error.message
    });
  }
};

exports.perfilPublico = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID de perfil no válido.'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', sql.Int, Number(id))
      .query(`
        SELECT TOP 1
          u.id,
          u.nombres,
          u.apellidos,
          u.email,
          u.telefono,
          u.zona,
          u.rol,
          u.estado,
          u.verificado,
          u.es_cliente,
          u.es_trabajador,
          u.foto_url,
          u.foto_thumb,

          p.id AS perfil_id,
          p.descripcion,
          p.experiencia,
          p.tarifa_referencia,
          p.disponibilidad,

          c.nombre AS categoria,

          ISNULL((
            SELECT AVG(CAST(cal.puntuacion AS FLOAT))
            FROM calificaciones cal
            WHERE cal.calificado_id = u.id
          ), 0) AS promedio_calificacion,

          (
            SELECT COUNT(*)
            FROM calificaciones cal
            WHERE cal.calificado_id = u.id
          ) AS total_calificaciones

        FROM usuarios u
        LEFT JOIN perfiles_trabajador p ON p.usuario_id = u.id
        LEFT JOIN categorias c ON c.id = p.categoria_id

        WHERE 
          u.id = @id
          OR p.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Perfil no encontrado.'
      });
    }

    res.json({
      ok: true,
      perfil: result.recordset[0]
    });

  } catch (error) {
    console.error('Error perfil público:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar perfil público.',
      error: error.message
    });
  }
};