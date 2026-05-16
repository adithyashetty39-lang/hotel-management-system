const express = require('express');
const router = express.Router();
const db = require('../config/db');

// --- GET /api/invoices/preview/:booking_id: Preview checkout breakdown WITHOUT modifying data ---
router.get('/preview/:booking_id', async (req, res) => {
    const { booking_id } = req.params;

    try {
        // 1. Fetch Room & Booking Details
        const [bookingData] = await db.query(`
            SELECT b.*, r.price_per_night, r.room_number, r.type, g.name as guest_name, g.email as guest_email, g.phone as guest_phone
            FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN guests g ON b.guest_id = g.guest_id
            WHERE b.booking_id = ?`, [booking_id]);

        if (bookingData.length === 0) return res.status(404).json({ error: 'Booking not found' });
        const booking = bookingData[0];

        // 2. Fetch Restaurant Charges (individual orders)
        const [foodOrders] = await db.query(
            `SELECT order_id, total_amount, status, order_type FROM restaurant_orders WHERE booking_id = ?`,
            [booking_id]
        );
        const foodTotal = foodOrders
            .filter(o => o.status === 'Unpaid')
            .reduce((sum, o) => sum + Number(o.total_amount), 0);

        // 3. Fetch Hall Charges
        const [hallBookings] = await db.query(
            `SELECT hall_booking_id, event_date, time_slot, flat_fee, status FROM hall_bookings WHERE booking_id = ?`,
            [booking_id]
        );
        const hallTotal = hallBookings.reduce((sum, h) => sum + Number(h.flat_fee), 0);

        // 4. Fetch booking add-ons selected in the guest portal.
        await db.query(`
            CREATE TABLE IF NOT EXISTS booking_addons (
                booking_addon_id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                addon_code VARCHAR(80) NOT NULL,
                addon_title VARCHAR(160) NOT NULL,
                addon_price DECIMAL(10,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY idx_booking_addons_booking (booking_id)
            )
        `);
        const [addons] = await db.query(
            `SELECT addon_code, addon_title, addon_price FROM booking_addons WHERE booking_id = ?`,
            [booking_id]
        );
        const addonTotal = addons.reduce((sum, addon) => sum + Number(addon.addon_price), 0);

        // 5. Calculations
        const nights = Math.max(1, Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)));
        const roomSubtotal = nights * booking.price_per_night;
        const roomTax = roomSubtotal * 0.12;
        const foodTax = foodTotal * 0.05;
        const grandTotal = roomSubtotal + roomTax + foodTotal + foodTax + hallTotal + addonTotal;

        // 6. Return full preview (no data modified)
        res.json({
            booking: {
                booking_id: booking.booking_id,
                status: booking.status,
                check_in: booking.check_in,
                check_out: booking.check_out
            },
            guest: {
                name: booking.guest_name,
                email: booking.guest_email,
                phone: booking.guest_phone
            },
            room: {
                room_number: booking.room_number,
                type: booking.type,
                price_per_night: Number(booking.price_per_night)
            },
            breakdown: {
                nights,
                room_subtotal: roomSubtotal,
                room_tax: roomTax,
                food_orders: foodOrders,
                food_subtotal: foodTotal,
                food_tax: foodTax,
                hall_bookings: hallBookings,
                hall_total: hallTotal,
                addons,
                addon_total: addonTotal,
                grand_total: grandTotal
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not generate checkout preview.' });
    }
});

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

        // 3. Fetch Add-on Charges
        const [addons] = await db.query(
            `SELECT addon_code, addon_title, addon_price FROM booking_addons WHERE booking_id = ?`,
            [booking_id]
        ).catch(() => [[]]);
        const addonTotal = (addons || []).reduce((sum, addon) => sum + Number(addon.addon_price), 0);

        // 4. Perform Calculations
        const nights = Math.max(1, Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24)));
        const roomSubtotal = nights * booking.price_per_night;
        const roomTax = roomSubtotal * 0.12; // 12% GST on Room
        const foodTax = foodTotal * 0.05;   // 5% GST on Food
        const grandTotal = roomSubtotal + roomTax + foodTotal + foodTax + addonTotal;

        // 5. Return the "Compiled" Data
        res.json({
            invoice_meta: {
                invoice_no: `INV-${Date.now().toString().slice(-6)}`,
                date: new Date().toISOString()
            },
            guest: { name: booking.guest_name, room: booking.room_number },
            breakdown: {
                room_charges: roomSubtotal,
                food_charges: foodTotal,
                addon_charges: addonTotal,
                addons: addons || [],
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
