const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { listPromos, upsertPromo, deletePromo } = require('../controllers/promoController');

const requireAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Admin access only.' });
  }
  next();
};

router.use(verifyToken);
router.use(requireAdmin);

router.get('/', listPromos);
router.post('/', upsertPromo);
router.put('/:promo_code', upsertPromo);
router.delete('/:promo_code', deletePromo);

module.exports = router;

