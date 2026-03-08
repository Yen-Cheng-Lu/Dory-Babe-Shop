import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";
import { getProducts, getAnnouncements, getLineAuthorizeUrl, getLineAuthStatus, getCart } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { ShoppingBag, Loader2, ChevronLeft, ChevronRight, Megaphone, ShoppingCart, User, LogOut } from "lucide-react";
import { motion } from "motion/react";

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    // 資料庫存 UTC，若無時區標記則視為 UTC
    const isoUtc = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso.replace(" ", "T") + "Z";
    const d = new Date(isoUtc);
    const parts = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    return `${year}/${month}/${day} ${hour}:${minute}`;
  } catch {
    return iso;
  }
}

const PAGE_SIZE = 15;

export default function Storefront() {
  const { member, isLoggedIn, logout, refresh, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [announcements, setAnnouncements] = useState<{ id: number; content: string }[]>([]);
  const [categories, setCategories] = useState<string[]>(["全部"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [loggingIn, setLoggingIn] = useState(false);
  const [lineConfigured, setLineConfigured] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getLineAuthStatus().then((s) => setLineConfigured(s.configured)).catch(() => setLineConfigured(false));
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      getCart().then((items) => setCartCount(items.length)).catch(() => setCartCount(0));
    } else {
      setCartCount(0);
    }
  }, [isLoggedIn]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchProducts = useCallback(async (pageNum: number, category: string) => {
    try {
      setLoading(true);
      const data = await getProducts({
        page: pageNum,
        limit: PAGE_SIZE,
        category: category === "全部" ? undefined : category,
      });
      setProducts(data.products);
      setCategories(["全部", ...data.categories]);
      setTotal(data.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "無法載入商品，請稍後再試。";
      console.error("[Storefront] 載入商品失敗:", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(page, selectedCategory);
  }, [page, selectedCategory, fetchProducts]);

  useEffect(() => {
    getAnnouncements(true).then(setAnnouncements).catch(() => setAnnouncements([]));
  }, []);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
  };

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white shadow-sm border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-semibold text-stone-900">Dory Babee 選物代購</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
            ) : isLoggedIn ? (
              <>
                <button
                  onClick={() => navigate("/cart")}
                  className="relative p-2 text-stone-600 hover:text-emerald-600 hover:bg-stone-50 rounded-lg transition-colors"
                  title="購物車"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => navigate("/my-orders")}
                  className="p-2 text-stone-600 hover:text-emerald-600 hover:bg-stone-50 rounded-lg transition-colors"
                  title="我的訂單"
                >
                  <User className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                  {member?.pictureUrl ? (
                    <img src={member.pictureUrl} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-stone-500" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-stone-700 max-w-[100px] truncate hidden sm:block">
                    {member?.displayName || "會員"}
                  </span>
                  <button
                    onClick={logout}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    title="登出"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (lineConfigured === false) {
                      alert(
                        "LINE 登入尚未設定。\n\n請在專案根目錄的 .env 檔案中填入：\n• LINE_CHANNEL_ID\n• LINE_CHANNEL_SECRET\n\n並至 LINE Developers Console 加入 Callback URL：\nhttp://localhost:3000/api/auth/line/callback\n\n設定完成後請重新啟動開發伺服器。"
                      );
                      return;
                    }
                    setLoggingIn(true);
                    try {
                      const { url } = await getLineAuthorizeUrl();
                      if (url) {
                        window.location.href = url;
                        return;
                      }
                      alert("LINE 登入尚未設定，請先完成 .env 設定。");
                    } catch {
                      alert("無法取得 LINE 登入連結，請檢查 .env 設定。");
                    } finally {
                      setLoggingIn(false);
                    }
                  }}
                  disabled={loggingIn}
                  className="px-4 py-2 bg-[#06C755] hover:bg-[#05b34a] text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70"
                  title={lineConfigured === false ? "點擊查看設定說明" : undefined}
                >
                  {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  LINE 登入
                  {lineConfigured === false && "（未設定）"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {announcements.length > 0 && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              {announcements.map((a) => (
                <p key={a.id} className="text-amber-900 text-base leading-relaxed whitespace-pre-wrap">
                  {a.content}
                </p>
              ))}
            </div>
          </div>
        )}
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
                  onClick={() => handleCategoryChange(category)}
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
                        <div className="mt-2 pt-2 border-t border-stone-100 flex flex-wrap gap-x-4 gap-y-0 text-sm text-stone-500">
                          <span className="whitespace-nowrap">建立：{formatDateTime(product.createdAt)}</span>
                          {(product.updatedAt && product.updatedAt !== product.createdAt) && (
                            <span className="whitespace-nowrap">修改：{formatDateTime(product.updatedAt)}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-12 flex-wrap">
                    <button
                      type="button"
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1}
                      title="上一頁"
                      aria-label="上一頁"
                      className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex gap-1 items-center">
                      {(() => {
                        const pages: (number | string)[] = [];
                        if (totalPages <= 7) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (page > 3) pages.push("…");
                          for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                            pages.push(i);
                          }
                          if (page < totalPages - 2) pages.push("…");
                          if (totalPages > 1) pages.push(totalPages);
                        }
                        return pages.map((p, i) =>
                          p === "…" ? (
                            <span key={`ellipsis-${i}`} className="px-2 text-stone-400">…</span>
                          ) : (
                            <button
                              key={p}
                              type="button"
                              onClick={() => goToPage(p as number)}
                              className={`min-w-[2.25rem] h-9 rounded-lg font-medium transition-colors ${
                                p === page ? "bg-stone-900 text-white" : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                              }`}
                            >
                              {p}
                            </button>
                          )
                        );
                      })()}
                    </div>
                    <button
                      type="button"
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= totalPages}
                      title="下一頁"
                      aria-label="下一頁"
                      className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
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
