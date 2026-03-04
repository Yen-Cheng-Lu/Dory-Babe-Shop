# D1 資料庫設定檢查清單

若網頁無法載入商品、後台無法新增，請依序完成以下步驟。

---

## 方式 A：一鍵完成（推薦）

### 1. 設定 GitHub Secrets（啟用自動部署）

1. 前往 GitHub 專案 → **Settings** → **Secrets and variables** → **Actions**
2. 點擊 **New repository secret**
3. 新增 `CLOUDFLARE_API_TOKEN`，值為您的 Cloudflare API Token

完成後，每次 push 到 main 會自動：套用 migration、建置、部署。

### 2. 在 Cloudflare Dashboard 綁定 D1（必做）

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. 點選專案 **dory-babe-shop**
3. **Settings** → **Functions** → **Bindings**
4. **Add binding** → **D1 database**
5. 設定：
   - **Variable name:** `DB`
   - **D1 database:** `dory-babe-shop-db`
6. 儲存後，**Deployments** → **Retry deployment** 或推送新 commit 觸發部署

---

## 方式 B：本機手動執行

```powershell
# 設定 Token
$env:CLOUDFLARE_API_TOKEN = "您的_API_Token"

# 執行一鍵腳本
.\scripts\setup-and-deploy.ps1
```

或分步執行：

```powershell
npx wrangler d1 migrations apply dory-babe-shop-db --remote
npm run build
npm run deploy
```

完成後同樣需至 **Cloudflare Dashboard 綁定 D1**（見上方步驟 2）。

---

## 除錯：檢查 API 回應

瀏覽器 F12 → **Network**，重新整理後查看 `/api/products`：

| 狀態碼 | 可能原因 |
|--------|----------|
| **404** | Functions 路由問題 |
| **500** | D1 未綁定或資料表不存在 |
| **200 且 []** | D1 已連線，資料庫為空（可從後台新增）
