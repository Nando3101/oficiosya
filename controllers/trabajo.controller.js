const { pgPool } = require('../config/db');

exports.misTrabajos = async (req, res) => {
  try {
    const usuarioId = req.user.id;

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
      error: error.message
    });
  }
};

exports.subirTrabajo = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const {
      solicitud_id,
      cliente_id,
      descripcion
    } = req.body;

    const urlImagen = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pgPool.query(
      `
      INSERT INTO trabajos_realizados (
        solicitud_id,
        trabajador_id,
        cliente_id,
        url_imagen,
        descripcion,
        estado,
        createdat,
        updatedat
      )
      VALUES ($1, $2, $3, $4, $5, 'finalizado', NOW(), NOW())
      RETURNING *
      `,
      [
        solicitud_id || null,
        usuarioId,
        cliente_id || null,
        urlImagen,
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
    const usuarioId = req.user.id;
    const id = Number(req.params.id);

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
      mensaje: 'Trabajo eliminado correctamente.'
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