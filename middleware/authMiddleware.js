// File: middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Look for the token in the request headers
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ error: 'Access Denied: No Token Provided!' });

    const token = authHeader.split(' ')[1]; // Extract token after "Bearer"

    try {
        // Verify the token using your secret key
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Attach the user details (like ID and Role) to the request
        next(); // Let the user proceed to the route
    } catch (err) {
        res.status(401).json({ error: 'Invalid Token' });
    }
};

module.exports = { verifyToken };