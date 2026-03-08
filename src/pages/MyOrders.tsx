import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getMyOrders } from "../services/api";
import { Order, OrderItem } from "../types";
import { Loader2, ArrowLeft, Package, CheckCircle, XCircle } from "lucide-react";

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    const isoUtc = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso.replace(" ", "T") + "Z";
    const d = new Date(isoUtc);
    return new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return iso;
  }
}

function orderTotals(items: OrderItem[] | undefined) {
  if (!items?.length) return { min: 0, max: 0, hasRange: false };
  const min = items.reduce((s, it) => s + it.productPrice * it.quantity, 0);
  const max = items.reduce(
    (s, it) =>
      s +
      (it.productMaxPrice != null && it.productMaxPrice > it.productPrice
        ? it.productMaxPrice * it.quantity
        : it.productPrice * it.quantity),
    0
  );
  return { min, max, hasRange: min !== max };
}

function StatusBadge({ paymentStatus, shippingStatus }: { paymentStatus: string; shippingStatus: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
          paymentStatus === "paid"
            ? "bg-emerald-100 text-emerald-800"
            : "bg-amber-100 text-amber-800"
        }`}
      >
        {paymentStatus === "paid" ? (
          <CheckCircle className="w-3.5 h-3.5" />
        ) : (
          <XCircle className="w-3.5 h-3.5" />
        )}
        {paymentStatus === "paid" ? "已付款" : "未付款"}
      </span>
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
          shippingStatus === "shipped"
            ? "bg-emerald-100 text-emerald-800"
            : "bg-stone-100 text-stone-600"
        }`}
      >
        {shippingStatus === "shipped" ? (
          <Package className="w-3.5 h-3.5" />
        ) : null}
        {shippingStatus === "shipped" ? "已出貨" : "未出貨"}
      </span>
    </div>
  );
}

export default function MyOrders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createdId = searchParams.get("created");
  const { isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    getMyOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-center items-center gap-4">
        <p className="text-stone-600">請先登入才能查看訂單</p>
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
          <h1 className="text-lg font-semibold text-stone-900">我的訂單</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {createdId && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
            訂單 #{createdId} 已成功送出！
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-stone-300 mb-4" />
            <p className="text-stone-600">尚無訂單</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden"
              >
                <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-stone-900">訂單 #{order.id}</span>
                  <span className="text-sm text-stone-500">
                    {formatDateTime(order.createdAt)}
                  </span>
                  <StatusBadge
                    paymentStatus={order.paymentStatus}
                    shippingStatus={order.shippingStatus}
                  />
                </div>
                {order.note && (
                  <div className="px-4 py-2 bg-stone-50 text-sm text-stone-600">
                    備註：{order.note}
                  </div>
                )}
                <div className="divide-y divide-stone-100">
                  {order.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4"
                    >
                      <img
                        src={item.imageUrl || ""}
                        alt={item.productName}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-stone-900">{item.productName}</h4>
                        <p className="text-sm text-stone-500">
                          {item.productMaxPrice != null && item.productMaxPrice > item.productPrice
                            ? `NT$ ${item.productPrice.toLocaleString()} - ${item.productMaxPrice.toLocaleString()} × ${item.quantity}`
                            : `NT$ ${item.productPrice.toLocaleString()} × ${item.quantity}`}
                        </p>
                      </div>
                      <div className="text-emerald-600 font-semibold">
                        {item.productMaxPrice != null && item.productMaxPrice > item.productPrice
                          ? `NT$ ${(item.productPrice * item.quantity).toLocaleString()} - ${(item.productMaxPrice * item.quantity).toLocaleString()}`
                          : `NT$ ${(item.productPrice * item.quantity).toLocaleString()}`}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 text-right">
                  <span className="text-stone-600">小計：</span>
                  <span className="font-bold text-emerald-600 ml-2">
                    {orderTotals(order.items).hasRange
                      ? `NT$ ${orderTotals(order.items).min.toLocaleString()} - NT$ ${orderTotals(order.items).max.toLocaleString()}`
                      : `NT$ ${orderTotals(order.items).min.toLocaleString()}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
