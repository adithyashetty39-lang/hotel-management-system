const db = require('../config/db');

const defaultShowcase = {
  most_ordered_title: 'Butter Chicken Royale',
  most_ordered_subtitle: '412 orders this month',
  chef_recommendation_title: 'Wagyu Tenderloin',
  chef_recommendation_subtitle: 'Guests rate it 4.9/5',
  dessert_week_title: 'Belgian Chocolate Dome',
  dessert_week_subtitle: 'Pairs with Ethiopian roast'
};

const ensureDiningTables = async () => {
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

  const ensureColumn = async (columnName, ddl) => {
    const [existing] = await db.execute(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'menu_items'
         AND COLUMN_NAME = ?`,
      [columnName]
    );
    if (existing.length === 0) {
      try {
        await db.execute(`ALTER TABLE menu_items ADD COLUMN ${ddl}`);
      } catch (error) {
        // Safe for concurrent startup requests trying to add same column.
        if (error && error.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
    }
  };

  // Backward-compatible upgrades for existing installations that already had menu_items.
  await ensureColumn('image_url', 'image_url TEXT NULL');
  await ensureColumn('description', 'description TEXT NULL');
  await ensureColumn('is_bestseller', 'is_bestseller TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn('is_chef_pick', 'is_chef_pick TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn('is_dessert_week', 'is_dessert_week TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn('is_active', 'is_active TINYINT(1) NOT NULL DEFAULT 1');
  await ensureColumn('created_at', 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

  // If legacy column exists, sync availability into is_active.
  try {
    await db.execute(`UPDATE menu_items SET is_active = COALESCE(is_available, is_active)`);
  } catch {
    // ignore if legacy column is absent
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS dining_showcase (
      showcase_id INT PRIMARY KEY,
      most_ordered_title VARCHAR(180) NOT NULL,
      most_ordered_subtitle VARCHAR(255) NOT NULL,
      chef_recommendation_title VARCHAR(180) NOT NULL,
      chef_recommendation_subtitle VARCHAR(255) NOT NULL,
      dessert_week_title VARCHAR(180) NOT NULL,
      dessert_week_subtitle VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute(
    `INSERT IGNORE INTO dining_showcase
      (showcase_id, most_ordered_title, most_ordered_subtitle, chef_recommendation_title, chef_recommendation_subtitle, dessert_week_title, dessert_week_subtitle)
     VALUES (1, ?, ?, ?, ?, ?, ?)`,
    [
      defaultShowcase.most_ordered_title,
      defaultShowcase.most_ordered_subtitle,
      defaultShowcase.chef_recommendation_title,
      defaultShowcase.chef_recommendation_subtitle,
      defaultShowcase.dessert_week_title,
      defaultShowcase.dessert_week_subtitle
    ]
  );
};

const listMenuItems = async (_req, res) => {
  try {
    await ensureDiningTables();
    const [rows] = await db.execute(
      `SELECT item_id AS menu_item_id, name, category, price, image_url, description, is_bestseller, is_chef_pick, is_dessert_week, is_active, created_at
       FROM menu_items
       WHERE is_active = 1
       ORDER BY is_bestseller DESC, created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listAllMenuItemsAdmin = async (_req, res) => {
  try {
    await ensureDiningTables();
    const [rows] = await db.execute(
      `SELECT item_id AS menu_item_id, name, category, price, image_url, description, is_bestseller, is_chef_pick, is_dessert_week, is_active, created_at
       FROM menu_items
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const upsertMenuItem = async (req, res) => {
  const {
    menu_item_id,
    name,
    category,
    price,
    image_url = null,
    description = null,
    is_bestseller = 0,
    is_chef_pick = 0,
    is_dessert_week = 0,
    is_active = 1
  } = req.body || {};

  if (!name || !category || price === undefined || price === null) {
    return res.status(400).json({ error: 'name, category, and price are required.' });
  }

  const normalizedPrice = Number(price);
  if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
    return res.status(400).json({ error: 'price must be a non-negative number.' });
  }

  try {
    await ensureDiningTables();

    if (menu_item_id) {
      await db.execute(
        `UPDATE menu_items
         SET name = ?, category = ?, price = ?, image_url = ?, description = ?, is_bestseller = ?, is_chef_pick = ?, is_dessert_week = ?, is_active = ?
         WHERE item_id = ?`,
        [
          String(name).trim(),
          String(category).trim(),
          normalizedPrice,
          image_url || null,
          description || null,
          is_bestseller ? 1 : 0,
          is_chef_pick ? 1 : 0,
          is_dessert_week ? 1 : 0,
          is_active ? 1 : 0,
          menu_item_id
        ]
      );

      return res.json({ message: 'Menu item updated.', menu_item_id });
    }

    const [result] = await db.execute(
      `INSERT INTO menu_items
       (name, category, price, image_url, description, is_bestseller, is_chef_pick, is_dessert_week, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        String(category).trim(),
        normalizedPrice,
        image_url || null,
        description || null,
        is_bestseller ? 1 : 0,
        is_chef_pick ? 1 : 0,
        is_dessert_week ? 1 : 0,
        is_active ? 1 : 0
      ]
    );

    res.status(201).json({ message: 'Menu item created.', menu_item_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteMenuItem = async (req, res) => {
  const { id } = req.params;
  try {
    await ensureDiningTables();
    await db.execute('UPDATE menu_items SET is_active = 0 WHERE item_id = ?', [id]);
    res.json({ message: 'Menu item archived.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDiningShowcase = async (_req, res) => {
  try {
    await ensureDiningTables();
    const [showcaseRows] = await db.execute(
      `SELECT most_ordered_title, most_ordered_subtitle, chef_recommendation_title, chef_recommendation_subtitle, dessert_week_title, dessert_week_subtitle, updated_at
       FROM dining_showcase
       WHERE showcase_id = 1`
    );

    const [featuredRows] = await db.execute(
      `SELECT item_id AS menu_item_id, name, category, price, image_url, description, is_bestseller, is_chef_pick, is_dessert_week
       FROM menu_items
       WHERE is_active = 1
       ORDER BY is_bestseller DESC, is_chef_pick DESC, created_at DESC
       LIMIT 12`
    );

    res.json({
      showcase: showcaseRows[0] || defaultShowcase,
      dishes: featuredRows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateDiningShowcase = async (req, res) => {
  const {
    most_ordered_title,
    most_ordered_subtitle,
    chef_recommendation_title,
    chef_recommendation_subtitle,
    dessert_week_title,
    dessert_week_subtitle
  } = req.body || {};

  if (
    !most_ordered_title ||
    !most_ordered_subtitle ||
    !chef_recommendation_title ||
    !chef_recommendation_subtitle ||
    !dessert_week_title ||
    !dessert_week_subtitle
  ) {
    return res.status(400).json({ error: 'All showcase fields are required.' });
  }

  try {
    await ensureDiningTables();
    await db.execute(
      `UPDATE dining_showcase
       SET most_ordered_title = ?, most_ordered_subtitle = ?,
           chef_recommendation_title = ?, chef_recommendation_subtitle = ?,
           dessert_week_title = ?, dessert_week_subtitle = ?
       WHERE showcase_id = 1`,
      [
        String(most_ordered_title).trim(),
        String(most_ordered_subtitle).trim(),
        String(chef_recommendation_title).trim(),
        String(chef_recommendation_subtitle).trim(),
        String(dessert_week_title).trim(),
        String(dessert_week_subtitle).trim()
      ]
    );

    res.json({ message: 'Dining showcase updated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  ensureDiningTables,
  listMenuItems,
  listAllMenuItemsAdmin,
  upsertMenuItem,
  deleteMenuItem,
  getDiningShowcase,
  updateDiningShowcase
};

