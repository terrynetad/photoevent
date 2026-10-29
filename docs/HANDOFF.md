# 開發與發布交接 — 2026-10-29

## 目前狀態

- 已驗收開發來源：`test/model-profile-local-mock-ui-20261027`，基準 HEAD `9578753`。
- 原 production clone：`main`，基準 HEAD `2ca62ed`。
- Staging 專案：`photoevent-staging`，project ref `inmupscyidzspldxqymj`。
- 本次 Staging schema／Auth／Storage／Model gallery 四階段建置與設定唯讀驗證先前已完成；本次收尾未重跑建置或全面盤點。
- 活動編輯器最新狀態及活動圖片路徑修正保留於 `app/admin/page.tsx` 與 `app/events/page.tsx`；驗收證據詳見 [docs/qa/RESULTS.md](./qa/RESULTS.md)。
- `.env.local` 是本機 staging 設定，已由 `.gitignore` 忽略。不可輸出或提交任何 key／密碼；不得使用 production secrets 或 service role key。

## 本次修改與驗證

- 修正活動儲存後編輯器仍讀取舊 `activities` state 的問題：使用資料載入 callback 回傳的最新活動資料刷新目前編輯器。
- 活動圖片路徑改用唯一 ID，並調整管理資料載入、公開活動載入 callback 狀態以符合 lint 規則。
- 真實 staging 管理員流程已驗證 Model 新增／編輯／搜尋、圖片上傳與重新整理後顯示、公開頁、前端格式／5 MB／10 張限制、published fallback 與 draft 排除、活動圖片即時刷新修正。
- 訪客管理頁拒絕、一般帳號 Model API 寫入限制、一般帳號直接提交 `profiles.role='admin'` 的拒絕，以及 Storage 伺服器端格式／5 MB 限制均已驗證。Model PATCH 回 200／0 rows，但寫入前後由一般帳號及獨立 admin session 讀回確認資料未變；role PATCH 回 403／42501 且讀回仍為 user。
- Storage 使用已驗證 admin session 直接呼叫指定 staging Storage API：有效 JPEG 接受；超過 5 MB 的 PNG 與 SVG 均 HTTP 400 拒絕。沒有使用 service role、沒有修改 schema／RLS／policy／grant。
- 本機最終驗證：`npm test` 7/7、`npm run test:ui:mock` 6/6、`npx tsc --noEmit` 通過、`npm run lint` 0 errors／6 個 `<img>` warnings、isolated `npm run build` 成功。所有本機檢查使用假 Supabase URL/key；Mock 與 build 不讀取 staging/production 資料。
- 暫用 `/staging-qa-role-check` 頁面已移除；本機假憑證／service-role 掃描未找到問題。瀏覽器快照曾顯示測試密碼，使用者須重設該 staging 測試密碼；文件未記錄其值。

## 已知限制與後續審批

- 本次三項指定安全測試均通過，沒有發現需變更資料庫權限的安全缺陷。尚未測試訪客直接呼叫 DB／Storage API 的拒絕，以及所有可能檔案內容的邊界情況；若發佈要求涵蓋這些項目，需另行安排。
- 有效 JPEG 測試物件留在公開 `model-images` bucket，所有人可能透過公開 URL 讀取；由負責人確認後再決定是否清理。
- 本次未 commit、push、合併 main 或部署；提交／部署仍須由負責人依一般流程另行審批。

## 保留的 staging QA 資源

- 保留一筆明確標記的 staging QA Model，以及一筆 draft 和一筆 published QA 活動。
- 已上傳的 Model／活動圖片及 Storage objects 保留；測試 Model 手選 URL 已清除以驗證 fallback，但物件未刪除。精確 Storage object paths 未保存。
- 一個有效 JPEG Storage 測試物件保留於公開 `model-images` bucket，圖片可能可由任何人透過公開 URL 讀取；不要自動刪除。
- 專用 staging 管理員及一般測試帳號保留；一般帳號已確認不是 admin。不要記錄帳號密碼。
- 本機仍保留少量 gallery JPEG、SVG 及超過 5 MB 的測試素材；清理前先確認使用狀態。

未經確認前不要清理任何 staging 資源。日後只按上述 Model UUID／slug、活動名稱／slug 與核對後的 Storage paths 清理；禁止全表或廣泛批次刪除。
