const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// Started as a Phase 2 placeholder/debug route to prove `protect` attaches
// req.user correctly. Phase 10's cleanup pass (coding-phases.md) checked
// whether it was still needed before removing it as leftover scaffolding —
// it isn't leftover: frontend/src/context/AuthContext.jsx calls this on
// every app load to verify a stored token and hydrate `user`, so removing
// it would break session persistence. Kept, load-bearing.
router.get('/me', protect, getMe);

module.exports = router;
