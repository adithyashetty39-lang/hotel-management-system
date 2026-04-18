// File: routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const { addRoom, getAllRooms, getAvailableRooms } = require('../controllers/roomController');
const { verifyToken } = require('../middleware/authMiddleware');

// Protect all routes below this line with verifyToken
router.use(verifyToken);

// POST /api/rooms (Add a room)
router.post('/', addRoom);

// GET /api/rooms (Get all rooms)
router.get('/', getAllRooms);

// GET /api/rooms/available (Get free rooms)
router.get('/available', getAvailableRooms);

module.exports = router;