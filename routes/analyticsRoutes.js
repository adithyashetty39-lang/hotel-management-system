const express = require('express');
const router = express.Router();
const db = require('../config/db');

// --- GET /api/analytics/dashboard: Fetch Real-Time Metrics ---
router.get('/dashboard', async (req, res) => {
    try {
        // 1. Get exact revenue breakdown directly from the new invoices table!
        const [revenueData] = await db.query(`
            SELECT 
                COALESCE(SUM(room_total), 0) AS room_revenue,
                COALESCE(SUM(restaurant_total), 0) AS pos_revenue,
                COALESCE(SUM(grand_total), 0) AS total_revenue
            FROM invoices
            WHERE payment_status = 'Paid'
        `);

        // 2. Get "Currently Hosted" (Guests physically in a room right now)
        const [activeResult] = await db.query(`
            SELECT COUNT(*) AS active_guests
            FROM bookings
            WHERE status = 'Active'
        `);

        // 3. Get "Today's Arrivals" using strict local system date matching
        const [arrivalsResult] = await db.query(`
            SELECT COUNT(*) AS todays_arrivals
            FROM bookings
            WHERE DATE(check_in) = CURDATE()
        `);

        res.status(200).json({
            revenue: Number(revenueData[0].total_revenue),
            roomRevenue: Number(revenueData[0].room_revenue),
            posRevenue: Number(revenueData[0].pos_revenue),
            hosted: activeResult[0].active_guests,
            arrivals: arrivalsResult[0].todays_arrivals
        });

    } catch (error) {
        console.error('Analytics Engine Error:', error);
        res.status(500).json({ error: 'Failed to generate financial report.' });
    }
});

module.exports = router;