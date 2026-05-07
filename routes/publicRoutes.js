const express = require('express');
const router = express.Router();
const { getPublicRooms, getPublicOffers } = require('../controllers/publicController');

router.get('/rooms', getPublicRooms);
router.get('/offers', getPublicOffers);

module.exports = router;
