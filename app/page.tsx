"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

const FALLBACK_EVENT_IMAGES = [
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
];

const FALLBACK_MODEL_IMAGES = [
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=85",
];

const CATEGORY_ICONS = ["◐", "✦", "◒", "◈", "◑", "☾"];

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
  start_at: string;
  end_at: string | null;
  location_name: string | null;
  location_address: string | null;
  price: number | string | null;
  currency: string | null;
  cover_image_url: string | null;
  status: string;
  is_featured: boolean | null;
  sort_order: number | null;
  activity_images: ActivityImage[] | null;
  activity_models: ActivityModelRelation[] | null;
  activity_themes: ActivityThemeRelation[] | null;
  activity_outfits: ActivityOutfitRelation[] | null;
};

type ModelRow = {
  id: string;
  name: string;
  slug: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type ThemeRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type EventView = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  location: string;
  price: string;
  themeText: string;
  image: string;
  modelNames: string[];
};

type ModelView = {
  id: string;
  name: string;
  englishName: string;
  style: string;
  image: string;
};

type CategoryView = {
  id: string;
  icon: string;
  name: string;
  count: string;
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

  if (!end) {
    return start;
  }

  return `${start} - ${end}`;
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

function getEnglishName(name: string) {
  const englishOnly = name.replace(/[^\u0000-\u007f]/g, "").trim();

  if (englishOnly) {
    return englishOnly.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

function toHongKongDateKey(value: string) {
  const year = getDatePart(value, "year");
  const month = getDatePart(value, "month");
  const day = getDatePart(value, "day");

  return `${year}-${month}-${day}`;
}

function getHongKongYearMonth(value: string) {
  return {
    year: Number(getDatePart(value, "year")),
    month: Number(getDatePart(value, "month")),
  };
}

function formatCalendarMonth(year: number, month: number) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: HONG_KONG_TIME_ZONE,
    year: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default function Home() {
  const [events, setEvents] = useState<EventView[]>([]);
  const [models, setModels] = useState<ModelView[]>([]);
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 月曆目前顯示的年月，例如 { year: 2026, month: 11 }
  const [calendarMonth, setCalendarMonth] = useState<{
    year: number;
    month: number;
  } | null>(null);

  // 使用者目前點選的日期，格式：2026-11-15
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHomepageData() {
      setIsLoading(true);
      setLoadError("");

      try {
        const [activitiesResult, modelsResult, themesResult] =
          await Promise.all([
            supabase
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
                  is_featured,
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
              .order("sort_order", { ascending: true }),

            supabase
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
              .order("name", { ascending: true }),

            supabase
              .from("themes")
              .select(
                `
                  id,
                  name,
                  slug,
                  description,
                  is_active,
                  sort_order
                `
              )
              .eq("is_active", true)
              .order("sort_order", { ascending: true })
              .order("name", { ascending: true }),
          ]);

        const firstError =
          activitiesResult.error || modelsResult.error || themesResult.error;

        if (firstError) {
          console.error("Supabase homepage query failed:", firstError);

          if (isMounted) {
            setLoadError(
              "暫時未能載入活動資料。請稍後再試，或檢查 Supabase 的 RLS 讀取權限設定。"
            );
            setIsLoading(false);
          }

          return;
        }

        const activityRows = (activitiesResult.data ?? []) as unknown as ActivityRow[];
        const modelRows = (modelsResult.data ?? []) as unknown as ModelRow[];
        const themeRows = (themesResult.data ?? []) as unknown as ThemeRow[];

        const mappedEvents = activityRows.map((activity, index): EventView => {
          const sortedImages = [...(activity.activity_images ?? [])].sort(
            (a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999)
          );

          const sortedModelRelations = [
            ...(activity.activity_models ?? []),
          ].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

          const modelNames = sortedModelRelations.flatMap((relation) =>
            ensureArray(relation.models)
              .map((model) => model.name?.trim())
              .filter((name): name is string => Boolean(name))
          );

          const themeNames = (activity.activity_themes ?? []).flatMap(
            (relation) =>
              ensureArray(relation.themes)
                .map((theme) => theme.name?.trim())
                .filter((name): name is string => Boolean(name))
          );

          const outfitNames = (activity.activity_outfits ?? []).flatMap(
            (relation) =>
              ensureArray(relation.outfits)
                .map((outfit) => outfit.name?.trim())
                .filter((name): name is string => Boolean(name))
          );

          const tags = [...themeNames, ...outfitNames];

          return {
            id: activity.id,
            title: activity.title,
            startAt: activity.start_at,
            endAt: activity.end_at,
            location:
              activity.location_name?.trim() ||
              activity.location_address?.trim() ||
              "地點待公布",
            price: formatPrice(activity.price, activity.currency),
            themeText: tags.length > 0 ? tags.join("・") : "攝影活動",
            image:
              activity.cover_image_url?.trim() ||
              sortedImages[0]?.image_url?.trim() ||
              FALLBACK_EVENT_IMAGES[
                index % FALLBACK_EVENT_IMAGES.length
              ],
            modelNames,
          };
        });

        const now = new Date();

        const futureEvents = mappedEvents.filter((event) => {
          const comparisonTime = new Date(
            event.endAt || event.startAt
          ).getTime();

          return comparisonTime >= now.getTime();
        });

        const displayEvents =
          futureEvents.length > 0 ? futureEvents : mappedEvents;

        const mappedModels = modelRows.map((model, index): ModelView => ({
          id: model.id,
          name: model.name,
          englishName: getEnglishName(model.name),
          style: model.bio?.trim() || "攝影活動 Model",
          image:
            model.avatar_url?.trim() ||
            FALLBACK_MODEL_IMAGES[index % FALLBACK_MODEL_IMAGES.length],
        }));

        const categoryCountMap = new Map<string, number>();

        activityRows.forEach((activity) => {
          (activity.activity_themes ?? []).forEach((relation) => {
            ensureArray(relation.themes).forEach((theme) => {
              const themeName = theme.name?.trim();

              if (themeName) {
                categoryCountMap.set(
                  themeName,
                  (categoryCountMap.get(themeName) ?? 0) + 1
                );
              }
            });
          });
        });

        const mappedCategories = themeRows.map(
          (theme, index): CategoryView => ({
            id: theme.id,
            icon: CATEGORY_ICONS[index % CATEGORY_ICONS.length],
            name: theme.name,
            count: `${categoryCountMap.get(theme.name) ?? 0} 場活動`,
          })
        );

        if (isMounted) {
          setEvents(displayEvents);
          setModels(mappedModels);
          setCategories(mappedCategories);

          // 第一次載入時，月曆定位到第一個活動月份，
          // 並預設選取第一場活動日期。
          if (displayEvents.length > 0) {
            const firstEventDate = getHongKongYearMonth(
              displayEvents[0].startAt
            );

            setCalendarMonth(firstEventDate);
            setSelectedDateKey(toHongKongDateKey(displayEvents[0].startAt));
          }

          setIsLoading(false);
        }
      } catch (error) {
        console.error("Supabase homepage request crashed:", error);

        if (isMounted) {
          setLoadError(
            "活動資料載入時發生錯誤，請稍後重新整理頁面再試。"
          );
          setIsLoading(false);
        }
      }
    }

    loadHomepageData();

    return () => {
      isMounted = false;
    };
  }, []);

  const calendarData = useMemo(() => {
      const fallbackDate = events[0]?.startAt || "2026-01-01T00:00:00.000Z";

      const activeMonth =
        calendarMonth || getHongKongYearMonth(fallbackDate);

      const { year, month } = activeMonth;

      const firstDayWeekday = new Date(
        Date.UTC(year, month - 1, 1)
      ).getUTCDay();

      const daysInCurrentMonth = new Date(
        Date.UTC(year, month, 0)
      ).getUTCDate();

      const daysInPreviousMonth = new Date(
        Date.UTC(year, month - 1, 0)
      ).getUTCDate();

      const eventsByDate = new Map<string, EventView[]>();

      events.forEach((event) => {
        const dateKey = toHongKongDateKey(event.startAt);
        const existingEvents = eventsByDate.get(dateKey) ?? [];

        eventsByDate.set(dateKey, [...existingEvents, event]);
      });

      const calendarCells = Array.from({ length: 42 }, (_, index) => {
        const dayNumber = index - firstDayWeekday + 1;

        if (dayNumber <= 0) {
          return {
            day: daysInPreviousMonth + dayNumber,
            dateKey: "",
            muted: true,
            hasEvent: false,
            events: [] as EventView[],
            key: `previous-${year}-${month}-${daysInPreviousMonth + dayNumber}`,
          };
        }

        if (dayNumber > daysInCurrentMonth) {
          return {
            day: dayNumber - daysInCurrentMonth,
            dateKey: "",
            muted: true,
            hasEvent: false,
            events: [] as EventView[],
            key: `next-${year}-${month}-${dayNumber - daysInCurrentMonth}`,
          };
        }

        const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(
          dayNumber
        ).padStart(2, "0")}`;

        const dateEvents = eventsByDate.get(dateKey) ?? [];

        return {
          day: dayNumber,
          dateKey,
          muted: false,
          hasEvent: dateEvents.length > 0,
          events: dateEvents,
          key: dateKey,
        };
      });

      return {
        year,
        month,
        label: formatCalendarMonth(year, month),
        calendarCells,
      };
    }, [calendarMonth, events]);

    const selectedDateEvents = useMemo(() => {
      if (!selectedDateKey) {
        return [];
      }

      return events.filter(
        (event) => toHongKongDateKey(event.startAt) === selectedDateKey
      );
    }, [events, selectedDateKey]);

    function changeCalendarMonth(direction: -1 | 1) {
      setCalendarMonth((currentMonth) => {
        const baseMonth =
          currentMonth ||
          getHongKongYearMonth(
            events[0]?.startAt || "2026-01-01T00:00:00.000Z"
          );

        const nextDate = new Date(
          Date.UTC(baseMonth.year, baseMonth.month - 1 + direction, 1)
        );

        return {
          year: nextDate.getUTCFullYear(),
          month: nextDate.getUTCMonth() + 1,
        };
      });

      // 切換月份時清除原本日期選取，避免選中上個月的日期。
      setSelectedDateKey(null);
    }

    function selectCalendarDate(
      dateKey: string,
      _dateEvents: EventView[],
      muted: boolean
    ) {
      if (muted || !dateKey) {
        return;
      }

      // 日期只負責選取與更新月曆下方活動摘要，
      // 不自動捲動到近期活動區。
      setSelectedDateKey(dateKey);
    }

  const visibleEvents = events.slice(0, 3);
  const visibleModels = models.slice(0, 4);
  const visibleCategories = categories.slice(0, 6);

  return (
    <main>
      <nav className="navbar">
        <a className="brand" href="#top" aria-label="PhotoEvent 首頁">
          <span className="brand-mark">P</span>
          <span>
            <strong>PHOTO</strong>
            <em>EVENT</em>
          </span>
        </a>

        <div className="nav-links">
          <a className="active" href="#top">
            首頁
          </a>
          <a href="#events">活動列表</a>
          <a href="#calendar">活動日曆</a>
          <a href="#models">Models</a>
          <a href="#categories">主題分類</a>
        </div>

        <a className="nav-button" href="#events">
          探索活動 <span>→</span>
        </a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-overlay" />

        <div className="hero-content">
          <p className="eyebrow">CAPTURE THE MOMENT</p>

          <h1>
            每一次快門，
            <br />
            都值得被記錄。
          </h1>

          <p className="hero-description">
            探索香港攝影活動，找到你喜歡的 Model、拍攝主題與影樓企劃。
            <br />
            活動時間、地點與報名資訊，一個地方完整掌握。
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="#events">
              查看近期活動 <span>↓</span>
            </a>

            <a className="text-button" href="#calendar">
              查看活動日曆 <span>→</span>
            </a>
          </div>
        </div>

        <div className="hero-scroll">SCROLL TO EXPLORE</div>

        <div className="hero-stat">
          <strong>{isLoading ? "—" : events.length}</strong>
          <span>
            即將舉辦
            <br />
            攝影活動
          </span>
        </div>
      </section>

      <section className="section events-section" id="events">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">UPCOMING EVENTS</p>
            <h2>近期活動</h2>
            <p>
              所有活動資料均由 PhotoEvent 即時整理，讓你更輕鬆安排下一次人像創作。
            </p>
          </div>

          <a className="view-all" href="#calendar">
            查看全部活動 <span>→</span>
          </a>
        </div>

        {loadError ? (
          <div className="data-state">
            <strong>活動資料暫時未能載入</strong>
            <p>{loadError}</p>
          </div>
        ) : isLoading ? (
          <div className="data-state">
            <strong>正在載入活動資料⋯</strong>
            <p>PhotoEvent 正在向資料庫查詢下一次快門的時間。</p>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="data-state">
            <strong>暫時沒有已發布活動</strong>
            <p>請稍後再回來，或在 Supabase 將活動狀態設為 published。</p>
          </div>
        ) : (
          <div className="event-grid">
            {visibleEvents.map((event) => {
              const date = formatEventDate(event.startAt);

              return (
                <article
                  className="event-card"
                  id={`event-${event.id}`}
                  key={event.id}
                >
                  <div
                    className="event-image"
                    style={{ backgroundImage: `url("${event.image}")` }}
                  >
                    <div className="date-badge">
                      <strong>{date.day}</strong>
                      <span>{date.month}</span>
                    </div>

                    <span className="event-status">即將舉行</span>
                  </div>

                  <div className="event-body">
                    <p className="event-theme">{event.themeText}</p>

                    <h3>{event.title}</h3>

                    <ul className="event-info">
                      <li>◷ {formatTimeRange(event.startAt, event.endAt)}</li>
                      <li>⌖ {event.location}</li>
                    </ul>

                    <div className="event-footer">
                      <span>
                        <small>活動費用</small>
                        <strong>{event.price}</strong>
                      </span>

                      <a href="#calendar" aria-label={`查看 ${event.title} 詳情`}>
                        查看詳情 <span>→</span>
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="calendar-banner" id="calendar">
        <div>
          <p className="eyebrow">EVENT CALENDAR</p>
          <h2>用日曆，安排下一次創作。</h2>
          <p>
            依日期查看已發布的攝影活動，預留檔期、準備器材，
            然後安心地把靈感變成照片。
          </p>
        </div>

        <div className="mini-calendar" aria-label="可互動活動日曆">
          <div className="calendar-top">
            <button
              type="button"
              aria-label="查看上一個月"
              onClick={() => changeCalendarMonth(-1)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "inherit",
                font: "inherit",
                fontSize: "1.35rem",
                lineHeight: 1,
                padding: "0.2rem 0.4rem",
              }}
            >
              ‹
            </button>

            <strong>{calendarData.label}</strong>

            <button
              type="button"
              aria-label="查看下一個月"
              onClick={() => changeCalendarMonth(1)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "inherit",
                font: "inherit",
                fontSize: "1.35rem",
                lineHeight: 1,
                padding: "0.2rem 0.4rem",
              }}
            >
              ›
            </button>
          </div>

          <div className="calendar-week">
            <span>日</span>
            <span>一</span>
            <span>二</span>
            <span>三</span>
            <span>四</span>
            <span>五</span>
            <span>六</span>
          </div>

          <div className="calendar-days">
            {calendarData.calendarCells.map((cell) => {
              const isSelected = cell.dateKey === selectedDateKey;

              return (
                <button
                  type="button"
                  key={cell.key}
                  disabled={cell.muted}
                  aria-label={
                    cell.muted
                      ? `非本月日期 ${cell.day}`
                      : cell.hasEvent
                        ? `${cell.dateKey}，有 ${cell.events.length} 場活動`
                        : cell.dateKey
                  }
                  aria-pressed={isSelected}
                  onClick={() =>
                    selectCalendarDate(
                      cell.dateKey,
                      cell.events,
                      cell.muted
                    )
                  }
                  className={[
                    cell.muted ? "muted" : "",
                    cell.hasEvent ? "has-event" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    border: isSelected
                      ? "1px solid #8E3F23"
                      : cell.hasEvent
                        ? "1px solid #D8AB59"
                        : "1px solid transparent",

                    background: isSelected
                      ? "#B85C38"
                      : cell.hasEvent
                        ? "#E8C98A"
                        : "transparent",

                    color: isSelected
                      ? "#FFFFFF"
                      : cell.hasEvent
                        ? "#5C3517"
                        : cell.muted
                          ? "#C9C2B7"
                          : "#1D1813",

                    fontWeight: isSelected || cell.hasEvent ? 700 : 500,

                    boxShadow: isSelected
                      ? "0 3px 8px rgba(126, 61, 33, 0.28)"
                      : cell.hasEvent
                        ? "0 2px 5px rgba(140, 97, 35, 0.16)"
                        : "none",

                    borderRadius: "50%",
                    cursor: cell.muted ? "default" : "pointer",
                    minWidth: "1.9rem",
                    minHeight: "1.9rem",
                    padding: 0,
                    font: "inherit",
                    transition:
                      "background-color 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div
            aria-live="polite"
            style={{
              minHeight: "3.5rem",
              marginTop: "1rem",
              borderTop: "1px solid rgba(25, 20, 15, 0.14)",
              paddingTop: "0.8rem",
              fontSize: "0.78rem",
              lineHeight: 1.6,
            }}
          >
           {selectedDateKey && selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  aria-label={`前往 ${event.title} 活動詳情`}
                  onClick={() => {
                    document
                      .getElementById(`event-${event.id}`)
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    margin: 0,
                    padding: 0,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                    font: "inherit",
                    lineHeight: 1.45,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      color: "#17130f",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      lineHeight: 1.45,
                    }}
                  >
                    {event.title}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "0.16rem",
                      color: "#5c3517",
                      fontSize: "0.76rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {formatTimeRange(event.startAt, event.endAt)} ・ {event.location}
                  </span>
                </button>
              ))
            ) : selectedDateKey ? (
              <span>此日期暫時沒有已發布活動。</span>
            ) : (
              <span>點選日期查看活動；金色日期代表有攝影活動。</span>
            )}
          </div>
        </div>
      </section>

      <section className="section models-section" id="models">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">FEATURED MODELS</p>
            <h2>認識本月 Model</h2>
            <p>
              依 Model 尋找活動，快速掌握她們下一次拍攝安排。
            </p>
          </div>

          <a className="view-all" href="#models">
            查看所有 Models <span>→</span>
          </a>
        </div>

        {isLoading ? (
          <div className="data-state">
            <strong>正在載入 Model 資料⋯</strong>
          </div>
        ) : visibleModels.length === 0 ? (
          <div className="data-state">
            <strong>暫時沒有啟用中的 Model</strong>
            <p>請於 Supabase 的 models 資料表將 is_active 設為 true。</p>
          </div>
        ) : (
          <div className="model-grid">
            {visibleModels.map((model) => (
              <article className="model-card" key={model.id}>
                <div
                  className="model-image"
                  style={{ backgroundImage: `url("${model.image}")` }}
                />

                <div className="model-overlay">
                  <p>{model.englishName}</p>
                  <h3>{model.name}</h3>
                  <span>{model.style}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section categories-section" id="categories">
        <div className="section-heading centered-heading">
          <div>
            <p className="eyebrow dark">EXPLORE BY STYLE</p>
            <h2>依主題探索</h2>
            <p>
              從服裝、燈光、風格到拍攝情緒，找到你下一場最想按下快門的創作。
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="data-state">
            <strong>正在載入主題資料⋯</strong>
          </div>
        ) : visibleCategories.length === 0 ? (
          <div className="data-state">
            <strong>暫時沒有啟用中的主題</strong>
            <p>請於 Supabase 的 themes 資料表將 is_active 設為 true。</p>
          </div>
        ) : (
          <div className="category-grid">
            {visibleCategories.map((category) => (
              <a className="category-card" href="#events" key={category.id}>
                <span className="category-icon">{category.icon}</span>
                <strong>{category.name}</strong>
                <small>{category.count}</small>
                <span className="category-arrow">→</span>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="cta-section">
        <p className="eyebrow">PHOTOEVENT HONG KONG</p>

        <h2>下一次靈感，不必等群組訊息浮出水面。</h2>

        <p>
          PhotoEvent 集中整理香港攝影活動，
          讓你按日期、Model、主題與拍攝風格，
          輕鬆找到適合自己的影樓創作計劃。
        </p>

        <a className="primary-button light-button" href="#events">
          開始探索活動 <span>→</span>
        </a>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark">P</span>
          <span>
            <strong>PHOTO</strong>
            <em>EVENT</em>
          </span>
        </a>

        <p>© 2026 PhotoEvent Hong Kong. 攝影活動資訊平台。</p>

        <a href="#top">回到頂端 ↑</a>
      </footer>
    </main>
  );
}