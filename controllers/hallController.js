// File: controllers/hallController.js
const db = require('../config/db');

// 1. Book the Party Hall
const bookHall = async (req, res) => {
    // booking_id links the hall fee to the guest's main hotel room bill
    const { booking_id, event_date, time_slot, flat_fee } = req.body;

    try {
        // Step 1: Verify the guest's booking is currently active
        const [booking] = await db.execute(
            `SELECT status FROM bookings WHERE booking_id = ?`, 
            [booking_id]
        );
        
        if (booking.length === 0 || booking[0].status !== 'Active') {
            return res.status(400).json({ error: 'Invalid or inactive hotel booking ID.' });
        }

        // Step 2: Attempt to book the hall
        const query = `INSERT INTO hall_bookings (booking_id, event_date, time_slot, flat_fee, status) VALUES (?, ?, ?, ?, 'Confirmed')`;
        
        const [result] = await db.execute(query, [booking_id, event_date, time_slot, flat_fee]);

        res.status(201).json({ 
            message: 'Party Hall booked successfully!', 
            hall_booking_id: result.insertId 
        });

    } catch (error) {
        // Step 3: Catch the Double-Booking Error!
        // MySQL will throw 'ER_DUP_ENTRY' because of our UNIQUE constraint
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                error: `The hall is already booked for ${time_slot} on ${event_date}. Please choose another slot.` 
            });
        }
        res.status(500).json({ error: error.message });
    }
};

// 2. Get all hall bookings (Useful for the Manager's calendar view)
const getAllHallBookings = async (req, res) => {
    try {
        const query = `SELECT * FROM hall_bookings ORDER BY event_date ASC`;
        const [bookings] = await db.execute(query);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { bookHall, getAllHallBookings };