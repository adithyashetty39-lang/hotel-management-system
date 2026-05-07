const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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
const guestAuthRoutes = require('./routes/guestAuthRoutes');
const userRoutes = require('./routes/userRoutes');
const publicRoutes = require('./routes/publicRoutes');
const promoRoutes = require('./routes/promoRoutes');

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
app.use('/api/guest-auth', guestAuthRoutes);
app.use('/api/user', userRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/promos', promoRoutes);

// Basic Test Route
app.get('/', (req, res) => {
    res.send('Hotel Management API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
