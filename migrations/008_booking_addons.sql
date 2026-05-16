CREATE TABLE IF NOT EXISTS booking_addons (
  booking_addon_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  addon_code VARCHAR(80) NOT NULL,
  addon_title VARCHAR(160) NOT NULL,
  addon_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_booking_addons_booking (booking_id)
);
