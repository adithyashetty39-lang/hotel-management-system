-- Run this once before enabling guest self-service login.
-- If your MySQL version supports IF NOT EXISTS, you can use it here.

ALTER TABLE guests
ADD COLUMN password_hash VARCHAR(255) NULL;

-- Recommended after cleaning any duplicate guest emails:
-- ALTER TABLE guests ADD UNIQUE KEY uq_guests_email (email);
