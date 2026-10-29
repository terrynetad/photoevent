# 本地驗收結果 — 2026-10-27

## 已通過

- `npm test`：7/7 選圖規則測試通過。
- `npx tsc --noEmit`：通過。
- 新增程式 lint：0 errors、0 warnings。
- `npm run build`：通過；使用 example.supabase.co 及假 publishable key，並非正式設定。
- Chromium + Playwright 本地 UI 驗收：6 項流程通過，0 個 page errors。
  - Model 列表空白 avatar 使用已標記的 published 活動圖片。
  - 個人頁不顯示 IG，空白相簿正常 fallback，390px 手機版無橫向溢出。
  - 未登入時不可進入編輯器。
  - 名字儲存不覆寫既有 slug、Bio、IG。
  - 選取 11 張相片時，在任何上傳及資料寫入前拒絕。
  - 主要相片與一張相簿圖片的模擬上傳、URL 儲存成功。

## 既有 lint 問題

原始 `2ca62ed`：6 errors、9 warnings。
修改後整個 app：5 errors、7 warnings，均在既有活動後台／活動頁：

- `app/admin/page.tsx`：4 errors、5 warnings（函式宣告順序、Date.now 的 React Compiler 純度規則、hook dependency、img）。
- `app/events/page.tsx`：1 error（既有 effect setState）。
- `app/events/[slug]/event-detail-client.tsx`：2 warnings（既有 img）。

本次未擴大修改活動管理邏輯；不能宣稱全專案 lint 通過。

## 尚未驗證

- SQL migration 尚未在真實 PostgreSQL／Supabase 執行。
- Storage、Auth、RLS、外鍵、實際 published 資料皆以 mock 驗收，不能當作真實資料庫權限測試。
- 正式資料庫備份、政策審核、preview deployment 及完整真實上傳驗收尚未執行。
- 沒有推送 GitHub、合併 main、更新 release tag 或部署正式網站。

截圖全部為測試資料，並非真實 Model 相片。

## 隔離 mock UI 驗收 — 2026-10-27

- `npm run test:ui:mock`：4/4 Playwright UI 測試通過。
- 測試在 OS 暫存專案副本執行；副本排除 `.env*`，使用明確的假 Supabase URL／key，測試後清除。
- Auth、profiles、models、已標記活動圖片及圖片回應由瀏覽器攔截器 mock；未明確 mock 的外部請求會被阻擋，且測試會檢查沒有未 mock 的外連。
- 驗證空白主要相片／相簿使用已標記的 published 活動圖片、手選主要相片／相簿優先、失效相片 fallback／佔位圖、管理員 mock 登入流程、第 11 張相片在任何 Storage／資料寫入前被拒絕，以及 390px 手機版沒有水平溢出。
- Mock headed 截圖含明確的「MOCK DATA - NOT REAL」標記，保存在驗收工作目錄；為避免將測試圖片當成產品資產，本發布不包含這些截圖。
- 本次不修改正式 UI、認證或資料功能。mock 管理員及 mock 資料只存在測試攔截器，不代表真實權限驗收。
- 真實 Supabase URL／key、Auth、Storage、RLS、資料庫內容及 SQL migration 均未連接或驗證；mock 測試不能替代正式環境權限或儲存驗收。

## 選圖預覽與記憶體 Mock Storage — 2026-10-27

- `npm run test:ui:mock`：6/6 Playwright UI 測試通過；`npm test`、`npx tsc --noEmit` 及新增程式 lint 通過。
- 管理頁選擇主要相片或相簿圖片後使用本機 object URL 即時預覽；上傳仍只在按下儲存後進行，切換／清除／離開編輯器時回收預覽 URL。
- Mock Storage 僅在測試記憶體保存上傳圖片 bytes 與 MIME type；支援 public image GET，驗證儲存後管理預覽與公開個人頁均能讀回同一圖片。測試涵蓋 SDK multipart 上傳格式。
- 左側 Model 清單可依名稱或 slug 搜尋；保留原本載入與管理員驗證流程。
- 使用者已完成 Mock 圖片選取、上傳及圖片顯示的手動驗收。
- 未修改正式 Supabase、Auth 或 Storage adapter；測試以外的外部請求仍會被攔截並阻擋。以上僅為 mock 驗收，並未連接或驗證真實 Supabase。
- 真實 Supabase Storage 上傳、RLS 政策及資料庫 migration 尚未驗證。

## Staging 最終收尾驗收 — 2026-10-28

