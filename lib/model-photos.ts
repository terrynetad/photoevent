import { supabase } from "./supabase";

export { selectModelPhotos, type TaggedPhoto } from "./model-photo-selection";
import type { TaggedPhoto } from "./model-photo-selection";

type Activity = { start_at: string; status: string };
type Image = {
  image_url: string;
  sort_order: number | null;
  activities: Activity | Activity[] | null;
};
type Tag = { model_id: string; activity_images: Image | Image[] | null };
const many = <T>(value: T | T[] | null): T[] =>
  value ? (Array.isArray(value) ? value : [value]) : [];

/** Only explicitly tagged photos from published activities may be used. RLS remains authoritative. */
export async function loadTaggedModelPhotos(
  modelIds: string[],
): Promise<TaggedPhoto[]> {
  if (!modelIds.length) return [];
  const { data, error } = await supabase
    .from("activity_image_models")
    .select(
      "model_id, activity_images!inner(image_url, sort_order, activities!inner(start_at, status))",
    )
    .in("model_id", modelIds)
    .eq("activity_images.activities.status", "published");
  if (error) throw new Error(`無法載入已標記活動相片：${error.message}`);
  return ((data ?? []) as unknown as Tag[]).flatMap((tag) =>
    many(tag.activity_images).flatMap((image) =>
      many(image.activities)
        .filter(
          (activity) =>
            activity.status === "published" && Boolean(image.image_url?.trim()),
        )
        .map((activity) => ({
          modelId: tag.model_id,
          url: image.image_url.trim(),
          startAt: activity.start_at,
          sortOrder: image.sort_order ?? 9999,
        })),
    ),
  );
}
