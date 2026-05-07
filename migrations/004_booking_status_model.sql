ALTER TABLE bookings
MODIFY status ENUM('Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled') DEFAULT 'Pending';
