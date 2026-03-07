import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";
import { getProducts } from "../services/api";
import { ShoppingBag, Loader2, ChevronDown } from "lucide-react";
import { motion } from "motion/react";

const PAGE_SIZE = 15;

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["全部"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchProducts = useCallback(async (pageNum: number, category: string, append: boolean) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const data = await getProducts({
        page: pageNum,
        limit: PAGE_SIZE,
        category: category === "全部" ? undefined : category,
      });
      setProducts((prev) => (append ? [...prev, ...data.products] : data.products));
      setCategories(["全部", ...data.categories]);
      setHasMore(data.hasMore);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "無法載入商品，請稍後再試。";
      console.error("[Storefront] 載入商品失敗:", err);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, selectedCategory, false);
  }, [selectedCategory, fetchProducts]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, selectedCategory, true);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white shadow-sm border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-semibold text-stone-900">Dory Babe 選物代購</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-12">{error}</div>
        ) : products.length === 0 ? (
          <div className="text-center text-stone-500 py-24">
            <ShoppingBag className="w-12 h-12 mx-auto text-stone-300 mb-4" />
            <p className="text-lg">目前還沒有商品上架喔</p>
          </div>
        ) : (
          <>
            <div className="flex overflow-x-auto scrollbar-hide gap-2 mb-8 pb-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-stone-900 text-white"
                      : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {products.length === 0 ? (
              <div className="text-center text-stone-500 py-24">
                <ShoppingBag className="w-12 h-12 mx-auto text-stone-300 mb-4" />
                <p className="text-lg">這個分類目前沒有商品喔</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {products.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index, 14) * 0.1 }}
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 group hover:shadow-md transition-shadow duration-300 cursor-pointer"
                    >
                      <div className="aspect-square overflow-hidden bg-stone-100 relative">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-medium text-stone-700 shadow-sm">
                          {product.category || "未分類"}
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="text-lg font-medium text-stone-900 mb-1">{product.name}</h3>
                        <p className="text-stone-500 text-sm line-clamp-2 mb-4 h-10">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-emerald-600">
                            NT$ {product.price.toLocaleString()}
                            {(product.maxPrice !== undefined && product.maxPrice > product.price) && ` - ${product.maxPrice.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-12">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-6 py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-70 text-white font-medium rounded-xl transition-colors"
                    >
                      {loadingMore ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                      {loadingMore ? "載入中..." : "載入更多"}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
