// File: routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { registerStaff, loginStaff, changeStaffPassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', registerStaff);

// POST /api/auth/login
router.post('/login', loginStaff);

// PUT /api/auth/password (protected)
router.put('/password', verifyToken, changeStaffPassword);

module.exports = router;