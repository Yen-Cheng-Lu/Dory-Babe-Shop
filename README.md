<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Dory-Babe-Shop

電商商品展示與管理後台。

## 本地開發

**需求：** Node.js

1. 安裝依賴：`npm install`
2. 啟動開發伺服器：`npm run dev`

## 部署至 Cloudflare Pages

### 方式一：透過 Git 整合（推薦）

1. 將專案推送到 GitHub
2. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 選擇你的 repository
4. 設定：
   - **Project name:** `Dory-Babe-Shop`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** 留空（專案根目錄）
5. 點擊 **Save and Deploy**

### 方式二：使用 Wrangler CLI 手動部署

1. 安裝 Wrangler：`npm install -g wrangler`
2. 登入 Cloudflare：`npx wrangler login`
3. 建置專案：`npm run build`
4. 部署：`npm run deploy` 或 `npx wrangler pages deploy dist --project-name=Dory-Babe-Shop`

### 建置失敗排錯

若部署顯示「沒有可用的部署」，請：

1. **查看建置日誌**：Deployments → 點擊失敗的部署 → **檢視詳細資料** → 查看 Build log 中的錯誤訊息
2. **設定 Node 版本**：Settings → Builds & deployments → Build configuration → Environment variables → 新增 `NODE_VERSION` = `20`（套件需要 Node 20+）
3. **確認建置設定**：
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Framework preset: `Vite`（可選，有助於自動偵測）

### D1 資料庫設定（商品儲存）

商品資料已從 localStorage 遷移至 Cloudflare D1 資料庫。請依下列步驟設定：

1. **建立 D1 資料庫**
   ```bash
   npm run db:create
   ```
   或手動執行：`npx wrangler d1 create dory-babe-shop-db`

2. **取得 database_id**  
   執行後會輸出類似以下內容，複製 `database_id`：
   ```json
   {
     "database_name": "dory-babe-shop-db",
     "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   }
   ```

3. **更新 wrangler.jsonc**  
   將 `YOUR_DATABASE_ID` 替換為上一步取得的 `database_id`。

4. **執行資料庫遷移**
   ```bash
   npm run db:migrate:remote
   ```

5. **部署**  
   完成後執行 `npm run deploy` 部署至 Cloudflare Pages。

### localStorage 遷移

若您先前使用 localStorage 儲存商品，部署後請：

1. 開啟商品管理後台（`/admin`）
2. 若偵測到 localStorage 有資料，會顯示「遷移至 D1」按鈕
3. 點擊後即可將資料一鍵遷移至 D1 資料庫

### 重要：純靜態部署

目前為純靜態部署（不含 Gemini API 後端）。若需 Gemini API 代理，請在終端機執行 `npm install` 同步 lock 檔後，再恢復 `functions` 資料夾與 `wrangler.toml`。

### 設定 GEMINI_API_KEY（若使用 AI 功能）

1. 前往 **Workers & Pages** → **dory-babe-shop** → **Settings** → **Environment variables**
2. 點擊 **Add** → **Encrypt**（建立 Secret）
3. 變數名稱：`GEMINI_API_KEY`
4. 值：你的 Gemini API Key
5. 重新部署專案使設定生效
