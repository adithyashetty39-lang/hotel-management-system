// File: controllers/restaurantController.js
const db = require('../config/db');

// 1. Place a New Restaurant Order
const placeOrder = async (req, res) => {
    // booking_id is optional! If it's null, it's a walk-in customer.
    const { booking_id, table_number, total_amount } = req.body;

    try {
        // If they provided a booking_id, verify the guest is actually active
        if (booking_id) {
            const [booking] = await db.execute(
                `SELECT status FROM bookings WHERE booking_id = ?`, 
                [booking_id]
            );
            
            if (booking.length === 0 || booking[0].status !== 'Active') {
                return res.status(400).json({ error: 'Invalid or inactive booking ID. Cannot charge to this room.' });
            }
        }

        // Insert the order into the database
        const query = `INSERT INTO restaurant_orders (booking_id, table_number, total_amount, status) VALUES (?, ?, ?, 'Served')`;
        
        // We use || null to ensure empty values are properly saved as NULL in MySQL
        const [result] = await db.execute(query, [booking_id || null, table_number, total_amount]);

        res.status(201).json({ 
            message: 'Order placed successfully!', 
            order_id: result.insertId 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Get all food orders for a specific guest (Used during checkout)
const getOrdersByBooking = async (req, res) => {
    const { bookingId } = req.params; // We grab this from the URL

    try {
        const query = `SELECT * FROM restaurant_orders WHERE booking_id = ?`;
        const [orders] = await db.execute(query, [bookingId]);
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { placeOrder, getOrdersByBooking };