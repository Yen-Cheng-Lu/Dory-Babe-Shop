/**
 * localStorage 遷移 API - POST
 * 將前端 localStorage 的商品資料批次寫入 D1
 * 路徑: /api/products/migrate
 */

interface Env {
  DB: D1Database;
}

interface ProductInput {
  id?: number;
  name: string;
  description?: string;
  detailedDescription?: string;
  price: number;
  maxPrice?: number;
  imageUrl: string;
  galleryImages?: string[];
  category?: string;
  orderIndex?: number;
  createdAt?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json();
    const { products } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return Response.json(
        { error: "products must be a non-empty array" },
        { status: 400 }
      );
    }

    const stmt = context.env.DB.prepare(
      `INSERT INTO products (name, description, detailedDescription, price, maxPrice, imageUrl, galleryImages, category, orderIndex, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const statements = products.map((p: ProductInput, index: number) =>
      stmt.bind(
        p.name,
        p.description || null,
        p.detailedDescription || null,
        p.price,
        p.maxPrice ?? null,
        p.imageUrl,
        JSON.stringify(p.galleryImages || []),
        p.category || null,
        p.orderIndex ?? index,
        p.createdAt || new Date().toISOString()
      )
    );

    await context.env.DB.batch(statements);

    return Response.json(
      { success: true, migrated: products.length },
      {
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (err) {
    console.error("Error migrating products:", err);
    return Response.json(
      { error: "Failed to migrate products", details: String(err) },
      { status: 500 }
    );
  }
};
