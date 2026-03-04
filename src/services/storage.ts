import { Product } from "../types";

const STORAGE_KEY = "dory_babe_products";

export const StorageManager = {
  getProducts: (): Product[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      const products: Product[] = JSON.parse(data);
      return products.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    } catch (e) {
      console.error("Failed to parse products from local storage", e);
      return [];
    }
  },

  saveProducts: (products: Product[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.error("Failed to save products to local storage. Quota exceeded?", e);
      alert("儲存失敗：瀏覽器儲存空間已滿，請嘗試刪除部分商品或圖片。");
    }
  },

  getProduct: (id: number): Product | undefined => {
    const products = StorageManager.getProducts();
    return products.find(p => p.id === id);
  },

  addProduct: (productData: Omit<Product, "id" | "createdAt">): Product => {
    const products = StorageManager.getProducts();
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProduct: Product = {
      ...productData,
      id: newId,
      createdAt: new Date().toISOString(),
      orderIndex: products.length,
    };
    products.push(newProduct);
    StorageManager.saveProducts(products);
    return newProduct;
  },

  updateProduct: (id: number, productData: Omit<Product, "id" | "createdAt">): Product => {
    const products = StorageManager.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Product not found");
    
    const updatedProduct = {
      ...products[index],
      ...productData,
    };
    products[index] = updatedProduct;
    StorageManager.saveProducts(products);
    return updatedProduct;
  },

  deleteProduct: (id: number): void => {
    let products = StorageManager.getProducts();
    products = products.filter(p => p.id !== id);
    StorageManager.saveProducts(products);
  },

  reorderProducts: (updates: { id: number; orderIndex: number }[]): void => {
    const products = StorageManager.getProducts();
    updates.forEach(update => {
      const product = products.find(p => p.id === update.id);
      if (product) {
        product.orderIndex = update.orderIndex;
      }
    });
    StorageManager.saveProducts(products);
  }
};
