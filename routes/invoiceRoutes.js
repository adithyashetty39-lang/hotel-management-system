// File: routes/invoiceRoutes.js
const express = require('express');
const router = express.Router();
const { generateInvoice } = require('../controllers/invoiceController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// POST /api/invoices/checkout/:booking_id
router.post('/checkout/:booking_id', generateInvoice);

module.exports = router;