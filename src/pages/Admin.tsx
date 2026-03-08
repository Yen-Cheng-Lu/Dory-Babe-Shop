import { useEffect, useState } from "react";
import { Product, Announcement, Member, Order, OrderItem } from "../types";
import { getProducts, addProduct, updateProduct, deleteProduct, reorderProducts, migrateFromLocalStorage, getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement, getAdminMembers, getAdminOrders, updateOrderStatus, deleteAdminOrder } from "../services/api";
import { Plus, Trash2, Pencil, Loader2, Package, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Database, Activity, Megaphone, Users, ShoppingCart, Check } from "lucide-react";
import ImageUpload from "../components/ImageUpload";

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

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [hasLocalStorageData, setHasLocalStorageData] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ ok?: boolean; message?: string; checks?: Record<string, string> } | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementContent, setAnnouncementContent] = useState("");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<number | null>(null);
  const [addingAnnouncement, setAddingAnnouncement] = useState(false);
  const [adminTab, setAdminTab] = useState<"products" | "members" | "orders">("products");
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderEdits, setOrderEdits] = useState<Record<number, { paymentStatus: string; shippingStatus: string }>>({});
  const [orderSavingId, setOrderSavingId] = useState<number | null>(null);
  const [orderDeletingId, setOrderDeletingId] = useState<number | null>(null);

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    fetchProducts(page);
    try {
      const data = localStorage.getItem("dory_babe_products");
      setHasLocalStorageData(!!data && JSON.parse(data || "[]").length > 0);
    } catch {
      setHasLocalStorageData(false);
    }
  }, [page]);

  useEffect(() => {
    getAnnouncements().then(setAnnouncements).catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => {
    if (adminTab === "members") {
      setMembersLoading(true);
      getAdminMembers().then(setMembers).catch(() => setMembers([])).finally(() => setMembersLoading(false));
    }
  }, [adminTab]);

  useEffect(() => {
    if (adminTab === "orders") {
      setOrdersLoading(true);
      getAdminOrders()
        .then((data) => {
          setOrders(data);
          setOrderEdits(
            data.reduce(
              (acc, o) => ({ ...acc, [o.id]: { paymentStatus: o.paymentStatus, shippingStatus: o.shippingStatus } }),
              {}
            )
          );
        })
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false));
    }
  }, [adminTab]);

  const fetchProducts = async (pageNum: number) => {
    try {
      setLoading(true);
      const data = await getProducts({ page: pageNum, limit: PAGE_SIZE });
      setProducts(data.products);
      setCategories(data.categories);
      setTotal(data.total);
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
        await addProduct(productData);
        await fetchProducts(page);
      }
      setFormData({ name: "", description: "", detailedDescription: "", price: "", maxPrice: "", imageUrl: "", galleryImages: [], category: "" });
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "未知錯誤";
      alert(editingId ? `更新失敗：${msg}` : `新增失敗：${msg}`);
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
      setConfirmDeleteId(null);
      if (editingId === id) {
        handleCancelEdit();
      }
      await fetchProducts(page);
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

  const checkHealth = async () => {
    setHealthStatus(null);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealthStatus({ ok: data.ok, message: data.message, checks: data.checks });
    } catch (err) {
      setHealthStatus({ ok: false, message: err instanceof Error ? err.message : "無法連線" });
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementContent.trim()) return;
    setAddingAnnouncement(true);
    try {
      const newAnn = await addAnnouncement({ content: announcementContent.trim() });
      setAnnouncements((prev) => [newAnn, ...prev]);
      setAnnouncementContent("");
    } catch (err) {
      console.error(err);
      alert("新增佈告欄失敗");
    } finally {
      setAddingAnnouncement(false);
    }
  };

  const handleUpdateAnnouncement = async (id: number, content: string, isActive: number) => {
    try {
      const updated = await updateAnnouncement(id, { content, isActive });
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingAnnouncementId(null);
    } catch (err) {
      console.error(err);
      alert("更新佈告欄失敗");
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm("確定要刪除此佈告欄嗎？")) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      setEditingAnnouncementId(null);
    } catch (err) {
      console.error(err);
      alert("刪除佈告欄失敗");
    }
  };

  const handleOrderStatusConfirm = async (orderId: number) => {
    const edit = orderEdits[orderId];
    if (!edit) return;
    setOrderSavingId(orderId);
    try {
      const updated = await updateOrderStatus(orderId, {
        paymentStatus: edit.paymentStatus as "unpaid" | "paid",
        shippingStatus: edit.shippingStatus as "unshipped" | "shipped",
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setOrderEdits((prev) => ({ ...prev, [orderId]: { paymentStatus: updated.paymentStatus, shippingStatus: updated.shippingStatus } }));
    } catch (err) {
      console.error(err);
      alert("更新訂單狀態失敗");
    } finally {
      setOrderSavingId(null);
    }
  };

  const orderTotals = (items: OrderItem[] | undefined) => {
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
  };

  const handleOrderDelete = async (orderId: number) => {
    if (!confirm("確定要刪除此訂單嗎？此操作無法復原。")) return;
    setOrderDeletingId(orderId);
    try {
      await deleteAdminOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setOrderEdits((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch (err) {
      console.error(err);
      alert("刪除訂單失敗");
    } finally {
      setOrderDeletingId(null);
    }
  };

  const handleMigrate = async () => {
    if (!hasLocalStorageData) return;
    setMigrating(true);
    try {
      const { migrated } = await migrateFromLocalStorage();
      setHasLocalStorageData(false);
      await fetchProducts(page);
      alert(`成功將 ${migrated} 筆商品從 localStorage 遷移至 D1 資料庫！`);
    } catch (err) {
      console.error(err);
      alert("遷移失敗：" + (err instanceof Error ? err.message : "未知錯誤"));
    } finally {
      setMigrating(false);
    }
  };

  const tabs = [
    { id: "products" as const, label: "商品管理", icon: Package },
    { id: "members" as const, label: "會員清單", icon: Users },
    { id: "orders" as const, label: "訂單管理", icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-stone-800" />
            <h1 className="text-3xl font-bold text-stone-800 tracking-tight">管理後台</h1>
          </div>
          <div className="flex gap-2 p-1 bg-stone-200 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  adminTab === tab.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {adminTab === "products" && (
        <div className="mb-6 p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-stone-600">
            <Activity className="w-5 h-5" />
            <span>若無法新增商品，請點擊檢查 API 狀態</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={checkHealth}
              className="px-4 py-2 bg-stone-700 hover:bg-stone-800 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              檢查 API 狀態
            </button>
            {healthStatus && (
              <div className={`px-4 py-2 rounded-lg text-sm font-medium ${healthStatus.ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                {healthStatus.ok ? "✓ D1 已連線" : healthStatus.checks?.db || healthStatus.message || "檢查失敗"}
              </div>
            )}
          </div>
        </div>
        )}

        {adminTab === "products" && (
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-amber-600" />
            <h2 className="text-2xl font-semibold text-stone-800">佈告欄管理</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleAddAnnouncement} className="flex gap-3 mb-6">
              <textarea
                rows={3}
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                placeholder="輸入佈告欄內容（可換行，將顯示在商品首頁）"
                className="flex-1 px-4 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-y min-h-[4rem]"
              />
              <button
                type="submit"
                disabled={addingAnnouncement || !announcementContent.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {addingAnnouncement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                新增
              </button>
            </form>
            {announcements.length === 0 ? (
              <p className="text-stone-500 text-sm">尚無佈告欄，新增後會顯示在商品首頁</p>
            ) : (
              <ul className="space-y-3">
                {announcements.map((a) => (
                  <li key={a.id} className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-4">
                    {editingAnnouncementId === a.id ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <textarea
                          rows={4}
                          defaultValue={a.content}
                          id={`ann-content-${a.id}`}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 resize-y"
                        />
                        <div className="flex gap-2 items-center flex-wrap">
                          <select
                            id={`ann-active-${a.id}`}
                            defaultValue={String(a.isActive)}
                            className="px-3 py-2 rounded-lg border border-stone-300"
                            aria-label="顯示狀態"
                          >
                            <option value="1">顯示</option>
                            <option value="0">隱藏</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const content = (document.getElementById(`ann-content-${a.id}`) as HTMLTextAreaElement)?.value;
                              const isActive = Number((document.getElementById(`ann-active-${a.id}`) as HTMLSelectElement)?.value);
                              handleUpdateAnnouncement(a.id, content || a.content, isActive);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm"
                          >
                            儲存
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAnnouncementId(null)}
                            className="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-lg text-sm"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-stone-800 whitespace-pre-wrap leading-relaxed">{a.content}</p>
                          <p className="text-sm text-stone-500 mt-2">
                            建立：{formatDateTime(a.createdAt)} · 修改：{formatDateTime(a.updatedAt)}
                            {a.isActive ? " · 顯示中" : " · 已隱藏"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingAnnouncementId(a.id)}
                            className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="編輯"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(a.id)}
                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            title="刪除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        )}

        {adminTab === "members" && (
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-stone-600" />
            <h2 className="text-2xl font-semibold text-stone-800">會員清單</h2>
          </div>
          <div className="p-6">
            {membersLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-stone-500 text-center py-12">尚無會員</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {members.map((m) => (
                  <li key={m.id} className="p-4 flex items-center gap-4">
                    {m.pictureUrl ? (
                      <img src={m.pictureUrl} alt="" className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
                        <Users className="w-6 h-6 text-stone-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900">{m.displayName || "未設定名稱"}</p>
                      <p className="text-sm text-stone-500">Line ID: {m.lineUserId}</p>
                      <p className="text-xs text-stone-400">加入：{formatDateTime(m.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        )}

        {adminTab === "orders" && (
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-stone-600" />
            <h2 className="text-2xl font-semibold text-stone-800">訂單管理</h2>
          </div>
          <div className="p-6">
            {ordersLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
              </div>
            ) : orders.length === 0 ? (
              <p className="text-stone-500 text-center py-12">尚無訂單</p>
            ) : (
              <ul className="space-y-4">
                {orders.map((order) => {
                  const paymentStatus = orderEdits[order.id]?.paymentStatus ?? order.paymentStatus;
                  const shippingStatus = orderEdits[order.id]?.shippingStatus ?? order.shippingStatus;
                  const isCompleted = paymentStatus === "paid" && shippingStatus === "shipped";
                  return (
                  <li
                    key={order.id}
                    className={`p-4 border border-stone-200 rounded-xl ${isCompleted ? "bg-stone-100" : ""}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="font-semibold text-stone-900">訂單 #{order.id}</span>
                      <span className="text-sm text-stone-500">{formatDateTime(order.createdAt)}</span>
                      <span className="text-sm text-stone-600">{(order as Order & { memberName?: string }).memberName || "會員"}</span>
                    </div>
                    {order.note && (
                      <p className="text-sm text-stone-600 mb-2">備註：{order.note}</p>
                    )}
                    <div className="space-y-2 mb-4">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex gap-2 text-sm">
                          <img src={item.imageUrl || ""} alt="" className="w-10 h-10 object-cover rounded" />
                          <span>{item.productName} × {item.quantity}</span>
                          <span className="text-emerald-600">
                            {item.productMaxPrice != null && item.productMaxPrice > item.productPrice
                              ? `NT$ ${(item.productPrice * item.quantity).toLocaleString()} - ${(item.productMaxPrice * item.quantity).toLocaleString()}`
                              : `NT$ ${(item.productPrice * item.quantity).toLocaleString()}`}
                          </span>
                        </div>
                      ))}
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="text-sm text-stone-600 mb-4">
                        小計：
                        {orderTotals(order.items).hasRange
                          ? ` NT$ ${orderTotals(order.items).min.toLocaleString()} - NT$ ${orderTotals(order.items).max.toLocaleString()}`
                          : ` NT$ ${orderTotals(order.items).min.toLocaleString()}`}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={orderEdits[order.id]?.paymentStatus ?? order.paymentStatus}
                        onChange={(e) =>
                          setOrderEdits((prev) => ({
                            ...prev,
                            [order.id]: {
                              ...(prev[order.id] ?? { paymentStatus: order.paymentStatus, shippingStatus: order.shippingStatus }),
                              paymentStatus: e.target.value,
                            },
                          }))
                        }
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm"
                        aria-label="付款狀態"
                      >
                        <option value="unpaid">未付款</option>
                        <option value="paid">已付款</option>
                      </select>
                      <select
                        value={orderEdits[order.id]?.shippingStatus ?? order.shippingStatus}
                        onChange={(e) =>
                          setOrderEdits((prev) => ({
                            ...prev,
                            [order.id]: {
                              ...(prev[order.id] ?? { paymentStatus: order.paymentStatus, shippingStatus: order.shippingStatus }),
                              shippingStatus: e.target.value,
                            },
                          }))
                        }
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm"
                        aria-label="出貨狀態"
                      >
                        <option value="unshipped">未出貨</option>
                        <option value="shipped">已出貨</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleOrderStatusConfirm(order.id)}
                        disabled={orderSavingId === order.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {orderSavingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        確認
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOrderDelete(order.id)}
                        disabled={orderDeletingId === order.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors"
                      >
                        {orderDeletingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        刪除
                      </button>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        )}

        {adminTab === "products" && hasLocalStorageData && (
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

        {adminTab === "products" && (
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
                      {Array.from(new Set([...categories, "日本代購", "韓國代購", "母嬰用品", "生活雜貨", "美妝保養"]))
                        .filter(Boolean)
                        .sort()
                        .map(cat => (
                          <option key={cat} value={cat} />
                        ))}
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
              <div className="p-6 border-b border-stone-100 flex justify-between items-center flex-wrap gap-2">
                <h2 className="text-xl font-semibold text-stone-800">已上架商品</h2>
                <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-sm font-medium">
                  共 {total} 件
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
                <>
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
                        <div className="text-sm text-stone-500 mt-1 flex flex-wrap gap-x-4 gap-y-0">
                          <span className="whitespace-nowrap">建立：{formatDateTime(product.createdAt)}</span>
                          {(product.updatedAt && product.updatedAt !== product.createdAt) && (
                            <span className="whitespace-nowrap">修改：{formatDateTime(product.updatedAt)}</span>
                          )}
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
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 p-6 border-t border-stone-100 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      title="上一頁"
                      aria-label="上一頁"
                      className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-stone-600 text-sm font-medium">
                      第 {page} / {totalPages} 頁
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
