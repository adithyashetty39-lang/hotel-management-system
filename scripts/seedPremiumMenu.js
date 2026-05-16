require('dotenv').config();
const db = require('../config/db');

const menuItems = [
  ['Paneer Pepper Fry', 'Starters', 320, 'Crisp paneer with curry leaf pepper masala', 1, 0, 0],
  ['Tandoori Broccoli', 'Starters', 340, 'Charred broccoli, hung curd marinade, almond dust', 0, 1, 0],
  ['Chicken Ghee Roast Bites', 'Starters', 420, 'Coastal spice, neer dosa crisp, lime', 1, 0, 0],
  ['Malabar Prawn Fry', 'Starters', 520, 'Prawns tossed with coconut, chilli, curry leaves', 0, 1, 0],
  ['Butter Chicken', 'Mains', 620, 'Classic tomato makhani curry with tender chicken', 1, 1, 0],
  ['Paneer Lababdar', 'Mains', 540, 'Paneer in rich cashew tomato gravy', 0, 0, 0],
  ['Mangalore Fish Curry', 'Mains', 680, 'Seer fish curry with coconut and kokum', 1, 1, 0],
  ['Mutton Pepper Fry', 'Mains', 760, 'Slow-cooked mutton with black pepper and shallots', 0, 1, 0],
  ['Vegetable Biryani', 'Mains', 480, 'Fragrant basmati, saffron, seasonal vegetables', 0, 0, 0],
  ['Chicken Dum Biryani', 'Mains', 580, 'Layered basmati rice, spiced chicken, raita', 1, 0, 0],
  ['GudBud', 'Desserts', 260, 'Mangalore special layered ice cream sundae', 1, 0, 1],
  ['Tender Coconut Pudding', 'Desserts', 240, 'Silky coconut pudding with palm sugar caramel', 0, 0, 1],
  ['Filter Coffee Tiramisu', 'Desserts', 310, 'Mascarpone, coffee-soaked sponge, cocoa', 0, 1, 1],
  ['Gulab Jamun Cheesecake', 'Desserts', 290, 'Baked cheesecake with warm gulab jamun compote', 0, 0, 0],
  ['Fresh Lime Soda', 'Drinks', 160, 'Sweet, salted, or mixed', 0, 0, 0],
  ['Kokum Cooler', 'Drinks', 180, 'Kokum, lime, mint, sparkling water', 0, 0, 0],
  ['Cold Coffee', 'Drinks', 220, 'House blend coffee, vanilla, cream', 0, 0, 0],
  ['Virgin Mojito', 'Drinks', 240, 'Mint, lime, soda, crushed ice', 0, 0, 0]
];

const run = async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS menu_items (
      item_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      category VARCHAR(80) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      image_url TEXT NULL,
      description TEXT NULL,
      is_bestseller TINYINT(1) NOT NULL DEFAULT 0,
      is_chef_pick TINYINT(1) NOT NULL DEFAULT 0,
      is_dessert_week TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Fix: rename CudBud -> GudBud and update its price and details
  await db.execute(`
    UPDATE menu_items
    SET name = 'GudBud',
        category = 'Desserts',
        price = 260,
        description = 'Mangalore special layered ice cream sundae',
        is_bestseller = 1,
        is_chef_pick = 0,
        is_dessert_week = 1,
        is_active = 1
    WHERE LOWER(name) IN ('cudbud', 'gudbud')
  `);

  // Fix: update Butter Chicken price to 620
  await db.execute(`
    UPDATE menu_items
    SET price = 620,
        description = 'Classic tomato makhani curry with tender chicken',
        is_bestseller = 1,
        is_chef_pick = 1,
        is_active = 1
    WHERE name = 'Butter Chicken'
  `);

  // Add new items if they don't already exist
  for (const [name, category, price, description, isBestseller, isChefPick, isDessertWeek] of menuItems) {
    await db.execute(
      `INSERT INTO menu_items
        (name, category, price, description, is_bestseller, is_chef_pick, is_dessert_week, is_active)
       SELECT ?, ?, ?, ?, ?, ?, ?, 1
       WHERE NOT EXISTS (
         SELECT 1 FROM menu_items WHERE name = ? AND is_active = 1
       )`,
      [name, category, price, description, isBestseller, isChefPick, isDessertWeek, name]
    );
  }

  const [rows] = await db.execute(
    `SELECT item_id, name, category, price
     FROM menu_items
     WHERE is_active = 1
     ORDER BY category, name`
  );
  console.table(rows);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.code || error.message);
    console.error(error.message);
    process.exit(1);
  });
