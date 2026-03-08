import { Product, Announcement, Member, CartItem, Order } from "../types";

const API_BASE = "/api/products";
const ANNOUNCEMENTS_BASE = "/api/announcements";
const AUTH_BASE = "/api/auth";
const CART_BASE = "/api/cart";
const ORDERS_BASE = "/api/orders";
const ADMIN_BASE = "/api/admin";

const TOKEN_KEY = "dory_babe_token";

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  categories: string[];
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  url: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options ?? {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(skipAuth ? {} : getAuthHeaders()),
    ...(fetchOptions.headers as Record<string, string>),
  };
  const res = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const msg = [err.error, err.message, err.details].filter(Boolean).join(" - ");
    throw new Error(msg || "Request failed");
  }

  return res.json();
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

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

/** 佈告欄 API */
export const getAnnouncements = async (activeOnly = false): Promise<Announcement[]> => {
  const url = activeOnly ? `${ANNOUNCEMENTS_BASE}?active=true` : ANNOUNCEMENTS_BASE;
  const res = await request<{ announcements: Announcement[] }>(url);
  return res.announcements || [];
};

export const addAnnouncement = async (data: { content: string; isActive?: number }): Promise<Announcement> => {
  return request<Announcement>(ANNOUNCEMENTS_BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateAnnouncement = async (id: number, data: { content?: string; isActive?: number }): Promise<Announcement> => {
  return request<Announcement>(`${ANNOUNCEMENTS_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const deleteAnnouncement = async (id: number): Promise<void> => {
  await request(`${ANNOUNCEMENTS_BASE}/${id}`, { method: "DELETE" });
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

/** 認證 API */
export const getLineAuthStatus = async (): Promise<{ configured: boolean }> => {
  try {
    return await request<{ configured: boolean }>(`${AUTH_BASE}/line/status`, { skipAuth: true });
  } catch {
    return { configured: false };
  }
};

export const getLineAuthorizeUrl = async (): Promise<{ url: string; configured?: boolean }> => {
  return request<{ url: string; configured?: boolean }>(`${AUTH_BASE}/line/authorize`, { skipAuth: true });
};

export const getMe = async (): Promise<Member | null> => {
  try {
    return await request<Member>(`${AUTH_BASE}/me`);
  } catch {
    return null;
  }
};

export const demoLogin = async (): Promise<{ member: Member; token: string }> => {
  const res = await request<{ member: Member; token: string }>(`${AUTH_BASE}/demo`, {
    method: "POST",
    skipAuth: true,
  });
  setToken(res.token);
  return res;
};

export const logout = () => {
  clearToken();
};

/** 購物車 API */
export const getCart = async (): Promise<CartItem[]> => {
  const res = await request<{ items: CartItem[] }>(CART_BASE);
  return res.items ?? [];
};

export const addToCart = async (productId: number, quantity: number): Promise<CartItem> => {
  const res = await request<CartItem>(CART_BASE, {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });
  return res;
};

export const updateCartItem = async (productId: number, quantity: number): Promise<void> => {
  await request(`${CART_BASE}/${productId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });
};

export const removeFromCart = async (productId: number): Promise<void> => {
  await request(`${CART_BASE}/${productId}`, { method: "DELETE" });
};

/** 訂單 API */
export const getMyOrders = async (): Promise<Order[]> => {
  const res = await request<{ orders: Order[] }>(ORDERS_BASE);
  return res.orders ?? [];
};

export const getOrder = async (id: number): Promise<Order> => {
  return request<Order>(`${ORDERS_BASE}/${id}`);
};

export interface CreateOrderPayload {
  note?: string;
  recipientName: string;
  pickupStore: string;
  phone: string;
}

export const createOrder = async (payload: CreateOrderPayload): Promise<Order> => {
  return request<Order>(ORDERS_BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/** 後台 API */
export const getAdminMembers = async (): Promise<Member[]> => {
  const res = await request<{ members: Member[] }>(`${ADMIN_BASE}/members`);
  return res.members ?? [];
};

export const getAdminOrders = async (): Promise<Order[]> => {
  const res = await request<{ orders: Order[] }>(`${ADMIN_BASE}/orders`);
  return res.orders ?? [];
};

export const updateOrderStatus = async (
  id: number,
  data: { paymentStatus?: "unpaid" | "paid"; shippingStatus?: "unshipped" | "shipped" }
): Promise<Order> => {
  return request<Order>(`${ADMIN_BASE}/orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const deleteAdminOrder = async (id: number): Promise<void> => {
  await request(`${ADMIN_BASE}/orders/${id}`, { method: "DELETE" });
};
