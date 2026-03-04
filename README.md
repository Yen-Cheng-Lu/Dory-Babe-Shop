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

### 設定 GEMINI_API_KEY（若使用 AI 功能）

1. 前往 **Workers & Pages** → **Dory-Babe-Shop** → **Settings** → **Environment variables**
2. 點擊 **Add** → **Encrypt**（建立 Secret）
3. 變數名稱：`GEMINI_API_KEY`
4. 值：你的 Gemini API Key
5. 重新部署專案使設定生效
