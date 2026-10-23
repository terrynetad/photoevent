import { Suspense } from "react";
import EventDetailContent from "./event-detail-content";
import styles from "./event-detail.module.css";

type EventDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function EventDetailLoading() {
  return (
    <main className={styles.page}>
      <section className={styles.stateSection}>
        <p className={styles.eyebrow}>LOADING EVENT</p>
        <h1>正在載入活動⋯</h1>
        <p>PhotoEvent 正在準備活動資訊與相片內容。</p>
      </section>
    </main>
  );
}

export default function EventDetailPage({
  params,
}: EventDetailPageProps) {
  return (
    <Suspense fallback={<EventDetailLoading />}>
      <EventDetailContent params={params} />
    </Suspense>
  );
}