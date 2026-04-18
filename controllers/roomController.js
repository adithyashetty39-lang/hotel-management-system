// File: controllers/roomController.js
const db = require('../config/db');

// 1. Add a new room (Usually done by an Admin or Manager)
const addRoom = async (req, res) => {
    // req.user comes from our authMiddleware!
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
        return res.status(403).json({ error: 'Only Admins or Managers can add rooms.' });
    }

    const { room_number, type, price_per_night } = req.body;

    try {
        const query = `INSERT INTO rooms (room_number, type, price_per_night) VALUES (?, ?, ?)`;
        await db.execute(query, [room_number, type, price_per_night]);
        res.status(201).json({ message: `Room ${room_number} added successfully!` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Room number already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
};

// 2. Get ALL rooms (For the Manager's master dashboard)
const getAllRooms = async (req, res) => {
    try {
        const [rooms] = await db.execute('SELECT * FROM rooms');
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Get ONLY Available rooms (For the Receptionist checking someone in)
const getAvailableRooms = async (req, res) => {
    try {
        const query = `SELECT room_id, room_number, type, price_per_night FROM rooms WHERE status = 'Available'`;
        const [rooms] = await db.execute(query);
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { addRoom, getAllRooms, getAvailableRooms };