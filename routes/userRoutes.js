const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/userController');

const verifyGuest = (req, res, next) => {
    if (req.user?.role !== 'Guest' || req.user?.type !== 'guest') {
        return res.status(403).json({ error: 'Guest access only.' });
    }

    next();
};

router.use(verifyToken);
router.use(verifyGuest);

router.get('/profile', getGuestProfile);
router.get('/membership', getGuestMembership);
router.get('/rooms/available', getAvailableRooms);
router.get('/bookings', getGuestBookings);
router.post('/bookings', createGuestBooking);
router.post('/bookings/:booking_id/cancel', cancelGuestBooking);
router.post('/bookings/:booking_id/rebook', rebookGuestBooking);
router.get('/invoices', getGuestInvoices);
router.get('/preferences', getGuestPreferences);
router.put('/preferences', updateGuestPreferences);
router.post('/saved-rooms/toggle', toggleSavedRoom);
router.post('/saved-offers/toggle', toggleSavedOffer);

module.exports = router;
