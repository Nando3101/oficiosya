const { pgPool } = require('../config/db');

function limpiarUsuario(usuario) {
  const copia = { ...usuario };
  delete copia.password_hash;
  delete copia.email_token;
  delete copia.reset_token;
  delete copia.reset_token_expiry;
  return copia;
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
      SELECT p.*, c.nombre AS categoria
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
      perfil_trabajador: perfilTrabajador.rows[0] || null
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