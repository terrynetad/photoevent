"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

const FALLBACK_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=90";

type RelationModel = {
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type RelationTheme = {
  name: string | null;
};

type RelationOutfit = {
  name: string | null;
};

type ActivityImage = {
  image_url: string | null;
  alt_text: string | null;
  sort_order: number | null;
};

type ActivityModelRelation = {
  sort_order: number | null;
  models: RelationModel | RelationModel[] | null;
};

type ActivityThemeRelation = {
  themes: RelationTheme | RelationTheme[] | null;
};

type ActivityOutfitRelation = {
  outfits: RelationOutfit | RelationOutfit[] | null;
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
  activity_models: ActivityModelRelation[] | null;
  activity_themes: ActivityThemeRelation[] | null;
  activity_outfits: ActivityOutfitRelation[] | null;
};

type EventDetail = {
  id: string;
  title: string;
  slug: string;
  startAt: string;
  endAt: string | null;
  locationName: string;
  locationAddress: string;
  price: string;
  coverImage: string;
  images: ActivityImage[];
  modelNames: string[];
  themes: string[];
  outfits: string[];
};

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
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
  const start = formatTime(startAt);
  const end = formatTime(endAt);

  return end ? `${start} - ${end}` : start;
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: HONG_KONG_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(value));
}

function formatDateBadge(value: string) {
  const date = new Date(value);

  return {
    day: new Intl.DateTimeFormat("en-GB", {
      timeZone: HONG_KONG_TIME_ZONE,
      day: "2-digit",
    }).format(date),
    month: new Intl.DateTimeFormat("en-GB", {
      timeZone: HONG_KONG_TIME_ZONE,
      month: "short",
    })
      .format(date)
      .toUpperCase(),
  };
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

  const currencyCode = (currency || "HKD").toUpperCase();

  if (currencyCode === "HKD" || currencyCode === "HK$") {
    return `HK$${formattedAmount}`;
  }

  if (currencyCode === "TWD" || currencyCode === "NTD") {
    return `NT$${formattedAmount}`;
  }

  return `${currencyCode} ${formattedAmount}`;
}

/**
 * Important:
 * useParams() is intentionally NOT called here.
 *
 * This outer component provides the Suspense boundary required by
 * Next.js 16.3+ for Client Components reading dynamic route params.
 */
export default function EventDetailPage() {
  return (
    <Suspense fallback={<EventLoadingPage />}>
      <EventDetailContent />
    </Suspense>
  );
}

/**
 * useParams() must be inside the Suspense boundary.
 */
