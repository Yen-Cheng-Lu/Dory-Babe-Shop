import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
const db = new Database("products.db");
const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-change-in-production";

// Create products table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    detailedDescription TEXT,
    price REAL NOT NULL,
    imageUrl TEXT NOT NULL,
    galleryImages TEXT,
    orderIndex INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

try {
  db.exec("ALTER TABLE products ADD COLUMN detailedDescription TEXT");
} catch (e) {
  // Ignore if column already exists
}

try {
  db.exec("ALTER TABLE products ADD COLUMN galleryImages TEXT");
} catch (e) {
  // Ignore if column already exists
}

try {
  db.exec("ALTER TABLE products ADD COLUMN orderIndex INTEGER DEFAULT 0");
} catch (e) {
  // Ignore if column already exists
}

try {
  db.exec("ALTER TABLE products ADD COLUMN maxPrice REAL");
} catch (e) {
  // Ignore if column already exists
}

try {
  db.exec("ALTER TABLE products ADD COLUMN category TEXT");
} catch (e) {
  // Ignore if column already exists
}

try {
  db.exec("ALTER TABLE products ADD COLUMN updatedAt TEXT");
  db.exec("UPDATE products SET updatedAt = createdAt WHERE updatedAt IS NULL");
} catch (e) {
  // Ignore if column already exists
}

// Create announcements table
db.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    orderIndex INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )
`);

// Members, cart, orders
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lineUserId TEXT UNIQUE NOT NULL,
    displayName TEXT,
    pictureUrl TEXT,
    sessionToken TEXT,
    sessionExpiresAt TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_members_session ON members(sessionToken)`);
db.exec(`
  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memberId INTEGER NOT NULL,
    productId INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now')),
    UNIQUE(memberId, productId)
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memberId INTEGER NOT NULL,
    note TEXT,
    paymentStatus TEXT NOT NULL DEFAULT 'unpaid',
    shippingStatus TEXT NOT NULL DEFAULT 'unshipped',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER NOT NULL,
    productId INTEGER NOT NULL,
    productName TEXT NOT NULL,
    productPrice REAL NOT NULL,
    quantity INTEGER NOT NULL,
    imageUrl TEXT
  )
`);

