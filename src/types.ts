export interface Product {
  id: number;
  name: string;
  description: string;
  detailedDescription?: string;
  price: number;
  maxPrice?: number;
  imageUrl: string;
  galleryImages?: string[];
  category?: string;
  orderIndex?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Announcement {
  id: number;
  content: string;
  isActive: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: number;
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
  createdAt: string;
}

export interface CartItem {
  id: number;
  memberId: number;
  productId: number;
  quantity: number;
  product?: Product;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productPrice: number;
  productMaxPrice?: number | null;
  quantity: number;
  imageUrl: string | null;
}

export interface Order {
  id: number;
  memberId: number;
  note: string | null;
  paymentStatus: "unpaid" | "paid";
  shippingStatus: "unshipped" | "shipped";
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  member?: Member;
}
