import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
const db = new Database("products.db");

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get("/api/products", (req, res) => {
    try {
      const products = db.prepare("SELECT * FROM products ORDER BY orderIndex ASC, createdAt DESC").all();
      const parsedProducts = products.map(p => ({ ...p, galleryImages: JSON.parse(p.galleryImages || '[]') }));
      res.json(parsedProducts);
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
        INSERT INTO products (name, description, detailedDescription, price, maxPrice, imageUrl, galleryImages, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        SET name = ?, description = ?, detailedDescription = ?, price = ?, maxPrice = ?, imageUrl = ?, galleryImages = ?, category = ?
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
