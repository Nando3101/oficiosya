const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const trabajoController = require('../controllers/trabajo.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `trabajo_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

router.get('/mios', verificarToken, trabajoController.misTrabajos);
router.post('/', verificarToken, upload.single('imagen'), trabajoController.subirTrabajo);
router.delete('/:id', verificarToken, trabajoController.eliminarTrabajo);

module.exports = router;