export type TaggedPhoto = {
  modelId: string;
  url: string;
  startAt: string;
  sortOrder: number;
};
export function selectModelPhotos(
  avatar: string | null | undefined,
  gallery: string[] | null | undefined,
  tagged: TaggedPhoto[],
) {
  const unique = (urls: string[]) => [
    ...new Set(urls.map((url) => url.trim()).filter(Boolean)),
  ];
  const activityPhotos = unique(
    [...tagged]
      .sort(
        (a, b) =>
          (Date.parse(b.startAt) || 0) - (Date.parse(a.startAt) || 0) ||
          a.sortOrder - b.sortOrder ||
          a.url.localeCompare(b.url),
      )
      .map((photo) => photo.url),
  );
  const manualGallery = unique(gallery ?? []).slice(0, 10);
  return {
    main: avatar?.trim() || activityPhotos[0] || "",
    gallery: (manualGallery.length ? manualGallery : activityPhotos).slice(
      0,
      10,
    ),
    activityPhotos,
  };
}