function getMemberFromToken(token: string | undefined): { id: number } | null {
  if (!token || !token.startsWith("Bearer ")) return null;
  const t = token.slice(7);
  const row = db.prepare(
    "SELECT id FROM members WHERE sessionToken = ? AND (sessionExpiresAt IS NULL OR sessionExpiresAt > datetime('now'))"
  ).get(t) as { id: number } | undefined;
  return row ? { id: row.id } : null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get("/api/products", (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || "15", 10)));
      const category = (req.query.category as string) || "";
      const offset = (page - 1) * limit;

      const categoryFilter = category && category !== "全部" ? " WHERE category = ?" : "";
      const categoryParam = category && category !== "全部" ? category : null;

      const countSql = `SELECT COUNT(*) as total FROM products${categoryFilter}`;
      const total = (categoryParam
        ? db.prepare(countSql).get(categoryParam)
        : db.prepare(countSql).get()) as { total: number };

      const productsSql = `SELECT * FROM products${categoryFilter} ORDER BY orderIndex ASC, createdAt DESC LIMIT ? OFFSET ?`;
      const allProducts = categoryParam
        ? db.prepare(productsSql).all(categoryParam, limit, offset)
        : db.prepare(productsSql).all(limit, offset);
      const parsedProducts = (allProducts as Record<string, unknown>[]).map(p =>
        ({ ...p, galleryImages: JSON.parse((p.galleryImages as string) || "[]") })
      );

      const categoriesRows = db.prepare("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category").all() as { category: string }[];
      const categories = categoriesRows.map((r) => r.category);

      res.json({
        products: parsedProducts,
        total: total.total,
        page,
        limit,
        hasMore: offset + parsedProducts.length < total.total,
        categories,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", (req, res) => {
    try {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(Number(req.params.id));
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json({ ...product, galleryImages: JSON.parse(product.galleryImages || '[]') });
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", (req, res) => {
    try {
      const { name, description, detailedDescription, price, maxPrice, imageUrl, galleryImages, category } = req.body;
      
      if (!name || price === undefined || !imageUrl) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const stmt = db.prepare(`
        INSERT INTO products (name, description, detailedDescription, price, maxPrice, imageUrl, galleryImages, category, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      const result = stmt.run(name, description, detailedDescription, price, maxPrice ?? null, imageUrl, JSON.stringify(galleryImages || []), category || null);
      
      const newProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid);
      res.status(201).json({ ...newProduct, galleryImages: JSON.parse(newProduct.galleryImages || '[]') });
    } catch (error) {
      console.error("Error adding product:", error);
      res.status(500).json({ error: "Failed to add product" });
    }
  });

  app.put("/api/products/reorder", (req, res) => {
    try {
      const { updates } = req.body;
      const stmt = db.prepare("UPDATE products SET orderIndex = ? WHERE id = ?");
      
      const transaction = db.transaction((updatesArray) => {
        for (const update of updatesArray) {
          stmt.run(update.orderIndex, update.id);
        }
      });
      
      transaction(updates);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering products:", error);
      res.status(500).json({ error: "Failed to reorder products" });
    }
  });

  app.post("/api/products/migrate", (req, res) => {
    try {
      const { products } = req.body;
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: "products must be a non-empty array" });
      }

      const stmt = db.prepare(`
        INSERT INTO products (name, description, detailedDescription, price, maxPrice, imageUrl, galleryImages, category, orderIndex, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((productsArray) => {
        for (let i = 0; i < productsArray.length; i++) {
          const p = productsArray[i];
          stmt.run(
            p.name,
            p.description || null,
            p.detailedDescription || null,
            p.price,
            p.maxPrice ?? null,
            p.imageUrl,
            JSON.stringify(p.galleryImages || []),
            p.category || null,
            p.orderIndex ?? i,
            p.createdAt || new Date().toISOString()
          );
        }
      });

      transaction(products);
      res.json({ success: true, migrated: products.length });
    } catch (error) {
      console.error("Error migrating products:", error);
      res.status(500).json({ error: "Failed to migrate products" });
    }
  });

  app.put("/api/products/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, description, detailedDescription, price, maxPrice, imageUrl, galleryImages, category } = req.body;
      
      if (!name || price === undefined || !imageUrl) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const stmt = db.prepare(`
        UPDATE products 
        SET name = ?, description = ?, detailedDescription = ?, price = ?, maxPrice = ?, imageUrl = ?, galleryImages = ?, category = ?, updatedAt = datetime('now')
        WHERE id = ?
      `);
      
      const result = stmt.run(name, description, detailedDescription, price, maxPrice ?? null, imageUrl, JSON.stringify(galleryImages || []), category || null, id);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      const updatedProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
      res.json({ ...updatedProduct, galleryImages: JSON.parse(updatedProduct.galleryImages || '[]') });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      const stmt = db.prepare("DELETE FROM products WHERE id = ?");
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Announcements API
  app.get("/api/announcements", (req, res) => {
    try {
      const activeOnly = req.query.active === "true";
      const whereClause = activeOnly ? " WHERE isActive = 1" : "";
      const rows = db.prepare(`SELECT * FROM announcements${whereClause} ORDER BY orderIndex ASC, createdAt DESC`).all();
      res.json({ announcements: rows });
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.post("/api/announcements", (req, res) => {
    try {
      const { content, isActive = 1 } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "content 為必填" });
      }
      const result = db.prepare("INSERT INTO announcements (content, isActive) VALUES (?, ?)").run(content.trim(), isActive ? 1 : 0);
      const newRow = db.prepare("SELECT * FROM announcements WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>;
      res.status(201).json(newRow);
    } catch (error) {
      console.error("Error adding announcement:", error);
      res.status(500).json({ error: "Failed to add announcement" });
    }
  });

  app.put("/api/announcements/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      const { content, isActive } = req.body;
      const updates: string[] = [];
      const values: unknown[] = [];
      if (content !== undefined) {
        updates.push("content = ?");
        values.push(typeof content === "string" ? content.trim() : content);
      }
      if (isActive !== undefined) {
        updates.push("isActive = ?");
        values.push(isActive ? 1 : 0);
      }
      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }
      updates.push("updatedAt = datetime('now')");
      values.push(id);
      const result = db.prepare(`UPDATE announcements SET ${updates.join(", ")} WHERE id = ?`).run(...values);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      const updated = db.prepare("SELECT * FROM announcements WHERE id = ?").get(id) as Record<string, unknown>;
      res.json(updated);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  app.delete("/api/announcements/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = db.prepare("DELETE FROM announcements WHERE id = ?").run(id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // Auth API
  app.get("/api/auth/line/status", (req, res) => {
    const configured = !!(process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET);
    res.json({ configured });
  });

  app.get("/api/auth/line/authorize", (req, res) => {
    const clientId = process.env.LINE_CHANNEL_ID;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const redirectUri = `${baseUrl}/api/auth/line/callback`;
    if (!clientId) {
      return res.json({ url: "", configured: false });
    }
    const state = crypto.randomBytes(16).toString("hex");
    const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20openid`;
    res.json({ url, configured: true });
  });

  app.get("/api/auth/line/callback", async (req, res) => {
    const code = req.query.code as string;
    const clientId = process.env.LINE_CHANNEL_ID;
    const clientSecret = process.env.LINE_CHANNEL_SECRET;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const redirectUri = `${baseUrl}/api/auth/line/callback`;
    const frontendUrl = baseUrl.replace(/\/$/, "");

    if (!code || !clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/?login=error`);
    }
    try {
      const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return res.redirect(`${frontendUrl}/?login=error`);
      }
      const profileRes = await fetch("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json();
      const lineUserId = profile.userId;
      const displayName = profile.displayName || null;
      const pictureUrl = profile.pictureUrl || null;

      let member = db.prepare("SELECT * FROM members WHERE lineUserId = ?").get(lineUserId) as Record<string, unknown> | undefined;
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (member) {
        db.prepare(
          "UPDATE members SET displayName = ?, pictureUrl = ?, sessionToken = ?, sessionExpiresAt = ?, updatedAt = datetime('now') WHERE id = ?"
        ).run(displayName, pictureUrl, sessionToken, expiresAt, member.id);
      } else {
        const result = db.prepare(
          "INSERT INTO members (lineUserId, displayName, pictureUrl, sessionToken, sessionExpiresAt) VALUES (?, ?, ?, ?, ?)"
        ).run(lineUserId, displayName, pictureUrl, sessionToken, expiresAt);
        member = db.prepare("SELECT * FROM members WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>;
      }
      return res.redirect(`${frontendUrl}/?login=success&token=${sessionToken}`);
    } catch (err) {
      console.error("Line callback error:", err);
      return res.redirect(`${frontendUrl}/?login=error`);
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const auth = req.headers.authorization;
    const memberData = getMemberFromToken(auth);
    if (!memberData) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const member = db.prepare("SELECT id, lineUserId, displayName, pictureUrl, createdAt FROM members WHERE id = ?").get(memberData.id) as Record<string, unknown>;
    if (!member) return res.status(401).json({ error: "Unauthorized" });
    res.json(member);
  });

  app.post("/api/auth/demo", (req, res) => {
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let member = db.prepare("SELECT * FROM members WHERE lineUserId = ?").get("demo-user") as Record<string, unknown> | undefined;
    if (!member) {
      db.prepare(
        "INSERT INTO members (lineUserId, displayName, pictureUrl, sessionToken, sessionExpiresAt) VALUES (?, ?, ?, ?, ?)"
      ).run("demo-user", "Demo 會員", null, sessionToken, expiresAt);
      member = db.prepare("SELECT * FROM members WHERE lineUserId = ?").get("demo-user") as Record<string, unknown>;
    } else {
      db.prepare("UPDATE members SET sessionToken = ?, sessionExpiresAt = ?, updatedAt = datetime('now') WHERE id = ?").run(sessionToken, expiresAt, member.id);
    }
    res.json({
      member: { id: member.id, lineUserId: member.lineUserId, displayName: member.displayName, pictureUrl: member.pictureUrl, createdAt: member.createdAt },
      token: sessionToken,
    });
  });

  // Cart API (requires auth)
  app.get("/api/cart", (req, res) => {
    const memberData = getMemberFromToken(req.headers.authorization);
    if (!memberData) return res.status(401).json({ error: "Unauthorized" });
    const rows = db.prepare(
      "SELECT c.*, p.name, p.price, p.maxPrice, p.imageUrl, p.galleryImages FROM cart_items c JOIN products p ON c.productId = p.id WHERE c.memberId = ?"
    ).all(memberData.id) as Record<string, unknown>[];
    const items = rows.map((r) => ({
      id: r.id,
      memberId: r.memberId,
      productId: r.productId,
      quantity: r.quantity,
      createdAt: r.createdAt,
      product: {
        id: r.productId,
        name: r.name,
        price: r.price,
        maxPrice: r.maxPrice,
        imageUrl: r.imageUrl,
        galleryImages: typeof r.galleryImages === "string" ? JSON.parse(r.galleryImages || "[]") : r.galleryImages,
      },
    }));
    res.json({ items });
  });

  app.post("/api/cart", (req, res) => {
    const memberData = getMemberFromToken(req.headers.authorization);
    if (!memberData) return res.status(401).json({ error: "Unauthorized" });
    const { productId, quantity = 1 } = req.body;
    if (!productId) return res.status(400).json({ error: "productId required" });
    const qty = Math.max(1, Math.min(999, Number(quantity)));
    db.prepare(
      "INSERT INTO cart_items (memberId, productId, quantity) VALUES (?, ?, ?) ON CONFLICT(memberId, productId) DO UPDATE SET quantity = quantity + excluded.quantity"
    ).run(memberData.id, productId, qty);
    const row = db.prepare("SELECT c.*, p.name, p.price, p.imageUrl FROM cart_items c JOIN products p ON c.productId = p.id WHERE c.memberId = ? AND c.productId = ?").get(memberData.id, productId) as Record<string, unknown>;
    res.status(201).json({
      id: row.id,
      memberId: row.memberId,
      productId: row.productId,
      quantity: row.quantity,
      createdAt: row.createdAt,
      product: { id: row.productId, name: row.name, price: row.price, imageUrl: row.imageUrl },
    });
  });

  app.put("/api/cart/:productId", (req, res) => {
    const memberData = getMemberFromToken(req.headers.authorization);
    if (!memberData) return res.status(401).json({ error: "Unauthorized" });
    const productId = Number(req.params.productId);
    const { quantity } = req.body;
    const qty = Math.max(1, Math.min(999, Number(quantity) || 1));
    const result = db.prepare("UPDATE cart_items SET quantity = ? WHERE memberId = ? AND productId = ?").run(qty, memberData.id, productId);
    if (result.changes === 0) return res.status(404).json({ error: "Cart item not found" });
    res.json({ success: true });
  });

  app.delete("/api/cart/:productId", (req, res) => {
    const memberData = getMemberFromToken(req.headers.authorization);
    if (!memberData) return res.status(401).json({ error: "Unauthorized" });
    const productId = Number(req.params.productId);
    db.prepare("DELETE FROM cart_items WHERE memberId = ? AND productId = ?").run(memberData.id, productId);
    res.json({ success: true });
  });

  // Orders API
  app.get("/api/orders", (req, res) => {
    const memberData = getMemberFromToken(req.headers.authorization);
    if (!memberData) return res.status(401).json({ error: "Unauthorized" });
    const rows = db.prepare("SELECT * FROM orders WHERE memberId = ? ORDER BY createdAt DESC").all(memberData.id) as Record<string, unknown>[];
    const orders = rows.map((o) => {
      const items = db.prepare("SELECT * FROM order_items WHERE orderId = ?").all(o.id) as Record<string, unknown>[];
      return { ...o, items };
    });
    res.json({ orders });
  });

  app.get("/api/orders/:id", (req, res) => {
    const memberData = getMemberFromToken(req.headers.authorization);
    if (!memberData) return res.status(401).json({ error: "Unauthorized" });
    const id = Number(req.params.id);
    const order = db.prepare("SELECT * FROM orders WHERE id = ? AND memberId = ?").get(id, memberData.id) as Record<string, unknown> | undefined;
    if (!order) return res.status(404).json({ error: "Order not found" });
    const items = db.prepare("SELECT * FROM order_items WHERE orderId = ?").all(id) as Record<string, unknown>[];
    res.json({ ...order, items });
  });

  app.post("/api/orders", (req, res) => {
    const memberData = getMemberFromToken(req.headers.authorization);
    if (!memberData) return res.status(401).json({ error: "Unauthorized" });
    const { note } = req.body;
    const cartRows = db.prepare("SELECT c.*, p.name, p.price, p.imageUrl FROM cart_items c JOIN products p ON c.productId = p.id WHERE c.memberId = ?").all(memberData.id) as Record<string, unknown>[];
    if (cartRows.length === 0) return res.status(400).json({ error: "Cart is empty" });
    const orderResult = db.prepare("INSERT INTO orders (memberId, note) VALUES (?, ?)").run(memberData.id, note || null);
    const orderId = orderResult.lastInsertRowid;
    const insertItem = db.prepare(
      "INSERT INTO order_items (orderId, productId, productName, productPrice, quantity, imageUrl) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const row of cartRows) {
      insertItem.run(orderId, row.productId, row.name, row.price, row.quantity, row.imageUrl);
    }
    db.prepare("DELETE FROM cart_items WHERE memberId = ?").run(memberData.id);
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as Record<string, unknown>;
    const items = db.prepare("SELECT * FROM order_items WHERE orderId = ?").all(orderId) as Record<string, unknown>[];
    res.status(201).json({ ...order, items });
  });

  // Admin API (no auth for now - use hidden path)
  app.get("/api/admin/members", (req, res) => {
    const rows = db.prepare("SELECT id, lineUserId, displayName, pictureUrl, createdAt FROM members ORDER BY createdAt DESC").all() as Record<string, unknown>[];
    res.json({ members: rows });
  });

  app.get("/api/admin/orders", (req, res) => {
    const rows = db.prepare("SELECT o.*, m.displayName as memberName FROM orders o LEFT JOIN members m ON o.memberId = m.id ORDER BY o.createdAt DESC").all() as Record<string, unknown>[];
    const orders = rows.map((o) => {
      const items = db.prepare("SELECT * FROM order_items WHERE orderId = ?").all(o.id) as Record<string, unknown>[];
      return { ...o, items };
    });
    res.json({ orders });
  });

  app.put("/api/admin/orders/:id", (req, res) => {
    const id = Number(req.params.id);
    const { paymentStatus, shippingStatus } = req.body;
    const updates: string[] = [];
    const values: unknown[] = [];
    if (paymentStatus === "paid" || paymentStatus === "unpaid") {
      updates.push("paymentStatus = ?");
      values.push(paymentStatus);
    }
    if (shippingStatus === "shipped" || shippingStatus === "unshipped") {
      updates.push("shippingStatus = ?");
      values.push(shippingStatus);
    }
    if (updates.length === 0) return res.status(400).json({ error: "No valid updates" });
    updates.push("updatedAt = datetime('now')");
    values.push(id);
    const result = db.prepare(`UPDATE orders SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    if (result.changes === 0) return res.status(404).json({ error: "Order not found" });
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown>;
    const items = db.prepare("SELECT * FROM order_items WHERE orderId = ?").all(id) as Record<string, unknown>[];
    res.json({ ...order, items });
  });

  app.delete("/api/admin/orders/:id", (req, res) => {
    const id = Number(req.params.id);
    db.prepare("DELETE FROM order_items WHERE orderId = ?").run(id);
    const result = db.prepare("DELETE FROM orders WHERE id = ?").run(id);
    if (result.changes === 0) return res.status(404).json({ error: "Order not found" });
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
