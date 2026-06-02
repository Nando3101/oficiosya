const express = require('express');
const router = express.Router();

const statsController = require('../controllers/stats.controller');

router.get('/me', statsController.misStats);

module.exports = router;