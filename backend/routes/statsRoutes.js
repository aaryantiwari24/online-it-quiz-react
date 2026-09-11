const express = require('express');
const { getStats } = require('../controllers/statsController');

const router = express.Router();

// Public — see getStats' own comment in statsController.js for why.
router.get('/', getStats);

module.exports = router;
