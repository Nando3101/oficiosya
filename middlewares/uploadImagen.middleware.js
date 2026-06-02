const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const carpetaOriginales = path.join(__dirname, '..', 'uploads', 'originales');
const carpetaOptimizadas = path.join(__dirname, '..', 'uploads', 'optimizadas');
const carpetaThumbnails = path.join(__dirname, '..', 'uploads', 'thumbnails');

[carpetaOriginales, carpetaOptimizadas, carpetaThumbnails].forEach((carpeta) => {
  if (!fs.existsSync(carpeta)) {
    fs.mkdirSync(carpeta, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, carpetaOriginales);
  },

  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    const nombreArchivo = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, nombreArchivo);
  }
});

function filtroImagen(req, file, cb) {
  const tiposPermitidos = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  if (!tiposPermitidos.includes(file.mimetype)) {
    return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP.'));
  }

  cb(null, true);
}

const uploadImagen = multer({
  storage,
  fileFilter: filtroImagen,
  limits: {
    fileSize: 3 * 1024 * 1024
  }
});

async function optimizarImagen(req, res, next) {
  try {
    if (!req.file) {
      return next();
    }

    const archivoOriginal = req.file.path;
    const nombreBase = path.parse(req.file.filename).name;

    const nombreOptimizado = `${nombreBase}.webp`;
    const nombreThumbnail = `${nombreBase}-thumb.webp`;

    const rutaOptimizada = path.join(carpetaOptimizadas, nombreOptimizado);
    const rutaThumbnail = path.join(carpetaThumbnails, nombreThumbnail);

    await sharp(archivoOriginal)
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 75
      })
      .toFile(rutaOptimizada);

    await sharp(archivoOriginal)
      .rotate()
      .resize({
        width: 300,
        height: 300,
        fit: 'cover'
      })
      .webp({
        quality: 70
      })
      .toFile(rutaThumbnail);

    if (fs.existsSync(archivoOriginal)) {
      fs.unlinkSync(archivoOriginal);
    }

    req.imagenOptimizada = `/uploads/optimizadas/${nombreOptimizado}`;
    req.imagenThumbnail = `/uploads/thumbnails/${nombreThumbnail}`;

    next();

  } catch (error) {
    next(error);
  }
}

function manejarErrorUploadImagen(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        ok: false,
        mensaje: 'La imagen es demasiado pesada. Máximo permitido: 3 MB.'
      });
    }

    return res.status(400).json({
      ok: false,
      mensaje: 'Error al subir imagen.',
      error: error.message
    });
  }

  if (error) {
    return res.status(400).json({
      ok: false,
      mensaje: error.message || 'Error al procesar imagen.'
    });
  }

  next();
}

module.exports = {
  uploadImagen,
  optimizarImagen,
  manejarErrorUploadImagen
};