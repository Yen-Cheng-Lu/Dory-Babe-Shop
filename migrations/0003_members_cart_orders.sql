-- 會員表（綁定 Line 帳號）
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lineUserId TEXT UNIQUE NOT NULL,
  displayName TEXT,
  pictureUrl TEXT,
  sessionToken TEXT,
  sessionExpiresAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_members_session ON members(sessionToken);

-- 購物車項目（登入會員專用）
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memberId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (memberId) REFERENCES members(id),
  FOREIGN KEY (productId) REFERENCES products(id),
  UNIQUE(memberId, productId)
);

-- 訂單表
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memberId INTEGER NOT NULL,
  note TEXT,
  paymentStatus TEXT NOT NULL DEFAULT 'unpaid',
  shippingStatus TEXT NOT NULL DEFAULT 'unshipped',
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (memberId) REFERENCES members(id)
);

-- 訂單明細
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  productName TEXT NOT NULL,
  productPrice REAL NOT NULL,
  quantity INTEGER NOT NULL,
  imageUrl TEXT,
  FOREIGN KEY (orderId) REFERENCES orders(id),
  FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_member ON cart_items(memberId);
CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(memberId);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(orderId);
