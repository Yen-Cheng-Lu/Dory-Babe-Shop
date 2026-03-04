/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Storefront from "./pages/Storefront";
import Admin from "./pages/Admin";
import ProductDetail from "./pages/ProductDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        {/* Admin route is hidden and not linked from the main page */}
        <Route path="/admin-manage-products" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}
