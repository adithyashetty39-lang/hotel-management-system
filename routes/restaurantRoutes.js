const express = require('express');
const router = express.Router();
const db = require('../config/db'); 

// --- POST /api/restaurant/order: Process a POS Order ---
router.post('/order', async (req, res) => {
    const { orderType, selectedRoom, cart, total } = req.body;

    try {
        let bookingId = null;
        let orderStatus = 'Paid'; // Walk-ins pay immediately

        // If it is a room charge, we must find the guest's active booking ID!
        if (orderType === 'room') {
            const [activeBooking] = await db.query(
                `SELECT b.booking_id 
                 FROM bookings b 
                 JOIN rooms r ON b.room_id = r.room_id 
                 WHERE r.room_number = ? AND b.status = 'Active'`,
                [selectedRoom]
            );

            if (activeBooking.length === 0) {
                return res.status(400).json({ error: 'No active booking found for this room.' });
            }
            
            bookingId = activeBooking[0].booking_id;
            orderStatus = 'Unpaid'; // The guest will pay this during their final hotel checkout
        }

        // Insert the master order into your database
        const [orderResult] = await db.query(
            'INSERT INTO restaurant_orders (booking_id, order_type, total_amount, status) VALUES (?, ?, ?, ?)',
            [bookingId, orderType, total, orderStatus]
        );
        
        // Note: For a production app, you would also loop through the 'cart' array here 
        // and insert every individual burger/coffee into an 'order_items' table!

        res.status(201).json({ message: 'Order processed successfully!' });
    } catch (error) {
        console.error('POS error:', error);
        res.status(500).json({ error: 'Failed to process restaurant order.' });
    }
});
// --- GET /api/restaurant/tab/:room_id: Fetch unpaid restaurant charges ---
router.get('/tab/:room_id', async (req, res) => {
    try {
        const { room_id } = req.params;
        const [result] = await db.query(
            `SELECT COALESCE(SUM(ro.total_amount), 0) as tab_total 
             FROM restaurant_orders ro
             JOIN bookings b ON ro.booking_id = b.booking_id
             WHERE b.room_id = ? AND b.status = 'Active' AND ro.status = 'Unpaid'`,
            [room_id]
        );
        res.status(200).json({ total: Number(result[0].tab_total) });
    } catch (error) {
        console.error('Fetch tab error:', error);
        res.status(500).json({ error: 'Failed to fetch restaurant tab.' });
    }
});

module.exports = router;