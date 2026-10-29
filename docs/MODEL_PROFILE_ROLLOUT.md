# Model 個人檔案：修改、驗收與還原

## 範圍

- 後台 `/admin/models`：新增／編輯名字、主要相片、其他相片。
- 其他相片建議 5–10 張，最多 10 張；不足 5 張亦可儲存，可移除及前移排序。
- JPG、PNG、WebP，每張最多 5 MB；主要相片建議 4:5、1200 × 1500 px，完整顯示、不裁切。
- 公開頁不顯示 Bio 或 IG；不刪除資料庫既有 Bio、IG、slug、排序或啟用狀態。
- 新 Model 自動產生唯一 slug；既有活動及圖片標記關聯不更動。
- 現有公開活動區塊保留，不屬於額外個人資料欄位。

## 空白與失效相片

1. 主要相片有值：優先顯示；若空白，使用已標記該 Model 的已發布活動圖片。
2. 其他相片有手選資料：只顯示手選相簿，不自動湊足 5 或 10 張。
3. 整個相簿留空：使用同一組已標記活動圖片，去重後最多 10 張。
4. 活動先依 `start_at` 新至舊排序，同活動依圖片 `sort_order` 小至大，URL 作固定同分排序。
5. 不使用未標記圖片、活動封面或草稿活動圖片冒充 Model 相片。
6. 主要相片失效時嘗試已標記活動圖片；都不可用則顯示中性佔位圖／「暫無相片」。相簿單張失效顯示「暫無相片」。
7. 此次「空白」解讀為圖片欄位留空，不是名字空白；名字必填。

## 備份

- 修改前基準 commit：`2ca62ed`（V1.0.0 後的文件補充 commit）。
- 舊版 branch：`backup/model-profile-before-20261027`。
- 舊版 tag：`backup-model-profile-20261027`。
- 新版 branch：`feature/model-profile`。
- 交付 bundle 含新舊分支及歷史；沒有覆寫 main、沒有重打 v1.0.0 tag。
- 所有上傳使用隨機新路徑，不覆蓋／刪除舊檔案。移除相片只移除引用。
- 上傳途中或儲存失敗可能留下未引用新檔案；確認沒有任何資料引用後才人工清理，不能自動刪除舊相片。

## 上線前（尚未執行）

1. 匯出／備份正式資料庫 `models`、現有 RLS policies、Storage bucket 設定；保留原有部署。
2. 在測試 Supabase 檢查既有 `models`、`profiles`、`activity_image_models` → `activity_images` → `activities` 外鍵與權限。
3. 現有 repository 缺少完整初始 schema，此 migration **不能用於從零重建整個資料庫**。不要盲目執行 `supabase db push`。
4. 審查並在測試環境套用 `supabase/migrations/20261027070000_model_profile_gallery.sql`。新增 `models.gallery_urls` 和 `model-images` 公開 bucket，不刪除舊欄位或資料。
5. 確認 `profiles` 的 RLS 不允許一般用戶把自己改為 admin。確認 models 既有 policies 沒有授予一般使用者寫入；PostgreSQL permissive policies 會以 OR 合併，新政策不會取消舊政策。
6. 確認匿名用戶能讀取公開 Model 及已發布活動的圖片標記關聯，不能讀取草稿內容。前端 published 篩選並非 RLS 的替代。
7. Storage 是**公開相片 bucket**：停用 Model／移除相片不會撤銷已知圖片 URL。不要上傳私密圖片；需要下架時另行規劃資料及檔案處理。
8. 若 `model-images` bucket 已存在，本 migration 不會覆寫其設定；必須人工核對大小、MIME 限制及公開狀態。
9. 部署 preview：使用該環境的 Supabase URL／publishable key；不使用 service role key，不提交 `.env`。
10. 真實驗收：admin 登入、非 admin 拒絕寫入／上傳、主要相片及相簿新增／替換／排序／移除、10 張上限、5 MB 上限、草稿不入選、無標記相片、圖片失效及手機版。
11. 多人同時編輯時，儲存前會比對讀取快照，但不是資料庫原子鎖；此版不宣稱可防止所有併發競爭。
12. 通過測試及使用者批准後，才推送 feature 分支、開 PR、合併部署；本次沒有推送或部署。

## 還原程式碼

在交付資料夾中（bundle 放在父目錄）：

```bash
git clone ../photoevent-model-profile.bundle photoevent-restored
cd photoevent-restored
git switch backup/model-profile-before-20261027
npm ci
```

另行使用原有安全方式設定 `.env.local`，不可從 Notion 或交付檔案取得 secrets。
若新版尚未合併，直接放棄 feature 分支並部署舊版即可；若已合併，使用 PR revert 或 `git revert` 建立還原 commit，不使用 `git reset --hard` 或 force push。

- 新增欄位／bucket 可以保留：舊版程式不讀 `gallery_urls`，毋須為還原程式而刪資料。
- 不自動撤銷 RLS；若需撤銷，必須使用上線前保存的 policy 定義核對，避免令資料公開或中斷既有流程。
- 還原程式不會還原新版期間修改過的名字／avatar；需要資料還原時使用上線前備份逐筆核對。

## 本地驗證

```bash
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Build 需要設定 Supabase URL／publishable key；此次使用測試用 URL 及假 key，沒有連接正式服務。
完整 lint 原版已有錯誤；請以隨附 QA 結果區分既有問題與新增程式。
