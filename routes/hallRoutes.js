// File: routes/hallRoutes.js
const express = require('express');
const router = express.Router();
const { bookHall, getAllHallBookings } = require('../controllers/hallController');
const { verifyToken } = require('../middleware/authMiddleware');

// Protect all hall routes
router.use(verifyToken);

// POST /api/halls/book (Book the hall)
router.post('/book', bookHall);

// GET /api/halls/bookings (View all bookings)
router.get('/bookings', getAllHallBookings);

module.exports = router;