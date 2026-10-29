# PhotoEvent 專案工作記錄（Project Worklog）

> 用途：記錄目前已完成功能、已知限制、客戶待確認事項、後續版本規劃與開發待辦事項。  
> 原則：每次完成功能、修改規格、建立 Release 或收到客戶回覆後，都更新本檔案。

---

## 專案基本資料

| 項目 | 資訊 |
|---|---|
| 專案名稱 | PhotoEvent |
| GitHub Repository | `terrynetad/photoevent` |
| 正式網站 | `https://photoevent-iota.vercel.app` |
| 開發環境 | Next.js + TypeScript + Supabase + Vercel |
| 預設 Branch | `main` |
| 目前正式版本 | **V1.1.0** |
| 正式版本 Commit | `fcd697d` |
| Release Commit 訊息 | `feat: release Model profiles and photo gallery` |
| Release Tag | `v1.1.0` |
| V1.1.0 建立日期 | 2026-10-29 |

---

# 目前系統架構

```text
PhotoEvent
│
├─ 公開網站
│  ├─ /                       首頁
│  ├─ /events                 活動列表
│  ├─ /events/[slug]          活動詳情頁
│  ├─ /models                 Model 列表
│  └─ /models/[slug]          Model 個人頁
│
├─ 管理後台
│  ├─ /admin                  活動管理後台
│  └─ /admin/models           Model 管理
│
├─ Supabase
│  ├─ Auth                    管理員登入
│  ├─ PostgreSQL              活動、Model、主題、服裝、關聯資料
│  └─ Storage
│     └─ activity-images      活動封面及活動相簿圖片
│     └─ model-images         公開 Model 相片
│
└─ Vercel
   └─ 連接 GitHub main branch 後自動部署
## 2026-10-27：簡化 Model 個人檔案（本地實作，未部署）

- 使用者確認：只需名字、主要相片、其他相片（建議 5–10 張，上限 10 張），不顯示 IG／Bio。
- 主要相片或整個相簿留空時，使用已標記該 Model 的 published 活動圖片；不使用未標記封面或草稿圖片。
- 已新增 `/admin/models`、統一前台選圖、相片管理、加法式 migration；保留舊資料、相片檔及舊版分支。
- 此決定更新上方歷史「等待確認 Model 管理」規劃；當時 V1.0.0 正式版本及 tag 不變。
- 開發分支：`feature/model-profile`；備份：`backup/model-profile-before-20261027`（基準 `2ca62ed`）。
- 驗證：7 項單元測試、TypeScript、build、新增程式 lint、本地 mock UI 流程通過。完整 app 的既有 lint 問題仍未修正。
- 當時尚未做：正式 Supabase migration、真實 RLS／Storage 驗收、推送／部署。
- 上線及還原步驟：`docs/MODEL_PROFILE_ROLLOUT.md`；QA：`docs/qa/RESULTS.md`。

## 2026-10-29：V1.1.0 Production 發布

- 發布來源：GitHub `terrynetad/photoevent` 的 `main`；Model 功能 release commit `fcd697d5cb2ff19ed8e65baa7dca6788ac1408b2`，tag `v1.1.0`。V1.0.0 tag 未修改。
- 發布前 Production Vercel deployment：`Ge1C7ApXBAvceeLVMpQps89avoN1`，GitHub `main` commit `2ca62ed0667ed25428b94c4f35a0d707d91f7557`。
- Model release Vercel deployment：`C6tCgX6HywtNMwjsxQbDKQZC3X9h`，deployment URL `https://photoevent-l33dwup4t-terrynetads-projects.vercel.app`，Production alias `https://photoevent-iota.vercel.app`，狀態 Ready，來源 `main`／`fcd697d`。
- Production Supabase ref `cpcbvvrpuekmhbzfevhq` 的變更後 metadata 已唯讀核驗：`gallery_urls`、10 張 constraint、公開 5 MB JPEG／PNG／WebP `model-images` bucket、Storage RLS 與兩條 bucket-specific policies 符合設計。既有 Model policies 及全域 grants 保持不變；未搬 staging 測試資料。
- 備份／回復點：Production logical custom-format dump 已由 archive list 驗證，保存在 repo 外的私人 Windows 備份目錄；沒有 restore 測試，且不包含 Storage 圖片 bytes。另保留本機 branch `backup/pre-production-model-profile-20261028-172939` 指向驗收來源 `957875312a76efcbdcedcf0a03de5ba89cbc5e90`。不得以舊 schema-only dump 取代完整備份。
- Release worktree 驗證：單元測試 7/7、Mock UI 6/6、TypeScript 通過、lint 0 errors／6 個既有 `<img>` warnings、Production build 通過（使用明確假 Supabase URL/key，不連線正式資料）。
- Production 唯讀頁面驗收：首頁、活動列表、活動詳情、Model 列表、Model 個人頁與 admin 登入入口皆 HTTP 200 並呈現內容；活動詳情的圖片在等待 lazy-loading 後全數載入。未以正式管理員登入或新增／修改正式資料。
- 未完成／限制：沒有 Production 登入或寫入測試；staging QA 資源仍保留且需人工確認後清理；曾曝光的 staging 測試密碼須重設；未測匿名訪客直接呼叫資料庫／Storage 寫入 API。Release SHA 以此處 tag 可追蹤，部署詳情以 Vercel deployment ID 為準。
