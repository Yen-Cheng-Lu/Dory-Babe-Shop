-- 訂單明細新增最高價格欄位（用於價格區間商品）
ALTER TABLE order_items ADD COLUMN productMaxPrice REAL;
