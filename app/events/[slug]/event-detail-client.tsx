"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./event-detail.module.css";

const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

type EventDetailClientProps = {
  slug: string;
};

type RelationModel = {
  name: string | null;
};

type RelationTheme = {
  name: string | null;
};

type RelationOutfit = {
  name: string | null;
};

type ActivityImage = {
  id?: string;
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
  title: string | null;
  slug: string | null;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  location_name: string | null;
  location_address: string | null;
  price: number | string | null;
  currency: string | null;
  cover_image_url: string | null;
  activity_images: ActivityImage[] | null;
  activity_models: ActivityModelRelation[] | null;
  activity_themes: ActivityThemeRelation[] | null;
  activity_outfits: ActivityOutfitRelation[] | null;
};

type GalleryImage = {
  id: string;
  url: string;
  alt: string;
};

type EventDetail = {
  id: string;
  title: string;
  slug: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  locationName: string;
  locationAddress: string;
  price: string;
  modelNames: string[];
  themeNames: string[];
  outfitNames: string[];
  galleryImages: GalleryImage[];
};

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function uniqueNames(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isValidDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function formatDate(value: string | null) {
  if (!isValidDate(value)) {
    return "日期待公布";
  }

  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: HONG_KONG_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!isValidDate(value)) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: HONG_KONG_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDateTimeRange(startAt: string | null, endAt: string | null) {
  if (!isValidDate(startAt)) {
    return "活動時間待公布";
  }

  const startDateText = formatDate(startAt);
  const startTimeText = formatTime(startAt);
  const endTimeText = formatTime(endAt);

  if (!endTimeText) {
    return `${startDateText} ${startTimeText}`.trim();
  }

  return `${startDateText} ${startTimeText} - ${endTimeText}`.trim();
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

  const currencyCode = (currency || "HKD").trim().toUpperCase();

  if (currencyCode === "HKD" || currencyCode === "HK$") {
    return `HK$${formattedAmount}`;
  }

  if (currencyCode === "TWD" || currencyCode === "NTD") {
    return `NT$${formattedAmount}`;
  }

  if (currencyCode === "USD") {
    return `US$${formattedAmount}`;
  }

  return `${currencyCode} ${formattedAmount}`;
}

function buildGalleryImages(activity: ActivityRow): GalleryImage[] {
  const sortedImages = [...(activity.activity_images ?? [])].sort(
    (a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)
  );

  const rawImages = [
    ...(activity.cover_image_url?.trim()
      ? [
          {
            id: "cover-image",
            image_url: activity.cover_image_url,
            alt_text: `${activity.title || "活動"}封面照片`,
            sort_order: -1,
          },
        ]
      : []),
    ...sortedImages,
  ];

  const usedUrls = new Set<string>();

  return rawImages.reduce<GalleryImage[]>((images, image, index) => {
    const imageUrl = image.image_url?.trim();

    if (!imageUrl || usedUrls.has(imageUrl)) {
      return images;
    }

    usedUrls.add(imageUrl);

    images.push({
      id: image.id || `${imageUrl}-${index}`,
      url: imageUrl,
      alt:
        image.alt_text?.trim() ||
        `${activity.title || "活動"} 活動照片 ${images.length + 1}`,
    });

    return images;
  }, []);
}

export default function EventDetailClient({
  slug,
}: EventDetailClientProps) {
  const normalizedSlug = useMemo(() => {
    try {
      return decodeURIComponent(slug || "").trim();
    } catch {
      return (slug || "").trim();
    }
  }, [slug]);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(
    null
  );
  const [failedImageIds, setFailedImageIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadEventDetail() {
      if (!normalizedSlug) {
        if (isMounted) {
          setLoadError("找不到活動網址識別碼。");
          setIsLoading(false);
        }

        return;
      }

      setIsLoading(true);
      setLoadError("");
      setEvent(null);
      setSelectedImage(null);
      setFailedImageIds([]);

      try {
        const { data, error } = await supabase
          .from("activities")
          .select(
            `
              id,
              title,
              slug,
              description,
              start_at,
              end_at,
              location_name,
              location_address,
              price,
              currency,
              cover_image_url,
              activity_images (
                id,
                image_url,
                alt_text,
                sort_order
              ),
              activity_models (
                sort_order,
                models (
                  name
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
          .eq("slug", normalizedSlug)
          .eq("status", "published")
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          throw new Error("找不到此活動，或活動尚未發布。");
        }

        const activity = data as unknown as ActivityRow;

        const sortedModelRelations = [...(activity.activity_models ?? [])].sort(
          (a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)
        );

        const modelNames = uniqueNames(
          sortedModelRelations.flatMap((relation) =>
            ensureArray(relation.models)
              .map((model) => model.name?.trim() || "")
              .filter(Boolean)
          )
        );

        const themeNames = uniqueNames(
          (activity.activity_themes ?? []).flatMap((relation) =>
            ensureArray(relation.themes)
              .map((theme) => theme.name?.trim() || "")
              .filter(Boolean)
          )
        );

        const outfitNames = uniqueNames(
          (activity.activity_outfits ?? []).flatMap((relation) =>
            ensureArray(relation.outfits)
              .map((outfit) => outfit.name?.trim() || "")
              .filter(Boolean)
          )
        );

        const mappedEvent: EventDetail = {
          id: activity.id,
          title: activity.title?.trim() || "未命名活動",
          slug: activity.slug?.trim() || normalizedSlug,
          description: activity.description?.trim() || "",
          startAt: activity.start_at,
          endAt: activity.end_at,
          locationName: activity.location_name?.trim() || "地點待公布",
          locationAddress: activity.location_address?.trim() || "",
          price: formatPrice(activity.price, activity.currency),
          modelNames,
          themeNames,
          outfitNames,
          galleryImages: buildGalleryImages(activity),
        };

        if (isMounted) {
          setEvent(mappedEvent);
        }
      } catch (error) {
        console.error("Load event detail failed:", error);

        if (isMounted) {
          setLoadError(
            `暫時未能載入活動資料：${
              error instanceof Error ? error.message : "未知錯誤"
            }`
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadEventDetail();

    return () => {
      isMounted = false;
    };
  }, [normalizedSlug]);

  useEffect(() => {
    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") {
        setSelectedImage(null);
      }
    }

    if (selectedImage) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedImage]);

  function markImageAsFailed(imageId: string) {
    setFailedImageIds((current) =>
      current.includes(imageId) ? current : [...current, imageId]
    );
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <section className={styles.stateSection}>
          <p className={styles.eyebrow}>LOADING EVENT</p>
          <h1>正在整理活動資料⋯</h1>
          <p>PhotoEvent 正在載入活動內容與照片。</p>

          <Link className={styles.backLink} href="/events">
            ← 返回活動列表
          </Link>
        </section>
      </main>
    );
  }

  if (loadError || !event) {
    return (
      <main className={styles.page}>
        <section className={styles.stateSection}>
          <p className={styles.eyebrow}>EVENT NOTICE</p>
          <h1>活動資料暫時無法顯示</h1>
          <p>{loadError || "找不到此活動資料。"}</p>

          <Link className={styles.backLink} href="/events">
            ← 返回活動列表
          </Link>
        </section>
      </main>
    );
  }

  const visibleGalleryImages = event.galleryImages.filter(
    (image) => !failedImageIds.includes(image.id)
  );

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="返回 PhotoEvent 首頁"
        >
          <span className={styles.brandMark}>P</span>

          <span>
            <strong>PHOTO</strong>
            <em>EVENT</em>
          </span>
        </Link>

        <nav className={styles.navLinks} aria-label="主要導覽">
          <Link href="/">首頁</Link>

          <Link className={styles.activeNavLink} href="/events">
            活動列表
          </Link>

          <Link href="/#calendar">活動日曆</Link>
        </nav>

        <Link className={styles.backHomeButton} href="/events">
          <span>←</span> 返回列表
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Link className={styles.breadcrumb} href="/events">
            ← ALL ACTIVITIES
          </Link>

          <p className={styles.eyebrow}>PHOTOEVENT HONG KONG</p>

          <h1>{event.title}</h1>

          <div className={styles.heroMeta}>
            <span>◷ {formatDateTimeRange(event.startAt, event.endAt)}</span>
            <span>⌖ {event.locationName}</span>
          </div>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className={styles.mainColumn}>
          <section className={styles.introSection}>
            <p className={styles.eyebrow}>ABOUT THIS EVENT</p>
            <h2>活動介紹</h2>

            {event.description ? (
              <p className={styles.description}>{event.description}</p>
            ) : (
              <p className={styles.descriptionMuted}>
                此活動尚未提供詳細介紹。
              </p>
            )}
          </section>

          <section className={styles.gallerySection}>
            <div className={styles.galleryHeading}>
              <div>
                <p className={styles.eyebrow}>GALLERY</p>
                <h2>活動照片</h2>
                <p>點擊照片可放大查看。</p>
              </div>

              {visibleGalleryImages.length > 0 && (
                <span className={styles.photoCount}>
                  {visibleGalleryImages.length} PHOTOS
                </span>
              )}
            </div>

            {visibleGalleryImages.length > 0 ? (
              <div className={styles.galleryGrid}>
                {visibleGalleryImages.map((image, index) => (
                  <button
                    className={styles.galleryButton}
                    type="button"
                    key={image.id}
                    onClick={() => setSelectedImage(image)}
                    aria-label={`放大查看：${image.alt}`}
                  >
                    <img
                      className={styles.galleryImage}
                      src={image.url}
                      alt={image.alt}
                      loading={index === 0 ? "eager" : "lazy"}
                      onError={() => markImageAsFailed(image.id)}
                    />

                    <span className={styles.galleryOverlay} aria-hidden="true">
                      <span className={styles.zoomIcon}>⤢</span>
                      <span>點擊放大</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : event.galleryImages.length > 0 ? (
              <div className={styles.galleryEmpty}>
                <p className={styles.eyebrow}>IMAGE LOAD FAILED</p>
                <h3>活動照片目前無法載入</h3>
                <p>
                  資料庫已有照片網址，但圖片來源無法讀取。請檢查 Supabase
                  Storage 圖片是否設為公開，或確認 image_url 是否為有效網址。
                </p>
              </div>
            ) : (
              <div className={styles.galleryEmpty}>
                <p className={styles.eyebrow}>GALLERY PREPARING</p>
                <h3>活動照片準備中</h3>
                <p>
                  此活動目前尚未上傳照片。相片上傳後會自動顯示在這裡。
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.infoCard}>
            <p className={styles.eyebrow}>EVENT INFORMATION</p>
            <h2>活動資訊</h2>

            <dl className={styles.infoList}>
              <div>
                <dt>日期時間</dt>
                <dd>{formatDateTimeRange(event.startAt, event.endAt)}</dd>
              </div>

              <div>
                <dt>活動地點</dt>
                <dd>{event.locationName}</dd>

                {event.locationAddress && (
                  <dd className={styles.address}>{event.locationAddress}</dd>
                )}
              </div>

              <div>
                <dt>活動費用</dt>
                <dd className={styles.price}>{event.price}</dd>
              </div>
            </dl>
          </section>

          {(event.modelNames.length > 0 ||
            event.themeNames.length > 0 ||
            event.outfitNames.length > 0) && (
            <section className={styles.infoCard}>
              <p className={styles.eyebrow}>CREATIVE DETAILS</p>
              <h2>拍攝企劃</h2>

              {event.modelNames.length > 0 && (
                <div className={styles.tagGroup}>
                  <span>MODELS</span>

                  <div>
                    {event.modelNames.map((name) => (
                      <em key={`model-${name}`}>{name}</em>
                    ))}
                  </div>
                </div>
              )}

              {event.themeNames.length > 0 && (
                <div className={styles.tagGroup}>
                  <span>THEMES</span>

                  <div>
                    {event.themeNames.map((name) => (
                      <em key={`theme-${name}`}>{name}</em>
                    ))}
                  </div>
                </div>
              )}

              {event.outfitNames.length > 0 && (
                <div className={styles.tagGroup}>
                  <span>OUTFITS</span>

                  <div>
                    {event.outfitNames.map((name) => (
                      <em key={`outfit-${name}`}>{name}</em>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className={`${styles.infoCard} ${styles.registrationCard}`}>
            <p className={styles.eyebrow}>REGISTRATION</p>
            <h2>報名功能準備中</h2>

            <p>
              此版本先提供完整活動資料與相片展示；下一階段將接上 Supabase
              報名表單功能。
            </p>

            <Link className={styles.listButton} href="/events">
              查看其他活動 <span>→</span>
            </Link>
          </section>
        </aside>
      </section>

      <section className={styles.bottomCta}>
        <p className={styles.eyebrow}>MORE PHOTO EVENTS</p>
        <h2>下一次創作，從下一場活動開始。</h2>

        <Link className={styles.primaryButton} href="/events">
          返回活動列表 <span>→</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>P</span>

          <span>
            <strong>PHOTO</strong>
            <em>EVENT</em>
          </span>
        </Link>

        <p>© 2026 PhotoEvent Hong Kong. 攝影活動資訊平台。</p>

        <Link href="/events">全部活動 ↑</Link>
      </footer>

      {selectedImage && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="活動照片放大檢視"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className={styles.lightboxContent}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            <button
              className={styles.lightboxClose}
              type="button"
              aria-label="關閉照片放大檢視"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>

            <img
              className={styles.lightboxImage}
              src={selectedImage.url}
              alt={selectedImage.alt}
              onError={() => {
                markImageAsFailed(selectedImage.id);
                setSelectedImage(null);
              }}
            />

            <p className={styles.lightboxCaption}>{selectedImage.alt}</p>
          </div>
        </div>
      )}
    </main>
  );
}