本節更新 2026-10-27 的歷史狀態；結構建置沒有重跑。目標為 `photoevent-staging`（project ref `inmupscyidzspldxqymj`），所有實際 staging 操作均由本機 `http://127.0.0.1:3000` 發起。未操作 production、未修改 schema／policy／grant、未刪除 staging 資源。

證據來自本次工作的瀏覽器操作記錄、頁面狀態與先前保存的 staging 驗收 checkpoint；沒有為每項操作另存 HAR、SQL 查詢輸出或完整網路封包。只有明確列出的觀察才標為通過；零列更新或沒有錯誤本身不視為拒絕權限的證明。

### 真實 staging：管理員

| 操作 | 預期 | 實際結果 | 證據與判定 |
|---|---|---|---|
| 以受控管理員登入 `/admin` | 進入管理後台並顯示管理員狀態 | 後台顯示 ADMIN 及活動管理頁 | 瀏覽器頁面狀態；通過 |
| 新增帶有 `STAGING QA` 標記的 Model，設定主要圖片與 2 張相簿圖片後儲存、重新整理 | Model 與圖片 URL 持久化，公開頁可讀取圖片 | 重新整理後資料仍在；公開 Model 頁的 3 張圖片均載入 | 管理頁、公開頁及圖片載入觀察；通過 |
| 編輯 Model 名稱並在管理頁搜尋 | 編輯後名稱保存且可搜尋 | 名稱改為 `STAGING QA Model 20261028-1440 EDITED`，搜尋找到該項目 | 管理頁編輯與搜尋結果；通過 |
| 選擇 SVG 與大於 5 MB 的圖片 | 前端拒絕不支援格式與超限圖片 | UI 拒絕儲存這兩種圖片 | 管理頁操作結果；前端驗證通過。未證明 Storage 伺服器端限制 |
| 已有 2 張圖片時再選 9 張 | 不接受超過 10 張 | UI 在第 11 張拒絕；該批待選圖片未儲存 | 管理頁操作結果；前端限制通過 |
| 清除測試 Model 手選 avatar／gallery 並儲存 | 可呈現符合條件的 published 活動圖片 fallback | 公開 Model 頁呈現一張已標記的 published 活動圖片；原 Model Storage 圖片物件未刪除 | 管理頁與公開頁狀態；通過 |
| 建立測試 draft 與 published 活動、上傳 cover/gallery，並標記至測試 Model | 公開 fallback 只採用符合條件的 published 活動圖片 | published 標記圖片顯示；draft 未出現在公開活動列表 | 活動管理頁與公開 Model／活動頁；通過 |
| 儲存 draft 新 gallery 圖片後，不關閉編輯器查看圖片清單 | 編輯器立即反映最新儲存結果 | 初次發現列表使用舊 state；修正後再次儲存，編輯器圖片數從 1 變 2 | 修正前後的 staging 瀏覽器操作；回歸通過 |

上述管理員 UI 格式、5 MB 與 10 張結果只證明 UI 行為；Storage 伺服器端 MIME／大小限制另於下方直接測試。公開 bucket 的 URL 可公開讀取；本次沒有測試匿名請求對該 URL 的可讀性。

### 真實 staging：一般帳號與訪客

| 身分／操作 | 預期 | 實際結果 | 證據與判定 |
|---|---|---|---|
| 一般帳號載入自己的 profile，執行只提交 `role='user'` 的自身角色更新 | RLS 拒絕一般帳號更新自己的 role | profile 確認為 `user`；更新回傳 `42501`（頁面顯示拒絕，瀏覽器同時記錄 403） | 權限檢查頁結果與 403；通過此特定自身更新拒絕測試 |
| 一般帳號直接造訪 `/admin/models` | 管理頁要求管理員登入 | 頁面顯示「需要管理員登入」 | 瀏覽器頁面狀態；管理頁存取拒絕通過 |
| 一般帳號對指定 QA Model 提交不同的測試名稱 PATCH | RLS 阻止一般帳號修改 Model，且資料保持原值 | 使用專用一般測試帳號的有效 session；REST PATCH 回 HTTP 200、回傳 0 rows；同一一般 session 立即讀回名稱仍為原值，之後另由已驗證 admin session 讀回同一測試 Model，名稱仍為原值 | 一般 session 寫入結果、前後讀回及 admin 獨立讀回；判定寫入被 RLS 過濾、資料未變，通過。HTTP 200／0 rows 單獨不足以判定拒絕 |
| 一般帳號對自己的 `profiles.role` 直接 PATCH `admin` | 資料庫拒絕升級且角色保持 `user` | REST 回 HTTP 403、Postgres `42501`；同一 session 讀回角色仍為 `user` | HTTP 回應與角色讀回；通過。只針對專用一般測試帳號 |
| 登出後直接造訪 `/admin/models` | 訪客不可進入管理頁 | 頁面顯示「需要管理員登入」 | 瀏覽器頁面狀態；前端頁面存取拒絕通過。未以訪客直接送出資料庫寫入請求 |

