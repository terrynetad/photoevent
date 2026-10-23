import EventDetailClient from "./event-detail-client";

type EventDetailContentProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EventDetailContent({
  params,
}: EventDetailContentProps) {
  const { slug } = await params;

  return <EventDetailClient slug={slug} />;
}