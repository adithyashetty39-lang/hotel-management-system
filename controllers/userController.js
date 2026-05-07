const db = require('../config/db');
const { buildAvailabilityClause } = require('./publicController');

const ensureGuestFeatureTables = async () => {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS guest_preferences (
            guest_id INT PRIMARY KEY,
            room_view VARCHAR(80) DEFAULT 'Garden view',
            bed_type VARCHAR(80) DEFAULT 'King bed',
            special_requests TEXT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS guest_saved_rooms (
            guest_id INT NOT NULL,
            room_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (guest_id, room_id)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS guest_saved_offers (
            guest_id INT NOT NULL,
            offer_code VARCHAR(80) NOT NULL,
            offer_title VARCHAR(160) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (guest_id, offer_code)
        )
    `);
};

const getTier = (points) => {
    if (points >= 10000) return { name: 'Platinum', next: null, progress: 100 };
    if (points >= 5000) return { name: 'Gold', next: 'Platinum', progress: Math.round((points / 10000) * 100) };
    if (points >= 2000) return { name: 'Silver', next: 'Gold', progress: Math.round((points / 5000) * 100) };
    return { name: 'Bronze', next: 'Silver', progress: Math.round((points / 2000) * 100) };
};

const getStayStatus = (checkInDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    return checkIn <= today ? 'Active' : 'Confirmed';
};

const validateStayDates = (check_in, check_out) => {
    if (!check_in || !check_out) {
        return 'Room, check-in date, and check-out date are required.';
    }

    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);

    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
        return 'Please provide valid check-in and check-out dates.';
    }

    if (checkOutDate <= checkInDate) {
        return 'Check-out date must be after check-in date.';
    }

    return null;
};

const getGuestProfile = async (req, res) => {
    try {
        const [guests] = await db.execute(
            'SELECT guest_id, name, email, phone FROM guests WHERE guest_id = ?',
            [req.user.id]
        );

        if (guests.length === 0) {
            return res.status(404).json({ error: 'Guest profile not found.' });
        }

        res.json({ guest: guests[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getGuestMembership = async (req, res) => {
    try {
        const [summary] = await db.execute(
            `SELECT
                COUNT(b.booking_id) AS total_bookings,
                SUM(CASE WHEN b.status = 'Active' THEN 1 ELSE 0 END) AS active_bookings,
                SUM(
                    COALESCE(
                        i.grand_total,
                        GREATEST(1, DATEDIFF(b.check_out, b.check_in)) * r.price_per_night
                    )
                ) AS lifetime_spend
             FROM bookings b
             JOIN rooms r ON b.room_id = r.room_id
             LEFT JOIN invoices i ON i.booking_id = b.booking_id
             WHERE b.guest_id = ?`,
            [req.user.id]
        );

        const spend = Number(summary[0].lifetime_spend || 0);
        const points = Math.floor(spend / 100);
        const tier = getTier(points);

        res.json({
            points,
            tier: tier.name,
            nextTier: tier.next,
            progress: tier.progress,
            lifetimeSpend: spend,
            totalBookings: Number(summary[0].total_bookings || 0),
            activeBookings: Number(summary[0].active_bookings || 0),
            benefits: [
                'Member-only room rates',
                tier.name === 'Bronze' ? 'Priority support' : 'Room upgrade priority',
                tier.name === 'Platinum' ? 'Personal concierge privileges' : 'Dining credits on eligible stays'
            ]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAvailableRooms = async (req, res) => {
    const { check_in, check_out } = req.query;

    try {
        const availability = buildAvailabilityClause(check_in, check_out);
        const [rooms] = await db.execute(
            `SELECT room_id, room_number, type, price_per_night, status
             FROM rooms r
             WHERE ${availability.sql}
             ORDER BY CAST(room_number AS UNSIGNED), room_number`
            ,
            availability.params
        );

        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getGuestBookings = async (req, res) => {
    try {
        const [bookings] = await db.execute(
            `SELECT
                b.booking_id,
                b.room_id,
                r.room_number,
                r.type AS room_type,
                r.price_per_night,
                b.check_in,
                b.check_out,
                b.status,
                GREATEST(1, DATEDIFF(b.check_out, b.check_in)) AS nights,
                GREATEST(1, DATEDIFF(b.check_out, b.check_in)) * r.price_per_night AS estimated_total
             FROM bookings b
             JOIN rooms r ON b.room_id = r.room_id
             WHERE b.guest_id = ?
             ORDER BY b.check_in DESC, b.booking_id DESC`,
            [req.user.id]
        );

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getGuestInvoices = async (req, res) => {
    try {
        const [invoices] = await db.execute(
            `SELECT
                i.invoice_id,
                i.booking_id,
                CONCAT('INV-', LPAD(i.invoice_id, 5, '0')) AS invoice_no,
                i.room_total,
                i.restaurant_total,
                i.grand_total,
                i.payment_status,
                b.check_in,
                b.check_out,
                r.room_number,
                r.type AS room_type
             FROM invoices i
             JOIN bookings b ON i.booking_id = b.booking_id
             JOIN rooms r ON b.room_id = r.room_id
             WHERE b.guest_id = ?
             ORDER BY i.invoice_id DESC`,
            [req.user.id]
        );

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getGuestPreferences = async (req, res) => {
    try {
        await ensureGuestFeatureTables();

        const [preferences] = await db.execute(
            `SELECT guest_id, room_view, bed_type, special_requests
             FROM guest_preferences
             WHERE guest_id = ?`,
            [req.user.id]
        );

        const [savedRooms] = await db.execute(
            `SELECT r.room_id, r.room_number, r.type, r.price_per_night, r.status
             FROM guest_saved_rooms sr
             JOIN rooms r ON sr.room_id = r.room_id
             WHERE sr.guest_id = ?
             ORDER BY sr.created_at DESC`,
            [req.user.id]
        );

        const [savedOffers] = await db.execute(
            `SELECT offer_code, offer_title, created_at
             FROM guest_saved_offers
             WHERE guest_id = ?
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({
            preferences: preferences[0] || {
                guest_id: req.user.id,
                room_view: 'Garden view',
                bed_type: 'King bed',
                special_requests: ''
            },
            savedRooms,
            savedOffers
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateGuestPreferences = async (req, res) => {
    const { room_view, bed_type, special_requests } = req.body;

    try {
        await ensureGuestFeatureTables();

        await db.execute(
            `INSERT INTO guest_preferences (guest_id, room_view, bed_type, special_requests)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                room_view = VALUES(room_view),
                bed_type = VALUES(bed_type),
                special_requests = VALUES(special_requests)`,
            [
                req.user.id,
                room_view || 'Garden view',
                bed_type || 'King bed',
                special_requests || ''
            ]
        );

        res.json({ message: 'Preferences saved.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const toggleSavedRoom = async (req, res) => {
    const { room_id } = req.body;

    if (!room_id) {
        return res.status(400).json({ error: 'room_id is required.' });
    }

    try {
        await ensureGuestFeatureTables();

        const [existing] = await db.execute(
            'SELECT room_id FROM guest_saved_rooms WHERE guest_id = ? AND room_id = ?',
            [req.user.id, room_id]
        );

        if (existing.length > 0) {
            await db.execute('DELETE FROM guest_saved_rooms WHERE guest_id = ? AND room_id = ?', [req.user.id, room_id]);
            return res.json({ message: 'Room removed from saved list.', saved: false });
        }

        await db.execute('INSERT INTO guest_saved_rooms (guest_id, room_id) VALUES (?, ?)', [req.user.id, room_id]);
        res.json({ message: 'Room saved.', saved: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const toggleSavedOffer = async (req, res) => {
    const { offer_code, offer_title } = req.body;

    if (!offer_code || !offer_title) {
        return res.status(400).json({ error: 'offer_code and offer_title are required.' });
    }

    try {
        await ensureGuestFeatureTables();

        const [existing] = await db.execute(
            'SELECT offer_code FROM guest_saved_offers WHERE guest_id = ? AND offer_code = ?',
            [req.user.id, offer_code]
        );

        if (existing.length > 0) {
            await db.execute('DELETE FROM guest_saved_offers WHERE guest_id = ? AND offer_code = ?', [req.user.id, offer_code]);
            return res.json({ message: 'Offer removed from favorites.', saved: false });
        }

        await db.execute(
            'INSERT INTO guest_saved_offers (guest_id, offer_code, offer_title) VALUES (?, ?, ?)',
            [req.user.id, offer_code, offer_title]
        );
        res.json({ message: 'Offer saved.', saved: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const cancelGuestBooking = async (req, res) => {
    const { booking_id } = req.params;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [bookings] = await connection.execute(
            `SELECT booking_id, room_id, status
             FROM bookings
             WHERE booking_id = ? AND guest_id = ?
             FOR UPDATE`,
            [booking_id, req.user.id]
        );

        if (bookings.length === 0) {
            throw new Error('Booking not found.');
        }

        const booking = bookings[0];
        if (!['Active', 'Pending', 'Confirmed'].includes(booking.status)) {
            throw new Error('Only active or pending bookings can be cancelled.');
        }

        await connection.execute("UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?", [booking_id]);

        if (booking.status === 'Active') {
            await connection.execute("UPDATE rooms SET status = 'Available' WHERE room_id = ?", [booking.room_id]);
        }

        await connection.commit();
        res.json({ message: 'Booking cancelled successfully.' });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
};

const rebookGuestBooking = async (req, res) => {
    const { booking_id } = req.params;
    const { check_in, check_out } = req.body;

    const dateError = validateStayDates(check_in, check_out);
    if (dateError) return res.status(400).json({ error: dateError });

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [oldBookings] = await connection.execute(
            `SELECT room_id
             FROM bookings
             WHERE booking_id = ? AND guest_id = ?`,
            [booking_id, req.user.id]
        );

        if (oldBookings.length === 0) {
            throw new Error('Original booking not found.');
        }

        const roomId = oldBookings[0].room_id;
        const [rooms] = await connection.execute(
            `SELECT room_id, status
             FROM rooms
             WHERE room_id = ? AND LOWER(status) <> 'maintenance'
             FOR UPDATE`,
            [roomId]
        );

        if (rooms.length === 0) {
            throw new Error('The same room is not available for rebooking.');
        }

        const [overlaps] = await connection.execute(
            `SELECT booking_id
             FROM bookings
             WHERE room_id = ?
               AND status IN ('Active', 'Pending', 'Confirmed')
               AND NOT (check_out <= ? OR check_in >= ?)
             LIMIT 1`,
            [roomId, check_in, check_out]
        );

        if (overlaps.length > 0) {
            throw new Error('The same room is not available for those dates.');
        }

        const status = getStayStatus(check_in);
        const [bookingResult] = await connection.execute(
            `INSERT INTO bookings (guest_id, room_id, check_in, check_out, status)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, roomId, check_in, check_out, status]
        );

        if (status === 'Active') {
            await connection.execute("UPDATE rooms SET status = 'Occupied' WHERE room_id = ?", [roomId]);
        }

        await connection.commit();
        res.status(201).json({ message: 'Rebooking created successfully.', booking_id: bookingResult.insertId });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
};

const createGuestBooking = async (req, res) => {
    const { room_id, check_in, check_out } = req.body;

    const dateError = validateStayDates(check_in, check_out);
    if (dateError) return res.status(400).json({ error: dateError });

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [rooms] = await connection.execute(
            `SELECT room_id, status
             FROM rooms
             WHERE room_id = ? AND LOWER(status) <> 'maintenance'
             FOR UPDATE`,
            [room_id]
        );

        if (rooms.length === 0) {
            throw new Error('Room is no longer available.');
        }

        const [overlaps] = await connection.execute(
            `SELECT booking_id
             FROM bookings
             WHERE room_id = ?
               AND status IN ('Active', 'Pending', 'Confirmed')
               AND NOT (check_out <= ? OR check_in >= ?)
             LIMIT 1`,
            [room_id, check_in, check_out]
        );

        if (overlaps.length > 0) {
            throw new Error('Room is already booked for the selected dates.');
        }

        const status = getStayStatus(check_in);
        const [bookingResult] = await connection.execute(
            `INSERT INTO bookings (guest_id, room_id, check_in, check_out, status)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, room_id, check_in, check_out, status]
        );

        if (status === 'Active') {
            await connection.execute(
                "UPDATE rooms SET status = 'Occupied' WHERE room_id = ?",
                [room_id]
            );
        }

        await connection.commit();

        res.status(201).json({
            message: 'Room booked successfully.',
            booking_id: bookingResult.insertId
        });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
    getGuestProfile,
    getGuestMembership,
    getAvailableRooms,
    getGuestBookings,
    getGuestInvoices,
    getGuestPreferences,
    updateGuestPreferences,
    toggleSavedRoom,
    toggleSavedOffer,
    cancelGuestBooking,
    rebookGuestBooking,
    createGuestBooking
};
