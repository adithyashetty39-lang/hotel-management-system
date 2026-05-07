const express = require('express');
const router = express.Router();
const { getPublicRooms, getPublicOffers } = require('../controllers/publicController');
const { getDiningShowcase } = require('../controllers/diningController');

router.get('/rooms', getPublicRooms);
router.get('/offers', getPublicOffers);
router.get('/dining', getDiningShowcase);

module.exports = router;
