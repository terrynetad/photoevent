"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./events.module.css";

const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

const FALLBACK_EVENT_IMAGES = [
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
];

const EVENTS_HERO_IMAGE =
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=2200&q=90";

type EventStatusFilter = "all" | "upcoming" | "past";

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
  description: string | null;
  start_at: string;
  end_at: string | null;
  location_name: string | null;
  location_address: string | null;
  price: number | string | null;
  currency: string | null;
  cover_image_url: string | null;
  sort_order: number | null;
  activity_images: ActivityImage[] | null;
  activity_models: ActivityModelRelation[] | null;
  activity_themes: ActivityThemeRelation[] | null;
  activity_outfits: ActivityOutfitRelation[] | null;
};

type EventView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
  location: string;
  price: string;
  image: string;
  modelNames: string[];
  themeNames: string[];
  outfitNames: string[];
  tagText: string;
};

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getDatePart(
  value: string | Date,
  type: Intl.DateTimeFormatPartTypes,
  locale = "en-GB"
) {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: HONG_KONG_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  return parts.find((part) => part.type === type)?.value ?? "";
}

function formatEventDate(value: string) {
  return {
    day: getDatePart(value, "day"),
    month: new Intl.DateTimeFormat("en-GB", {
      timeZone: HONG_KONG_TIME_ZONE,
      month: "short",
    })
      .format(new Date(value))
      .toUpperCase(),
    full: new Intl.DateTimeFormat("zh-HK", {
      timeZone: HONG_KONG_TIME_ZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(new Date(value)),
  };
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

  if (currencyCode === "USD") {
    return `US$${formattedAmount}`;
  }

  return `${currencyCode} ${formattedAmount}`;
}

function uniqueNames(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function isUpcomingEvent(event: EventView) {
  const comparisonTime = new Date(event.endAt || event.startAt).getTime();

  return comparisonTime >= Date.now();
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>("upcoming");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [selectedOutfit, setSelectedOutfit] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      setIsLoading(true);
      setLoadError("");

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
              sort_order,
              activity_images (
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
          .eq("status", "published")
          .order("start_at", { ascending: true })
          .order("sort_order", { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        const activityRows = (data ?? []) as unknown as ActivityRow[];

        const mappedEvents = activityRows.map((activity, index): EventView => {
          const sortedImages = [...(activity.activity_images ?? [])].sort(
            (a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)
          );

          const sortedModelRelations = [
            ...(activity.activity_models ?? []),
          ].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

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

          const displayTags = [...themeNames, ...outfitNames];

          return {
            id: activity.id,
            slug: activity.slug?.trim() || "",
            title: activity.title,
            description: activity.description?.trim() || "",
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
              FALLBACK_EVENT_IMAGES[index % FALLBACK_EVENT_IMAGES.length],
            modelNames,
            themeNames,
            outfitNames,
            tagText: displayTags.length > 0 ? displayTags.join("・") : "攝影活動",
          };
        });

        if (isMounted) {
          setEvents(mappedEvents);
        }
      } catch (error) {
        console.error("Load all events failed:", error);

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

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  const availableModels = useMemo(
    () =>
      uniqueNames(events.flatMap((event) => event.modelNames)).sort((a, b) =>
        a.localeCompare(b, "zh-Hant")
      ),
    [events]
  );

  const availableThemes = useMemo(
    () =>
      uniqueNames(events.flatMap((event) => event.themeNames)).sort((a, b) =>
        a.localeCompare(b, "zh-Hant")
      ),
    [events]
  );

  const availableOutfits = useMemo(
    () =>
      uniqueNames(events.flatMap((event) => event.outfitNames)).sort((a, b) =>
        a.localeCompare(b, "zh-Hant")
      ),
    [events]
  );

  const eventCounts = useMemo(
    () => ({
      all: events.length,
      upcoming: events.filter(isUpcomingEvent).length,
      past: events.filter((event) => !isUpcomingEvent(event)).length,
    }),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "upcoming" && isUpcomingEvent(event)) ||
        (statusFilter === "past" && !isUpcomingEvent(event));

      const searchableText = [
        event.title,
        event.description,
        event.location,
        event.tagText,
        ...event.modelNames,
        ...event.themeNames,
        ...event.outfitNames,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchableText.includes(keyword);

      const matchesModel =
        !selectedModel || event.modelNames.includes(selectedModel);

      const matchesTheme =
        !selectedTheme || event.themeNames.includes(selectedTheme);

      const matchesOutfit =
        !selectedOutfit || event.outfitNames.includes(selectedOutfit);

      return (
        matchesStatus &&
        matchesSearch &&
        matchesModel &&
        matchesTheme &&
        matchesOutfit
      );
    });
  }, [
    events,
    searchTerm,
    selectedModel,
    selectedOutfit,
    selectedTheme,
    statusFilter,
  ]);

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("upcoming");
    setSelectedModel("");
    setSelectedTheme("");
    setSelectedOutfit("");
  }

  return (
    <main className={styles.eventsPage}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="返回 PhotoEvent 首頁">
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
          <Link href="/#models">Models</Link>
          <Link href="/#categories">主題分類</Link>
        </nav>

        <Link className={styles.backHomeButton} href="/">
          返回首頁 <span>←</span>
        </Link>
      </header>

      <section
        className={styles.hero}
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(10, 10, 9, 0.9) 0%, rgba(10, 10, 9, 0.56) 47%, rgba(10, 10, 9, 0.22) 100%), url("${EVENTS_HERO_IMAGE}")`,
        }}
      >
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>ALL PHOTOEVENT ACTIVITIES</p>

          <h1>
            找到下一場，
            <br />
            值得按下快門的創作。
          </h1>

          <p>
            依日期、Model、拍攝主題與服裝風格，探索所有已發布的攝影活動。
            <br />
            活動時間、地點、費用與報名資訊，一次整理。
          </p>
        </div>

        <div className={styles.heroStatistics}>
          <strong>{isLoading ? "—" : eventCounts.upcoming}</strong>
          <span>
            場即將舉行
            <br />
            攝影活動
          </span>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={`${styles.eyebrow} ${styles.darkEyebrow}`}>
              ACTIVITY DIRECTORY
            </p>
            <h2>全部活動</h2>
            <p>使用搜尋與篩選，快速找到適合你的下一次拍攝企劃。</p>
          </div>

          <Link className={styles.calendarLink} href="/#calendar">
            以月曆查看 <span>→</span>
          </Link>
        </div>

        <section className={styles.filterPanel} aria-label="活動篩選工具">
          <div className={styles.searchRow}>
            <label className={styles.searchBox}>
              <span>⌕</span>

              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜尋活動名稱、地點、Model、主題或服裝風格⋯"
              />
            </label>

            <button
              className={styles.resetButton}
              type="button"
              onClick={resetFilters}
            >
              清除篩選
            </button>
          </div>

          <div className={styles.filterGroups}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>活動時間</span>

              <div className={styles.chipList}>
                <button
                  className={
                    statusFilter === "upcoming"
                      ? styles.activeFilterChip
                      : styles.filterChip
                  }
                  type="button"
                  onClick={() => setStatusFilter("upcoming")}
                >
                  即將舉行 <small>{eventCounts.upcoming}</small>
                </button>

                <button
                  className={
                    statusFilter === "all"
                      ? styles.activeFilterChip
                      : styles.filterChip
                  }
                  type="button"
                  onClick={() => setStatusFilter("all")}
                >
                  全部 <small>{eventCounts.all}</small>
                </button>

                <button
                  className={
                    statusFilter === "past"
                      ? styles.activeFilterChip
                      : styles.filterChip
                  }
                  type="button"
                  onClick={() => setStatusFilter("past")}
                >
                  已結束 <small>{eventCounts.past}</small>
                </button>
              </div>
            </div>

            {availableModels.length > 0 && (
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Model</span>

                <div className={styles.chipList}>
                  <button
                    className={
                      !selectedModel
                        ? styles.activeFilterChip
                        : styles.filterChip
                    }
                    type="button"
                    onClick={() => setSelectedModel("")}
                  >
                    全部
                  </button>

                  {availableModels.map((modelName) => (
                    <button
                      key={modelName}
                      className={
                        selectedModel === modelName
                          ? styles.activeFilterChip
                          : styles.filterChip
                      }
                      type="button"
                      onClick={() => setSelectedModel(modelName)}
                    >
                      {modelName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableThemes.length > 0 && (
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>拍攝主題</span>

                <div className={styles.chipList}>
                  <button
                    className={
                      !selectedTheme
                        ? styles.activeFilterChip
                        : styles.filterChip
                    }
                    type="button"
                    onClick={() => setSelectedTheme("")}
                  >
                    全部
                  </button>

                  {availableThemes.map((themeName) => (
                    <button
                      key={themeName}
                      className={
                        selectedTheme === themeName
                          ? styles.activeFilterChip
                          : styles.filterChip
                      }
                      type="button"
                      onClick={() => setSelectedTheme(themeName)}
                    >
                      {themeName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableOutfits.length > 0 && (
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>服裝風格</span>

                <div className={styles.chipList}>
                  <button
                    className={
                      !selectedOutfit
                        ? styles.activeFilterChip
                        : styles.filterChip
                    }
                    type="button"
                    onClick={() => setSelectedOutfit("")}
                  >
                    全部
                  </button>

                  {availableOutfits.map((outfitName) => (
                    <button
                      key={outfitName}
                      className={
                        selectedOutfit === outfitName
                          ? styles.activeFilterChip
                          : styles.filterChip
                      }
                      type="button"
                      onClick={() => setSelectedOutfit(outfitName)}
                    >
                      {outfitName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className={styles.resultBar}>
          <span>
            {isLoading
              ? "正在載入活動資料⋯"
              : `找到 ${filteredEvents.length} 場活動`}
          </span>

          {!isLoading && statusFilter === "upcoming" && (
            <small>目前優先顯示尚未結束的活動。</small>
          )}
        </div>

        {loadError ? (
          <section className={styles.dataState}>
            <p className={styles.eyebrow}>DATABASE NOTICE</p>
            <h3>活動資料暫時未能載入</h3>
            <p>{loadError}</p>
            <button type="button" onClick={() => window.location.reload()}>
              重新載入頁面
            </button>
          </section>
        ) : isLoading ? (
          <section className={styles.dataState}>
            <p className={styles.eyebrow}>LOADING ACTIVITIES</p>
            <h3>正在整理下一次快門的時間⋯</h3>
            <p>PhotoEvent 正在從資料庫讀取已發布活動。</p>
          </section>
        ) : filteredEvents.length === 0 ? (
          <section className={styles.dataState}>
            <p className={styles.eyebrow}>NO MATCHING ACTIVITIES</p>
            <h3>沒有符合目前條件的活動。</h3>
            <p>試試清除搜尋文字或篩選條件，看看其他攝影活動。</p>
            <button type="button" onClick={resetFilters}>
              清除全部篩選
            </button>
          </section>
        ) : (
          <div className={styles.eventGrid}>
            {filteredEvents.map((event) => {
              const date = formatEventDate(event.startAt);
              const upcoming = isUpcomingEvent(event);

              return (
                <article className={styles.eventCard} key={event.id}>
                  <Link
                    className={styles.imageLink}
                    href={event.slug ? `/events/${event.slug}` : "/events"}
                    aria-label={
                      event.slug
                        ? `查看 ${event.title} 詳情`
                        : `${event.title} 尚未設定詳情頁網址`
                    }
                  >
                    <div
                      className={styles.eventImage}
                      style={{ backgroundImage: `url("${event.image}")` }}
                    >
                      <div className={styles.dateBadge}>
                        <strong>{date.day}</strong>
                        <span>{date.month}</span>
                      </div>

                      <span
                        className={
                          upcoming ? styles.upcomingBadge : styles.pastBadge
                        }
                      >
                        {upcoming ? "即將舉行" : "已結束"}
                      </span>
                    </div>
                  </Link>

                  <div className={styles.eventBody}>
                    <p className={styles.eventTheme}>{event.tagText}</p>

                    <h3>
                      {event.slug ? (
                        <Link href={`/events/${event.slug}`}>{event.title}</Link>
                      ) : (
                        event.title
                      )}
                    </h3>

                    <p className={styles.eventDate}>{date.full}</p>

                    <ul className={styles.eventInfo}>
                      <li>◷ {formatTimeRange(event.startAt, event.endAt)}</li>
                      <li>⌖ {event.location}</li>
                    </ul>

                    {event.modelNames.length > 0 && (
                      <div className={styles.modelTags}>
                        {event.modelNames.map((modelName) => (
                          <span key={`${event.id}-${modelName}`}>
                            {modelName}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className={styles.eventFooter}>
                      <span>
                        <small>活動費用</small>
                        <strong>{event.price}</strong>
                      </span>

                      {event.slug ? (
                        <Link href={`/events/${event.slug}`}>
                          查看詳情 <span>→</span>
                        </Link>
                      ) : (
                        <span className={styles.noDetail}>詳情準備中</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.bottomCta}>
        <p className={styles.eyebrow}>PHOTOEVENT HONG KONG</p>
        <h2>下一場創作，從一個日期開始。</h2>
        <p>
          想以日期安排檔期？回到首頁活動日曆，查看每一天已發布的拍攝活動。
        </p>

        <Link className={styles.primaryButton} href="/#calendar">
          查看活動日曆 <span>→</span>
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

        <Link href="/events">回到活動列表 ↑</Link>
      </footer>
    </main>
  );
}