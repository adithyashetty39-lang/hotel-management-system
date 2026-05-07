const db = require('../config/db');

const ensurePromoTables = async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      promo_code VARCHAR(80) PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      discount_type VARCHAR(16) NOT NULL DEFAULT 'PERCENT',
      discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
      max_uses INT NULL,
      used_count INT NOT NULL DEFAULT 0,
      starts_at DATE NULL,
      ends_at DATE NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS booking_promotions (
      booking_id INT NOT NULL,
      promo_code VARCHAR(80) NOT NULL,
      discount_type VARCHAR(16) NOT NULL,
      discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (booking_id),
      KEY idx_booking_promotions_code (promo_code)
    )
  `);
};

const listPromos = async (_req, res) => {
  try {
    await ensurePromoTables();
    const [rows] = await db.execute(
      `SELECT promo_code, title, discount_type, discount_value, max_uses, used_count, starts_at, ends_at, is_active, created_at
       FROM promo_codes
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const upsertPromo = async (req, res) => {
  const {
    promo_code,
    title,
    discount_type = 'PERCENT',
    discount_value = 0,
    max_uses = null,
    starts_at = null,
    ends_at = null,
    is_active = 1
  } = req.body || {};

  if (!promo_code || !title) {
    return res.status(400).json({ error: 'promo_code and title are required.' });
  }

  const normalizedCode = String(promo_code).trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,80}$/.test(normalizedCode)) {
    return res.status(400).json({ error: 'promo_code must be 3-80 chars (A-Z, 0-9, _, -).' });
  }

  const normalizedType = String(discount_type).toUpperCase() === 'FIXED' ? 'FIXED' : 'PERCENT';
  const value = Number(discount_value);
  if (!Number.isFinite(value) || value < 0) {
    return res.status(400).json({ error: 'discount_value must be a non-negative number.' });
  }

  const maxUsesValue = max_uses === '' || max_uses === undefined ? null : max_uses;
  const maxUsesNum = maxUsesValue === null ? null : Number(maxUsesValue);
  if (maxUsesNum !== null && (!Number.isInteger(maxUsesNum) || maxUsesNum < 0)) {
    return res.status(400).json({ error: 'max_uses must be a non-negative integer or null.' });
  }

  try {
    await ensurePromoTables();
    await db.execute(
      `INSERT INTO promo_codes
        (promo_code, title, discount_type, discount_value, max_uses, starts_at, ends_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        discount_type = VALUES(discount_type),
        discount_value = VALUES(discount_value),
        max_uses = VALUES(max_uses),
        starts_at = VALUES(starts_at),
        ends_at = VALUES(ends_at),
        is_active = VALUES(is_active)`,
      [
        normalizedCode,
        String(title).trim(),
        normalizedType,
        value,
        maxUsesNum,
        starts_at || null,
        ends_at || null,
        is_active ? 1 : 0
      ]
    );

    res.status(201).json({ message: 'Promo saved.', promo_code: normalizedCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deletePromo = async (req, res) => {
  const { promo_code } = req.params;
  if (!promo_code) return res.status(400).json({ error: 'promo_code is required.' });

  try {
    await ensurePromoTables();
    const code = String(promo_code).trim().toUpperCase();
    await db.execute('DELETE FROM promo_codes WHERE promo_code = ?', [code]);
    res.json({ message: 'Promo deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  ensurePromoTables,
  listPromos,
  upsertPromo,
  deletePromo
};

