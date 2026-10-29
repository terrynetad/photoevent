"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadTaggedModelPhotos, selectModelPhotos, type TaggedPhoto } from "@/lib/model-photos";
import ModelPhoto from "./model-photo";
import "./models.css";

type ModelRow = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  sort_order: number;
};

function getEnglishName(name: string) {
  const englishOnly = name.replace(/[^\u0000-\u007f]/g, "").trim();

  if (englishOnly) {
    return englishOnly.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

export default function ModelsPage() {
  const [taggedPhotos, setTaggedPhotos] = useState<TaggedPhoto[]>([]);
  const [photoWarning, setPhotoWarning] = useState("");
  const [models, setModels] = useState<ModelRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadModels() {
      setIsLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("models")
        .select(
          `
            id,
            name,
            slug,
            bio,
            avatar_url,
            is_active,
            sort_order
          `
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Supabase models query failed:", error);

        if (isMounted) {
          setLoadError(
            "暫時未能載入 Model 資料。請稍後再試，或檢查 Supabase RLS 讀取權限。"
          );
          setIsLoading(false);
        }

        return;
      }

      const rows = (data ?? []) as ModelRow[];
      try {
        const photos = await loadTaggedModelPhotos(rows.map(row => row.id));
        if (isMounted) setTaggedPhotos(photos);
      } catch {
        if (isMounted) setPhotoWarning("活動相片暫時無法載入；已設定的主要相片仍會顯示。");
      }
      if (isMounted) {
        setModels((data ?? []) as ModelRow[]);
        setIsLoading(false);
      }
    }

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="models-page">
      <nav className="detail-nav">
        <Link className="brand" href="/" aria-label="PhotoEvent 首頁">
          <span className="brand-mark">P</span>

          <span>
            <strong>PHOTO</strong>
            <em>EVENT</em>
          </span>
        </Link>

        <Link className="detail-nav-back" href="/">
          ← 返回首頁
        </Link>
      </nav>

      <section className="models-hero">
        <div className="models-hero-content">
          <p className="eyebrow">PHOTOEVENT MODELS</p>

          <h1>
            認識每一位，
            <br />
            讓靈感有了名字。
          </h1>

          <p>
            依 Model 探索已公開的攝影活動、拍攝主題與下一次創作安排。
            每一位 Model 的最新合作資訊，都會在這裡整理呈現。
          </p>
        </div>
      </section>

      <section className="section models-directory-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">MODEL DIRECTORY</p>
            <h2>全部 Models</h2>
            <p>探索目前公開合作中的 PhotoEvent Models。</p>
          </div>

          {!isLoading && !loadError ? (
            <span className="models-count">{models.length} 位 Model</span>
          ) : null}
        </div>

        {photoWarning ? <p role="status">{photoWarning}</p> : null}
        {loadError ? (
          <div className="data-state">
            <strong>Model 資料暫時未能載入</strong>
            <p>{loadError}</p>
          </div>
        ) : isLoading ? (
          <div className="data-state">
            <strong>正在載入 Models⋯</strong>
            <p>正在向資料庫確認每一位創作夥伴的公開資料。</p>
          </div>
        ) : models.length === 0 ? (
          <div className="data-state">
            <strong>暫時沒有啟用中的 Model</strong>
            <p>請於 Supabase 的 models 資料表將 is_active 設為 true。</p>
          </div>
        ) : (
          <div className="models-directory-grid">
            {models.filter(model => model.slug?.trim()).map((model, index) => {
              const photos = selectModelPhotos(model.avatar_url, [], taggedPhotos.filter(photo => photo.modelId === model.id));

              return (
                <Link
                  className="models-directory-card"
                  href={`/models/${model.slug}`}
                  key={model.id}
                  aria-label={`查看 ${model.name} 的個人頁`}
                >
                  <div className="models-directory-image">
                    <ModelPhoto
                      src={photos.main}
                      alternatives={photos.activityPhotos}
                      name={model.name}
                      className="models-directory-photo"
                    />
                  </div>

                  <div className="models-directory-overlay">
                    <p>
                      MODEL / {String(index + 1).padStart(2, "0")} ・{" "}
                      {getEnglishName(model.name)}
                    </p>

                    <h3>{model.name}</h3>


                    <small>
                      查看個人頁 <b>→</b>
                    </small>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="models-cta">
        <p className="eyebrow">CAPTURE THE MOMENT</p>

        <h2>下一場創作，從認識適合的 Model 開始。</h2>

        <p>
          查看近期公開活動，依日期、主題與拍攝風格找到下一次按下快門的理由。
        </p>

        <Link className="primary-button light-button" href="/events">
          探索活動 <span>→</span>
        </Link>
      </section>

      <footer className="detail-footer">
        <Link className="brand footer-brand" href="/">
          <span className="brand-mark">P</span>

          <span>
            <strong>PHOTO</strong>
            <em>EVENT</em>
          </span>
        </Link>

        <p>© 2026 PhotoEvent Hong Kong. 攝影活動資訊平台。</p>

        <Link href="/">回到首頁 ↑</Link>
      </footer>
    </main>
  );
}