function EventDetailContent() {
  const params = useParams<{ slug: string }>();

  const slug = useMemo(() => {
    const rawSlug = params?.slug;

    if (Array.isArray(rawSlug)) {
      return rawSlug[0] || "";
    }

    return rawSlug || "";
  }, [params]);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEventDetail() {
      if (!slug) {
        if (isMounted) {
          setLoadError("找不到活動網址。");
          setIsLoading(false);
        }

        return;
      }

      setIsLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("activities")
        .select(
          `
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
              alt_text,
              sort_order
            ),
            activity_models (
              sort_order,
              models (
                name,
                bio,
                avatar_url
              )
            ),
            activity_themes (
              themes (
                name
              )
            ),
            activity_outfits (
              outfits (
                name
              )
            )
          `
        )
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) {
        console.error("Supabase event detail query failed:", error);

        if (isMounted) {
          setLoadError(
            "暫時未能載入活動資料。請稍後再試，或檢查 Supabase RLS 讀取權限。"
          );
          setIsLoading(false);
        }

        return;
      }

      if (!data) {
        if (isMounted) {
          setLoadError("找不到此活動，或活動尚未發布。");
          setIsLoading(false);
        }

        return;
      }

      const activity = data as unknown as ActivityRow;

      const sortedImages = [...(activity.activity_images ?? [])]
        .filter((image) => Boolean(image.image_url?.trim()))
        .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

      const modelNames = [...(activity.activity_models ?? [])]
        .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
        .flatMap((relation) => ensureArray(relation.models))
        .map((model) => model.name?.trim())
        .filter((name): name is string => Boolean(name));

      const themes = (activity.activity_themes ?? [])
        .flatMap((relation) => ensureArray(relation.themes))
        .map((theme) => theme.name?.trim())
        .filter((name): name is string => Boolean(name));

      const outfits = (activity.activity_outfits ?? [])
        .flatMap((relation) => ensureArray(relation.outfits))
        .map((outfit) => outfit.name?.trim())
        .filter((name): name is string => Boolean(name));

      const coverImage =
        activity.cover_image_url?.trim() ||
        sortedImages[0]?.image_url?.trim() ||
        FALLBACK_EVENT_IMAGE;

      if (isMounted) {
        setEvent({
          id: activity.id,
          title: activity.title,
          slug: activity.slug || slug,
          startAt: activity.start_at,
          endAt: activity.end_at,
          locationName: activity.location_name?.trim() || "地點待公布",
          locationAddress: activity.location_address?.trim() || "",
          price: formatPrice(activity.price, activity.currency),
          coverImage,
          images: sortedImages,
          modelNames,
          themes,
          outfits,
        });

        setIsLoading(false);
      }
    }

    loadEventDetail();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (isLoading) {
    return <EventLoadingPage />;
  }

  if (loadError || !event) {
    return (
      <main className="detail-page detail-state-page">
        <div className="detail-state">
          <p className="eyebrow dark">EVENT NOT FOUND</p>

          <h1>這場活動暫時無法顯示。</h1>

          <p>{loadError || "找不到活動資料。"}</p>

          <Link href="/#events" className="detail-primary-button">
            返回近期活動 <span>→</span>
          </Link>
        </div>
      </main>
    );
  }

  const badge = formatDateBadge(event.startAt);

  const galleryImages = event.images.filter(
    (image) => image.image_url?.trim() !== event.coverImage
  );

  return (
    <main className="detail-page">
      <nav className="detail-nav">
        <Link href="/" className="brand" aria-label="返回 PhotoEvent 首頁">
          <span className="brand-mark">P</span>

          <span>
            <strong>PHOTO</strong>
            <em>EVENT</em>
          </span>
        </Link>

        <Link href="/#events" className="detail-nav-back">
          ← 返回活動列表
        </Link>
      </nav>

      <section
        className="detail-hero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(10, 10, 9, 0.92) 0%, rgba(10, 10, 9, 0.62) 47%, rgba(10, 10, 9, 0.28) 100%), url("${event.coverImage}")`,
        }}
      >
        <div className="detail-hero-content">
          <p className="eyebrow">PHOTO EVENT / UPCOMING SESSION</p>

          <div className="detail-date-badge">
            <strong>{badge.day}</strong>
            <span>{badge.month}</span>
          </div>

          <h1>{event.title}</h1>

          <p className="detail-hero-meta">
            {formatFullDate(event.startAt)}
            <span>・</span>
            {formatTimeRange(event.startAt, event.endAt)}
          </p>

          <div className="detail-hero-actions">
            <a href="#event-information" className="detail-primary-button">
              查看活動資料 <span>↓</span>
            </a>

            <Link href="/#calendar" className="detail-text-button">
              返回活動日曆 <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="detail-content" id="event-information">
        <div className="detail-main">
          <p className="eyebrow dark">EVENT INFORMATION</p>

          <h2>活動資料</h2>

          <div className="detail-description">
            <p>
              這是一場由 PhotoEvent 整理的攝影創作活動。請先確認拍攝時間、
              地點與風格標籤，並預留足夠時間準備服裝、器材及交通安排。
            </p>

            {event.modelNames.length > 0 && (
              <p>
                本次拍攝 Model：
                <strong>{event.modelNames.join("、")}</strong>
              </p>
            )}
          </div>

          {(event.themes.length > 0 || event.outfits.length > 0) && (
            <div className="detail-tag-groups">
              {event.themes.length > 0 && (
                <div>
                  <h3>拍攝主題</h3>

                  <div className="detail-tags">
                    {event.themes.map((theme) => (
                      <span key={`theme-${theme}`}>{theme}</span>
                    ))}
                  </div>
                </div>
              )}

              {event.outfits.length > 0 && (
                <div>
                  <h3>服裝風格</h3>

                  <div className="detail-tags">
                    {event.outfits.map((outfit) => (
                      <span key={`outfit-${outfit}`}>{outfit}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {galleryImages.length > 0 && (
            <div className="detail-gallery">
              <div className="detail-gallery-heading">
                <p className="eyebrow dark">GALLERY</p>
                <h2>活動照片</h2>
              </div>

              <div className="detail-gallery-grid">
                {galleryImages.map((image, index) => (
                  <div
                    className="detail-gallery-image"
                    key={`${image.image_url}-${index}`}
                    style={{
                      backgroundImage: `url("${image.image_url}")`,
                    }}
                    role="img"
                    aria-label={image.alt_text || `${event.title} 活動照片`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="detail-sidebar">
          <div className="detail-info-card">
            <p className="eyebrow dark">SESSION DETAILS</p>

            <h2>拍攝安排</h2>

            <dl>
              <div>
                <dt>活動日期</dt>
                <dd>{formatFullDate(event.startAt)}</dd>
              </div>

              <div>
                <dt>拍攝時間</dt>
                <dd>{formatTimeRange(event.startAt, event.endAt)}</dd>
              </div>

              <div>
                <dt>活動地點</dt>
                <dd>{event.locationName}</dd>
              </div>

              {event.locationAddress && (
                <div>
                  <dt>詳細地址</dt>
                  <dd>{event.locationAddress}</dd>
                </div>
              )}

              <div>
                <dt>活動費用</dt>
                <dd className="detail-price">{event.price}</dd>
              </div>
            </dl>

            <div className="detail-registration-note">
              <strong>報名功能準備中</strong>

              <span>
                此版本先提供完整活動資料；下一階段將接上 Supabase 報名表單。
              </span>
            </div>
          </div>
        </aside>
      </section>

      <section className="detail-bottom-cta">
        <p className="eyebrow">MORE PHOTO EVENTS</p>

        <h2>下一次創作，從選好活動開始。</h2>

        <Link href="/#events" className="detail-primary-button">
          查看近期活動 <span>→</span>
        </Link>
      </section>

      <footer className="detail-footer">
        <Link href="/" className="brand footer-brand">
          <span className="brand-mark">P</span>

          <span>
            <strong>PHOTO</strong>
            <em>EVENT</em>
          </span>
        </Link>

        <span>© PhotoEvent</span>
      </footer>
    </main>
  );
}

/**
 * Deterministic Suspense fallback:
 * do not put Date.now(), Math.random(), Supabase requests,
 * browser APIs, or dynamic URL reads here.
 */
function EventLoadingPage() {
  return (
    <main className="detail-page detail-state-page">
      <div className="detail-state">
        <p className="eyebrow dark">PHOTOEVENT</p>

        <h1>正在載入活動詳情⋯</h1>

        <p>系統正在整理這場拍攝活動的時間、地點與創作資訊。</p>

        <Link href="/" className="detail-back-link">
          ← 返回首頁
        </Link>
      </div>
    </main>
  );
}