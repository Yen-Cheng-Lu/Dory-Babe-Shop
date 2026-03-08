/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Storefront from "./pages/Storefront";
import Admin from "./pages/Admin";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import MyOrders from "./pages/MyOrders";
import { setToken } from "./services/api";
import { useAuth } from "./contexts/AuthContext";

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
          <Route path="/admin-manage-products" element={<Admin />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
