const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize App
const app = express();

// Import Database connection
const db = require('./config/db');

// 1. IMPORT ALL ROUTES (Grouped cleanly together)
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes'); 
const bookingRoutes = require('./routes/bookingRoutes'); 
const restaurantRoutes = require('./routes/restaurantRoutes');
const hallRoutes = require('./routes/hallRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const guestRoutes = require('./routes/guestRoutes');

// 2. MIDDLEWARE
app.use(cors()); 
app.use(express.json());

// 3. USE ROUTES (No duplicates!)
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes); 
app.use('/api/bookings', bookingRoutes); 
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/halls', hallRoutes);   
app.use('/api/invoices', invoiceRoutes); 
app.use('/api/analytics', analyticsRoutes); 
app.use('/api/guests', guestRoutes);

// Basic Test Route
app.get('/', (req, res) => {
    res.send('Hotel Management API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});