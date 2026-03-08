/**
 * 商品 API - GET (列表)、POST (新增)
 * 路徑: /api/products
 */

import { requireAdmin, type AdminEnv } from "../../lib/admin";

interface Env extends AdminEnv {}

interface Product {
  id: number;
  name: string;
  description: string | null;
  detailedDescription: string | null;
  price: number;
  maxPrice: number | null;
  imageUrl: string;
  galleryImages: string | null;
  category: string | null;
  orderIndex: number;
  createdAt: string;
}

function parseProduct(row: Product) {
  return {
    ...row,
    galleryImages: row.galleryImages ? JSON.parse(row.galleryImages) : [],
  };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return Response.json(
      {
        error: "D1 未綁定",
        message: "請至 Cloudflare Dashboard > Settings > Functions > Bindings 新增 D1 綁定，變數名稱必須為 DB",
      },
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(context.request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "15", 10)));
    const category = url.searchParams.get("category") || "";
    const offset = (page - 1) * limit;

    const categoryFilter = category && category !== "全部" ? " WHERE category = ?" : "";
    const categoryParam = category && category !== "全部" ? category : undefined;

    const countStmt = context.env.DB.prepare(
      `SELECT COUNT(*) as total FROM products${categoryFilter}`
    );
    const countResult = categoryParam
      ? await countStmt.bind(categoryParam).first<{ total: number }>()
      : await countStmt.first<{ total: number }>();
    const total = countResult?.total ?? 0;

    const productsStmt = context.env.DB.prepare(
      `SELECT * FROM products${categoryFilter} ORDER BY orderIndex ASC, createdAt DESC LIMIT ? OFFSET ?`
    );
    const productsQuery = categoryParam
      ? productsStmt.bind(categoryParam, limit, offset)
      : productsStmt.bind(limit, offset);
    const { results } = await productsQuery.all<Product>();

    const categoriesResult = await context.env.DB.prepare(
      "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category"
    ).all<{ category: string }>();
    const categories = (categoriesResult.results || []).map((r) => r.category);

    const products = (results || []).map(parseProduct);
    return Response.json(
      {
        products,
        total,
        page,
        limit,
        hasMore: offset + products.length < total,
        categories,
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    console.error("Error fetching products:", err);
    return Response.json(
      { error: "Failed to fetch products" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const authResult = await requireAdmin(context);
  if (!authResult.ok) return authResult.response;
  if (!context.env.DB) {
    return Response.json(
      {
        error: "D1 未綁定",
        message: "請至 Cloudflare Dashboard > Settings > Functions > Bindings 新增 D1 綁定，變數名稱必須為 DB",
      },
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await context.request.json();
    const {
      name,
      description,
      detailedDescription,
      price,
      maxPrice,
      imageUrl,
      galleryImages,
      category,
    } = body;

    if (!name || price === undefined || !imageUrl) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await context.env.DB.prepare(
      `INSERT INTO products (name, description, detailedDescription, price, maxPrice, imageUrl, galleryImages, category, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(
        name,
        description || null,
        detailedDescription || null,
        price,
        maxPrice ?? null,
        imageUrl,
        JSON.stringify(galleryImages || []),
        category || null
      )
      .run();

    const id = result.meta.last_row_id;
    const { results } = await context.env.DB.prepare("SELECT * FROM products WHERE id = ?")
      .bind(id)
      .all<Product>();

    const newProduct = results?.[0];
    if (!newProduct) {
      return Response.json(
        { error: "Failed to fetch created product" },
        { status: 500 }
      );
    }

    return Response.json(parseProduct(newProduct), {
      status: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error adding product:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Failed to add product", details: message },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
