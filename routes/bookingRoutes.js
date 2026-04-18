// File: routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const { checkInGuest } = require('../controllers/bookingController');
const { verifyToken } = require('../middleware/authMiddleware');

// Protect all booking routes
router.use(verifyToken);

// POST /api/bookings/checkin
router.post('/checkin', checkInGuest);

module.exports = router;