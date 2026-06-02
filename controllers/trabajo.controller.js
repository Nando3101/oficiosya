const { pgPool } = require('../config/db');

function obtenerUsuarioId(req) {
  return req.user?.id || req.body?.trabajador_id || req.body?.usuario_id || null;
}

exports.misTrabajos = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);

    if (!usuarioId) {
      return res.json({
        ok: true,
        trabajos: [],
        data: []
      });
    }

    const result = await pgPool.query(
      `
      SELECT *
      FROM trabajos_realizados
      WHERE trabajador_id = $1 OR cliente_id = $1
      ORDER BY createdat DESC
      `,
      [usuarioId]
    );

    return res.json({
      ok: true,
      trabajos: result.rows,
      data: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo trabajos:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error obteniendo trabajos.',
      error: error.message,
      trabajos: []
    });
  }
};

exports.subirTrabajo = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);

    if (!usuarioId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se pudo identificar al trabajador.'
      });
    }

    const {
      solicitud_id,
      cliente_id,
      descripcion
    } = req.body;

    const urlImagen = req.file ? `/uploads/${req.file.filename}` : req.body.url_imagen || null;
    const publicId = req.file ? req.file.filename : req.body.public_id || null;

    if (!urlImagen) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debes subir una imagen del trabajo.'
      });
    }

    const result = await pgPool.query(
      `
      INSERT INTO trabajos_realizados (
        solicitud_id,
        trabajador_id,
        cliente_id,
        url_imagen,
        public_id,
        descripcion,
        estado,
        createdat,
        updatedat
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'finalizado', NOW(), NOW())
      RETURNING *
      `,
      [
        solicitud_id || null,
        usuarioId,
        cliente_id || null,
        urlImagen,
        publicId,
        descripcion || null
      ]
    );

    return res.status(201).json({
      ok: true,
      mensaje: 'Trabajo registrado correctamente.',
      trabajo: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error subiendo trabajo:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error subiendo trabajo.',
      error: error.message
    });
  }
};

exports.eliminarTrabajo = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const id = Number(req.params.id);

    if (!usuarioId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se pudo identificar al trabajador.'
      });
    }

    const result = await pgPool.query(
      `
      DELETE FROM trabajos_realizados
      WHERE id = $1
        AND trabajador_id = $2
      RETURNING *
      `,
      [id, usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Trabajo no encontrado o no tienes permiso para eliminarlo.'
      });
    }

    return res.json({
      ok: true,
      mensaje: 'Trabajo eliminado correctamente.',
      trabajo: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error eliminando trabajo:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error eliminando trabajo.',
      error: error.message
    });
  }
};