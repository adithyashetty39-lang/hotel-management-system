-- Promo codes (admin managed) + booking promotion linkage.

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
);

CREATE TABLE IF NOT EXISTS booking_promotions (
  booking_id INT NOT NULL,
  promo_code VARCHAR(80) NOT NULL,
  discount_type VARCHAR(16) NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (booking_id),
  KEY idx_booking_promotions_code (promo_code)
);

