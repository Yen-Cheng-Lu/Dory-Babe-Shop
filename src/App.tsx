/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Storefront from "./pages/Storefront";
import Admin from "./pages/Admin";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import MyOrders from "./pages/MyOrders";
import { setToken } from "./services/api";

function LoginCallbackHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const login = searchParams.get("login");
    if (login === "success" && token) {
      setToken(token);
      refresh();
      navigate("/", { replace: true });
    } else if (login === "error") {
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate, refresh]);

  return null;
}

function AdminRoute() {
  const { isAdmin, isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      navigate("/", { replace: true });
      return;
    }
    if (!isAdmin) {
      navigate("/", { replace: true });
    }
  }, [isAdmin, isLoggedIn, loading, navigate]);

  if (loading || !isLoggedIn || !isAdmin) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center text-stone-600">
          {loading ? "載入中..." : "您沒有權限存取管理後台"}
        </div>
      </div>
    );
  }

  return <Admin />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LoginCallbackHandler />
        <Routes>
          <Route path="/" element={<Storefront />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/admin-manage-products" element={<AdminRoute />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
