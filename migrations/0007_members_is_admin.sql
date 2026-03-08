-- 新增會員管理員欄位
ALTER TABLE members ADD COLUMN isAdmin INTEGER DEFAULT 0;

-- 將目前所有會員設為管理員（兩位現有會員）
UPDATE members SET isAdmin = 1;
