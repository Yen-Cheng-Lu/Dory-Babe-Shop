-- Dory Babee Shop 商品表
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  detailedDescription TEXT,
  price REAL NOT NULL,
  maxPrice REAL,
  imageUrl TEXT NOT NULL,
  galleryImages TEXT,
  category TEXT,
  orderIndex INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now'))
);
