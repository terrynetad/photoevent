const upcomingEvents = [
  {
    date: "15",
    month: "NOV",
    title: "小羽｜日系時尚影樓拍攝",
    time: "14:00 - 17:00",
    location: "葵興影樓",
    price: "HK$680",
    model: "小羽",
    theme: "日系・時尚・影樓",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85",
  },
  {
    date: "22",
    month: "NOV",
    title: "Mina｜復古霓虹人像影樓",
    time: "18:30 - 21:30",
    location: "葵興影樓",
    price: "HK$780",
    model: "Mina",
    theme: "復古・霓虹・時尚人像",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
  },
  {
    date: "06",
    month: "DEC",
    title: "Yuki｜秋日制服棚拍",
    time: "13:30 - 16:30",
    location: "葵興影樓",
    price: "HK$620",
    model: "Yuki",
    theme: "制服・清新・棚拍",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
  },
];

const models = [
  {
    name: "小羽",
    englishName: "YU",
    style: "日系・時尚・清新人像",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Mina",
    englishName: "MINA",
    style: "復古・霓虹・影樓人像",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Yuki",
    englishName: "YUKI",
    style: "制服・甜美・自然棚拍",
    image:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Nana",
    englishName: "NANA",
    style: "時尚・情緒・創意人像",
    image:
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=85",
  },
];

const categories = [
  { icon: "◐", name: "日系寫真", count: "人氣影樓主題" },
  { icon: "✦", name: "復古霓虹", count: "城市感人像風格" },
  { icon: "◒", name: "時尚棚拍", count: "專業燈光拍攝" },
  { icon: "◈", name: "制服主題", count: "清新校園風格" },
  { icon: "◑", name: "創意造型", count: "個人風格企劃" },
  { icon: "☾", name: "夜景氛圍", count: "暗調燈光人像" },
];

export default function Home() {
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
          <strong>3</strong>
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
              所有活動預設於葵興影樓舉行，讓你更輕鬆安排下一次人像創作。
            </p>
          </div>

          <a className="view-all" href="#calendar">
            查看全部活動 <span>→</span>
          </a>
        </div>

        <div className="event-grid">
          {upcomingEvents.map((event) => (
            <article className="event-card" key={event.title}>
              <div
                className="event-image"
                style={{ backgroundImage: `url(${event.image})` }}
              >
                <div className="date-badge">
                  <strong>{event.date}</strong>
                  <span>{event.month}</span>
                </div>

                <span className="event-status">即將舉行</span>
              </div>

              <div className="event-body">
                <p className="event-theme">{event.theme}</p>

                <h3>{event.title}</h3>

                <ul className="event-info">
                  <li>◷ {event.time}</li>
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
          ))}
        </div>
      </section>

      <section className="calendar-banner" id="calendar">
        <div>
          <p className="eyebrow">EVENT CALENDAR</p>
          <h2>用日曆，安排下一次創作。</h2>
          <p>
            依日期查看即將舉行的影樓活動，預留檔期、準備器材，
            然後安心地把靈感變成照片。
          </p>
        </div>

        <div className="mini-calendar" aria-label="活動日曆預覽">
          <div className="calendar-top">
            <span>‹</span>
            <strong>2026 年 11 月</strong>
            <span>›</span>
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
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span>7</span>

            <span>8</span>
            <span>9</span>
            <span>10</span>
            <span>11</span>
            <span>12</span>
            <span>13</span>
            <span>14</span>

            <span className="has-event">15</span>
            <span>16</span>
            <span>17</span>
            <span>18</span>
            <span>19</span>
            <span>20</span>
            <span>21</span>

            <span className="has-event">22</span>
            <span>23</span>
            <span>24</span>
            <span>25</span>
            <span>26</span>
            <span>27</span>
            <span>28</span>

            <span>29</span>
            <span>30</span>
            <span className="muted">1</span>
            <span className="muted">2</span>
            <span className="muted">3</span>
            <span className="muted">4</span>
            <span className="muted">5</span>
          </div>
        </div>
      </section>

      <section className="section models-section" id="models">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">FEATURED MODELS</p>
            <h2>認識本月 Model</h2>
            <p>
              依 Model 尋找活動，快速掌握她們於葵興影樓的下一次拍攝安排。
            </p>
          </div>

          <a className="view-all" href="#models">
            查看所有 Models <span>→</span>
          </a>
        </div>

        <div className="model-grid">
          {models.map((model) => (
            <article className="model-card" key={model.name}>
              <div
                className="model-image"
                style={{ backgroundImage: `url(${model.image})` }}
              />

              <div className="model-overlay">
                <p>{model.englishName}</p>
                <h3>{model.name}</h3>
                <span>{model.style}</span>
              </div>
            </article>
          ))}
        </div>
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

        <div className="category-grid">
          {categories.map((category) => (
            <a className="category-card" href="#events" key={category.name}>
              <span className="category-icon">{category.icon}</span>
              <strong>{category.name}</strong>
              <small>{category.count}</small>
              <span className="category-arrow">→</span>
            </a>
          ))}
        </div>
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