import { Product } from "../types";

const API_BASE = "/api/products";

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  categories: string[];
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const msg = [err.error, err.message, err.details].filter(Boolean).join(" - ");
    throw new Error(msg || "Request failed");
  }

  return res.json();
}

export const getProducts = async (options?: {
  page?: number;
  limit?: number;
  category?: string;
}): Promise<ProductsResponse> => {
  const params = new URLSearchParams();
  if (options?.page != null) params.set("page", String(options.page));
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.category != null) params.set("category", options.category);
  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
  return request<ProductsResponse>(url);
};

export const getProduct = async (id: number): Promise<Product> => {
  const product = await request<Product>(`${API_BASE}/${id}`);
  if (!product) throw new Error("Failed to fetch product");
  return product;
};

export const addProduct = async (
  product: Omit<Product, "id" | "createdAt">
): Promise<Product> => {
  return request<Product>(API_BASE, {
    method: "POST",
    body: JSON.stringify(product),
  });
};

export const updateProduct = async (
  id: number,
  product: Omit<Product, "id" | "createdAt">
): Promise<Product> => {
  return request<Product>(`${API_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
};

export const reorderProducts = async (
  updates: { id: number; orderIndex: number }[]
): Promise<void> => {
  await request(`${API_BASE}/reorder`, {
    method: "PUT",
    body: JSON.stringify({ updates }),
  });
};

export const deleteProduct = async (id: number): Promise<void> => {
  await request(`${API_BASE}/${id}`, { method: "DELETE" });
};

/** 將 localStorage 的商品資料遷移至 D1 資料庫 */
export const migrateFromLocalStorage = async (): Promise<{ migrated: number }> => {
  const STORAGE_KEY = "dory_babe_products";
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    throw new Error("localStorage 中沒有商品資料");
  }

  const products: Product[] = JSON.parse(data);
  if (products.length === 0) {
    throw new Error("localStorage 中沒有商品可遷移");
  }

  const res = await request<{ success: boolean; migrated: number }>(
    `${API_BASE}/migrate`,
    {
      method: "POST",
      body: JSON.stringify({ products }),
    }
  );

  if (res.success) {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { migrated: res.migrated };
};
