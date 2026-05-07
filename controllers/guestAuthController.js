const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const buildGuestPayload = (guest) => ({
    id: guest.guest_id,
    name: guest.name,
    email: guest.email,
    phone: guest.phone
});

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured on the server.');
    }
    return process.env.JWT_SECRET;
};

const registerGuest = async (req, res) => {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    }

    try {
        const [existingGuests] = await db.execute(
            'SELECT guest_id, name, email, phone, password_hash FROM guests WHERE email = ?',
            [email]
        );

        const hashedPassword = await bcrypt.hash(password, 10);
        let guestId;

        if (existingGuests.length > 0) {
            const existingGuest = existingGuests[0];

            if (existingGuest.password_hash) {
                return res.status(409).json({ error: 'An account already exists for this email.' });
            }

            await db.execute(
                'UPDATE guests SET name = ?, phone = ?, password_hash = ? WHERE guest_id = ?',
                [name, phone, hashedPassword, existingGuest.guest_id]
            );
            guestId = existingGuest.guest_id;
        } else {
            const [result] = await db.execute(
                'INSERT INTO guests (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
                [name, email, phone, hashedPassword]
            );
            guestId = result.insertId;
        }

        const token = jwt.sign(
            { id: guestId, role: 'Guest', type: 'guest' },
            getJwtSecret(),
            { expiresIn: '8h' }
        );

        res.status(201).json({
            message: 'Guest account created successfully.',
            token,
            role: 'Guest',
            guest: { id: guestId, name, email, phone }
        });
    } catch (error) {
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({
                error: 'Guest accounts require a password_hash column on the guests table.'
            });
        }

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'An account already exists for this email.' });
        }

        res.status(500).json({ error: error.message });
    }
};

const loginGuest = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const [guests] = await db.execute(
            'SELECT guest_id, name, email, phone, password_hash FROM guests WHERE email = ?',
            [email]
        );

        if (guests.length === 0 || !guests[0].password_hash) {
            return res.status(404).json({ error: 'Guest account not found.' });
        }

        const guest = guests[0];
        const isValidPassword = await bcrypt.compare(password, guest.password_hash);

        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid password.' });
        }

        const token = jwt.sign(
            { id: guest.guest_id, role: 'Guest', type: 'guest' },
            getJwtSecret(),
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Login successful.',
            token,
            role: 'Guest',
            guest: buildGuestPayload(guest)
        });
    } catch (error) {
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({
                error: 'Guest accounts require a password_hash column on the guests table.'
            });
        }

        res.status(500).json({ error: error.message });
    }
};

module.exports = { registerGuest, loginGuest };
