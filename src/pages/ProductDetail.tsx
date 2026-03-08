import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Product } from "../types";
import { getProduct, addToCart } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Loader2, ArrowLeft, ShoppingCart, Minus, Plus } from "lucide-react";
import { motion } from "motion/react";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!id) return;
        const data = await getProduct(Number(id));
        setProduct(data);
      } catch (err) {
        setError("無法載入商品，請稍後再試。");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-center items-center gap-4">
        <div className="text-red-500">{error || "找不到商品"}</div>
        <button onClick={() => navigate("/")} className="text-emerald-600 hover:underline">
          返回首頁
        </button>
      </div>
    );
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const containerTop = container.getBoundingClientRect().top;
    
    let newIndex = 0;
    let minDistance = Infinity;
    
    Array.from(container.children).forEach((child, index) => {
      const childTop = child.getBoundingClientRect().top;
      const distance = Math.abs(childTop - containerTop);
      if (distance < minDistance) {
        minDistance = distance;
        newIndex = index;
      }
    });
    
    setCurrentImageIndex(newIndex);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white shadow-sm border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回首頁</span>
          </button>
          {isLoggedIn && (
            <button
              onClick={() => navigate("/cart")}
              className="p-2 text-stone-600 hover:text-emerald-600 hover:bg-stone-50 rounded-lg transition-colors"
              title="購物車"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden flex flex-col md:flex-row md:h-[calc(100vh-8rem)] md:min-h-[600px]"
        >
          <div className="w-full md:w-1/2 bg-stone-100 flex-shrink-0 relative h-[50vh] md:h-auto">
            <div 
              className="absolute inset-0 overflow-y-auto scrollbar-hide flex flex-col"
              onScroll={handleScroll}
            >
              <div className="w-full flex-shrink-0 relative flex items-center justify-center">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-contain"
                />
              </div>
              {product.galleryImages?.map((img, idx) => (
                <div key={idx} className="w-full flex-shrink-0 relative flex items-center justify-center">
                  <img
                    src={img}
                    alt={`${product.name} - ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-contain"
                  />
                </div>
              ))}
            </div>
            
            {/* Scroll indicator if multiple images exist */}
            {product.galleryImages && product.galleryImages.length > 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${currentImageIndex === 0 ? 'bg-white' : 'bg-white/50'}`}></div>
                {product.galleryImages.map((_, idx) => (
                  <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${currentImageIndex === idx + 1 ? 'bg-white' : 'bg-white/50'}`}></div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-8 md:p-12 w-full md:w-1/2 flex flex-col overflow-y-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              {product.name}
            </h1>
            <div className="text-3xl font-semibold text-emerald-600 mb-8">
              NT$ {product.price.toLocaleString()}
              {(product.maxPrice !== undefined && product.maxPrice > product.price) && ` - ${product.maxPrice.toLocaleString()}`}
            </div>
            
            <div className="prose prose-stone mb-8 flex-grow">
              <h3 className="text-sm font-medium text-stone-900 uppercase tracking-wider mb-4 border-b border-stone-200 pb-2">商品介紹</h3>
              <p className="text-stone-600 whitespace-pre-wrap leading-relaxed text-lg">
                {product.detailedDescription || product.description || "目前沒有提供詳細介紹。"}
              </p>
            </div>

            {isLoggedIn ? (
              <div className="border-t border-stone-200 pt-8 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-stone-700">購買數量</span>
                  <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="p-2 hover:bg-stone-100 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1)))}
                      className="w-16 text-center border-0 border-x border-stone-200 py-2 text-lg font-medium focus:outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                      className="p-2 hover:bg-stone-100 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (adding || !product) return;
                    setAdding(true);
                    try {
                      await addToCart(product.id, quantity);
                      setAdded(true);
                      setTimeout(() => setAdded(false), 2000);
                    } catch {
                      setError("加入購物車失敗，請稍後再試。");
                    } finally {
                      setAdding(false);
                    }
                  }}
                  disabled={adding}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-xl transition-colors"
                >
                  {adding ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : added ? (
                    "已加入購物車 ✓"
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      加入購物車
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="border-t border-stone-200 pt-8 p-4 bg-amber-50 rounded-xl">
                <p className="text-amber-800 text-sm mb-2">請先登入才能加入購物車</p>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-emerald-600 hover:underline font-medium"
                >
                  返回首頁登入
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
