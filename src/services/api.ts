import { Product } from "../types";
import { StorageManager } from "./storage";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getProducts = async (): Promise<Product[]> => {
  await delay(200);
  return StorageManager.getProducts();
};

export const getProduct = async (id: number): Promise<Product> => {
  await delay(200);
  const product = StorageManager.getProduct(id);
  if (!product) throw new Error("Failed to fetch product");
  return product;
};

export const addProduct = async (product: Omit<Product, "id" | "createdAt">): Promise<Product> => {
  await delay(200);
  return StorageManager.addProduct(product);
};

export const updateProduct = async (id: number, product: Omit<Product, "id" | "createdAt">): Promise<Product> => {
  await delay(200);
  return StorageManager.updateProduct(id, product);
};

export const reorderProducts = async (updates: { id: number; orderIndex: number }[]): Promise<void> => {
  await delay(200);
  StorageManager.reorderProducts(updates);
};

export const deleteProduct = async (id: number): Promise<void> => {
  await delay(200);
  StorageManager.deleteProduct(id);
};
