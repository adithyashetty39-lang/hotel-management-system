// File: routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { registerStaff, loginStaff } = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', registerStaff);

// POST /api/auth/login
router.post('/login', loginStaff);

module.exports = router;