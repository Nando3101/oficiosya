const TrabajoModel = require('../models/trabajo.model');

function obtenerUsuarioId(req) {
  return req.user?.id || req.body?.trabajador_id || req.body?.usuario_id || null;
}

exports.misTrabajos = async (req, res) => {
  try {
    const trabajadorId = obtenerUsuarioId(req);

    if (!trabajadorId) {
      return res.json({
        ok: true,
        trabajos: []
      });
    }

    const trabajos = await TrabajoModel.listarPorTrabajador(trabajadorId);

    res.json({
      ok: true,
      trabajos
    });
  } catch (error) {
    console.error('Error al cargar trabajos:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al cargar trabajos.',
      error: error.message,
      trabajos: []
    });
  }
};

exports.subirTrabajo = async (req, res) => {
  try {
    const trabajadorId = obtenerUsuarioId(req);

    if (!trabajadorId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se pudo identificar al trabajador.'
      });
    }

    let urlImagen = req.body.url_imagen || null;
    let publicId = req.body.public_id || null;

    if (req.file) {
      urlImagen = `/uploads/${req.file.filename}`;
      publicId = req.file.filename;
    }

    if (!urlImagen) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debe enviar una imagen.'
      });
    }

    const trabajo = await TrabajoModel.crear({
      trabajador_id: trabajadorId,
      url_imagen: urlImagen,
      public_id: publicId,
      descripcion: req.body.descripcion || null
    });

    res.status(201).json({
      ok: true,
      mensaje: 'Trabajo subido correctamente.',
      trabajo
    });
  } catch (error) {
    console.error('Error al subir trabajo:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al subir trabajo.',
      error: error.message
    });
  }
};

exports.eliminarTrabajo = async (req, res) => {
  try {
    const trabajadorId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!trabajadorId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se pudo identificar al trabajador.'
      });
    }

    const eliminado = await TrabajoModel.eliminar(id, trabajadorId);

    if (!eliminado) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Trabajo no encontrado.'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Trabajo eliminado correctamente.',
      trabajo: eliminado
    });
  } catch (error) {
    console.error('Error al eliminar trabajo:', error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error al eliminar trabajo.',
      error: error.message
    });
  }
};