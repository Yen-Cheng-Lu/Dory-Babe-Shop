/**
 * 單一商品 API - GET、PUT、DELETE
 * 路徑: /api/products/:id
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
  if (!context.env.DB) {
    return Response.json(
      { error: "D1 未綁定", message: "請至 Cloudflare Dashboard 新增 D1 綁定，變數名稱必須為 DB" },
      { status: 503 }
    );
  }
  const id = Number(context.params.id);
  if (isNaN(id)) {
    return Response.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    const { results } = await context.env.DB.prepare("SELECT * FROM products WHERE id = ?")
      .bind(id)
      .all<Product>();

    const product = results?.[0];
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json(parseProduct(product), {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error fetching product:", err);
    return Response.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return Response.json(
      { error: "D1 未綁定", message: "請至 Cloudflare Dashboard 新增 D1 綁定，變數名稱必須為 DB" },
      { status: 503 }
    );
  }
  const id = Number(context.params.id);
  if (isNaN(id)) {
    return Response.json({ error: "Invalid product ID" }, { status: 400 });
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
        { status: 400 }
      );
    }

    const result = await context.env.DB.prepare(
      `UPDATE products 
       SET name = ?, description = ?, detailedDescription = ?, price = ?, maxPrice = ?, imageUrl = ?, galleryImages = ?, category = ?
       WHERE id = ?`
    )
      .bind(
        name,
        description || null,
        detailedDescription || null,
        price,
        maxPrice ?? null,
        imageUrl,
        JSON.stringify(galleryImages || []),
        category || null,
        id
      )
      .run();

    if (result.meta.changes === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    const { results } = await context.env.DB.prepare("SELECT * FROM products WHERE id = ?")
      .bind(id)
      .all<Product>();

    const updatedProduct = results?.[0];
    if (!updatedProduct) {
      return Response.json(
        { error: "Failed to fetch updated product" },
        { status: 500 }
      );
    }

    return Response.json(parseProduct(updatedProduct), {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error updating product:", err);
    return Response.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return Response.json(
      { error: "D1 未綁定", message: "請至 Cloudflare Dashboard 新增 D1 綁定，變數名稱必須為 DB" },
      { status: 503 }
    );
  }
  const id = Number(context.params.id);
  if (isNaN(id)) {
    return Response.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    const result = await context.env.DB.prepare("DELETE FROM products WHERE id = ?")
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({ success: true }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error deleting product:", err);
    return Response.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
};
