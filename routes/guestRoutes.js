const express = require('express');
const router = express.Router();
const db = require('../config/db');

// --- GET /api/guests: Fetch all guests and their booking history ---
router.get('/', async (req, res) => {
    try {
        // We use JOINs to stitch together the Guest details, their Booking, and their Room
        const query = `
            SELECT 
                b.booking_id,
                g.name AS guest_name,
                g.email,
                g.phone,
                r.room_number,
                r.type AS room_type,
                b.check_in,
                b.check_out,
                b.status
            FROM bookings b
            JOIN guests g ON b.guest_id = g.guest_id
            JOIN rooms r ON b.room_id = r.room_id
            ORDER BY b.check_in DESC
        `;
        
        const [results] = await db.query(query);
        res.status(200).json(results);
    } catch (error) {
        console.error('Fetch guests error:', error);
        res.status(500).json({ error: 'Failed to fetch guest directory.' });
    }
});

module.exports = router;