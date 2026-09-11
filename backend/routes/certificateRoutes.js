const express = require('express');
const { generateCertificate, markCertificateDownloaded } = require('../controllers/certificateController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Get-or-create — see generateCertificate's own comment in
// certificateController.js for why this is idempotent rather than a
// stricter "create once" endpoint.
router.post('/result/:resultId', protect, generateCertificate);

// Phase 6 addition — see markCertificateDownloaded's own comment in
// certificateController.js.
router.patch('/:id/download', protect, markCertificateDownloaded);

module.exports = router;
