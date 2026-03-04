import { useEffect, useState } from "react";
import { Product } from "../types";
import { getProducts, addProduct, updateProduct, deleteProduct, reorderProducts, migrateFromLocalStorage } from "../services/api";
import { Plus, Trash2, Pencil, Loader2, Package, ChevronUp, ChevronDown, Database } from "lucide-react";
import ImageUpload from "../components/ImageUpload";

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [hasLocalStorageData, setHasLocalStorageData] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    detailedDescription: "",
    price: "",
    maxPrice: "",
    imageUrl: "",
    galleryImages: [] as string[],
    category: "",
  });

  useEffect(() => {
    fetchProducts();
    try {
      const data = localStorage.getItem("dory_babe_products");
      setHasLocalStorageData(!!data && JSON.parse(data || "[]").length > 0);
    } catch {
      setHasLocalStorageData(false);
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.imageUrl) return;

    setAdding(true);
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        detailedDescription: formData.detailedDescription,
        price: Number(formData.price),
        maxPrice: formData.maxPrice ? Number(formData.maxPrice) : undefined,
        imageUrl: formData.imageUrl,
        galleryImages: formData.galleryImages,
        category: formData.category || "未分類",
      };

      if (editingId) {
        const updatedProduct = await updateProduct(editingId, productData);
        setProducts(products.map(p => p.id === editingId ? updatedProduct : p));
        setEditingId(null);
      } else {
        const newProduct = await addProduct(productData);
        setProducts([newProduct, ...products]);
      }
      setFormData({ name: "", description: "", detailedDescription: "", price: "", maxPrice: "", imageUrl: "", galleryImages: [], category: "" });
    } catch (err) {
      console.error(err);
      alert(editingId ? "更新失敗" : "新增失敗");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      description: product.description || "",
      detailedDescription: product.detailedDescription || "",
      price: product.price.toString(),
      maxPrice: product.maxPrice ? product.maxPrice.toString() : "",
      imageUrl: product.imageUrl,
      galleryImages: product.galleryImages || [],
      category: product.category || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", detailedDescription: "", price: "", maxPrice: "", imageUrl: "", galleryImages: [], category: "" });
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      setConfirmDeleteId(null);
      if (editingId === id) {
        handleCancelEdit();
      }
    } catch (err) {
      console.error(err);
      alert("刪除失敗");
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newProducts = [...products];
    const temp = newProducts[index];
    newProducts[index] = newProducts[index - 1];
    newProducts[index - 1] = temp;
    setProducts(newProducts);

    try {
      const updates = newProducts.map((p, i) => ({ id: p.id, orderIndex: i }));
      await reorderProducts(updates);
    } catch (err) {
      console.error("Reorder failed", err);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === products.length - 1) return;
    const newProducts = [...products];
    const temp = newProducts[index];
    newProducts[index] = newProducts[index + 1];
    newProducts[index + 1] = temp;
    setProducts(newProducts);

    try {
      const updates = newProducts.map((p, i) => ({ id: p.id, orderIndex: i }));
      await reorderProducts(updates);
    } catch (err) {
      console.error("Reorder failed", err);
    }
  };

  const handleMigrate = async () => {
    if (!hasLocalStorageData) return;
    setMigrating(true);
    try {
      const { migrated } = await migrateFromLocalStorage();
      setHasLocalStorageData(false);
      await fetchProducts();
      alert(`成功將 ${migrated} 筆商品從 localStorage 遷移至 D1 資料庫！`);
    } catch (err) {
      console.error(err);
      alert("遷移失敗：" + (err instanceof Error ? err.message : "未知錯誤"));
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Package className="w-8 h-8 text-stone-800" />
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">商品管理後台</h1>
        </div>

        {hasLocalStorageData && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-800">
              <Database className="w-5 h-5" />
              <span>偵測到瀏覽器 localStorage 中有商品資料，可一鍵遷移至 D1 資料庫。</span>
            </div>
            <button
              type="button"
              onClick={handleMigrate}
              disabled={migrating}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {migrating ? "遷移中..." : "遷移至 D1"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Product Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-stone-800 mb-6 flex items-center gap-2">
                {editingId ? <Pencil className="w-5 h-5 text-emerald-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                {editingId ? "編輯商品" : "新增商品"}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      商品名稱 *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="例如：極簡風馬克杯"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      商品分類
                    </label>
                    <input
                      type="text"
                      list="category-options"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="例如：日本代購"
                    />
                    <datalist id="category-options">
                      {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                      <option value="日本代購" />
                      <option value="韓國代購" />
                      <option value="母嬰用品" />
                      <option value="生活雜貨" />
                      <option value="美妝保養" />
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      最低價格 (NT$) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="990"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      最高價格 (NT$) (選填)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxPrice}
                      onChange={e => setFormData({ ...formData, maxPrice: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="1290"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    首頁簡短描述
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                    placeholder="在首頁顯示的簡短介紹..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    詳細商品介紹
                  </label>
                  <textarea
                    rows={5}
                    value={formData.detailedDescription}
                    onChange={e => setFormData({ ...formData, detailedDescription: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                    placeholder="在商品詳情頁顯示的完整介紹..."
                  />
                </div>

                <ImageUpload
                  label="首頁商品圖片 *"
                  value={formData.imageUrl}
                  onChange={(val) => setFormData({ ...formData, imageUrl: val })}
                />

                <ImageUpload
                  label="詳細介紹圖片 (可多選)"
                  multiple
                  value={formData.galleryImages}
                  onChange={(val) => setFormData({ ...formData, galleryImages: val })}
                />

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingId ? "儲存修改" : "上架商品")}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-3 bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium rounded-xl transition-colors"
                    >
                      取消
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Product List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-stone-800">已上架商品</h2>
                <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-sm font-medium">
                  共 {products.length} 件
                </span>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-16 text-stone-500">
                  <Package className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                  <p>目前還沒有商品，從左側新增一個吧！</p>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {products.map((product, index) => (
                    <li key={product.id} className="p-6 hover:bg-stone-50 transition-colors flex items-center gap-4 sm:gap-6">
                      <div className="flex flex-col gap-1 -ml-2">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors"
                          title="上移"
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === products.length - 1}
                          className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors"
                          title="下移"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-medium text-stone-900 truncate">
                            {product.name}
                          </h3>
                          <span className="inline-block px-2 py-0.5 bg-stone-200 text-stone-600 text-xs rounded-md whitespace-nowrap">
                            {product.category || "未分類"}
                          </span>
                        </div>
                        <p className="text-stone-500 text-sm line-clamp-2 mb-2">
                          {product.description || "無描述"}
                        </p>
                        <div className="text-emerald-600 font-semibold">
                          NT$ {product.price.toLocaleString()}
                          {(product.maxPrice !== undefined && product.maxPrice > product.price) && ` - ${product.maxPrice.toLocaleString()}`}
                        </div>
                      </div>

                      {confirmDeleteId === product.id ? (
                        <div className="flex flex-col gap-2 items-end">
                          <span className="text-sm text-red-500 font-medium">確定要刪除嗎？</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1.5 text-sm bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg transition-colors"
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(product.id)}
                              className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                              確定刪除
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(product)}
                            className="p-3 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                            title="編輯商品"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(product.id)}
                            className="p-3 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="刪除商品"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
