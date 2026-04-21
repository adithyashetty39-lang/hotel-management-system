const express = require('express');
const router = express.Router();
const db = require('../config/db');

// --- GET /api/rooms: Fetch all rooms ---
router.get('/', async (req, res) => {
    try {
        const [rooms] = await db.query('SELECT * FROM rooms');
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- POST /api/rooms: Add a NEW room ---
router.post('/', async (req, res) => {
    const { room_number, type, price_per_night, status } = req.body;
    try {
        await db.query(
            'INSERT INTO rooms (room_number, type, price_per_night, status) VALUES (?, ?, ?, ?)',
            [room_number, type, price_per_night, status]
        );
        res.status(201).json({ message: 'Room created successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// --- PUT /api/rooms/:id: UPDATE an existing room ---
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { room_number, type, price_per_night, status } = req.body;
    try {
        await db.query(
            'UPDATE rooms SET room_number = ?, type = ?, price_per_night = ?, status = ? WHERE room_id = ?',
            [room_number, type, price_per_night, status, id]
        );
        res.json({ message: 'Room updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update room' });
    }
});

// --- DELETE /api/rooms/:id: DELETE a room ---
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM rooms WHERE room_id = ?', [id]);
        res.json({ message: 'Room deleted successfully' });
    } catch (err) {
        // Smart Database Protection: You can't delete a room if guests have stayed in it!
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Cannot delete room: It has existing booking history. Change status to Maintenance instead.' });
        }
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

module.exports = router;