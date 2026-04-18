// File: controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. Register a new staff member
const registerStaff = async (req, res) => {
    const { name, role, email, password } = req.body;

    try {
        // Hash the password for security
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert into database
        const query = `INSERT INTO users (name, role, email, password_hash) VALUES (?, ?, ?, ?)`;
        const [result] = await db.execute(query, [name, role, email, hashedPassword]);

        res.status(201).json({ message: 'Staff registered successfully!', userId: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
};

// 2. Login Staff
const loginStaff = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const query = `SELECT * FROM users WHERE email = ?`;
        const [users] = await db.execute(query, [email]);
        
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const user = users[0];

        // Compare passwords
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        // Generate JWT Token (Expires in 8 hours for a standard shift)
        const token = jwt.sign(
            { id: user.user_id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );

        res.json({ message: 'Login successful', token, role: user.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { registerStaff, loginStaff };