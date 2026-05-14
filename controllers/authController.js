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
// 3. Change Staff Password
const changeStaffPassword = async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    try {
        const [users] = await db.execute(
            'SELECT password_hash FROM users WHERE user_id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isValid = await bcrypt.compare(current_password, users[0].password_hash);
        if (!isValid) {
            return res.status(400).json({ error: 'Current password is incorrect.' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.execute(
            'UPDATE users SET password_hash = ? WHERE user_id = ?',
            [hashedPassword, req.user.id]
        );

        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { registerStaff, loginStaff, changeStaffPassword };