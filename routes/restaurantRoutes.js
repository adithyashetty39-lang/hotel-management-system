// File: routes/restaurantRoutes.js
const express = require('express');
const router = express.Router();
const { placeOrder, getOrdersByBooking } = require('../controllers/restaurantController');
const { verifyToken } = require('../middleware/authMiddleware');

// Protect all restaurant routes
router.use(verifyToken);

// POST /api/restaurant/order (Place a new food order)
router.post('/order', placeOrder);

// GET /api/restaurant/orders/:bookingId (Get orders for a specific room bill)
router.get('/orders/:bookingId', getOrdersByBooking);

module.exports = router;