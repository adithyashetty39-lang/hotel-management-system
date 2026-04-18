// File: controllers/invoiceController.js
const db = require('../config/db');

const generateInvoice = async (req, res) => {
    const { booking_id } = req.params; // Get the ID from the URL

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Step 1: Get the Booking & Room Details
        const [bookingInfo] = await connection.execute(
            `SELECT b.check_in, b.check_out, b.status, r.room_id, r.price_per_night 
             FROM bookings b 
             JOIN rooms r ON b.room_id = r.room_id 
             WHERE b.booking_id = ?`,
            [booking_id]
        );

        if (bookingInfo.length === 0 || bookingInfo[0].status !== 'Active') {
            throw new Error('Booking not found or already checked out.');
        }

        const { check_in, check_out, room_id, price_per_night } = bookingInfo[0];

        // Calculate days stayed (ensure at least 1 day is charged)
        const checkInDate = new Date(check_in);
        const checkOutDate = new Date(check_out);
        const timeDifference = checkOutDate.getTime() - checkInDate.getTime();
        let daysStayed = Math.ceil(timeDifference / (1000 * 3600 * 24));
        if (daysStayed <= 0) daysStayed = 1; 

        const room_total = daysStayed * parseFloat(price_per_night);

        // Step 2: Sum up Restaurant Orders using COALESCE (returns 0 if null)
        const [foodData] = await connection.execute(
            `SELECT COALESCE(SUM(total_amount), 0) AS food_total FROM restaurant_orders WHERE booking_id = ?`,
            [booking_id]
        );
        const restaurant_total = parseFloat(foodData[0].food_total);

        // Step 3: Sum up Party Hall Bookings
        const [hallData] = await connection.execute(
            `SELECT COALESCE(SUM(flat_fee), 0) AS hall_total FROM hall_bookings WHERE booking_id = ?`,
            [booking_id]
        );
        const hall_total = parseFloat(hallData[0].hall_total);

        // Step 4: Calculate Grand Total
        const grand_total = room_total + restaurant_total + hall_total;

        // Step 5: Create the Final Invoice Record
        const [invoiceResult] = await connection.execute(
            `INSERT INTO invoices (booking_id, room_total, restaurant_total, hall_total, grand_total, payment_status) 
             VALUES (?, ?, ?, ?, ?, 'Paid')`,
            [booking_id, room_total, restaurant_total, hall_total, grand_total]
        );

        // Step 6: Close out the Booking
        await connection.execute(
            `UPDATE bookings SET status = 'Completed' WHERE booking_id = ?`,
            [booking_id]
        );

        // Step 7: Free up the Room (Set to Maintenance for cleaning)
        await connection.execute(
            `UPDATE rooms SET status = 'Maintenance' WHERE room_id = ?`,
            [room_id]
        );

        // Commit the transaction!
        await connection.commit();

        res.status(200).json({
            message: 'Checkout successful! Invoice generated.',
            invoice_id: invoiceResult.insertId,
            breakdown: {
                days_stayed: daysStayed,
                room_charges: room_total,
                restaurant_charges: restaurant_total,
                party_hall_charges: hall_total,
                grand_total: grand_total
            }
        });

    } catch (error) {
        await connection.rollback();
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
};

module.exports = { generateInvoice };