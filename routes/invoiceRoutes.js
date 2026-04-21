const express = require('express');
const router = express.Router();
const db = require('../config/db');

// --- GET /api/invoices/:booking_id: Preview/Generate an Invoice ---
router.get('/generate/:booking_id', async (req, res) => {
    const { booking_id } = req.params;

    try {
        // 1. Fetch Room & Booking Details
        const [bookingData] = await db.query(`
            SELECT b.*, r.price_per_night, r.room_number, r.type, g.name as guest_name
            FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN guests g ON b.guest_id = g.guest_id
            WHERE b.booking_id = ?`, [booking_id]);

        if (bookingData.length === 0) return res.status(404).json({ error: 'Booking not found' });
        const booking = bookingData[0];

        // 2. Fetch Restaurant Charges
        const [foodData] = await db.query(
            "SELECT COALESCE(SUM(total_amount), 0) as food_total FROM restaurant_orders WHERE booking_id = ? AND status = 'Unpaid'", 
            [booking_id]
        );
        const foodTotal = Number(foodData[0].food_total);

        // 3. Perform Calculations
        const nights = Math.max(1, Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)));
        const roomSubtotal = nights * booking.price_per_night;
        const roomTax = roomSubtotal * 0.12; // 12% GST on Room
        const foodTax = foodTotal * 0.05;   // 5% GST on Food
        const grandTotal = roomSubtotal + roomTax + foodTotal + foodTax;

        // 4. Return the "Compiled" Data
        res.json({
            invoice_meta: {
                invoice_no: `INV-${Date.now().toString().slice(-6)}`,
                date: new Date().toISOString()
            },
            guest: { name: booking.guest_name, room: booking.room_number },
            breakdown: {
                room_charges: roomSubtotal,
                food_charges: foodTotal,
                taxes: roomTax + foodTax,
                grand_total: grandTotal
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Invoice engine failed' });
    }
});

module.exports = router;