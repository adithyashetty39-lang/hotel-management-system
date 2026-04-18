const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize App
const app = express();

// Middleware
app.use(cors()); 
app.use(express.json()); 

// Import Database connection
const db = require('./config/db');

// Import Routes (Declared only once!)
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes'); 
const bookingRoutes = require('./routes/bookingRoutes'); 
const restaurantRoutes = require('./routes/restaurantRoutes');// <-- New line
const hallRoutes = require('./routes/hallRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes); 
app.use('/api/bookings', bookingRoutes); // <-- New line
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/halls', hallRoutes);   
app.use('/api/invoices', invoiceRoutes); 
// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes); 

// Basic Test Route
app.get('/', (req, res) => {
    res.send('Hotel Management API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});