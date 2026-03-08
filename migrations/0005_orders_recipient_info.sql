-- 訂單新增收件人資訊欄位
ALTER TABLE orders ADD COLUMN recipientName TEXT;
ALTER TABLE orders ADD COLUMN pickupStore TEXT;
ALTER TABLE orders ADD COLUMN phone TEXT;
