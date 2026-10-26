"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

type ModelRow = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  instagram_url: string | null;
  is_active: boolean;
  sort_order: number;
};

type ActivityImage = {
  image_url: string | null;
  sort_order: number | null;
};

type ActivityRow = {
  id: string;
  title: string;
  slug: string | null;
  start_at: string;
  end_at: string | null;
  location_name: string | null;
  location_address: string | null;
  price: number | string | null;
  currency: string | null;
  cover_image_url: string | null;
  status: string;
  activity_images: ActivityImage[] | null;
};

type ActivityModelRelation = {
  sort_order: number | null;
  activities: ActivityRow | ActivityRow[] | null;
};

type ActivityView = {
  id: string;
  title: string;
  slug: string;
  startAt: string;
  endAt: string | null;
  location: string;
  price: string;
  image: string | null;
};

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getModelInitial(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return "M";
  }

  const englishOnly = trimmedName.replace(/[^\u0000-\u007f]/g, "").trim();

  if (englishOnly) {
    return englishOnly.slice(0, 1).toUpperCase();
  }

  return trimmedName.slice(0, 1).toUpperCase();
}

function getEnglishName(name: string) {
  const englishOnly = name.replace(/[^\u0000-\u007f]/g, "").trim();

  if (englishOnly) {
    return englishOnly.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: HONG_KONG_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: HONG_KONG_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatTimeRange(startAt: string, endAt: string | null) {
  const startTime = formatTime(startAt);
  const endTime = formatTime(endAt);

  if (!endTime) {
    return startTime;
  }

  return `${startTime} - ${endTime}`;
}

function formatPrice(
  price: number | string | null,
  currency: string | null
) {
  if (price === null || price === undefined || price === "") {
    return "費用待定";
  }

  const amount = Number(price);

  if (Number.isNaN(amount)) {
    return "費用待定";
  }

  const formattedAmount = new Intl.NumberFormat("en-HK", {
    maximumFractionDigits: 0,
  }).format(amount);

  const currencyCode = (currency || "TWD").toUpperCase();

  if (currencyCode === "HKD" || currencyCode === "HK$") {
    return `HK$${formattedAmount}`;
  }

  if (currencyCode === "TWD" || currencyCode === "NTD") {
    return `NT$${formattedAmount}`;
  }

  return `${currencyCode} ${formattedAmount}`;
}

function getInstagramUrl(value: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://instagram.com/${trimmedValue.replace(/^@/, "")}`;
}

function ModelProfileContent() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const [model, setModel] = useState<ModelRow | null>(null);
  const [activities, setActivities] = useState<ActivityView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadModelProfile() {
      if (!slug) {
        if (isMounted) {
          setNotFound(true);
          setIsLoading(false);
        }

        return;
      }

      setIsLoading(true);
      setLoadError("");
      setNotFound(false);

      const { data: modelData, error: modelError } = await supabase
        .from("models")
        .select(
          `
            id,
            name,
            slug,
            bio,
            avatar_url,
            instagram_url,
            is_active,
            sort_order
          `
        )
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (modelError) {
        console.error("Supabase model profile query failed:", modelError);

        if (isMounted) {
          setLoadError("暫時未能載入這位 Model 的資料。請稍後再試。");
          setIsLoading(false);
        }

        return;
      }

      if (!modelData) {
        if (isMounted) {
          setNotFound(true);
          setIsLoading(false);
        }

        return;
      }

      const currentModel = modelData as ModelRow;

      const { data: relationData, error: relationError } = await supabase
        .from("activity_models")
        .select(
          `
            sort_order,
            activities!inner (
              id,
              title,
              slug,
              start_at,
              end_at,
              location_name,
              location_address,
              price,
              currency,
              cover_image_url,
              status,
              activity_images (
                image_url,
                sort_order
              )
            )
          `
        )
        .eq("model_id", currentModel.id)
        .eq("activities.status", "published")
        .order("sort_order", { ascending: true });

      if (relationError) {
        console.error(
          "Supabase model activity relation query failed:",
          relationError
        );

        if (isMounted) {
          setLoadError(
            "Model 資料已載入，但關聯活動暫時未能取得。請稍後再試。"
          );
          setModel(currentModel);
          setIsLoading(false);
        }

        return;
      }

      const mappedActivities = (
        (relationData ?? []) as unknown as ActivityModelRelation[]
      )
        .flatMap((relation) => ensureArray(relation.activities))
        .map((activity): ActivityView => {
          const sortedImages = [...(activity.activity_images ?? [])].sort(
            (a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)
          );

          return {
            id: activity.id,
            title: activity.title,
            slug: activity.slug?.trim() || "",
            startAt: activity.start_at,
            endAt: activity.end_at,
            location:
              activity.location_name?.trim() ||
              activity.location_address?.trim() ||
              "地點待公布",
            price: formatPrice(activity.price, activity.currency),
            image:
              activity.cover_image_url?.trim() ||
              sortedImages[0]?.image_url?.trim() ||
              null,
          };
        })
        .sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );

      if (isMounted) {
        setModel(currentModel);
        setActivities(mappedActivities);
        setIsLoading(false);
      }
    }

    loadModelProfile();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const instagramUrl = useMemo(
    () => getInstagramUrl(model?.instagram_url ?? null),
    [model?.instagram_url]
  );

  if (isLoading) {
    return (
      <main className="detail-page">
        <nav className="detail-nav">
          <Link className="brand" href="/" aria-label="PhotoEvent 首頁">
            <span className="brand-mark">P</span>

            <span>
              <strong>PHOTO</strong>
              <em>EVENT</em>
            </span>
          </Link>

          <Link className="detail-nav-back" href="/models">
            ← 所有 Models
          </Link>
        </nav>

        <section className="detail-state-page">
          <div className="detail-state">
            <p className="eyebrow dark">LOADING MODEL PROFILE</p>
            <h1>正在載入 Model 資料⋯</h1>
            <p>系統正在確認這位創作夥伴的公開活動安排。</p>
          </div>
        </section>
      </main>
    );
  }

  if (notFound || !model) {
    return (
      <main className="detail-page">
        <nav className="detail-nav">
          <Link className="brand" href="/" aria-label="PhotoEvent 首頁">
            <span className="brand-mark">P</span>

            <span>
              <strong>PHOTO</strong>
              <em>EVENT</em>
            </span>
          </Link>

          <Link className="detail-nav-back" href="/models">
            ← 所有 Models
          </Link>
        </nav>

        <section className="detail-state-page">
          <div className="detail-state">
            <p className="eyebrow dark">MODEL NOT FOUND</p>
            <h1>找不到這位 Model。</h1>

            <p>
              此頁面可能尚未公開、Model 已停用，或網址 slug 不正確。
            </p>

            <Link className="detail-back-link" href="/models">
              返回 Model 列表 <span>→</span>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const hasAvatar = Boolean(model.avatar_url?.trim());

  return (
    <main className="model-profile-page">
      <nav className="detail-nav">
        <Link className="brand" href="/" aria-label="PhotoEvent 首頁">
          <span className="brand-mark">P</span>

          <span>
            <strong>PHOTO</strong>
            <em>EVENT</em>
          </span>
        </Link>

        <Link className="detail-nav-back" href="/models">
          ← 所有 Models
        </Link>
      </nav>

      <section className="model-profile-hero">
        {hasAvatar ? (
          <div
            className="model-profile-hero-image"
            style={{
              backgroundImage: `url("${model.avatar_url}")`,
            }}
          />
        ) : (
          <div className="model-profile-hero-fallback">
            <span>{getModelInitial(model.name)}</span>
          </div>
        )}

        <div className="model-profile-hero-overlay" />

        <div className="model-profile-hero-content">
          <p className="eyebrow">
            PHOTOEVENT MODEL ・ {getEnglishName(model.name)}
          </p>

          <h1>{model.name}</h1>

          <p>
            {model.bio?.trim() || "PhotoEvent 攝影活動合作 Model。"}
          </p>

          <div className="model-profile-hero-actions">
            <a className="detail-primary-button" href="#activities">
              查看公開活動 <span>↓</span>
            </a>

            {instagramUrl ? (
              <a
                className="detail-text-button"
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
              >
                Instagram <span>↗</span>
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section model-profile-content" id="activities">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">PUBLIC ACTIVITIES</p>
            <h2>{model.name} 的公開活動</h2>
            <p>以下僅顯示目前狀態為 published 的活動資料。</p>
          </div>

          <span className="models-count">{activities.length} 場活動</span>
        </div>

        {loadError ? (
          <div className="data-state">
            <strong>活動資料暫時未能完整載入</strong>
            <p>{loadError}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="data-state">
            <strong>目前尚未公開合作活動</strong>
            <p>
              這位 Model 的下一次活動安排公開後，會自動顯示在這裡。
            </p>
          </div>
        ) : (
          <div className="event-grid">
            {activities.map((activity) => (
              <article className="event-card" key={activity.id}>
                <div
                  className={[
                    "event-image",
                    !activity.image ? "event-image-fallback" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    activity.image
                      ? {
                          backgroundImage: `url("${activity.image}")`,
                        }
                      : undefined
                  }
                >
                  {!activity.image ? (
                    <span className="event-image-fallback-mark">P</span>
                  ) : null}

                  <span className="event-status">已公開</span>
                </div>

                <div className="event-body">
                  <p className="event-theme">{formatDate(activity.startAt)}</p>

                  <h3>{activity.title}</h3>

                  <ul className="event-info">
                    <li>
                      ◷ {formatTimeRange(activity.startAt, activity.endAt)}
                    </li>
                    <li>⌖ {activity.location}</li>
                  </ul>

                  <div className="event-footer">
                    <span>
                      <small>活動費用</small>
                      <strong>{activity.price}</strong>
                    </span>

                    {activity.slug ? (
                      <Link href={`/events/${activity.slug}`}>
                        查看詳情 <span>→</span>
                      </Link>
                    ) : (
                      <span>詳情準備中</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="models-cta">
        <p className="eyebrow">PHOTOEVENT HONG KONG</p>

        <h2>下一次創作，值得提早安排。</h2>

        <p>
          透過 PhotoEvent 查看最新公開活動，找到適合你的拍攝主題與創作節奏。
        </p>

        <Link className="primary-button light-button" href="/events">
          探索所有活動 <span>→</span>
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

        <Link href="/models">返回 Models 列表 ↑</Link>
      </footer>
    </main>
  );
}

export default function ModelProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="detail-page">
          <nav className="detail-nav">
            <Link className="brand" href="/" aria-label="PhotoEvent 首頁">
              <span className="brand-mark">P</span>

              <span>
                <strong>PHOTO</strong>
                <em>EVENT</em>
              </span>
            </Link>

            <Link className="detail-nav-back" href="/models">
              ← 所有 Models
            </Link>
          </nav>

          <section className="detail-state-page">
            <div className="detail-state">
              <p className="eyebrow dark">LOADING MODEL PROFILE</p>
              <h1>正在載入 Model 資料⋯</h1>
              <p>系統正在準備此頁面的公開資訊。</p>
            </div>
          </section>
        </main>
      }
    >
      <ModelProfileContent />
    </Suspense>
  );
}