### 真實 staging：Storage 伺服器端限制

三項測試均直接呼叫指定 staging 的 Storage REST API，使用已核實為 `admin` 的 staging 管理員 session 與 publishable key；未透過 Model UI 前端驗證，未使用 service role。測試物件路徑使用既有 QA Model UUID 作首段，唯一檔名且 `upsert=false`。

| 操作 | 預期 | 實際結果 | 證據與判定 |
|---|---|---|---|
| 上傳 304,445 bytes 的 JPEG (`image/jpeg`) | 接受有效小圖片 | HTTP 200；物件建立成功 | Storage REST 回應及唯一 object path；通過。公開 bucket 代表 URL 可公開讀取 |
| 上傳 5,242,881 bytes（5 MB + 1 byte）的 PNG (`image/png`) | 伺服器拒絕超過 bucket 限制的檔案 | HTTP 400，`Payload too large`／`The object exceeded the maximum allowed size` | Storage REST 錯誤回應；伺服器端大小限制通過 |
| 上傳 41 bytes 的 SVG (`image/svg+xml`) | 伺服器拒絕未允許 MIME type | HTTP 400，`invalid_mime_type`／`mime type image/svg+xml is not supported` | Storage REST 錯誤回應；伺服器端格式限制通過 |

受限制檔案沒有成功建立 Storage object。有效 JPEG 測試物件是預期寫入且未刪除，路徑保存在驗收工作目錄的資源清單。測試對公開 bucket 使用的圖片可經公開 URL 讀取；不得將其誤認為私有測試資料。

### Mock 與本機驗證（不得當作真實 staging 權限證據）

| 指令／操作 | 預期 | 實際結果 | 證據與判定 |
|---|---|---|---|
| `npm test` | 單元測試通過 | 7/7 通過 | Node test runner 摘要；通過 |
| `npm run test:ui:mock` | 隔離 Mock UI 流程通過 | 6/6 通過；測試在暫存副本執行，排除 `.env*`，使用 mock URL/key 並攔截 Supabase 請求 | Playwright 輸出；通過，僅 Mock |
| `npx tsc --noEmit` | 無型別錯誤 | 通過 | 指令退出碼 0 |
| `npm run lint` | lint 完成 | 0 errors、6 個 `<img>` 最佳化 warnings | ESLint 輸出；通過但保留 warnings |
| `npm run build` | 完成 production build | 在隔離暫存副本，以明確 mock URL/key 建置成功；沒有碰觸執行中的本機 dev server `.next` 目錄 | Next.js build 輸出；通過。不是遠端 deploy 或 staging 驗收 |

本機驗證均使用假 Supabase endpoint/key；沒有輸出或讀取 `.env.local` 內容，該檔由 `.gitignore` 忽略。為避免與執行中的 dev server 共用 `.next`，最初兩次以外部 `node_modules` symlink 建置失敗（Turbopack／webpack 無法解析暫存目錄外的套件）；改為複製依賴到隔離目錄後 build 成功，這兩次失敗屬隔離方式而非應用編譯錯誤。Mock runner 的 npm cleanup 曾有 Windows `EPERM` 警告及 ESLint 套件棄用警告，但 6 項測試全通過且未留下 `photoevent-model-profile-mock-*` 暫存目錄。

### 程式修改、安全檢查與剩餘限制

