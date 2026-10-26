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