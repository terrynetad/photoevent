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
| 目前正式版本 | **V1.0.0** |
| 正式版本 Commit | `577a0a0` |
| Release Commit 訊息 | `release: v1.0.0 activity management and homepage` |
| Release Tag | `v1.0.0` |
| V1.0.0 建立日期 | 2026-10-26 |

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
│  └─ /admin                  活動管理後台
│
├─ Supabase
│  ├─ Auth                    管理員登入
│  ├─ PostgreSQL              活動、Model、主題、服裝、關聯資料
│  └─ Storage
│     └─ activity-images      活動封面及活動相簿圖片
│
└─ Vercel
   └─ 連接 GitHub main branch 後自動部署
## 2026-10-27：簡化 Model 個人檔案（本地實作，未部署）

- 使用者確認：只需名字、主要相片、其他相片（建議 5–10 張，上限 10 張），不顯示 IG／Bio。
- 主要相片或整個相簿留空時，使用已標記該 Model 的 published 活動圖片；不使用未標記封面或草稿圖片。
- 已新增 `/admin/models`、統一前台選圖、相片管理、加法式 migration；保留舊資料、相片檔及舊版分支。
- 此決定更新上方歷史「等待確認 Model 管理」規劃；V1.0.0 正式版本及 tag 不變。
- 開發分支：`feature/model-profile`；備份：`backup/model-profile-before-20261027`（基準 `2ca62ed`）。
- 驗證：7 項單元測試、TypeScript、build、新增程式 lint、本地 mock UI 流程通過。完整 app 的既有 lint 問題仍未修正。
- 未做：正式 Supabase migration、真實 RLS／Storage 驗收、推送／部署。
- 上線及還原步驟：`docs/MODEL_PROFILE_ROLLOUT.md`；QA：`docs/qa/RESULTS.md`。