- `app/admin/page.tsx`：將管理資料載入改為可回傳最新活動清單，儲存後使用該清單更新目前編輯器，避免讀取 React state 更新前的舊活動資料；儲存活動圖片路徑改用唯一 ID，避免 `Date.now()` 同一時間碰撞及純度 lint 問題；管理員驗證／資料載入 callback 調整以符合 hook lint。
- `app/events/page.tsx`：調整初始載入及手動重試的載入狀態更新，修正 effect／callback lint 問題。
- 暫時使用的 `/staging-qa-role-check` 已移除；本機路由現在回 404。對 `app`、`lib`、`scripts` 及測試程式的掃描沒有找到測試帳號密碼、`service_role` 或 service-role key；Mock 測試值是明確假值，不是憑證。
- 曾有測試密碼出現在瀏覽器快照。使用者須重設該 staging 測試密碼；若其他服務重複使用，也應一併更換。本文件不記錄密碼。
- 沒有改動 Supabase schema、RLS policies、grants 或正式資料；沒有刪除 staging 資源；沒有 commit、push、合併或部署。
- 未確認項目：匿名訪客直接呼叫資料庫／Storage 寫入 API 的拒絕，以及 Storage 以外的檔案處理邊界情況。此次指定的三項安全測試均已完成並通過，未發現需改動 schema／RLS／policy／grant 的安全缺陷。

### 保留的測試資源（未自動清理）

- 一筆明確標記的 staging QA Model、一筆 draft 活動及一筆 published 活動保留。
- Model、draft/published 活動的已上傳 cover/gallery 圖片及 Storage objects 均保留。Model 手選圖片 URL 已清除作 fallback 測試，但原 Storage objects 未刪除。精確 Storage object 路徑未保存在本文件。
- 一個有效 JPEG Storage 測試物件保留於公開 `model-images` bucket；圖片可能可由任何人透過公開 URL 讀取。由負責人核對資源清單後決定是否清理。
- Staging 專用管理員及一般測試帳號保留；帳號密碼不記錄。由專案負責人核對資料用途後，再人工清理測試帳號及其 Auth/profile 資料。
- 本機保留少量 gallery 測試 JPEG、SVG 格式檔及超過 5 MB 的圖片；清理前確認不再需要。

清理 staging 資料或帳號前，先以 UUID／slug／Storage object path 核對只涉及上述 QA 資源；不要執行全表刪除或批次清理。

## Production 發布唯讀驗收 — 2026-10-29

Production 程式發布來源為 `terrynetad/photoevent` 的 `main`。發布前 Vercel deployment `Ge1C7ApXBAvceeLVMpQps89avoN1` 指向 `2ca62ed0667ed25428b94c4f35a0d707d91f7557`；Model release commit `fcd697d5cb2ff19ed8e65baa7dca6788ac1408b2` 對應 Vercel Production deployment `C6tCgX6HywtNMwjsxQbDKQZC3X9h`，狀態 Ready，Production alias 為 `https://photoevent-iota.vercel.app`。

| 路徑／操作 | 預期 | 實際結果 | 證據與判定 |
|---|---|---|---|
| Vercel deployment 詳情 | Production alias、Git repo／branch／commit 與 release 相符 | Ready；`terrynetad/photoevent`、`main`、release commit；domain 包含正式網址 | Vercel Deployment Overview；通過 |
| `/` 首頁 | 公開首頁可呈現 | HTTP 200，首頁標題與導覽正常，列出活動與 Model 入口 | Production 瀏覽器頁面；通過 |
| `/events` 活動列表 | 已發布活動可載入 | HTTP 200，顯示 8 場近期活動與篩選 | Production 瀏覽器頁面；通過 |
| 已發布活動詳情 | 活動內容與相片可展示 | HTTP 200，標題／資訊／4 張相片呈現；等待 lazy-loading 後 4 張圖片皆載入 | Production 瀏覽器頁面及圖片載入狀態；通過 |
| `/models` 及一個公開 Model 個人頁 | Model 列表／個人頁呈現，沒有 Model 圖片時顯示佔位 | 兩頁 HTTP 200；列表有 8 個 Model；所查個人頁明確顯示無相片佔位及公開活動區塊 | Production 瀏覽器頁面；通過呈現檢查，未新增正式 Model 測試資料 |
| `/admin` 未登入入口 | 顯示登入表單，不暴露管理資料 | HTTP 200，顯示 ADMIN ACCESS 登入表單 | Production 瀏覽器頁面；僅驗證入口，不做正式登入／寫入 |

Production 驗收只讀公開頁面及 Vercel deployment metadata；沒有新增／修改／刪除正式資料，沒有正式管理員登入，也沒有正式圖片上傳。Production DB 設定以既有唯讀 metadata 驗證結果為證據；不以本表的頁面檢查取代 RLS／Storage 權限驗收。release worktree 另執行 `npm test` 7/7、`npm run test:ui:mock` 6/6、`npx tsc --noEmit`、`npm run lint`（0 errors／6 warnings）及 `npm run build`，其中 build 使用假 Supabase URL/key。
