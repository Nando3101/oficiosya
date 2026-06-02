const { pgPool } = require('../config/db');

function limpiarUsuario(usuario) {
  if (!usuario) return null;

  const copia = { ...usuario };
  delete copia.password_hash;
  delete copia.email_token;
  delete copia.reset_token;
  delete copia.reset_token_expiry;

  return copia;
}

async function columnaExiste(tabla, columna) {
  const result = await pgPool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    LIMIT 1
    `,
    [tabla, columna]
  );

  return result.rows.length > 0;
}

exports.obtenerMiPerfil = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const usuario = await pgPool.query(
      `
      SELECT *
      FROM usuarios
      WHERE id = $1
      LIMIT 1
      `,
      [usuarioId]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    const perfilTrabajador = await pgPool.query(
      `
      SELECT 
        p.*,
        c.nombre AS categoria
      FROM perfiles_trabajador p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.usuario_id = $1
      LIMIT 1
      `,
      [usuarioId]
    );

    return res.json({
      ok: true,
      usuario: limpiarUsuario(usuario.rows[0]),
      perfil_trabajador: perfilTrabajador.rows[0] || null,
      perfil: perfilTrabajador.rows[0] || null
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error obteniendo perfil.',
      error: error.message
    });
  }
};

exports.actualizarMiPerfil = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const {
      nombres,
      apellidos,
      telefono,
      zona,
      ciudad,
      direccion,
      foto_url,
      foto_thumb
    } = req.body;

    const result = await pgPool.query(
      `
      UPDATE usuarios
      SET nombres = COALESCE($1, nombres),
          apellidos = COALESCE($2, apellidos),
          telefono = COALESCE($3, telefono),
          zona = COALESCE($4, zona),
          ciudad = COALESCE($5, ciudad),
          direccion = COALESCE($6, direccion),
          foto_url = COALESCE($7, foto_url),
          foto_thumb = COALESCE($8, foto_thumb),
          updatedat = NOW()
      WHERE id = $9
      RETURNING *
      `,
      [
        nombres || null,
        apellidos || null,
        telefono || null,
        zona || null,
        ciudad || null,
        direccion || null,
        foto_url || null,
        foto_thumb || null,
        usuarioId
      ]
    );

    return res.json({
      ok: true,
      mensaje: 'Perfil actualizado correctamente.',
      usuario: limpiarUsuario(result.rows[0])
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error actualizando perfil.',
      error: error.message
    });
  }
};

exports.subirFoto = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se recibió ninguna imagen.'
      });
    }

    const fotoUrl = `/uploads/${req.file.filename}`;

    const result = await pgPool.query(
      `
      UPDATE usuarios
      SET foto_url = $1,
          foto_thumb = $1,
          updatedat = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [fotoUrl, usuarioId]
    );

    return res.json({
      ok: true,
      mensaje: 'Foto actualizada correctamente.',
      foto_url: fotoUrl,
      usuario: limpiarUsuario(result.rows[0])
    });
  } catch (error) {
    console.error('Error subiendo foto:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error subiendo foto.',
      error: error.message
    });
  }
};

exports.obtenerPerfilTrabajador = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const result = await pgPool.query(
      `
      SELECT 
        p.*,
        c.nombre AS categoria
      FROM perfiles_trabajador p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.usuario_id = $1
      LIMIT 1
      `,
      [usuarioId]
    );

    return res.json({
      ok: true,
      perfil: result.rows[0] || null,
      perfil_trabajador: result.rows[0] || null,
      data: result.rows[0] || null
    });
  } catch (error) {
    console.error('Error obteniendo perfil trabajador:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error obteniendo perfil trabajador.',
      error: error.message
    });
  }
};

exports.crearActualizarPerfilTrabajador = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const {
      categoria_id,
      titulo,
      descripcion,
      experiencia,
      ubicacion,
      tarifa_referencia,
      tarifa_referencial,
      precio_desde,
      disponibilidad,
      disponible
    } = req.body;

    await pgPool.query(
      `
      UPDATE usuarios
      SET rol = CASE
                  WHEN rol = 'cliente' THEN 'cliente_trabajador'
                  ELSE rol
                END,
          es_trabajador = 1,
          es_cliente = 1,
          updatedat = NOW()
      WHERE id = $1
      `,
      [usuarioId]
    );

    const result = await pgPool.query(
      `
      INSERT INTO perfiles_trabajador (
        usuario_id,
        categoria_id,
        titulo,
        descripcion,
        experiencia,
        ubicacion,
        tarifa_referencia,
        tarifa_referencial,
        precio_desde,
        disponibilidad,
        disponible,
        createdat,
        updatedat
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, COALESCE($11, 1),
        NOW(), NOW()
      )
      ON CONFLICT (usuario_id)
      DO UPDATE SET
        categoria_id = EXCLUDED.categoria_id,
        titulo = EXCLUDED.titulo,
        descripcion = EXCLUDED.descripcion,
        experiencia = EXCLUDED.experiencia,
        ubicacion = EXCLUDED.ubicacion,
        tarifa_referencia = EXCLUDED.tarifa_referencia,
        tarifa_referencial = EXCLUDED.tarifa_referencial,
        precio_desde = EXCLUDED.precio_desde,
        disponibilidad = EXCLUDED.disponibilidad,
        disponible = EXCLUDED.disponible,
        updatedat = NOW()
      RETURNING *
      `,
      [
        usuarioId,
        categoria_id || null,
        titulo || null,
        descripcion || null,
        experiencia || null,
        ubicacion || null,
        tarifa_referencia || tarifa_referencial || precio_desde || null,
        tarifa_referencial || tarifa_referencia || precio_desde || null,
        precio_desde || tarifa_referencia || tarifa_referencial || null,
        disponibilidad || 'Disponible',
        disponible === undefined ? 1 : disponible
      ]
    );

    return res.json({
      ok: true,
      mensaje: 'Perfil de trabajador guardado correctamente.',
      perfil: result.rows[0],
      perfil_trabajador: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error guardando perfil trabajador:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error guardando perfil trabajador.',
      error: error.message
    });
  }
};

