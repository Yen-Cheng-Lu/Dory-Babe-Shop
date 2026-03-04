/**
 * 商品 API - GET (列表)、POST (新增)
 * 路徑: /api/products
 */

interface Env {
  DB: D1Database;
}

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
  try {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM products ORDER BY orderIndex ASC, createdAt DESC"
    ).all<Product>();

    const products = (results || []).map(parseProduct);
    return Response.json(products, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    return Response.json(
      { error: "Failed to fetch products" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
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
      `INSERT INTO products (name, description, detailedDescription, price, maxPrice, imageUrl, galleryImages, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
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
    return Response.json(
      { error: "Failed to add product" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
