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
