CREATE TABLE IF NOT EXISTS guest_preferences (
    guest_id INT PRIMARY KEY,
    room_view VARCHAR(80) DEFAULT 'Garden view',
    bed_type VARCHAR(80) DEFAULT 'King bed',
    special_requests TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guest_saved_rooms (
    guest_id INT NOT NULL,
    room_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guest_id, room_id)
);

CREATE TABLE IF NOT EXISTS guest_saved_offers (
    guest_id INT NOT NULL,
    offer_code VARCHAR(80) NOT NULL,
    offer_title VARCHAR(160) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guest_id, offer_code)
);
