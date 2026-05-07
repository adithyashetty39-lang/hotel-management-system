CREATE TABLE IF NOT EXISTS room_public_details (
    room_id INT PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    capacity INT DEFAULT 2,
    rating DECIMAL(2,1) DEFAULT 4.8,
    popular TINYINT(1) DEFAULT 0,
    image_url TEXT,
    gallery_json TEXT,
    description TEXT,
    amenities_json TEXT,
    included_json TEXT,
    policy TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotel_offers (
    offer_code VARCHAR(80) PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    tag VARCHAR(80) NOT NULL,
    discount_label VARCHAR(80) NOT NULL,
    discount_type VARCHAR(24) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    starts_at DATE NULL,
    ends_at DATE NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
