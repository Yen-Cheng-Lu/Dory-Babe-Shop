import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getCart, updateCartItem, removeFromCart, createOrder } from "../services/api";
import { CartItem } from "../types";
import { Loader2, ArrowLeft, Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

export default function Cart() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    getCart()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const total = items.reduce((sum, it) => sum + (it.product?.price ?? 0) * it.quantity, 0);

  const handleUpdateQty = async (productId: number, quantity: number) => {
    if (quantity < 1) return;
    try {
      await updateCartItem(productId, quantity);
      setItems((prev) =>
        prev.map((it) => (it.productId === productId ? { ...it, quantity } : it))
      );
    } catch {
      // refresh
      getCart().then(setItems);
    }
  };

  const handleRemove = async (productId: number) => {
    try {
      await removeFromCart(productId);
      setItems((prev) => prev.filter((it) => it.productId !== productId));
    } catch {
      getCart().then(setItems);
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const order = await createOrder(note.trim() || undefined);
      navigate(`/my-orders?created=${order.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "送出訂單失敗");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-center items-center gap-4">
        <p className="text-stone-600">請先登入才能使用購物車</p>
        <button onClick={() => navigate("/")} className="text-emerald-600 hover:underline">
          返回首頁登入
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white shadow-sm border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回首頁</span>
          </button>
          <h1 className="text-lg font-semibold text-stone-900">購物車</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-12 text-center">
            <ShoppingBag className="w-16 h-16 mx-auto text-stone-300 mb-4" />
            <p className="text-stone-600 mb-4">購物車是空的</p>
            <button
              onClick={() => navigate("/")}
              className="text-emerald-600 hover:underline font-medium"
            >
              去逛逛商品
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 border-b border-stone-100 last:border-0"
                >
                  <img
                    src={item.product?.imageUrl}
                    alt={item.product?.name}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-stone-900 truncate">
                      {item.product?.name}
                    </h3>
                    <p className="text-emerald-600 font-semibold">
                      NT$ {(item.product?.price ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.productId, item.quantity - 1)}
                      className="p-1.5 rounded-lg hover:bg-stone-100"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.productId, item.quantity + 1)}
                      className="p-1.5 rounded-lg hover:bg-stone-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.productId)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                訂單備註（選填）
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：希望週末送達、特殊包裝需求..."
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                rows={3}
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-stone-600">總計：</span>
                <span className="text-2xl font-bold text-emerald-600 ml-2">
                  NT$ {total.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "送出訂單"
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
