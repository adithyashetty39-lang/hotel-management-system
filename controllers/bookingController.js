// File: controllers/bookingController.js
const db = require('../config/db');

const checkInGuest = async (req, res) => {
    // 1. Get data from the frontend request
    const { name, phone, email, room_id, check_in, check_out } = req.body;
    
    // 2. Grab a dedicated database connection for our Transaction
    const connection = await db.getConnection();

    try {
        // Start the Transaction: "Do all of these, or do none of them"
        await connection.beginTransaction();

        // Step A: Double-check if the room is actually available
        const [rooms] = await connection.execute(
            `SELECT status FROM rooms WHERE room_id = ?`, 
            [room_id]
        );
        
        if (rooms.length === 0 || rooms[0].status !== 'Available') {
            throw new Error('Room is not available or does not exist.');
        }

        // Step B: Register the Guest
        const [guestResult] = await connection.execute(
            `INSERT INTO guests (name, phone, email) VALUES (?, ?, ?)`,
            [name, phone, email]
        );
        const guest_id = guestResult.insertId;

        // Step C: Create the Booking Record
        const [bookingResult] = await connection.execute(
            `INSERT INTO bookings (guest_id, room_id, check_in, check_out, status) VALUES (?, ?, ?, ?, 'Active')`,
            [guest_id, room_id, check_in, check_out]
        );

        // Step D: Change Room Status to 'Occupied'
        await connection.execute(
            `UPDATE rooms SET status = 'Occupied' WHERE room_id = ?`,
            [room_id]
        );

        // If everything above succeeded, permanently save (commit) the changes!
        await connection.commit();
        
        res.status(201).json({ 
            message: 'Guest successfully checked in!', 
            booking_id: bookingResult.insertId,
            guest_id: guest_id
        });

    } catch (error) {
        // If ANY step failed, undo (rollback) the entire process
        await connection.rollback();
        res.status(400).json({ error: error.message });
    } finally {
        // Release the connection back to the pool
        connection.release();
    }
};

module.exports = { checkInGuest };