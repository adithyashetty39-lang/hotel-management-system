const express = require('express');
const router = express.Router();
const db = require('../config/db'); 

// --- POST /api/bookings: Process a Guest Check-In ---
router.post('/', async (req, res) => {
    const { guest_name, guest_email, guest_phone, room_id, check_in, check_out } = req.body;

    try {
        const [roomCheck] = await db.query('SELECT status FROM rooms WHERE room_id = ?', [room_id]);
        if (roomCheck.length === 0 || (roomCheck[0].status !== 'Available' && roomCheck[0].status !== 'AVAILABLE')) {
            return res.status(400).json({ error: 'Room is no longer available.' });
        }

        const [guestResult] = await db.query(
            'INSERT INTO guests (name, email, phone) VALUES (?, ?, ?)',
            [guest_name, guest_email, guest_phone]
        );
        const newGuestId = guestResult.insertId; 

        const insertBookingQuery = `
            INSERT INTO bookings (guest_id, room_id, check_in, check_out, status)
            VALUES (?, ?, ?, ?, 'Active')
        `;
        await db.query(insertBookingQuery, [newGuestId, room_id, check_in, check_out]);

        await db.query('UPDATE rooms SET status = ? WHERE room_id = ?', ['Occupied', room_id]);

        res.status(201).json({ message: 'Check-in successful!' });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'Database transaction failed.' });
    }
});

// --- POST /api/bookings/checkout/:room_id: Process a Guest Checkout & Generate Invoice ---
router.post('/checkout/:room_id', async (req, res) => {
    const { room_id } = req.params;

    try {
        // 1. Find the active booking and room details
        const [activeBooking] = await db.query(`
            SELECT b.booking_id, b.check_in, b.check_out, r.price_per_night 
            FROM bookings b 
            JOIN rooms r ON b.room_id = r.room_id 
            WHERE b.room_id = ? AND b.status = "Active"
        `, [room_id]);

        if (activeBooking.length === 0) {
            return res.status(400).json({ error: 'No active booking found for this room.' });
        }

        const booking = activeBooking[0];

        // 2. Fetch Restaurant Charges
        const [foodData] = await db.query(
            "SELECT COALESCE(SUM(total_amount), 0) as food_total FROM restaurant_orders WHERE booking_id = ? AND status = 'Unpaid'", 
            [booking.booking_id]
        );
        const foodTotal = Number(foodData[0].food_total);

        // 3. The Math Engine
        const nights = Math.max(1, Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)));
        const roomSubtotal = nights * booking.price_per_night;
        const roomTax = roomSubtotal * 0.12; 
        const foodTax = foodTotal * 0.05;   
        const grandTotal = roomSubtotal + roomTax + foodTotal + foodTax;

        // 4. Save to YOUR existing Invoices Table!
        const [invoiceResult] = await db.query(`
            INSERT INTO invoices (booking_id, room_total, restaurant_total, grand_total, payment_status) 
            VALUES (?, ?, ?, ?, 'Paid')
        `, [booking.booking_id, (roomSubtotal + roomTax), (foodTotal + foodTax), grandTotal]);

        // Use the auto-generated database ID to create a professional invoice number (e.g., INV-00005)
        const invoiceNo = `INV-${String(invoiceResult.insertId).padStart(5, '0')}`;

        // 5. Clean up the database
        await db.query('UPDATE bookings SET status = "Completed" WHERE booking_id = ?', [booking.booking_id]);
        await db.query('UPDATE restaurant_orders SET status = "Paid" WHERE booking_id = ?', [booking.booking_id]);
        await db.query('UPDATE rooms SET status = "Available" WHERE room_id = ?', [room_id]);

        // Return the final numbers to the frontend
        res.status(200).json({ 
            message: 'Checkout successful!',
            invoiceData: { invoiceNo, roomSubtotal, foodTotal, taxes: roomTax + foodTax, grandTotal }
        });

    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Database transaction failed during checkout.' });
    }
});

module.exports = router;