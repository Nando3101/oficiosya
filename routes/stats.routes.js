const express = require('express');
const router = express.Router();

const statsController = require('../controllers/stats.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, statsController.misStats);
router.get('/me', verificarToken, statsController.misStats);

module.exports = router;