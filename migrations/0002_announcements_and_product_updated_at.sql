-- Dory Babee Shop 佈告欄表
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  isActive INTEGER DEFAULT 1,
  orderIndex INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- 商品表新增最後修改時間
ALTER TABLE products ADD COLUMN updatedAt TEXT;
UPDATE products SET updatedAt = createdAt WHERE updatedAt IS NULL;