exports.misVerificaciones = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const result = await pgPool.query(
      `
      SELECT *
      FROM verificaciones
      WHERE usuario_id = $1
      ORDER BY createdat DESC
      `,
      [usuarioId]
    );

    return res.json({
      ok: true,
      verificaciones: result.rows,
      data: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo verificaciones:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error obteniendo verificaciones.',
      error: error.message
    });
  }
};

exports.subirVerificacion = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const {
      tipo_documento,
      tipo,
      numero_documento,
      descripcion
    } = req.body;

    const archivoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const columnas = ['usuario_id'];
    const valores = [usuarioId];
    const placeholders = ['$1'];

    let contador = 2;

    if (await columnaExiste('verificaciones', 'tipo_documento')) {
      columnas.push('tipo_documento');
      valores.push(tipo_documento || tipo || 'documento');
      placeholders.push(`$${contador++}`);
    }

    if (await columnaExiste('verificaciones', 'documento_url')) {
      columnas.push('documento_url');
      valores.push(archivoUrl);
      placeholders.push(`$${contador++}`);
    }

    if (await columnaExiste('verificaciones', 'archivo_url')) {
      columnas.push('archivo_url');
      valores.push(archivoUrl);
      placeholders.push(`$${contador++}`);
    }

    if (await columnaExiste('verificaciones', 'numero_documento')) {
      columnas.push('numero_documento');
      valores.push(numero_documento || null);
      placeholders.push(`$${contador++}`);
    }

    if (await columnaExiste('verificaciones', 'descripcion')) {
      columnas.push('descripcion');
      valores.push(descripcion || null);
      placeholders.push(`$${contador++}`);
    }

    if (await columnaExiste('verificaciones', 'estado')) {
      columnas.push('estado');
      valores.push('pendiente');
      placeholders.push(`$${contador++}`);
    }

    if (await columnaExiste('verificaciones', 'observacion')) {
      columnas.push('observacion');
      valores.push(null);
      placeholders.push(`$${contador++}`);
    }

    if (await columnaExiste('verificaciones', 'createdat')) {
      columnas.push('createdat');
      placeholders.push('NOW()');
    }

    if (await columnaExiste('verificaciones', 'updatedat')) {
      columnas.push('updatedat');
      placeholders.push('NOW()');
    }

    const result = await pgPool.query(
      `
      INSERT INTO verificaciones (${columnas.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
      `,
      valores
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Verificación enviada correctamente.',
      verificacion: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error subiendo verificación:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error subiendo verificación.',
      error: error.message
    });
  }
};

exports.obtenerPerfilPublico = async (req, res) => {
  try {
    const usuarioId = Number(req.params.id);

    const usuario = await pgPool.query(
      `
      SELECT 
        id,
        nombres,
        apellidos,
        email,
        telefono,
        ciudad,
        zona,
        direccion,
        rol,
        es_cliente,
        es_trabajador,
        verificado,
        email_verificado,
        foto_url,
        foto_thumb,
        createdat
      FROM usuarios
      WHERE id = $1
      LIMIT 1
      `,
      [usuarioId]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    const perfilTrabajador = await pgPool.query(
      `
      SELECT 
        p.*,
        c.nombre AS categoria
      FROM perfiles_trabajador p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.usuario_id = $1
      LIMIT 1
      `,
      [usuarioId]
    );

    const calificaciones = await pgPool.query(
      `
      SELECT 
        COUNT(*) AS total,
        COALESCE(AVG(CAST(puntuacion AS DOUBLE PRECISION)), 0) AS promedio
      FROM calificaciones
      WHERE calificado_id = $1
      `,
      [usuarioId]
    );

    return res.json({
      ok: true,
      usuario: usuario.rows[0],
      perfil: {
        usuario: usuario.rows[0],
        trabajador: perfilTrabajador.rows[0] || null,
        calificaciones: {
          total: Number(calificaciones.rows[0].total),
          promedio: Number(calificaciones.rows[0].promedio)
        }
      },
      perfil_trabajador: perfilTrabajador.rows[0] || null
    });
  } catch (error) {
    console.error('Error obteniendo perfil público:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error obteniendo perfil público.',
      error: error.message
    });
  }
};