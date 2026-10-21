const upcomingEvents = [
  {
    date: "18",
    month: "OCT",
    title: "小羽｜日系泳裝棚拍",
    time: "14:00 - 17:00",
    location: "台北市・中山區攝影棚",
    price: "NT$2,500",
    model: "小羽",
    theme: "日系・泳裝・棚拍",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85",
  },
  {
    date: "25",
    month: "OCT",
    title: "Mina｜復古旗袍夜拍",
    time: "18:30 - 21:30",
    location: "台北市・大稻埕",
    price: "NT$2,800",
    model: "Mina",
    theme: "旗袍・復古・夜拍",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
  },
  {
    date: "02",
    month: "NOV",
    title: "Yuki｜秋日制服外拍",
    time: "13:30 - 16:30",
    location: "新北市・淡水老街",
    price: "NT$2,200",
    model: "Yuki",
    theme: "制服・秋日・外拍",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
  },
];

const models = [
  {
    name: "小羽",
    englishName: "YU",
    style: "日系・泳裝・清新寫真",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Mina",
    englishName: "MINA",
    style: "旗袍・復古・都會夜景",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Yuki",
    englishName: "YUKI",
    style: "制服・甜美・自然外拍",
    image:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Nana",
    englishName: "NANA",
    style: "時尚・人體藝術・棚拍",
    image:
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=85",
  },
];

const categories = [
  { icon: "◐", name: "日系寫真", count: "12 場活動" },
  { icon: "✦", name: "旗袍古風", count: "8 場活動" },
  { icon: "◒", name: "泳裝人體藝術", count: "15 場活動" },
  { icon: "◈", name: "制服主題", count: "10 場活動" },
  { icon: "◑", name: "戶外街拍", count: "9 場活動" },
  { icon: "☾", name: "夜景棚拍", count: "6 場活動" },
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
            探索最新攝影活動、找到喜歡的 Model 與拍攝主題。
            <br />
            所有活動資訊，一個地方完整掌握。
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
          <strong>26</strong>
          <span>即將舉辦<br />攝影活動</span>
        </div>
      </section>

      <section className="section events-section" id="events">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">UPCOMING EVENTS</p>
            <h2>近期活動</h2>
            <p>選擇一場喜歡的拍攝，讓靈感不只存在於群組訊息裡。</p>
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
            未來這裡會顯示月曆、週曆與活動列表，
            讓你直接依日期找到想參加的攝影活動。
          </p>
        </div>

        <div className="mini-calendar" aria-label="活動日曆預覽">
          <div className="calendar-top">
            <span>‹</span>
            <strong>2026 年 10 月</strong>
            <span>›</span>
          </div>
          <div className="calendar-week">
            <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
          </div>
          <div className="calendar-days">
            <span className="muted">27</span><span className="muted">28</span><span className="muted">29</span><span className="muted">30</span>
            <span>1</span><span>2</span><span>3</span>
            <span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
            <span>11</span><span>12</span><span>13</span><span>14</span><span>15</span><span>16</span><span>17</span>
            <span className="has-event">18</span><span>19</span><span>20</span><span>21</span><span>22</span><span>23</span><span>24</span>
            <span className="has-event">25</span><span>26</span><span>27</span><span>28</span><span>29</span><span>30</span><span>31</span>
          </div>
        </div>
      </section>

      <section className="section models-section" id="models">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">FEATURED MODELS</p>
            <h2>認識本月 Model</h2>
            <p>依 Model 尋找活動，快速掌握她們接下來的拍攝安排。</p>
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
            <p>從服裝、風格到拍攝場景，找到你最想按下快門的那一場。</p>
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
        <p className="eyebrow">PHOTOEVENT COMMUNITY</p>
        <h2>下一次靈感，不必等群組訊息浮出水面。</h2>
        <p>
          PhotoEvent 將所有活動集中整理，讓你依日期、Model、主題與服裝，
          輕鬆找到適合自己的攝影計畫。
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
        <p>© 2026 PhotoEvent. 攝影活動資訊平台。</p>
        <a href="#top">回到頂端 ↑</a>
      </footer>
    </main>
  );
}